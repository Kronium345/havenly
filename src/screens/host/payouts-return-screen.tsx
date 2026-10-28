import { useEffect } from "react";
import { Linking, Platform, View } from "react-native";

import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

const APP_URL = "havenly://host/payouts";

/**
 * Where Stripe's hosted onboarding sends the owner back (prompts/23). In the app's in-app
 * browser, opening the app link closes the browser and returns to the payouts screen.
 */
export function PayoutsReturnScreen({ expired }: { expired: boolean }) {
  useEffect(() => {
    if (Platform.OS === "web") window.location.href = APP_URL;
  }, []);

  return (
    <View style={tw`flex-1 items-center justify-center gap-4 bg-surface px-screen`}>
      <AppText variant="title" style={tw`text-center`}>
        {expired ? "That link expired" : "Back to Havenly"}
      </AppText>
      <AppText variant="body" style={tw`text-center`}>
        {expired
          ? "Open Havenly and tap Continue setup in Payouts for a fresh link."
          : "Your payout details were saved with Stripe. Open Havenly to see your status."}
      </AppText>
      <Button title="Open Havenly" onPress={() => Linking.openURL(APP_URL).catch(() => {})} />
    </View>
  );
}
