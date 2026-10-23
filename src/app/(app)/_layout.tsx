import { Stack } from "expo-router";

import { tw } from "@/theme";

export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: tw`bg-surface` }} />;
}
