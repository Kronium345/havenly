import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Bell, CircleHelp, CreditCard, FileText, Luggage, Settings, User } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { APP_TAB_BAR_HEIGHT } from "@/components/app-tab-bar";
import { IconButton } from "@/components/ui/icon-button";
import { PolicyCard } from "@/components/ui/policy-card";
import { ProfileRow, ProfileRowGroup } from "@/components/ui/profile-row";
import { StatGroup } from "@/components/ui/stat-group";
import { toast } from "@/components/ui/toast";
import { Wordmark } from "@/components/ui/wordmark";
import { useBookings } from "@/lib/bookings";
import { displayFirstName, profileImageUrl } from "@/lib/display-name";
import { useSavedStays } from "@/lib/saved-stays";
import { tw } from "@/theme";

import { CancellationPoliciesSheet } from "./cancellation-policies-sheet";
import { ProfileCard } from "./profile-card";
import { SettingsSheet } from "./settings-sheet";

type OpenSheet = "settings" | "policies" | null;

const comingSoon = (what: string) => () => toast.info(`${what} are coming soon.`);

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { status, bookings } = useBookings();
  const { saved } = useSavedStays();
  const [sheet, setSheet] = useState<OpenSheet>(null);

  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.fullName?.trim() || displayFirstName(user);
  const trips = bookings.filter((booking) => booking.status === "confirmed");
  const nights = trips.reduce((sum, booking) => sum + booking.nights, 0);
  const bookingStat = (value: number) => (status === "ready" ? String(value) : "–");
  const closeSheet = () => setSheet(null);

  return (
    <View style={tw`flex-1 bg-surface`}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          tw`gap-4 px-screen`,
          { paddingTop: insets.top + 8, paddingBottom: APP_TAB_BAR_HEIGHT + insets.bottom + 32 },
        ]}
      >
        <View style={tw`flex-row items-center justify-between`}>
          <Wordmark height={44} />
          <IconButton icon={Settings} accessibilityLabel="Settings" onPress={() => setSheet("settings")} />
        </View>

        <ProfileCard
          name={name}
          email={email}
          imageUrl={profileImageUrl(user)}
          onPress={() => router.push("/personal-info")}
        />

        <StatGroup
          stats={[
            { label: "Trips", value: bookingStat(trips.length) },
            { label: "Saved", value: String(saved.length) },
            { label: "Nights", value: bookingStat(nights) },
          ]}
        />

        <View style={tw`rounded-xl bg-canvas p-1 pt-4`}>
          <ProfileRowGroup title="Account" style={tw`px-2`}>
            <ProfileRow icon={User} label="Personal info" onPress={() => router.push("/personal-info")} />
            <ProfileRow icon={CreditCard} label="Payment methods" onPress={comingSoon("Payment methods")} />
            <ProfileRow icon={Luggage} label="Trips" onPress={() => router.navigate("/trips")} />
          </ProfileRowGroup>
        </View>

        <View style={tw`rounded-xl bg-canvas p-1 pt-4`}>
          <ProfileRowGroup title="Preferences" style={tw`px-2`}>
            <ProfileRow icon={Bell} label="Notifications" onPress={comingSoon("Notification settings")} />
            <ProfileRow icon={CircleHelp} label="Help & support" onPress={comingSoon("Help and support pages")} />
          </ProfileRowGroup>
        </View>

        <PolicyCard
          icon={FileText}
          title="Cancellation policies"
          description="Flexible, Moderate or Strict, set by each stay."
          onPress={() => setSheet("policies")}
        />
      </ScrollView>

      <SettingsSheet visible={sheet === "settings"} email={email} onClose={closeSheet} />
      <CancellationPoliciesSheet visible={sheet === "policies"} onClose={closeSheet} />
    </View>
  );
}
