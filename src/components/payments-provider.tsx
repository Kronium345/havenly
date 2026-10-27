import { StripeProvider } from "@stripe/stripe-react-native";
import { ReactNode } from "react";

import { isStripeReady, STRIPE_PUBLISHABLE_KEY, STRIPE_URL_SCHEME } from "@/lib/payments/stripe-config";

/**
 * Stripe for the screens that take payment (booking, payment methods), not the whole
 * app. Card only, no Apple Pay (no merchant id). Without a key it renders children bare
 * so the screen can explain that payments aren't set up.
 */
export function PaymentsProvider({ children }: { children: ReactNode }) {
  if (!isStripeReady()) return <>{children}</>;
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} urlScheme={STRIPE_URL_SCHEME}>
      <>{children}</>
    </StripeProvider>
  );
}
