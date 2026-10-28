import { createClerkClient } from "@clerk/backend";

import { addDays, isIsoDate, nightsBetween, toIso } from "../dates";
import {
  MAX_BLOCK_NIGHTS,
  MAX_BLOCK_NOTE,
  type HostBlock,
  type HostBooking,
  type HostPayout,
  type HostStayDetails,
  type HostSummary,
} from "../host-shared";
import type { StayCard } from "../search/types";

import { HOST_ORG_ID, hostOrgParams } from "./clerk-mode";
import { isOverlap, sql } from "./db";
import { sanityQuery } from "./sanity";
import { CARD_FIELDS } from "./stay-queries";

// Server only. Host mode (prompts/19): everything is scoped to the organization from the
// verified session, never one sent by the app. Stays come from Sanity by the host's
// organization for this Clerk instance (`HOST_ORG_ID`, prompts/21);
// bookings from Neon by host_org_id. Holds and expired rows are never shown, and guests
// appear as first name + last initial.

export class HostError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function clerk() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new HostError("Server is not configured.", 500);
  return createClerkClient({ secretKey });
}

type Row = {
  id: string;
  user_id: string;
  stay_id: string;
  title: string;
  image_url: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  total: number;
  status: "confirmed" | "cancelled";
  transfer_status: "none" | "awaiting_host" | "sent" | "failed";
  payout_status: "none" | "pending" | "paid" | "failed";
  host_share_pence: number | null;
  payout_due_on: string | null;
};

/** The host side of a booking (prompts/23), as the host bookings list shows it. */
function payoutOf(row: Row): HostPayout {
  const sharePence = row.host_share_pence ?? 0;
  const state: HostPayout["state"] =
    sharePence === 0 ? "none"
    : row.payout_status === "paid" ? "paid"
    : row.transfer_status === "awaiting_host" ? "setup_needed"
    : row.transfer_status === "failed" || row.payout_status === "failed" ? "delayed"
    : row.transfer_status === "sent" ? "waiting"
    : "none";
  return { state, sharePence, dueOn: row.payout_due_on };
}

/** "Daniel A." for each guest, looked up in one Clerk call. */
async function guestNames(userIds: string[]) {
  const names = new Map<string, string>();
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return names;
  const { data } = await clerk().users.getUserList({ userId: unique, limit: unique.length });
  for (const user of data) {
    const first = user.firstName?.trim() || "Guest";
    const initial = user.lastName?.trim()[0];
    names.set(user.id, initial ? `${first} ${initial.toUpperCase()}.` : first);
  }
  return names;
}

async function toHostBookings(rows: Row[]): Promise<HostBooking[]> {
  const names = await guestNames(rows.map((row) => row.user_id));
  return rows.map((row) => ({
    id: row.id,
    stayId: row.stay_id,
    stayTitle: row.title,
    imageUrl: row.image_url,
    guest: names.get(row.user_id) ?? "Former guest",
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: row.nights,
    guests: row.guests,
    total: row.total,
    status: row.status,
    payout: payoutOf(row),
  }));
}

export function hostStays(orgId: string) {
  return sanityQuery<StayCard[]>(
    `*[_type == "property" && defined(slug.current) && ${HOST_ORG_ID} == $orgId] | order(title asc)${CARD_FIELDS}`,
    { orgId, ...hostOrgParams() },
  );
}

export async function hostSummary(orgId: string, role: HostSummary["role"]): Promise<HostSummary> {
  const today = toIso(new Date());
  const horizon = addDays(today, 30);
  const [org, stays, counts] = await Promise.all([
    clerk().organizations.getOrganization({ organizationId: orgId }),
    sanityQuery<number>(`count(*[_type == "property" && ${HOST_ORG_ID} == $orgId])`, { orgId, ...hostOrgParams() }),
    sql()`
      SELECT
        count(*) FILTER (WHERE check_out >= ${today}::date)::int AS upcoming,
        coalesce(sum(GREATEST(0, LEAST(check_out, ${horizon}::date) - GREATEST(check_in, ${today}::date))), 0)::int AS nights
      FROM bookings
      WHERE host_org_id = ${orgId} AND status = 'confirmed'`.then((rows) => rows as { upcoming: number; nights: number }[]),
  ]);
  return { company: org.name, role, stays, upcomingBookings: counts[0].upcoming, nightsNext30: counts[0].nights };
}

/** Upcoming: not yet checked out, soonest first. Past: checked out, newest first. */
export async function hostBookings(orgId: string, when: "upcoming" | "past", stayId: string | null = null) {
  const today = toIso(new Date());
  const rows = (await sql()`
    SELECT id, user_id, stay_id, title, image_url, check_in::text AS check_in, check_out::text AS check_out,
      nights, guests, total, status, transfer_status, payout_status, host_share_pence,
      (payout_due_at AT TIME ZONE 'Europe/London')::date::text AS payout_due_on
    FROM bookings
    WHERE host_org_id = ${orgId} AND status IN ('confirmed', 'cancelled')
      AND (${stayId}::text IS NULL OR stay_id = ${stayId})
      AND CASE WHEN ${when} = 'upcoming' THEN check_out >= ${today}::date ELSE check_out < ${today}::date END
    ORDER BY
      CASE WHEN ${when} = 'upcoming' THEN check_in END ASC,
      CASE WHEN ${when} = 'past' THEN check_in END DESC
    LIMIT 100`) as Row[];
  return toHostBookings(rows);
}

