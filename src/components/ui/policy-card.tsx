import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";

import { tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

export function PolicyCard({
  icon,
  title,
  description,
  onPress,
  style,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      onPress={onPress}
      style={({ pressed }) => [
        tw`flex-row items-center gap-4 rounded-xl bg-accent-tint p-4`,
        { opacity: pressed ? 0.75 : 1 },
        style,
      ]}
    >
      <View style={tw`h-12 w-12 items-center justify-center rounded-md bg-accent`}>
        <Icon as={icon} color="ink" />
      </View>
      <View style={tw`flex-1 gap-0.5`}>
        <AppText variant="headline">{title}</AppText>
        <AppText variant="caption" style={tw`font-regular`}>
          {description}
        </AppText>
      </View>
      <Icon as={ChevronRight} size="md" color="primary" />
    </Pressable>
  );
}
