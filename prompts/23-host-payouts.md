# 23 · Host payouts with Stripe Connect (host mode phase 3)

Status: done

## Goal
Host companies are paid their share of each stay automatically. An owner sets up payouts once (Stripe-hosted onboarding). When a guest pays, 85% moves to the host's Stripe balance, where it waits; about a day after check-in Havenly pays it out to the host's bank. Hosts see what's waiting and what's been paid.

## Decisions
- **Stripe setup** (Stripe's Connect guidance for a rental marketplace; the sandbox platform questionnaire: "Buyers will purchase from you", "Payouts can be split between sellers", Stripe-hosted onboarding):
  - hosts are **Accounts v2** connected accounts with `dashboard: "express"`, `defaults.responsibilities.fees_collector: "application"`, `losses_collector: "application"`, `identity.country: "gb"`, `defaults.currency: "gbp"`;
  - only the `recipient` configuration, requesting `stripe_balance.stripe_transfers`;
  - **separate charges and transfers**: Havenly charges the guest as today and transfers to the host itself.
  - API: v2 calls send `Stripe-Version: 2026-09-30.endive` with JSON bodies; v1 calls stay as today.
- **Commission:** Havenly keeps 15% of what the guest finally pays (after any refund). The host gets 85%. Stripe's card fees are paid by Havenly out of its 15%. Check the margin report in the Stripe Dashboard and [stripe.com/pricing](https://stripe.com/pricing) for UK rates.
- **Holding funds: in the host's own Stripe balance** (user's choice after Stripe didn't enable funds segregation; no preview needed):
  - a host account's payouts are set to **manual** as soon as it's created (`POST /v1/balance_settings` with `Stripe-Account: <host>`, `payments[payouts][schedule][interval]=manual`; checked in the sandbox);
  - when a booking is paid and the host's `stripe_transfers` capability is active, Havenly **transfers 85% straight away** (`POST /v1/transfers`, `destination=<host>`, `source_transaction=<charge>`, `transfer_group=<booking id>`). The money leaves Havenly's balance, so the shared Kronium account's Monday payouts can't touch it, and Agile Athletes is unaffected;
  - the money then waits in the host's balance until the **payout**: `POST /v1/payouts` as the host for that booking's share, 10:00 UK time the day after check-in;
  - UK funds can wait in a host balance for at most 90 days, so the payout happens at whichever comes first: the day after check-in, or 85 days after the transfer.
- **Host not set up yet when a guest pays:** Havenly keeps the payment in its own balance (status `awaiting_host`). When the host's account becomes active, the daily job sends the catch-up transfer. If Havenly's balance can't cover it (for example after a Monday payout), the transfer fails and the job retries the next day. Bookings for stays with no linked host company keep today's behaviour: no transfer at all.
- **Hosts:** UK only at first (GB, GBP). The connected account id is kept in the host organization's Clerk private metadata (`stripeAccountId`); dev Clerk pairs with the sandbox and production Clerk with live, so one field is enough.
- **Onboarding:** Stripe-hosted Account Links v2 (`POST /v2/core/account_links`, `use_case.type: "account_onboarding"` with `return_url` and `refresh_url` only), opened in the in-app browser (`expo-web-browser`).
  - `return_url` and `refresh_url` are HTTPS pages on https://havenly.expo.app (`/host-payouts/return`, `/host-payouts/refresh`) that send the owner back into the app (`havenly://host/payouts`).
  - Status is read from the account (`include: configuration.recipient, requirements`) on return and when the payouts screen opens. There's no v2 thin-event webhook in this phase.
  - Owners also get an "Open Stripe dashboard" link (Express login link) for bank details and payout history.
- **Bookings ledger (Neon), migration `004_payouts.sql`:** add
  - `charge_id`, `host_share` (whole pounds), `transfer_id`;
  - `transfer_status`: `none` / `awaiting_host` / `sent` / `failed`;
  - `payout_due_at`, `payout_id`;
  - `payout_status`: `none` / `pending` / `paid` / `failed`.

  Set at confirmation. Bookings made before this plan get `none`.
- **Daily job:** `POST /api/jobs/host-payouts`, authorized by a `JOB_SECRET` bearer (sensitive in EAS). With an idempotency key per booking and step, it:
  1. sends catch-up transfers for `awaiting_host` rows whose host is now active;
  2. pays out `sent` rows whose `payout_due_at` has passed, if the host's available balance covers that booking's share; otherwise it waits for the funds to settle and retries the next day.

  A payout still waiting 5 days before the 90-day limit is reported in the job's response and as a PostHog event, for the user to sort out by hand. The job runs daily on an **EAS Workflows schedule** (a cron workflow whose job calls the route with curl); the exact workflow syntax is checked against the EAS docs at build time.
- **Cancellations and refunds** (`src/lib/server/refunds.ts` tiers unchanged). The host's share is always 85% of (paid − refunded).
  - Before the payout, the money is still in the host's balance: reverse the extra (`POST /v1/transfers/<id>/reversals`), then refund the guest from Havenly's balance as today. A full refund reverses the whole transfer, and the booking's payout becomes `none`.
  - After the payout (only refunds after check-in, which the policies mostly don't give), the reversal can take the host's balance below zero. Havenly is responsible for that (platform losses); it's recovered from the host's later bookings. It's logged so the user can follow up.
  - **Disputes:** Havenly handles them (it's the merchant of record). Dispute webhooks are out of scope; the user watches disputes in the Dashboard.
- **Host app:**
  - "Payouts" row in host mode (owners only): status (Not set up / Pending verification / Active), "Set up payouts" or "Continue setup", "Open Stripe dashboard";
  - the bookings list shows each booking's payout state ("Waiting · paid out 12 Nov", "Paid 13 Nov", "Set up payouts to receive £X").
- **Webhook:** the existing `/api/stripe/webhook` stores `charge_id` from `payment_intent.succeeded` and runs the same transfer step as `POST /api/bookings`, so whichever confirms first transfers once.
- **Stripe Dashboard (user):** Radar is on by default; set a review rule for high-risk payments. The sandbox Connect platform setup is done.

## Out of scope
- Hosts outside the UK, multiple currencies, guest service fees.
- Embedded onboarding inside the app (Stripe's mobile SDKs aren't in React Native).
- Funds segregation (not enabled for the account).
- v2 thin-event webhooks, automatic dispute handling, tax forms, invoices to hosts.

## Steps
### 1. Stripe sandbox check (done)
Recorded in the Result below. Accounts v2 recipient accounts, onboarding links, manual payouts and reading a host's balance all work in "Havenly dev". The end-to-end transfer and payout run is part of Verification, because it needs an onboarded test account.

### 2. Server
1. `src/lib/server/connect.ts`:
   - create the account and set manual payouts, or retrieve it;
   - status;
   - Account Link and Express login link;
   - transfer, reversal and payout helpers.
2. Routes `GET|POST /api/host/payouts` and `POST /api/host/payouts/link` (owner only).
3. Migration 004 on `dev`.
4. `createPaidBooking` and the webhook store `charge_id`, `host_share` and `payout_due_at`, and transfer (or mark `awaiting_host`).
5. Cancel reverses before refunding.
6. `src/lib/server/host-payouts.ts` plus the job route.
7. Pages `src/app/host-payouts/return.tsx` and `refresh.tsx`.

### 3. App
1. `src/screens/host/host-payouts-screen.tsx`, route `src/app/(app)/host/payouts.tsx`, opened from the host home.
2. Payout states in `host-booking-row.tsx`.
3. Loading, error and empty states.

Checked on the phone with Argent.

### 4. Schedule and deploy
1. `.eas/workflows/host-payouts.yml` (daily cron).
2. The user adds `JOB_SECRET` to EAS production (a script, as before).
3. Migration 004 on `main` (Neon MCP), then `deploy-prod.ps1`.
4. The live Stripe account also needs its Connect platform setup (the same questionnaire as the sandbox) before live hosts can onboard.

## Verification
- tsc and lint pass.
- **Sandbox script, with a host account onboarded using Stripe's test data:**
  - payouts are manual right after creation;
  - a booking paid → 85% transferred once with `source_transaction`, `payout_status` `pending` with the right due date;
  - the job before the due date does nothing; after it, it pays out exactly that share once (rerun: no second payout);
  - Flexible cancel before the payout reverses the whole transfer and refunds the guest in full;
  - a Moderate 50% refund: the reversal leaves the host 85% of the rest;
  - a host not set up → `awaiting_host`, then a catch-up transfer once active;
  - the job without `JOB_SECRET` gets 401.
- **Phone (dev build):** as Lena's owner, set up payouts with Stripe test data, see Active; a guest test booking shows its payout state in host Bookings.
- **Production:** the user onboards their own host company with real details; one real small booking is paid out after check-in.

## AGENTS.md updates
- **Bookings / Stripe:** separate charges and transfers; 85% transferred at payment into the host's balance with manual payouts, paid out the day after check-in (85-day cap); `awaiting_host`; reversals before refunds; the 15% commission; the `JOB_SECRET` job and EAS Workflows schedule.
- **Hosting:** phase 3 payouts (Accounts v2 recipient, Express dashboard, the organization's `stripeAccountId`, owner-only payouts screen).
- **Rules:** add `JOB_SECRET` to the secret list.

## Result so far
- **First check, with funds segregation:** stopped. The sandbox wasn't a Connect platform (`non_connect_platform_accounts_v2_access_blocked`), and `allocated_funds_preview` isn't enabled for the account.
- **After the user's sandbox Connect setup (2026-10-28):**
  - creating a v2 recipient account works (`stripe_transfers` "restricted" until onboarding);
  - an onboarding link works (`connect.stripe.com`). `use_case.account_onboarding.configurations` isn't an accepted field;
  - closing an account needs `applied_configurations: ["recipient"]`;
  - **manual payouts work:** `balance_settings` set and read back `interval=manual` as the host, and the host's balance can be read;
  - funds segregation is still refused, so the design moved to holding funds in the host's balance (user's choice).

  All test accounts were closed.

## Result
- Built:
  - `db/migrations/004_payouts.sql` (applied to `dev`; amounts in pence);
  - `src/lib/server/connect.ts` (v2 accounts, manual payouts on creation, Account Links, Express login links, transfer, reversal, balance, payout);
  - `src/lib/server/host-payouts.ts` (`onBookingPaid`, `beforeRefund`, `runPayoutJob`);
  - `bookings.ts` wiring: both confirm paths, and reverse-before-refund on cancel;
  - `stripeRequest` gained `stripeAccount`;
  - routes `api/host/payouts` (GET), `api/host/payouts/link` (POST onboarding or dashboard) and `api/jobs/host-payouts` (POST, `JOB_SECRET`);
  - pages `host-payouts/return` and `refresh`;
  - `host-payouts-screen.tsx` with an owner-only Payouts row on the host home; payout lines on host booking rows (`formatPence`);
  - `.eas/workflows/host-payouts.yml` (10:15 GMT daily).
- Sandbox, 13/13 plus the time check:
  - Lena's dev account was created by the app code with manual payouts, then onboarded in Chrome with Stripe's test data and became active;
  - a booking paid with `pm_card_bypassPending` transferred exactly 85% at once from its charge; confirming again made no second transfer;
  - the job paid nothing before the due date, then paid exactly the share once (rerun: no second payout);
  - a full cancellation reversed the whole transfer before refunding;
  - a host without an account → `awaiting_host`, then the job's catch-up transfer;
  - host bookings show paid, none and waiting states;
  - the due time is 10:00 UK the day after check-in (10:00 UTC in winter, 09:00 UTC in summer), or 85 days after the transfer when that's sooner (seen on a check-in 150 days away).
  - Test bookings and the test guest were removed. Lena's sandbox host account stays onboarded for the phone check; its balance may show test reversals.
- Phone (dev build, Argent):
  - Lena owner: the Payouts row shows, status Active, and "Open Stripe dashboard" opens Lena's Express dashboard (test mode);
  - a guest booking of Palm Villa (£450, saved test card) transferred 38,250p at once, with the payout due 2026-11-18 10:00 UK;
  - host Bookings shows "You get £382.50 · paid out Wed 18 Nov";
  - cancelling in the app refunded £450 and reversed the host's share to 0 (payout none).
- Production (2026-10-29):
  - the live Stripe account is a Connect platform (the user ran the questionnaire);
  - `JOB_SECRET` is in EAS (sensitive);
  - migration 004 is on Neon `main` through the Neon MCP (recorded; 8 columns and the index match);
  - redeployed: `/api/host/payouts` and `/link` answer 401 without a session; `/api/jobs/host-payouts` answers 401 with no secret or a wrong one; `/host-payouts/return` and `/refresh` serve the hand-back page.
- Not checked: a live host onboarding and a real paid-out booking (needs a production build and a real host), and a scheduled run (needs a paid EAS plan and a linked GitHub repository; `npx eas-cli@latest workflow:run .eas/workflows/host-payouts.yml` runs it by hand).
