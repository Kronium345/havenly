import { useEffect } from "react";

import { useBookings } from "@/lib/bookings";
import { listenForReminders, loadPrefs, scheduleTripReminders } from "@/lib/notifications/reminders";

/** Keeps local trip reminders in step with the guest's bookings, and banners them in the foreground. */
export function ReminderSync() {
  const { status, bookings } = useBookings();

  useEffect(() => listenForReminders(), []);

  useEffect(() => {
    if (status !== "ready") return;
    loadPrefs()
      .then((prefs) => scheduleTripReminders(bookings, prefs))
      .catch(() => {
        // Reminders are a convenience; failing to schedule never blocks the app.
      });
  }, [status, bookings]);

  return null;
}
