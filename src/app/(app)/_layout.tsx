import { Stack } from "expo-router";

import { BookingsProvider } from "@/lib/bookings";
import { SavedStaysProvider } from "@/lib/saved-stays";
import { tw } from "@/theme";

export default function AppLayout() {
  return (
    <BookingsProvider>
      <SavedStaysProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: tw`bg-surface` }} />
      </SavedStaysProvider>
    </BookingsProvider>
  );
}
