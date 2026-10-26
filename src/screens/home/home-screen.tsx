import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Search } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { usePostHog } from "posthog-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { APP_TAB_BAR_HEIGHT } from "@/components/app-tab-bar";
import { StayCardPlaceholders, StayListMessage } from "@/components/stay-list-states";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { Wordmark } from "@/components/ui/wordmark";
import { useApiQuery } from "@/lib/api";
import { displayFirstName, profileImageUrl } from "@/lib/display-name";
import { posthogAppLogger } from "@/lib/posthog";
import type { StayCard } from "@/lib/search/types";
import { tw } from "@/theme";

import { AiSearchBar } from "./ai-search-bar";
import { FeaturedStayCard } from "./featured-stay-card";
import { categories, StayCategory } from "./stays";

const FEATURED_CARD_HEIGHT = 268; // matches FeaturedStayCard

export function HomeScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const stays = useApiQuery<StayCard[]>("/api/stays");
  const [category, setCategory] = useState<StayCategory | "all">("all");
  const firstName = displayFirstName(user);
  const categoryLabel = categories.find((item) => item.key === category)?.label ?? "";
  const visible =
    stays.status === "ready"
      ? category === "all"
        ? stays.data
        : stays.data.filter((stay) => stay.category === category)
      : [];

  return (
    <View style={tw`flex-1 bg-surface`}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          tw`px-screen`,
          { paddingTop: insets.top + 8, paddingBottom: APP_TAB_BAR_HEIGHT + insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={tw`flex-row items-center justify-between`}>
          <Wordmark height={44} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Your profile"
            onPress={() => router.navigate("/profile")}
          >
            <Avatar imageUrl={profileImageUrl(user)} name={firstName} size="lg" />
          </Pressable>
        </View>

        <AppText variant="title" style={tw`mt-3 font-medium text-muted`}>
          Hey, {firstName} 👋
        </AppText>
        <View style={tw`mt-1 flex-row items-center gap-4`}>
          <AppText variant="display" accessibilityRole="header" style={tw`flex-1`}>
            {"Find your\nnext stay"}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search"
            onPress={() => router.navigate("/search")}
            style={({ pressed }) => [
              tw`h-20 w-16 items-center justify-center rounded-3xl bg-canvas`,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Icon as={Search} />
          </Pressable>
        </View>

        <View style={tw`mt-5`}>
          <AiSearchBar
            onSubmit={(query) => {
              posthog.capture("stay_search_submitted", { source: "home", has_query: query.length > 0 });
              router.navigate(query ? { pathname: "/search", params: { q: query } } : "/search");
            }}
          />
        </View>

        <View style={tw`mt-5 flex-row flex-wrap gap-2`}>
          {categories.map((item) => (
            <Chip
              key={item.key}
              variant="category"
              label={item.label}
              icon={item.icon}
              selected={category === item.key}
              onPress={() => setCategory(item.key)}
            />
          ))}
        </View>

        <View style={tw`mt-6 gap-5`}>
          {stays.status === "loading" ? (
            <StayCardPlaceholders count={2} height={FEATURED_CARD_HEIGHT} />
          ) : stays.status === "error" ? (
            <StayListMessage
              title="Couldn't load stays."
              message={stays.error.message}
              actionLabel="Try again"
              onAction={stays.retry}
            />
          ) : visible.length > 0 ? (
            visible.map((stay) => (
              <FeaturedStayCard
                key={stay._id}
                stay={stay}
                onPress={() => {
                  posthog.capture("stay_selected", { stay_id: stay._id, source: "home" });
                  posthogAppLogger.info("stay detail opened", { stay_id: stay._id, source: "home" });
                  router.push({ pathname: "/stay/[slug]", params: { slug: stay.slug } });
                }}
              />
            ))
          ) : (
            <StayListMessage title={`No ${categoryLabel.toLowerCase()} stays yet.`} />
          )}
        </View>
      </ScrollView>

    </View>
  );
}
