import { Linking } from "react-native";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { SUPPORT_EMAIL } from "@/screens/profile/help-screen";
import { tw } from "@/theme";

import { LegalPage, type LegalSection } from "./legal-page";

// Public account deletion page: Google Play's "Delete account URL". It must work without
// the app, so it explains the in-app steps and offers an email request. Keep it in step
// with deleteAccount in src/lib/server/account.ts.
const sections: LegalSection[] = [
  {
    title: "Delete it in the app",
    paragraphs: [
      "Open Havenly and go to Profile → Account → Delete account. If you have an upcoming trip, cancel it first under Trips. Your account is deleted straight away.",
    ],
  },
  {
    title: "No longer have the app?",
    paragraphs: [
      `Email ${SUPPORT_EMAIL} from the email address you signed up with and ask us to delete your Havenly account. We'll delete it within 30 days and confirm by email.`,
    ],
  },
  {
    title: "What we delete",
    paragraphs: [
      "Your account, name, email address and profile photo, your bookings, your saved stays, your saved cards and your analytics profile.",
    ],
  },
  {
    title: "What we keep",
    paragraphs: [
      "Records of past payments and refunds are kept by Stripe, our payment provider, for as long as the law requires.",
    ],
  },
];

export function DeleteAccountScreen() {
  const email = async () => {
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Delete my Havenly account")}`);
    } catch {
      toast.info("Email us at", SUPPORT_EMAIL);
    }
  };

  return (
    <LegalPage
      title="Delete your account"
      intro="You can delete your Havenly account and the data that goes with it at any time."
      sections={sections}
    >
      <Button title="Email a deletion request" onPress={email} style={tw`mt-6`} />
    </LegalPage>
  );
}
