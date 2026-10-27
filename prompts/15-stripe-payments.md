# 15 · Stripe: pay at booking, saved cards, refunds

Status: approved

## Goal
Booking a stay takes a real (test-mode) card payment through Stripe's PaymentSheet, and the trip is only saved once Stripe confirms the payment. Profile → Payment methods lists saved cards, adds a card and removes one. Cancelling a trip refunds automatically, by the stay's cancellation tier.

## Decisions
- **Scope:** pay at booking plus saved cards (user's choice). Stripe's native PaymentSheet (`@stripe/stripe-react-native`, the SDK-58 version from `npx expo install`), following the pattern in `oq-agile-athletes`:
  - a `StripeProvider` scoped to the screens that pay;
  - a `paymentSheet.ts` with a `.web.ts` sibling, because the native module throws on web;
  - card only. No Apple Pay (it needs a merchant id) or Google Pay for now.
- **Keys** (new; the user creates them in a Stripe test-mode account):
  - `STRIPE_SECRET_KEY` (sk_test) is server only, for API routes, and is added to the AGENTS secret-key rule.
  - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test) is safe to bundle.
  - Without them, booking explains that payments aren't set up, as oq does, instead of crashing.
- **Server calls Stripe's REST API with plain `fetch`** (form-encoded, `Stripe-Version` pinned, `Idempotency-Key` on writes). No `stripe` npm package. That keeps the API routes small and EAS Hosting (Workers) friendly.
- **One Stripe Customer per guest.** It's created on first payment, and its id is stored in Clerk `privateMetadata.stripeCustomerId`. The app never sees the customer's other data.
- **Booking flow:**
  1. `POST /api/bookings/checkout` `{ slug, checkIn, checkOut, guests }` → runs today's checks (dates, nights, guests, overlaps). It works out the total from Sanity in pence (GBP), then creates a PaymentIntent (amount, `currency: gbp`, `customer`, metadata `{ userId, slug, checkIn, checkOut, guests }`) and an ephemeral key. It returns `{ paymentIntentClientSecret, customerEphemeralKeySecret, customerId, total }`.
  2. The app opens the PaymentSheet: saved cards are offered, and a new card can be saved for later.
  3. On success, `POST /api/bookings` `{ paymentIntentId }`. The server retrieves the PaymentIntent and checks: status `succeeded`, metadata `userId` equals the session user, and not already booked. It runs the overlap check again, then saves the booking with `paymentIntentId` and `amountPaid`.
  4. If the trip can no longer be saved (for example a new overlap), the server refunds in full and returns an error.
  5. Cancelled or failed sheets save nothing.
- **Refunds by tier.**
  - `POST /api/bookings/<id>/cancel` works out the refund in code from the stay's cancellation policy, using the rules stated in Havenly's policy text:
    - **Flexible:** ≥24 h before check-in, full refund; <24 h, everything but the first night.
    - **Moderate:** ≥7 days, full; 7 days–24 h, 50% of the nightly total; <24 h, none.
    - **Strict:** ≥14 days, full; 14–7 days, 50%; <7 days, none.
  - The policy is matched by its Sanity `_id`, saved on the booking at checkout so later edits don't change old trips.
  - The rules live in one table, `src/lib/server/refunds.ts`, which AGENTS says to keep in sync with the policy text.
  - It creates a Stripe Refund for that amount (none if 0) and saves `refunded` on the booking.
  - Trips shows "Refunded £X" or "No refund (Strict, less than 7 days)".
- **Old bookings** (saved before payments) have no `paymentIntentId`. They cancel as today with nothing to refund, and Trips labels them "Booked before payments".
- **Payment methods screen** (`/payment-methods`, from Profile):
  - `GET /api/payment-methods` lists cards (brand, last 4, expiry).
  - `POST /api/payment-methods/setup` returns a SetupIntent plus an ephemeral key for the PaymentSheet in setup mode, to add a card.
  - `DELETE /api/payment-methods/<id>` detaches a card after checking it belongs to the guest's customer.
  - States: loading, empty ("No saved cards"), error.
- **Booking screen copy:** "You won't be charged yet…" becomes the total and "Pay £X". Confirming opens the sheet; success shows the existing "Trip booked" toast.
- **Security:**
  - Amounts always come from Sanity on the server.
  - The app only ever receives client secrets.
  - Card details never touch our code (PaymentSheet).
  - Stripe errors reach the guest as Stripe's message plus a toast.
- **PostHog:**
  - `booking_payment_started`, `booking_confirmed` (adds `paid: true`), `booking_cancelled` (adds `refund_tier` and `refunded: boolean`), `payment_method_added` and `payment_method_removed`.
  - Ids and enums only; never amounts tied to identity, and never card data.
- **Native:**
  - Add the `@stripe/stripe-react-native` config plugin to `app.json`, with the `havenly` URL scheme for 3-D Secure returns.
  - Add the Android ProGuard rules from oq if a release build needs them.
  - **A new EAS dev build is required**; Expo Go can't run it.
- New dependency: `@stripe/stripe-react-native` only.

## Out of scope
- Apple Pay and Google Pay.
- Webhooks: the booking is verified synchronously by retrieving the PaymentIntent. Webhooks come before production, when guests might close the app mid-payment.
- Live keys and payouts to hosts (Stripe Connect).
- Cleaning fees and taxes: stays have none yet.

