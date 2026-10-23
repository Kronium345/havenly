import { Building2, House, TreePalm, TreePine, Waves, type LucideIcon } from "lucide-react-native";

// SAMPLE DATA until stays come from Sanity. Names and places are invented;
// photos are Unsplash (ids checked to load).

export type StayCategory = "cabins" | "beach" | "city" | "villas";

export type Stay = {
  id: string;
  title: string;
  place: string;
  rating: number;
  category: StayCategory;
  photoId: string;
};

export const categories: { key: StayCategory | "all"; label: string; icon: LucideIcon }[] = [
  { key: "all", label: "All Stays", icon: House },
  { key: "cabins", label: "Cabins", icon: TreePine },
  { key: "beach", label: "Beach", icon: Waves },
  { key: "city", label: "City", icon: Building2 },
  { key: "villas", label: "Villas", icon: TreePalm },
];

export const stays: Stay[] = [
  {
    id: "modern-cabin",
    title: "Modern Cabin with Hot Tub",
    place: "Lake Arrowhead, CA",
    rating: 4.9,
    category: "cabins",
    photoId: "1587061949409-02df41d5e562",
  },
  {
    id: "a-frame-sunset",
    title: "A-Frame at Sunset",
    place: "Big Bear Lake, CA",
    rating: 4.8,
    category: "cabins",
    photoId: "1542718610-a1d656d1884c",
  },
  {
    id: "overwater-bungalow",
    title: "Overwater Bungalow",
    place: "Malé, Maldives",
    rating: 4.9,
    category: "beach",
    photoId: "1499793983690-e29da59ef1c2",
  },
  {
    id: "sunny-loft",
    title: "Sunny Loft Apartment",
    place: "Lisbon, Portugal",
    rating: 4.7,
    category: "city",
    photoId: "1493809842364-78817add7ffb",
  },
  {
    id: "white-villa",
    title: "White Villa with Pool",
    place: "Alicante, Spain",
    rating: 4.8,
    category: "villas",
    photoId: "1600596542815-ffad4c1539a9",
  },
];
