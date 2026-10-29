import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft, FileText, Mail, MessageSquare, ScrollText, Search, Shield } from "lucide-react-native";
import { useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { PolicyCard } from "@/components/ui/policy-card";
import { ProfileRow, ProfileRowGroup } from "@/components/ui/profile-row";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { tw } from "@/theme";

import { openPrivacyPolicy } from "@/screens/legal/open-legal";

import { CancellationPoliciesSheet } from "./cancellation-policies-sheet";

export const SUPPORT_EMAIL = "awolowodaniel@yahoo.ie";

export function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [policiesOpen, setPoliciesOpen] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate("/profile"));

  const emailSupport = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Havenly help")}`;
    try {
      await Linking.openURL(url);
    } catch {
      toast.info("Email us at", SUPPORT_EMAIL);
    }
  };

  return (
    <View style={tw`flex-1 bg-surface`}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[tw`gap-6 px-screen`, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}>
        <View>
          <IconButton icon={ChevronLeft} accessibilityLabel="Back" variant="outline" size="md" onPress={goBack} />
          <AppText variant="hero" accessibilityRole="header" style={tw`mt-7`}>
            Help & support
          </AppText>
          <AppText variant="body" style={tw`mt-2`}>
            Most answers are on the stay itself. For anything else, the Havenly team replies by email.
          </AppText>
        </View>

        <View style={tw`rounded-xl bg-canvas p-1 pt-4`}>
          <ProfileRowGroup title="Get help" style={tw`px-2`}>
            <ProfileRow icon={Mail} label="Email Havenly support" onPress={emailSupport} />
            <ProfileRow icon={Search} label="Find a stay" onPress={() => router.navigate("/search")} />
            <ProfileRow icon={Shield} label="Privacy" onPress={openPrivacyPolicy} />
            <ProfileRow icon={ScrollText} label="Terms of Service" onPress={() => router.push("/terms")} />
          </ProfileRowGroup>
        </View>

        <View style={tw`gap-2 rounded-xl bg-accent-tint p-4`}>
          <View style={tw`flex-row items-center gap-2`}>
            <Icon as={MessageSquare} />
            <AppText variant="headline" style={tw`flex-1`}>
              Questions about a stay?
            </AppText>
          </View>
          <AppText variant="body" style={tw`text-ink`}>
            Open any stay and tap Ask about policies. Answers quote that stay&apos;s details and Havenly&apos;s policies
            word for word.
          </AppText>
        </View>

        <PolicyCard
          icon={FileText}
          title="Cancellation policies"
          description="Flexible, Moderate or Strict, set by each stay."
          onPress={() => setPoliciesOpen(true)}
        />
      </ScrollView>

      <CancellationPoliciesSheet visible={policiesOpen} onClose={() => setPoliciesOpen(false)} />
    </View>
  );
}
