import { Linking } from "react-native";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { SUPPORT_EMAIL } from "@/screens/profile/help-screen";
import { tw } from "@/theme";

import { LegalPage, type LegalSection } from "./legal-page";

// Public support page (prompts/20): the App Store and Google Play "support URL".
const sections: LegalSection[] = [
  {
    title: "Changing or cancelling a trip",
    paragraphs: [
      "Open Trips, choose the trip and tap Cancel trip. Any refund follows the stay's cancellation policy (Flexible, Moderate or Strict) and goes back to the card you paid with.",
    ],
  },
  {
    title: "Questions about a stay",
    paragraphs: [
      "Open the stay and tap Ask about policies. Answers quote the stay's details and Havenly's policies word for word.",
    ],
  },
  {
    title: "Your account",
    paragraphs: [
      "Change your name, photo or password, sign out other devices, or delete your account in Profile → Account.",
    ],
  },
  {
    title: "Privacy",
    paragraphs: ["How Havenly uses your data is explained on our privacy page at /privacy."],
  },
];

export function SupportScreen() {
  const email = async () => {
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Havenly help")}`);
    } catch {
      toast.info("Email us at", SUPPORT_EMAIL);
    }
  };

  return (
    <LegalPage
      title="Support"
      intro={`Need help with Havenly? Email ${SUPPORT_EMAIL} and the team will reply.`}
      sections={sections}
    >
      <Button title="Email support" onPress={email} style={tw`mt-6`} />
    </LegalPage>
  );
}
