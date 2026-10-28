import { createClerkClient } from "@clerk/backend";

import { stripeRequest, StripeError } from "./stripe";

// Server only. Host payouts with Stripe Connect (prompts/23). Each host company gets an
// Accounts v2 recipient account (Express dashboard, Havenly owns fees and losses, UK, GBP),
// kept in the Clerk organization's private metadata as `stripeAccountId`. Its payouts are
// set to manual on creation, so transferred money waits in the host's balance until
// Havenly pays it out the day after check-in.

const V2_VERSION = "2026-09-30.endive";
const SITE = "https://havenly.expo.app";

export type PayoutAccountStatus = "not_set_up" | "pending" | "active";

type V2Account = {
  id: string;
  configuration?: { recipient?: { capabilities?: { stripe_balance?: { stripe_transfers?: { status?: string } } } } };
  requirements?: { entries?: unknown[] };
};

function clerk() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new StripeError("Server is not configured.", 500);
  return createClerkClient({ secretKey });
}

/** Accounts v2: JSON bodies and a pinned version (prompts/23). */
async function v2<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeError("Payments aren't set up yet.", 503);
  const response = await fetch(`https://api.stripe.com/v2/${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Stripe-Version": V2_VERSION, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = (await response.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!response.ok || !data) {
    throw new StripeError(data?.error?.message ?? `Stripe request failed (${response.status}).`, response.status >= 500 ? 502 : 400);
  }
  return data;
}

/** The host company's connected account id, if it has one. */
export async function hostAccountId(orgId: string): Promise<string | null> {
  const org = await clerk().organizations.getOrganization({ organizationId: orgId });
  const id = (org.privateMetadata as { stripeAccountId?: unknown }).stripeAccountId;
  return typeof id === "string" && id.startsWith("acct_") ? id : null;
}

async function retrieve(accountId: string) {
  return v2<V2Account>("GET", `core/accounts/${accountId}?include=configuration.recipient&include=requirements`);
}

function statusOf(account: V2Account): PayoutAccountStatus {
  return account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === "active" ? "active" : "pending";
}

/** Whether the host company can receive transfers: not set up, waiting on Stripe, or active. */
export async function payoutStatus(orgId: string): Promise<{ status: PayoutAccountStatus; accountId: string | null }> {
  const accountId = await hostAccountId(orgId);
  if (!accountId) return { status: "not_set_up", accountId: null };
  return { status: statusOf(await retrieve(accountId)), accountId };
}

/** The host's account, created on first use with payouts paused (manual). */
async function ensureHostAccount(orgId: string, ownerEmail: string): Promise<string> {
  const existing = await hostAccountId(orgId);
  if (existing) return existing;
  const org = await clerk().organizations.getOrganization({ organizationId: orgId });
  const account = await v2<V2Account>("POST", "core/accounts", {
    display_name: org.name,
    contact_email: ownerEmail,
    dashboard: "express",
    identity: { country: "gb" },
    defaults: { currency: "gbp", responsibilities: { fees_collector: "application", losses_collector: "application" } },
    configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
    metadata: { clerkOrgId: orgId },
  });
  // Money waits in the host's balance until Havenly pays it out after check-in.
  await stripeRequest("POST", "balance_settings", { payments: { payouts: { schedule: { interval: "manual" } } } }, undefined, account.id);
  await clerk().organizations.updateOrganizationMetadata(orgId, { privateMetadata: { stripeAccountId: account.id } });
  return account.id;
}

/** A Stripe-hosted onboarding link for the owner (single use, expires in minutes). */
export async function onboardingLink(orgId: string, ownerUserId: string): Promise<string> {
  const owner = await clerk().users.getUser(ownerUserId);
  const email = owner.primaryEmailAddress?.emailAddress ?? owner.emailAddresses[0]?.emailAddress;
  if (!email) throw new StripeError("Add an email address to your account first.", 400);
  const accountId = await ensureHostAccount(orgId, email);
  const link = await v2<{ url: string }>("POST", "core/account_links", {
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: { return_url: `${SITE}/host-payouts/return`, refresh_url: `${SITE}/host-payouts/refresh` },
    },
  });
  return link.url;
}

/** A sign-in link to the host's Express dashboard (bank details, payout history). */
export async function dashboardLink(orgId: string): Promise<string> {
  const accountId = await hostAccountId(orgId);
  if (!accountId) throw new StripeError("Set up payouts first.", 400);
  const link = await stripeRequest<{ url: string }>("POST", `accounts/${accountId}/login_links`);
  return link.url;
}

/** Moves the host's share from a paid charge to their balance. Idempotent per booking. */
export function transferToHost(accountId: string, bookingId: string, chargeId: string, pence: number) {
  return stripeRequest<{ id: string }>(
    "POST",
    "transfers",
    { amount: pence, currency: "gbp", destination: accountId, source_transaction: chargeId, transfer_group: bookingId, metadata: { bookingId } },
    `transfer-${bookingId}`,
  );
}

/** Takes part of a transfer back from the host's balance (before a refund). */
export function reverseTransfer(transferId: string, pence: number, key: string) {
  return stripeRequest<{ id: string }>("POST", `transfers/${transferId}/reversals`, { amount: pence }, key);
}

/** The host's available GBP balance, in pence. */
export async function availablePence(accountId: string): Promise<number> {
  const balance = await stripeRequest<{ available: { amount: number; currency: string }[] }>("GET", "balance", {}, undefined, accountId);
  return balance.available.find((entry) => entry.currency === "gbp")?.amount ?? 0;
}

/** Pays one booking's share out of the host's balance to their bank. Idempotent per booking. */
export function payOutToHost(accountId: string, bookingId: string, pence: number) {
  return stripeRequest<{ id: string }>(
    "POST",
    "payouts",
    { amount: pence, currency: "gbp", metadata: { bookingId } },
    `payout-${bookingId}`,
    accountId,
  );
}
