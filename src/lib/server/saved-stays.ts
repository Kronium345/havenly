import { createClerkClient } from "@clerk/backend";

import type { StayCard } from "../search/types";

import { staysByIds } from "./stay-queries";

// Server only. Hearted stays, as stay ids in the guest's Clerk private metadata (newest
// first, at most 100). Cards are loaded fresh from Sanity, so prices stay current.

export const MAX_SAVED_STAYS = 100;

function clerk() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is not set.");
  return createClerkClient({ secretKey });
}

async function savedIds(userId: string): Promise<string[]> {
  const user = await clerk().users.getUser(userId);
  const stored = (user.privateMetadata as { savedStays?: unknown }).savedStays;
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
}

export async function listSavedStays(userId: string): Promise<StayCard[]> {
  return staysByIds(await savedIds(userId));
}

/** Checks a list sent by the app: stay-id-shaped strings, no repeats, at most 100. */
export function parseSavedIds(body: unknown): string[] | null {
  const ids = (body as { ids?: unknown } | null)?.ids;
  if (!Array.isArray(ids) || ids.length > MAX_SAVED_STAYS) return null;
  if (!ids.every((id) => typeof id === "string" && /^[\w-]{1,64}$/.test(id))) return null;
  return [...new Set(ids as string[])];
}

/** Replaces the saved list, keeping only stays that exist. */
export async function replaceSavedStays(userId: string, ids: string[]): Promise<StayCard[]> {
  const stays = await staysByIds(ids);
  await clerk().users.updateUserMetadata(userId, { privateMetadata: { savedStays: stays.map((stay) => stay._id) } });
  return stays;
}
