import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { Button } from "@/components/ui/button";
import { PRIVACY_POLICY_URL } from "@/lib/legal-shared";
import { tw } from "@/theme";

import { LegalPage } from "./legal-page";
import { openPrivacyPolicy } from "./open-legal";

// /privacy stays the store listing's privacy URL (prompts/24), but the policy itself is
// hosted elsewhere: the website redirects there and the app opens it in the in-app browser.
export function PrivacyScreen() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") {
      window.location.replace(PRIVACY_POLICY_URL);
      return;
    }
    let current = true;
    void openPrivacyPolicy().then(() => {
      if (!current) return;
      if (router.canGoBack()) router.back();
      else router.navigate("/");
    });
    return () => {
      current = false;
    };
  }, [router]);

  return (
    <LegalPage title="Privacy" intro="Opening Havenly's privacy policy…" sections={[]}>
      <Button title="Open privacy policy" variant="secondary" onPress={openPrivacyPolicy} style={tw`mt-6`} />
    </LegalPage>
  );
}
