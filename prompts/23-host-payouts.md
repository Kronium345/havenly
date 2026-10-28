# 23 · Host payouts with Stripe Connect (host mode phase 3)

Status: approved

## Goal
Host companies are paid their share of each stay automatically. An owner sets up payouts once (Stripe-hosted onboarding); Havenly keeps the guest's payment until about a day after check-in, then sends 85% to the host's Stripe account, which pays out to their bank. Hosts see what's due and what's been paid.

## Decisions
- **Stripe setup** (recommended by Stripe's Connect guidance for a rental marketplace, confirmed with the user):
  - hosts are **Accounts v2** connected accounts with `dashboard: "express"`, `defaults.responsibilities.fees_collector: "application"` and `losses_collector: "application"`;
  - only the `recipient` configuration, requesting `stripe_balance.stripe_transfers`;
  - **separate charges and transfers**: Havenly charges the guest as today and transfers later.
- **Commission:** Havenly keeps 15% of what the guest finally pays (after any refund). The host gets 85%. Stripe's card fees are paid by Havenly out of its 15%. Check the margin report in the Stripe Dashboard and [stripe.com/pricing](https://stripe.com/pricing) for UK rates.
- **Timing:** the host's share is transferred 24 hours after check-in (10:00 UK time the day after check-in). UK platforms can hold funds for at most 90 days, so a booking paid more than 85 days before check-in transfers on day 85 instead. If such a trip is cancelled afterwards, the refund first reverses that transfer back.
- **Holding funds: funds segregation** (user's choice, Stripe preview):
  - PaymentIntents are created with `allocated_funds[enabled]=true` and `transfer_group=<booking id>`, with the `allocated_funds_preview=v1` header on every related request;
  - transfers set `source_transaction=<charge id>`, so automatic payouts of the shared Kronium account can't spend held money;
  - Havenly's 15% moves to the normal balance through the transfer's application fee (or a Balance Transfer). The exact call is confirmed in test mode in step 1, because the preview docs describe both.
  - **Side effect, account-wide:** Stripe bills all transaction fees on the account (Agile Athletes included) as standalone fees debited later. The amounts don't change.
  - If Stripe hasn't enabled the preview for the account, the build **stops at step 1** and reports, without falling back silently.
- **Hosts:** UK only at first (GB, GBP). The connected account id is kept in the host organization's Clerk private metadata (`stripeAccountId`); dev Clerk pairs with the sandbox and production Clerk with live, so one field is enough.
- **Onboarding:** Stripe-hosted Account Links v2, opened in the in-app browser (`expo-web-browser`).
  - `return_url` and `refresh_url` are HTTPS pages on https://havenly.expo.app (`/host-payouts/return`, `/host-payouts/refresh`) that send the owner back into the app (`havenly://host/payouts`).
  - Status is read from the account on return and when the payouts screen opens (no v2 thin-event webhook in this phase).
  - Owners also get an "Open Stripe dashboard" link (Express login link) for bank details and payout history.
- **Bookings ledger (Neon), migration `004_payouts.sql`:** add `host_share`, `transfer_due_at`, `transfer_id`, `transfer_status` (`pending`/`sent`/`reversed`/`failed`/`none`) and `charge_id`.
  - Set at confirmation: `transfer_due_at` = min(check-in + 1 day 10:00 UK, payment + 85 days); `transfer_status` `pending`.
  - Bookings made before this plan (none paid in live yet) get `none`.
- **Transfer job:** `POST /api/jobs/host-transfers`, authorized by a `JOB_SECRET` bearer (sensitive in EAS).
  - It takes due `pending` rows whose host has an active `stripe_transfers` capability and transfers 85% of (amount paid − refunded), with an idempotency key per booking.
  - Hosts not ready stay `pending` and show "Set up payouts to receive £X". A row still unpaid 5 days before the 90-day limit is reported in the job's response and in a PostHog event, for the user to sort out by hand.
  - It runs daily on an **EAS Workflows schedule** (a cron workflow whose job calls the route with curl). The exact workflow syntax is checked against the EAS docs at build time.
- **Cancellations and refunds** (`src/lib/server/refunds.ts` tiers unchanged):
  - before the transfer, the refund comes out of the held funds and the later transfer is 85% of what's left (zero → `none`);
  - after the transfer, the server reverses the host's part of the refund first (`transfer_reversals`), then refunds the guest.
  - Disputes: the platform handles them (it's the merchant of record). Dispute webhooks are out of scope, but the user is told to watch disputes in the Dashboard.
- **Host app:**
  - "Payouts" row in host mode (owners only): status (Not set up / Pending verification / Active), "Set up payouts" or "Continue setup", "Open Stripe dashboard";
  - the bookings list shows each booking's payout state (Due 12 Nov · £245, Paid 13 Nov, Not due).
- **Webhook:** the existing `/api/stripe/webhook` also stores `charge_id` from `payment_intent.succeeded`. `transfer.reversed` is logged only.
- **Stripe Dashboard (user):**
  - Connect platform profile: confirm Havenly's use case and acknowledge negative balance liability;
  - ask Stripe to enable funds segregation if the preview needs it;
  - Radar is on by default; set a review rule for high-risk payments.

## Out of scope
- Hosts outside the UK, multiple currencies, guest service fees.
- Embedded onboarding inside the app (Stripe's mobile SDKs aren't in React Native).
- v2 thin-event webhooks, automatic dispute handling, tax forms, invoices to hosts.

## Steps
### 1. Stripe sandbox check
In the "Havenly dev" sandbox, with a scratch script:
1. create an Accounts v2 recipient account and an onboarding link, completing it with Stripe's test data;
2. create a PaymentIntent with allocated funds and pay it with `pm_card_visa`;
3. transfer 85% with `source_transaction`, collect 15%, then refund before and after a transfer.

Record the exact parameters and the `Stripe-Version` used in the plan. Stop if allocated funds aren't available.

### 2. Server
1. `src/lib/server/connect.ts`: create or retrieve the account, Account Link, login link and status.
2. Routes `GET|POST /api/host/payouts` and `POST /api/host/payouts/link` (owner only).
3. Migration 004 on `dev`.
4. Checkout adds the allocated-funds parameters.
5. `createPaidBooking` and the webhook store `charge_id`, `host_share` and `transfer_due_at`.
6. Cancel handles reversals.
7. `src/lib/server/host-transfers.ts` plus the job route.
8. Pages `src/app/host-payouts/return.tsx` and `refresh.tsx`.

### 3. App
1. `src/screens/host/host-payouts-screen.tsx`, route `src/app/(app)/host/payouts.tsx`, opened from the host home.
2. Payout states in `host-booking-row.tsx`.
3. Loading, error and empty states.

Checked on the phone with Argent.

### 4. Schedule and deploy
1. `.eas/workflows/host-transfers.yml` (daily cron).
2. The user adds `JOB_SECRET` to EAS production (a script with hidden input, as before).
3. Migration on `main`, then `deploy-prod.ps1`.

## Verification
- tsc and lint pass.
- **Sandbox script:**
  - onboarding to active;
  - a booking paid → `pending` with the right due date and share;
  - the job before the due date does nothing; after it, it transfers exactly 85% once (rerun: no second transfer);
  - Flexible cancel before the transfer refunds the guest from held funds, and the transfer becomes 0 (`none`);
  - a Moderate 50% refund before the transfer: the transfer is 85% of the rest;
  - a refund after the transfer reverses the host's part, then refunds;
  - a host not set up stays `pending`;
  - the job without `JOB_SECRET` gets 401.
- **Phone (dev build):** as Lena's owner, set up payouts with Stripe test data, see Active; a guest test booking shows "Due …" in host Bookings.
- **Production:** the user onboards their own host company with real details; one real small booking is transferred after check-in, or tested by setting a near due date in a sandbox rehearsal first.

## AGENTS.md updates
- **Bookings / Stripe:** separate charges and transfers with funds segregation; the 15% commission; transfer timing (check-in + 1 day, 85-day cap); refunds and reversals; `JOB_SECRET` job and EAS Workflows schedule.
- **Hosting:** phase 3 payouts (Accounts v2 recipient, Express dashboard, the organization's `stripeAccountId`, owner-only payouts screen).
- **Rules:** add `JOB_SECRET` to the secret list.

## Result (stopped at step 1, as planned)
- Sandbox check (`connect-gate.mjs` in the session scratchpad) against "Havenly dev":
  - **Accounts v2:** creating the recipient account failed with `non_connect_platform_accounts_v2_access_blocked`. The sandbox isn't a Connect platform yet; the user needs to finish Connect platform setup in the sandbox Dashboard.
  - **Funds segregation:** the PaymentIntent with `allocated_funds` was refused with "You do not have permission to pass this beta header: allocated_funds_preview". The preview isn't enabled for the account, so per this plan the build stops.
- Confirmed from the docs for when it resumes:
  - v2 calls send `Stripe-Version: 2026-09-30.endive` with JSON bodies;
  - allocated-funds calls send `Stripe-Version: 2026-09-30.preview; allocated_funds_preview=v1`;
  - the transfer `amount` is the host's 85% and `application_fee_amount` the 15%, moved from allocated funds into the platform balance;
  - transfer reversals return money to the allocated state;
  - the UK holding limit is 90 days.
- Nothing was created in either account.
