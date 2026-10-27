import { ArrowUpRight, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { tw } from "@/theme";

/** The one-sentence stay search. Typed text stays on the device: nothing is sent or logged. */
export function AiSearchBar({ onSubmit }: { onSubmit: (query: string) => void }) {
  const [query, setQuery] = useState("");
  const submit = () => onSubmit(query.trim());

  return (
    <View style={tw`h-15 flex-row items-center gap-2 rounded-full bg-accent pl-4 pr-2`}>
      <Icon as={Sparkles} size="md" />
      <TextInput
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={submit}
        // The design's example sentence doubles as the hint.
        placeholder="quiet pet friendly cabin with hot tub"
        placeholderTextColor={tw.color("ink/70")}
        returnKeyType="search"
        accessibilityLabel="Describe your perfect stay"
        // outlineStyle: no browser focus ring on web; the bar is the field.
        style={[tw`type-callout text-caption flex-1 p-0`, { outlineStyle: "none" }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search with AI"
        hitSlop={4}
        onPress={submit}
        style={({ pressed }) => [
          tw`h-11 w-11 items-center justify-center rounded-full bg-surface`,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Icon as={ArrowUpRight} />
      </Pressable>
    </View>
  );
}
