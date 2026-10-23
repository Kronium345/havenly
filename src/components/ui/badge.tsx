import type { LucideIcon } from "lucide-react-native";
import { StyleProp, View, ViewStyle } from "react-native";

import { ColorToken, tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

export type BadgeVariant = "neutral" | "favorite" | "new" | "discount" | "superhost" | "explorer";

const variants: Record<
  BadgeVariant,
  { background: string; text: string; icon: ColorToken; filledIcon: boolean }
> = {
  // Amenity pills on listing cards.
  neutral: { background: "bg-canvas", text: "text-ink", icon: "ink", filledIcon: false },
  favorite: { background: "bg-primary-tint", text: "text-ink", icon: "primary", filledIcon: true },
  new: { background: "bg-success-tint", text: "text-success", icon: "success", filledIcon: false },
  discount: { background: "bg-danger-tint", text: "text-danger", icon: "danger", filledIcon: false },
  superhost: { background: "bg-info-tint", text: "text-info", icon: "info", filledIcon: false },
  explorer: { background: "bg-lavender-tint", text: "text-ink", icon: "primary", filledIcon: true },
};

export function Badge({
  label,
  variant = "neutral",
  icon,
  style,
}: {
  label: string;
  variant?: BadgeVariant;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}) {
  const v = variants[variant];
  return (
    <View
      style={[
        tw.style("flex-row items-center self-start rounded-full px-2.5 py-1 gap-1", v.background),
        style,
      ]}
    >
      {icon ? <Icon as={icon} size="sm" color={v.icon} filled={v.filledIcon} /> : null}
      <AppText variant="caption" style={tw.style(v.text)}>
        {label}
      </AppText>
    </View>
  );
}
