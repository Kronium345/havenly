import type { IsoDate } from "./dates";
import type { AmenityKey } from "./search/vocabulary";
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
  /** The host's 85% (prompts/23): waiting for payout setup, waiting in their balance, or paid. */
  payout: HostPayout;
};

export type HostPayout = {
  state: "none" | "setup_needed" | "waiting" | "paid" | "delayed";
  /** The host's share in pence. */
  sharePence: number;
  /** UK date the payout is (or was) due. */
  dueOn: IsoDate | null;
};

/** Nights a host blocked (prompts/22): no guest can book them. */
export type HostBlock = {
  id: string;
  checkIn: IsoDate;
  checkOut: IsoDate;
  nights: number;
  note: string | null;
};

export type HostStayDetails = {
  stay: StayCard;
  /** Confirmed stays from today on, for the booked-nights calendar. */
  booked: { checkIn: IsoDate; checkOut: IsoDate }[];
  /** Blocks from today on. */
  blocks: HostBlock[];
  bookings: HostBooking[];
};

export const MAX_BLOCK_NIGHTS = 60;
export const MAX_BLOCK_NOTE = 80;

/** What an owner can change on a stay (prompts/22). Everything else is Studio-only. */
export type StayEdit = {
  /** Whole pounds. */
  pricePerNight: number;
  maxGuests: number;
  houseRules: string[];
  checkInTime: string;
  checkOutTime: string;
  petsAllowed: boolean;
  amenities: AmenityKey[];
  highlights: string[];
};

/** The stay's current editable values and its revision, so concurrent edits are caught. */
export type HostStayEditable = StayEdit & { rev: string };

export const STAY_EDIT_LIMITS = {
  price: { min: 1, max: 10_000 },
  guests: { min: 1, max: 30 },
  houseRules: { count: 15, length: 120 },
  highlights: { count: 8, length: 80 },
} as const;

/** Half-hour times from 6:00 AM to 11:30 PM, in the "3:00 PM" form the stays use. */
export const STAY_TIMES: string[] = Array.from({ length: 36 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  const hour24 = Math.floor(minutes / 60);
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minutes % 60 === 0 ? "00" : "30"} ${hour24 < 12 ? "AM" : "PM"}`;
});
