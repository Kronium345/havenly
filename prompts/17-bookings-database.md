# 17 · Bookings in Neon Postgres

Status: approved

## Goal
Bookings live in one shared Postgres database instead of each guest's Clerk metadata, so:
- **two guests can never book the same stay for overlapping dates** (the database refuses it);
- dates are held for 15 minutes while a guest pays;
- hosts and production tooling can later query bookings across guests.

Guests see no change except a clear message when dates are taken.

## Decisions
- **Neon Postgres** (user's choice; a new service) through `@neondatabase/serverless`, the HTTP driver: `neon(DATABASE_URL)`, tagged-template queries only (values are always parameters), and `sql.transaction([...])` for multi-statement writes. It runs on EAS Hosting's Workers runtime.
  - `DATABASE_URL` is a **server-only secret** (AGENTS secret list, `.env.example`, EAS environment).
  - Two Neon branches: `dev` (`.env.local`) and `main` (production, EAS only).
- **Schema** (`db/migrations/001_bookings.sql`, applied by `scripts/db-migrate.mjs`):
  - `bookings`: `id uuid PK`, `user_id text`, `stay_id text`, the stay snapshot (`slug`, `title`, `city`, `region`, `image_url`), `check_in date`, `check_out date`, `nights`, `guests`, `price_per_night`, `total`, `status` (`held` | `confirmed` | `cancelled` | `expired`), `held_until timestamptz`, `payment_intent_id text UNIQUE`, `amount_paid`, `policy_title`, `refunded`, `created_at`.
  - **Two exclusion constraints** (`btree_gist`), both only over rows that are `held` or `confirmed`:
    - `EXCLUDE (stay_id WITH =, daterange(check_in, check_out) WITH &&)`: no double booking of a stay;
    - `EXCLUDE (user_id WITH =, daterange(...) WITH &&)`: a guest can't hold two trips on the same nights (today's rule).
  - Indexes on `user_id` and `payment_intent_id`. Money stays in whole pounds, as today.
- **15-minute holds** (user's choice):
  - `POST /api/bookings/checkout` checks the trip as today (dates, guests, Sanity price).
  - In one transaction it (1) marks this stay's and this guest's stale holds (`held_until < now()`) as `expired` and (2) inserts a `held` row with `held_until = now() + 15 min`.
  - An exclusion violation (Postgres `23P01`) means "Those dates were just booked. Pick different dates." (409).
  - Then the PaymentIntent is created with `metadata.bookingId`, and its id is saved on the row. If Stripe fails, the hold is deleted.
- **Confirming:** `POST /api/bookings` `{ paymentIntentId }` checks the PaymentIntent as today (succeeded, this guest, amount), then sets the row `confirmed`, with paid amount and policy.
  - Repeat calls return the same booking.
  - If the hold had expired and someone else took the dates meanwhile, the update hits the exclusion constraint, so the payment is refunded in full with a clear message (as today).
- **Releasing:** when the guest closes the PaymentSheet without paying, the app calls `POST /api/bookings/<id>/release` to free the hold at once. Otherwise it expires on its own after 15 minutes.
- **Cancelling:** unchanged rules (refund by tier through `refunds.ts`). The row becomes `cancelled` with `refunded`.
- **Listing:** `GET /api/bookings` returns the guest's `confirmed` and `cancelled` rows, mapped to the existing `Booking` type, so Trips, Profile and reminders don't change. The 40-booking cap goes.
- **Every query filters by the session's `user_id`**; nothing reads another guest's rows (hosts come in a later plan).
- **Migration** (user's choice):
  - `scripts/migrate-clerk-bookings.mjs` copies each Clerk user's `privateMetadata.bookings` into the table (`ON CONFLICT DO NOTHING`, statuses kept) and reports any row the constraints refuse.
  - Deleting the Clerk copies is a **separate step, run only after the user checks the data** (AGENTS: ask before deleting data).
- **Saved stays stay in Clerk** (user's choice).
- **New dependency:** `@neondatabase/serverless` only. The user creates the Neon project and `dev` branch and puts the `dev` connection string in `.env.local` as `DATABASE_URL`.

## Out of scope
- Hosts reading bookings, which needs Clerk Organizations; that's the next plan.
- Search filtering by availability.
- Stripe webhooks (still needed before going live).
- Production Neon setup, beyond naming the `main` branch.

## Steps
### 1. Database client and migration
- `src/lib/server/db.ts`: a `sql` client from `DATABASE_URL`, throwing a clear error when it's missing.
- `db/migrations/001_bookings.sql` and `scripts/db-migrate.mjs`, which runs pending files and records them in a `schema_migrations` table.

Done when the migration runs against the `dev` branch and `\d bookings` shows both constraints.

### 2. Bookings server on Postgres
Rewrite `src/lib/server/bookings.ts` storage: `listBookings`, `startCheckout` (with the hold), `createPaidBooking`, `releaseHold`, `cancelBooking`. Same exported shapes and error messages, and the Stripe and refund code stays as it is.

Done when tsc passes.

### 3. Route and app
- Add `bookings/[id]/release+api.ts`.
- `book-screen.tsx` calls release when the sheet is cancelled or fails.
- `CheckoutSession` gains `bookingId`.

Done when lint and tsc pass.

### 4. Migrate existing bookings
Run the script on `dev` and report counts. Clerk copies stay until the user approves deleting them.

## Verification
- tsc and lint pass.
- **Script against the Neon `dev` branch and the Stripe sandbox:**
  1. Two different test users check out the same stay and dates: the second gets 409 before paying.
  2. One guest holds two different stays on the same nights: the second gets 409.
  3. A hold older than 15 minutes (backdated in the test) no longer blocks.
  4. Paying with `pm_card_visa` confirms the trip; repeating returns the same trip.
  5. Releasing frees the dates at once.
  6. Cancelling refunds by tier (Flexible full, Strict 50%).
  7. An expired hold whose dates were taken: the payment is refunded and an error returned.
  8. Afterwards the test users' rows and Stripe objects are cleaned up.
- **Migration:** count of Clerk bookings equals rows copied, plus a list of anything refused.
- **Phone (iOS dev build):** book a stay → Trips shows it; cancel → refund line; open the PaymentSheet and dismiss it → the same dates can be booked again straight away.

## AGENTS.md updates
- **Bookings:** Neon Postgres (`DATABASE_URL`, `src/lib/server/db.ts`), exclusion constraints, 15-minute holds, the release route, and migrations in `db/migrations` (`node scripts/db-migrate.mjs`). Replace the Clerk-metadata bookings description; saved stays stay in Clerk.
- **Who owns what:** add "Data: Neon Postgres for bookings".
- **Rules:** `DATABASE_URL` joins the secret list. Every booking query filters by the session user.
- **Commands:** `node --env-file=.env.local scripts/db-migrate.mjs`.
