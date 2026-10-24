import {
  amenityKeys,
  categories,
  propertyTypes,
  softWords,
  usStates,
  type AmenityKey,
  type Category,
  type PropertyType,
  type SoftWord,
} from "./vocabulary";

// Reads the hard limits out of a guest's sentence in code (AGENTS: prices, guests and
// dates are parsed in code). What's left over only ranks results; it never filters.

export type SearchFilters = {
  types?: PropertyType[];
  category?: Category;
  /** Whole pounds per night. */
  minPrice?: number;
  maxPrice?: number;
  guests?: number;
  pets?: boolean;
  amenities?: AmenityKey[];
  /** US state code, e.g. "CA". */
  region?: string;
  /** A city that exists in the stays, as stored. */
  city?: string;
};

export type ParsedQuery = {
  filters: SearchFilters;
  soft: SoftWord[];
  nights?: number;
  /** Leftover words, used for ranking only. */
  rest: string;
};

const numberWords: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
};
const NUMBER = `(\\d{1,2}|${Object.keys(numberWords).join("|")})`;
const toNumber = (value: string) => numberWords[value] ?? Number(value);

const MONEY = `(\\d{2,5})`;
const CURRENCY_WORDS = `(?:\\s*(?:pounds|gbp|quid|dollars|usd|bucks))`;
const PER_NIGHT = /\b(?:a|per|each|\/)\s*night\b|\/\s*night\b|\bnightly\b/g;

const typeWords: [RegExp, PropertyType[]][] = [
  [/\ba[- ]?frames?\b/, ["a-frame"]],
  [/\bcabins?\b/, ["cabin", "a-frame"]],
  [/\bcottages?\b/, ["cottage"]],
  [/\bvillas?\b/, ["villa"]],
  [/\b(?:apartments?|flats?|studios?|lofts?)\b/, ["apartment"]],
  [/\b(?:houses?|townhouses?)\b/, ["house"]],
];

const categoryWords: [RegExp, Category][] = [
  [/\bbeach\b(?!\s*(?:access|front))/, "beach"],
  [/\bcity\b/, "city"],
];

// Longest phrases first so "hot tub" wins over a stray "tub".
const amenityWords: [RegExp, AmenityKey][] = [
  [/\b(?:hot ?tubs?|jacuzzis?|spa)\b/, "hotTub"],
  [/\b(?:swimming )?pools?\b/, "pool"],
  [/\b(?:wi-?fi|internet)\b/, "wifi"],
  [/\b(?:fireplaces?|log burners?|wood stoves?)\b/, "fireplace"],
  [/\b(?:ocean|sea) ?views?\b/, "oceanView"],
  [/\bforest ?views?\b/, "forestViews"],
  [/\bmountain ?views?\b/, "mountainViews"],
  [/\bkitchens?\b/, "kitchen"],
  [/\bparking\b/, "parking"],
  [/\b(?:air ?con(?:ditioning)?|aircon|a\/c)\b/, "airConditioning"],
  [/\b(?:washer|washing machine|laundry)\b/, "washer"],
  [/\b(?:workspace|desk|home office|work from)\b/, "workspace"],
  [/\bev ?charg(?:er|ing)\b/, "evCharger"],
  [/\b(?:beachfront|beach access|on the beach)\b/, "beachAccess"],
];

const stopWords = new Set(
  (
    "a an the with and or in on at for to of near by some something somewhere place places stay stays " +
    "i we me us my our want wanted need looking look find show please that is has have would like " +
    "under below less than max up no more than around about per night nights nightly trip weekend week " +
    "guests guest people adults persons travellers travelers sleeps friendly"
  ).split(" "),
);

export type ParseOptions = {
  /** Cities that exist in the stays, as stored ("Lake Arrowhead"). */
  cities?: string[];
};

