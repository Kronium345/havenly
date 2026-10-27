import { createContext, ReactNode, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePostHog } from "posthog-react-native";

import { toast } from "@/components/ui/toast";

import { useApiFetch, useApiQuery } from "./api";
import type { StayCard } from "./search/types";

// Hearted stays, kept in the guest's account through /api/saved-stays so they survive
// restarts and devices. Tapping a heart updates at once and saves in the background;
// if saving fails the change is undone with an error toast.

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
  const posthog = usePostHog();
  const apiFetch = useApiFetch();
  const loaded = useApiQuery<StayCard[]>("/api/saved-stays");
  // Changes made in this session, applied over what was loaded.
  const [override, setOverride] = useState<StayCard[] | null>(null);
  const saved = useMemo(() => override ?? (loaded.status === "ready" ? loaded.data : []), [override, loaded.status, loaded.data]);
  // The latest list, for toggles fired before a re-render.
  const latest = useRef<StayCard[]>(saved);
  useLayoutEffect(() => {
    latest.current = saved;
  }, [saved]);

  const toggle = useCallback(
    (stay: StayCard) => {
      const before = latest.current;
      const wasSaved = before.some((current) => current._id === stay._id);
      const next = wasSaved ? before.filter((item) => item._id !== stay._id) : [toCard(stay), ...before];
      latest.current = next;
      setOverride(next);
      posthog.capture(wasSaved ? "saved_stay_removed" : "saved_stay_added", { stay_id: stay._id });
      apiFetch<StayCard[]>("/api/saved-stays", {
        method: "PUT",
        body: JSON.stringify({ ids: next.map((item) => item._id) }),
      }).catch(() => {
        latest.current = before;
        setOverride(before);
        toast.error(wasSaved ? "Couldn't remove that stay." : "Couldn't save that stay.", "Check your connection and try again.");
      });
    },
    [apiFetch, posthog],
  );

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
