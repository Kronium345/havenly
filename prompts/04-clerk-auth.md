# 04 · Clerk auth: email codes, Google, Apple, sessions and sign out

Status: done

## Goal
Guests create a real Havenly account with their email and password and verify it with a 6-digit code Clerk emails them, or continue with Google or Apple. Sign-in uses email and password, and asks for an emailed code when Clerk wants one (a new device). Sessions survive app restarts, the app's screens are only reachable when signed in, and a basic Profile screen has Sign out. The custom auth screens stay; `src/lib/mock-session.tsx` is deleted.

## Decisions
- **SDK:** `@clerk/expo` 4.14.0 (already installed; `ClerkProvider` + `tokenCache` already in `src/app/_layout.tsx`). It is newer than the Clerk skill (3.6), so every call is checked against the installed types in `node_modules/@clerk/shared/dist/types/signInFuture.d.ts` / `signUpFuture.d.ts`. Use the current method API from `@clerk/expo` (`useSignUp`, `useSignIn` → `{ signUp | signIn, errors, fetchStatus }`, `.password()`, `.verifications.sendEmailCode()`, `.finalize()`), never `@clerk/expo/legacy` (`prepareFirstFactor`, `setActive` from the hooks).
- **Clerk MCP:** it is configured but needs authentication (`/mcp` → clerk). If authenticated before the build, use it to confirm the Expo patterns below; otherwise the skill + installed types are the source.
- **Sign-up (user choice: turn names on):** Full name is split on the first space into `firstName` / `lastName` (one word → first name only), passed with `signUp.password({ emailAddress, password, firstName, lastName })`. Then `signUp.verifications.sendEmailCode()` and route to `/verify-email`. The screen renders `<View nativeID="clerk-captcha" />` for bot protection.
- **Password minimum (user choice):** stays 8 in the app; you lower Clerk's minimum from 15 to 8 in the dashboard. Clerk's breached-password check stays on, so a known-leaked password is rejected by Clerk with its own message.
- **Sign-in (user choice: password, code on new devices):** `signIn.password({ emailAddress, password })`. Status `complete` → `finalize()`. Status `needs_client_trust` or `needs_second_factor` with an `email_code` factor → `signIn.mfa.sendEmailCode()` and route to `/verify-email?flow=sign-in` (the flow name is not personal data; the email is read from the Clerk resource, never the URL). Any other status → error toast "This sign-in needs a step Havenly doesn't support yet." and `signIn.reset()`.
- **Verify screen:** one screen for both flows. `flow` param `sign-up` (default) or `sign-in`. Sign-up: `signUp.verifications.verifyEmailCode({ code })`, resend `sendEmailCode()`, email from `signUp.emailAddress`. Sign-in: `signIn.mfa.verifyEmailCode({ code })`, resend `signIn.mfa.sendEmailCode()`, email from the sign-in's email factor (`safeIdentifier`, else `identifier`). When status becomes `complete`, `finalize()`. Nothing pending (e.g. after a reload) → redirect to `/sign-up` or `/sign-in`. A wrong or expired code → red boxes + Clerk's message as an error toast, code cleared. Resend keeps the 30s cooldown. Copy for sign-in: title "Check your\nemail", body "…to verify it's you."
- **Navigation after auth:** no `router` calls and no `finalize({ navigate })`. `finalize()` activates the session, `Stack.Protected` closes `(auth)`, and `/` redirects to `/home` (as today). Welcome toasts as today ("Welcome to Havenly, {first}." / "Welcome back, {first}.").
- **Google and Apple (user request):** experimental `useSSO()` from `@clerk/expo/experimental` (Core 3: it uses the future resources and activates the session itself, so no `setActive`). Strategies `oauth_google` / `oauth_apple`. It opens a browser session, so it works in Expo Go on iOS and Android. A cancelled flow (`createdSessionId` null and no error) does nothing. Errors → error toast with Clerk's message. Both buttons on sign-up and sign-in. Native Google/Apple sheets (`@clerk/expo/google`, `/apple`) need a development build: left for later.
- **Social on web:** out of scope. Browser SSO on web needs a redirect callback route; the web build is our verification surface, not a product. On web the buttons show info toast "Google sign-in works in the Havenly app." (Apple likewise).
- **Errors:** a helper `clerkErrorMessage(error)` returns the first error's `longMessage ?? message`. Field borders turn red from `errors.fields.emailAddress | password | code` (and `identifier` on sign-in). One toast per failure, matching `reportInvalid`. Local checks (`validate.ts`) still run first so empty fields never hit Clerk.
- **Busy state:** submit buttons use `loading` while `fetchStatus === "fetching"` (or while an SSO flow is open), so double taps can't send twice.
- **Persistent sessions:** `npx expo install expo-secure-store` (Expo Go includes it). `tokenCache` from `@clerk/expo/token-cache` keeps the session in the keychain on native; web uses Clerk's own storage. Add `"expo-secure-store"` and `"@clerk/expo"` to `app.json` plugins (needed for the later development build; harmless in Expo Go).
- **New dependencies:** `expo-secure-store` (sessions) and `expo-auth-session` (+ `expo-crypto` if it asks, peer of auth-session) for `useSSO`. `expo-web-browser` is already installed. All via `npx expo install`.
- **Loading gate:** while `useAuth().isLoaded` is false, `/` renders nothing (on native the splash stays up until both fonts and Clerk are ready); guards treat "not loaded" as signed out for `(app)` and signed in for `(auth)` — i.e. neither group opens until Clerk knows. The server render (web) also sees "not loaded", so hydration matches.
- **Session state in the app:** `useAuth()` (`isLoaded`, `isSignedIn`) for guards; `useUser()` for name and email. Home greets `user.firstName`, else the capitalized email local part (moved from mock-session to `src/lib/display-name.ts`), else "there".
- **Profile (user choice: basic screen):** new route `src/app/(app)/profile.tsx` → `src/screens/profile/profile-screen.tsx`. Back button (`IconButton`), title "Profile" (`hero`), the initial avatar, full name (`title`) and email (`body`, muted), then a secondary `Button` "Sign out" (`loading` while signing out). Reached from the home avatar and the Profile tab. Sign out: `useClerk().signOut()`, then toast "You're signed out."; the guard closes `(app)` and `/` sends the guest to `/onboarding`. To be replaced by the `profile.png` design later.
- **Secrets:** only `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is read by the app. `CLERK_SECRET_KEY` stays in `.env.local` (gitignored) and is not used here. Add `.env.example` with both names, no values.
- **Analytics:** none here (PostHog is a later plan).

## Out of scope
- Forgot password / reset (Clerk supports it; needs its own screens).
- Social sign-in on web; native Google/Apple sheets and passkeys (development build).
- MFA beyond the emailed code (TOTP, SMS, backup codes).
- The real Profile design and account editing.
- API routes and server-side session checks (first API route plan).

## Steps
### 1. Dependencies and config
`npx expo install expo-secure-store expo-auth-session` (add `expo-crypto` if Expo or the auth-session docs require it). Add `"expo-secure-store"` and `"@clerk/expo"` to `app.json` `plugins`. Create `.env.example` with `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=` and `CLERK_SECRET_KEY=`. Done: `npx expo-doctor` has no new problems, `tsc` passes.

### 2. Session plumbing
Root layout: drop `SessionProvider`; `RootStack` reads `useAuth()`; guards `isLoaded && !isSignedIn` for `(auth)`, `isLoaded && isSignedIn` for `(app)`; on native keep the splash until fonts and `isLoaded`. `src/app/index.tsx`: render `null` until loaded, then redirect. Add `src/lib/display-name.ts` (`displayFirstName(user)`, `splitFullName(fullName)`). Delete `src/lib/mock-session.tsx`. Home uses `useUser()`. Done: app boots signed out to onboarding with no errors.

### 3. Clerk error helper
`src/screens/auth/clerk-errors.ts`: `clerkErrorMessage(error)` and a fallback "Something went wrong. Try again." Done: typed against `ClerkError` from the installed types.

### 4. Sign-up
Wire `sign-up-screen.tsx` to `useSignUp()` as in Decisions, captcha view included, Clerk field errors → red borders + toast, button `loading`. Done: a new email gets a code email and opens `/verify-email`; an existing email shows Clerk's "already taken" message.

### 5. Verify email
Rewrite `verify-email-screen.tsx` for both flows (Decisions). Done: the right code signs in and lands on home with the welcome toast; a wrong code shows red boxes + toast; resend sends a new email.

### 6. Sign-in
Wire `sign-in-screen.tsx` to `useSignIn()` with the status branches. Done: right password → home; wrong password → red password border + Clerk's message; new-device check → `/verify-email?flow=sign-in`.

### 7. Google and Apple
`src/screens/auth/use-social-sign-in.ts` wraps experimental `useSSO()` (busy state, cancel = no-op, errors → toast, web → info toast). `AuthLayout`'s provider buttons call it. Done: Google round-trip in Expo Go lands on home; cancelling returns quietly.

### 8. Profile and sign out
Profile route + screen; home avatar and Profile tab navigate to `/profile`. Done: Sign out returns to onboarding; Back from onboarding can't reach home.

### 9. Close out
Lint, type check, drift grep, `/design-system` unaffected, AGENTS.md updates, `## Result`.

