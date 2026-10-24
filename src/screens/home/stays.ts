import { Building2, House, TreePalm, TreePine, Waves, type LucideIcon } from "lucide-react-native";

import type { Category } from "@/lib/search/vocabulary";

// The home category chips. Stays come from Sanity through /api/stays.

export type StayCategory = Category;

export const categories: { key: StayCategory | "all"; label: string; icon: LucideIcon }[] = [
  { key: "all", label: "All Stays", icon: House },
  { key: "cabins", label: "Cabins", icon: TreePine },
  { key: "beach", label: "Beach", icon: Waves },
  { key: "city", label: "City", icon: Building2 },
  { key: "villas", label: "Villas", icon: TreePalm },
];
