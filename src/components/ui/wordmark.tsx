import { Image } from "expo-image";
import { StyleProp, ImageStyle } from "react-native";

// Generated from Plus Jakarta Sans Bold (tight tracking, emboldened outline).
// Aspect ratio comes from the SVG viewBox (3600 × 1077).
const ASPECT_RATIO = 3600 / 1077;

export function Wordmark({
  height = 44, // ~147pt wide: the footprint of the wordmark on the home design
  style,
}: {
  height?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={require("@/assets/brand/havenly-wordmark.svg")}
      accessibilityRole="header"
      accessibilityLabel="Havenly"
      contentFit="contain"
      style={[{ height, width: height * ASPECT_RATIO }, style]}
    />
  );
}
