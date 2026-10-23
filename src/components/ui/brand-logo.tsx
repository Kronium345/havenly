import { Image } from "expo-image";

import { iconSize } from "@/theme";

// Third-party marks keep their own brand colors, so they ship as SVG assets
// rather than lucide icons or theme tokens.
const sources = {
  google: require("@/assets/brand/google-g.svg"),
  apple: require("@/assets/brand/apple.svg"),
} as const;

export function BrandLogo({
  name,
  size = "lg",
}: {
  name: keyof typeof sources;
  size?: keyof typeof iconSize;
}) {
  const dimension = iconSize[size];
  return (
    <Image
      source={sources[name]}
      contentFit="contain"
      // Decorative: the button title already names the provider.
      accessible={false}
      style={{ width: dimension, height: dimension }}
    />
  );
}
