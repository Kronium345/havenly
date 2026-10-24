import { createClerkClient } from "@clerk/backend";

import { MAX_NIGHTS, MAX_SAVED_BOOKINGS, type Booking, type NewBooking } from "../bookings-shared";
import { addDays, isIsoDate, nightsBetween, toIso } from "../dates";

import { sanityQuery } from "./sanity";

// Server only. Bookings live in the signed-in user's Clerk private metadata, which only
// the secret key can read or write. Prices come from Sanity, never from the app.

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

export async function createBooking(userId: string, input: NewBooking): Promise<Booking> {
  // One day of slack: the guest's "today" can be the server's yesterday.
  if (input.checkIn < addDays(toIso(new Date()), -1)) {
    throw new BookingError("Check-in can't be in the past.", 400);
  }
  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (nights < 1) throw new BookingError("Check-out must be after check-in.", 400);
  if (nights > MAX_NIGHTS) throw new BookingError(`Trips can be up to ${MAX_NIGHTS} nights.`, 400);

  const stay = await sanityQuery<{
    _id: string;
    slug: string;
    title: string;
    place: { city: string; region: string };
    imageUrl: string | null;
    pricePerNight: number;
    maxGuests: number;
  } | null>(
    `*[_type == "property" && _id == $id][0]{_id, "slug": slug.current, title, "place": place{city, region}, "imageUrl": images[0].asset->url, pricePerNight, maxGuests}`,
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
    total: stay.pricePerNight * nights,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
  await saveBookings(userId, sortByCheckIn([...bookings, booking]));
  return booking;
}

export async function cancelBooking(userId: string, id: string): Promise<Booking> {
  const bookings = await listBookings(userId);
  const booking = bookings.find((b) => b.id === id);
  if (!booking) throw new BookingError("We couldn't find that trip.", 404);
  if (booking.status !== "confirmed" || booking.checkOut < toIso(new Date())) {
    throw new BookingError("Only upcoming trips can be cancelled.", 400);
  }
  const cancelled: Booking = { ...booking, status: "cancelled" };
  await saveBookings(userId, bookings.map((b) => (b.id === id ? cancelled : b)));
  return cancelled;
}

export function bookingErrorResponse(error: unknown, action: string) {
  if (error instanceof BookingError) return Response.json({ error: error.message }, { status: error.status });
  console.error(`${action} failed:`, error instanceof Error ? error.message : error);
  return Response.json({ error: "Bookings are unavailable right now." }, { status: 502 });
}