## Verification
- `npx tsc --noEmit`, `npx expo lint`, and the drift grep (no hex, `rgba(`, `fontSize`, `fontWeight` in `src/`) pass. `npx expo-doctor` shows no new issues.
- Web at 393×852 (no account is created by me): app boots to onboarding with no console errors; empty sign-up/sign-in forms still show the local validation toast and red borders; Google/Apple show the web info toast; `/home` and `/profile` while signed out redirect to onboarding; `/verify-email` with nothing pending redirects to sign-up.
- On your phone in Expo Go (real Clerk calls; Clerk test emails `name+clerk_test@example.com` accept code `424242` and send no email):
  1. Sign up → code → home greets your first name.
  2. Wrong code → red boxes + toast. Resend → new code.
  3. Force-quit and reopen → still on home (persistent session).
  4. Profile → Sign out → onboarding; reopen → still signed out.
  5. Sign in with the same account → home ("Welcome back").
  6. Sign in with a wrong password → error toast, password border red.
  7. Google → browser → home. Apple → browser → home (after enabling Apple).
  8. Cancel Google halfway → back on the form, no error.
- End to end: steps 1–7 on one device, then a cold start lands on home.

## AGENTS.md updates
- **Expo → Route groups:** replace the mock-session sentence: guards read `useAuth()` (`isLoaded && isSignedIn`), `(app)` now holds home and profile, splash held until fonts and Clerk load on native.
- **Who owns what → Auth:** custom flows use the current method API (`useSignUp`/`useSignIn`, `.password()`, `verifications`, `mfa`, `finalize()`), never `@clerk/expo/legacy`; sessions via `tokenCache`; sign-in asks for an emailed code when Clerk returns `needs_client_trust`; Google/Apple via experimental `useSSO()` (browser, Expo Go); names stored as Clerk first/last name; password minimum 8 in both Clerk and the app; sign-up screens render `clerk-captcha`.
- **Rules:** Clerk errors show Clerk's message in one toast plus red borders.

