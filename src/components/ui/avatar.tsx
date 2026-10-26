import { Image } from "expo-image";
import { StyleProp, View, ViewStyle } from "react-native";

import { tw } from "@/theme";

import { AppText } from "./text";

const sizes = {
  md: { box: "h-11 w-11", text: "headline" },
  lg: { box: "h-21 w-21", text: "display" },
  xl: { box: "h-26 w-26", text: "display" },
} as const;

/** A person: their photo when they have one, otherwise the first letter of their name. */
export function Avatar({
  imageUrl,
  name,
  size = "md",
  style,
}: {
  imageUrl?: string | null;
  name: string;
  size?: keyof typeof sizes;
  style?: StyleProp<ViewStyle>;
}) {
  const s = sizes[size];
  return (
    <View
      style={[tw.style("items-center justify-center overflow-hidden rounded-full bg-primary-tint", s.box), style]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          accessibilityIgnoresInvertColors
          contentFit="cover"
          transition={200}
          style={tw`h-full w-full`}
        />
      ) : (
        <AppText variant={s.text}>{name[0]?.toUpperCase()}</AppText>
      )}
    </View>
  );
}
