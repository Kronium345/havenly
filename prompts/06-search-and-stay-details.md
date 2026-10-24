# 06 · Search, AI search, stay details and home on Sanity

Status: done

## Goal
A guest types one sentence ("quiet pet friendly cabin with a hot tub under £300 for 3 nights") in the home AI bar or on the Search screen and gets real Havenly stays from Sanity: hard limits filter, soft words rank. Chips show what the app understood and can be removed; a filter sheet and sort refine the list. Tapping a stay opens Property details (photos, amenities, policies word for word, host, price with total). Home's featured stays come from Sanity too. Prices are in pounds.

## Decisions
- **Data path:** the app never queries Sanity directly. Three API routes in `src/app/api/` read the public `production` dataset over HTTPS (`https://wutkash1.api.sanity.io/v2025-02-19/data/query/production`, `perspective=published`, query values always as `$params`), with `fetch` (no Sanity client package). Every route first verifies the Clerk session.
  - `POST /api/search` → `{ query, filters?, sort }` in, `{ understood, results, count }` out.
  - `GET /api/stays` → all stays for home (card fields), ordered by rating.
  - `GET /api/stays/<slug>` → one stay with host, cancellation policy, house rules, check-in times, and Havenly's other policies.
  - Card/detail images use `asset->url` plus `?w=…&auto=format&fit=crop` (width 800 for cards, 1200 for details).
- **Session check (new dependency, user to approve with this plan):** `@clerk/backend` (pinned via `npx expo install @clerk/backend`), `verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })` in `src/lib/server/require-session.ts`, imported only by `+api.ts` files so the secret never reaches the bundle. The app sends `Authorization: Bearer ${await getToken()}` through `src/lib/api.ts` (`apiFetch(path, init)`), which throws a typed error on non-2xx. A 401 shows "Your session ended. Sign in again." and signs out.
- **Parsing in code (AGENTS rule), `src/lib/search/parse-query.ts`, pure and shared by server and tests:** returns `{ filters, soft, nights, rest }`.
  - Price cap: `under/below/less than/max/up to/<` + `£`, `$` or a bare number, also "£200-£300" (min and max) and "300 pounds". The number is GBP.
  - Guests: "for 4", "4 guests/people/adults", "family of 5", "couple" = 2.
  - Pets: pet/pets/pet-friendly/dog/dogs/cat → `petsAllowed`.
  - Stay type: cabin(s), a-frame, cottage, house, villa, apartment/flat/studio → `propertyType in $types`. Category words beach/city map to `category`.
  - Amenities: hot tub/jacuzzi, pool, wifi/wi-fi, fireplace, ocean view/sea view, forest, mountain view, kitchen, parking, air conditioning/AC, washer, workspace/desk, EV charger, beach access/beachfront → amenity keys in `studio/schemaTypes/shared/options.ts`.
  - Place: US state names and codes ("California", "CA") → `place.region`; city names matched against the cities that exist in Sanity (fetched by the route) → `place.city`.
  - Nights: "3 nights", "two nights" (one–fourteen in words), "a week" = 7, "weekend" = 2.
  - Soft words (ranking only, never filters): a fixed list such as quiet, peaceful, secluded, cozy, romantic, modern, rustic, luxury, family, views, remote work, sunset, private.
  - `rest`: leftover words. Ranking text = soft words + rest; if empty, no `score()` and the list sorts by rating.
