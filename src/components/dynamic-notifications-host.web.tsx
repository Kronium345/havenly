import { ReactNode } from "react";

/** Web has no banner (Skia needs extra setup there); showBanner falls back to a toast. */
export function DynamicNotificationsHost({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
