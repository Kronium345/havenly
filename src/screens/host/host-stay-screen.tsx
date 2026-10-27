import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { StayCardPlaceholders, StayListMessage } from "@/components/stay-list-states";
import { AppText } from "@/components/ui/text";
import { useApiQuery } from "@/lib/api";
import { formatPlace, formatPrice } from "@/lib/format";
import type { HostStayDetails } from "@/lib/host-shared";
import { tw } from "@/theme";

import { BookedNightsCalendar } from "./booked-nights-calendar";
import { HostBookingRow } from "./host-booking-row";
import { HostLayout } from "./host-layout";

export function HostStayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const result = useApiQuery<HostStayDetails>(id ? `/api/host/stays/${encodeURIComponent(id)}` : null);
  const stay = result.status === "ready" ? result.data.stay : null;

  return (
    <HostLayout
      title={stay?.title ?? "Stay"}
      subtitle={stay ? `${formatPlace(stay.place)} · ${formatPrice(stay.pricePerNight)} a night` : undefined}
    >
      {result.status === "loading" ? (
        <StayCardPlaceholders count={1} height={360} />
      ) : result.status === "error" ? (
        <StayListMessage title="Couldn't load this stay." message={result.error.message} actionLabel="Try again" onAction={result.retry} />
      ) : (
        <View style={tw`gap-8`}>
          <View style={tw`gap-3`}>
            <AppText variant="title" accessibilityRole="header">
              Booked nights
            </AppText>
            <BookedNightsCalendar booked={result.data.booked} />
          </View>
          <View style={tw`gap-3`}>
            <AppText variant="title" accessibilityRole="header">
              Upcoming bookings
            </AppText>
            {result.data.bookings.length === 0 ? (
              <AppText variant="body">No upcoming bookings for this stay.</AppText>
            ) : (
              result.data.bookings.map((booking) => <HostBookingRow key={booking.id} booking={booking} showStay={false} />)
            )}
          </View>
        </View>
      )}
    </HostLayout>
  );
}
