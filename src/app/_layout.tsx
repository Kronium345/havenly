import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useDeviceContext } from "twrnc";

import { ToastHost } from "@/components/ui/toast";
import { fonts, tw } from "@/theme";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!publishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add your key to .env.local.\nRun: 1) clerk auth login  2) clerk link  3) clerk env pull — then restart the dev server.");
}

// If Clerk can't load (e.g. offline), stop holding the splash after this long.
const CLERK_SPLASH_TIMEOUT_MS = 5000;

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useDeviceContext(tw);

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <GestureHandlerRootView style={tw`flex-1`}>
        <RootStack />
        <ToastHost />
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}

function RootStack() {
  const [fontsLoaded, fontError] = useFonts(fonts);
  const { isLoaded, isSignedIn } = useAuth();
  const [clerkTimedOut, setClerkTimedOut] = useState(false);
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    const timer = setTimeout(() => setClerkTimedOut(true), CLERK_SPLASH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fontsReady && (isLoaded || clerkTimedOut)) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady, isLoaded, clerkTimedOut]);

  // Hold the splash screen so text never flashes in the system font. Not on web:
  // the server renders the full tree, and returning null there breaks hydration.
  if (!fontsReady && Platform.OS !== "web") {
    return null;
  }

  // isSignedIn is undefined until Clerk restores the session, so (app) stays closed
  // while loading and the index route waits before redirecting.
  return (
    <Stack screenOptions={{ contentStyle: tw`bg-canvas` }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {/* Signed-out guests only; signing in moves them on to /home via the index redirect. */}
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!isSignedIn}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="design-system" options={{ title: "Design system" }} />
    </Stack>
  );
}
