# 20 · Production release setup

Status: done

## Goal
A release build of Havenly works without the dev server: the API runs on EAS Hosting, release builds point at it, payments are confirmed by Stripe webhooks even if the guest closes the app, the production database is ready, and the store listing has its privacy and support pages. Clerk production and Stripe go-live are listed as the user's steps; they need a domain and an activated Stripe account.

## Decisions
- **Hosting** (user's choice: a fixed production URL):
  - `npx expo export -p web` then `npx eas-cli@latest deploy --prod` puts the API routes (and the web build) on EAS Hosting, which runs on Cloudflare Workers.
  - The first deploy assigns the address (expected `https://havenly.expo.app`). That exact value goes into the `expo-router` plugin's `origin` in `app.json`, so relative `fetch("/api/...")` in release builds reaches it. Dev builds keep using the dev server.
  - Every app version talks to this one server, so API changes must stay backward compatible.
  - No automatic per-build deploys (`EXPO_UNSTABLE_DEPLOY_SERVER` stays unset).
- **Runtime check:** the API already runs on Workers APIs: `fetch`, `@clerk/backend`, the Neon HTTP driver, the AI SDK and Web Crypto. Step 5 confirms each route works against the deployed server.
- **Server secrets on EAS** (the `production` environment, visibility `secret`):
  - `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (new);
  - `DATABASE_URL` for Neon **`main`**;
  - `SANITY_ORGANIZATION_TOKEN`, `SANITY_CONTEXT_MCP_URL`, `SANITY_CONTEXT_KB_URL`;
  - `TYPESAFE_AI_API_KEY`;
  - `POSTHOG_PERSONAL_API_KEY` and `POSTHOG_PROJECT_ID` (optional).

  App values (`plaintext`): the `EXPO_PUBLIC_*` keys. `SANITY_WRITE_TOKEN` is never uploaded.
  - Until Clerk production and Stripe live exist, the production environment uses the **current dev and test keys**, so the deployed server can be tested end to end. Swapping in live keys is a "You need to" step.
  - `eas.json` `build.production` gets `"environment": "production"`.
- **Stripe webhook** (user's choice: confirm and refunds): `POST /api/stripe/webhook` (`src/app/api/stripe/webhook+api.ts`, logic in `src/lib/server/stripe-webhook.ts`).
  - **Signature check:** it verifies the `Stripe-Signature` header itself, using Web Crypto HMAC-SHA256 over `"<t>.<raw body>"` with `STRIPE_WEBHOOK_SECRET`, a constant-time compare, and 5-minute timestamp tolerance. No Stripe SDK.
  - **No session:** this route is the one exception to `requireSession`. The verified signature is its authentication.
  - `payment_intent.succeeded`: runs the existing `createPaidBooking(metadata.userId, intent.id)`. The app and the webhook take the same path, so a payment never books twice, and a lapsed hold whose dates were taken is still refunded.
  - `charge.refunded`: sets `bookings.refunded` from `amount_refunded`, by `payment_intent_id`.
  - Other events get 200 and are ignored. Errors return 500, so Stripe retries.
  - Registered first against the sandbox (test mode), then again for live mode at go-live.
- **Neon `main`:** migrations 001 and 002 applied on the `main` branch. Its connection string goes only into EAS, never into `.env.local`. `dev` stays local.
- **Policy pages** (user's choice):
  - `/privacy` and `/support` routes, public, outside the `(app)` guard. Same design system; text only.
  - The privacy text lists what's collected and why: Clerk (account), Neon (bookings), Stripe (payments), PostHog (analytics, by user id only), Sanity (content).
  - It also covers deletion (in-app Account → Delete account) and contact (the support email).
  - **The wording is a draft for the user to review; it isn't legal advice.**
  - `/support`: the support email and FAQs linking to Help. It still uses `support@havenly.app` until the user provides a real inbox.
  - Help & support in the app links to both.
- **Release-only changes:**
  - `/design-system` redirects to `/` when `!__DEV__`.
  - `ios.infoPlist.NSCameraUsageDescription`: "Havenly uses the camera to scan your card when you add a payment method." (Stripe card scanning).
  - The iOS privacy manifest: check what Expo combines from the installed packages (`npx expo prebuild --platform ios --no-install` in a temp copy, or `expo config`). Add `ios.privacyManifests` entries only for what the app's own code uses (e.g. UserDefaults through SecureStore and PostHog, if not already declared).
- **Clerk production** (user's steps, once they've bought a domain):
  - I create the production instance through the Clerk MCP, list the DNS records, turn on Organizations there (the same settings as dev, prompts/19), and set up production Google and Apple sign-in. The user adds the DNS records and the OAuth credentials.
  - The `pk_live` / `sk_live` keys then replace the dev keys in the EAS production environment.
- **Stripe go-live** (user's steps): activate the account, create the live webhook endpoint, and put the live keys in EAS only.
- No new dependencies.

## Out of scope
- Store screenshots and listing text.
- Google Play Data safety and App Store privacy label forms: the plan lists the answers, and the user fills them in.
- Rate limiting, a PostHog production project, a custom domain on EAS Hosting, push notifications.
- Host phase 2.

## Steps
### 1. Release config
- `/design-system` guard, camera usage text, `eas.json` production `environment`.
- Check the privacy manifest and add entries if needed.

Done when tsc and lint pass and `npx expo config --type public` shows the camera text.

### 2. Policy pages
`src/app/privacy.tsx` and `src/app/support.tsx` render `src/screens/legal/*`, with links from Help.

Done when both open signed out on web at phone width, are screenshotted, and the user reviews the wording.

### 3. Stripe webhook
The route plus `stripe-webhook.ts`, and `STRIPE_WEBHOOK_SECRET` in `.env.example`.

Done when tsc passes and the signature script test passes.

### 4. Neon `main` and EAS environment
- Migrate `main` (connection string from the Neon MCP, passed to the migration script only for that one command).
- Create the EAS production variables from the list, after the user approves uploading each one (values never shown in chat).

### 5. First deploy
- Export and deploy `--prod`, then set `origin` in `app.json` to the address it prints.
- Register the sandbox webhook endpoint `https://<host>/api/stripe/webhook` for `payment_intent.succeeded` and `charge.refunded`, and store its signing secret in EAS.
- Smoke-test the deployed server.

## Verification
- tsc and lint pass.
- **Webhook script** (local, against the handler function):
  - a valid signature is accepted;
  - a wrong secret, a changed body or a timestamp more than 5 minutes old gets 400;
  - with the Stripe sandbox and Neon `dev`, a held checkout whose PaymentIntent succeeds is confirmed by the webhook alone (no app call), and a repeat event changes nothing;
  - `charge.refunded` updates `refunded`.
- **Deployed server** (curl):
  - `/privacy` and `/support` return 200;
  - `/api/stays` without a token returns 401;
  - with a test user's session token, `/api/stays` returns stays and `/api/bookings` returns a list (proves Clerk, Sanity and Neon `main` work on Workers);
  - `POST /api/search` returns results;
  - a bad webhook signature returns 400.
- **Stripe sandbox:** a real `stripe trigger payment_intent.succeeded`, or a test checkout, shows a 200 delivery in the Stripe dashboard.
- **Phone (when an iOS preview/production build exists):** the app works with the dev server stopped (search, booking, trips).

## AGENTS.md updates
- **Expo:**
  - production API on EAS Hosting (`npx expo export -p web` + `npx eas-cli@latest deploy --prod`);
  - `origin` in the `expo-router` plugin; API changes must stay backward compatible;
  - the EAS `production` environment holds secrets, and `SANITY_WRITE_TOKEN` is never uploaded.
- **Bookings:** "No webhooks yet" becomes the `/api/stripe/webhook` description (signature-verified, same confirm path, `charge.refunded`); Neon `main` is migrated.
- **Rules:** the webhook is the only route without `requireSession`; its signature is the check.
- **Design system:** `/design-system` is dev only. Privacy and support pages live at `/privacy` and `/support`.

## Result
- Built:
  - `/design-system` dev only; camera text; `eas.json` production `environment` (privacy manifests come from the packages);
  - `/privacy` and `/support`;
  - `POST /api/stripe/webhook` (9/9 script checks);
  - Neon `main` migrated (001 and 002);
  - deployed to https://havenly.expo.app, with `origin` in app.json.
- **Found on the way:** EAS Hosting never receives `secret` variables, and EAS can't turn a secret variable into a sensitive one. Every server variable was deleted and created again as **sensitive**, and deploys run with `.env.local` moved aside so its values (Neon dev) aren't used. New sandbox webhook endpoint `we_1UVViy…`; the old `we_1UVUbA…` is disabled.
- **Live check, 2026-10-28** (throwaway Clerk test user against https://havenly.expo.app):
  - stays 200 (24 stays); checkout 200;
  - the PaymentIntent was paid with `pm_card_visa` through Stripe only, and the **webhook alone** confirmed the booking in 4 s;
  - the app's own confirm afterwards returned the same booking (still 1 row);
  - cancel refunded £578;
  - Stripe shows `payment_intent.succeeded` and `charge.refunded` delivered (`pending_webhooks=0`);
  - the row was in Neon `main`, not `dev`;
  - `DELETE /api/account` removed it all (main back to 0 bookings).
- Phone (Android dev build): host mode, saved stays across a force-close, and a sandbox booking + cancel all work.
- Also fixed: Android clipped descenders on tight line heights (`AppText`).
- Left for the user:
  - delete the two earlier deployments in the EAS dashboard (they ran with `.env.local` values), or rotate `SANITY_WRITE_TOKEN`;
  - Clerk production and Stripe go-live: live keys into EAS as sensitive, and a live webhook endpoint.
