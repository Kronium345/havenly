import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleProp, ViewStyle } from "react-native";

import { ColorToken, control, tw } from "@/theme";

import { Icon } from "./icon";

const variants = {
  canvas: "bg-canvas",
  // Over photos: white with a lift so it reads on any image.
  surface: "bg-surface shadow-raised",
  glass: "bg-glass border border-surface",
  outline: "bg-surface border border-border",
  // Send and other main actions inside an input.
  primary: "bg-primary",
} as const;

const sizes = {
  md: control.md,
  lg: control.lg,
} as const;

export function IconButton({
  icon,
  accessibilityLabel,
  variant = "canvas",
  size = "lg",
  iconColor = "ink",
  filled = false,
  disabled = false,
  onPress,
  style,
}: {
  icon: LucideIcon;
  accessibilityLabel: string;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  iconColor?: ColorToken;
  filled?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const dimension = sizes[size];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        tw.style("items-center justify-center rounded-full", variants[variant]),
        { width: dimension, height: dimension },
        { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <Icon as={icon} color={iconColor} filled={filled} />
    </Pressable>
  );
}
