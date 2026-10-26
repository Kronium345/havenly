import { View } from "react-native";

import { tw } from "@/theme";

import { MessageBubble } from "./message-bubble";

/** Three dots shown briefly before a reply, so the exchange reads as a chat. */
export function TypingIndicator() {
  return (
    <View accessible accessibilityLabel="Havenly is replying" accessibilityLiveRegion="polite">
      <MessageBubble from="havenly">
        <View style={tw`h-6 flex-row items-center gap-1.5`}>
          {[0.4, 0.7, 1].map((opacity) => (
            <View key={opacity} style={[tw`h-1.5 w-1.5 rounded-full bg-muted`, { opacity }]} />
          ))}
        </View>
      </MessageBubble>
    </View>
  );
}
