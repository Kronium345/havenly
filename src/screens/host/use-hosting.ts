import { useOrganizationList } from "@clerk/expo";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useCallback } from "react";

import { toast } from "@/components/ui/toast";

/**
 * The guest's host companies and pending host invitations (prompts/19). Guests act with
 * no active organization; entering host mode activates one, leaving clears it.
 */
export function useHosting() {
  const router = useRouter();
  const posthog = usePostHog();
  const { isLoaded, setActive, userMemberships, userInvitations } = useOrganizationList({
    userMemberships: true,
    userInvitations: true,
  });

  const memberships = isLoaded ? (userMemberships.data ?? []) : [];
  const invitations = isLoaded ? (userInvitations.data ?? []).filter((i) => i.status === "pending") : [];

  const enter = useCallback(
    async (organizationId: string) => {
      if (!setActive) return;
      try {
        await setActive({ organization: organizationId });
        posthog.capture("host_mode_entered");
        router.push("/host");
      } catch {
        toast.error("Couldn't open hosting. Try again.");
      }
    },
    [setActive, posthog, router],
  );

  const accept = useCallback(
    async (invitation: (typeof invitations)[number]) => {
      try {
        const accepted = await invitation.accept();
        await Promise.all([userMemberships.revalidate?.(), userInvitations.revalidate?.()]);
        toast.success(`You've joined ${accepted.publicOrganizationData.name}.`);
      } catch {
        toast.error("Couldn't accept the invitation. Try again.");
      }
    },
    [userMemberships, userInvitations],
  );

  const leave = useCallback(async () => {
    await setActive?.({ organization: null }).catch(() => {});
    router.navigate("/profile");
  }, [setActive, router]);

  return { isLoaded, memberships, invitations, enter, accept, leave };
}
