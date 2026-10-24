# 07 · Booking and Trips

Status: done

## Goal
A guest taps "Book this stay", picks check-in and check-out dates and the number of guests, sees the price worked out, and confirms (no payment yet). The booking is saved to their account and appears on the Trips tab under Upcoming; past and cancelled trips move to Past, and hearted stays show under Saved. Upcoming bookings can be cancelled.

## Decisions
- **Scope (user choice):** booking + Trips, no payment. Copy on the confirm screen: "You won't be charged yet. Payment is coming next."
- **Storage (user choice):** Clerk **private metadata** on the signed-in user, `privateMetadata.bookings: Booking[]`. Only API routes read or write it, with `CLERK_SECRET_KEY` through `createClerkClient` from `@clerk/backend` (already installed). The app never sees other users' bookings. Clerk keeps metadata small (about 8 KB), so a user can hold at most 40 bookings; past that the route answers "You have too many bookings saved." Read with `users.getUser`, write the whole list back with `users.updateUserMetadata` (arrays are replaced, not merged).
- **Booking shape:** `{ id, stayId, slug, title, place, imageUrl, checkIn, checkOut, nights, guests, pricePerNight, total, status: "confirmed" | "cancelled", createdAt }`. Dates are `YYYY-MM-DD` (the guest's local calendar date). `id` from `crypto.randomUUID()`. Title, place and image are copied at booking time so Trips loads without a Sanity round trip; `stayId`/`slug` link back to the stay.
- **Prices are worked out on the server:** the route loads the stay from Sanity by `stayId` and computes `nights × pricePerNight` itself; the app's figure is display only. No cleaning fee or taxes (there's no such data; nothing is invented). Pounds via `formatPrice`.
- **Validation (server, then shown in one toast):** check-in not before today (one day of slack for time zones), check-out after check-in, 1–30 nights, guests 1–`maxGuests` of the stay, stay exists. No availability check: there is no availability data, and other guests' bookings live on their own accounts. The route refuses a booking that overlaps one of your own confirmed bookings at any stay ("You already have a trip on those dates.").
- **API routes (session checked first, as always):**
  - `GET /api/bookings` → your bookings, newest check-in first.
  - `POST /api/bookings` `{ stayId, checkIn, checkOut, guests }` → the saved booking (201).
  - `POST /api/bookings/<id>/cancel` → the booking with `status: "cancelled"`. Only upcoming confirmed bookings can be cancelled.
  - Code lives in `src/lib/server/bookings.ts`; screens never import it.
