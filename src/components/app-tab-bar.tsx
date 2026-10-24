import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Calendar, House, Search, User } from "lucide-react-native";

import { TabBar } from "@/components/ui/tab-bar";
import { tw } from "@/theme";

export type AppTab = "home" | "search" | "trips" | "profile";

/** TabBar height: 64 items + 6 padding top and bottom. Tab screens pad their content by this. */
export const APP_TAB_BAR_HEIGHT = 76;

const tabs = [
  { key: "home", label: "Home", icon: House },
  { key: "search", label: "Search", icon: Search },
  { key: "trips", label: "Trips", icon: Calendar },
  { key: "profile", label: "Profile", icon: User },
] as const;

/**
 * The floating tab bar, rendered by the `(tabs)` navigator. Switching tabs keeps each
 * screen mounted, so it's instant and keeps its state.
 */
export function AppTabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const active = (state.routes[state.index]?.name ?? "home") as AppTab;
  return (
    <TabBar
      items={[...tabs]}
      activeKey={active}
      onPress={(key) => {
        const route = state.routes.find((item) => item.name === key);
        if (route && key !== active) navigateToTab(route.key);
      }}
      style={[tw`absolute left-4 right-4`, { bottom: insets.bottom + 8 }]}
    />
  );
}
