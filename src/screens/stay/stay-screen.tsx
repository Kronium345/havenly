import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Award, ChevronLeft, ChevronRight, FileText, Heart, MapPin, MessageSquareText, Share, Star } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Share as NativeShare, ScrollView, View } from "react-native";
import { usePostHog } from "posthog-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StayListMessage } from "@/components/stay-list-states";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { PolicyCard } from "@/components/ui/policy-card";
import { AppText } from "@/components/ui/text";
import { cardBadges } from "@/lib/amenities";
import { useApiQuery } from "@/lib/api";
import { formatPlace, formatPrice, plural } from "@/lib/format";
import { posthogAppLogger } from "@/lib/posthog";
import { useSavedStays } from "@/lib/saved-stays";
import type { StayDetails } from "@/lib/search/types";
import { control, tw } from "@/theme";

import { HostSheet } from "./host-sheet";
import { PhotoPager } from "./photo-pager";

const PHOTO_HEIGHT = 360; // est. from property-details.png
const SHEET_OVERLAP = 28;
const BOTTOM_BAR_HEIGHT = 96;

export function StayScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const saved = useSavedStays();
  const { slug, nights: nightsParam } = useLocalSearchParams<{ slug: string; nights?: string }>();
  const stay = useApiQuery<StayDetails>(slug ? `/api/stays/${encodeURIComponent(slug)}` : null);
  const [hostOpen, setHostOpen] = useState(false);
  // Once the photo has scrolled away, a white bar sits behind the round buttons.
  const [scrolledPastPhoto, setScrolledPastPhoto] = useState(false);
  const headerHeight = insets.top + 8 + control.lg + 8;
  const nights = nightsParam && /^\d{1,2}$/.test(nightsParam) ? Number(nightsParam) : undefined;

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate("/home"));

  const topButtons = (data?: StayDetails) => (
    <View
      style={[
        tw.style("absolute left-0 right-0 top-0 flex-row items-end justify-between px-screen pb-2", {
          "bg-surface border-b border-border": scrolledPastPhoto,
        }),
        { height: headerHeight },
      ]}
    >
      <IconButton icon={ChevronLeft} accessibilityLabel="Back" variant="surface" onPress={goBack} />
      {data ? (
        <View style={tw`flex-row gap-3`}>
          <IconButton
            icon={Share}
            accessibilityLabel={`Share ${data.title}`}
            variant="surface"
            onPress={() => {
              posthog.capture("stay_shared", { stay_id: data._id });
              posthogAppLogger.info("stay share initiated", { stay_id: data._id });
              NativeShare.share({
                message: `${data.title} in ${formatPlace(data.place)} on Havenly, ${formatPrice(data.pricePerNight)} a night.`,
              }).catch(() => undefined);
            }}
          />
          <IconButton
            icon={Heart}
            accessibilityLabel={saved.isSaved(data._id) ? `Remove ${data.title} from saved` : `Save ${data.title}`}
            variant="surface"
            filled={saved.isSaved(data._id)}
            iconColor={saved.isSaved(data._id) ? "danger" : "ink"}
            onPress={() => saved.toggle(data)}
          />
        </View>
      ) : null}
    </View>
  );

  if (stay.status !== "ready") {
    return (
      <View style={tw`flex-1 bg-surface`}>
        <StatusBar style="dark" />
        <View style={[tw`bg-canvas`, { height: PHOTO_HEIGHT }]} />
        <View style={tw`px-screen pt-6`}>
          {stay.status === "loading" ? (
            <View accessibilityRole="progressbar" accessibilityLabel="Loading stay" style={tw`gap-3`}>
              <View style={tw`h-10 w-3/4 rounded-lg bg-canvas`} />
              <View style={tw`h-5 w-1/2 rounded-lg bg-canvas`} />
              <View style={tw`mt-4 h-20 rounded-xl bg-canvas`} />
            </View>
          ) : stay.error.status === 404 ? (
            <StayListMessage title="This stay isn't available anymore." actionLabel="Back" onAction={goBack} />
          ) : (
            <StayListMessage title="Couldn't load this stay." message={stay.error.message} actionLabel="Try again" onAction={stay.retry} />
          )}
        </View>
        {topButtons()}
      </View>
    );
  }

  const data = stay.data;
  const policy = data.cancellationPolicy;
  const openPolicies = (section?: string) =>
    router.push({ pathname: "/stay/[slug]/policies", params: section ? { slug: data.slug, section } : { slug: data.slug } });

  return (
    <View style={tw`flex-1 bg-surface`}>
      <StatusBar style={scrolledPastPhoto ? "dark" : "light"} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: BOTTOM_BAR_HEIGHT + insets.bottom + 24 }}
        scrollEventThrottle={32}
        onScroll={(event) => {
          const past = event.nativeEvent.contentOffset.y > PHOTO_HEIGHT - SHEET_OVERLAP - headerHeight;
          if (past !== scrolledPastPhoto) setScrolledPastPhoto(past);
        }}
      >
        <PhotoPager images={data.images} height={PHOTO_HEIGHT} />

        <View style={[tw`rounded-t-3xl bg-surface px-screen pt-6`, { marginTop: -SHEET_OVERLAP }]}>
          <View style={tw`flex-row items-start gap-4`}>
            <AppText variant="hero" accessibilityRole="header" style={tw`flex-1`}>
              {data.title}
            </AppText>
            <View
              accessibilityLabel={`Rated ${data.rating.toFixed(1)} from ${data.reviewCount} reviews`}
              style={tw`items-center rounded-xl bg-canvas px-4 py-2.5`}
            >
              <View style={tw`flex-row items-center gap-1`}>
                <Icon as={Star} color="primary" filled />
                <AppText variant="title">{data.rating.toFixed(1)}</AppText>
              </View>
              <AppText variant="caption">({data.reviewCount})</AppText>
            </View>
          </View>

          <View style={tw`mt-3 flex-row items-center gap-2`}>
            <Icon as={MapPin} filled />
            <AppText variant="body" style={tw`flex-1 text-ink`}>
              {formatPlace(data.place)}
            </AppText>
          </View>

          <View style={tw`mt-6 flex-row justify-between`}>
            {cardBadges(data, {}, 4).map((badge) => (
              <View key={badge.key} style={tw`flex-1 items-center gap-2`}>
                <Icon as={badge.icon} size="lg" />
                <AppText variant="caption" style={tw`text-center text-ink`}>
                  {badge.label}
                </AppText>
              </View>
            ))}
          </View>

          <View style={tw`mt-5 gap-3 border-t border-border pt-5`}>
            <PolicyCard
              icon={MessageSquareText}
              title="Ask about policies"
              description="Cancellation, house rules, pets, check-in and more."
              onPress={() => openPolicies()}
            />
            {policy ? (
              <PolicyCard icon={FileText} title={policy.title} description={policy.summary} onPress={() => openPolicies("cancellation")} />
            ) : null}
          </View>

          {data.host ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Hosted by ${data.host.name}${data.host.superhost ? ", Superhost" : ""}`}
              onPress={() => setHostOpen(true)}
              style={({ pressed }) => [
                tw`mt-5 flex-row items-center gap-4 border-t border-border pt-5`,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={tw`h-14 w-14 items-center justify-center rounded-full bg-primary-tint`}>
                <AppText variant="title">{data.host.name[0]?.toUpperCase()}</AppText>
              </View>
              <View style={tw`flex-1 gap-0.5`}>
                <AppText variant="headline">Hosted by {data.host.name}</AppText>
                {data.host.superhost ? (
                  <View style={tw`flex-row items-center gap-1`}>
                    <Icon as={Award} size="sm" color="muted" />
                    <AppText variant="caption">Superhost</AppText>
                  </View>
                ) : null}
              </View>
              <Icon as={ChevronRight} size="md" />
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[
          tw`absolute bottom-0 left-0 right-0 flex-row items-center gap-4 border-t border-border bg-surface px-screen pt-3`,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-baseline gap-1`}>
            <AppText variant="price">{formatPrice(data.pricePerNight)}</AppText>
            <AppText variant="callout" style={tw`font-regular text-ink`}>
              / night
            </AppText>
          </View>
          {nights ? (
            <AppText variant="caption" accessibilityLabel={`${formatPrice(data.pricePerNight * nights)} total for ${plural(nights, "night")}`}>
              {formatPrice(data.pricePerNight * nights)} total · {plural(nights, "night")}
            </AppText>
          ) : null}
        </View>
        <Button
          title="Book this stay"
          onPress={() => {
            posthog.capture("stay_booking_started", { stay_id: data._id, preselected_nights: nights ?? null });
            router.push({
              pathname: "/stay/[slug]/book",
              params: nights ? { slug: data.slug, nights: String(nights) } : { slug: data.slug },
            });
          }}
          style={tw`px-8`}
        />
      </View>

      {topButtons(data)}
      {data.host ? <HostSheet host={data.host} visible={hostOpen} onClose={() => setHostOpen(false)} /> : null}
    </View>
  );
}
