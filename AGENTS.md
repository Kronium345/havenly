# Havenly

Expo React Native rental app. Guests describe a stay in one sentence ("quiet pet friendly cabin with a hot tub under $300 a night") and get ranked stays back. They can also ask booking and policy questions about a stay, answered with exact text from Havenly's own content.

This file is the project's memory: it holds every decision that is still true. Plans in `prompts/` are history.

## Commands

~~~bash
npx expo install <package>  # ALWAYS use instead of npm install: resolves SDK-compatible versions
npx expo start              # dev server (press i for the iOS simulator)
npx expo lint               # lint
npx tsc --noEmit            # type check
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
npx eas-cli@latest <cmd>    # EAS builds, submits, and updates (use instead of bare `eas`)
# Sanity Studio lives in studio/ with its own package.json (use npm there, not expo install)
cd studio && npm run dev                          # Studio at localhost:3333
cd studio && npx sanity schemas deploy            # after schema changes (then npx sanity deploy)
cd studio && npx sanity datasets embeddings status production
cd studio && node --env-file=../.env.local scripts/write-stay-copy.ts [--slug <slug>] [--dry-run]  # stay copy
~~~

## Expo

- Expo ships breaking changes every SDK release, so don't trust memory. Before touching an Expo, EAS, or React Native API, check the `expo` major version in `package.json` and read `https://docs.expo.dev/versions/v<major>.0.0/`. For anything else, start from https://docs.expo.dev/llms.txt and follow its links.
- Routes live in `src/app/`: every file is a screen and `_layout.tsx` files define navigators. API routes are `src/app/api/*+api.ts`. Keep components, hooks, and utils outside `src/app/`. Route files stay thin and render a screen from `src/screens/<screen>/`, where screen-only components live. Shared ones go in `src/components/ui/`.
- Route groups: `(auth)` (onboarding, sign-up, sign-in, verify-email) and `(app)`. `(app)` is a Stack holding `(tabs)` (home, search, trips, profile: expo-router JS tabs from `expo-router/js-tabs` with our `AppTabBar`; tab screens stay mounted, so switching is instant and keeps state) plus `stay/[slug]`, `stay/[slug]/policies`, `stay/[slug]/book`, `stay/[slug]/ask` and `personal-info`, pushed over the tabs. Tab screens pad their bottom by `APP_TAB_BAR_HEIGHT`. `(app)/_layout.tsx` provides `BookingsProvider` and `SavedStaysProvider`. The root layout gates them with `Stack.Protected` on Clerk's `useAuth().isSignedIn` (`!isSignedIn` / `!!isSignedIn`; undefined while loading keeps `(app)` closed), and `/` waits for `isLoaded`, then redirects to `/home` or `/onboarding`. Signing in or out needs no `router` call: `finalize()`/`signOut()` flips the guard and the index redirect moves the guest. On native the splash waits for fonts and Clerk (Clerk at most 5s). `src/app/sso-callback.tsx` catches the Google/Apple return link. `GestureHandlerRootView` wraps the root layout (Gesture Handler v3 hooks API: `useFlingGesture`, `GestureDetector`).
- Never put personal data (emails, names) in route params: on web they land in browser history. Pass them in memory.
- `ios/` and `android/` are generated. Never create or edit them by hand; configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, switch to a development build (`npx expo run:ios`).
- The app runs in Expo Go, so fonts load with `useFonts` in `src/app/_layout.tsx`. The splash is held until fonts load on native only; on web, returning null breaks hydration. Switch to the `expo-font` config plugin when moving to a development build.
- Web uses server output, so the first client render must match the server's. Never nest pressables (a `<button>` inside a `<button>` breaks hydration); put the inner action beside the outer one, positioned absolutely. Don't size layout from `useWindowDimensions` on web (the server sees 0×0): measure with `onLayout`, starting from 0 on web. Hydration errors that only show a `keeper-lock` diff come from the Keeper browser extension, not the app.

## Who owns what

Each tool has one job. Ask before moving a responsibility to a different tool.

