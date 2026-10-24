import { Tabs } from "expo-router/js-tabs";

import { AppTabBar } from "@/components/app-tab-bar";
import { tw } from "@/theme";

// JS tabs with our own floating bar: tab screens stay mounted after their first visit,
// so switching is instant and each tab keeps its scroll position and search.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: "none", sceneStyle: tw`bg-surface` }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="trips" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
