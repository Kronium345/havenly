import { handleEvent, verifySignature, WebhookError } from "@/lib/server/stripe-webhook";

// Stripe → Havenly (prompts/20). The only API route without requireSession: the
// verified Stripe-Signature header is its authentication.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is missing: webhooks can't be verified.");
    return Response.json({ error: "Server is not configured." }, { status: 500 });
  }

  // The signature covers the exact bytes Stripe sent, so read the body as text first.
  const rawBody = await request.text();
  try {
    await verifySignature(rawBody, request.headers.get("stripe-signature"), secret);
  } catch (error) {
    if (error instanceof WebhookError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }

  try {
    const result = await handleEvent(JSON.parse(rawBody));
    return Response.json({ received: true, result });
  } catch (error) {
    // 500 makes Stripe retry later.
    console.error("Stripe webhook failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Webhook failed." }, { status: 500 });
  }
}
