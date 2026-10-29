import { useFocusEffect, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { usePostHog } from "posthog-react-native";
import { useCallback, useRef, useState } from "react";
import { View } from "react-native";

import { StayListMessage } from "@/components/stay-list-states";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { ApiError, useApiFetch, useApiQuery } from "@/lib/api";
import { tw } from "@/theme";

import { HostLayout } from "./host-layout";

type PayoutStatus = "not_set_up" | "pending" | "active";

const RETURN_URL = "havenly://host/payouts";

const copy: Record<PayoutStatus, { title: string; body: string; action: string }> = {
  not_set_up: {
    title: "Not set up",
    body: "Add your details and bank account with Stripe to get paid for your stays. Until then, guests' payments wait with Havenly.",
    action: "Set up payouts",
  },
  pending: {
    title: "Waiting for Stripe",
    body: "Stripe is checking your details, or needs a little more information. Continue setup to see what's missing.",
    action: "Continue setup",
  },
  active: {
    title: "Active",
    body: "When a guest pays, your 85% goes to your Stripe balance. It's paid to your bank the day after they check in.",
    action: "Update details",
  },
};

/** Owners set up and check payouts (prompts/23). Stripe hosts onboarding and the dashboard. */
export function HostPayoutsScreen() {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const posthog = usePostHog();
  const result = useApiQuery<{ status: PayoutStatus }>("/api/host/payouts");
  const [opening, setOpening] = useState<"onboarding" | "dashboard" | null>(null);

  // Returning from Stripe's pages: read the status again.
  const { retry } = result;
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      retry();
    }, [retry]),
  );

  const open = async (type: "onboarding" | "dashboard") => {
    setOpening(type);
    try {
      const { url } = await apiFetch<{ url: string }>("/api/host/payouts/link", { method: "POST", body: JSON.stringify({ type }) });
      if (type === "onboarding") posthog.capture("host_payouts_setup_opened");
      await WebBrowser.openAuthSessionAsync(url, RETURN_URL);
      retry();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't open Stripe. Try again.");
    } finally {
      setOpening(null);
    }
  };

  return (
    <HostLayout title="Payouts" subtitle="Havenly keeps 15% of each booking; you receive 85%.">
      {result.status === "loading" ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={tw`h-40 rounded-xl bg-canvas`} />
      ) : result.status === "error" ? (
        <StayListMessage title="Couldn't load payouts." message={result.error.message} actionLabel="Try again" onAction={result.retry} />
      ) : (
        <View style={tw`gap-6`}>
          <View style={tw`gap-2 rounded-xl bg-canvas p-5`}>
            <AppText variant="caption">Status</AppText>
            <AppText variant="title">{copy[result.data.status].title}</AppText>
            <AppText variant="body">{copy[result.data.status].body}</AppText>
          </View>
          <Button
            title={copy[result.data.status].action}
            variant={result.data.status === "active" ? "secondary" : "primary"}
            loading={opening === "onboarding"}
            onPress={() => open("onboarding")}
          />
          {result.data.status !== "not_set_up" ? (
            <Button title="Open Stripe dashboard" variant="secondary" loading={opening === "dashboard"} onPress={() => open("dashboard")} />
          ) : null}
          <AppText variant="caption">
            Stripe holds your bank details and identity checks; Havenly never sees them. Payouts usually reach your bank 1–2 working days after they&apos;re sent.
          </AppText>
          <AppText variant="caption">
            Hosting on Havenly follows our{" "}
            <AppText variant="caption" accessibilityRole="link" style={tw`font-medium underline`} onPress={() => router.push("/terms")}>
              Terms of Service
            </AppText>
            .
          </AppText>
        </View>
      )}
    </HostLayout>
  );
}
