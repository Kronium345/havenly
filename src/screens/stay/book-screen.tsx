import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CalendarCheck, ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { usePostHog } from "posthog-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StayListMessage } from "@/components/stay-list-states";
import { Button } from "@/components/ui/button";
import { DateRangeCalendar, type DateRange } from "@/components/ui/date-range-calendar";
import { IconButton } from "@/components/ui/icon-button";
import { Stepper } from "@/components/ui/stepper";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { ApiError, useApiQuery } from "@/lib/api";
import { useBookings } from "@/lib/bookings";
import { nightsBetween, shortDate } from "@/lib/dates";
import { formatPlace, formatPrice, plural, sanityImage } from "@/lib/format";
import { showBanner } from "@/lib/notifications/banner";
import { runPaymentSheet } from "@/lib/payments/payment-sheet";
import { isStripeReady } from "@/lib/payments/stripe-config";
import { posthogAppLogger } from "@/lib/posthog";
import type { StayDetails } from "@/lib/search/types";
import { tw } from "@/theme";

const BOTTOM_BAR_HEIGHT = 96;

// Paying books the trip: the server prices it from Sanity (the figures here are for
// display), Stripe's PaymentSheet takes the card, and the trip is saved only once the
// server has checked the payment succeeded.
export function BookScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const { checkout, confirmPaid, release } = useBookings();
  const { slug, nights: nightsParam } = useLocalSearchParams<{ slug: string; nights?: string }>();
  const stay = useApiQuery<StayDetails>(slug ? `/api/stays/${encodeURIComponent(slug)}` : null);
  const [range, setRange] = useState<DateRange>({});
  const [guests, setGuests] = useState(1);
  const [saving, setSaving] = useState(false);
  const searchedNights = nightsParam && /^\d{1,2}$/.test(nightsParam) ? Number(nightsParam) : undefined;

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate("/home"));
  const nights = range.checkIn && range.checkOut ? nightsBetween(range.checkIn, range.checkOut) : 0;

  const header = (
    <>
      <IconButton icon={ChevronLeft} accessibilityLabel="Back" variant="outline" size="md" onPress={goBack} />
      <AppText variant="hero" accessibilityRole="header" style={tw`mt-7`}>
        Book this stay
      </AppText>
    </>
  );

  if (stay.status !== "ready") {
    return (
      <View style={[tw`flex-1 bg-surface px-screen`, { paddingTop: insets.top + 8 }]}>
        <StatusBar style="dark" />
        {header}
        {stay.status === "loading" ? (
          <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={tw`mt-6 gap-3`}>
            <View style={tw`h-20 rounded-xl bg-canvas`} />
            <View style={tw`h-72 rounded-xl bg-canvas`} />
          </View>
        ) : (
          <StayListMessage title="Couldn't load this stay." message={stay.error.message} actionLabel="Try again" onAction={stay.retry} />
        )}
      </View>
    );
  }

  const data = stay.data;
  const total = data.pricePerNight * nights;

  const confirm = async () => {
    if (!range.checkIn || !range.checkOut) {
      toast.error("Pick your check-in and check-out dates.");
      return;
    }
    if (!isStripeReady()) {
      toast.info("Payment works in the Havenly app.", "Card payments aren't available here yet.");
      return;
    }
    setSaving(true);
    posthog.capture("booking_payment_started", { stay_id: data._id, nights, guests });
    try {
      const session = await checkout({ stayId: data._id, checkIn: range.checkIn, checkOut: range.checkOut, guests });
      const outcome = await runPaymentSheet(session);
      if (outcome.status === "cancelled") {
        release(session.bookingId);
        setSaving(false);
        return;
      }
      if (outcome.status === "failed") {
        release(session.bookingId);
        toast.error("Payment didn't go through.", outcome.message);
        setSaving(false);
        return;
      }
      const booking = await confirmPaid(session.paymentIntentId);
      posthog.capture("booking_confirmed", {
        stay_id: booking.stayId,
        nights: booking.nights,
        guests: booking.guests,
        total: booking.total,
        paid: true,
      });
      posthogAppLogger.info("booking confirmation succeeded", {
        stay_id: booking.stayId,
        nights: booking.nights,
        guests: booking.guests,
      });
      showBanner({
        title: "Trip booked",
        message: `${booking.title}. See it in Trips.`,
        avatar: booking.imageUrl ? sanityImage(booking.imageUrl, 200) : undefined,
        icon: CalendarCheck,
      });
      router.dismissAll();
      router.navigate("/trips");
    } catch (error) {
      posthogAppLogger.error("booking confirmation failed", {
        error_type: error instanceof ApiError ? "api_error" : "unknown_error",
      });
      toast.error(error instanceof ApiError ? error.message : "Couldn't book this stay. Try again.");
      setSaving(false);
    }
  };

  return (
    <View style={tw`flex-1 bg-surface`}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          tw`px-screen`,
          { paddingTop: insets.top + 8, paddingBottom: BOTTOM_BAR_HEIGHT + insets.bottom + 24 },
        ]}
      >
        {header}

        <View style={tw`mt-6 flex-row items-center gap-3`}>
          <Image
            source={{ uri: sanityImage(data.imageUrl, 200) }}
            accessibilityLabel={data.imageAlt ?? ""}
            contentFit="cover"
            style={tw`h-16 w-16 rounded-lg bg-canvas`}
          />
          <View style={tw`flex-1 gap-0.5`}>
            <AppText variant="headline" numberOfLines={2}>
              {data.title}
            </AppText>
            <AppText variant="caption">{formatPlace(data.place)}</AppText>
          </View>
        </View>

        <View style={tw`mt-6 rounded-xl border border-border p-4`}>
          <DateRangeCalendar value={range} onChange={setRange} />
          <AppText variant="callout" style={tw`mt-3 text-center font-medium text-ink`} accessibilityLiveRegion="polite">
            {range.checkIn && range.checkOut
              ? `${shortDate(range.checkIn)} → ${shortDate(range.checkOut)} · ${plural(nights, "night")}`
              : range.checkIn
                ? `Check-in ${shortDate(range.checkIn)}. Now pick check-out.`
                : searchedNights
                  ? `You searched for ${plural(searchedNights, "night")}. Pick check-in.`
                  : "Pick check-in."}
          </AppText>
        </View>

        <View style={tw`mt-6`}>
          <Stepper label="Guests" value={guests} min={1} max={data.maxGuests} onChange={setGuests} />
          <AppText variant="caption" style={tw`mt-1`}>
            Sleeps {data.maxGuests}
          </AppText>
        </View>

        {nights > 0 ? (
          <View style={tw`mt-6 gap-2 border-t border-border pt-5`}>
            <View style={tw`flex-row justify-between`}>
              <AppText variant="body" style={tw`text-ink`}>
                {formatPrice(data.pricePerNight)} × {plural(nights, "night")}
              </AppText>
              <AppText variant="body" style={tw`text-ink`}>
                {formatPrice(total)}
              </AppText>
            </View>
            <View style={tw`flex-row justify-between`}>
              <AppText variant="headline">Total</AppText>
              <AppText variant="headline">{formatPrice(total)}</AppText>
            </View>
            <AppText variant="caption">You pay {formatPrice(total)} now by card. Refunds follow the cancellation policy below.</AppText>
          </View>
        ) : null}

        {data.cancellationPolicy ? (
          <View style={tw`mt-6 gap-1 rounded-xl bg-canvas p-4`}>
            <AppText variant="headline">{data.cancellationPolicy.title}</AppText>
            <AppText variant="caption">{data.cancellationPolicy.summary}</AppText>
            <Pressable
              accessibilityRole="link"
              hitSlop={8}
              onPress={() => router.push({ pathname: "/stay/[slug]/policies", params: { slug: data.slug, section: "cancellation" } })}
              style={tw`mt-1 self-start`}
            >
              <AppText variant="callout" style={tw`font-medium underline`}>
                Read policy
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          tw`absolute bottom-0 left-0 right-0 flex-row items-center gap-4 border-t border-border bg-surface px-screen pt-3`,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <View style={tw`flex-1`}>
          {nights > 0 ? (
            <>
              <AppText variant="price">{formatPrice(total)}</AppText>
              <AppText variant="caption">{plural(nights, "night")}</AppText>
            </>
          ) : (
            <View style={tw`flex-row items-baseline gap-1`}>
              <AppText variant="price">{formatPrice(data.pricePerNight)}</AppText>
              <AppText variant="callout" style={tw`font-regular text-ink`}>
                / night
              </AppText>
            </View>
          )}
        </View>
        <Button
          title={nights > 0 ? `Pay ${formatPrice(total)}` : "Choose dates"}
          loading={saving}
          disabled={!range.checkIn || !range.checkOut}
          onPress={confirm}
          style={tw`px-8`}
        />
      </View>
    </View>
  );
}
