import { ReactNode } from "react";

/** Web build: no Stripe SDK; screens say payment works in the app. */
export function PaymentsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
