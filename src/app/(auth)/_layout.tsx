import { Stack } from "expo-router";

import { tw } from "@/theme";

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: tw`bg-surface` }} />;
}
