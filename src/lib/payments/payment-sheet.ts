import { initPaymentSheet, presentPaymentSheet } from "@stripe/stripe-react-native";

import { color } from "@/theme";

import { STRIPE_MERCHANT_NAME, STRIPE_URL_SCHEME } from "./stripe-config";

// Opens Stripe's native PaymentSheet. Kept in its own module (with a .web sibling)
// because @stripe/stripe-react-native throws as soon as it's imported on web.

export type SheetOutcome = { status: "done" } | { status: "cancelled" } | { status: "failed"; message: string };

type Secrets = { customerId: string; customerSessionClientSecret: string } & (
  | { paymentIntentClientSecret: string }
  | { setupIntentClientSecret: string }
);

export async function runPaymentSheet(secrets: Secrets): Promise<SheetOutcome> {
  const { customerId, customerSessionClientSecret } = secrets;
  const intent =
    "paymentIntentClientSecret" in secrets
      ? { paymentIntentClientSecret: secrets.paymentIntentClientSecret }
      : { setupIntentClientSecret: secrets.setupIntentClientSecret };
  const init = await initPaymentSheet({
    merchantDisplayName: STRIPE_MERCHANT_NAME,
    customerId,
    customerSessionClientSecret,
    ...intent,
    allowsDelayedPaymentMethods: false,
    returnURL: `${STRIPE_URL_SCHEME}://stripe-redirect`,
    style: "alwaysLight",
    appearance: { colors: { primary: color("primary") } },
  });
  if (init.error) return { status: "failed", message: init.error.message };

  const { error } = await presentPaymentSheet();
  if (!error) return { status: "done" };
  if (error.code === "Canceled") return { status: "cancelled" };
  return { status: "failed", message: error.message };
}
