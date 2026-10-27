import { Stack } from "expo-router";

import { ReminderSync } from "@/components/reminder-sync";
import { BookingsProvider } from "@/lib/bookings";
import { SavedStaysProvider } from "@/lib/saved-stays";
import { tw } from "@/theme";

export default function AppLayout() {
  return (
    <BookingsProvider>
      <SavedStaysProvider>
        <ReminderSync />
        <Stack screenOptions={{ headerShown: false, contentStyle: tw`bg-surface` }} />
      </SavedStaysProvider>
    </BookingsProvider>
  );
}
