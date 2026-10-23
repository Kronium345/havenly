import { ComponentRef, Ref, useState } from "react";
import { StyleProp, TextInput, View, ViewStyle } from "react-native";

import { tw } from "@/theme";

import { AppText } from "./text";

/**
 * One-time code boxes. A single transparent input sits over the boxes and drives
 * them, so typing, paste, and SMS/email autofill all work the same way.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  invalid = false,
  autoFocus,
  ref,
  style,
}: {
  value: string;
  onChange: (code: string) => void;
  /** Called once the last digit is entered. */
  onComplete?: (code: string) => void;
  length?: number;
  invalid?: boolean;
  autoFocus?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View style={[tw`self-center`, style]}>
      <View style={tw`flex-row gap-2`}>
        {Array.from({ length }, (_, i) => {
          const active = focused && i === activeIndex;
          return (
            <View
              key={i}
              style={tw.style(
                "h-14 w-12 items-center justify-center rounded-lg border-[1.5px]",
                active ? "bg-surface border-lavender shadow-focus" : "bg-canvas border-transparent",
                invalid && "border-danger",
              )}
            >
              <AppText variant="title">{value[i] ?? ""}</AppText>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, "").slice(0, length);
          onChange(digits);
          if (digits.length === length) onComplete?.(digits);
        }}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        caretHidden
        accessibilityLabel={`Verification code, ${length} digits`}
        accessibilityHint={invalid ? `Enter the ${length}-digit code.` : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // Transparent and stretched over the boxes, so a tap anywhere on them focuses it.
        style={[tw`absolute inset-0 text-transparent`, { opacity: 0.01, outlineStyle: "none" }]}
      />
    </View>
  );
}
