import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/icon-button";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { useBookings } from "@/lib/bookings";
import {
  DEFAULT_PREFS,
  loadPrefs,
  permissionState,
  requestPermission,
  savePrefs,
  scheduleTripReminders,
  type PermissionState,
  type ReminderPrefs,
} from "@/lib/notifications/reminders";
import { tw } from "@/theme";

const ROWS: { key: keyof ReminderPrefs; title: string; detail: string }[] = [
  { key: "tripReminders", title: "Trip reminders", detail: "The day before check-in, at 10:00." },
  { key: "checkoutReminders", title: "Check-out reminders", detail: "On check-out day, at 08:00." },
];

// Reminders are local to this device (no account setting, no push server).
export function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookings } = useBookings();
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  const [permission, setPermission] = useState<PermissionState>("undetermined");

  useEffect(() => {
    let current = true;
    Promise.all([loadPrefs(), permissionState()]).then(([loaded, state]) => {
      if (!current) return;
      setPrefs(loaded);
      setPermission(state);
    });
    return () => {
      current = false;
    };
  }, []);

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate("/profile"));

  const change = async (key: keyof ReminderPrefs, on: boolean) => {
    const before = prefs ?? DEFAULT_PREFS;
    if (on && !(await requestPermission())) {
      setPermission(await permissionState());
      toast.error("Notifications are off for Havenly.", "Allow them in your phone's settings.");
      return;
    }
    const next = { ...before, [key]: on };
    setPrefs(next);
    setPermission(await permissionState());
    try {
      await savePrefs(next);
      await scheduleTripReminders(bookings, next);
    } catch {
      setPrefs(before);
      toast.error("Couldn't save that setting.", "Try again.");
    }
  };

  return (
    <View style={tw`flex-1 bg-surface`}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[tw`px-screen`, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" variant="outline" size="md" onPress={goBack} />
        <AppText variant="hero" accessibilityRole="header" style={tw`mt-7`}>
          Notifications
        </AppText>
        <AppText variant="body" style={tw`mt-2`}>
          Reminders for your upcoming trips, on this phone.
        </AppText>

        {permission === "unsupported" ? (
          <AppText variant="callout" style={tw`mt-6 text-ink`}>
            Reminders work in the Havenly app.
          </AppText>
        ) : (
          <View style={tw`mt-6 gap-3`}>
            {ROWS.map((row) => (
              <View key={row.key} style={tw`flex-row items-center gap-4 rounded-xl bg-canvas p-4`}>
                <View style={tw`flex-1 gap-0.5`}>
                  <AppText variant="headline">{row.title}</AppText>
                  <AppText variant="caption">{row.detail}</AppText>
                </View>
                <Toggle
                  accessibilityLabel={row.title}
                  disabled={prefs === null}
                  value={prefs?.[row.key] ?? false}
                  onValueChange={(on) => change(row.key, on)}
                />
              </View>
            ))}

            {permission === "denied" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => Linking.openSettings()}
                style={({ pressed }) => [tw`gap-1 rounded-xl bg-danger-tint p-4`, { opacity: pressed ? 0.7 : 1 }]}
              >
                <AppText variant="headline">Notifications are turned off</AppText>
                <AppText variant="caption">Tap to open settings and allow notifications for Havenly.</AppText>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
