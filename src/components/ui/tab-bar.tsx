import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";

import { tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

const ITEM_SIZE = 64; // est. from the design: the active circle wraps icon + label

// Presentational only: navigation wiring comes with the tabs layout.
export function TabBar<K extends string>({
  items,
  activeKey,
  onPress,
  style,
}: {
  items: { key: K; label: string; icon: LucideIcon }[];
  activeKey: K;
  onPress: (key: K) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const glass = isLiquidGlassAvailable();
  const Surface = glass ? GlassView : View;

  return (
    <Surface
      accessibilityRole="tablist"
      style={[
        tw.style(
          "flex-row items-center justify-between rounded-full p-1.5 shadow-raised overflow-hidden",
          !glass && "bg-glass border border-surface",
        ),
        style,
      ]}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={() => onPress(item.key)}
            style={[
              tw.style("items-center justify-center rounded-full gap-0.5", active && "bg-primary"),
              { width: ITEM_SIZE + 8, height: ITEM_SIZE },
            ]}
          >
            <Icon as={item.icon} filled={active} color={active ? "on-primary" : "ink"} />
            <AppText variant="label" style={active ? tw`text-on-primary` : undefined}>
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </Surface>
  );
}
