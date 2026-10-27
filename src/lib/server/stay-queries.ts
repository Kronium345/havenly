import type { ParsedQuery } from "../search/parse-query";
import type { SearchSort, StayCard, StayDetails } from "../search/types";

import { contextQuery } from "./context";
import { sanityQuery } from "./sanity";

// GROQ for stays. Filters are built only from keys that are present, and every value
// goes in as a param.

const CARD_FIELD_LIST = `
  _id,
  "slug": slug.current,
  title,
  "place": place{city, region},
  rating,
  reviewCount,
  pricePerNight,
  "amenities": coalesce(amenities, []),
  petsAllowed,
  category,
  propertyType,
  "imageUrl": images[0].asset->url,
  "imageAlt": images[0].alt
`;
export const CARD_FIELDS = `{${CARD_FIELD_LIST}}`;

const orderBy: Record<SearchSort, string> = {
  best: "order(_score desc, rating desc, reviewCount desc)",
  priceLow: "order(pricePerNight asc, rating desc)",
  priceHigh: "order(pricePerNight desc, rating desc)",
  rating: "order(rating desc, reviewCount desc)",
};

export function buildSearch(parsed: ParsedQuery, sort: SearchSort) {
  const { filters } = parsed;
  const conditions = ['_type == "property"', "defined(slug.current)"];
  const params: Record<string, unknown> = {};

  if (filters.types?.length) {
    conditions.push("propertyType in $types");
    params.types = filters.types;
  }
  if (filters.category) {
    conditions.push("category == $category");
    params.category = filters.category;
  }
  if (filters.minPrice !== undefined) {
    conditions.push("pricePerNight >= $minPrice");
    params.minPrice = filters.minPrice;
  }
  if (filters.maxPrice !== undefined) {
    conditions.push("pricePerNight <= $maxPrice");
    params.maxPrice = filters.maxPrice;
  }
  if (filters.guests) {
    conditions.push("maxGuests >= $guests");
    params.guests = filters.guests;
  }
  if (filters.pets === true) conditions.push("petsAllowed == true");
  if (filters.pets === false) conditions.push("petsAllowed != true");
  if (filters.amenities?.length) {
    conditions.push("count(amenities[@ in $amenities]) == $amenityCount");
    params.amenities = filters.amenities;
    params.amenityCount = filters.amenities.length;
  }
  if (filters.notTypes?.length) {
    conditions.push("!(propertyType in $notTypes)");
    params.notTypes = filters.notTypes;
  }
  if (filters.notAmenities?.length) {
    conditions.push("count(coalesce(amenities, [])[@ in $notAmenities]) == 0");
    params.notAmenities = filters.notAmenities;
  }
  if (filters.region) {
    conditions.push("place.region == $region");
    params.region = filters.region;
  }
  if (filters.city) {
    conditions.push("lower(place.city) == lower($city)");
    params.city = filters.city;
  }

  const filter = `*[${conditions.join(" && ")}]`;
  // Soft words and leftover words rank by meaning; with neither, "best" falls back to rating.
  const rankingText = [...parsed.soft, parsed.rest].join(" ").trim();
  let ranked = filter;
  let order = orderBy[sort];
  if (rankingText) {
    ranked = `${filter} | score(text::semanticSimilarity($text))`;
    params.text = rankingText;
  } else if (sort === "best") {
    order = orderBy.rating;
  }

  const query = `{
    "count": count(${filter}),
    "results": ${ranked} | ${order}[0...50]${CARD_FIELDS}
  }`;
  return { query, params };
}

/** Runs through the havenly-search Context endpoint, falling back to Sanity directly. */
export async function searchStays(
  parsed: ParsedQuery,
  sort: SearchSort,
): Promise<SearchResult & { via: "context" | "direct" }> {
  const { query, params } = buildSearch(parsed, sort);
  try {
    return { ...(await contextQuery<SearchResult>(query, params)), via: "context" };
  } catch (error) {
    console.warn("Context query failed, used direct:", error instanceof Error ? error.message : error);
    return { ...(await sanityQuery<SearchResult>(query, params)), via: "direct" };
  }
}

type SearchResult = { count: number; results: StayCard[] };

export function allStays() {
  return sanityQuery<StayCard[]>(
    `*[_type == "property" && defined(slug.current)] | order(rating desc, reviewCount desc)${CARD_FIELDS}`,
  );
}

export function stayBySlug(slug: string) {
  return sanityQuery<StayDetails | null>(
    `*[_type == "property" && slug.current == $slug][0]{
      ${CARD_FIELD_LIST},
      summary,
      description,
      maxGuests,
      bedrooms,
      beds,
      bathrooms,
      "images": images[]{_key, "url": asset->url, alt},
      "houseRules": coalesce(houseRules, []),
      checkInTime,
      checkOutTime,
      "host": host->{name, superhost, joinedYear, bio},
      "cancellationPolicy": cancellationPolicy->{_id, title, topic, summary, body},
      "havenlyPolicies": *[_type == "policy" && topic != "cancellation"] | order(title asc){_id, title, topic, summary, body}
    }`,
    { slug },
  );
}

let citiesCache: { cities: string[]; at: number } | null = null;
const CITIES_TTL_MS = 5 * 60 * 1000;

/** City names that exist in the stays, so the parser can recognize them; `cached` says whether Sanity was skipped. */
export async function knownCities(): Promise<{ cities: string[]; cached: boolean }> {
  if (citiesCache && Date.now() - citiesCache.at < CITIES_TTL_MS) return { cities: citiesCache.cities, cached: true };
  const cities = await sanityQuery<string[]>(`array::unique(*[_type == "property"].place.city)`);
  citiesCache = { cities: cities.filter(Boolean), at: Date.now() };
  return { cities: citiesCache.cities, cached: false };
}

/** Stay cards for these ids, in the order given; unknown ids are left out. */
export async function staysByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const found = await sanityQuery<StayCard[]>(
    `*[_type == "property" && defined(slug.current) && _id in $ids]${CARD_FIELDS}`,
    { ids },
  );
  const byId = new Map(found.map((stay) => [stay._id, stay]));
  return ids.map((id) => byId.get(id)).filter((stay): stay is StayCard => stay !== undefined);
}
