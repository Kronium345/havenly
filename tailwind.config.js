// Havenly design tokens. The single source of truth for colors, type, spacing,
// radii, and shadows. Read through `tw` from `@/theme`; never hardcode these values.
const { plugin } = require("twrnc");

const colors = {
  transparent: "transparent",
  white: "#FFFFFF",
  black: "#000000",
  primary: { DEFAULT: "#FFC629", tint: "#FFF4D1" },
  lavender: { DEFAULT: "#C9B4FF", tint: "#F1ECFF", deep: "#5B3FD6" },
  ink: "#0B0B1A",
  muted: "#6B7280",
  placeholder: "#9CA3AF",
  surface: "#FFFFFF",
  canvas: "#F4F5F7",
  border: "#E5E7EB",
  glass: "rgba(255, 255, 255, 0.7)",
  // Darkens photos under white text (bottom of stay cards).
  scrim: "rgba(11, 11, 26, 0.75)",
  success: { DEFAULT: "#1F9D55", tint: "#E7F6EC" },
  danger: { DEFAULT: "#E5484D", tint: "#FDECEE" },
  info: { DEFAULT: "#3B5BDB", tint: "#E8EEFF" },
};

// One family per weight: `font-bold` sets fontFamily, never fontWeight.
const fontFamily = {
  regular: "PlusJakartaSans-Regular",
  medium: "PlusJakartaSans-Medium",
  semibold: "PlusJakartaSans-SemiBold",
  bold: "PlusJakartaSans-Bold",
};

// [size, lineHeight, letterSpacing]
const typeScale = {
  display: [44, 40, -1.5],
  hero: [36, 36, -1],
  heading: [30, 36, -0.8],
  "title-lg": [28, 30, -0.6],
  title: [20, 24, -0.4],
  headline: [16, 22, 0],
  body: [16, 24, 0],
  callout: [16, 22, 0],
  caption: [14, 20, 0],
  label: [12, 16, 0],
  button: [17, 22, -0.2],
  price: [20, 24, -0.4],
};

// Shared text styles: [scale step, weight, color].
// Built as style objects because twrnc resolves string utilities with its
// default parser, where `font-bold` becomes fontWeight instead of our family.
const textStyles = {
  display: ["display", "bold", colors.ink],
  hero: ["hero", "bold", colors.ink],
  heading: ["heading", "bold", colors.ink],
  "title-lg": ["title-lg", "bold", colors.ink],
  title: ["title", "bold", colors.ink],
  headline: ["headline", "semibold", colors.ink],
  body: ["body", "regular", colors.muted],
  callout: ["callout", "regular", colors.ink],
  caption: ["caption", "medium", colors.muted],
  label: ["label", "medium", colors.ink],
  button: ["button", "semibold", colors.ink],
  price: ["price", "bold", colors.ink],
};

const typeUtilities = Object.fromEntries(
  Object.entries(textStyles).map(([name, [step, weight, color]]) => {
    const [fontSize, lineHeight, letterSpacing] = typeScale[step];
    return [
      `type-${name}`,
      { fontFamily: fontFamily[weight], fontSize, lineHeight, letterSpacing, color },
    ];
  }),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // Replaces Tailwind's palette so only brand tokens exist.
    colors,
    fontFamily,
    fontSize: Object.fromEntries(
      Object.entries(typeScale).map(([step, [size, lineHeight, letterSpacing]]) => [
        step,
        [`${size}px`, { lineHeight: `${lineHeight}px`, letterSpacing: `${letterSpacing}px` }],
      ]),
    ),
    borderRadius: {
      none: "0px",
      sm: "8px",
      md: "12px",
      lg: "16px",
      xl: "20px",
      "2xl": "24px",
      "3xl": "32px",
      full: "9999px",
    },
    extend: {
      spacing: {
        screen: "20px",
      },
    },
  },
  plugins: [
    // twrnc keeps only the last addUtilities call per plugin: keep them all here.
    plugin(({ addUtilities }) => {
      addUtilities({
        ...typeUtilities,
        "shadow-card": { boxShadow: "0 2px 8px rgba(11, 11, 26, 0.06)" },
        "shadow-raised": { boxShadow: "0 8px 24px rgba(11, 11, 26, 0.10)" },
        "shadow-focus": { boxShadow: "0 0 0 4px rgba(201, 180, 255, 0.35)" },
        "shadow-none": { boxShadow: "none" },
      });
    }),
  ],
};