## Result
Built as planned: Clerk replaces the mock session. Sign-up (names + password, emailed code), sign-in (password, emailed code on new devices), Google/Apple via experimental `useSSO()`, sessions in `tokenCache` (`expo-secure-store`), and a basic `/profile` with Sign out. `src/lib/mock-session.tsx` is deleted.

Changes from the plan:
- Guards are `!isSignedIn` for `(auth)` and `!!isSignedIn` for `(app)` (not `isLoaded && …`): while Clerk loads, `(auth)` stays open so a web reload of `/sign-in` keeps its place, and `(app)` stays closed. `/` waits for `isLoaded`.
- The splash waits for fonts and Clerk, but at most 5s for Clerk, so an offline launch can't hang on the splash.
- Added `src/app/sso-callback.tsx` (redirects to `/`) so Android's return deep link from Google/Apple never hits an unmatched route.
- `.env` added to `.gitignore` (only `.env*.local` was ignored).
- The welcome toast after Google/Apple is "You're signed in."

Verified: tsc, lint, drift grep pass. On web at 393×852: empty sign-up gives the "3 fields need attention" toast, red borders and focus on Full name; Google/Apple give the web info toast; signed out, `/home` and `/profile` go to onboarding, `/verify-email` goes to `/sign-up`, `/verify-email?flow=sign-in` goes to `/sign-in`; Clerk loads with the dev key. Real Clerk calls (accounts, codes, Google/Apple, restart persistence, sign out) are for the phone test, not run here.
