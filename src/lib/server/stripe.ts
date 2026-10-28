import { createClerkClient } from "@clerk/backend";

// Server only. Talks to Stripe's REST API with plain fetch (no SDK), using the secret key.
// Amounts are always worked out here from Sanity; the app only ever receives client
// secrets. Each guest has one Stripe Customer per mode, whose id is kept in Clerk private
// metadata: dev (sandbox) and production (live) share the same Clerk users, and a sandbox
// customer doesn't exist in live mode.

export class StripeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Params = Record<string, unknown>;

/** Stripe's form encoding: nested objects as `a[b]`, arrays as `a[0]`. */
function encode(params: Params, prefix = ""): string[] {
  return Object.entries(params).flatMap(([key, value]) => {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) {
      return value.flatMap((item, i) =>
        typeof item === "object" ? encode(item as Params, `${name}[${i}]`) : [`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(item))}`],
      );
    }
    if (typeof value === "object") return encode(value as Params, name);
    return [`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`];
  });
}

// Secret (`sk_`) or restricted (`rk_`) key.
export function isStripeConfigured() {
  return /^(sk|rk)_/.test(process.env.STRIPE_SECRET_KEY ?? "");
}

/** Clerk private metadata field holding the Customer id for the current key's mode. */
function customerField() {
  return process.env.STRIPE_SECRET_KEY?.includes("_live_") ? "stripeLiveCustomerId" : "stripeCustomerId";
}

/** `stripeAccount` makes the call as a connected account (host payouts, prompts/23). */
export async function stripeRequest<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Params = {},
  idempotencyKey?: string,
  stripeAccount?: string,
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeError("Payments aren't set up yet.", 503);
  const query = encode(params).join("&");
  const response = await fetch(`https://api.stripe.com/v1/${path}${method === "GET" && query ? `?${query}` : ""}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...(stripeAccount ? { "Stripe-Account": stripeAccount } : {}),
    },
    body: method === "GET" ? undefined : query,
    signal: AbortSignal.timeout(15000),
  });
  const body = (await response.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!response.ok || !body) {
    // Stripe's messages are written for customers (e.g. "Your card was declined.").
    throw new StripeError(body?.error?.message ?? `Stripe request failed (${response.status}).`, response.status >= 500 ? 502 : 400);
  }
  return body;
}

function clerk() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new StripeError("Server is not configured.", 500);
  return createClerkClient({ secretKey });
}

/** The guest's Stripe Customer id, created on first use. */
export async function ensureCustomer(userId: string): Promise<string> {
  const existing = await existingCustomer(userId);
  if (existing) return existing;
  const customer = await stripeRequest<{ id: string }>("POST", "customers", { metadata: { clerkUserId: userId } }, `customer-${userId}`);
  await clerk().users.updateUserMetadata(userId, { privateMetadata: { [customerField()]: customer.id } });
  return customer.id;
}

/** The Customer id if the guest already has one in this mode; never creates it. */
export async function existingCustomer(userId: string): Promise<string | null> {
  const user = await clerk().users.getUser(userId);
  const id = (user.privateMetadata as Record<string, unknown>)[customerField()];
  return typeof id === "string" && id.startsWith("cus_") ? id : null;
}

/** Lets PaymentSheet show, save and remove this customer's cards. */
export async function customerSession(customerId: string): Promise<string> {
  const session = await stripeRequest<{ client_secret: string }>("POST", "customer_sessions", {
    customer: customerId,
    components: {
      mobile_payment_element: {
        enabled: true,
        features: {
          payment_method_save: "enabled",
          payment_method_redisplay: "enabled",
          payment_method_remove: "enabled",
        },
      },
    },
  });
  return session.client_secret;
}

export type PaymentIntent = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  client_secret: string;
  metadata: Record<string, string>;
  /** The charge's id once paid; transfers to hosts reference it (`source_transaction`). */
  latest_charge?: string | null;
};
