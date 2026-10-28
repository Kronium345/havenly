import { MAX_NIGHTS, type Booking, type CheckoutSession, type NewBooking } from "../bookings-shared";
import { addDays, isIsoDate, nightsBetween, toIso } from "../dates";

import { HOST_ORG_ID, hostOrgParams } from "./clerk-mode";
import { isOverlap, sql } from "./db";
import { beforeRefund, onBookingPaid } from "./host-payouts";
import { refundFor, tierOf } from "./refunds";
import { sanityQuery } from "./sanity";
import { customerSession, ensureCustomer, stripeRequest, StripeError, type PaymentIntent } from "./stripe";

// Server only. Bookings live in Neon Postgres (db/migrations/001_bookings.sql), where two
// exclusion constraints make overlaps impossible: one stay can't be booked twice for the
// same nights, and one guest can't hold two trips on the same nights. Checkout holds the
// dates for 15 minutes while the guest pays; a trip is confirmed only after Stripe says its
// PaymentIntent succeeded for this guest and amount. Prices come from Sanity, never from
// the app. Every query is scoped to the session's user id.

export class BookingError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const HOLD_MINUTES = 15;

type Row = {
  id: string;
  user_id: string;
  stay_id: string;
  slug: string;
  title: string;
  city: string;
  region: string;
  image_url: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  price_per_night: number;
  total: number;
  status: "held" | "confirmed" | "cancelled" | "expired";
  payment_intent_id: string | null;
  amount_paid: number | null;
  policy_title: string | null;
  refunded: number | null;
  created_at: string;
};

function toBooking(row: Row): Booking {
  return {
    id: row.id,
    stayId: row.stay_id,
    slug: row.slug,
    title: row.title,
    place: { city: row.city, region: row.region },
    imageUrl: row.image_url,
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: row.nights,
    guests: row.guests,
    pricePerNight: row.price_per_night,
    total: row.total,
    status: row.status === "cancelled" ? "cancelled" : "confirmed",
    createdAt: row.created_at,
    paymentIntentId: row.payment_intent_id ?? undefined,
    amountPaid: row.amount_paid ?? undefined,
    policyTitle: row.policy_title ?? undefined,
    refunded: row.refunded ?? undefined,
  };
}

/** One booking row, with dates as YYYY-MM-DD text (never JS Dates, which shift by timezone). */
async function findRow(userId: string, id: string): Promise<Row | null> {
  const rows = (await sql()`
    SELECT id, user_id, stay_id, slug, title, city, region, image_url,
      check_in::text AS check_in, check_out::text AS check_out, nights, guests,
      price_per_night, total, status, payment_intent_id, amount_paid, policy_title,
      refunded, created_at::text AS created_at
    FROM bookings WHERE id = ${id} AND user_id = ${userId}`) as Row[];
  return rows[0] ?? null;
}

/** The guest's trips (confirmed and cancelled; holds aren't trips), newest check-in first. */
export async function listBookings(userId: string): Promise<Booking[]> {
  const rows = (await sql()`
    SELECT id, user_id, stay_id, slug, title, city, region, image_url,
      check_in::text AS check_in, check_out::text AS check_out, nights, guests,
      price_per_night, total, status, payment_intent_id, amount_paid, policy_title,
      refunded, created_at::text AS created_at
    FROM bookings
    WHERE user_id = ${userId} AND status IN ('confirmed', 'cancelled')
    ORDER BY check_in DESC`) as Row[];
  return rows.map(toBooking);
}

export function parseNewBooking(body: unknown): NewBooking {
  const input = (body ?? {}) as Partial<NewBooking>;
  if (typeof input.stayId !== "string" || !/^[\w-]{1,64}$/.test(input.stayId)) {
    throw new BookingError("Choose a stay to book.", 400);
  }
  if (!isIsoDate(input.checkIn) || !isIsoDate(input.checkOut)) {
    throw new BookingError("Pick your check-in and check-out dates.", 400);
  }
  if (typeof input.guests !== "number" || !Number.isInteger(input.guests)) {
    throw new BookingError("Choose how many guests are coming.", 400);
  }
  return { stayId: input.stayId, checkIn: input.checkIn, checkOut: input.checkOut, guests: input.guests };
}

