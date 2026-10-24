import { ChevronLeft, Search, SlidersHorizontal } from "lucide-react-native";
import { ComponentRef, Ref } from "react";
import { Pressable, TextInput, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { tw } from "@/theme";

/** Back button and the search pill with the filters button inside it. */
export function SearchHeader({
  value,
  onChangeText,
  onSubmit,
  onBack,
  onOpenFilters,
  inputRef,
  autoFocus,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onOpenFilters: () => void;
  inputRef?: Ref<ComponentRef<typeof TextInput>>;
  autoFocus?: boolean;
}) {
  return (
    <View style={tw`flex-row items-center gap-3`}>
      <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={onBack} />
      <View style={tw`h-14 flex-1 flex-row items-center gap-3 rounded-full bg-canvas pl-4 pr-2`}>
        <Icon as={Search} />
        <TextInput
          ref={inputRef}
          autoFocus={autoFocus}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder="Describe your stay"
          placeholderTextColor={tw.color("placeholder")}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Describe your stay"
          // outlineStyle: no browser focus ring on web; the pill is the field.
          style={[tw`type-callout flex-1 p-0 text-ink`, { outlineStyle: "none" }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filters"
          hitSlop={6}
          onPress={onOpenFilters}
          style={({ pressed }) => [tw`h-10 w-10 items-center justify-center rounded-full`, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon as={SlidersHorizontal} />
        </Pressable>
      </View>
    </View>
  );
}
