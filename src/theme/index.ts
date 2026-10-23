import { create } from "twrnc";

// All color, type, spacing, radius, and shadow tokens live in tailwind.config.js.
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const tw = create(require("../../tailwind.config.js"));

export type ColorToken =
  | "transparent"
  | "white"
  | "black"
  | "primary"
  | "primary-tint"
  | "lavender"
  | "lavender-tint"
  | "lavender-deep"
  | "ink"
  | "muted"
  | "placeholder"
  | "surface"
  | "canvas"
  | "border"
  | "glass"
  | "scrim"
  | "success"
  | "success-tint"
  | "danger"
  | "danger-tint"
  | "info"
  | "info-tint";

/** Resolves a color token to its value, for props that take a color string. */
export function color(token: ColorToken): string {
  return tw.color(token) ?? "transparent";
}

export type TextVariant =
  | "display"
  | "hero"
  | "heading"
  | "title-lg"
  | "title"
  | "headline"
  | "body"
  | "callout"
  | "caption"
  | "label"
  | "button"
  | "price";

export const iconSize = { sm: 16, md: 20, lg: 24 } as const;

export const control = { sm: 36, md: 48, lg: 56 } as const;

export const motion = {
  fast: 150, // state feedback: press, toggle
  base: 250, // element transitions: enter/exit
  slow: 400, // large surfaces: sheets, screens
} as const;

// Keys are the fontFamily names used in tailwind.config.js.
export const fonts = {
  "PlusJakartaSans-Regular": require("@/assets/fonts/PlusJakartaSans-Regular.ttf"),
  "PlusJakartaSans-Medium": require("@/assets/fonts/PlusJakartaSans-Medium.ttf"),
  "PlusJakartaSans-SemiBold": require("@/assets/fonts/PlusJakartaSans-SemiBold.ttf"),
  "PlusJakartaSans-Bold": require("@/assets/fonts/PlusJakartaSans-Bold.ttf"),
};
