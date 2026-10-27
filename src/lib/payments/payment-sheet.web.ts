// Web build: PaymentSheet is native only. Screens check isStripeReady() first, so this
// only runs if that check is skipped.

export type SheetOutcome = { status: "done" } | { status: "cancelled" } | { status: "failed"; message: string };

export async function runPaymentSheet(_secrets: unknown): Promise<SheetOutcome> {
  return { status: "failed", message: "Payment works in the Havenly app." };
}
