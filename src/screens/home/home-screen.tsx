import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Calendar, House, Search, User } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { TabBar } from "@/components/ui/tab-bar";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { Wordmark } from "@/components/ui/wordmark";
import { displayFirstName } from "@/lib/display-name";
import { tw } from "@/theme";

import { AiSearchBar } from "./ai-search-bar";
import { FeaturedStayCard } from "./featured-stay-card";
import { categories, StayCategory, stays } from "./stays";

const TAB_BAR_HEIGHT = 76; // TabBar: 64 items + 6 padding top and bottom
const tabs = [
  { key: "home", label: "Home", icon: House },
  { key: "search", label: "Search", icon: Search },
  { key: "trips", label: "Trips", icon: Calendar },
  { key: "profile", label: "Profile", icon: User },
] as const;

const comingNext = (what: string) => toast.info(`${what} is coming next.`);

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const [category, setCategory] = useState<StayCategory | "all">("all");
  const firstName = displayFirstName(user);
  const visible = category === "all" ? stays : stays.filter((stay) => stay.category === category);
  const categoryLabel = categories.find((item) => item.key === category)?.label ?? "";

  return (
    <View style={tw`flex-1 bg-surface`}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          tw`px-screen`,
          { paddingTop: insets.top + 8, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={tw`flex-row items-center justify-between`}>
          <Wordmark height={44} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Your profile"
            onPress={() => router.push("/profile")}
            style={tw`h-21 w-21 items-center justify-center rounded-full bg-primary-tint`}
          >
            <AppText variant="display">{firstName[0]?.toUpperCase()}</AppText>
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
            onPress={() => comingNext("Search")}
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
            onSubmit={() => toast.info("AI search is coming next.", "It will rank stays from your sentence.")}
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
          {visible.length > 0 ? (
            visible.map((stay) => (
              <FeaturedStayCard key={stay.id} stay={stay} onPress={() => comingNext("Stay details")} />
            ))
          ) : (
            <AppText variant="body" style={tw`py-10 text-center`}>
              No {categoryLabel.toLowerCase()} stays yet.
            </AppText>
          )}
        </View>
      </ScrollView>

      <TabBar
        items={[...tabs]}
        activeKey="home"
        onPress={(key) => {
          if (key === "profile") router.push("/profile");
          else if (key !== "home") comingNext(tabs.find((tab) => tab.key === key)?.label ?? "This tab");
        }}
        style={[tw`absolute left-4 right-4`, { bottom: insets.bottom + 8 }]}
      />
    </View>
  );
}
