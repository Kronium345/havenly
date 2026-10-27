# 16 · Help & support, saved stays that last, notifications

Status: approved

## Goal
No "coming soon" dead ends are left in the app:
- Profile → Help & support opens a real screen.
- Hearted stays survive restarts.
- Profile → Notifications lets guests turn trip reminders on, which arrive as system notifications or, while the app is open, as the animated "Dynamic Island" banner used in oq-agile-athletes.

## Decisions
- **Help & support** (`/help`, a screen in `src/screens/profile/`):
  - "Email Havenly support" opens a `mailto:` link to **`support@havenly.app`**. That address is a marked **placeholder** until the user gives the real one.
  - "Ask about a stay" explains the Ask chat is on every stay page.
  - Rows link to the cancellation policies sheet and the Havenly policies.
  - No new service.
- **Saved stays persist:**
  - `GET` / `PUT /api/saved-stays` stores stay ids (up to 100) in Clerk `privateMetadata.savedStays`, the same pattern as bookings.
  - `SavedStaysProvider` loads them on sign-in, updates optimistically when a heart is tapped, and rolls back with an error toast if saving fails.
  - The PostHog events stay as they are.
- **Notifications** (user asked for oq's exact setup), adapted to Havenly:
  - `expo-notifications` (new dependency, `npx expo install`, config plugin). Its use follows oq's `hooks/useNotifications.tsx`:
    - a `setNotificationHandler` that hides the system banner while the app is in front, because the in-app banner shows instead;
    - Android channels (`trip-reminders`);
    - permission request on first opt-in;
    - local scheduled notifications.
  - **No push server or push token.** All reminders are local, so no backend or new service.
  - **Reminders:** "Your trip to <stay> starts tomorrow" at 10:00 the day before check-in, and "Check-out is today by <time>" at 08:00 on check-out day.
    - They're scheduled when a booking is confirmed and when the app loads with reminders on (they're rebuilt from `/api/bookings`, so nothing goes stale), and cancelled when a trip is cancelled or reminders are switched off.
    - The text uses only stored values (stay title, times).
  - **Settings screen** (`/notifications`, from Profile → Notifications):
    - toggles for "Trip reminders" and "Check-out reminders", using our `Toggle`;
    - saved per device in `expo-secure-store` (already installed);
    - if permission is denied, a row explains how to allow it in system settings.
  - **Dynamic Island banner:**
    - Port oq's `components/dynamicNotifications/` into `src/components/ui/dynamic-notifications/`, with the provider in the root layout and a `triggerDynamicNotification` bridge for non-component code.
    - It's adapted to the design rules: tokens instead of hex and font sizes, `AppText`, lucide `Icon` instead of iOS-only SF Symbols, and the new primary colour as accent.
    - It needs `expo-blur` (new dependency). Reanimated, Worklets and Gesture Handler are already installed.
    - **Used for:** reminders that arrive while the app is open, and "Trip booked" right after paying (replacing that one toast).
    - Other feedback keeps using `toast` (AGENTS).
  - New dependencies: `expo-notifications` and `expo-blur`. **A new EAS dev build is required.** It can be the same build as plan 15's Stripe one.
- **Hide unfinished rows** (user's choice): after this plan nothing says "coming soon".
  - The `comingSoon` helper in `profile-screen.tsx` is deleted.
  - Any row that turns out not to work in testing is removed rather than left as a dead end.
  - The design-system preview's "Accounts are coming soon" example banner is preview content only and stays.

## Out of scope
- Push notifications from a server, and email notifications (oq's email settings).
- In-app support chat. Support is email only.

## Steps
### 1. Help & support
The screen, the route `src/app/(app)/help.tsx`, and the Profile row.

Done when lint and tsc pass.

### 2. Saved stays API and provider
- `src/lib/server/saved-stays.ts` and `saved-stays+api.ts` (GET, PUT, with an id list check).
- Rewrite `SavedStaysProvider` to load and sync.

Done when a script round-trips ids, and lint and tsc pass.

### 3. Dynamic Island banner
- Port, adapt to tokens, and add the provider plus bridge in the root layout.
- Add a preview in `/design-system`.

Done when lint and tsc pass and the preview triggers it on web (Reanimated) or on the phone.

### 4. Notifications
- `src/lib/notifications/` (handler, channels, permission, `scheduleTripReminders(bookings)`, `cancelTripReminders(id)`).
- The settings screen and route, with booking and cancel hooks.

Done when lint and tsc pass.

### 5. Remove "coming soon"
Delete the helper and check that every Profile row opens something.

## Verification
- tsc and lint pass; `rg -i "coming soon" src --glob '!src/app/design-system.tsx'` finds nothing.
- Script: the saved-stays API round-trips, rejects unknown ids, and keeps at most 100.
- **On the phone, after the new EAS build** (shared with plan 15):
  - Heart a stay, force-close the app, reopen: still hearted.
  - Help & support: the email link opens the mail app with the placeholder address.
  - Notifications: turn on Trip reminders and allow permission. A test booking checking in tomorrow schedules a reminder (checked with `getAllScheduledNotificationsAsync` through Argent's debugger, plus a short test trigger). In the foreground it shows as the Dynamic Island banner; in the background, as a system notification.
  - Turning reminders off cancels them. Denying permission shows the settings hint.
  - Booking a trip shows the banner.

## AGENTS.md updates
- **Who owns what:**
  - Saved stays are in Clerk private metadata through `/api/saved-stays`. This replaces "Hearted stays are in memory only".
  - Notifications are local `expo-notifications`: no push and no token, preferences per device in SecureStore.
- **Design system:** the `DynamicNotifications` banner is for reminders arriving in the foreground and for booking confirmation; everything else uses `toast`.
- **Rules:** the support email is a placeholder until replaced.

## Result (in progress)
Steps 1–5 are built. tsc and lint pass. Status stays `approved` until the phone check on a new EAS dev build.
- **Help & support** (`/help`): an email link to the placeholder `support@havenly.app`, Find a stay, the Ask hint card, and the cancellation policies sheet.
- **Saved stays:** `/api/saved-stays` (GET, PUT) plus `staysByIds`.
  - A script against the dev Clerk account confirmed: order kept, an unknown id dropped, the cards read back, 101 ids rejected, a bad id rejected, duplicates removed. The original value was restored afterwards.
  - The provider updates optimistically and rolls back with a toast if saving fails.
- **Dynamic Island banner:**
  - oq's `dynamicNotifications` is ported to `src/components/ui/dynamic-notifications/`. Its palette uses tokens (a new `shade` token for the shadow), lucide `icon` replaces SF Symbol `symbol`, and the body uses `AppText`.
  - It's hosted by `DynamicNotificationsHost` in the root layout, with a `.web` passthrough, and `showBanner` falls back to a toast.
  - It uses **`@shopify/react-native-skia` 2.14.0**, which the user approved while this was being built (not in the original plan), plus `expo-blur`.
  - `/design-system` has a preview button.
- **Notifications:**
  - `expo-notifications` with the config plugin and colour #2962FF; local reminders only.
  - `ReminderSync` in `(app)/_layout.tsx` reschedules from bookings.
  - The `/notifications` screen has two toggles, asks for permission when one is turned on, and shows a "turned off" row that opens system settings.
  - "Trip booked" now shows the banner.
- **"Coming soon":** the helper is removed; `rg -i "coming soon" src` finds only the design-system sample banner.
- **Important:** the native modules (Stripe, Skia, Blur, Notifications) aren't in the phone's current dev build. The app imports them at startup, so it will most likely fail to load from Metro until a new EAS dev build is installed. That couldn't be confirmed on the phone, because it had disconnected.
