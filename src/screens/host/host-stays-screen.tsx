import { useRouter } from "expo-router";
import { View } from "react-native";

import { StayCardPlaceholders, StayListMessage } from "@/components/stay-list-states";
import { ListingCard } from "@/components/ui/listing-card";
import { cardBadges } from "@/lib/amenities";
import { useApiQuery } from "@/lib/api";
import { formatPlace, formatPrice, sanityImage } from "@/lib/format";
import type { StayCard } from "@/lib/search/types";
import { tw } from "@/theme";

import { HostLayout } from "./host-layout";

export function HostStaysScreen() {
  const router = useRouter();
  const result = useApiQuery<{ stays: StayCard[] }>("/api/host/stays");

  return (
    <HostLayout title="Stays">
      <View style={tw`gap-4`}>
        {result.status === "loading" ? (
          <StayCardPlaceholders count={2} />
        ) : result.status === "error" ? (
          <StayListMessage title="Couldn't load your stays." message={result.error.message} actionLabel="Try again" onAction={result.retry} />
        ) : result.data.stays.length === 0 ? (
          <StayListMessage title="No stays yet." message="Stays linked to your hosting account will show up here." />
        ) : (
          result.data.stays.map((stay) => (
            <ListingCard
              key={stay._id}
              title={stay.title}
              location={formatPlace(stay.place)}
              imageUrl={sanityImage(stay.imageUrl, 400) ?? ""}
              rating={stay.rating}
              reviewCount={stay.reviewCount}
              pricePerNight={formatPrice(stay.pricePerNight)}
              amenities={cardBadges(stay)}
              onPress={() => router.push({ pathname: "/host/stays/[id]", params: { id: stay._id } })}
            />
          ))
        )}
      </View>
    </HostLayout>
  );
}
