// The fixed lists stays are filtered on. They mirror `studio/schemaTypes/shared/options.ts`;
// change both together.

export const propertyTypes = ["cabin", "a-frame", "cottage", "house", "villa", "apartment"] as const;
export type PropertyType = (typeof propertyTypes)[number];

export const categories = ["cabins", "beach", "city", "villas"] as const;
export type Category = (typeof categories)[number];

export const amenityKeys = [
  "hotTub",
  "pool",
  "wifi",
  "fireplace",
  "oceanView",
  "forestViews",
  "mountainViews",
  "kitchen",
  "parking",
  "airConditioning",
  "washer",
  "workspace",
  "evCharger",
  "beachAccess",
] as const;
export type AmenityKey = (typeof amenityKeys)[number];

/** Words that shape ranking only. They never filter stays out. */
export const softWords = [
  "quiet",
  "peaceful",
  "calm",
  "secluded",
  "remote",
  "private",
  "cozy",
  "romantic",
  "modern",
  "rustic",
  "luxury",
  "family",
  "views",
  "sunset",
  "relaxing",
  "budget",
  "cheap",
  "stylish",
  "bright",
  "lively",
  "forest",
  "woods",
  "lake",
  "mountains",
  "desert",
  "tropical",
  "vineyards",
  "getaway",
  "detox",
] as const;
export type SoftWord = (typeof softWords)[number];

export const typeLabels: Record<PropertyType, string> = {
  cabin: "Cabins",
  "a-frame": "A-frames",
  cottage: "Cottages",
  house: "Houses",
  villa: "Villas",
  apartment: "Apartments",
};

export const categoryLabels: Record<Category, string> = {
  cabins: "Cabins",
  beach: "Beach",
  city: "City",
  villas: "Villas",
};

export const usStates: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO",
  connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID",
  illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR",
  pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD",
  tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA",
  "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

export const stateNames: Record<string, string> = Object.fromEntries(
  Object.entries(usStates).map(([name, code]) => [
    code,
    name.replace(/\b\w/g, (letter) => letter.toUpperCase()),
  ]),
);
