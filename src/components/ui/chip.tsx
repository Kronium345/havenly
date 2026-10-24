import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleProp, ViewStyle } from "react-native";

import { control, tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

const selectedBackground = {
  filter: "bg-lavender",
  category: "bg-primary",
} as const;

export function Chip({
  label,
  variant = "filter",
  icon,
  selected = false,
  onPress,
  accessibilityHint,
  style,
}: {
  label: string;
  /** filter: refines results (lavender). category: stay type with icon (yellow). */
  variant?: keyof typeof selectedBackground;
  icon?: LucideIcon;
  selected?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        tw.style(
          "flex-row items-center rounded-full gap-2",
          icon ? "pl-3 pr-4" : "px-5",
          selected ? selectedBackground[variant] : "bg-canvas",
        ),
        { minHeight: control.md, opacity: pressed ? 0.7 : 1 },
        style,
      ]}
    >
      {icon ? <Icon as={icon} size="md" filled={selected} /> : null}
      <AppText
        variant="callout"
        style={tw.style(selected ? "font-semibold" : "font-medium")}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