export async function hostStay(orgId: string, stayId: string): Promise<HostStayDetails> {
  const stay = await sanityQuery<StayCard | null>(
    `*[_type == "property" && _id == $stayId && ${HOST_ORG_ID} == $orgId][0]${CARD_FIELDS}`,
    { orgId, stayId, ...hostOrgParams() },
  );
  if (!stay) throw new HostError("We couldn't find that stay.", 404);
  const [bookings, blocks] = await Promise.all([hostBookings(orgId, "upcoming", stayId), hostBlocks(orgId, stayId)]);
  const booked = bookings
    .filter((booking) => booking.status === "confirmed")
    .map(({ checkIn, checkOut }) => ({ checkIn, checkOut }));
  return { stay, booked, blocks, bookings };
}

/** The company's blocks on one stay, from today on. */
export async function hostBlocks(orgId: string, stayId: string): Promise<HostBlock[]> {
  const today = toIso(new Date());
  const rows = (await sql()`
    SELECT id, check_in::text AS check_in, check_out::text AS check_out, nights, note
    FROM bookings
    WHERE host_org_id = ${orgId} AND stay_id = ${stayId} AND status = 'blocked' AND check_out > ${today}::date
    ORDER BY check_in`) as { id: string; check_in: string; check_out: string; nights: number; note: string | null }[];
  return rows.map((row) => ({ id: row.id, checkIn: row.check_in, checkOut: row.check_out, nights: row.nights, note: row.note }));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Blocks nights on a stay the company hosts. A bookings row with status 'blocked' (prompts/22), so the overlap constraint covers it. */
export async function createBlock(orgId: string, userId: string, stayId: string, body: unknown): Promise<HostBlock> {
  const input = (body ?? {}) as { checkIn?: unknown; checkOut?: unknown; note?: unknown };
  if (!isIsoDate(input.checkIn) || !isIsoDate(input.checkOut)) throw new HostError("Pick the nights to block.", 400);
  const { checkIn, checkOut } = input;
  if (checkIn < toIso(new Date())) throw new HostError("You can't block nights in the past.", 400);
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) throw new HostError("The last night must be after the first.", 400);
  if (nights > MAX_BLOCK_NIGHTS) throw new HostError(`Block up to ${MAX_BLOCK_NIGHTS} nights at a time.`, 400);
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > MAX_BLOCK_NOTE) throw new HostError(`Keep the note under ${MAX_BLOCK_NOTE} characters.`, 400);

  const stay = await sanityQuery<StayCard | null>(
    `*[_type == "property" && _id == $stayId && ${HOST_ORG_ID} == $orgId][0]${CARD_FIELDS}`,
    { orgId, stayId, ...hostOrgParams() },
  );
  if (!stay) throw new HostError("We couldn't find that stay.", 404);

  const id = crypto.randomUUID();
  try {
    await sql()`
      INSERT INTO bookings (id, user_id, stay_id, slug, title, city, region, image_url, check_in, check_out,
        nights, guests, price_per_night, total, status, host_org_id, blocked_by, note)
      VALUES (${id}, ${`block:${id}`}, ${stay._id}, ${stay.slug}, ${stay.title}, ${stay.place.city}, ${stay.place.region},
        ${stay.imageUrl}, ${checkIn}, ${checkOut}, ${nights}, 1, 0, 0, 'blocked', ${orgId}, ${userId}, ${note || null})`;
  } catch (error) {
    if (isOverlap(error)) throw new HostError("Some of those nights are already booked or blocked.", 409);
    throw error;
  }
  return { id, checkIn, checkOut, nights, note: note || null };
}

/** Removes one of the company's blocks. */
export async function removeBlock(orgId: string, stayId: string, blockId: string) {
  if (!UUID.test(blockId)) throw new HostError("We couldn't find that block.", 404);
  const rows = await sql()`
    DELETE FROM bookings
    WHERE id = ${blockId}::uuid AND stay_id = ${stayId} AND host_org_id = ${orgId} AND status = 'blocked'
    RETURNING id`;
  if (rows.length === 0) throw new HostError("We couldn't find that block.", 404);
}

export function hostErrorResponse(error: unknown, action: string) {
  if (error instanceof HostError) return Response.json({ error: error.message }, { status: error.status });
  console.error(`${action} failed:`, error instanceof Error ? error.message : error);
  return Response.json({ error: "Hosting is unavailable right now." }, { status: 502 });
}
