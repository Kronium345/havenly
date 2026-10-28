import { BookingError, createPaidBooking } from "./bookings";
import { sql } from "./db";

// Server only (prompts/20). Stripe calls /api/stripe/webhook after a payment or refund,
// so a trip is confirmed even if the guest closed the app mid-payment. There is no Clerk
// session here: the Stripe-Signature header (HMAC-SHA256 with STRIPE_WEBHOOK_SECRET) is
// the check. Web Crypto only, so it runs on EAS Hosting's Workers runtime.

const TOLERANCE_SECONDS = 5 * 60;

export class WebhookError extends Error {}

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Compares without stopping at the first difference, so timing reveals nothing. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Checks Stripe's `t=…,v1=…` signature over the raw body. Throws WebhookError if it doesn't match. */
export async function verifySignature(rawBody: string, header: string | null, secret: string, now = Date.now()) {
  const parts = (header ?? "").split(",").map((part) => part.split("="));
  const timestamp = Number(parts.find(([key]) => key === "t")?.[1]);
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value ?? "");
  if (!Number.isFinite(timestamp) || signatures.length === 0) throw new WebhookError("Missing signature.");
  if (Math.abs(now / 1000 - timestamp) > TOLERANCE_SECONDS) throw new WebhookError("Signature is too old.");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`)));
  if (!signatures.some((signature) => safeEqual(signature, expected))) throw new WebhookError("Bad signature.");
}

type StripeEvent = {
  type: string;
  data: {
    object: {
      id: string;
      object: string;
      metadata?: Record<string, string>;
      payment_intent?: string | null;
      amount_refunded?: number;
    };
  };
};

/** Applies one verified event. Safe to receive more than once (Stripe retries). */
export async function handleEvent(event: StripeEvent) {
  const object = event.data.object;
  if (event.type === "payment_intent.succeeded") {
    const userId = object.metadata?.userId;
    // PaymentIntents not made by checkout (no bookingId) aren't Havenly bookings.
    if (!userId || !object.metadata?.bookingId) return "ignored";
    try {
      // The same path the app takes: confirms once, refunds if the dates are gone.
      await createPaidBooking(userId, object.id);
      return "confirmed";
    } catch (error) {
      // A booking-rule outcome (already refunded, not found) is final; don't make Stripe retry.
      if (error instanceof BookingError) return `not booked: ${error.message}`;
      throw error;
    }
  }
  if (event.type === "charge.refunded" && object.payment_intent && typeof object.amount_refunded === "number") {
    await sql()`
      UPDATE bookings SET refunded = ${object.amount_refunded / 100}
      WHERE payment_intent_id = ${object.payment_intent}`;
    return "refund recorded";
  }
  return "ignored";
}
