import { Image } from "expo-image";
import { View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { AppText } from "@/components/ui/text";
import { dateRange } from "@/lib/dates";
import { formatPrice, plural, sanityImage } from "@/lib/format";
import type { HostBooking } from "@/lib/host-shared";
import { tw } from "@/theme";

/** One booking as a host sees it: stay, guest ("Daniel A."), dates, party and total. */
export function HostBookingRow({ booking, showStay = true }: { booking: HostBooking; showStay?: boolean }) {
  const cancelled = booking.status === "cancelled";
  const dates = `${dateRange(booking.checkIn, booking.checkOut)} · ${plural(booking.nights, "night")}`;
  return (
    <View
      accessible
      accessibilityLabel={`${booking.guest}, ${showStay ? `${booking.stayTitle}, ` : ""}${dates}, ${plural(booking.guests, "guest")}, ${formatPrice(booking.total)}${cancelled ? ", cancelled" : ""}`}
      style={tw`flex-row gap-3 rounded-2xl bg-surface p-2 shadow-card`}
    >
      {showStay ? (
        <Image
          source={{ uri: sanityImage(booking.imageUrl, 200) }}
          contentFit="cover"
          style={tw.style("h-20 w-20 rounded-lg bg-canvas", cancelled && "opacity-60")}
        />
      ) : null}
      <View style={tw`flex-1 gap-0.5 py-1 pr-1`}>
        <AppText variant="headline">{booking.guest}</AppText>
        {showStay ? (
          <AppText variant="caption" numberOfLines={1}>
            {booking.stayTitle}
          </AppText>
        ) : null}
        <AppText variant="callout" style={tw`font-medium text-ink`}>
          {dates}
        </AppText>
        <View style={tw`flex-row items-center gap-2`}>
          <AppText variant="caption">
            {plural(booking.guests, "guest")} · {formatPrice(booking.total)}
          </AppText>
          {cancelled ? <Badge variant="discount" label="Cancelled" /> : null}
        </View>
      </View>
    </View>
  );
}
