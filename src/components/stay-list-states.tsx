import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

/** Grey card shapes while stays load. */
export function StayCardPlaceholders({ count = 3, height = 176 }: { count?: number; height?: number }) {
  return (
    <View accessibilityLabel="Loading stays" accessibilityRole="progressbar" style={tw`gap-4`}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[tw`rounded-2xl bg-canvas`, { height }]} />
      ))}
    </View>
  );
}

export function StayListMessage({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={tw`items-center gap-2 px-6 py-12`}>
      <AppText variant="headline" style={tw`text-center`}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" style={tw`text-center`}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="secondary" size="md" onPress={onAction} style={tw`mt-3 self-stretch`} />
      ) : null}
    </View>
  );
}
