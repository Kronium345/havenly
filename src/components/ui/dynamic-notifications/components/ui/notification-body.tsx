import { Image } from "expo-image";
import { memo } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/text";
import { iconSize, tw } from "@/theme";

import { useDynamicNotifications } from "../../hooks/use-dynamic-notifications";
import type { INotificationBody } from "../../interfaces/notification-content.interface";

// The card's contents: avatar, title in the accent, one-line message, optional icon.
// Upstream used raw Text sizes and SF Symbols; here it's AppText variants and lucide.
const NotificationBody: React.FC<INotificationBody> = memo<INotificationBody>(({ notification }: INotificationBody) => {
  const context = useDynamicNotifications();
  const accent = notification.accent ?? context.accent;
  const TrailingIcon = notification.icon;

  return (
    <View style={tw`flex-1 flex-row items-center gap-3 pl-3 pr-5`}>
      {notification.avatar ? (
        <Image
          source={{ uri: notification.avatar }}
          style={tw`h-12 w-12 rounded-full bg-canvas`}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={tw`h-12 w-12 rounded-full bg-canvas`} />
      )}

      <View style={tw`flex-1`}>
        <AppText variant="headline" numberOfLines={1} style={{ color: accent }}>
          {notification.title}
        </AppText>
        {notification.message ? (
          <AppText variant="caption" numberOfLines={1}>
            {notification.message}
          </AppText>
        ) : null}
      </View>

      {TrailingIcon ? <TrailingIcon size={iconSize.lg} color={accent} strokeWidth={2} /> : null}
    </View>
  );
});

NotificationBody.displayName = "DynamicNotifications.Body";

export { NotificationBody };
