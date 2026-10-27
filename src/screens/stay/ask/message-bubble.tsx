import { ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

/** A chat bubble: the guest's on the right in the accent tint, Havenly's on the left in grey. */
export function MessageBubble({ from, children }: { from: "guest" | "havenly"; children: ReactNode }) {
  const guest = from === "guest";
  return (
    <View
      style={tw.style(
        "max-w-[80%] rounded-2xl px-4 py-3",
        guest ? "self-end rounded-br-sm bg-accent-tint" : "self-start rounded-bl-sm bg-canvas",
      )}
    >
      {typeof children === "string" ? (
        <AppText variant={guest ? "callout" : "body"} style={tw`text-ink`}>
          {children}
        </AppText>
      ) : (
        children
      )}
    </View>
  );
}