## Steps
### 1. Server: Stripe client and customers
`src/lib/server/stripe.ts`:
- `stripeRequest(method, path, params)`;
- `ensureCustomer(userId)`, which uses Clerk metadata;
- `ephemeralKey(customerId)`.

Done when a script creates a test customer and an ephemeral key.

### 2. Checkout and paid booking
- `checkout+api.ts`.
- `createBooking` takes a `paymentIntentId`, verifies it and stores the payment fields.
- The `Booking` type gains `paymentIntentId?`, `amountPaid?`, `refunded?` and `policyId?`.

Done when a script pays with test card `pm_card_visa` and the booking saves, and a second save with the same PaymentIntent is refused.

### 3. Refunds on cancel
`refunds.ts`, plus `cancelBooking` creating the refund.

Done when scripts cover every tier boundary (exactly 24 h, 7 days and 14 days) and a real test refund.

### 4. App: provider, sheet, booking screen
- Install the package; add the plugin and env names.
- Add `StripeProvider` on the booking and payment-method screens, and `paymentSheet.ts` with its `.web.ts` sibling.
- `book-screen.tsx`: pay, then confirm.
- Trips shows the refund line.

Done when lint and tsc pass.

### 5. Payment methods
- The routes, `src/screens/profile/payment-methods-screen.tsx` and the route file.
- The Profile row opens it.

Done when lint and tsc pass.

## Verification
- tsc and lint pass. The scripts from steps 1–3 pass with Stripe test keys.
- **On the phone, after the user's new EAS dev build:**
  - Book Wooden Beach Lodge with test card 4242 4242 4242 4242 → the PaymentSheet shows the right total, and the trip appears in Trips.
  - Book with 4000 0027 6000 3184 (3-D Secure) → the authentication step returns to the app.
  - Book with 4000 0000 0000 9995 (declined) → no trip, and Stripe's message shows.
  - Cancel a Flexible trip more than 24 h out → full refund, visible in the Stripe dashboard.
  - Payment methods: the saved card is listed; add a second, remove one.
- Web: booking explains that payment needs the app, and nothing crashes.

## AGENTS.md updates
- **Bookings:** paid through Stripe. The server-side flow is checkout, then the PaymentIntent is verified before saving. Refunds go by tier through `refunds.ts`, kept in sync with the policy text. The customer id is stored in Clerk private metadata.
- **Who owns what:** add **Payments: Stripe**.
- **Rules:** `STRIPE_SECRET_KEY` joins the secret list. Amounts are computed on the server only, and card data never touches our code.

## Result (in progress)
Steps 1–5 are built. tsc and lint pass. Status stays `approved` until the Stripe-key script tests and the phone test on a new EAS dev build pass.
- **Package:** `@stripe/stripe-react-native` 0.81.0 (the SDK-58 version). Its config plugin is `["@stripe/stripe-react-native", { "enableGooglePay": false }]`; listing it without options crashes `expo config` (it reads `merchantIdentifier` from undefined).
- **Changes from the plan,** following Stripe's current docs:
  - PaymentSheet uses a **CustomerSession** (`customerSessionClientSecret`, with the save, redisplay and remove features on) instead of the older ephemeral key.
  - No `Stripe-Version` header, so the account's default version is used.
  - The 3-D Secure test card is 4000 0025 0000 3155.
- **Routes:**
  - `checkout+api.ts`;
  - `POST /api/bookings` now takes `{ paymentIntentId }` only, so unpaid bookings are no longer possible;
  - `/api/payment-methods` (GET), `/setup` (POST) and `/<id>` (DELETE).
- **Screens:**
  - **Book:** the button reads "Pay £X" and the copy says it charges now.
  - **Trips:** each card shows "Paid £X by card", "Refunded £X", "No refund under this stay's policy" or "Booked before payments".
  - **Payment methods:** list, add (setup mode), remove behind a confirmation sheet.
- **Refund rules** (`refunds.ts`): all 12 boundary cases pass (exactly 24 h, 7 days and 14 days, after check-in, unknown tier).
- **Not yet run:** the Stripe calls themselves (no `STRIPE_SECRET_KEY` / `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local` yet) and any phone check (needs the new EAS dev build).
- **Stripe sandbox tests** (2026-10-27): "Havenly dev" sandbox `acct_1UVAskHiDetHWoXq`, blank and GB, created under the user's account with the Stripe CLI. Test keys are in `.env.local`. All 13 pass, through the real server functions:
  1. Checkout prices 2 nights from Sanity (£550, GBP, card only) and returns the PaymentIntent and CustomerSession secrets.
  2. An unpaid PaymentIntent can't book (402).
  3. Paying with `pm_card_visa` saves the trip.
  4. The same payment returns the same trip.
  5. Another guest can't claim the payment (404).
  6. A declined card returns "Your card was declined."
  7. An overlapping trip is refused before paying (409).
  8. Flexible, cancelled 40 days out: full £550 refunded in Stripe.
  9. Strict, cancelled 10 days out: £520 of £1,040 refunded in Stripe.
  10. Setup mode saves Mastercard 4444 and it's listed.
  11. Someone else's card can't be removed (404).
  12. Cards are removed.
  13. The test user's metadata was restored afterwards.
- **Fixed while testing:** newer Stripe accounts reject `payment_method_types` ("no longer supported"), so PaymentIntents and SetupIntents use `allowed_payment_method_types: ["card"]`.
