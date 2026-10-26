import { useState } from "react";
import { View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { ApiError, useApiQuery } from "@/lib/api";
import { useBookings } from "@/lib/bookings";
import type { Booking } from "@/lib/bookings-shared";
import { dateRange } from "@/lib/dates";
import type { StayDetails } from "@/lib/search/types";
import { tw } from "@/theme";

/** Confirms a cancellation, showing the stay's cancellation policy word for word. */
export function CancelTripSheet({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  const { cancel } = useBookings();
  const posthog = usePostHog();
  const [cancelling, setCancelling] = useState(false);
  const stay = useApiQuery<StayDetails>(booking ? `/api/stays/${encodeURIComponent(booking.slug)}` : null);
  const policy = stay.status === "ready" ? stay.data.cancellationPolicy : null;

  const confirm = async () => {
    if (!booking) return;
    setCancelling(true);
    try {
      const cancelledBooking = await cancel(booking.id);
      posthog.capture("booking_cancelled", { stay_id: cancelledBooking.stayId, nights: cancelledBooking.nights });
      toast.success("Trip cancelled.");
      onClose();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't cancel this trip. Try again.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Sheet
      visible={booking !== null}
      onClose={onClose}
      title="Cancel this trip?"
      footer={
        <View style={tw`flex-row gap-3`}>
          <Button title="Keep trip" variant="secondary" onPress={onClose} style={tw`flex-1`} />
          <Button title="Cancel trip" loading={cancelling} onPress={confirm} style={tw`flex-1`} />
        </View>
      }
    >
      {booking ? (
        <View style={tw`gap-3`}>
          <AppText variant="body" style={tw`text-ink`}>
            {booking.title}, {dateRange(booking.checkIn, booking.checkOut)}.
          </AppText>
          {stay.status === "loading" ? (
            <View accessibilityRole="progressbar" accessibilityLabel="Loading policy" style={tw`h-20 rounded-xl bg-canvas`} />
          ) : policy ? (
            <View style={tw`gap-1 rounded-xl bg-canvas p-4`}>
              <AppText variant="headline">{policy.title}</AppText>
              <AppText variant="body" style={tw`text-ink`}>
                {policy.body}
              </AppText>
            </View>
          ) : (
            <AppText variant="caption">We couldn&apos;t load this stay&apos;s cancellation policy.</AppText>
          )}
        </View>
      ) : null}
    </Sheet>
  );
}
