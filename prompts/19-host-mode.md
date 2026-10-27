# 19 · Host mode (view only)

Status: approved

## Goal
A host company's team members see, inside the same app, their company's stays, the upcoming bookings across those stays, and which nights each stay is booked. Owners invite and remove team members. Guests never see any of it. This is phase 1 of 3 (2: hosts edit stays and block dates; 3: Stripe Connect payouts).

## Decisions
- **Host company = Clerk Organization.** Organizations are currently **disabled** on the dev instance (`organization_settings.enabled: false`). Step 1 enables them through the Clerk MCP (`patch_instance_config`, after a `dry_run`), and also:
  - turns off automatic organization creation;
  - keeps `force_organization_selection` off, since guests have no organization;
  - stops ordinary users creating organizations: only the invite script creates them. The exact setting is checked in `get_instance_config_schema` during the step.
- **Roles:** Clerk's default `org:admin` (owner: everything, invites and removes members) and `org:member` (staff: view only). No custom roles, which may need a paid plan; revisit in phase 2.
- **Invite only** (user's choice): `scripts/invite-host.mjs --host <sanity host id> --email <owner email>`:
  1. creates the organization (named after the Sanity host);
  2. stores the organization id on the Sanity host;
  3. invites the email as `org:admin`, using Clerk's invitation email.

  It's idempotent: an existing organization is reused, and an existing invitation is reported. There's no in-app "Become a host".
- **Sanity schema change** (live content, so it needs this approval): `host` gains `clerkOrgId` (string, read-only in Studio, in a "Hosting" group).
  - The field is in the public dataset. An organization id isn't secret, and it's only ever compared on the server.
  - Deploy the schema, then redeploy Studio (AGENTS rule). Written by the script with `SANITY_WRITE_TOKEN`.
- **Bookings carry the host:** migration `002_host_org.sql` adds `host_org_id text` and an index to `bookings`.
  - `startCheckout` reads `"hostOrgId": host->clerkOrgId` with the stay and stores it on the row.
  - `scripts/backfill-host-org.mjs` fills existing rows from Sanity, and the invite script runs the same fill for the host it links.
  - Host queries filter only on `host_org_id = <session's organization>`. A stay moved to another host keeps its past bookings with the old company, which is correct for history.
- **Server checks:** `requireSession` also returns `orgId` and `orgRole` from the verified token (v2 claims `o.id` / `o.rol`; checked against the installed `@clerk/backend` types before use). The new `requireHost(request, { admin? })` returns 403 "Switch to your hosting account." without an active organization, and 403 for members on admin-only actions. Organization ids are never taken from the request body or URL.
- **Active organization:** guests act with no active organization.
  - "Switch to hosting" calls `setActive({ organization })` (one organization: straight in; several: a picker Sheet), then pushes `/host`.
  - Leaving host mode calls `setActive({ organization: null })`.
  - The guest API routes ignore the organization, so nothing guest-side changes.
- **Placement** (user's choice): Profile gets a "Switch to hosting" row, rendered only when `useOrganizationList({ userMemberships: true })` has at least one membership, so guests never see it.
- **Screens** (pushed over the tabs, like stay pages; existing design-system pieces only; loading, error and empty states on each):
  - `/host`: company name and role, three stats (`StatGroup`: stays, upcoming bookings, nights booked in the next 30 days), and rows to Stays, Bookings and Team, plus "Back to travelling".
  - `/host/stays`: the company's stays (photo, title, place, price, rating), from Sanity `*[_type=="property" && host->clerkOrgId == $orgId]`. Tapping one opens `/host/stays/[id]`, with a `DateRangeCalendar`-style month view marking booked nights (read only) and that stay's upcoming bookings.
  - `/host/bookings`: Upcoming / Past segments; rows show the stay, guest, dates, nights, guest count and status (confirmed / cancelled).
  - `/host/team` (admin actions only): members with their role, pending invitations, "Invite by email" (`organization.inviteMember`, role picker), revoke an invitation, and remove a member (confirmation Sheet; an admin can't remove themselves). Members see the list only.
- **Guest privacy** (user's choice): a guest is shown as first name and last initial ("Daniel A."), looked up on the server from Clerk by user id. No email, phone or photo. Holds and expired rows are never shown.
- **API:** `GET /api/host/summary`, `GET /api/host/stays`, `GET /api/host/stays/<id>` (404 unless the stay is this company's), `GET /api/host/bookings?when=upcoming|past`. Team actions use Clerk's client SDK directly; it enforces the admin role.
- **Events:** `host_mode_entered`, `host_member_invited`, `host_member_removed` (ids and roles only).
- No new dependencies or services.

## Out of scope
- Editing stays, blocking dates (phase 2).
- Payouts and Stripe Connect (phase 3).
- Messaging guests, public host sign-up, custom roles, a web host dashboard.

## Steps
### 1. Clerk organizations and session claims
- Enable organizations as described (dry run first, then apply).
- Extend `requireSession` with `orgId` and `orgRole`; add `requireHost`.

Done when tsc passes and a script shows a dev token with no organization gets 403 from a stub host route.

### 2. Schema and data link
- Add `clerkOrgId` to the `host` schema; deploy the schema and Studio.
- Add migration `002_host_org.sql`; store `host_org_id` in `startCheckout`.
- Write `scripts/invite-host.mjs` and `scripts/backfill-host-org.mjs`.

Done when the migration is applied on `dev` and a dry run of the invite script prints the plan.

### 3. Host API
`src/lib/server/host.ts` (queries, guest-name lookup with a per-request cache) and the four routes.

Done when tsc passes.

### 4. Host screens
- `src/app/(app)/host/` routes and `src/screens/host/` screens.
- The Profile row and the organization picker Sheet.

Done when lint and tsc pass and the screens are compared on web at phone width.

## Verification
- tsc and lint pass.
- **Script** (Neon `dev`, Sanity, throwaway Clerk users and organization, all cleaned up):
  - a guest token gets 403 from `/api/host/*`;
  - a host member sees only their company's stays and bookings; another company's stay id returns 404;
  - guest names come back as "First L.", with no email anywhere in the responses;
  - holds are hidden;
  - a member can't invite (Clerk refuses); an admin can;
  - bookings made after linking carry `host_org_id`.
- **Phone:**
  - link one real Sanity host to your email with the invite script, accept the invitation, then Profile → Switch to hosting;
  - see stays, the calendar and the Spanish Villa booking if it's that host's;
  - Back to travelling returns to guest mode;
  - a second account without an organization sees no hosting row.

## AGENTS.md updates
- **Who owns what:**
  - a new **Hosting** entry: Clerk Organizations (default roles, invite only via `scripts/invite-host.mjs`), Sanity `host.clerkOrgId`, `bookings.host_org_id`, `/api/host/*` with `requireHost`, and the active organization set only in host mode;
  - guest details shown to hosts are first name and last initial only.
- **Rules:** host routes take the organization only from the verified session.

## Result (in progress)
Steps 1–4 are built. tsc and lint pass. Status stays `approved` until the phone checks.
- **Clerk** (dev instance, applied through the Clerk MCP after a dry run): Organizations enabled; automatic creation, email-domain detection and admin deletion of organizations are off. The schema has no instance-wide "users may create organizations" switch. A self-made organization isn't linked to any Sanity host, so it sees nothing.
- **Sanity:** `host.clerkOrgId` (read only) deployed, and Studio redeployed.
- **Neon:** `002_host_org.sql` applied on `dev`.
- **Scripts:** `scripts/invite-host.mjs` (`--list`, `--dry-run`), `scripts/backfill-host-org.mjs`, shared `scripts/host-link.mjs`.
- **Server:** `requireSession` returns `orgId` / `orgRole` (v1 `org_*` and v2 `o` claims; the v2 role has no `org:` prefix); `requireHost`; `src/lib/server/host.ts`; `/api/host/{summary,stays,stays/<id>,bookings}`.
- **App:**
  - `src/screens/host/*`: home, stays, stay with a read-only `BookedNightsCalendar`, bookings, team;
  - `useHosting`: memberships, pending invitations (accepted in-app from the hosting Sheet), enter and leave;
  - Profile shows "Switch to hosting" only for members or invitees.
- **Script test:** 13/13 passed (Neon `dev`, Stripe sandbox, throwaway Clerk user and organizations; host Priya linked temporarily and unlinked afterwards). Covered: a guest token gets 403; new bookings carry `host_org_id`; organizations see only their own stays and bookings, and another company's stay is 404; guest shown as "Testy G." with no email in responses; holds hidden; calendar ranges; summary counts; backfill.
- **Not checked yet:** a member being refused invitations (Clerk enforces it client-side; phone check), and the web or phone visual check, which needs a signed-in host account.