type QuotedStay = {
  _id: string;
  slug: string;
  title: string;
  place: { city: string; region: string };
  imageUrl: string | null;
  pricePerNight: number;
  maxGuests: number;
  policyTitle: string | null;
  /** The host company's Clerk organization, once the host is linked (prompts/19). */
  hostOrgId: string | null;
};

/** Checks a trip the guest wants (dates, guests) and prices it from Sanity. Availability is the database's job. */
async function quote(input: NewBooking) {
  // One day of slack: the guest's "today" can be the server's yesterday.
  if (input.checkIn < addDays(toIso(new Date()), -1)) {
    throw new BookingError("Check-in can't be in the past.", 400);
  }
  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (nights < 1) throw new BookingError("Check-out must be after check-in.", 400);
  if (nights > MAX_NIGHTS) throw new BookingError(`Trips can be up to ${MAX_NIGHTS} nights.`, 400);

  const stay = await sanityQuery<QuotedStay | null>(
    `*[_type == "property" && _id == $id][0]{_id, "slug": slug.current, title, "place": place{city, region}, "imageUrl": images[0].asset->url, pricePerNight, maxGuests, "policyTitle": cancellationPolicy->title, "hostOrgId": ${HOST_ORG_ID}}`,
    { id: input.stayId, ...hostOrgParams() },
  );
  if (!stay) throw new BookingError("This stay isn't available anymore.", 404);
  if (input.guests < 1 || input.guests > stay.maxGuests) {
    throw new BookingError(`This stay sleeps up to ${stay.maxGuests}.`, 400);
  }
  return { stay, nights, total: stay.pricePerNight * nights };
}

/** Which overlap Postgres refused, as the guest should hear it. */
function overlapError(error: unknown) {
  const constraint = (error as { constraint?: string } | null)?.constraint;
  return constraint === "bookings_no_overlapping_trips"
    ? new BookingError("You already have a trip on those dates.", 409)
    : new BookingError("Those dates aren't available any more. Pick different dates.", 409);
}

/** Holds the dates for 15 minutes and starts paying: a PaymentIntent for the Sanity price, plus a CustomerSession for saved cards. */
export async function startCheckout(userId: string, input: NewBooking): Promise<CheckoutSession> {
  const { stay, nights, total } = await quote(input);
  const id = crypto.randomUUID();
  const db = sql();
  try {
    // Stale holds for this stay or guest stop blocking first, in the same transaction.
    await db.transaction([
      db`UPDATE bookings SET status = 'expired'
         WHERE status = 'held' AND held_until < now() AND (stay_id = ${stay._id} OR user_id = ${userId})`,
      db`INSERT INTO bookings (id, user_id, stay_id, slug, title, city, region, image_url, check_in, check_out,
           nights, guests, price_per_night, total, status, held_until, policy_title, host_org_id)
         VALUES (${id}, ${userId}, ${stay._id}, ${stay.slug}, ${stay.title}, ${stay.place.city}, ${stay.place.region},
           ${stay.imageUrl}, ${input.checkIn}, ${input.checkOut}, ${nights}, ${input.guests}, ${stay.pricePerNight},
           ${total}, 'held', now() + make_interval(mins => ${HOLD_MINUTES}), ${stay.policyTitle}, ${stay.hostOrgId})`,
    ]);
  } catch (error) {
    if (isOverlap(error)) throw overlapError(error);
    throw error;
  }

  try {
    const customerId = await ensureCustomer(userId);
    const intent = await stripeRequest<PaymentIntent>("POST", "payment_intents", {
      amount: total * 100,
      currency: "gbp",
      customer: customerId,
      allowed_payment_method_types: ["card"],
      description: `${stay.title}, ${input.checkIn} to ${input.checkOut}`,
      metadata: { userId, bookingId: id, stayId: stay._id, checkIn: input.checkIn, checkOut: input.checkOut, guests: String(input.guests) },
    });
    await db`UPDATE bookings SET payment_intent_id = ${intent.id} WHERE id = ${id} AND user_id = ${userId}`;
    return {
      bookingId: id,
      paymentIntentId: intent.id,
      paymentIntentClientSecret: intent.client_secret,
      customerSessionClientSecret: await customerSession(customerId),
      customerId,
      total,
    };
  } catch (error) {
    // Couldn't start paying: free the dates now rather than in 15 minutes.
    await db`DELETE FROM bookings WHERE id = ${id} AND user_id = ${userId} AND status = 'held'`;
    throw error;
  }
}

