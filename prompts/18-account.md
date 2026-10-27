# 18 · Account: password, signed-in devices, delete account

Status: approved

## Goal
Profile → Personal info becomes **Account**. Besides name and photo, a guest can:
- change their password;
- see the devices they're signed in on, and sign other devices out;
- delete their account, which removes everything personal (Apple requires in-app deletion).

## Decisions
- **Placement** (user's choice): extend the existing `/personal-info` screen, renamed **Account** in its header and in the Profile row. Its sections are:
  1. Photo and name (unchanged);
  2. Email (read only: the primary email);
  3. Password;
  4. Signed-in devices;
  5. Delete account, at the bottom in the danger colour.

  No new tab or route.
- **Change password** (user's choice): a Sheet with current password, new password and confirm.
  - Validation uses `validate.ts` (minimum 8, the same as sign-up), with red borders and one toast (`reportInvalid`).
  - It calls `user.updatePassword({ currentPassword, newPassword, signOutOfOtherSessions: false })`, wrapped in `useReverification` so Clerk can ask for a re-check when the session is old. Clerk errors go through `reportClerkError`.
  - Guests who signed up only with Google or Apple (`user.passwordEnabled === false`) see "You sign in with Google/Apple" instead of the form.
- **Signed-in devices** (user's choice):
  - `user.getSessions()` lists each session: browser or device name, city and country, last active (`latestActivity`), with "This device" for the current one.
  - The others have a Sign out button (`session.revoke()`, after a confirmation Sheet).
  - Loading, error and empty states are handled.
- **Delete account** (user's choice: everything personal):
  - The row opens a Sheet. It explains what's removed and asks the guest to type **DELETE**.
  - **Upcoming trips block deletion** (user's choice): if the guest has any confirmed trip that hasn't ended, the Sheet lists them and asks them to cancel first, so refunds by tier stay explicit. There's no delete button until none remain.
  - Then `DELETE /api/account` (server, session-checked):
    1. checks again that no upcoming confirmed trips remain (409 otherwise);
    2. deletes the guest's rows in `bookings` (Neon);
    3. deletes their Stripe Customer, which detaches saved cards;
    4. deletes their PostHog person (see below);
    5. deletes the Clerk user (`users.deleteUser`), which removes saved stays, profile and sessions.

    The steps run in that order, so a failure part-way leaves the Clerk account, and the guest can retry. Every step is safe to repeat.
  - The app then calls `posthog.reset()` and shows the onboarding screen (signing out happens because the session no longer exists). A toast says "Account deleted."
- **PostHog person deletion:**
  - It needs a server-only personal API key with person-delete scope: `POSTHOG_PERSONAL_API_KEY`, plus `POSTHOG_PROJECT_ID`, which join the secret list.
  - It calls PostHog's REST API to delete the person with distinct id = the Clerk user id.
  - Without the key, the step is skipped and logged. Deletion still completes, and the plan notes the gap for production.
- **Events:** `account_password_changed`, `account_session_revoked`, `account_deleted` (sent before the PostHog person is removed; ids and enums only).
- No new dependencies. Copy follows the existing screens. Destructive actions use the `danger` colour and a confirmation Sheet.

## Out of scope
- Changing email (not chosen).
- Data export.
- Two-factor settings.
- A web version of account deletion (Apple asks for in-app, which this is; Google Play also asks for a web link, which comes with production).

## Steps
### 1. Server: account deletion
- `src/lib/server/account.ts`: `deleteAccount(userId)` with the 5 steps, plus `posthogDeletePerson`.
- `src/app/api/account+api.ts` (DELETE).

Done when tsc passes.

### 2. Account screen
- `personal-info-screen.tsx` gains the Email, Password, Devices and Delete sections.
- New `change-password-sheet.tsx`, `sessions-section.tsx` and `delete-account-sheet.tsx` in `src/screens/profile/`.
- The Profile row label becomes "Account".

Done when lint and tsc pass.

## Verification
- tsc and lint pass.
- **Script** (Neon `dev`, Stripe sandbox, a throwaway Clerk test user created by the script):
  - a confirmed future trip blocks deletion (409);
  - after cancelling, deletion removes the bookings rows, the Stripe customer and the Clerk user;
  - running it again on a missing user is harmless.
- **Phone (new dev build):**
  - change password, then sign in again with it;
  - two devices signed in: sign the other out, and it's sent back to sign-in;
  - delete a test account, which returns to onboarding; signing in with it fails.

## AGENTS.md updates
- **Auth:** Account (`/personal-info`) holds password change (`useReverification`), sessions (`getSessions`, `revoke`) and deletion through `DELETE /api/account`, with its order of steps; upcoming trips block deletion.
- **Rules:** `POSTHOG_PERSONAL_API_KEY` and `POSTHOG_PROJECT_ID` join the secret list.

## Result (in progress)
Steps 1–2 are built. tsc and lint pass. Status stays `approved` until the script test (needs `DATABASE_URL`) and the phone checks (needs the new dev build).
- **Server:** `src/lib/server/account.ts` (`deleteAccount`) and `src/app/api/account+api.ts`.
  - PostHog's private API host is derived from the ingestion host (`eu.i.posthog.com` → `eu.posthog.com`).
  - A Stripe customer that's already gone and a Clerk user that's already gone (404) both count as done.
- **Screen:**
  - Personal info is titled **Account**, and the Profile row reads "Account".
  - New `change-password-sheet.tsx` (`useReverification`), `sessions-section.tsx` and `delete-account-sheet.tsx` (type DELETE; upcoming trips listed with "Go to Trips" instead).
  - Guests who sign in only with Google or Apple see a note instead of the password button.
- **Script test** (with plan 17's): deletion is blocked with an upcoming trip (409); after cancelling, it removes the bookings rows, the Stripe customer and the Clerk user; running it again is harmless. The test found that a repeat failed, because the Stripe lookup reads the Clerk user; that's fixed (a missing Clerk user means every earlier step already ran). The PostHog step was skipped because `POSTHOG_PERSONAL_API_KEY` isn't set.
