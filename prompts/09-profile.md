# 09 · Profile screen from the design, with a Clerk profile photo

Status: done

## Goal
The Profile tab matches `profile.png` (in `Downloads\prompt-imgs\prompt-imgs\`; ask for it to be attached again in a new session), using only real data:
- The guest's photo, name and email, and stats for Trips, Saved and Nights.
- Account and Preferences rows.
- A cancellation policies card.
- A gear that opens Settings, with Sign out.

Guests can set, change or remove their profile photo, and edit their first and last name, on a Personal info screen. Both are saved to Clerk. The photo also replaces the initial in Home's avatar.

## Decisions
- **Clerk setup (checked):** no Clerk CLI or instance change is needed. `clerk config schema` has no profile-image setting, and uploads are allowed by default. The photo is uploaded with `user.setProfileImage({ file })` from `@clerk/expo` (`SetProfileImageParams.file: Blob | File | string | null`; `null` removes it), then `user.reload()`. Google and Apple accounts already have `user.imageUrl`. `user.hasImage` tells a real photo from Clerk's default. The Clerk CLI is used only to verify: `clerk users` shows the user's `image_url` after an upload.
- **Picker (user choice):** library only, square crop. New dependency `expo-image-picker` via `npx expo install` (in Expo Go; no permission request needed for the library).
  - The call is `launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true })`. Cancel (`canceled: true`) does nothing.
  - The upload sends `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`.
  - On web, the picker opens from the press (a user gesture), and the same data URL works.
  - Add `["expo-image-picker", { "photosPermission": "Allow Havenly to use your photos for your profile picture." }]` to `app.json` plugins, for the later development build.
- **Header data (user choice): real data only.** There's no location line, no "Roam Explorer" badge and no Rating. The stats are:
  - **Trips:** bookings that aren't cancelled.
  - **Saved:** `useSavedStays().saved.length` (in memory, as today).
  - **Nights:** the sum of `nights` over trips that aren't cancelled.
  - While bookings load, Trips and Nights show "–". If loading fails, they show "–" and the screen still works.
- **Rows (user choice):**
  - **Account:** Personal info (`User` icon) opens `/personal-info`. Payment methods (`CreditCard`) shows `toast.info("Payment methods are coming soon.")`. Trips (`Luggage`) uses `router.navigate("/trips")`.
  - **Preferences:** Notifications (`Bell`) and Help & support (`CircleHelp`) show the same kind of "coming soon" info toast.
- **Gear and card (user choice):**
  - **Gear:** the `Settings` icon in an `IconButton` (canvas, md) opens a `Sheet` titled "Settings". It holds the guest's email (caption) and a secondary "Sign out" button with today's sign-out behaviour, moved unchanged.
  - **Card:** the design's "Free cancellation · Full refund up to 7 days" card becomes `PolicyCard` (`FileText`) titled "Cancellation policies", with the line "Flexible, Moderate or Strict, set by each stay." Tapping it opens a `Sheet` listing the three cancellation policies, each with its title and `body` word for word, in the order Flexible, Moderate, Strict.
  - **Policies API:** the sheet's data comes from a new `GET /api/policies?topic=cancellation` (`requireSession`, `sanityQuery` with `$topic`, returns `{ _id, title, summary, body }[]` ordered by refund days). It is read with `useApiQuery`, and has loading, error (with a retry) and empty states.
- **Avatar:** new shared `Avatar` in `src/components/ui/avatar.tsx`:
  - **Props:** `{ imageUrl?: string; name: string; size: "md" | "lg" | "xl" }`. It renders an `expo-image` circle when there's a photo, and otherwise today's initial on `bg-primary-tint`.
  - **Sizes:** md 44, lg 84 (Home's `h-21`), xl 104 (Profile). Profile is estimated from the design.
  - **Image URL:** only when `user.hasImage`. Clerk's URL takes `?width=` (no new token needed).
  - **Where it goes:** Home's avatar uses it (lg), and it joins `/design-system` as section 18.
- **Personal info screen:** route `src/app/(app)/personal-info.tsx` → `src/screens/profile/personal-info-screen.tsx`, pushed over the tabs.
  - **Layout:** Back `IconButton` and `hero` "Personal info". Then the xl `Avatar` with a "Change photo" text button (and "Remove photo" when `hasImage`), a spinner overlay on the avatar while uploading, then `TextField`s First name and Last name (labelled) and a read-only email line (`caption`: "Email can't be changed here yet.").
  - **Saving:** a primary "Save" button calls `user.update({ firstName, lastName })`. Validation: first name is required, at most 50 characters each, reported with `reportInvalid` (red border plus one toast). It is disabled until something changes.
  - **Feedback:** success toasts "Photo updated." / "Photo removed." / "Details saved.". Clerk errors go through `reportClerkError`.
  - **Data:** names come from `useUser()`, never route params.
- **Layout, from the design (values estimated from the image at about 0.5×):**
  1. **Top:** `Wordmark` (height 44, as on Home) left, gear right.
  2. **Profile card:** `bg-canvas rounded-xl p-4`, a row with the xl `Avatar` and a column of name (`title-lg`, two lines at most) and email (`body`, muted, one line). The card is a pressable that opens Personal info.
  3. **Stats card:** `border border-border rounded-xl py-4`, three equal columns divided by hairline `border` lines. Number in `title` bold, label in `body` muted, centered.
  4. **Account group, Preferences group:** existing `ProfileRowGroup` and `ProfileRow`, each group on `bg-canvas rounded-xl p-1` as in the design (group title inside the panel).
  5. **Cancellation policies card:** `PolicyCard`.
  - Vertical rhythm is `gap-4` between blocks. Everything scrolls; the bottom padding clears `APP_TAB_BAR_HEIGHT`. Status bar is dark.
- **Tokens:** no new tokens. Every color, radius and type style above exists (`canvas`, `border`, `primary-tint`, `lavender-tint`, `muted`, `title-lg`, `title`, `body`, `caption`).

## Out of scope
- Location, badges and guest ratings (no data).
- Payment methods, notification settings, help and support screens.
- Changing email or password, deleting the account, the camera.
- Storing saved stays (still in memory), and analytics.

## Steps
### 1. Dependency and Avatar
Run `npx expo install expo-image-picker` and add the plugin entry to `app.json`. Build `Avatar`, add it to `/design-system` section 18 (initial and photo, all sizes), and switch Home's avatar to it.
Done when: tsc and lint pass, and `/design-system` on web shows the avatars.

### 2. Policies API
Add `src/app/api/policies+api.ts` (GET, `requireSession`, `topic` must be one of the `policyTopics` values, otherwise 400). Add the query to `src/lib/server/` beside the stay queries.
Done when: no session → 401, and a direct call to the query returns the three cancellation policies in order.

### 3. Profile screen
Rebuild `src/screens/profile/profile-screen.tsx` from the layout above, with `settings-sheet.tsx` and `cancellation-policies-sheet.tsx` in `src/screens/profile/`. Move Sign out into the settings sheet unchanged.
Done when: tsc and lint pass, and the screen compares cleanly with the design (see Verification).

### 4. Personal info and the photo
Add the route and `personal-info-screen.tsx` with the picker, upload, remove, and name editing as described.
Done when: tsc and lint pass, and the screen renders on web.

## Verification
- `npx tsc --noEmit`, `npx expo lint`, and the drift grep (no hex, `rgba(`, `fontSize`, `fontWeight` in `src/`) pass.
- `GET /api/policies?topic=cancellation` without a session → 401. A bad topic with a session is 400 (checked by calling the handler's validation directly). The query returns Flexible, Moderate, Strict.
- **Design check on web:** I can't sign in on web myself, so `/design-system` section 18 renders the Profile header pieces (profile card, stats card) with sample data. Open it at 393 px wide in Chrome, screenshot it, compare it with `profile.png`, list each difference, fix, and repeat. Report the estimated values.
- **On your phone (Expo Go):**
  - Profile shows your name, email and Trips/Saved/Nights.
  - The rows and toasts work, and the gear → Sign out works.
  - The policies sheet shows the three policies.
  - Personal info → Change photo → pick and crop → the photo shows on Profile and Home.
  - `clerk users` shows your user's `image_url` changed.
  - Remove photo → the initial comes back.
  - Editing your name → Home's greeting updates.
- **End to end:** sign out from the gear and sign back in. The photo and name are still there, because they come from Clerk.

## AGENTS.md updates
- **Expo → Route groups:** add `personal-info` to the routes pushed over the tabs.
- **Who owns what → Auth:** the profile photo and names are Clerk's: `user.setProfileImage({ file: dataUrl | null })` + `user.reload()`, `user.update({ firstName, lastName })`. Show photos with `Avatar` only when `user.hasImage`. No Clerk instance setting is involved. Sign out lives in Profile's Settings sheet (replaces "Sign out lives on `/profile`").
- **Content:** add `GET /api/policies?topic=` to the list of API reads.
- **Design system:** `Avatar` (md/lg/xl) for people; photos come from `expo-image-picker` (library, square crop).

## Result
- **Built as planned:**
  - Profile from `profile.png` with real data: photo, name and email card; Trips, Saved and Nights stats; Account and Preferences rows; a cancellation policies card.
  - The gear opens a Settings sheet with Sign out.
  - The Personal info screen handles adding, changing and removing the photo through `user.setProfileImage`, and editing first and last name through `user.update`.
  - Home's avatar shows the photo.
- **No Clerk setting changed:** the config schema has no profile-image setting, and uploads are on by default.
- **New pieces:** `Avatar` and `StatGroup` in `src/components/ui/` (design-system section 18), `ProfileCard`, the two sheets, `GET /api/policies?topic=` with `src/lib/server/policy-queries.ts`, and the `expo-image-picker` dependency with its `app.json` plugin. `ClerkFailure` is now exported from `clerk-errors.ts`.
- **Changes from the plan:** the Avatar uses Clerk's `imageUrl` as-is (no `?width=` parameter).
- **Verified:**
  - tsc, lint and the drift grep pass.
  - `/api/policies` returns 401 without a session.
  - Topic validation passes for `cancellation` and fails for `castle` and a missing topic.
  - The query returns Flexible (24 hours), Moderate (7 days) and Strict (14 days) in that order.
  - Design-system section 18 rendered on web (server output) with the card, stats and avatars laid out as designed.
- **Not verified:**
  - The web client never finished loading on this machine (6.5 minutes per page with little free memory), so the photo, the phone-width comparison and the full Profile screen weren't seen on web.
  - Upload, removal and name editing weren't checked; they need a signed-in phone.
- **Estimated from the image:** avatar 104 px; card padding 12; gaps of 16; the stats divider height.
