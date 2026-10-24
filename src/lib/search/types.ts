import type { ParsedQuery } from "./parse-query";
import type { AmenityKey, Category, PropertyType } from "./vocabulary";

// Shapes the API routes return. Shared by the routes and the screens.

export type StayCard = {
  _id: string;
  slug: string;
  title: string;
  place: { city: string; region: string };
  rating: number;
  reviewCount: number;
  /** Whole pounds. */
  pricePerNight: number;
  amenities: AmenityKey[];
  petsAllowed: boolean;
  category: Category;
  propertyType: PropertyType;
  imageUrl: string | null;
  imageAlt: string | null;
};

export type SearchSort = "best" | "priceLow" | "priceHigh" | "rating";

export type UnderstoodChip = {
  /** What tapping the chip removes, e.g. "price", "amenity:hotTub", "soft:quiet". */
  key: string;
  label: string;
};

export type SearchRequest = { query: string; sort?: SearchSort } | { parsed: ParsedQuery; sort?: SearchSort };

export type SearchResponse = {
  parsed: ParsedQuery;
  understood: UnderstoodChip[];
  count: number;
  results: StayCard[];
};

export type PolicyText = { _id: string; title: string; topic: string; summary: string; body: string };

export type StayDetails = StayCard & {
  summary: string;
  description: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  images: { _key: string; url: string; alt: string }[];
  houseRules: string[];
  checkInTime: string | null;
  checkOutTime: string | null;
  host: { name: string; superhost: boolean; joinedYear: number | null; bio: string | null } | null;
  cancellationPolicy: PolicyText | null;
  havenlyPolicies: PolicyText[];
};
