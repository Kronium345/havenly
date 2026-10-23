import { Minus, Plus } from "lucide-react-native";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";

import { control, tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

export function Stepper({
  value,
  onChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  label,
  style,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** What is being counted, for screen readers (e.g. "Guests"). */
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  const step = (delta: number, disabled: boolean, icon: typeof Plus, name: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name} ${label}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={() => onChange(value + delta)}
      style={({ pressed }) => [
        tw`items-center justify-center`,
        { width: control.md, height: control.md, opacity: disabled ? 0.3 : pressed ? 0.6 : 1 },
      ]}
    >
      <Icon as={icon} />
    </Pressable>
  );

  return (
    <View
      accessibilityLabel={`${label}: ${value}`}
      style={[
        tw`flex-row items-center self-start rounded-full bg-surface border border-border px-1`,
        style,
      ]}
    >
      {step(-1, value <= min, Minus, "Decrease")}
      <AppText variant="title" style={tw`min-w-8 text-center`}>
        {value}
      </AppText>
      {step(1, value >= max, Plus, "Increase")}
    </View>
  );
}
