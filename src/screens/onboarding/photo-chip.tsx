import { MapPin } from "lucide-react-native";
import { StyleProp, View, ViewStyle } from "react-native";

import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

/** Dark glass chip naming where the photo was taken. */
export function PhotoChip({ place, style }: { place: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        tw`h-10 flex-row items-center self-start gap-2 rounded-full border border-white/30 bg-ink/40 px-4`,
        style,
      ]}
    >
      <Icon as={MapPin} size="sm" color="white" />
      <AppText variant="callout" style={tw`font-medium text-white`}>
        {place}
      </AppText>
    </View>
  );
}
