import { Image } from "expo-image";
import { Heart, MapPin, Star, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";

import { tw } from "@/theme";

import { Badge } from "./badge";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { AppText } from "./text";

export function ListingCard({
  title,
  location,
  imageUrl,
  rating,
  reviewCount,
  pricePerNight,
  amenities = [],
  saved = false,
  onToggleSaved,
  savePlacement = "image",
  onPress,
  style,
}: {
  title: string;
  location: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  /** Already formatted, e.g. "$280". */
  pricePerNight: string;
  amenities?: { label: string; icon: LucideIcon }[];
  saved?: boolean;
  onToggleSaved?: () => void;
  /** "image": over the photo (design system). "end": beside the title (search results). */
  savePlacement?: "image" | "end";
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  // The save button is a sibling of the card's pressable, not a child:
  // nested pressables are invalid HTML on web and steal presses on native.
  return (
    <View style={[tw`rounded-2xl bg-surface shadow-card`, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${location}, rated ${rating}, ${pricePerNight} per night`}
        onPress={onPress}
        style={({ pressed }) => [tw`flex-row gap-3 p-2`, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Image
          source={{ uri: imageUrl }}
          contentFit="cover"
          transition={200}
          style={tw.style(savePlacement === "end" ? "w-36 h-40" : "w-32 h-40", "rounded-lg bg-canvas")}
        />
        <View style={tw.style("flex-1 gap-1.5 py-1 pr-1", savePlacement === "end" && "pr-12")}>
          <AppText variant="title" numberOfLines={2}>
            {title}
          </AppText>
          <View style={tw`flex-row items-center gap-1`}>
            <Icon as={MapPin} size="sm" color="placeholder" />
            <AppText variant="caption" numberOfLines={1}>
              {location}
            </AppText>
          </View>
          <View style={tw`flex-row items-center gap-1`}>
            <Icon as={Star} size="sm" color="primary" filled />
            <AppText variant="callout" style={tw`font-medium`}>
              {rating.toFixed(1)}
            </AppText>
            <AppText variant="caption">({reviewCount})</AppText>
          </View>
          {amenities.length > 0 ? (
            <View style={tw`flex-row flex-wrap gap-1`}>
              {amenities.map((amenity) => (
                <Badge key={amenity.label} label={amenity.label} icon={amenity.icon} />
              ))}
            </View>
          ) : null}
          <View style={tw`flex-row items-baseline gap-1 mt-0.5`}>
            <AppText variant="price">{pricePerNight}</AppText>
            <AppText variant="caption" style={tw`text-placeholder font-regular`}>
              / night
            </AppText>
          </View>
        </View>
      </Pressable>
      <IconButton
        icon={Heart}
        accessibilityLabel={saved ? `Remove ${title} from saved` : `Save ${title}`}
        variant={savePlacement === "end" ? "canvas" : "surface"}
        size="md"
        filled={saved}
        iconColor={saved ? "danger" : "ink"}
        onPress={onToggleSaved}
        style={savePlacement === "end" ? tw`absolute top-3 right-3` : tw`absolute top-4 left-[92px] w-9 h-9`}
      />
    </View>
  );
}
