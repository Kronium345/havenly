import { createClerkClient } from "@clerk/backend";

import { toIso } from "../dates";

import { sql } from "./db";
import { existingCustomer, stripeRequest, StripeError } from "./stripe";

// Server only. Deleting an account removes everything personal, in an order that can be
// retried: bookings rows, the Stripe customer (and its saved cards), the PostHog person,
// then the Clerk user (profile, saved stays, sessions). The Clerk user goes last, so a
// failure part-way leaves an account the guest can sign in to and try again with.

export class AccountError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function clerk() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new AccountError("Server is not configured.", 500);
  return createClerkClient({ secretKey });
}

/** Confirmed trips that haven't ended block deletion, so refunds stay explicit. */
async function upcomingTrips(userId: string) {
  const rows = (await sql()`
    SELECT id FROM bookings
    WHERE user_id = ${userId} AND status = 'confirmed' AND check_out >= ${toIso(new Date())}::date`) as { id: string }[];
  return rows.length;
}

/** PostHog's private API host from the ingestion host (eu.i.posthog.com → eu.posthog.com). */
function posthogApiHost() {
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  return host.replace(".i.posthog.com", ".posthog.com");
}

/** Deletes the PostHog person for this user. Skipped (logged) when no personal API key is set. */
async function deletePosthogPerson(userId: string) {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  const project = process.env.POSTHOG_PROJECT_ID;
  if (!key || !project) {
    console.warn("Account deletion: PostHog person not deleted (POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID not set).");
    return;
  }
  const headers = { Authorization: `Bearer ${key}` };
  const base = `${posthogApiHost()}/api/projects/${encodeURIComponent(project)}/persons/`;
  const found = await fetch(`${base}?distinct_id=${encodeURIComponent(userId)}`, { headers });
  if (!found.ok) throw new AccountError("Couldn't remove analytics data. Try again.", 502);
  const { results } = (await found.json()) as { results?: { id: string }[] };
  for (const person of results ?? []) {
    const removed = await fetch(`${base}${encodeURIComponent(person.id)}/`, { method: "DELETE", headers });
    if (!removed.ok && removed.status !== 404) throw new AccountError("Couldn't remove analytics data. Try again.", 502);
  }
}

export async function deleteAccount(userId: string) {
  const upcoming = await upcomingTrips(userId);
  if (upcoming > 0) {
    throw new AccountError(`Cancel your ${upcoming === 1 ? "upcoming trip" : `${upcoming} upcoming trips`} first.`, 409);
  }

  await sql()`DELETE FROM bookings WHERE user_id = ${userId}`;

  // The Clerk user goes last, so if it's already gone every other step has run.
  let customerId: string | null;
  try {
    customerId = await existingCustomer(userId);
  } catch (error) {
    if ((error as { status?: number } | null)?.status === 404) return;
    throw error;
  }
  if (customerId) {
    try {
      await stripeRequest("DELETE", `customers/${customerId}`);
    } catch (error) {
      // Already deleted is fine; anything else stops here so the guest can retry.
      if (!(error instanceof StripeError && /no such customer/i.test(error.message))) throw error;
    }
  }

  await deletePosthogPerson(userId);

  try {
    await clerk().users.deleteUser(userId);
  } catch (error) {
    if ((error as { status?: number } | null)?.status !== 404) throw error;
  }
}

export function accountErrorResponse(error: unknown) {
  if (error instanceof AccountError || error instanceof StripeError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("Deleting an account failed:", error instanceof Error ? error.message : error);
  return Response.json({ error: "Couldn't delete your account right now. Try again." }, { status: 502 });
}