- **Auth:** Clerk (`@clerk/expo` 4.x) is the source of truth. The app keeps its own custom auth screens. Set Clerk up through the Clerk CLI and use the Clerk MCP for current Expo patterns; check the installed types in `node_modules/@clerk/shared/dist/types/` before using an API.
  - Custom flows use the current method API: `useSignUp`/`useSignIn` → `.password()`, `signUp.verifications.*EmailCode`, `signIn.mfa.*EmailCode`, `.finalize()`. Never `@clerk/expo/legacy` (`prepareFirstFactor`, `setActive` from those hooks).
  - Sign-up sends Full name as Clerk first/last name and verifies the email with a 6-digit code on `/verify-email`. Sign-in uses the password; when Clerk returns `needs_client_trust`/`needs_second_factor` it emails a code and opens `/verify-email?flow=sign-in`. The email shown there comes from Clerk's attempt, never the URL. Sign-up screens render `<View nativeID="clerk-captcha" />`.
  - Google/Apple use experimental `useSSO()` from `@clerk/expo/experimental` (browser flow, works in Expo Go, activates the session itself). On web the buttons show an info toast. Native sheets need a development build.
  - Sessions persist through `tokenCache` (`expo-secure-store`). Password minimum is 8 in both Clerk and `validate.ts`; keep them equal. Read names with `displayFirstName` and photos with `profileImageUrl` (only when `user.hasImage`) from `src/lib/display-name.ts`. Photo and names are edited on `/personal-info` with `user.setProfileImage({ file: dataUrl | null })` + `user.reload()` and `user.update({ firstName, lastName })`; no Clerk instance setting is involved. Photos are picked with `expo-image-picker` (library, square crop, base64). Sign out lives in Profile's Settings sheet (the gear).
