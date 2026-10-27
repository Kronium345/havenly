import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { ApiError, useApiFetch } from "@/lib/api";
import { useBookings } from "@/lib/bookings";
import { isUpcoming } from "@/lib/bookings-shared";
import { dateRange, toIso } from "@/lib/dates";
import { tw } from "@/theme";

const CONFIRM_WORD = "DELETE";

// Deleting removes trips, saved cards, saved stays, analytics and the account itself
// (DELETE /api/account). Upcoming trips must be cancelled first, so refunds stay explicit.
export function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const posthog = usePostHog();
  const apiFetch = useApiFetch();
  const { signOut } = useAuth();
  const { bookings } = useBookings();
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const upcoming = bookings.filter((booking) => isUpcoming(booking, toIso(new Date())));

  const close = () => {
    setTyped("");
    onClose();
  };

  const remove = async () => {
    setDeleting(true);
    try {
      posthog.capture("account_deleted");
      await apiFetch("/api/account", { method: "DELETE" });
      posthog.reset();
      toast.success("Account deleted.", "Thanks for staying with Havenly.");
      // The session no longer exists; this clears it on the device too.
      await signOut().catch(() => {});
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete your account. Try again.");
      setDeleting(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Delete account"
      footer={
        upcoming.length > 0 ? (
          <Button
            title="Go to Trips"
            onPress={() => {
              close();
              router.navigate("/trips");
            }}
          />
        ) : (
          <View style={tw`flex-row gap-3`}>
            <Button title="Keep account" variant="secondary" onPress={close} style={tw`flex-1`} />
            <Button
              title="Delete"
              loading={deleting}
              disabled={typed.trim() !== CONFIRM_WORD}
              onPress={remove}
              style={tw`flex-1`}
            />
          </View>
        )
      }
    >
      {upcoming.length > 0 ? (
        <View style={tw`gap-3`}>
          <AppText variant="body" style={tw`text-ink`}>
            Cancel your upcoming {upcoming.length === 1 ? "trip" : "trips"} first, so any refund goes back to your card.
          </AppText>
          {upcoming.map((booking) => (
            <View key={booking.id} style={tw`rounded-xl bg-canvas p-4`}>
              <AppText variant="headline">{booking.title}</AppText>
              <AppText variant="caption">{dateRange(booking.checkIn, booking.checkOut)}</AppText>
            </View>
          ))}
        </View>
      ) : (
        <View style={tw`gap-4`}>
          <AppText variant="body" style={tw`text-ink`}>
            This permanently deletes your Havenly account: your trips, saved stays, saved cards and profile. It
            can&apos;t be undone.
          </AppText>
          <TextField
            label={`Type ${CONFIRM_WORD} to confirm`}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>
      )}
    </Sheet>
  );
}
