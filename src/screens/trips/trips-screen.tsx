import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ReactNode, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { APP_TAB_BAR_HEIGHT } from "@/components/app-tab-bar";
import { StayCardPlaceholders, StayListMessage } from "@/components/stay-list-states";
import { ListingCard } from "@/components/ui/listing-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { AppText } from "@/components/ui/text";
import { cardBadges } from "@/lib/amenities";
import { useBookings } from "@/lib/bookings";
import { isUpcoming, type Booking } from "@/lib/bookings-shared";
import { today } from "@/lib/dates";
import { formatPlace, formatPrice, sanityImage } from "@/lib/format";
import { useSavedStays } from "@/lib/saved-stays";
import { tw } from "@/theme";

import { CancelTripSheet } from "./cancel-trip-sheet";
import { TripCard } from "./trip-card";

type Section = "upcoming" | "past" | "saved";

const sections: { value: Section; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "saved", label: "Saved" },
];

export function TripsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status, bookings, error, retry } = useBookings();
  const saved = useSavedStays();
  const [section, setSection] = useState<Section>("upcoming");
  const [cancelling, setCancelling] = useState<Booking | null>(null);

  const now = today();
  const upcoming = bookings.filter((b) => isUpcoming(b, now)).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const past = bookings.filter((b) => !isUpcoming(b, now)).sort((a, b) => b.checkIn.localeCompare(a.checkIn));
  const openStay = (slug: string) => router.push({ pathname: "/stay/[slug]", params: { slug } });

  const tripList = (list: Booking[], canCancel: boolean) =>
    list.map((booking) => (
      <TripCard
        key={booking.id}
        booking={booking}
        onPress={() => openStay(booking.slug)}
        onCancel={canCancel ? () => setCancelling(booking) : undefined}
      />
    ));

  const bookingsBody = (list: Booking[], canCancel: boolean, empty: ReactNode) =>
    status === "loading" ? (
      <StayCardPlaceholders count={2} height={136} />
    ) : status === "error" ? (
      <StayListMessage title="Couldn't load your trips." message={error?.message} actionLabel="Try again" onAction={retry} />
    ) : list.length > 0 ? (
      tripList(list, canCancel)
    ) : (
      empty
    );

  return (
    <View style={tw`flex-1 bg-surface`}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          tw`px-screen`,
          { paddingTop: insets.top + 8, paddingBottom: APP_TAB_BAR_HEIGHT + insets.bottom + 32 },
        ]}
      >
        <AppText variant="hero" accessibilityRole="header" style={tw`mt-7`}>
          Trips
        </AppText>
        <SegmentedControl options={sections} value={section} onChange={setSection} style={tw`mt-5`} />

        <View style={tw`mt-6 gap-4`}>
          {section === "upcoming"
            ? bookingsBody(
                upcoming,
                true,
                <StayListMessage
                  title="No trips yet."
                  message="Stays you book will show up here."
                  actionLabel="Find a stay"
                  onAction={() => router.navigate("/search")}
                />,
              )
            : section === "past"
              ? bookingsBody(past, false, <StayListMessage title="No past trips." />)
              : saved.saved.length > 0
                ? saved.saved.map((stay) => (
                    <ListingCard
                      key={stay._id}
                      title={stay.title}
                      location={formatPlace(stay.place)}
                      imageUrl={sanityImage(stay.imageUrl, 400) ?? ""}
                      rating={stay.rating}
                      reviewCount={stay.reviewCount}
                      pricePerNight={formatPrice(stay.pricePerNight)}
                      amenities={cardBadges(stay)}
                      saved
                      onToggleSaved={() => saved.toggle(stay)}
                      savePlacement="end"
                      onPress={() => openStay(stay.slug)}
                    />
                  ))
                : (
                    <StayListMessage title="Nothing saved yet." message="Tap the heart on a stay to save it here." />
                  )}
        </View>
      </ScrollView>

      <CancelTripSheet booking={cancelling} onClose={() => setCancelling(null)} />
    </View>
  );
}
