# 03 · Toasts, email-code verification and home

Status: done

## Goal
Validation problems on the auth forms show as a modern toast, and the failing fields keep their red border. A valid sign-up goes to a "Check your email" screen where the guest enters a 6-digit code (mocked), then lands on a home screen built from `home.png`. A valid sign-in goes straight to home. Everything is mocked until the Clerk plan, which does the real sending and checking of codes and the sessions.

## Decisions
- **Toast (user choice):**
  - Use `react-native-toast-message` (latest 2.5.2, pure JS, works in Expo Go), installed with `npx expo install`.
  - Call style follows the reference project (`oq-agile-athletes/components/AppToast.tsx`): one host in the root layout, 3.5s visibility.
  - Toasts appear at the **top** (`insets.top + 8`). The reference uses the bottom, but on these screens the keyboard would cover it.
  - The `success`, `error` and `info` types are redrawn in our own design (see Toast design).
  - Screens call a small wrapper, `toast.error(title, message?)` and so on, from `@/components/ui/toast`, never the library directly, so the library can be swapped later.
- **Validation display (user choice):**
  - Inline error text goes away. Failed fields keep the red border, and the first one gets focus.
  - One failure: the toast shows that field's message ("Enter your email address.").
  - Several: "3 fields need attention" with "Check the highlighted fields." underneath.
  - `TextField`'s `error` prop now draws only the border, and passes the message to screen readers as `accessibilityHint`.
- **Code entry (user choice, with your clarification):**
  - Sign-up only. A valid sign-up opens `/verify-email`. Sign-in goes straight home, matching Clerk's default email-code check for new accounts.
  - We build the screen as a mocked UI: any complete 6-digit code passes. Clerk does the sending and checking later (`prepareEmailAddressVerification`/`attemptEmailAddressVerification` in the Clerk plan).
- **Mock session:**
  - `src/lib/mock-session.tsx` keeps `{ firstName, email }` in memory through a React context, with `signIn()` and `signOut()`. Nothing is saved, so a reload signs you out.
  - Sign-up uses the first word of Full name. Sign-in uses the part of the email before `@`, capitalized ("joanna@…" gives "Joanna").
  - The Clerk plan replaces this file with `useAuth`/`useUser`.
- **Routes:**
  - New `(app)` group containing `home.tsx` (`/home`).
  - The root layout uses `Stack.Protected` (in expo-router 58, `guard` prop). `(app)` is only reachable when signed in; `(auth)` routes (onboarding, sign-up, sign-in, verify-email) only when signed out.
  - `/` redirects to `/home` or `/onboarding` depending on the session.
  - Success uses `router.replace`, so Back can't return to the forms.
  - `/design-system` stays open to everyone.
- **Home (user choice: build from `home.png`):**
  - All content is mock data. No Sanity, no search and no tab routes yet.
  - Actions with no destination (the search button, the AI bar submit, avatar, the other tabs, stay cards) show an `info` toast, e.g. "Search is coming next.".
  - The AI bar is a real text box, but what's typed goes nowhere: it isn't sent, logged or kept.
  - Category chips filter the mock stays on the device.
- **Avatar:** the mock user has no photo, so the avatar shows the first initial on `primary-tint`. The design's photo is of a real person, so it isn't used.
- **Photos** (Unsplash, each checked to return 200; a separate stays list from onboarding):

  | Stay | Photo id |
  |---|---|
  | Modern Cabin with Hot Tub, Lake Arrowhead, CA (cabins) | `1587061949409-02df41d5e562` |
  | A-Frame at Sunset, Big Bear Lake, CA (cabins) | `1542718610-a1d656d1884c` |
  | Overwater Bungalow, Malé, Maldives (beach) | `1499793983690-e29da59ef1c2` |
  | Sunny Loft Apartment, Lisbon, Portugal (city) | `1493809842364-78817add7ffb` |
  | White Villa with Pool, Alicante, Spain (villas) | `1600596542815-ffad4c1539a9` |

  The names and places are invented sample data, labelled as such in the data file.
