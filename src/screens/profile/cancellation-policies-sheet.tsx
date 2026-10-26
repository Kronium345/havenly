import { View } from "react-native";

import { StayListMessage } from "@/components/stay-list-states";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { useApiQuery } from "@/lib/api";
import type { PolicyText } from "@/lib/search/types";
import { tw } from "@/theme";

/** Havenly's cancellation policies, word for word. Each stay uses one of them. */
export function CancellationPoliciesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const policies = useApiQuery<PolicyText[]>(visible ? "/api/policies?topic=cancellation" : null);

  return (
    <Sheet visible={visible} onClose={onClose} title="Cancellation policies">
      <View style={tw`gap-3`}>
        <AppText variant="body">Each stay uses one of these. You&apos;ll see which on the stay before you book.</AppText>
        {policies.status === "loading" ? (
          <View accessibilityRole="progressbar" accessibilityLabel="Loading policies" style={tw`gap-3`}>
            <View style={tw`h-28 rounded-xl bg-canvas`} />
            <View style={tw`h-28 rounded-xl bg-canvas`} />
          </View>
        ) : policies.status === "error" ? (
          <StayListMessage
            title="Couldn't load the policies."
            message={policies.error.message}
            actionLabel="Try again"
            onAction={policies.retry}
          />
        ) : policies.status === "ready" && policies.data.length > 0 ? (
          policies.data.map((policy) => (
            <View key={policy._id} style={tw`gap-1 rounded-xl bg-canvas p-4`}>
              <AppText variant="headline">{policy.title}</AppText>
              <AppText variant="body" style={tw`text-ink`}>
                {policy.body}
              </AppText>
            </View>
          ))
        ) : (
          <StayListMessage title="No policies found." />
        )}
      </View>
    </Sheet>
  );
}
