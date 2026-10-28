# 22 · Hosts edit stays and block dates (host mode phase 2)

Status: done

## Goal
A host company's owner can change a stay's practical details (price, guests, house rules, check-in and check-out times, pets, amenities, highlights) and block nights the stay can't be booked, from host mode in the app. Changes show to guests straight away.

## Decisions
- **Who:** owners (`org:admin`) edit and block; staff (`org:member`) keep view-only access (prompts/19 roles). The server checks the role from the verified session (`requireHost(request, { admin: true })`).
- **Edits write to Sanity from the server** (user's choice), with a new token `SANITY_HOST_WRITE_TOKEN`: a Sanity robot token (Editor role) created by the user, stored in EAS production as **sensitive** and in `.env.local` for dev. It's used only by `src/lib/server/host-edit.ts`. `SANITY_WRITE_TOKEN` still never leaves the user's PC. This replaces the rule that no Sanity write token reaches the server.
- **Allowed fields only**, validated in code with the schema's limits:
  - `pricePerNight`: whole GBP, 1–10,000;
  - `maxGuests`: 1–30;
  - `houseRules`: up to 15 lines, 120 characters each;
  - `checkInTime` / `checkOutTime`: from a fixed list of half-hour times ("6:00 AM" … "11:30 PM");
  - `petsAllowed`: yes/no;
  - `amenities`: keys from `src/lib/search/vocabulary.ts` only;
  - `highlights`: up to 8, 80 characters each.

  Title, photos, place, type, category, host and cancellation policy stay Studio-only.
- **Ownership is re-checked on every write:** the stay must match `HOST_ORG_ID == orgId` (prompts/21). The patch uses `ifRevisionID` so two editors can't overwrite each other ("This stay changed. Reload and try again.").
- **Published document is patched directly.** If someone has an unpublished Studio draft of the same stay, the draft keeps its own values until published; this is listed in Notes for the user rather than handled.
- **Copy:** `summary` and `description` are generated from the facts (`write-stay-copy.ts`). After a highlights edit they can be out of date until the user reruns the script. The host screen says "Description updates within a day" and the user reruns it; automating it is out of scope.
- **Blocked nights live in Neon `bookings`** as rows with status `blocked`, so the existing exclusion constraint makes a block and a booking on the same nights impossible, with no race.
  - Migration `003_blocks.sql`: add `blocked` to the status check; recreate `bookings_no_double_booking` over `held`, `confirmed` and `blocked`; add `blocked_by text` (Clerk user id) and `note text` (max 80 characters, host-only).
  - A block's `user_id` is `block:<uuid>`, so the per-guest overlap rule never matches it, and `listBookings` (filtered by the guest's user id) never returns it. Price columns are 0, guests 1, and title, slug and place are copied from Sanity.
