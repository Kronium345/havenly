import { useClerk, useUser } from "@clerk/expo";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { APP_TAB_BAR_HEIGHT } from "@/components/app-tab-bar";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { displayFirstName } from "@/lib/display-name";
import { tw } from "@/theme";

// Basic until the profile.png design is built: who is signed in, and Sign out.
export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);
  const firstName = displayFirstName(user);
  const email = user?.primaryEmailAddress?.emailAddress;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      // Ending the session closes the (app) group; the index route sends the guest to onboarding.
      await signOut();
      toast.success("You're signed out.");
    } catch {
      setSigningOut(false);
      toast.error("Couldn't sign out.", "Check your connection and try again.");
    }
  };

  return (
    <View
      style={[
        tw`flex-1 bg-surface px-screen`,
        { paddingTop: insets.top + 8, paddingBottom: APP_TAB_BAR_HEIGHT + insets.bottom + 24 },
      ]}
    >
      <StatusBar style="dark" />
      <AppText variant="hero" accessibilityRole="header" style={tw`mt-7`}>
        Profile
      </AppText>

      <View style={tw`mt-7 flex-row items-center gap-4`}>
        <View style={tw`h-16 w-16 items-center justify-center rounded-full bg-primary-tint`}>
          <AppText variant="heading">{firstName[0]?.toUpperCase()}</AppText>
        </View>
        <View style={tw`flex-1 gap-0.5`}>
          <AppText variant="title" numberOfLines={1}>
            {user?.fullName || firstName}
          </AppText>
          {email ? (
            <AppText variant="body" numberOfLines={1}>
              {email}
            </AppText>
          ) : null}
        </View>
      </View>

      <Button
        title="Sign out"
        variant="secondary"
        loading={signingOut}
        onPress={handleSignOut}
        style={tw`mt-auto`}
      />
    </View>
  );
}
