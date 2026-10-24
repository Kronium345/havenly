import { Image } from "expo-image";
import { ChevronRight, MapPin, Star } from "lucide-react-native";
import { Platform, Pressable, View, ViewStyle } from "react-native";

import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { formatPlace, sanityImage } from "@/lib/format";
import type { StayCard } from "@/lib/search/types";
import { color, tw } from "@/theme";


const CARD_HEIGHT = 268; // est. from home.png

// Darkens the lower photo so the white text reads. Native uses RN's gradient
// background; react-native-web passes the CSS property straight through.
const gradient = `linear-gradient(to bottom, transparent, ${color("scrim")})`;
const scrimStyle: ViewStyle = Platform.select({
  web: { backgroundImage: gradient } as ViewStyle,
  default: { experimental_backgroundImage: gradient },
});

export function FeaturedStayCard({ stay, onPress }: { stay: StayCard; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${stay.title}, ${formatPlace(stay.place)}, rated ${stay.rating}`}
      onPress={onPress}
      style={({ pressed }) => [
        tw`overflow-hidden rounded-2xl bg-canvas`,
        { height: CARD_HEIGHT, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <Image
        source={{ uri: sanityImage(stay.imageUrl, 1000) }}
        contentFit="cover"
        transition={300}
        accessibilityIgnoresInvertColors
        style={tw`absolute inset-0`}
      />
      <View style={[tw`absolute bottom-0 left-0 right-0 h-[60%]`, scrimStyle]} />

      <View style={tw`absolute right-3 top-3 h-10 flex-row items-center gap-1.5 rounded-full bg-surface px-3`}>
        <Icon as={Star} size="md" filled />
        <AppText variant="callout" style={tw`font-bold`}>
          {stay.rating.toFixed(1)}
        </AppText>
      </View>

      <View style={tw`absolute bottom-4 left-4 right-4 flex-row items-end gap-3`}>
        <View style={tw`flex-1 gap-1`}>
          <View style={tw`flex-row items-center gap-1.5`}>
            <Icon as={MapPin} size="sm" color="white" />
            <AppText variant="callout" style={tw`text-white`}>
              {formatPlace(stay.place)}
            </AppText>
          </View>
          <AppText variant="title-lg" numberOfLines={2} style={tw`text-white`}>
            {stay.title}
          </AppText>
        </View>
        <View style={tw`h-14 w-14 items-center justify-center rounded-full bg-surface`}>
          <Icon as={ChevronRight} />
        </View>
      </View>
    </Pressable>
  );
}
