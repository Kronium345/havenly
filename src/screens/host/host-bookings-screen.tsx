import { useState } from "react";
import { View } from "react-native";

import { StayCardPlaceholders, StayListMessage } from "@/components/stay-list-states";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useApiQuery } from "@/lib/api";
import type { HostBooking } from "@/lib/host-shared";
import { tw } from "@/theme";

import { HostBookingRow } from "./host-booking-row";
import { HostLayout } from "./host-layout";

type When = "upcoming" | "past";

const sections: { value: When; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

export function HostBookingsScreen() {
  const [when, setWhen] = useState<When>("upcoming");
  const result = useApiQuery<{ bookings: HostBooking[] }>(`/api/host/bookings?when=${when}`);

  return (
    <HostLayout title="Bookings">
      <SegmentedControl options={sections} value={when} onChange={setWhen} />
      <View style={tw`mt-6 gap-4`}>
        {result.status === "loading" ? (
          <StayCardPlaceholders count={3} height={96} />
        ) : result.status === "error" ? (
          <StayListMessage title="Couldn't load bookings." message={result.error.message} actionLabel="Try again" onAction={result.retry} />
        ) : result.data.bookings.length === 0 ? (
          <StayListMessage title={when === "upcoming" ? "No upcoming bookings." : "No past bookings."} />
        ) : (
          result.data.bookings.map((booking) => <HostBookingRow key={booking.id} booking={booking} />)
        )}
      </View>
    </HostLayout>
  );
}