- **Measurements:** from `home.png` at about 1.735 image px per pt on a 393pt-wide screen. Values marked est. are estimated.

### Toast design (redrawn types)
- **Card:**
  - margin `mx-screen`, `rounded-xl`, `bg-surface`, `shadow-raised`, a 1px `border-border` border, `px-4 py-3`, `gap-3`, `flex-row`.
- **Left icon:**
  - 32pt circle in the tint colour (`success-tint`, `danger-tint` or `info-tint`) holding `CircleCheck`, `CircleAlert` or `Info` (`md`) in the tone colour.
- **Text:**
  - `text1` in `type-callout` semibold ink.
  - `text2` in `type-caption` muted.
- **Behaviour:**
  - swipe to dismiss (library default)
  - tap hides it
  - `accessibilityRole="alert"`, so screen readers announce it

The look follows the sheet's §14 Status/Alerts, as a floating card.

### Verify-email screen (derived from auth.png, since there's no design)
- **Frame:**
  - Same as `AuthLayout`'s top row (Back and wordmark).
  - Title "Check your / email" in `hero`.
  - Body "We sent a 6-digit code to **{email}**. Enter it below to verify your account." in `body`, with the email in medium ink.
- **Code boxes:**
  - **Layout:** 6 boxes, each 48×56 with `rounded-lg`, 8 apart, centered, and the digit in `type-title`.
  - **Colours:** `bg-canvas` normally. The active box is `bg-surface` with a `border-lavender` border and `shadow-focus`. An error turns them all `border-danger`.
  - **Input:** one hidden `TextInput` with `maxLength=6`, `keyboardType="number-pad"`, `textContentType="oneTimeCode"` and `autoComplete="one-time-code"`. It drives the boxes, which handles paste and SMS/email autofill. Tapping the boxes focuses it.
- **Submit:**
  - "Verify email" primary `lg` button, with the arrow.
  - It also submits automatically once the 6th digit is typed.
  - Fewer than 6 digits shows the toast error "Enter the 6-digit code." and red boxes.
- **Resend:**
  - "Didn't get it? **Resend code**", with a 30s cooldown shown as "Resend in 0:29".
  - Resending shows the toast info "Code sent to {email}." (mocked).
- **On success:** `signIn()`, a `router.replace("/home")`, then a success toast reading "Welcome to Havenly, {firstName}.".
- **Route data:** the email reaches the screen as a route param (`/verify-email?email=…`). That's local to the app, and nothing is sent anywhere.

### Home screen (home.png)
- **Screen:**
  - `bg-surface`, a vertical `ScrollView` with `px-screen`, `pt` of `insets.top + 8`, and `pb` = tab bar height + `insets.bottom` + 24.
  - The status bar is dark.
- **Top row:**
  - Left: `Wordmark` at height 44.
  - Right: the avatar as an 84pt circle (est. 86) on `primary-tint`, with the initial in `type-display` ink, pressable.
- **Greeting:**
  - "Hey, {firstName} 👋" in `type-title` medium muted (est. 18–20), margin-top 12.
- **Title row:**
  - Left: "Find your / next stay" in `display`, `flex-1`.
  - Right: the search button, a 64×80 (est.) `rounded-3xl` `bg-canvas` tile with `Search` (`lg`), label "Search".
- **AI bar:**
  - margin-top 20, height 60, `rounded-full`, `bg-lavender`, `pl-5 pr-2`.
  - Contains `Sparkles` (`md`) and a `TextInput` (`type-callout`, placeholder "Describe your perfect stay", placeholder colour `ink` at 60%).
  - On the right, a 44pt white circle with `ArrowUpRight` (label "Search with AI").
