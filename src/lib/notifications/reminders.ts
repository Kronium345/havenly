import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { CalendarCheck } from "lucide-react-native";
import { Platform } from "react-native";

import { isUpcoming, type Booking } from "../bookings-shared";
import { toIso } from "../dates";
import { color } from "@/theme";

import { showBanner } from "./banner";

// Local trip reminders (expo-notifications, set up as in oq-agile-athletes): no push
// server and no push token. Reminders are rebuilt from the guest's bookings whenever they
// or the preferences change, so cancelled trips never leave stale reminders. While the
// app is open, a reminder shows as the Dynamic Island banner instead of the system one.
// Text uses only stored values (the stay's title).

export type ReminderPrefs = { tripReminders: boolean; checkoutReminders: boolean };

export const DEFAULT_PREFS: ReminderPrefs = { tripReminders: false, checkoutReminders: false };

const PREFS_KEY = "havenly.notification-prefs";
const CHANNEL_ID = "trip-reminders";
const KIND = "havenly-trip-reminder";

const supported = Platform.OS !== "web";

if (supported) {
  Notifications.setNotificationHandler({
    // In the foreground the banner below takes over; the notification still lands in the list.
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Shows reminders that arrive while the app is open as the Dynamic Island banner. */
export function listenForReminders() {
  if (!supported) return () => {};
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const { title, body } = notification.request.content;
    showBanner({ title: title ?? "Havenly", message: body ?? undefined, icon: CalendarCheck });
  });
  return () => subscription.remove();
}

export async function loadPrefs(): Promise<ReminderPrefs> {
  try {
    const stored = await SecureStore.getItemAsync(PREFS_KEY);
    return stored ? { ...DEFAULT_PREFS, ...(JSON.parse(stored) as Partial<ReminderPrefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function savePrefs(prefs: ReminderPrefs) {
  await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(prefs));
}

export type PermissionState = "granted" | "denied" | "undetermined" | "unsupported";

export async function permissionState(): Promise<PermissionState> {
  if (!supported) return "unsupported";
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** Asks once; returns whether reminders can be shown. */
export async function requestPermission(): Promise<boolean> {
  if (!supported) return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Trip reminders",
      importance: AndroidImportance.DEFAULT,
      lightColor: color("primary"),
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  if (!current.canAskAgain) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/** Local time on an ISO date, e.g. 10:00 the day before check-in. */
function at(isoDate: string, hour: number, dayOffset = 0) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day + dayOffset, hour, 0, 0);
}

/** Cancels Havenly's reminders and schedules them again from these bookings and prefs. */
export async function scheduleTripReminders(bookings: Booking[], prefs: ReminderPrefs) {
  if (!supported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.content.data?.kind === KIND)
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
  if (!prefs.tripReminders && !prefs.checkoutReminders) return;
  if ((await permissionState()) !== "granted") return;

  const now = Date.now();
  const today = toIso(new Date());
  for (const booking of bookings.filter((b) => isUpcoming(b, today))) {
    const reminders = [
      prefs.tripReminders && {
        date: at(booking.checkIn, 10, -1),
        title: "Your trip starts tomorrow",
        body: `${booking.title} is ready for you.`,
      },
      prefs.checkoutReminders && {
        date: at(booking.checkOut, 8),
        title: "Check-out is today",
        body: `Thanks for staying at ${booking.title}.`,
      },
    ].filter((reminder): reminder is { date: Date; title: string; body: string } => Boolean(reminder));

    for (const reminder of reminders) {
      if (reminder.date.getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: reminder.title, body: reminder.body, data: { kind: KIND, bookingId: booking.id } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date, channelId: CHANNEL_ID },
      });
    }
  }
}
