import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft, CreditCard, Trash2 } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StayListMessage } from "@/components/stay-list-states";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { ApiError, useApiFetch, useApiQuery } from "@/lib/api";
import type { CardSetup, SavedCard } from "@/lib/payments/cards";
import { runPaymentSheet } from "@/lib/payments/payment-sheet";
import { isStripeReady } from "@/lib/payments/stripe-config";
import { tw } from "@/theme";

const BRANDS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

const brandName = (brand: string) => BRANDS[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
const expiry = (card: SavedCard) => `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`;

// Saved cards live with Stripe; this lists them, adds one through PaymentSheet (setup
// mode) and removes one. Card details never pass through the app.
export function PaymentMethodsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const apiFetch = useApiFetch();
  const cards = useApiQuery<SavedCard[]>("/api/payment-methods");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<SavedCard | null>(null);
  const [busy, setBusy] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate("/profile"));

  const addCard = async () => {
    if (!isStripeReady()) {
      toast.info("Cards can be added in the Havenly app.", "Card payments aren't available here yet.");
      return;
    }
    setAdding(true);
    try {
      const setup = await apiFetch<CardSetup>("/api/payment-methods/setup", { method: "POST" });
      const outcome = await runPaymentSheet(setup);
      if (outcome.status === "done") {
        posthog.capture("payment_method_added");
        toast.success("Card saved.");
        cards.retry();
      } else if (outcome.status === "failed") {
        toast.error("Couldn't save that card.", outcome.message);
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't add a card. Try again.");
    } finally {
      setAdding(false);
    }
  };

  const removeCard = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await apiFetch(`/api/payment-methods/${encodeURIComponent(removing.id)}`, { method: "DELETE" });
      posthog.capture("payment_method_removed");
      toast.success("Card removed.");
      setRemoving(null);
      cards.retry();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't remove that card. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={tw`flex-1 bg-surface`}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[tw`px-screen`, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" variant="outline" size="md" onPress={goBack} />
        <AppText variant="hero" accessibilityRole="header" style={tw`mt-7`}>
          Payment methods
        </AppText>
        <AppText variant="body" style={tw`mt-2`}>
          Cards you save are offered when you book. Stripe keeps the card details; Havenly never sees them.
        </AppText>

        <View style={tw`mt-6 gap-3`}>
          {cards.status === "loading" ? (
            <View accessibilityRole="progressbar" accessibilityLabel="Loading cards" style={tw`gap-3`}>
              <View style={tw`h-20 rounded-xl bg-canvas`} />
              <View style={tw`h-20 rounded-xl bg-canvas`} />
            </View>
          ) : cards.status === "error" ? (
            <StayListMessage title="Couldn't load your cards." message={cards.error.message} actionLabel="Try again" onAction={cards.retry} />
          ) : cards.data.length === 0 ? (
            <StayListMessage title="No saved cards" message="Add one now, or save it when you pay for a trip." />
          ) : (
            cards.data.map((card) => (
              <View key={card.id} style={tw`flex-row items-center gap-4 rounded-xl bg-canvas p-4`}>
                <View style={tw`h-12 w-12 items-center justify-center rounded-md bg-surface`}>
                  <Icon as={CreditCard} />
                </View>
                <View style={tw`flex-1 gap-0.5`}>
                  <AppText variant="headline">
                    {brandName(card.brand)} •••• {card.last4}
                  </AppText>
                  <AppText variant="caption">Expires {expiry(card)}</AppText>
                </View>
                <IconButton
                  icon={Trash2}
                  accessibilityLabel={`Remove ${brandName(card.brand)} ending ${card.last4}`}
                  variant="surface"
                  size="md"
                  onPress={() => setRemoving(card)}
                />
              </View>
            ))
          )}
        </View>

        <Button title="Add a card" variant="secondary" loading={adding} onPress={addCard} style={tw`mt-6`} />
      </ScrollView>

      <Sheet
        visible={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove this card?"
        footer={
          <View style={tw`flex-row gap-3`}>
            <Button title="Keep card" variant="secondary" onPress={() => setRemoving(null)} style={tw`flex-1`} />
            <Button title="Remove" loading={busy} onPress={removeCard} style={tw`flex-1`} />
          </View>
        }
      >
        {removing ? (
          <AppText variant="body" style={tw`text-ink`}>
            {brandName(removing.brand)} ending {removing.last4} won&apos;t be offered at checkout any more.
          </AppText>
        ) : null}
      </Sheet>
    </View>
  );
}
