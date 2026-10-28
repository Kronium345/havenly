import { availablePence, hostAccountId, payOutToHost, payoutStatus, reverseTransfer, transferToHost } from "./connect";
import { sql } from "./db";

// Server only. The host side of each paid booking (prompts/23). The host's share is 85% of
// what the guest finally pays. At payment it moves to the host's Stripe balance (payouts
// paused); the daily job pays it out to their bank from 10:00 UK time the day after
// check-in, or after 85 days if that's sooner (UK funds can wait at most 90 days).

export const HOST_SHARE_PERCENT = 85;

/** Days a payout may stay unpaid after its due time before the job reports it. */
const LATE_AFTER_DAYS = 3;

/** 85% of (paid − refunded), in pence, rounded down. */
export function hostSharePence(paidPounds: number, refundedPounds: number) {
  const pence = Math.round((paidPounds - refundedPounds) * 100);
  return Math.max(0, Math.floor((pence * HOST_SHARE_PERCENT) / 100));
}

type LedgerRow = {
  id: string;
  host_org_id: string | null;
  charge_id: string | null;
  amount_paid: number | null;
  refunded: number | null;
  transfer_status: "none" | "awaiting_host" | "sent" | "failed";
  transfer_id: string | null;
  transferred_pence: number | null;
  host_share_pence: number | null;
  payout_status: "none" | "pending" | "paid" | "failed";
};

async function ledger(bookingId: string) {
  const rows = (await sql()`
    SELECT id, host_org_id, charge_id, amount_paid, refunded, transfer_status, transfer_id, transferred_pence,
      host_share_pence, payout_status
    FROM bookings WHERE id = ${bookingId}`) as LedgerRow[];
  return rows[0] ?? null;
}

/** Sends the host's share and schedules its payout (the day after check-in, at most 85 days away). */
async function send(row: LedgerRow, accountId: string, share: number) {
  const transfer = await transferToHost(accountId, row.id, row.charge_id ?? "", share);
  await sql()`
    UPDATE bookings SET transfer_status = 'sent', transfer_id = ${transfer.id}, transferred_pence = ${share},
      host_share_pence = ${share}, payout_status = 'pending',
      payout_due_at = LEAST(((check_in + 1)::timestamp + interval '10 hours') AT TIME ZONE 'Europe/London', now() + interval '85 days')
    WHERE id = ${row.id}`;
}

/**
 * After a booking is paid: transfers the host's share, or waits for the host to set up
 * payouts. Safe to run more than once (the app and the webhook both confirm payments).
 * Never throws: a failure is left for the daily job to retry.
 */
export async function onBookingPaid(bookingId: string, chargeId: string | null) {
  try {
    if (chargeId) await sql()`UPDATE bookings SET charge_id = ${chargeId} WHERE id = ${bookingId} AND charge_id IS NULL`;
    const row = await ledger(bookingId);
    if (!row || !row.host_org_id || row.transfer_status !== "none" || !row.amount_paid) return;
    const share = hostSharePence(row.amount_paid, row.refunded ?? 0);
    if (share === 0) return;
    const { status, accountId } = await payoutStatus(row.host_org_id);
    if (status !== "active" || !accountId || !row.charge_id) {
      await sql()`UPDATE bookings SET transfer_status = 'awaiting_host', host_share_pence = ${share} WHERE id = ${row.id} AND transfer_status = 'none'`;
      return;
    }
    await send(row, accountId, share);
  } catch (error) {
    console.error("Host transfer failed:", error instanceof Error ? error.message : error);
    await sql()`UPDATE bookings SET transfer_status = 'failed' WHERE id = ${bookingId} AND transfer_status = 'none'`.catch(() => {});
  }
}

/**
 * Before refunding a guest: lowers the host's share to 85% of what's left, taking the
 * difference back from their balance if it was already transferred.
 */
