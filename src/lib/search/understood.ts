import { formatPrice, plural, regionName } from "../format";
import { amenityLabels } from "../amenity-labels";

import type { ParsedQuery } from "./parse-query";
import type { UnderstoodChip } from "./types";
import { categoryLabels, typeLabels } from "./vocabulary";

const capitalize = (word: string) => word[0].toUpperCase() + word.slice(1);

/** One chip per thing the app understood, in the order the Search screen shows them. */
export function understoodChips({ filters, soft, nights }: ParsedQuery): UnderstoodChip[] {
  const chips: UnderstoodChip[] = [];
  if (filters.types?.length) {
    const label = filters.types.includes("cabin") ? typeLabels.cabin : typeLabels[filters.types[0]];
    chips.push({ key: "types", label });
  }
  if (filters.category) chips.push({ key: "category", label: categoryLabels[filters.category] });
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const { minPrice, maxPrice } = filters;
    const label =
      minPrice !== undefined && maxPrice !== undefined
        ? `${formatPrice(minPrice)}–${formatPrice(maxPrice)}`
        : maxPrice !== undefined
          ? `Under ${formatPrice(maxPrice)}`
          : `From ${formatPrice(minPrice ?? 0)}`;
    chips.push({ key: "price", label });
  }
  if (filters.guests) chips.push({ key: "guests", label: plural(filters.guests, "guest") });
  if (filters.pets) chips.push({ key: "pets", label: "Pet Friendly" });
  for (const amenity of filters.amenities ?? []) {
    chips.push({ key: `amenity:${amenity}`, label: amenityLabels[amenity] });
  }
  if (filters.city) chips.push({ key: "city", label: filters.city });
  if (filters.region) chips.push({ key: "region", label: regionName(filters.region) });
  for (const word of soft) chips.push({ key: `soft:${word}`, label: capitalize(word) });
  if (nights) chips.push({ key: "nights", label: plural(nights, "night") });
  return chips;
}

/** The parsed query without the item a chip stands for. */
export function withoutChip(parsed: ParsedQuery, key: string): ParsedQuery {
  const filters = { ...parsed.filters };
  let { soft, nights } = parsed;
  if (key === "types") delete filters.types;
  else if (key === "category") delete filters.category;
  else if (key === "price") {
    delete filters.minPrice;
    delete filters.maxPrice;
  } else if (key === "guests") delete filters.guests;
  else if (key === "pets") delete filters.pets;
  else if (key === "city") delete filters.city;
  else if (key === "region") delete filters.region;
  else if (key === "nights") nights = undefined;
  else if (key.startsWith("amenity:")) {
    filters.amenities = filters.amenities?.filter((a) => `amenity:${a}` !== key);
    if (!filters.amenities?.length) delete filters.amenities;
  } else if (key.startsWith("soft:")) soft = soft.filter((w) => `soft:${w}` !== key);
  return { ...parsed, filters, soft, nights };
}
