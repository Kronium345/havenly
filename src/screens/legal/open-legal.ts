import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { toast } from "@/components/ui/toast";
import { PRIVACY_POLICY_URL } from "@/lib/legal-shared";

/** The hosted privacy policy (prompts/24): the in-app browser on native, a new tab on web. */
export async function openPrivacyPolicy() {
  if (Platform.OS === "web") {
    window.open(PRIVACY_POLICY_URL, "_blank", "noopener");
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
  } catch {
    toast.error("Couldn't open the privacy policy.", "Check your connection and try again.");
  }
}
