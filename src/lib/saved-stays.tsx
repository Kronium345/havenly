import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { usePostHog } from "posthog-react-native";

import type { StayCard } from "./search/types";

// Hearted stays, on this device for this session only. Saved favorites need their
// own plan (where they're stored is still a decision). Card data is kept so Trips can
// list them without loading anything.

type SavedStays = {
  saved: StayCard[];
  isSaved: (id: string) => boolean;
  toggle: (stay: StayCard) => void;
};

const SavedStaysContext = createContext<SavedStays | null>(null);

const toCard = (stay: StayCard): StayCard => ({
  _id: stay._id,
  slug: stay.slug,
  title: stay.title,
  place: stay.place,
  rating: stay.rating,
  reviewCount: stay.reviewCount,
  pricePerNight: stay.pricePerNight,
  amenities: stay.amenities,
  petsAllowed: stay.petsAllowed,
  category: stay.category,
  propertyType: stay.propertyType,
  imageUrl: stay.imageUrl,
  imageAlt: stay.imageAlt,
});

export function SavedStaysProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<StayCard[]>([]);
  const posthog = usePostHog();
  const toggle = useCallback((stay: StayCard) => {
    const wasSaved = saved.some((current) => current._id === stay._id);
    setSaved((current) => (wasSaved ? current.filter((item) => item._id !== stay._id) : [toCard(stay), ...current]));
    posthog.capture(wasSaved ? "saved_stay_removed" : "saved_stay_added", { stay_id: stay._id });
  }, [posthog, saved]);
  const value = useMemo<SavedStays>(
    () => ({ saved, isSaved: (id) => saved.some((s) => s._id === id), toggle }),
    [saved, toggle],
  );
  return <SavedStaysContext.Provider value={value}>{children}</SavedStaysContext.Provider>;
}

export function useSavedStays() {
  const saved = useContext(SavedStaysContext);
  if (!saved) throw new Error("useSavedStays must be used inside SavedStaysProvider");
  return saved;
}
