import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { useHosting } from "@/screens/host/use-hosting";
import { tw } from "@/theme";

/** Picks which host company to open, and accepts pending host invitations. */
export function HostingSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { memberships, invitations, enter, accept } = useHosting();

  return (
    <Sheet visible={visible} onClose={onClose} title="Hosting">
      <View style={tw`gap-3`}>
        {memberships.map((membership) => (
          <Pressable
            key={membership.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${membership.organization.name}`}
            onPress={() => {
              onClose();
              void enter(membership.organization.id);
            }}
            style={({ pressed }) => [tw`rounded-xl bg-canvas p-4`, { opacity: pressed ? 0.7 : 1 }]}
          >
            <AppText variant="headline">{membership.organization.name}</AppText>
            <AppText variant="caption">{membership.role === "org:admin" ? "Owner" : "Team member"}</AppText>
          </Pressable>
        ))}
        {invitations.map((invitation) => (
          <View key={invitation.id} style={tw`flex-row items-center gap-3 rounded-xl bg-canvas p-4`}>
            <View style={tw`flex-1 gap-0.5`}>
              <AppText variant="headline">{invitation.publicOrganizationData.name}</AppText>
              <AppText variant="caption">You&apos;ve been invited to host</AppText>
            </View>
            <Button title="Accept" size="md" onPress={() => accept(invitation)} />
          </View>
        ))}
      </View>
    </Sheet>
  );
}