- **Block rules:** 1–60 nights, starting today or later; can't overlap a held or confirmed booking (the constraint enforces it, answered with "Some of those nights are already booked."). Owners can remove their company's blocks at any time.
- **Guests:** checkout over a blocked night gets the same error as a taken night. Showing unavailable nights on the guest calendar is out of scope (booked nights aren't shown either).
- **Analytics:** `host_stay_updated` (`fields_changed` count, `stay_id`) and `host_dates_blocked` / `host_block_removed` (`stay_id`, `nights`).

## Out of scope
- Photos, title, place and policy changes; creating or deleting stays.
- Regenerating copy automatically; showing unavailable nights to guests.
- Phase 3 payouts (prompts/23).

## Steps
### 1. Token and server editing
1. The user creates the Editor robot token in sanity.io/manage → project `wutkash1` → API → Tokens, then adds it to `.env.local` and `.env.example` (name only).
2. `src/lib/server/host-edit.ts`:
   - `parseStayEdit(body)` validates the allowed fields;
   - `updateHostStay(orgId, stayId, edit, rev)` re-checks ownership, then patches through the Sanity mutate API (`set`, `ifRevisionID`, plain `fetch`).
3. Routes: `PATCH /api/host/stays/[id]` (owner only); `GET /api/host/stays/[id]` also returns `_rev` and the editable fields.

Done when tsc and lint pass, an owner can change Lena's price in dev, and a member and a different organization get 403/404.

### 2. Blocks
1. Write `db/migrations/003_blocks.sql` and apply it to `dev` (`npm run db:migrate`).
2. In `src/lib/server/host.ts`:
   - `hostBlocks(orgId, stayId)`;
   - `createBlock(orgId, userId, stayId, from, to, note)` (ownership check, then insert; an overlap becomes the 409 above);
   - `removeBlock(orgId, blockId)`;
   - `hostStay`'s booked-nights calendar also returns blocks.
3. Routes: `GET|POST /api/host/stays/[id]/blocks`, `DELETE /api/host/stays/[id]/blocks/[blockId]` (owner only for writes).

Done when a block stops a guest checkout on those nights in dev.

### 3. Screens
1. `src/screens/host/host-stay-screen.tsx` (owners only): an "Edit details" button opening `host-stay-edit-screen.tsx`:
   - `TextField` for price, guests and each rule and highlight;
   - `Stepper` for guests;
   - time `Sheet` pickers;
   - `Toggle` for pets;
   - amenity `Chip`s;
   - Save uses `reportInvalid` and toasts.
2. A "Block dates" button opening a `Sheet` with `DateRangeCalendar` (booked and blocked nights disabled) and an optional note.
3. The calendar legend gets "Blocked" (`accent-deep`) next to "Booked".
4. Route files `src/app/(app)/host/stays/[id]/edit.tsx`.
5. Loading, error and empty states as in prompts/19.

Checked on the phone with Argent.

### 4. Deploy
The user adds `SANITY_HOST_WRITE_TOKEN` to EAS production (sensitive) and the migration is applied to Neon `main`; then `deploy-prod.ps1`.

## Verification
- tsc and lint pass.
- **Script (dev):**
  - an owner's valid edit saves and is visible in `GET /api/stays/<slug>`;
  - each invalid field is refused with 400;
  - a stale `_rev` gets 409;
  - a member gets 403, and another organization's stay 404;
  - block create, overlap with a booking (409), overlap with a block (409), guest checkout over a block refused, remove.
- **Phone (dev build):** as Lena's owner, edit the price and a house rule, then see both on the guest stay page; block 3 nights and see them on the host calendar; a guest booking those nights is refused.
- **Production:** after deploy, the same price edit through the live API with a test owner.

## AGENTS.md updates
- **Rules:** add `SANITY_HOST_WRITE_TOKEN` to the secret list (server-only, sensitive in EAS, host edits only); keep "`SANITY_WRITE_TOKEN` is never uploaded".
- **Hosting:** phase 2 edits (allowed fields, owner-only, `ifRevisionID`) and blocks (`bookings.status = 'blocked'`, `user_id` `block:<uuid>`, same exclusion constraint).
- **Content:** host edits patch the published stay; rerun `write-stay-copy.ts` after highlights change.

## Result
- Built:
  - `db/migrations/003_blocks.sql` (applied to Neon `dev`);
  - `src/lib/server/host.ts` (`hostBlocks`, `createBlock`, `removeBlock`; `hostStay` returns `blocks`);
  - `src/lib/server/host-edit.ts` (`parseStayEdit`, `hostStayEditable`, `updateHostStay` with `ifRevisionID`);
  - routes `api/host/stays/[id]/blocks` (GET, POST owner), `api/host/stays/[id]/blocks/[blockId]` (DELETE owner) and `api/host/stays/[id]/edit` (GET and PATCH, owner). The editable fields live on their own `/edit` route rather than on `GET /api/host/stays/[id]`, because only owners may read them;
  - shared limits and `STAY_TIMES` in `src/lib/host-shared.ts`;
  - screens `block-dates-sheet.tsx`, `host-stay-edit-screen.tsx` (route `src/app/(app)/host/stays/[id]/edit.tsx`), owner buttons and a Blocked list in `host-stay-screen.tsx`, a lime "Blocked" fill and legend in `booked-nights-calendar.tsx`;
  - `DateRangeCalendar` gained an optional `isUnavailable`;
  - `.env.example` gained `SANITY_HOST_WRITE_TOKEN`.
- Checked:
  - tsc and lint pass;
  - blocks, 15/15 against `dev`: create; overlap with a block and with the confirmed Spanish Villa booking refused (409); guest checkout over a block refused; another company refused (404); 5 invalid inputs refused (400); listed in stay details and not in host Bookings; removal by another company and with a malformed id gets 404; owner removal works. No rows left behind;
  - edit validation, 16/16: owner reads values and revision; another company gets 404; trimming and deduplication; 12 invalid inputs refused (400); a save without the token gets 503 with nothing written.
- With the token:
  - real save (price +£1, a new rule) visible in published data straight away; a stale revision refused (409); originals restored;
  - phone (Argent, dev build): device names read "Havenly app on Android"; as Lena owner, blocked 29–31 Oct (lime nights, Blocked list), removed it; edited guests 8→9 and price £560→£561 from the app (toast, header reloads to £561); values restored to £560 / 8.
  - Fixed while testing: rule and highlight fields now wrap (Android showed only the end of long text), and the stay screen reloads when returning from Edit details.
- Production (2026-10-28):
  - `SANITY_HOST_WRITE_TOKEN` in EAS production (sensitive), added by the user with `host-token-eas.mjs`;
  - migration 003 applied to Neon `main` through the Neon MCP in one transaction, recorded in `schema_migrations`; its constraints match `dev`;
  - redeployed: all six new host routes on https://havenly.expo.app answer 401 without a session (an unknown route answers 404).
- Not checked: a signed-in edit and block on production, which needs a production build and a production host owner (the user, invited to Lena with `invite-host.mjs --production`).
- `.expo/types/router.d.ts` was patched by hand for the new route because the dev server ran out of memory; the next `npx expo start` regenerates it.
