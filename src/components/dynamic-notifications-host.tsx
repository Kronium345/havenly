import { ReactNode, useEffect } from "react";

import { DynamicNotifications, useDynamicNotifications } from "@/components/ui/dynamic-notifications";
import { setBannerTrigger } from "@/lib/notifications/banner";
import { color } from "@/theme";

/** Hands the mounted banner's trigger to `showBanner` (src/lib/notifications/banner.ts). */
function BannerBridge() {
  const { trigger } = useDynamicNotifications();
  useEffect(() => {
    setBannerTrigger(trigger);
    return () => setBannerTrigger(null);
  }, [trigger]);
  return null;
}

/** The Dynamic Island banner (ported from oq-agile-athletes) over the whole app. */
export function DynamicNotificationsHost({ children }: { children: ReactNode }) {
  return (
    <DynamicNotifications accent={color("primary")}>
      <BannerBridge />
      {children}
    </DynamicNotifications>
  );
}
