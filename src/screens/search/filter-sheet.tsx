import { ReactNode, useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { AppText } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";
import { amenityLabels } from "@/lib/amenity-labels";
import { formatPrice } from "@/lib/format";
import type { SearchFilters } from "@/lib/search/parse-query";
import { amenityKeys, typeLabels, type AmenityKey, type PropertyType } from "@/lib/search/vocabulary";
import { tw } from "@/theme";

const priceCaps = [undefined, 150, 200, 300, 500] as const;
const typeChoices: PropertyType[] = ["cabin", "a-frame", "cottage", "house", "villa", "apartment"];

const toggle = <T,>(list: T[] | undefined, item: T) =>
  list?.includes(item) ? list.filter((value) => value !== item) : [...(list ?? []), item];

/**
 * Edits the hard filters. Applying replaces what was read from the sentence; soft words
 * and leftover words keep ranking.
 */
export function FilterSheet({
  visible,
  initial,
  onClose,
  onApply,
}: {
  visible: boolean;
  initial: SearchFilters;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
}) {
  const [draft, setDraft] = useState<SearchFilters>(initial);
  const [shownFor, setShownFor] = useState(initial);
  // Start from the current filters each time the sheet opens with new ones.
  if (shownFor !== initial) {
    setShownFor(initial);
    setDraft(initial);
  }
  const set = (patch: Partial<SearchFilters>) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      footer={
        <View style={tw`flex-row gap-3`}>
          <Button title="Clear" variant="secondary" onPress={() => setDraft({})} style={tw`flex-1`} />
          <Button title="Show stays" onPress={() => onApply(clean(draft))} style={tw`flex-1`} />
        </View>
      }
    >
      <View style={tw`gap-6`}>
        <Group title="Max price per night">
          {priceCaps.map((cap) => (
            <Chip
              key={cap ?? "any"}
              label={cap ? formatPrice(cap) : "Any"}
              selected={draft.maxPrice === cap && (cap !== undefined || draft.minPrice === undefined)}
              onPress={() => set({ maxPrice: cap, minPrice: undefined })}
            />
          ))}
        </Group>

        <Stepper
          label="Guests"
          value={draft.guests ?? 1}
          min={1}
          max={12}
          onChange={(guests) => set({ guests: guests > 1 ? guests : undefined })}
        />

        <View style={tw`flex-row items-center justify-between`}>
          <AppText variant="headline">Pet friendly</AppText>
          <Toggle
            value={draft.pets === true}
            onValueChange={(pets) => set({ pets: pets || undefined })}
            accessibilityLabel="Pet friendly"
          />
        </View>

        <Group title="Stay type">
          {typeChoices.map((type) => (
            <Chip
              key={type}
              label={typeLabels[type]}
              selected={draft.types?.includes(type) ?? false}
              // Choosing a type the guest ruled out lifts that exclusion.
              onPress={() => set({ types: toggle(draft.types, type), notTypes: draft.notTypes?.filter((t) => t !== type) })}
            />
          ))}
        </Group>

        <Group title="Amenities">
          {amenityKeys.map((key: AmenityKey) => (
            <Chip
              key={key}
              label={amenityLabels[key]}
              selected={draft.amenities?.includes(key) ?? false}
              onPress={() =>
                set({ amenities: toggle(draft.amenities, key), notAmenities: draft.notAmenities?.filter((a) => a !== key) })
              }
            />
          ))}
        </Group>
      </View>
    </Sheet>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={tw`gap-3`}>
      <AppText variant="headline">{title}</AppText>
      <View style={tw`flex-row flex-wrap gap-2`}>{children}</View>
    </View>
  );
}

function clean(filters: SearchFilters): SearchFilters {
  const result = { ...filters };
  for (const key of Object.keys(result) as (keyof SearchFilters)[]) {
    const value = result[key];
    if (value === undefined || (Array.isArray(value) && value.length === 0)) delete result[key];
  }
  return result;
}