- **Query shape:** `*[_type == "property" && <filters built only from present keys>] | score(text::semanticSimilarity($text)) | order(...)`, projection with card fields. Sort options: Best match (`_score desc, rating desc`), Price: low to high, Price: high to low, Top rated. Count comes from the same filter (no score).
- **Chips (user choice: what we understood):** one chip per understood item, in this order: type/category, price ("Under £300", "£200–£300"), guests ("4 guests"), pets ("Pet Friendly"), each amenity ("Hot Tub"), place ("California"/"Malibu"), each soft word ("Quiet"), nights ("3 nights"). Styling as in `search.png`: the first chip uses the selected (lavender) style, the rest the canvas style. Tapping a chip removes that item and searches again (hint: "Removes this from your search"). With nothing understood, no chip row.
- **Filter sheet (user choice):** the sliders button opens a bottom sheet: Max price (chips: Any, £150, £200, £300, £500), Guests (`Stepper`, 1–12), Pet friendly (`Toggle`), Stay type (multi-select chips), Amenities (multi-select chips). Clear and Apply. Applying replaces the understood filters (soft words and text stay), updates the chips and searches again.
- **Sort:** "Sort by **Best match** ⌄" opens a small sheet with the four options; the choice stays while on the screen.
- **Results:** `ListingCard` per stay (photo, title, place "Lake Arrowhead, CA", rating + review count, up to two amenity badges preferring the ones searched for, price "£289 / night", heart). "N stays" above. States: loading (three grey card placeholders), error ("Couldn't load stays." + Retry), empty ("No stays match that. Try removing a filter." with the chips still tappable).
- **Currency (user choice: £):** all prices show as pounds with the same numbers: `formatPrice(289)` → "£289". Sanity: the `pricePerNight` field title/description change to GBP (no data change), schema and Studio redeployed; the Payments policy's "in US dollars" becomes "in British pounds (GBP)" in its summary and body (content change via MCP, published).
- **Total (user choice):** when the sentence gives a length, details show "£867 total" = price × nights and "for 3 nights" next to it; otherwise only the nightly price. The nights travel as a route param (`/stay/<slug>?nights=3`, not personal data).
- **Search entry points:** home AI bar submit → `/search?q=<sentence>`; home search tile and Search tab → `/search` with the field focused and all stays listed by rating. Typing on Search and pressing search runs a new search. The sentence in the URL is not personal data, but it is kept out of any analytics.
- **Stay details (user choice: build it), `/stay/[slug]` in `(app)`, from `property-details.png`:**
  - Photo pager (full width, ~340pt tall, est.) with "1 / N" counter pill (scrim) bottom-right; back (top-left), share and heart (top-right) as `IconButton` `surface` circles.
  - White sheet overlapping the photo (`rounded-t-3xl`): title (`hero`), rating box on the right (`canvas`, `rounded-xl`: star + "4.9" `title`, "(342)" `caption`), place row (MapPin, `body`).
  - Amenity row: first four amenities as icon (`lg`) over `caption` label, evenly spaced; divider (`border`).
  - `PolicyCard` "Ask about policies" / "Cancellation, house rules, pets, check-in and more." → Policies screen. `PolicyCard` with the cancellation policy's title as heading ("Moderate cancellation") and its summary → the same screen scrolled to it. (The design's "Free cancellation" copy came from a mock; we show the stay's real policy.)
  - Divider, host row: initial avatar (`primary-tint`), "Hosted by Alex" `headline`, "Superhost" `caption` with award icon when true, chevron → host sheet (name, Superhost, "Hosting since 2018", bio).
  - Bottom bar (white, safe-area padded): "£289" `price` + "/ night", optional "£867 total" `caption`; primary `Button` "Book this stay" → toast "Booking is coming next."
  - Share: React Native `Share.share({ message: "<title> in <place> on Havenly — £289 a night." })` (no link until the web app is hosted).
  - States: loading (photo placeholder + lines), error with Retry, not found ("This stay isn't available anymore." + Back).
