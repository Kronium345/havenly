import { ArrowUp, MessageSquare } from "lucide-react-native";
import { ScrollView, TextInput, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { TOPICS, type TopicDefinition } from "@/lib/ask/topics";
import { color, control, tw } from "@/theme";

export const MAX_QUESTION_LENGTH = 300;

/** Topic chips that each send a question, then the message input with Send. */
export function Composer({
  value,
  onChangeText,
  onSend,
  onTopic,
  disabled,
  bottomInset,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onTopic: (topic: TopicDefinition) => void;
  disabled: boolean;
  bottomInset: number;
}) {
  const canSend = !disabled && value.trim().length > 0;
  return (
    <View style={[tw`border-t border-border bg-surface`, { paddingBottom: bottomInset + 8 }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={tw`gap-2 px-screen py-3`}
      >
        {TOPICS.map((topic) => (
          <Chip
            key={topic.key}
            label={topic.label}
            accessibilityHint={`Asks: ${topic.question}`}
            onPress={disabled ? undefined : () => onTopic(topic)}
          />
        ))}
      </ScrollView>
      <View
        style={[
          tw`mx-screen flex-row items-center gap-3 rounded-full bg-canvas py-1.5 pl-4 pr-1.5`,
          { minHeight: control.lg },
        ]}
      >
        <Icon as={MessageSquare} color="muted" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Ask about this stay"
          accessibilityLabel="Your question"
          placeholderTextColor={color("placeholder")}
          selectionColor={color("lavender-deep")}
          cursorColor={color("lavender-deep")}
          maxLength={MAX_QUESTION_LENGTH}
          multiline
          numberOfLines={4}
          submitBehavior="submit"
          returnKeyType="send"
          onSubmitEditing={canSend ? onSend : undefined}
          editable={!disabled}
          // outlineStyle: drop the browser focus ring on web.
          style={[tw`type-callout flex-1 py-2`, { maxHeight: 112, outlineStyle: "none" }]}
        />
        <IconButton icon={ArrowUp} accessibilityLabel="Send" variant="primary" size="md" disabled={!canSend} onPress={onSend} />
      </View>
    </View>
  );
}
