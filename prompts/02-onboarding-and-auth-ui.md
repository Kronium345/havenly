# 02 · Onboarding and auth UI

Status: done

## Goal
On a fresh launch the guest sees a 3-slide onboarding with full-bleed Unsplash photos. They can swipe through it or tap Next, and on the last slide "Get started" (or "Skip" at any point) opens the "Create your account" screen. That screen is built from `auth.png`, and from it the guest can switch to "Sign in" and go back to onboarding. Clerk isn't wired yet: the forms only check the fields.

## Decisions
- **Designs:** `C:\Users\danie\Downloads\prompt-imgs\prompt-imgs\onboarding.png` and `auth.png`. Measurements are scaled to a 393pt-wide screen; onboarding is about 1.6 image px per pt and auth about 1.73. Values marked est. are estimated.
- **Flow (user choice):**
  - 3 slides that you swipe, or step through with the primary button.
  - The button reads "Next" on slides 1–2 and "Get started" on slide 3.
  - "Get started" and "Skip" both open sign-up.
- **Auth (user choice):**
  - Sign-up UI is built from `auth.png` with no Clerk.
  - Sign-in has no design, so it reuses the sign-up layout with email and password only. This is derived from `auth.png`, not designed.
  - Submitting validates in code: name required, email format, password of at least 8 characters.
  - A valid submit shows an `info` StatusBanner: "Accounts are coming soon. Sign-up isn't connected yet." It doesn't fake success.
  - The Google and Apple buttons do the same until the Clerk plan wires them.
- **Photo chips (user choice, best guesses):**
  - Slide 1: Emerald Lake, BC.
  - Slide 2: Lago di Braies, Italy.
  - Slide 3: Bali, Indonesia. This one is a guess, so edit it in the slide data if it's wrong.
- **Brand:** text says "Havenly" where the design says "roam". The sign-up placeholder "e.g. Adrian Hajdin" names a real person, so it becomes "e.g. Alex Morgan".
- **Routes:**
  - `src/app/index.tsx` redirects to `/onboarding`. Until Clerk exists, every launch shows onboarding, and there's no "seen" flag, so no storage dependency.
  - `/design-system` stays reachable by deep link (`havenly://design-system`).
  - Screens live in an `(auth)` group with headers hidden. Onboarding pushes sign-up, so its back button returns to onboarding. Sign-up and sign-in `replace` each other, so the stack doesn't grow.