- **Chips:** margin-top 20, `Chip variant="category"` for All Stays, Cabins, Beach, City and Villas, wrapping with `gap-2`.
- **Stay cards:**
  - margin-top 24, `gap-5`, one `FeaturedStayCard` per stay.
  - If a category has no stays, show the sheet's empty state: `type-body` "No {category} stays yet." centered, `py-10`.
- **`FeaturedStayCard`** (`src/screens/home/featured-stay-card.tsx`):
  - **Card:** height 268 (est.), `rounded-2xl`, `overflow-hidden`, photo cover.
  - **Shading:** the bottom 60% darkens with `experimental_backgroundImage: "linear-gradient(to bottom, transparent, rgba(11,11,26,0.75))"`.
    - On web, where React Native Web may ignore this, fall back to a flat `bg-ink/40` panel at the bottom.
    - Those colour values live in the theme as a `scrim` token, not in the screen.
  - **Rating pill:** top-right, `bg-surface rounded-full px-3 h-10`, a filled `Star` and the rating in `type-callout` bold.
  - **Bottom-left:** `MapPin` (`sm`, white) with the place in `type-callout` white, then the title in the new `type-title-lg` (white).
  - **Bottom-right:** a 56pt white circle with `ChevronRight`.
  - Pressing it shows an info toast. The arrow is part of the card's single pressable; no nested pressables.
- **Tab bar:** the existing `TabBar`, fixed at the bottom with `mx-4` and `mb` = `insets.bottom + 8`. "home" is active; Search, Trips and Profile show an info toast.

### Proposed design-system changes
- New dependency: `react-native-toast-message`.
- New file `src/components/ui/toast.tsx`, containing `ToastHost` and `toast.success|error|info(title, message?)`.
- Changed: `TextField`'s `error` now draws the border only, with no inline text.
- New text style `type-title-lg`: Bold 26/30, tracking -0.6, ink (est. from the card title: "Modern Cabin" ≈175pt wide).
- New colour token `scrim`: `rgba(11, 11, 26, 0.75)`, for the photo shading.
- New component `CodeInput` (`src/components/ui/code-input.tsx`), because Clerk's reset-password and sign-in codes will reuse it.

