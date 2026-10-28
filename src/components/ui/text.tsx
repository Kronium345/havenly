import { Platform, StyleSheet, Text, TextProps, TextStyle } from "react-native";

import { tw, TextVariant } from "@/theme";

// Plus Jakarta Sans spans 1.26em (ascent 1.038 + descent 0.222, every weight),
// and "g"/"y" reach the full descent.
const FONT_HEIGHT = 1.26;

// Android trims a line shorter than the font by half the difference at the
// bottom and clips the glyphs to the view, cutting off descenders. Pad the
// bottom by that amount and pull the margin back, so the glyph has room to
// draw and the layout stays the same as iOS and web.
function androidDescenderRoom(style: TextStyle): TextStyle | null {
  const { fontSize, lineHeight } = style;
  if (!fontSize || !lineHeight) return null;
  const trimmed = Math.ceil((fontSize * FONT_HEIGHT - lineHeight) / 2);
  if (trimmed <= 0) return null;
  const padding = style.paddingBottom ?? style.paddingVertical ?? style.padding ?? 0;
  const margin = style.marginBottom ?? style.marginVertical ?? style.margin ?? 0;
  if (typeof padding !== "number" || typeof margin !== "number") return null;
  return { paddingBottom: padding + trimmed, marginBottom: margin - trimmed };
}

export function AppText({
  variant = "body",
  style,
  ...props
}: TextProps & { variant?: TextVariant }) {
  const merged = [tw.style(`type-${variant}`), style];
  const room =
    Platform.OS === "android" ? androidDescenderRoom(StyleSheet.flatten(merged) ?? {}) : null;
  return <Text style={room ? [...merged, room] : merged} {...props} />;
}
