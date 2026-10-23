import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";

import { control, tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={[tw`flex-row self-start rounded-full bg-canvas p-1`, style]}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[
              tw.style("flex-row items-center rounded-full px-5 gap-2", active && "bg-ink"),
              { height: control.md - 8 },
            ]}
          >
            {option.icon ? (
              <Icon as={option.icon} size="md" color={active ? "white" : "ink"} />
            ) : null}
            <AppText variant="callout" style={tw.style("font-medium", active && "text-white")}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
