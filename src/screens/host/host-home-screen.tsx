import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { CalendarCheck, Home, Landmark, Users } from "lucide-react-native";
import { View } from "react-native";

import { StayListMessage } from "@/components/stay-list-states";
import { Button } from "@/components/ui/button";
import { ProfileRow, ProfileRowGroup } from "@/components/ui/profile-row";
import { StatGroup } from "@/components/ui/stat-group";
import { useApiQuery } from "@/lib/api";
import type { HostSummary } from "@/lib/host-shared";
import { tw } from "@/theme";

import { HostLayout } from "./host-layout";
import { useHosting } from "./use-hosting";

// Host mode home (prompts/19): the company at a glance and the way into each section.
export function HostHomeScreen() {
  const router = useRouter();
  const { orgRole } = useAuth();
  const { leave } = useHosting();
  const summary = useApiQuery<HostSummary>("/api/host/summary");

  return (
    <HostLayout
      title={summary.status === "ready" ? summary.data.company : "Hosting"}
      subtitle={summary.status === "ready" ? (summary.data.role === "org:admin" ? "Owner" : "Team member") : undefined}
    >
      {summary.status === "loading" ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={tw`h-24 rounded-xl bg-canvas`} />
      ) : summary.status === "error" ? (
        <StayListMessage title="Couldn't load hosting." message={summary.error.message} actionLabel="Try again" onAction={summary.retry} />
      ) : (
        <StatGroup
          stats={[
            { label: "Stays", value: String(summary.data.stays) },
            { label: "Upcoming", value: String(summary.data.upcomingBookings) },
            { label: "Nights / 30d", value: String(summary.data.nightsNext30) },
          ]}
        />
      )}

      <View style={tw`mt-6 rounded-xl bg-canvas p-1 pt-4`}>
        <ProfileRowGroup title="Manage" style={tw`px-2`}>
          <ProfileRow icon={Home} label="Stays" onPress={() => router.push("/host/stays")} />
          <ProfileRow icon={CalendarCheck} label="Bookings" onPress={() => router.push("/host/bookings")} />
          <ProfileRow icon={Users} label="Team" onPress={() => router.push("/host/team")} />
          {orgRole === "org:admin" ? <ProfileRow icon={Landmark} label="Payouts" onPress={() => router.push("/host/payouts")} /> : null}
        </ProfileRowGroup>
      </View>

      <Button title="Back to travelling" variant="secondary" onPress={leave} style={tw`mt-8`} />
    </HostLayout>
  );
}
