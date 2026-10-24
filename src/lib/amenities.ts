import {
  AirVent,
  Bath,
  CookingPot,
  Flame,
  Laptop,
  Mountain,
  PawPrint,
  PlugZap,
  SquareParking,
  TreePine,
  Umbrella,
  WashingMachine,
  Waves,
  WavesLadder,
  Wifi,
  type LucideIcon,
} from "lucide-react-native";

import { amenityLabels } from "./amenity-labels";
import type { AmenityKey } from "./search/vocabulary";

const icons: Record<AmenityKey, LucideIcon> = {
  hotTub: Bath,
  pool: WavesLadder,
  wifi: Wifi,
  fireplace: Flame,
  oceanView: Waves,
  forestViews: TreePine,
  mountainViews: Mountain,
  kitchen: CookingPot,
  parking: SquareParking,
  airConditioning: AirVent,
  washer: WashingMachine,
  workspace: Laptop,
  evCharger: PlugZap,
  beachAccess: Umbrella,
};

export function amenity(key: AmenityKey) {
  return { key, label: amenityLabels[key], icon: icons[key] };
}

export const petFriendly = { key: "pets", label: "Pet Friendly", icon: PawPrint } as const;

// Amenities worth a badge before the everyday ones (Wi-Fi, kitchen, parking).
const highlights: AmenityKey[] = ["hotTub", "pool", "oceanView", "beachAccess", "fireplace", "forestViews", "mountainViews"];

/**
 * Up to `count` badges for a stay card: what the guest searched for first, then the
 * stay's standout amenities, then Pet Friendly.
 */
export function cardBadges(
  stay: { amenities: AmenityKey[]; petsAllowed: boolean },
  searched: { amenities?: AmenityKey[]; pets?: boolean } = {},
  count = 2,
) {
  const has = (key: AmenityKey) => stay.amenities.includes(key);
  const badges: { key: string; label: string; icon: LucideIcon }[] = [];
  const add = (badge: { key: string; label: string; icon: LucideIcon }) => {
    if (!badges.some((b) => b.key === badge.key)) badges.push(badge);
  };
  (searched.amenities ?? []).filter(has).forEach((key) => add(amenity(key)));
  if (searched.pets && stay.petsAllowed) add(petFriendly);
  highlights.filter(has).forEach((key) => add(amenity(key)));
  if (stay.petsAllowed) add(petFriendly);
  stay.amenities.forEach((key) => add(amenity(key)));
  return badges.slice(0, count);
}
