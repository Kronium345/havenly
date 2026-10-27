import type { IDynamicNotification } from "@/components/ui/dynamic-notifications";
import { toast } from "@/components/ui/toast";

// Shows the Dynamic Island banner from code that isn't a component (notification
// listeners, booking flow). The host in the root layout registers the trigger; before
// it mounts, and on web where there's no banner, a toast shows instead.

export type BannerNotification = IDynamicNotification;

let triggerImpl: ((notification: BannerNotification) => void) | null = null;

export function setBannerTrigger(trigger: ((notification: BannerNotification) => void) | null) {
  triggerImpl = trigger;
}

export function showBanner(notification: BannerNotification) {
  if (triggerImpl) triggerImpl(notification);
  else toast.success(notification.title, notification.message);
}
