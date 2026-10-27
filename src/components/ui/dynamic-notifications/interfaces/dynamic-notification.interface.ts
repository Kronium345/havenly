import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";

interface IDynamicNotification {
  id?: string;
  title: string;
  message?: string;
  avatar?: string;
  /** Trailing icon (lucide), tinted with the accent. Replaces upstream's iOS-only SF Symbol. */
  icon?: LucideIcon;
  accent?: string;
  duration?: number | null;
  onPress?: () => void;
  render?: (notification: IDynamicNotification) => ReactNode;
}

export type { IDynamicNotification };