/** Frees a hold the guest walked away from (sheet closed without paying). */
export async function releaseHold(userId: string, id: string) {
  await sql()`UPDATE bookings SET status = 'expired' WHERE id = ${id} AND user_id = ${userId} AND status = 'held'`;
}

export function parsePaymentIntentId(body: unknown): string {
  const id = (body as { paymentIntentId?: unknown } | null)?.paymentIntentId;
  if (typeof id !== "string" || !/^pi_\w{8,}$/.test(id)) throw new BookingError("Pay for your trip first.", 400);
  return id;
}

/** Confirms the held trip once Stripe says its payment succeeded. The same payment never books twice. */
export async function createPaidBooking(userId: string, paymentIntentId: string): Promise<Booking> {
  const intent = await stripeRequest<PaymentIntent>("GET", `payment_intents/${paymentIntentId}`);
  if (intent.metadata.userId !== userId) throw new BookingError("We couldn't find that payment.", 404);
  if (intent.status !== "succeeded") throw new BookingError("Your payment hasn't gone through yet.", 402);

  const row = await findRow(userId, intent.metadata.bookingId ?? "");
  if (!row || row.payment_intent_id !== intent.id) throw new BookingError("We couldn't find that payment.", 404);
  if (row.status === "confirmed" || row.status === "cancelled") {
    // Already confirmed by the other path (app or webhook); finish the host's side if it didn't run.
    if (row.status === "confirmed") await onBookingPaid(row.id, intent.latest_charge ?? null);
    return toBooking(row);
  }

  // Paid but can't be booked any more: give the money back.
  const refundAndFail = async (message: string, status: number) => {
    await stripeRequest("POST", "refunds", { payment_intent: intent.id }, `refund-unbooked-${intent.id}`);
    throw new BookingError(`${message} You haven't been charged.`, status);
  };
  if (intent.amount !== row.total * 100 || intent.currency !== "gbp") {
    return refundAndFail("The price changed while you were paying.", 409);
  }

  try {
    // From held, or from an expired hold if nobody has taken the dates since.
    await sql()`
      UPDATE bookings SET status = 'confirmed', held_until = NULL, amount_paid = ${intent.amount / 100}
      WHERE id = ${row.id} AND user_id = ${userId} AND status IN ('held', 'expired')`;
  } catch (error) {
    if (isOverlap(error)) return refundAndFail(overlapError(error).message, 409);
    throw error;
  }
  // The host's 85% moves to their Stripe balance now, or waits until they set up payouts.
  await onBookingPaid(row.id, intent.latest_charge ?? null);
  const confirmed = await findRow(userId, row.id);
  if (!confirmed) throw new BookingError("We couldn't find that trip.", 404);
  return toBooking(confirmed);
}

/** Cancels an upcoming trip and refunds what its tier allows. */
export async function cancelBooking(userId: string, id: string): Promise<Booking> {
  const row = await findRow(userId, id);
  if (!row || (row.status !== "confirmed" && row.status !== "cancelled")) {
    throw new BookingError("We couldn't find that trip.", 404);
  }
  if (row.status !== "confirmed" || row.check_out < toIso(new Date())) {
    throw new BookingError("Only upcoming trips can be cancelled.", 400);
  }

  let refunded: number | null = null;
  if (row.payment_intent_id && row.amount_paid) {
    const pence = refundFor(tierOf(row.policy_title), row.amount_paid * 100, row.price_per_night * 100, row.check_in);
    if (pence > 0) {
      // Take the host's part of the refund back from their balance first (prompts/23).
      await beforeRefund(row.id, pence / 100);
      await stripeRequest("POST", "refunds", { payment_intent: row.payment_intent_id, amount: pence }, `refund-${row.id}`);
    }
    refunded = pence / 100;
  }
  await sql()`UPDATE bookings SET status = 'cancelled', refunded = ${refunded} WHERE id = ${id} AND user_id = ${userId}`;
  const cancelled = await findRow(userId, id);
  if (!cancelled) throw new BookingError("We couldn't find that trip.", 404);
  return toBooking(cancelled);
}

export function bookingErrorResponse(error: unknown, action: string) {
  if (error instanceof BookingError || error instanceof StripeError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(`${action} failed:`, error instanceof Error ? error.message : error);
  return Response.json({ error: "Bookings are unavailable right now." }, { status: 502 });
}
