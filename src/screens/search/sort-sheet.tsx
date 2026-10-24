import { Check } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import type { SearchSort } from "@/lib/search/types";
import { tw } from "@/theme";

export const sortLabels: Record<SearchSort, string> = {
  best: "Best match",
  priceLow: "Price: low to high",
  priceHigh: "Price: high to low",
  rating: "Top rated",
};

export function SortSheet({
  visible,
  value,
  onClose,
  onChange,
}: {
  visible: boolean;
  value: SearchSort;
  onClose: () => void;
  onChange: (sort: SearchSort) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Sort by">
      <View accessibilityRole="radiogroup">
        {(Object.keys(sortLabels) as SearchSort[]).map((sort) => (
          <Pressable
            key={sort}
            accessibilityRole="radio"
            accessibilityState={{ checked: sort === value }}
            onPress={() => onChange(sort)}
            style={({ pressed }) => [
              tw`flex-row items-center justify-between border-b border-border py-4`,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <AppText variant="callout" style={tw.style(sort === value ? "font-semibold" : "font-regular")}>
              {sortLabels[sort]}
            </AppText>
            {sort === value ? <Icon as={Check} /> : null}
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}
