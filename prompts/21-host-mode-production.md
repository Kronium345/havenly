# 21 · Host mode on production Clerk

Status: approved

## Goal
Host companies work on the production server (Clerk production instance on `daniel-awolowo.com`) as they do in dev: an invited owner sees their company's stays and bookings. Dev keeps working unchanged.

## Decisions
- **Why:** dev and production use different Clerk instances, so the same host company has a different organization id in each. Both read the same Sanity dataset, where `host.clerkOrgId` holds the dev id, and checkout copies it into `bookings.host_org_id`. On production, hosts would see no stays or bookings.
- **Fix:** a second field on `host`, `clerkOrgIdLive` (string, read-only in Studio, "Hosting account (production)"), next to `clerkOrgId` (dev). Same pattern as Stripe's `stripeCustomerId` / `stripeLiveCustomerId` (prompts/20).
- **Which field:** picked on the server from the Clerk secret key: `sk_live_` → `clerkOrgIdLive`, otherwise `clerkOrgId`. One helper, `clerkIsLive()` in `src/lib/server/clerk-mode.ts`, used by every host query and by checkout.
- **GROQ stays parameterised:** queries use `select($live => host->clerkOrgIdLive, host->clerkOrgId)` with `$live` passed as a param, never a field name pasted into the string.
- **Scripts:** `scripts/invite-host.mjs` and `scripts/backfill-host-org.mjs` write and read the field for the key they run with. `invite-host.mjs --production` asks for the Clerk production secret key with hidden input (never stored, never printed), so inviting on production doesn't need the key in `.env.local`.
- Bookings already in Neon `main`: none, so there's nothing to backfill on production. Dev rows keep their dev ids.
- No change for guests, the app screens or the API shapes.

## Out of scope
- Phase 2 (hosts edit stays, block dates) and phase 3 (Stripe Connect payouts) from prompts/19.
- Separate Sanity datasets for dev and production.
- Copying dev users or organizations into production (they start fresh).

## Steps
### 1. Sanity schema
Add `clerkOrgIdLive` to `studio/schemaTypes/documents/host.ts` after `clerkOrgId` (same shape: string, `readOnly: true`, title "Hosting account (production)", description "Clerk production organization. Set by scripts/invite-host.mjs --production; not edited here."). Retitle `clerkOrgId` to "Hosting account (dev)". Deploy the schema (`cd studio && npx sanity schemas deploy`) and Studio (`npx sanity deploy`). Done when Studio shows both read-only fields and existing hosts are unchanged.

### 2. Server: pick the field by mode
Create `src/lib/server/clerk-mode.ts` with `clerkIsLive()` (true when `CLERK_SECRET_KEY` starts with `sk_live_`). In `src/lib/server/host.ts`, replace each `host->clerkOrgId == $orgId` with `select($live => host->clerkOrgIdLive, host->clerkOrgId) == $orgId` and pass `live: clerkIsLive()`. In `src/lib/server/bookings.ts` (checkout's stay query), do the same for `"hostOrgId"`. Done when tsc and lint pass and dev host mode still shows Lena's 4 stays and the Spanish Villa booking.

### 3. Scripts
`scripts/invite-host.mjs`: add `--production` (hidden prompt for an `sk_live_` key, checked against `GET /v1/domains` for `daniel-awolowo.com`); list and link using the field for that key (`clerkOrgIdLive` in production). `scripts/backfill-host-org.mjs`: read the field for the key it runs with. Done when `invite-host.mjs --dry-run` in both modes prints the right field and organization.

### 4. Deploy
Run `clerk-live.mjs` (production Clerk keys + `havenly://sso-callback` allowlist), then `deploy-prod.ps1`.

## Verification
- tsc and lint pass.
- **Dev (sk_test):** host home on the phone shows Lena, 4 stays, the Spanish Villa booking; guest booking still stores `host_org_id` = the dev organization.
- **Query check (script, dev key):** for `live: true` and `live: false`, the host stays query returns Lena's 4 stays only when the matching field holds the organization id (using a throwaway organization written to the field and removed afterwards).
- **Production:** `invite-host.mjs --production --host <Lena> --email <owner>` creates the production organization and fills `clerkOrgIdLive`; on a production build, the owner accepts in-app, switches to hosting and sees 4 stays; a test booking on Lena's stay appears in host Bookings, and its `bookings.host_org_id` in Neon `main` is the production organization id.

## AGENTS.md updates
- **Hosting:** `host.clerkOrgId` (dev) and `host.clerkOrgIdLive` (production), picked by `clerkIsLive()`; queries use `select($live => …)`; invite on production with `invite-host.mjs --production`.

## Result (built; production check pending)
- Built: `clerkOrgIdLive` in `studio/schemaTypes/documents/host.ts` (Studio tsc passes); `src/lib/server/clerk-mode.ts` (`clerkIsLive`, `HOST_ORG_ID`, `hostOrgParams`) used by every host query in `host.ts` and checkout's stay query in `bookings.ts`; `invite-host.mjs --production` (hidden key prompt, links `clerkOrgIdLive`, no backfill since Neon `main` isn't in `.env.local`), `backfill-host-org.mjs` picks the field by key, helpers in `host-link.mjs`.
- Checked: tsc and lint pass; with real Sanity data, `live=false` matches Lena's 4 stays and checkout stores her dev organization, `live=true` matches none and stores null until a production organization is linked; dev host summary unchanged (Lena, 4 stays, 1 upcoming, 3 nights); `invite-host.mjs --list` / `--dry-run` / backfill run in dev.
- Pending:
  - `npx sanity schemas deploy` + `npx sanity deploy` from `studio/` (the local deploy ran out of memory; the field works without it, it only shows the field in Studio);
  - the production run: `clerk-live.mjs`, `deploy-prod.ps1`, `invite-host.mjs --production`, then the production-build checks in Verification.
