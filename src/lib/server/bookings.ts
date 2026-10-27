import { createClerkClient } from "@clerk/backend";

import {
  MAX_NIGHTS,
  MAX_SAVED_BOOKINGS,
  type Booking,
  type CheckoutSession,
  type NewBooking,
} from "../bookings-shared";
import { addDays, isIsoDate, nightsBetween, toIso } from "../dates";

import { refundFor, tierOf } from "./refunds";
import { sanityQuery } from "./sanity";
import { customerSession, ensureCustomer, stripeRequest, StripeError, type PaymentIntent } from "./stripe";

// Server only. Bookings live in the signed-in user's Clerk private metadata, which only
// the secret key can read or write. Prices come from Sanity, never from the app. A trip
// is saved only after Stripe confirms its PaymentIntent succeeded for this guest and
// amount; cancelling refunds by the stay's tier (refunds.ts).

export class BookingError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function clerk() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new BookingError("Server is not configured.", 500);
  return createClerkClient({ secretKey });
}

export async function listBookings(userId: string): Promise<Booking[]> {
  const user = await clerk().users.getUser(userId);
  const stored = (user.privateMetadata as { bookings?: unknown }).bookings;
  return Array.isArray(stored) ? (stored as Booking[]) : [];
}

async function saveBookings(userId: string, bookings: Booking[]) {
  await clerk().users.updateUserMetadata(userId, { privateMetadata: { bookings } });
}

const sortByCheckIn = (bookings: Booking[]) =>
  [...bookings].sort((a, b) => b.checkIn.localeCompare(a.checkIn));

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
};

/** Checks a trip the guest wants (dates, guests, overlaps) and prices it from Sanity. */
async function quote(userId: string, input: NewBooking) {
  // One day of slack: the guest's "today" can be the server's yesterday.
  if (input.checkIn < addDays(toIso(new Date()), -1)) {
    throw new BookingError("Check-in can't be in the past.", 400);
  }
  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (nights < 1) throw new BookingError("Check-out must be after check-in.", 400);
  if (nights > MAX_NIGHTS) throw new BookingError(`Trips can be up to ${MAX_NIGHTS} nights.`, 400);

  const stay = await sanityQuery<QuotedStay | null>(
    `*[_type == "property" && _id == $id][0]{_id, "slug": slug.current, title, "place": place{city, region}, "imageUrl": images[0].asset->url, pricePerNight, maxGuests, "policyTitle": cancellationPolicy->title}`,
    { id: input.stayId },
  );
  if (!stay) throw new BookingError("This stay isn't available anymore.", 404);
  if (input.guests < 1 || input.guests > stay.maxGuests) {
    throw new BookingError(`This stay sleeps up to ${stay.maxGuests}.`, 400);
  }

  const bookings = await listBookings(userId);
  const overlaps = bookings.some(
    (b) => b.status === "confirmed" && input.checkIn < b.checkOut && b.checkIn < input.checkOut,
  );
  if (overlaps) throw new BookingError("You already have a trip on those dates.", 409);
  if (bookings.length >= MAX_SAVED_BOOKINGS) throw new BookingError("You have too many bookings saved.", 400);

  return { stay, nights, total: stay.pricePerNight * nights, bookings };
}

/** Starts paying for a trip: a PaymentIntent for the Sanity price, and a CustomerSession for saved cards. */
export async function startCheckout(userId: string, input: NewBooking): Promise<CheckoutSession> {
  const { stay, total } = await quote(userId, input);
  const customerId = await ensureCustomer(userId);
  const intent = await stripeRequest<PaymentIntent>("POST", "payment_intents", {
    amount: total * 100,
    currency: "gbp",
    customer: customerId,
    allowed_payment_method_types: ["card"],
    description: `${stay.title}, ${input.checkIn} to ${input.checkOut}`,
    metadata: { userId, stayId: stay._id, checkIn: input.checkIn, checkOut: input.checkOut, guests: String(input.guests) },
  });
  return {
    paymentIntentId: intent.id,
    paymentIntentClientSecret: intent.client_secret,
    customerSessionClientSecret: await customerSession(customerId),
    customerId,
    total,
  };
}

