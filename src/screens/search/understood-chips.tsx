import { ScrollView } from "react-native";

import { Chip } from "@/components/ui/chip";
import type { UnderstoodChip } from "@/lib/search/types";
import { tw } from "@/theme";

/**
 * What the app read from the sentence. The first chip takes the selected style, as in
 * search.png; tapping any chip removes it from the search.
 */
export function UnderstoodChips({ chips, onRemove }: { chips: UnderstoodChip[]; onRemove: (key: string) => void }) {
  if (chips.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw`gap-2 px-screen`}
      style={tw`-mx-screen mt-4 grow-0`}
    >
      {chips.map((chip, index) => (
        <Chip
          key={chip.key}
          label={chip.label}
          selected={index === 0}
          onPress={() => onRemove(chip.key)}
          accessibilityHint="Removes this from your search"
        />
      ))}
    </ScrollView>
  );
}