- **Policies screen, `/stay/[slug]/policies`:** title "Policies", sections in order: the stay's cancellation policy (title + body), Check-in and check-out (the stay's times), House rules (the stay's list), then Havenly's policies for pets, payments, damage, safety and general house rules (title + body). All text exactly as stored, each labelled with its source ("This stay" / "Havenly policy"). The ask-a-question box comes with the Context + Jev plan.
- **Heart (user choice):** `src/lib/saved-stays.tsx`, an in-memory set of stay ids in a context provided by `(app)/_layout.tsx`; Search, Details and Home share it; lost on reload. Saved favorites are a later plan.
- **Home on Sanity (user choice):** `FeaturedStayCard`s from `GET /api/stays` (rating desc), category chips filter on the device by `category`. Loading/error/empty states as on Search. `src/screens/home/stays.ts` keeps only the category chip list; sample stays are deleted. Card tap → details.
- **Shared UI:** add `Sheet` (bottom sheet on React Native `Modal`, `scrim` backdrop, `surface` panel, `rounded-t-3xl`, drag handle, close on backdrop tap and Android back) to `src/components/ui/` and `/design-system`. Amenity labels and lucide icons live in `src/lib/amenities.ts` (names checked by `tsc` at build).
- **Tab bar:** Search screen shows the `TabBar` with Search active; Home → `/home`, Profile → `/profile`, Trips → "Trips are coming next." Home's Search tab → `/search`.
- **No Jev yet:** everything above is code + GROQ + embeddings. When the key exists, Jev can choose between candidate places/types code found.
- **Estimated from images:** photo height, sheet radius overlap, chip and card spacing, rating box size.

## Out of scope
- Jev, Sanity Context Q&A, bookings, dates/calendar, saved favorites storage, Trips, host profile screen, deep links to stays, EAS Hosting for the API routes (production needs a hosted server and `origin`).

## Steps
### 1. Server foundations
`npx expo install @clerk/backend`. `src/lib/server/require-session.ts` (verify bearer token, return `userId` or a 401 `Response`), `src/lib/server/sanity.ts` (`sanityQuery<T>(query, params)` over HTTPS with `$params`), `src/lib/api.ts` (client `apiFetch` with the Clerk token). Done: `GET /api/stays` without a token → 401; with the app's token → 24 stays.

### 2. Parser
`src/lib/search/parse-query.ts` + `src/lib/format.ts` (`formatPrice`, `formatPlace`). Done: a scratch script runs ~25 sentences (each rule above, mixed, empty, nonsense) and prints the expected parse.

### 3. Search API
`src/app/api/search+api.ts`: session → parse (or use given filters) → build GROQ from present keys → count + results → `understood` chips data. Done: "quiet pet friendly cabin with a hot tub under £300" returns only pet-friendly hot-tub cabins under 300, Modern Cabin first.

### 4. Stays APIs + Sanity edits
`src/app/api/stays+api.ts`, `src/app/api/stays/[slug]+api.ts`. Studio price field → GBP, schema + Studio redeploy; Payments policy text → pounds (MCP patch + publish). Done: details route returns host, policy and Havenly policies for a slug; unknown slug → 404.

### 5. Shared pieces
`Sheet`, `saved-stays` context, `amenities.ts`, `useApi` hook (loading/error/data/retry), design-system preview entry. Done: Sheet opens/closes on web.

### 6. Search screen
`src/app/(app)/search.tsx` → `src/screens/search/` (search-screen, search-header, understood-chips, filter-sheet, sort-sheet, results states). Done: matches `search.png` on web at 393×852.

### 7. Details + Policies + host sheet
`src/app/(app)/stay/[slug].tsx`, `stay/[slug]/policies.tsx` → `src/screens/stay/`. Done: matches `property-details.png`; policies show stored text exactly.

### 8. Home on Sanity + entry points
Home cards from `/api/stays`, AI bar → `/search?q=`, search tile/tab → `/search`, card → details. Delete sample stays.

### 9. Close out
Verification, AGENTS.md, Result.

## Verification
- `tsc`, `expo lint`, drift grep pass; `studio` tsc passes after the field change.
- API: no token → 401 on all three routes; bad body → 400; unknown slug → 404.
- Realistic sentences (each checked against the data, failures explained as data / query / code):
  1. "quiet pet friendly cabin with a hot tub under £300 a night" → Modern Cabin with Hot Tub, Sunset A-Frame only.
  2. "Cabins in California" → CA cabins/A-frames (6) and no Oregon/Montana stays.
  3. "beachfront villa with a pool for 6" → Oceanview Villa first, all ≥ 6 guests.
  4. "cheap city apartment for a couple with wifi" → city apartments with wifi (no price cap invented: "cheap" is soft).
  5. "romantic getaway in Hawaii for 3 nights" → Hawaii stays; details total = 3 × price.
  6. "something nice" → all stays ranked, no chips but the soft word if listed.
  7. "castle in Scotland under £50" → empty state with chips.
- UI on web at 393×852 compared with `search.png` and `property-details.png` (differences listed and fixed); chip removal, filter sheet apply/clear, sort, heart sync between Search and Details, Policies text equals Sanity text, host sheet, Book toast, share opens (native only; web may show the browser share or nothing).
- Home: cards are Sanity stays, chips filter, AI bar opens Search with the sentence.
- Phone (Expo Go): the API routes reach the dev server; search and details work; you check the look.

## AGENTS.md updates
- **Who owns what:** app reads Sanity only through `src/app/api/*` with `sanityQuery` and `$params`; routes verify the Clerk session with `@clerk/backend` in `require-session.ts`; the query parser lives in `src/lib/search/parse-query.ts` and owns prices (GBP), guests, nights, pets, types, amenities, places; soft words rank only.
- **Design system:** currency is GBP via `formatPrice`; `Sheet` primitive; amenity icons in `src/lib/amenities.ts`.
- **Expo → Route groups:** `(app)` adds search, `stay/[slug]`, `stay/[slug]/policies`; favorites are in memory (`saved-stays`) until a favorites plan.
- **Content:** price field is GBP.

## Result
Search, the AI bar, the filter sheet, sort, stay details, the Policies screen and Home all run on Sanity through three API routes that check the Clerk session (`@clerk/backend`). Prices show in pounds. You tested it in Expo Go and confirmed it works.

Changes from the plan, after your test:
- **Search as you type:** results update 450 ms after typing stops (3+ characters, or an empty field for all stays); the search key still runs it at once. Late answers to older searches are ignored.
- **Tabs:** Home, Search, Trips and Profile moved into `(app)/(tabs)` with expo-router's JS tabs and our `AppTabBar`, so tabs stay mounted and switch instantly with their state kept. Stay screens push over the tabs. Profile lost its back button.
- **Stay screen fixes:** the Book button sizes to its label (it wrapped to "Bo / ok"), the place text wraps instead of clipping, and a white header with a dark status bar appears once the photo scrolls away.
- `ListingCard` gained `savePlacement` ("end" puts the heart beside the title, as in `search.png`).
- "no wifi" style phrases no longer add the amenity; "cheap" is a soft word.
- "Book this stay" now opens the booking flow (plan 07) instead of a toast.

Verified: tsc, lint, drift grep; API routes return 401 without a session; 25 sentences parsed as expected; live queries for the plan's sentences returned the expected stays; your Expo Go recording and screenshot.