export function parseQuery(input: string, { cities = [] }: ParseOptions = {}): ParsedQuery {
  const original = input.slice(0, 300);
  let text = ` ${original.toLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ")} `;
  const filters: SearchFilters = {};
  let nights: number | undefined;

  const take = (pattern: RegExp, replaceWith = " ") => {
    const match = text.match(pattern);
    if (match) text = text.replace(pattern, replaceWith);
    return match;
  };

  // Nights first, so "for 3 nights" isn't read as 3 guests.
  const nightCount = take(new RegExp(`\\b${NUMBER}\\s+nights?\\b`));
  if (nightCount) nights = toNumber(nightCount[1]);
  const weeks = take(new RegExp(`\\b(?:a|one|${NUMBER})\\s+weeks?\\b`));
  if (!nights && weeks) nights = 7 * (weeks[1] ? toNumber(weeks[1]) : 1);
  if (!nights && take(/\b(?:this |a |the )?weekend\b/)) nights = 2;
  text = text.replace(PER_NIGHT, " ");

  // Prices in pounds. "$" and "dollars" are read as the same number of pounds.
  const range =
    take(new RegExp(`(?:between\\s+)?[£$]\\s?${MONEY}\\s*(?:-|–|to|and)\\s*[£$]?\\s?${MONEY}${CURRENCY_WORDS}?`)) ??
    take(new RegExp(`\\bbetween\\s+${MONEY}\\s*(?:and|-|–|to)\\s*${MONEY}${CURRENCY_WORDS}?`));
  if (range) {
    const [low, high] = [Number(range[1]), Number(range[2])].sort((a, b) => a - b);
    filters.minPrice = low;
    filters.maxPrice = high;
  } else {
    const cap =
      take(
        new RegExp(
          `\\b(?:under|below|less than|max(?:imum)?|up to|no more than|cheaper than|within)\\s*[£$]?\\s?${MONEY}${CURRENCY_WORDS}?`,
        ),
      ) ??
      take(new RegExp(`<\\s*[£$]?\\s?${MONEY}`)) ??
      take(new RegExp(`[£$]\\s?${MONEY}\\s*(?:or less|or under|max(?:imum)?)?`)) ??
      take(new RegExp(`\\b${MONEY}${CURRENCY_WORDS}`));
    if (cap) filters.maxPrice = Number(cap[1]);
    const floor = take(new RegExp(`\\b(?:over|above|more than|at least|from)\\s*[£$]\\s?${MONEY}`));
    if (floor) filters.minPrice = Number(floor[1]);
  }

  // Guests.
  if (take(/\b(?:a |for a |for two as a )?couples?\b/)) filters.guests = 2;
  const guestCount =
    take(new RegExp(`\\b${NUMBER}\\s+(?:guests?|people|adults|persons|travell?ers|of us)\\b`)) ??
    take(new RegExp(`\\b(?:family|group|party) of\\s+${NUMBER}\\b`)) ??
    take(new RegExp(`\\bsleeps\\s+${NUMBER}\\b`)) ??
    take(new RegExp(`\\bfor\\s+${NUMBER}\\b`));
  if (guestCount) filters.guests = toNumber(guestCount[1]);

  // Pets: only ever a "must allow pets" filter, never "no pets".
  if (take(/\b(?:pet[- ]?friendly|pets? allowed|pets?|dogs?|cats?|puppy|puppies)\b/g)) filters.pets = true;

  // Amenities.
  // "no wifi", "without a pool" or "don't need parking" is not a requirement: drop those words.
  const amenities: AmenityKey[] = [];
  for (const [pattern, key] of amenityWords) {
    take(new RegExp(`\\b(?:no|without|dont need|do not need|not)\\s+(?:a |an |any )?(?:${pattern.source})`, "g"));
    if (take(new RegExp(pattern.source, "g")) && !amenities.includes(key)) amenities.push(key);
  }
  if (amenities.length > 0) filters.amenities = amenities;

  // Stay type, then category words.
  for (const [pattern, types] of typeWords) {
    if (take(new RegExp(pattern.source, "g"))) {
      filters.types = [...new Set([...(filters.types ?? []), ...types])];
    }
  }
  for (const [pattern, category] of categoryWords) {
    if (!filters.category && take(new RegExp(pattern.source, "g"))) filters.category = category;
  }

  // Place: a known city first, then a state name, then an upper-case state code as typed.
  const city = [...cities]
    .sort((a, b) => b.length - a.length)
    .find((name) => new RegExp(`\\b${escapeRegExp(name.toLowerCase())}\\b`).test(text));
  if (city) {
    filters.city = city;
    take(new RegExp(`\\b${escapeRegExp(city.toLowerCase())}\\b`, "g"));
  }
  const stateName = Object.keys(usStates)
    .sort((a, b) => b.length - a.length)
    .find((name) => new RegExp(`\\b${name}\\b`).test(text));
  if (stateName) {
    filters.region = usStates[stateName];
    take(new RegExp(`\\b${stateName}\\b`, "g"));
  } else {
    const code = original.match(/\b([A-Z]{2})\b/);
    if (code && Object.values(usStates).includes(code[1])) {
      filters.region = code[1];
      take(new RegExp(`\\b${code[1].toLowerCase()}\\b`));
    }
  }

  // Soft words rank only.
  const soft: SoftWord[] = [];
  for (const word of softWords) {
    const pattern = word === "cozy" ? /\bcos(?:y|ier)\b|\bcoz(?:y|ier)\b/g : new RegExp(`\\b${word}\\b`, "g");
    if (take(pattern) && !soft.includes(word)) soft.push(word);
  }

  const rest = text
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !stopWords.has(word) && !/^\d+$/.test(word))
    .join(" ");

  return { filters, soft, nights, rest };
}

/** Keeps only known values and sane numbers in a parsed query sent back by the app. */
export function sanitizeParsedQuery(value: unknown): ParsedQuery | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<ParsedQuery>;
  const raw = (input.filters ?? {}) as SearchFilters;
  const whole = (n: unknown, min: number, max: number) =>
    typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : undefined;
  const text = (s: unknown, max: number) => (typeof s === "string" ? s.slice(0, max) : undefined);

  const filters: SearchFilters = {
    types: Array.isArray(raw.types) ? raw.types.filter((t) => propertyTypes.includes(t)) : undefined,
    category: categories.includes(raw.category as Category) ? raw.category : undefined,
    minPrice: whole(raw.minPrice, 0, 100000),
    maxPrice: whole(raw.maxPrice, 0, 100000),
    guests: whole(raw.guests, 1, 50),
    pets: raw.pets === true ? true : undefined,
    amenities: Array.isArray(raw.amenities) ? raw.amenities.filter((a) => amenityKeys.includes(a)) : undefined,
    region: typeof raw.region === "string" && /^[A-Z]{2}$/.test(raw.region) ? raw.region : undefined,
    city: text(raw.city, 60),
  };
  for (const key of Object.keys(filters) as (keyof SearchFilters)[]) {
    const entry = filters[key];
    if (entry === undefined || (Array.isArray(entry) && entry.length === 0)) delete filters[key];
  }

  return {
    filters,
    soft: Array.isArray(input.soft) ? input.soft.filter((w): w is SoftWord => softWords.includes(w)) : [],
    nights: whole(input.nights, 1, 60),
    rest: text(input.rest, 200) ?? "",
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
