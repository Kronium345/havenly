import type { IsoDate } from "./dates";
import type { StayCard } from "./search/types";

// What /api/host/* returns (prompts/19). Guests appear as first name and last initial only.

export type HostSummary = {
  company: string;
  role: "org:admin" | "org:member";
  stays: number;
  upcomingBookings: number;
  /** Booked nights across the company's stays in the next 30 days. */
  nightsNext30: number;
};

export type HostBooking = {
  id: string;
  stayId: string;
  stayTitle: string;
  imageUrl: string | null;
  /** "Daniel A." */
  guest: string;
  checkIn: IsoDate;
  checkOut: IsoDate;
  nights: number;
  guests: number;
  /** Whole pounds. */
  total: number;
  status: "confirmed" | "cancelled";
};

export type HostStayDetails = {
  stay: StayCard;
  /** Confirmed stays from today on, for the booked-nights calendar. */
  booked: { checkIn: IsoDate; checkOut: IsoDate }[];
  bookings: HostBooking[];
};
