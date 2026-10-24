import { stateNames } from "./search/vocabulary";

/** Prices are whole pounds: 289 → "£289". */
export function formatPrice(pounds: number) {
  return `£${Math.round(pounds).toLocaleString("en-GB")}`;
}

/** { city: "Lake Arrowhead", region: "CA" } → "Lake Arrowhead, CA". */
export function formatPlace(place: { city: string; region: string }) {
  return `${place.city}, ${place.region}`;
}

export function regionName(code: string) {
  return stateNames[code] ?? code;
}

/** Sanity CDN image at a given width, cropped and in the best format for the device. */
export function sanityImage(url: string | null | undefined, width: number) {
  return url ? `${url}?w=${width}&q=80&auto=format&fit=crop` : undefined;
}

export const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
