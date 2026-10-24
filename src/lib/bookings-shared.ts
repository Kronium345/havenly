import type { IsoDate } from "./dates";

// Shapes shared by the bookings API routes and the app.

export type Booking = {
  id: string;
  stayId: string;
  slug: string;
  title: string;
  place: { city: string; region: string };
  imageUrl: string | null;
  checkIn: IsoDate;
  checkOut: IsoDate;
  nights: number;
  guests: number;
  /** Whole pounds, from Sanity at booking time. */
  pricePerNight: number;
  total: number;
  status: "confirmed" | "cancelled";
  createdAt: string;
};

export type NewBooking = { stayId: string; checkIn: IsoDate; checkOut: IsoDate; guests: number };

export const MAX_NIGHTS = 30;
export const MAX_SAVED_BOOKINGS = 40;

/** Upcoming: confirmed and not yet checked out. Everything else is past. */
export function isUpcoming(booking: Booking, todayIso: IsoDate) {
  return booking.status === "confirmed" && booking.checkOut >= todayIso;
}