- **Content:** Sanity project `wutkash1`, public dataset `production` (published content readable without a token; the app uses `EXPO_PUBLIC_SANITY_PROJECT_ID`/`_DATASET` only). Studio is a standalone app in `studio/` (deployed; `studio` is excluded from the app's tsc and lint). Schema deploys and content changes go through the Sanity MCP.
  - Types: `property` (the stay), `host`, `policy` (Havenly's own; `body` is quoted word for word). Stays reference a host and a cancellation policy, and carry `houseRules`.
  - Code filters on fixed lists in `studio/schemaTypes/shared/options.ts` (mirrored in `src/lib/search/vocabulary.ts`): `propertyType`, `category` (the home chips), `amenities` (camelCase keys), `place.region` (e.g. "CA"), `pricePerNight` (whole GBP), `maxGuests`, `petsAllowed`. Change both lists together.
  - The app reads Sanity only through `src/app/api/*` (`sanityQuery` in `src/lib/server/sanity.ts`, plain HTTPS, `$params`): `POST /api/search`, `GET /api/stays`, `GET /api/stays/<slug>`, `GET /api/policies?topic=` (`src/lib/server/policy-queries.ts`).
  - Embeddings cover stays only, projection `{ title, propertyType, category, summary, description, amenities, place }`. `description` holds the feel of a stay (quiet, cozy, views), which is what soft intent matches.
  - Stay `summary` and `description` are written by `studio/scripts/write-stay-copy.ts` (Agent Actions Generate, `SANITY_WRITE_TOKEN`) from the stay's fields, `highlights` (host facts about surroundings and feel) and photo alt text only. The script checks the result in code and with Agent Actions Prompt, and publishes it only if nothing is unsupported. To change copy, edit the facts or `highlights` and rerun it; don't hand-edit the copy.
- **Search parsing:** `src/lib/search/parse-query.ts` reads prices (GBP), guests, nights, pets, types, amenities ("no wifi" is not a requirement) and places (US states, cities that exist in Sanity) in code; soft words and leftovers only rank. `understood.ts` turns the parse into chips; removing a chip or applying filters sends the edited parse back. Search runs as the guest types (450 ms pause, 3+ characters) because each search costs a semantic query.
- **Exact constraints** (price, guests, type, amenities, pets, place): GROQ filters, with values always passed as params.
- **Soft intent** (quiet, cozy, secluded): Dataset Embeddings via `text::semanticSimilarity()` inside `score()`.
- **Policy knowledge:** a Sanity Context endpoint in Knowledge Base mode. Context endpoints are created in the Dashboard's Context app and read with an organization token (Context Viewer), per https://www.sanity.io/docs/ai/context-migration-guide. One endpoint serves one mode. The Context skill still describes `sanity.agentContext` Studio documents with a project token; that route is deprecated, so don't use it.
- **Typed decisions** (which stay topics and policies answer a question): Jev, called from API routes through the AI SDK's `experimental_evaluate` with the `@ai-sdk/typesafe-ai` provider and `TYPESAFE_AI_API_KEY`. No Vercel AI Gateway. Keep `ai` and `@ai-sdk/typesafe-ai` pinned to exact versions, since the API is experimental.
- **Answer text:** none generated. Answers show the stay's own fields and policy text word for word, with their source. No LLM runs in the app. Until Jev and Context land, the Ask chat (`/stay/[slug]/ask`) matches questions to topics by keyword in `src/lib/ask/answer.ts` and answers from `/api/stays/<slug>` data: one `AnswerCard` per topic with its source, never a paragraph; no match says so and points to support.
- **Bookings:** Clerk private metadata (`privateMetadata.bookings`, max 40), read and written only by `/api/bookings` and `/api/bookings/<id>/cancel` with the secret key (`src/lib/server/bookings.ts`). The server works out nights and totals from Sanity and refuses past dates, more than 30 nights, too many guests and overlaps with your own trips. No payment yet. Hearted stays are in memory only (`saved-stays`) until a favorites plan.
- **Analytics:** PostHog (`posthog-react-native`). The client lives in `src/lib/posthog.ts` (`EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN`/`_HOST`; without them it is created `disabled`, so captures are no-ops). The root layout wraps the app in `PostHogProvider` + `PostHogErrorBoundary`, identifies with the Clerk user id only (`identify(user.id)`, no `$set` of email or names), resets on sign-out, and sends a screen view per pathname. Lifecycle events, `$exception` autocapture, touch autocapture (`testID` only) and PostHog Logs (`posthogAppLogger`) are on.
  - Events are snake_case `object_verb` with ids, counts and enums only: `onboarding_completed|skipped`, `stay_search_submitted` / `search_submitted` (`has_query`, never the text), `search_filters_applied`, `search_sort_changed`, `stay_selected`, `stay_shared`, `stay_booking_started`, `booking_confirmed`, `booking_cancelled`, `saved_stay_added|removed`, `profile_details_saved`, `user_signed_out`, `stay_question_asked` (`source`, `topic_count`). Add new ones in the same shape.
  - `studio/scripts/write-stay-copy.ts` records each Agent Actions call as `$ai_generation` (`posthog-node`; spans `generate_stay_copy`, `validate_stay_copy`; one trace per stay); it only warns when PostHog isn't set.

## Rules

- Secret keys (Clerk secret key, TypeSafe key, Sanity organization token, Sanity write token `SANITY_WRITE_TOKEN`) never reach the app bundle. Use them only in API routes and local scripts such as seeding. Never put them behind `EXPO_PUBLIC_`, which is bundled into the app. Never commit `.env`. Keep variable names, without values, in `.env.example`.
- Sanity Context needs a deployed Studio for the dataset. Redeploy Studio from `studio/` after schema changes.
- Jev is not an agent. It answers typed questions (Choice, Noul, Score) with probabilities. It never writes GROQ, calls tools, or generates text. Code builds queries from its answers.
- Prices, guest counts, and dates are parsed in code. Jev may choose between candidates code found, but never produces the value.
- Embeddings rank, they don't filter, and they only see the document itself (no references). Hard constraints are always GROQ filters, and text that should affect ranking lives on the property document.
- Policy answers show only text from the stay's data and Havenly's policies, word for word. If nothing answers the question, say so and point to support.
- API routes verify the Clerk session before doing any work (`requireSession` in `src/lib/server/require-session.ts`, `@clerk/backend`). The app calls them only through `useApiFetch`/`useApiQuery` in `src/lib/api.ts`, which send the session token; a 401 signs the guest out. Files in `src/lib/server/` are imported only by `+api.ts` files.
- PostHog failures never block the app. Never send what guests type, tokens, or personal data in events.
- Let Sanity generate document IDs. Model relationships as references.
- Ask before adding a dependency or service, changing the Sanity schema once content exists, or deleting data. Prefer Expo modules over third-party libraries.
- Whenever you need input from the user, ask through your tool's built-in question panel so they pick from options instead of typing. Give two to four clear options with the recommended one first. Fall back to plain text only if no such panel exists.

## How we build features

For a new feature or a change across several files. Small fixes and questions skip this.

1. **Understand.** Read the code involved. Open an earlier plan only if this feature builds directly on it (pick by file name). Read the current docs pages for the APIs you'll use, and load a matching skill if one exists (e.g. the Expo, Clerk, Sanity, Sanity Context, or TypeSafe skills). Don't write version-specific APIs from memory.
2. **Ask.** If a real decision is unclear (scope, visible behavior, data shape), ask in the question panel, batching questions into one round and following up only if the answers raise new ones. Pick defaults for the rest and list them. If a decision in this file looks wrong, raise it instead of changing it.
3. **Plan.** Copy `prompts/TEMPLATE.md` to `prompts/NN-feature-name.md` (next number) and fill it in. The plan must be self-contained, so a fresh session can build it from this file plus the plan alone.
4. **IMPORTANT: stop and wait.** Write no app code until the user approves the plan. Ask for approval in the question panel (approve, or request changes). If they request changes, update the plan and ask again. On approval, set `Status: approved`.
5. **Build** step by step, checking each one. If a step turns out wrong, stop and explain instead of redesigning.
6. **Close out.**
   - Run the plan's Verification and give the report described under Reporting.
   - Add a short `## Result` to the plan and set `Status: done`.
   - Update this file: put each lasting decision in the section it belongs to. Replace or remove rules that are no longer true instead of appending. Keep this file under 150 lines.

## Building from designs

Designs are attached in the chat. Screens must match them exactly: layout, spacing, sizes, colors, type, radii, icons, and copy.

- Icons, fonts, and brand images come from `assets/` or the chosen icon library, never recreated from a screenshot. Sample property photos may be remote placeholder images. If an asset is missing, use a marked placeholder and list it.
- Map every color, font, spacing value, and radius to a design-system token. List values with no token in the plan as proposed new tokens instead of hardcoding them. When creating the design system itself, derive the tokens from the designs.
- UI plans describe the design (elements, states, tokens, assets) well enough to build without the image. If building in a new session, ask for the design to be attached again.
- After building, open the screen on web (`npx expo start --web`, then the route at `http://127.0.0.1:8081/<route>` in Chrome, framed to phone width), screenshot it, and compare it with the design. List every difference, fix, and repeat. Then the user checks it on their phone in Expo Go (the dev machine is Windows, so there is no iOS simulator). Report which values were estimated from an image.

## Design system

- Brand is **Havenly** (the designs say "roam"; use Havenly). Light mode only (`userInterfaceStyle: "light"`), so no `dark:` classes.
- Styling is twrnc. Tokens live only in `tailwind.config.js`: colors, Plus Jakarta Sans families, type scale, radii, `screen` spacing (20), and `shadow-*` (`boxShadow`). Import `tw`, `color()`, `iconSize`, `control`, `motion` from `@/theme`. No hex, `rgba(`, `fontSize`, or `fontWeight` anywhere in `src/`.
- Text uses `AppText` with a `variant` or a `type-*` utility. Weight comes from `font-regular|medium|semibold|bold`, which set the font family, never `fontWeight`. Big titles: `display` (44/40) for photo-led screens like onboarding and home, `hero` (36/36) for form screens like auth.
- Sample photos are remote Unsplash images: `https://images.unsplash.com/photo-<id>?w=1200&q=80&auto=format&fit=crop`, checked to return 200 before use.
- twrnc caveats: string utilities in `addUtilities` resolve `font-*` to a weight, so composite styles are written as style objects. Each plugin keeps only its last `addUtilities` call.
- Icons are `lucide-react-native` through `Icon` (stroke 2; `filled` for active states). Brand marks are SVGs in `assets/brand/`, rendered with `expo-image`: `Wordmark` (havenly, generated from Plus Jakarta Sans Bold, emboldened) and `BrandLogo` (`google`, `apple`). Brand colors stay in those files, not in the theme.
- People show as `Avatar` (md/lg/xl: photo or initial); stat rows use `StatGroup`; quoted answers use `AnswerCard` (`source` or plain `footer`); send buttons are `IconButton` `primary`. Lift bottom inputs above the keyboard with `Keyboard` events (window height − `screenY`), since `KeyboardAvoidingView` does not resize edge-to-edge Android.
- Shared UI lives in `src/components/ui/`, and `/design-system` previews every piece. Add new primitives there and to the preview.
- Feedback uses `toast.success|error|info(title, message?)` from `@/components/ui/toast` (`react-native-toast-message` with our own card design, top of screen, 3.5s, one host in the root layout). Never import the library in screens. Form validation shows red field borders plus one toast (`reportInvalid`), never inline error text. Clerk errors do the same with Clerk's message (`clerkFieldErrors`, `reportClerkError` in `src/screens/auth/clerk-errors.ts`).
- Photo cards darken under white text with the `scrim` token as a gradient (`experimental_backgroundImage` on native, `backgroundImage` on web). `title-lg` (28/30) is the photo card title.
- Prices are pounds via `formatPrice` (`src/lib/format.ts`); dates are `YYYY-MM-DD` strings formatted with `src/lib/dates.ts`, not `Intl`. Bottom sheets use `Sheet`; date ranges use `DateRangeCalendar`; amenity icons come from `src/lib/amenities.ts`.
- Data screens follow the React Compiler lint: no synchronous `setState` in effects (key results to their request instead) and no ref reads during render.

## Reporting

End every piece of work that changes code (features and fixes, not answers to questions) with this report. Use these headings in this order, and leave out any section that would be empty.

- **Done:** one line on the outcome, then the files changed and what changed in each.
- **Verified:** each check with ✅ or ❌ and its evidence (command output, screenshot). List what wasn't checked as ❌ with the reason. Never mark something ✅ without running it.
- **You need to:** numbered actions only the user can take, such as keys, dashboard settings, manual steps in Sanity, or assets to provide.
- **Test it yourself:** numbered steps to reproduce the result from a fresh start, ending with `Expected:` and what the user should see.
- **Notes:** defaults picked, trade-offs, and anything left for later.

## Checks

- Lint and type check pass before any task is called done.
- Screens that load data handle loading, error, and empty states.
- AI features are tried against realistic inputs, and failures are explained by cause: missing data, the decision Jev made, the query, or the code.