## Out of scope
- Real Clerk: sending and checking codes, sessions, OAuth.
- Remembering the session across reloads.
- Search, stay details, trips and profile screens.
- Real tab navigation.
- Sanity data.
- Sign out (it'll live on the future Profile screen; reload to sign out for now).

## Steps
### 1. Toast
- Run `npx expo install react-native-toast-message`.
- Add `src/components/ui/toast.tsx` with the redrawn types, and mount `<ToastHost />` last in the root layout.
- Show all three types in `/design-system` with buttons.
- Done when the type check and lint pass and the three toasts display on web.

### 2. Validation through toasts
- `TextField`: `error` draws the border only and becomes an `accessibilityHint`. Update the design-system demo.
- Sign-up and sign-in call one shared helper that shows the toast for single or multiple failures.
- Provider buttons show the toast info "Google sign-in arrives with Clerk." (or "Apple sign-in arrives with Clerk.") instead of the banner.
- Done when an empty or bad submit shows one toast plus red borders with no inline text.

### 3. Mock session and routes
- Add `src/lib/mock-session.tsx` with a `SessionProvider` wrapped around the root.
- Root `Stack.Protected` groups: `(auth)` when signed out, `(app)` when signed in.
- `/` redirects by session.
- Add `src/app/(app)/_layout.tsx` (Stack, no header) and a temporary `home.tsx`.
- A valid sign-in calls `signIn` and then replaces to `/home`.
- Done when sign-in reaches `/home` and opening `/sign-up` while signed in redirects to home.

### 4. Verify-email
- Add `CodeInput`, `src/screens/auth/verify-email-screen.tsx` and the route `src/app/(auth)/verify-email.tsx`.
- A valid sign-up does `router.push("/verify-email?email=…")`, keeping the first name in a module-level pending holder inside `mock-session.tsx`.
- Done when typing or pasting 6 digits lands on home with the welcome toast, a short code shows the error toast with red boxes, and the resend cooldown counts down.

### 5. Home
- Add `src/screens/home/` with `stays.ts` (sample data), `featured-stay-card.tsx`, `ai-search-bar.tsx` and `home-screen.tsx`.
- Add the `type-title-lg` and `scrim` tokens.
- Done when home matches `home.png` on web at phone width, chips filter, and every action shows its info toast.

## Verification
1. `npx tsc --noEmit` and `npx expo lint` pass, and the drift grep (hex, `rgba(`, `fontSize`, `fontWeight` in `src/`) is clean.
2. On web in a 393×852 frame:
   - Screenshot home next to `home.png`. List every difference, fix it, and repeat.
   - Screenshot verify-email and each toast type.
   - Report the estimated values.
3. Flows:
   - Onboarding → Get started → sign-up. An empty submit shows the "3 fields need attention" toast with red borders and focus on Full name.
   - A valid sign-up opens verify-email showing the email. A short code shows the error toast. Typing 6 digits auto-submits and lands on home with "Hey, Joanna" and the welcome toast.
   - Back on home doesn't return to the forms.
   - Reload signs out, landing on onboarding.
   - Sign-in with `joanna@example.com` and any password goes to home with "Hey, Joanna".
4. Home: the chips filter (Beach shows one stay, Villas one), and each action shows its info toast.
5. No console errors from app code (the Keeper extension's hydration noise doesn't count).
6. You test on your phone in Expo Go: toast position under the notch, the code box keyboard and paste, the photo shading, and the tab bar's glass.

## AGENTS.md updates
- **Who owns what → Auth:** sign-up verifies email with a 6-digit code. Clerk sends and checks the code, and the app keeps its own code screen (`/verify-email`). Sign-in uses email and password, and goes home directly.
- **Expo:**
  - `Stack.Protected` gates `(auth)` and `(app)` by session.
  - `src/lib/mock-session.tsx` stands in for Clerk until the Clerk plan, which replaces it.
- **Design system:**
  - User feedback uses `toast` from `@/components/ui/toast` (`react-native-toast-message`, top, 3.5s). Never call the library directly.
  - Form errors are red field borders plus one toast, with no inline text.
  - Add `type-title-lg` and the `scrim` token.

## Result
Built as planned. `tsc` and `expo lint` pass, and the drift grep is clean. Tested on web in a 393×852 frame:
- Empty sign-up shows the "3 fields need attention" toast with red borders and focus on Full name.
- A valid sign-up opens `/verify-email` with no email in the URL.
- A 3-digit code shows the "Enter the 6-digit code." toast with red boxes.
- Finishing the code auto-submits and lands on `/home` with "Hey, Joanna" and the "Welcome to Havenly, Joanna." toast.
- Back from home stays on home.
- A reload lands on onboarding.
- Sign-in with joanna@example.com goes to home with the "Welcome back, Joanna." toast.
- A signed-in guest sent to `/sign-up` returns to `/home`.
- Chips filter (Beach and Villas show one stay each), and every action shows its info toast.
- The console shows no errors.

Changes made during the build:
- The email no longer goes in the URL: the plan had `/verify-email?email=…`, which would land in browser history on web. The pending sign-up holds it in memory, and the screen redirects to sign-up if there's nothing pending.
- Sign-in and verify don't call `router.replace`: `Stack.Protected` plus the index redirect moves the guest once the session changes.
- `title-lg` is 28/30, not 26, measured against `home.png` (the title now breaks after "Cabin" like the design).
- The AI bar uses the design's example sentence as its hint, in the 14pt `caption` size so it fits.
- `expo lint` caches results in `.expo/cache/eslint`. After adding a file it once reported "unable to resolve" until that cache was cleared.

Open:
- Not yet checked on a phone in Expo Go: toast position under the notch, the code keyboard and one-time-code autofill, the gradient on native, and the tab bar's glass.
- Sign out waits for the Profile screen; reload to sign out.