export function parsePaymentIntentId(body: unknown): string {
  const id = (body as { paymentIntentId?: unknown } | null)?.paymentIntentId;
  if (typeof id !== "string" || !/^pi_\w{8,}$/.test(id)) throw new BookingError("Pay for your trip first.", 400);
  return id;
}

/** Saves a trip once Stripe says its payment succeeded. The same payment never books twice. */
export async function createPaidBooking(userId: string, paymentIntentId: string): Promise<Booking> {
  const intent = await stripeRequest<PaymentIntent>("GET", `payment_intents/${paymentIntentId}`);
  if (intent.metadata.userId !== userId) throw new BookingError("We couldn't find that payment.", 404);
  if (intent.status !== "succeeded") throw new BookingError("Your payment hasn't gone through yet.", 402);

  const existing = (await listBookings(userId)).find((b) => b.paymentIntentId === intent.id);
  if (existing) return existing;

  const input: NewBooking = {
    stayId: intent.metadata.stayId,
    checkIn: intent.metadata.checkIn,
    checkOut: intent.metadata.checkOut,
    guests: Number(intent.metadata.guests),
  };
  let quoted: Awaited<ReturnType<typeof quote>>;
  try {
    quoted = await quote(userId, input);
    if (quoted.total * 100 !== intent.amount || intent.currency !== "gbp") {
      throw new BookingError("The price changed while you were paying.", 409);
    }
  } catch (error) {
    // Paid but can't be booked any more: give the money back.
    if (error instanceof BookingError) {
      await stripeRequest("POST", "refunds", { payment_intent: intent.id }, `refund-unbooked-${intent.id}`);
      throw new BookingError(`${error.message} You haven't been charged.`, error.status);
    }
    throw error;
  }

  const { stay, nights, total, bookings } = quoted;
  const booking: Booking = {
    id: crypto.randomUUID(),
    stayId: stay._id,
    slug: stay.slug,
    title: stay.title,
    place: stay.place,
    imageUrl: stay.imageUrl,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
    guests: input.guests,
    pricePerNight: stay.pricePerNight,
    total,
    status: "confirmed",
    createdAt: new Date().toISOString(),
    paymentIntentId: intent.id,
    amountPaid: intent.amount / 100,
    policyTitle: stay.policyTitle ?? undefined,
  };
  await saveBookings(userId, sortByCheckIn([...bookings, booking]));
  return booking;
}

/** Cancels an upcoming trip and refunds what its tier allows. */
export async function cancelBooking(userId: string, id: string): Promise<Booking> {
  const bookings = await listBookings(userId);
  const booking = bookings.find((b) => b.id === id);
  if (!booking) throw new BookingError("We couldn't find that trip.", 404);
  if (booking.status !== "confirmed" || booking.checkOut < toIso(new Date())) {
    throw new BookingError("Only upcoming trips can be cancelled.", 400);
  }

  let refunded: number | undefined;
  if (booking.paymentIntentId && booking.amountPaid) {
    const pence = refundFor(tierOf(booking.policyTitle), booking.amountPaid * 100, booking.pricePerNight * 100, booking.checkIn);
    if (pence > 0) {
      await stripeRequest("POST", "refunds", { payment_intent: booking.paymentIntentId, amount: pence }, `refund-${booking.id}`);
    }
    refunded = pence / 100;
  }
  const cancelled: Booking = { ...booking, status: "cancelled", refunded };
  await saveBookings(userId, bookings.map((b) => (b.id === id ? cancelled : b)));
  return cancelled;
}

export function bookingErrorResponse(error: unknown, action: string) {
  if (error instanceof BookingError || error instanceof StripeError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(`${action} failed:`, error instanceof Error ? error.message : error);
  return Response.json({ error: "Bookings are unavailable right now." }, { status: 502 });
}
