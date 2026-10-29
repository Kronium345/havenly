# 24 · Privacy link, Terms of Service from Sanity, real support email

Status: done

## Goal
Guests and hosts can read Havenly's privacy policy (the user's hosted policy) and Terms of Service from the app and the website, and contact support at a real inbox. The Terms text is edited in Sanity Studio and shows without an app release.

## Decisions
- **Privacy:** the user's policy at https://www.privacypolicies.com/live/a0f0e2ba-fcb2-46d8-a084-c723dfe22764 replaces Havenly's draft text.
  - Help → Privacy opens it in the in-app browser (`expo-web-browser`).
  - The public `/privacy` route stays (it's the store listing's privacy URL) and sends visitors to that page: a redirect on the website, the in-app browser on native.
  - The draft `privacy-screen.tsx` text is removed.
- **Terms of Service:** a new Sanity document type `legalPage`, edited in Studio:
  - fields: `title`, `slug` (`terms`), `updated` (date), `intro`, and `sections` (an array of `{ heading, paragraphs[] }`), matching `LegalPage`'s shape;
  - one published document, `slug: terms`, created now with placeholder text ("Our Terms of Service are being finalised…"). The user writes the real terms later.
  - Separate from the `policy` type on purpose, so Terms never feed the Ask answers or the policies Knowledge Base.
- **Public read route:** `GET /api/legal/<slug>` returns a published `legalPage` (published content in the public dataset). It needs no session, because Terms must be readable before sign-up and on the website. It's read-only and fixed to `legalPage`, with `slug` as a param. This is the third route without `requireSession`.
- **Pages:** `/terms` (public, outside the auth gate) renders the Sanity page with `LegalPage`, with loading, error ("Couldn't load the terms" + retry) and missing-document states.
- **Links:**
  - Help & support gets a "Terms of Service" row next to Privacy;
  - sign-up gets a small line under the button: "By signing up you agree to the Terms of Service and Privacy Policy" (both links);
  - the host Payouts screen gets a "Terms of Service" link under its note.
- **Support email:** `SUPPORT_EMAIL` becomes `awolowodaniel@yahoo.ie` (Help, `/support`). `AGENTS.md`'s placeholder note is updated.

## Out of scope
- The actual wording of the Terms (the user writes it in Studio later).
- Host-specific terms or the Stripe Connected Account Agreement wording (part of the Terms the user writes).
- Stripe Dashboard settings.

## Steps
### 1. Sanity
1. Add `studio/schemaTypes/documents/legalPage.ts` and register it in the schema index.
2. Deploy the schema and Studio. If the local deploy runs out of memory, the user runs `cd studio; npx sanity schemas deploy; npx sanity deploy`.
3. Create and publish the placeholder `terms` document through the Sanity MCP.

### 2. Route and pages
1. `src/lib/server/legal.ts` (`legalPage(slug)`).
2. `src/app/api/legal/[slug]+api.ts` (no session).
3. `src/screens/legal/terms-screen.tsx` with route `src/app/terms.tsx`.
4. `/privacy` becomes the redirect to the hosted policy.
5. Remove the draft privacy text.

### 3. Links and email
Help rows, the sign-up line, the Payouts link, and `SUPPORT_EMAIL`.

## Verification
- tsc and lint pass.
- `GET /api/legal/terms` returns the placeholder without a session; an unknown slug returns 404.
- On the phone (dev build):
  - Help → Terms of Service shows the Sanity text;
  - Help → Privacy opens the hosted policy;
  - Help → Email support opens a mail to awolowodaniel@yahoo.ie;
  - the sign-up links work;
  - after the Terms intro is changed in Sanity and the screen reopened, the new text shows (then it's changed back).
- On the web: `/terms` renders and `/privacy` redirects. Production after a deploy.

## AGENTS.md updates
- **Content:** a `legalPage` type (Terms) edited in Studio, served by `GET /api/legal/<slug>`.
- **Rules:** add `/api/legal/<slug>` (published legal pages only) to the routes without `requireSession`.
- **Design system:** privacy is the user's hosted policy; support email `awolowodaniel@yahoo.ie`.

## Result
Built: `legalPage` schema and the published `terms` placeholder; `GET /api/legal/<slug>` (public, read-only; unsafe or unknown slugs → 404); `/terms` with loading, error/retry and not-published states; `/privacy` redirects to the hosted policy (draft text removed); Help has Privacy (in-app browser) and Terms rows; sign-up and host Payouts link the Terms; `SUPPORT_EMAIL` is awolowodaniel@yahoo.ie.

Verified: tsc and lint; the route with curl (200 for `terms`, 404 for unknown slugs, no session); on the phone, Help → Terms shows the Sanity text, Help → Privacy opens the hosted policy, Email support addresses awolowodaniel@yahoo.ie, Payouts → Terms of Service opens the page, and a published Terms edit showed on reopening (then reverted). Production (https://havenly.expo.app) checked after deploy: `/terms` shows the Sanity text, `/support` renders, `/privacy` redirects to the hosted policy, no console errors. Checking production also showed that the whole website was blank: PostHog threw at start-up with no browser storage. Fixed with `persistence: "memory"` on web (`src/lib/posthog.ts`). Not checked: the sign-up links (they need signing out).
