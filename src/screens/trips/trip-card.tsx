import { Image } from "expo-image";
import { Pressable, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { AppText } from "@/components/ui/text";
import type { Booking } from "@/lib/bookings-shared";
import { dateRange } from "@/lib/dates";
import { formatPlace, formatPrice, plural, sanityImage } from "@/lib/format";
import { tw } from "@/theme";

/** A booked trip. "Cancel trip" sits beside the card's pressable, never inside it. */
export function TripCard({
  booking,
  onPress,
  onCancel,
}: {
  booking: Booking;
  onPress: () => void;
  onCancel?: () => void;
}) {
  const cancelled = booking.status === "cancelled";
  const dates = `${dateRange(booking.checkIn, booking.checkOut)} · ${plural(booking.nights, "night")}`;
  return (
    <View style={tw`rounded-2xl bg-surface shadow-card`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${booking.title}, ${dates}, ${plural(booking.guests, "guest")}, ${formatPrice(booking.total)} total${cancelled ? ", cancelled" : ""}`}
        onPress={onPress}
        style={({ pressed }) => [tw`flex-row gap-3 p-2`, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Image
          source={{ uri: sanityImage(booking.imageUrl, 300) }}
          contentFit="cover"
          transition={200}
          style={tw.style("h-28 w-28 rounded-lg bg-canvas", cancelled && "opacity-60")}
        />
        <View style={tw`flex-1 gap-1 py-1 pr-1`}>
          <AppText variant="headline" numberOfLines={2}>
            {booking.title}
          </AppText>
          <AppText variant="caption">{formatPlace(booking.place)}</AppText>
          <AppText variant="callout" style={tw`font-medium text-ink`}>
            {dates}
          </AppText>
          <View style={tw`flex-row items-center gap-2`}>
            <AppText variant="caption">
              {plural(booking.guests, "guest")} · {formatPrice(booking.total)} total
            </AppText>
            {cancelled ? <Badge variant="discount" label="Cancelled" /> : null}
          </View>
        </View>
      </Pressable>
      {onCancel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cancel trip to ${booking.title}`}
          hitSlop={8}
          onPress={onCancel}
          style={({ pressed }) => [tw`self-end px-4 pb-3`, { opacity: pressed ? 0.6 : 1 }]}
        >
          <AppText variant="callout" style={tw`font-medium text-danger`}>
            Cancel trip
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
