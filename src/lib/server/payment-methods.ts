import type { CardSetup, SavedCard } from "../payments/cards";

import { customerSession, ensureCustomer, existingCustomer, stripeRequest, StripeError } from "./stripe";

// Server only. The guest's saved cards, through their Stripe Customer. Removing a card
// first checks it belongs to that customer.

type StripeCard = {
  id: string;
  customer: string | null;
  card: { brand: string; last4: string; exp_month: number; exp_year: number };
};

export async function listCards(userId: string): Promise<SavedCard[]> {
  const customerId = await existingCustomer(userId);
  if (!customerId) return [];
  const { data } = await stripeRequest<{ data: StripeCard[] }>("GET", `customers/${customerId}/payment_methods`, {
    type: "card",
    limit: 20,
  });
  return data.map(({ id, card }) => ({
    id,
    brand: card.brand,
    last4: card.last4,
    expMonth: card.exp_month,
    expYear: card.exp_year,
  }));
}

export async function startCardSetup(userId: string): Promise<CardSetup> {
  const customerId = await ensureCustomer(userId);
  const intent = await stripeRequest<{ client_secret: string }>("POST", "setup_intents", {
    customer: customerId,
    allowed_payment_method_types: ["card"],
    usage: "on_session",
  });
  return {
    setupIntentClientSecret: intent.client_secret,
    customerSessionClientSecret: await customerSession(customerId),
    customerId,
  };
}

export async function removeCard(userId: string, paymentMethodId: string) {
  if (!/^pm_\w{6,}$/.test(paymentMethodId)) throw new StripeError("We couldn't find that card.", 404);
  const customerId = await existingCustomer(userId);
  const method = await stripeRequest<StripeCard>("GET", `payment_methods/${paymentMethodId}`);
  if (!customerId || method.customer !== customerId) throw new StripeError("We couldn't find that card.", 404);
  await stripeRequest("POST", `payment_methods/${paymentMethodId}/detach`);
}

export function paymentErrorResponse(error: unknown, action: string) {
  if (error instanceof StripeError) return Response.json({ error: error.message }, { status: error.status });
  console.error(`${action} failed:`, error instanceof Error ? error.message : error);
  return Response.json({ error: "Payment methods are unavailable right now." }, { status: 502 });
}
