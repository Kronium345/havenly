import { color } from "@/theme";

// Havenly tokens instead of the upstream hex values (AGENTS: no hex in src/).
const PALETTE = {
  island: color("black"),
  card: color("surface"),
  accent: color("primary"),
  message: color("muted"),
  avatar: color("canvas"),
  shadow: color("shade"),
} as const;

export { PALETTE };
