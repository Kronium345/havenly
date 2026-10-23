import type { LucideIcon } from "lucide-react-native";

import { color as resolveColor, ColorToken, iconSize } from "@/theme";

export function Icon({
  as: Glyph,
  size = "lg",
  color = "ink",
  filled = false,
}: {
  as: LucideIcon;
  size?: keyof typeof iconSize;
  color?: ColorToken;
  /** Lucide ships outlines only; fill the shape for active and rating states. */
  filled?: boolean;
}) {
  const value = resolveColor(color);
  return (
    <Glyph
      size={iconSize[size]}
      color={value}
      strokeWidth={2}
      fill={filled ? value : "none"}
    />
  );
}
