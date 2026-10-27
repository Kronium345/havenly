import { useOrganization, useUser } from "@clerk/expo";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { StayListMessage } from "@/components/stay-list-states";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { reportClerkError, type ClerkFailure } from "@/screens/auth/clerk-errors";
import { reportInvalid } from "@/screens/auth/report-invalid";
import { validateEmail } from "@/screens/auth/validate";
import { tw } from "@/theme";

import { HostLayout } from "./host-layout";

type Role = "org:admin" | "org:member";

const roles: { value: Role; label: string }[] = [
  { value: "org:member", label: "Team member" },
  { value: "org:admin", label: "Owner" },
];
const roleLabel = (role: string) => (role === "org:admin" ? "Owner" : "Team member");

// Members of the host company. Owners invite, revoke invitations and remove members;
// Clerk enforces the role, the screen only hides what a member can't do.
export function HostTeamScreen() {
  const { user } = useUser();
  const posthog = usePostHog();
  const { isLoaded, organization, membership, memberships, invitations } = useOrganization({
    memberships: true,
    invitations: true,
  });
  const isOwner = membership?.role === "org:admin";
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("org:member");
  const [emailError, setEmailError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<NonNullable<NonNullable<typeof memberships>["data"]>[number] | null>(null);

  const invite = async () => {
    const error = validateEmail(email);
    setEmailError(error);
    if (reportInvalid({ email: error }) || !organization) return;
    setBusy(true);
    try {
      await organization.inviteMember({ emailAddress: email.trim(), role });
      posthog.capture("host_member_invited", { role });
      toast.success("Invitation sent.");
      setInviting(false);
      setEmail("");
      await invitations?.revalidate?.();
    } catch (failure) {
      reportClerkError(failure as ClerkFailure);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await removing.destroy();
      posthog.capture("host_member_removed", { role: removing.role });
      toast.success("Removed from the team.");
      setRemoving(null);
      await memberships?.revalidate?.();
    } catch (failure) {
      reportClerkError(failure as ClerkFailure);
    } finally {
      setBusy(false);
    }
  };

  const members = memberships?.data ?? [];
  const pending = (invitations?.data ?? []).filter((i) => i.status === "pending");

  return (
    <HostLayout title="Team" subtitle={organization?.name}>
      {!isLoaded || memberships?.isLoading ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading team" style={tw`h-32 rounded-xl bg-canvas`} />
      ) : !organization ? (
        <StayListMessage title="Switch to your hosting account." message="Open hosting from Profile first." />
      ) : (
        <View style={tw`gap-8`}>
          <View style={tw`gap-3`}>
            {members.map((member) => {
              const data = member.publicUserData;
              const name = [data?.firstName, data?.lastName].filter(Boolean).join(" ") || data?.identifier || "Member";
              const isMe = data?.userId === user?.id;
              return (
                <View key={member.id} style={tw`flex-row items-center gap-3 rounded-xl bg-canvas p-4`}>
                  <View style={tw`flex-1 gap-0.5`}>
                    <AppText variant="callout" style={tw`font-medium`}>
                      {name}
                      {isMe ? " (you)" : ""}
                    </AppText>
                    <AppText variant="caption">{roleLabel(member.role)}</AppText>
                  </View>
                  {isOwner && !isMe ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${name}`} hitSlop={8} onPress={() => setRemoving(member)}>
                      <AppText variant="callout" style={tw`font-semibold text-danger`}>
                        Remove
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>

          {isOwner ? (
            <View style={tw`gap-3`}>
              <AppText variant="title" accessibilityRole="header">
                Invitations
              </AppText>
              {pending.length === 0 ? <AppText variant="body">No pending invitations.</AppText> : null}
              {pending.map((invitation) => (
                <View key={invitation.id} style={tw`flex-row items-center gap-3 rounded-xl bg-canvas p-4`}>
                  <View style={tw`flex-1 gap-0.5`}>
                    <AppText variant="callout" style={tw`font-medium`} numberOfLines={1}>
                      {invitation.emailAddress}
                    </AppText>
                    <AppText variant="caption">{roleLabel(invitation.role)} · pending</AppText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Revoke invitation for ${invitation.emailAddress}`}
                    hitSlop={8}
                    onPress={() =>
                      invitation
                        .revoke()
                        .then(() => invitations?.revalidate?.())
                        .catch((failure: unknown) => reportClerkError(failure as ClerkFailure))
                    }
                  >
                    <AppText variant="callout" style={tw`font-semibold text-danger`}>
                      Revoke
                    </AppText>
                  </Pressable>
                </View>
              ))}
              <Button title="Invite by email" variant="secondary" onPress={() => setInviting(true)} />
            </View>
          ) : (
            <AppText variant="caption">Only the owner can invite or remove team members.</AppText>
          )}
        </View>
      )}

      <Sheet
        visible={inviting}
        onClose={() => setInviting(false)}
        title="Invite to your team"
        footer={<Button title="Send invitation" loading={busy} onPress={invite} />}
      >
        <View style={tw`gap-4`}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <SegmentedControl options={roles} value={role} onChange={setRole} />
        </View>
      </Sheet>

      <Sheet
        visible={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove from the team?"
        footer={
          <View style={tw`flex-row gap-3`}>
            <Button title="Cancel" variant="secondary" onPress={() => setRemoving(null)} style={tw`flex-1`} />
            <Button title="Remove" loading={busy} onPress={remove} style={tw`flex-1`} />
          </View>
        }
      >
        <AppText variant="body" style={tw`text-ink`}>
          They&apos;ll lose access to this hosting account straight away.
        </AppText>
      </Sheet>
    </HostLayout>
  );
}
