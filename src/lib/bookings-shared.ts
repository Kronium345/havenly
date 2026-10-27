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
  /** Stripe payment. Absent on trips booked before payments existed. */
  paymentIntentId?: string;
  /** Whole pounds charged. */
  amountPaid?: number;
  /** The stay's cancellation policy when booked, which sets the refund. */
  policyTitle?: string;
  /** Whole pounds refunded on cancel (0 when the tier allows none). */
  refunded?: number;
};

export type NewBooking = { stayId: string; checkIn: IsoDate; checkOut: IsoDate; guests: number };

/** What `/api/bookings/checkout` returns for Stripe's PaymentSheet. */
export type CheckoutSession = {
  /** The held booking; release it if the guest doesn't pay. */
  bookingId: string;
  paymentIntentId: string;
  paymentIntentClientSecret: string;
  customerSessionClientSecret: string;
  customerId: string;
  /** Whole pounds. */
  total: number;
};

export const MAX_NIGHTS = 30;

/** Upcoming: confirmed and not yet checked out. Everything else is past. */
export function isUpcoming(booking: Booking, todayIso: IsoDate) {
  return booking.status === "confirmed" && booking.checkOut >= todayIso;
}