- **Code layout:** screen-only pieces go in `src/screens/onboarding/` and `src/screens/auth/` (the skill's screens folder; never in `src/app/`). Two shared changes go into the design system: a new `type-hero` text style and new component variants.
- **Swipe:** photos are a horizontal paging `FlatList` behind a fixed sheet. The sheet's text changes with the slide using a short Reanimated fade (`motion.base`). A horizontal swipe (Gesture Handler `Fling`) also changes slide. `GestureHandlerRootView` wraps the root layout. All of this works in Expo Go and needs no new dependencies.
- **Images:** `expo-image` loads `https://images.unsplash.com/photo-<id>?w=1200&q=80&auto=format&fit=crop` with `contentFit="cover"`, a 300ms transition and an `ink` background while loading. The next slides' photos are prefetched. All three IDs were checked to return 200:
  - Slide 1: `1510798831971-661eb04b3739` (lodge reflected in a lake, snowy pines, light sky).
  - Slide 2: `1470770841072-f978cf4d019e` (boathouse on a mountain lake).
  - Slide 3: `1520250497591-112f2f40a3f4` (tropical pool villa with palms).
- **Status bar:** dark content on onboarding (light sky at the top of the photos) and on auth.

### Slide copy
1. **Find a stay that fits your story.** "From mountain cabins to oceanfront villas, Havenly helps you find unforgettable stays for every kind of trip." (from the design)
2. **Describe it in one sentence.** "Type something like "quiet pet friendly cabin with a hot tub under $300" and get stays ranked for you."
3. **Book with confidence.** "Ask about cancellation, pets or check-in and get the answer word for word from the stay's own policies."

### Onboarding screen (onboarding.png)
- **Photo:** full-bleed behind everything.
- **Top row**, at `insets.top + 8`, padded `px-6` (24, est.):
  - left: `Wordmark` at height 40 (≈134pt wide, est.)
  - right: a Skip pill with height 44, `px-5`, `rounded-full`, `bg-glass`, Skip in `type-callout` medium ink
- **Location chip:**
  - Position: left 24, 16pt above the sheet's top-left (est.).
  - Shape: height 40, `px-4`, `gap-2`, `rounded-full`.
  - Colors: `bg-ink/40` with a 1px `border-white/30` (est.).
  - Content: a white filled `MapPin` (`sm`) and the place name in `type-callout` medium white.
- **Sheet:** `bg-surface`, pinned to the bottom.
  - Top edge: a wave drawn with `react-native-svg`. The top-left corner is the highest point, with a 24pt (`2xl`) radius, and the edge falls about 32pt toward the right, where it rounds into the right side (est. from the image).
  - Content: `px-7` (28, est.), and `pb` of `insets.bottom + 12`.
  - Progress dashes: 3 of them, each 32×4 (`w-8 h-1`), `rounded-full`, 8 apart. The active one is `lavender`, the rest `border`. Top margin 8.
  - Title: `type-hero` (new), margin-top 20 (est.).
  - Body: `type-body`, margin-top 12.
  - Buttons: margin-top 24. `Button` primary at size `md` (48; the design is about 50) with an arrow, then 8 below it a `Button` secondary at size `md` with the Google logo, reading "Continue with Google".

### Sign-up screen (auth.png)
- **Background:** `bg-surface`, inside a `ScrollView` with `keyboardShouldPersistTaps="handled"`, `automaticallyAdjustKeyboardInsets` and `px-screen`.
- **Top row**, at `insets.top + 8`:
  - left: `IconButton` with the new `outline` variant (`bg-surface border border-border`), `ChevronLeft`, size `md` (48; the design is about 44, est.), label "Back"
  - right: `Wordmark` at height 24 (≈80pt wide)
- **Title:** "Create / your account" in `type-hero`, margin-top 28 (est.).
- **Body:** "Join Havenly to save your stays, get personalized recommendations and access them across all your devices." in `type-body`, margin-top 12.
- **Fields** (`gap-3`, margin-top 28): `TextField` with labels.
  - Full name (`User`) and Email address (`Mail`): `keyboardType="email-address"`, `autoCapitalize="none"`, `autoComplete="email"`.
  - Password (`Lock`, secure entry): placeholder "At least 8 characters", `autoComplete="new-password"`.
- **Create account:** primary `lg` button with an arrow, margin-top 24.
- **Divider** (margin-y 20): hairlines in `border`, with "or" between them in `type-caption` muted.
- **Provider buttons:** `md` secondary buttons with the Google and Apple logos, `gap-3`.
- **Footer:** "Already have an account?" in `type-caption` muted, then "Sign in" in `type-callout` medium ink with an underline (it's a link). Centered, margin-y 24.
- **Errors:** a field error turns `TextField` red (new `error` prop: `border-danger` plus a `type-caption` danger message below). The first invalid field gets focus.

### Sign-in screen (derived)
Same layout as sign-up:
- Title: "Welcome / back".
- Body: "Sign in to see your saved stays and trips."
- Fields: Email and Password (`autoComplete="current-password"`).
- Primary button: "Sign in".
- Footer: "New to Havenly? Create account".

### Proposed design-system changes
- New token `type-hero`: Bold, 36/38, tracking -1 (est. from both designs: line heights 39pt and 37.6pt).
- `IconButton` gets an `outline` variant.
- `TextField` gets an `error?: string` prop.
- `StatusBanner` gets an `info` variant (`bg-info-tint`, `text-info`, `Info` icon).

## Out of scope
- Clerk, OAuth, real sign-up/in, and session-based routing.
- Remembering that onboarding was seen.
- The tab bar and home screen.
- Forgot password.
- Photo credits (Unsplash doesn't require them).

## Steps
### 1. Routes and root setup
- Wrap `src/app/_layout.tsx` in `GestureHandlerRootView` and register the `(auth)` group with `headerShown: false`.
- Add `src/app/(auth)/_layout.tsx`: a Stack with `headerShown: false` and `contentStyle` set to surface.
- Replace `src/app/index.tsx` with `<Redirect href="/onboarding" />`.
- Done when the app opens at `/onboarding` (an empty screen at this point) and `/design-system` still loads.

### 2. Design-system additions
Add everything in "Proposed design-system changes" and show each new piece in `/design-system`. Done when the type check and lint pass.

### 3. Onboarding
- `src/screens/onboarding/slides.ts`: data for each slide (id, photo id, place, title, body).
- `sheet-top.tsx`: the SVG wave.
- `progress-dashes.tsx`.
- `photo-chip.tsx`: the location chip.
- `skip-pill.tsx`.
- `onboarding-screen.tsx`: the pager, fixed sheet, fade, Fling gesture, buttons and navigation (`router.push("/sign-up")`).
- `src/app/(auth)/onboarding.tsx` renders it.

Done when you can swipe and press Next through all 3 slides, and both "Get started" and "Skip" open sign-up.

### 4. Sign-up and sign-in
- `src/screens/auth/auth-layout.tsx`: shared top row, title, body, scroll and footer slots.
- `or-divider.tsx`.
- `validate.ts`: pure functions for name, email and password.
- `sign-up-screen.tsx` and `sign-in-screen.tsx`.
- Routes `src/app/(auth)/sign-up.tsx` and `sign-in.tsx`.

Done when Back, the Sign in ↔ Create account switch, inline errors and the info banner all work.

## Verification
1. `npx tsc --noEmit` and `npx expo lint` pass, and the drift grep (hex, `rgba(`, `fontSize`, `fontWeight` in `src/`) is clean.
2. On web at phone width (393): screenshot onboarding slide 1 next to `onboarding.png` and sign-up next to `auth.png`. List every difference, fix it, and repeat. Report the estimated values.
3. Flows on web:
   - Next → Next → Get started opens sign-up.
   - Skip from slide 1 opens sign-up.
   - Back returns to onboarding.
   - "Sign in" opens sign-in, and "Create account" returns.
4. Validation:
   - Submit empty: three errors, with focus on Full name.
   - A bad email shows the email error.
   - A 7-character password shows the password error.
   - Valid input shows the info banner and no errors.
5. No console errors from app code (the Keeper extension's hydration noise doesn't count).
6. You test on your phone in Expo Go: swiping, the fling on the sheet, the keyboard not covering fields, safe areas on a notched phone, and photo load times.

## AGENTS.md updates
- **Expo:**
  - The `(auth)` group holds onboarding, sign-up and sign-in. `/` redirects to `/onboarding` until Clerk decides where to send signed-in users; the Clerk plan replaces this.
  - Screen-only components live in `src/screens/<screen>/`. Shared ones live in `src/components/ui/`.
  - `GestureHandlerRootView` wraps the root.
- **Design system:**
  - `type-hero` is the large screen title (onboarding and auth).
  - Remote sample photos come from `images.unsplash.com` with `w=1200&q=80&auto=format&fit=crop`.

## Result
Built as planned: 3-slide onboarding at `/onboarding`, sign-up and sign-in in the `(auth)` group, and `/` redirecting to onboarding. `tsc`, `expo lint` and the drift grep are clean. Tested on web in a 393×852 frame: Next/Next/Get started, Skip, Back, a real scroll of the pager, the Sign in ↔ Create account switch, empty, bad and valid submits, focus on the first invalid field, and return-key field chaining.

Changes made during the build:
- Title sizes were re-measured on screen. Onboarding uses `display`, whose line height went from 44 to 40 (the home design is 40 too). `hero` is 36/36 for auth. The onboarding sheet's wave drop went from 26 to 36.
- The onboarding pager sizes itself from `onLayout`, not `useWindowDimensions`, because the server renders at 0×0 on web and the attributes never got patched (photos were 0 wide). The root layout holds for fonts on native only, which fixes a root hydration mismatch on web.
- Button-driven slide changes ignore scroll events until the target slide lands, which removes the copy flicker between slides.
- Slide 3 is relabelled "Krabi, Thailand": the photo shows limestone karst. It's still a guess.
- The onboarding "Continue with Google" button opens sign-up for now.

Open:
- Not yet checked on a phone in Expo Go: the sheet fling, the keyboard over fields, notch safe areas, and photo load times.
- The design's title weight is heavier than Plus Jakarta Sans Bold.
- The location chip pin is an outline. The design's pin is filled with a hole, which lucide can't do with a single color.
