import { Pressable, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

/** Photo, name and email at the top of Profile. Opens Personal info. */
export function ProfileCard({
  name,
  email,
  imageUrl,
  onPress,
}: {
  name: string;
  email?: string;
  imageUrl?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}${email ? `, ${email}` : ""}`}
      accessibilityHint="Opens personal info"
      onPress={onPress}
      style={({ pressed }) => [tw`flex-row items-center gap-4 rounded-xl bg-canvas p-3`, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Avatar imageUrl={imageUrl} name={name} size="xl" />
      <View style={tw`flex-1 gap-1`}>
        <AppText variant="title-lg" numberOfLines={2}>
          {name}
        </AppText>
        {email ? (
          <AppText variant="body" numberOfLines={1}>
            {email}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}
