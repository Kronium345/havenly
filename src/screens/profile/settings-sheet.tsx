import { useClerk } from "@clerk/expo";
import { useState } from "react";
import { View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { tw } from "@/theme";

export function SettingsSheet({ visible, email, onClose }: { visible: boolean; email?: string; onClose: () => void }) {
  const { signOut } = useClerk();
  const posthog = usePostHog();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      // Ending the session closes the (app) group; the index route sends the guest to onboarding.
      posthog.capture("user_signed_out");
      await signOut();
      toast.success("You're signed out.");
    } catch {
      setSigningOut(false);
      toast.error("Couldn't sign out.", "Check your connection and try again.");
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Settings"
      footer={<Button title="Sign out" variant="secondary" loading={signingOut} onPress={handleSignOut} />}
    >
      {email ? (
        <View style={tw`gap-1`}>
          <AppText variant="caption">Signed in as</AppText>
          <AppText variant="callout" numberOfLines={1}>
            {email}
          </AppText>
        </View>
      ) : null}
    </Sheet>
  );
}
