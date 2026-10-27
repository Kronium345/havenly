import { ArrowRight } from "lucide-react-native";
import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleProp, View, ViewStyle } from "react-native";

import { color, control, tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

const variants = {
  primary: "bg-primary",
  secondary: "bg-surface border border-border",
} as const;

const sizes = {
  md: { height: control.md },
  lg: { height: control.lg },
} as const;

export function Button({
  title,
  variant = "primary",
  size = "lg",
  leading,
  showArrow = false,
  loading = false,
  disabled = false,
  onPress,
  style,
}: {
  title: string;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Node before the title, e.g. a provider logo. */
  leading?: ReactNode;
  /** Trailing arrow, as on primary call-to-action buttons. */
  showArrow?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  // Text on a primary fill is `on-primary` (white): ink on the blue is only 4.0:1.
  const content = variant === "primary" ? "on-primary" : "ink";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        tw.style(
          "flex-row items-center justify-center rounded-full px-6 gap-3",
          variants[variant],
        ),
        sizes[size],
        { opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color(content)} />
      ) : (
        <>
          {leading}
          <AppText variant="button" numberOfLines={1} style={tw`text-${content}`}>
            {title}
          </AppText>
          {showArrow ? (
            <View style={tw`absolute right-6`}>
              <Icon as={ArrowRight} color={content} />
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}