- **Book screen, `/stay/[slug]/book`** (no design: built from the design system and `property-details.png`'s language):
  - Header like the Policies screen (outline back button, `hero` title "Book this stay").
  - Stay row: photo thumbnail (`rounded-lg`), title (`headline`), place (`caption`).
  - Dates: new shared `DateRangeCalendar` (`src/components/ui/`, added to `/design-system`): month title with previous/next `IconButton`s, Monday-first weekday row (UK), day grid; days before today are disabled; first tap sets check-in, second sets check-out, a tap before check-in restarts; check-in/out days `bg-primary`, days between `bg-primary-tint`; each day is a button labelled like "Friday 14 November, check-in". Under it: "Fri 14 Nov → Mon 17 Nov · 3 nights".
  - If the guest came from a search with a length ("3 nights"), the hint reads "You searched for 3 nights", with no dates picked for them.
  - Guests: `Stepper` 1 to the stay's `maxGuests` ("Sleeps 4").
  - Price: "£289 × 3 nights" and "£867" rows, then "Total £867" (`headline`).
  - Cancellation: the stay's cancellation policy summary with "Read policy" → Policies screen.
  - Bottom bar like details: total on the left, primary `Button` "Confirm booking" (`loading` while saving), disabled until dates are picked.
  - On success: toast "Trip booked." with "See it in Trips.", then go to the Trips tab (Upcoming).
- **Details screen:** "Book this stay" opens the book screen (replacing the toast), passing `nights` through if present.
- **Bookings in the app:** `src/lib/bookings.tsx`, a context in `(app)/_layout.tsx` that loads `GET /api/bookings` once and exposes `bookings`, `status`, `retry`, `book(input)` and `cancel(id)`, updating its list from each response. Trips and the book screen share it, so a new booking shows on Trips without reloading.
- **Saved stays:** `saved-stays` stores the stay's card data (`StayCard`), not just the id, so Trips can show them; still in memory only.
- **Trips tab** (replaces the placeholder):
  - `hero` title "Trips", `SegmentedControl` Upcoming / Past / Saved.
  - Upcoming: confirmed bookings whose check-out is today or later, soonest first. Past: everything else (ended or cancelled), latest first.
  - Trip card: photo, title, place, dates "14–17 Nov · 3 nights", "2 guests", total; a "Cancelled" `Badge` (`discount` style, red) on cancelled trips. Tapping opens the stay. Upcoming cards have a "Cancel trip" text button that opens a `Sheet` ("Cancel this trip?", the stay's cancellation policy text word for word, "Keep trip" / "Cancel trip").
  - Saved: `ListingCard`s of hearted stays, with the heart to unsave.
  - States: loading placeholders, error + Try again, and empty states: Upcoming "No trips yet." + "Find a stay" (→ Search tab); Past "No past trips."; Saved "Nothing saved yet." + "Tap the heart on a stay to save it here."
- **Dates on screen:** formatted in code (`src/lib/dates.ts`: parse/format `YYYY-MM-DD`, add days, nights between, short and long labels with English month and weekday names), not `Intl`, so web, iOS and Android match.

## Out of scope
- Payment, availability across guests, hosts seeing bookings, editing a booking, emails/notifications, saved favorites storage, booking analytics.

## Steps
### 1. Dates + calendar
`src/lib/dates.ts`, `src/components/ui/date-range-calendar.tsx`, design-system entry. Done: picking a range on web highlights it; past days are disabled.

### 2. Server
`src/lib/server/bookings.ts` (Clerk client, read/write list, validation, overlap check, price from Sanity) and the three routes. Done: with a session, POST → 201 and GET lists it; bad dates → 400 with a message; cancel flips status; no session → 401.

### 3. App state
`src/lib/bookings.tsx` provider; `saved-stays` stores `StayCard`s (Search, Details and Home updated).

### 4. Book screen + details button
Route `src/app/(app)/stay/[slug]/book.tsx` → `src/screens/stay/book-screen.tsx`.

### 5. Trips tab
`src/screens/trips/` (trips-screen, trip-card, cancel-trip-sheet). Replaces the placeholder.

### 6. Close out (with plan 06)
Verification for both plans, AGENTS.md, Results.

## Verification
- tsc, lint, drift grep.
- Routes: no session → 401; valid booking → 201 and in GET; check-out before check-in → 400; 31 nights → 400; guests over `maxGuests` → 400; overlapping your own trip → 409; cancel a past trip → 400; unknown id → 404. The total equals `nights × pricePerNight` from Sanity even if the app sends something else.
- On the phone (Expo Go): book Modern Cabin with Hot Tub for 3 nights → toast, Trips shows it under Upcoming with £867; reopen the app → still there (stored on the account); cancel → it moves to Past with "Cancelled"; heart a stay → it appears under Saved, unheart → it goes.

## AGENTS.md updates
- **Who owns what:** add **Bookings**: Clerk private metadata (`bookings`), read/written only by `/api/bookings*` with the secret key; prices computed on the server from Sanity; no payment yet.
- **Expo → Route groups:** `(app)` holds a `(tabs)` group (home, search, trips, profile; JS tabs with `AppTabBar`, screens stay mounted) plus `stay/[slug]`, `.../policies`, `.../book` pushed over the tabs.
- **Design system:** `DateRangeCalendar`; dates formatted with `src/lib/dates.ts`.

## Result
Built as planned: `DateRangeCalendar`, the Book screen (`/stay/[slug]/book`), bookings in Clerk private metadata through `/api/bookings` and `/api/bookings/<id>/cancel`, a `BookingsProvider` shared by the screens, and the Trips tab with Upcoming / Past / Saved and cancelling. Saved stays now keep card data.

Changes from the plan: none in behavior. After booking, the app closes the stay screens (`dismissAll`) and switches to the Trips tab.

Verified: tsc, lint, drift grep; the bookings routes return 401 without a session; the server's checks reject a bad body, a past check-in, check-out before check-in, 31 nights, too many guests and an unknown stay with the expected messages; date helpers handle month edges and clock changes. Not yet checked: a real booking, overlap refusal and cancel against your Clerk account, and the screens on a phone; those are your Expo Go steps.