export async function beforeRefund(bookingId: string, refundedPoundsAfter: number) {
  const row = await ledger(bookingId);
  if (!row || !row.amount_paid || row.transfer_status === "none") return;
  const share = hostSharePence(row.amount_paid, refundedPoundsAfter);
  if (row.transfer_status === "sent" && row.transfer_id) {
    const back = (row.transferred_pence ?? 0) - share;
    if (back > 0) await reverseTransfer(row.transfer_id, back, `reverse-${row.id}-${share}`);
    await sql()`
      UPDATE bookings SET transferred_pence = ${share}, host_share_pence = ${share},
        payout_status = CASE WHEN ${share} = 0 AND payout_status = 'pending' THEN 'none' ELSE payout_status END
      WHERE id = ${row.id}`;
    return;
  }
  // Not transferred yet: only the amount still to send changes.
  await sql()`
    UPDATE bookings SET host_share_pence = ${share},
      transfer_status = CASE WHEN ${share} = 0 THEN 'none' ELSE transfer_status END
    WHERE id = ${row.id}`;
}

export type PayoutJobResult = { transferred: number; paidOut: number; waiting: number; late: string[]; errors: string[] };

/** The daily job: catch-up transfers, then payouts that are due. Idempotent per booking. */
export async function runPayoutJob(): Promise<PayoutJobResult> {
  const result: PayoutJobResult = { transferred: 0, paidOut: 0, waiting: 0, late: [], errors: [] };
  const accounts = new Map<string, { status: string; accountId: string | null }>();
  const accountFor = async (orgId: string) => {
    if (!accounts.has(orgId)) accounts.set(orgId, await payoutStatus(orgId));
    return accounts.get(orgId)!;
  };

  // 1. Hosts who finished setting up payouts since their guests paid.
  const catchUp = (await sql()`
    SELECT id, host_org_id, charge_id, amount_paid, refunded, transfer_status, transfer_id, transferred_pence,
      host_share_pence, payout_status
    FROM bookings
    WHERE transfer_status IN ('awaiting_host', 'failed') AND status IN ('confirmed', 'cancelled')
      AND host_org_id IS NOT NULL AND charge_id IS NOT NULL
    LIMIT 200`) as LedgerRow[];
  for (const row of catchUp) {
    try {
      const share = hostSharePence(row.amount_paid ?? 0, row.refunded ?? 0);
      if (share === 0) {
        await sql()`UPDATE bookings SET transfer_status = 'none', host_share_pence = 0 WHERE id = ${row.id}`;
        continue;
      }
      const { status, accountId } = await accountFor(row.host_org_id!);
      if (status !== "active" || !accountId) continue;
      await send(row, accountId, share);
      result.transferred += 1;
    } catch (error) {
      result.errors.push(`transfer ${row.id}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  // 2. Payouts that are due, from each host's balance to their bank.
  const due = (await sql()`
    SELECT id, host_org_id, host_share_pence, payout_due_at < now() - make_interval(days => ${LATE_AFTER_DAYS}) AS late
    FROM bookings
    WHERE payout_status = 'pending' AND transfer_status = 'sent' AND payout_due_at <= now() AND host_share_pence > 0
    ORDER BY payout_due_at
    LIMIT 200`) as { id: string; host_org_id: string; host_share_pence: number; late: boolean }[];
  const balances = new Map<string, number>();
  for (const row of due) {
    try {
      const accountId = (await accountFor(row.host_org_id)).accountId ?? (await hostAccountId(row.host_org_id));
      if (!accountId) continue;
      if (!balances.has(accountId)) balances.set(accountId, await availablePence(accountId));
      const available = balances.get(accountId)!;
      if (available < row.host_share_pence) {
        // The guest's card payment hasn't settled into the host's balance yet: retry tomorrow.
        result.waiting += 1;
        if (row.late) result.late.push(row.id);
        continue;
      }
      const payout = await payOutToHost(accountId, row.id, row.host_share_pence);
      balances.set(accountId, available - row.host_share_pence);
      await sql()`UPDATE bookings SET payout_status = 'paid', payout_id = ${payout.id} WHERE id = ${row.id}`;
      result.paidOut += 1;
    } catch (error) {
      result.errors.push(`payout ${row.id}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }
  return result;
}
