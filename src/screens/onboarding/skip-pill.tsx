import { Pressable } from "react-native";

import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

export function SkipPill({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Skip onboarding"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        tw`h-11 items-center justify-center rounded-full bg-glass px-5`,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <AppText variant="callout" style={tw`font-medium`}>
        Skip
      </AppText>
    </Pressable>
  );
}
