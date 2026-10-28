import { STAY_EDIT_LIMITS, STAY_TIMES, type HostStayEditable, type StayEdit } from "../host-shared";
import { amenityKeys, type AmenityKey } from "../search/vocabulary";

import { HOST_ORG_ID, hostOrgParams } from "./clerk-mode";
import { HostError } from "./host";
import { sanityQuery } from "./sanity";

// Server only. Host owners edit a stay's practical details (prompts/22). Writes go to the
// published stay with SANITY_HOST_WRITE_TOKEN (Editor robot token, server-only), only for
// the fields in StayEdit, only on a stay the company hosts, and only at the revision the
// owner last loaded (`ifRevisionID`), so two editors can't overwrite each other.

const projectId = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.EXPO_PUBLIC_SANITY_DATASET;
const API_VERSION = "v2025-02-19";

const EDITABLE = `{"rev": _rev, pricePerNight, maxGuests, "houseRules": coalesce(houseRules, []), "checkInTime": coalesce(checkInTime, ""), "checkOutTime": coalesce(checkOutTime, ""), "petsAllowed": coalesce(petsAllowed, false), "amenities": coalesce(amenities, []), "highlights": coalesce(highlights, [])}`;

/** The stay's editable fields and revision, if the company hosts it. */
export async function hostStayEditable(orgId: string, stayId: string): Promise<HostStayEditable> {
  const stay = await sanityQuery<HostStayEditable | null>(
    `*[_type == "property" && _id == $stayId && ${HOST_ORG_ID} == $orgId][0]${EDITABLE}`,
    { orgId, stayId, ...hostOrgParams() },
  );
  if (!stay) throw new HostError("We couldn't find that stay.", 404);
  return stay;
}

function wholeNumber(value: unknown, label: string, { min, max }: { min: number; max: number }) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new HostError(`${label} must be a whole number from ${min} to ${max.toLocaleString("en-GB")}.`, 400);
  }
  return value;
}

function lines(value: unknown, label: string, { count, length }: { count: number; length: number }) {
  if (!Array.isArray(value) || value.some((line) => typeof line !== "string")) throw new HostError(`${label} must be a list.`, 400);
  const cleaned = (value as string[]).map((line) => line.trim()).filter(Boolean);
  if (cleaned.length > count) throw new HostError(`Add up to ${count} ${label.toLowerCase()}.`, 400);
  if (cleaned.some((line) => line.length > length)) throw new HostError(`Keep each of the ${label.toLowerCase()} under ${length} characters.`, 400);
  return cleaned;
}

function time(value: unknown, label: string) {
  if (typeof value !== "string" || !STAY_TIMES.includes(value)) throw new HostError(`Pick a ${label} time from the list.`, 400);
  return value;
}

/** Validates a full edit against the schema's limits. Unknown fields are ignored. */
export function parseStayEdit(body: unknown): { edit: StayEdit; rev: string } {
  const input = (body ?? {}) as Record<string, unknown>;
  if (typeof input.rev !== "string" || !input.rev) throw new HostError("Reload the stay and try again.", 400);
  if (typeof input.petsAllowed !== "boolean") throw new HostError("Say whether pets are allowed.", 400);
  if (!Array.isArray(input.amenities) || input.amenities.some((key) => !amenityKeys.includes(key as AmenityKey))) {
    throw new HostError("Pick amenities from the list.", 400);
  }
  return {
    rev: input.rev,
    edit: {
      pricePerNight: wholeNumber(input.pricePerNight, "Price per night", STAY_EDIT_LIMITS.price),
      maxGuests: wholeNumber(input.maxGuests, "Guests", STAY_EDIT_LIMITS.guests),
      houseRules: lines(input.houseRules, "House rules", STAY_EDIT_LIMITS.houseRules),
      checkInTime: time(input.checkInTime, "check-in"),
      checkOutTime: time(input.checkOutTime, "check-out"),
      petsAllowed: input.petsAllowed,
      amenities: [...new Set(input.amenities as AmenityKey[])],
      highlights: lines(input.highlights, "Highlights", STAY_EDIT_LIMITS.highlights),
    },
  };
}

/** Saves an owner's edit to the published stay, then returns the new values and revision. */
export async function updateHostStay(orgId: string, stayId: string, body: unknown): Promise<HostStayEditable> {
  const { edit, rev } = parseStayEdit(body);
  await hostStayEditable(orgId, stayId); // the company must host it

  const token = process.env.SANITY_HOST_WRITE_TOKEN;
  if (!token || !projectId || !dataset) throw new HostError("Editing stays isn't set up yet.", 503);
  const response = await fetch(`https://${projectId}.api.sanity.io/${API_VERSION}/data/mutate/${dataset}?returnIds=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mutations: [{ patch: { id: stayId, ifRevisionID: rev, set: edit } }] }),
  });
  if (response.status === 409) throw new HostError("This stay changed since you opened it. Reload and try again.", 409);
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: { description?: string } } | null;
    throw new Error(`Sanity write failed (${response.status}): ${detail?.error?.description ?? "no detail"}`);
  }
  return hostStayEditable(orgId, stayId);
}
