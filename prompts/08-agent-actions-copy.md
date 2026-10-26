# 08 · Stay copy written by Agent Actions from each stay's own facts

Status: done

## Goal
Every stay's `summary` and `description` is rewritten by Sanity Agent Actions from that stay's own fields, then checked so that it claims nothing those fields don't say. Copy that passes is published, so the app and search pick it up. Copy that fails stays as a draft for review in Studio. The script can be rerun for one stay or all of them whenever a stay's facts change.

## Decisions
- **Fact source (user choice):** new `highlights` field on `property`: a list of short host facts about surroundings and feel ("creek behind the cabin", "quiet dead-end lane", "cafés downstairs"). Generated copy may use only `highlights` plus the existing fields: `title`, `propertyType`, `category`, `place`, `maxGuests`, `bedrooms`, `beds`, `bathrooms`, `petsAllowed`, `amenities`, `houseRules`, `checkInTime`, `checkOutTime`, and the photos' `alt` text.
- **Seeding highlights:** taken from today's hand-written descriptions and summaries, one fact per item, so the "quiet", "secluded" and "cozy" searches keep matching. These are the only words carried over from the old copy. Rating, review count, price, host and policies are left out of the copy: they show elsewhere in the app and change over time.
- **Write mode (user choice):** Generate writes the draft. If the check passes, the script publishes it at once. If it fails after the retry, the draft stays unpublished with the reasons printed, and the published copy is untouched.
- **Dependency (user choice):** `@sanity/client` pinned to an exact version in `studio/package.json` (npm, not expo install). The app's dependencies don't change.
- **Script:** `studio/scripts/write-stay-copy.ts`, run with Node 24's built-in TypeScript support: `node --env-file=../.env.local scripts/write-stay-copy.ts [--slug <slug>] [--dry-run]`. `--dry-run` generates into the draft and checks it, without publishing. The script is a local script, so it may use the write token (AGENTS.md rule).
- **Token:** `SANITY_WRITE_TOKEN` (an Editor API token for project `wutkash1`) in `.env.local` only. Its name, with no value, goes in `.env.example`. It is never prefixed `EXPO_PUBLIC_` and never imported by `src/`.
- **Generate call:** `client.agent.action.generate` with `apiVersion: 'vX'`, the deployed `schemaId`, `documentId: <stay _id>`, `target: [{path: 'summary'}, {path: 'description'}]`, and the facts passed as one `groq` instruction param (`$facts`) that projects only the fields listed above. The facts never include the current `summary` or `description`, so old wording can't leak back in. Temperature stays at the default.
- **Instruction (summary):** the copy must use only `$facts`. Summary: one sentence, at most 120 characters, no price. Description: two to four sentences on how the stay feels and what's around it, written for a guest. No numbers that aren't in the facts. No invented places, distances, views, sounds, people or amenities. Plain words, no exclamation marks. Mention pets only as `petsAllowed` says.
- **Check, two layers, both must pass:**
  1. **Code** (no AI): summary is at most 120 characters with no `£` or `$`. Every number in the copy appears in the facts. Every amenity named in the copy (matched on the amenity titles in `studio/schemaTypes/shared/options.ts` plus a few plain synonyms, such as "hot tub" or "pool") is in `amenities`. "Pets welcome" or "pet friendly" appears only when `petsAllowed` is true.
  2. **Agent Actions Prompt** (`client.agent.action.prompt`, `format: 'json'`, `temperature: 0`): given `$facts` and the new copy, list each claim in the copy that the facts don't support, as `{"unsupported": ["…"]}`. An empty list passes.
- **Retry:** on a failed check, generate once more, passing the failed claims as "don't say" items. If it fails again, the draft stays unpublished and its claims are printed.
- **Embeddings:** the projection stays as it is (`summary` and `description` already in it), so the published copy is re-embedded automatically. `highlights` is not added to the projection: it reaches ranking through the description, and changing the projection means rebuilding the index.

## Out of scope
- Running generation from Studio (AI Assist field actions), or automatically through Sanity Functions when facts change.
- Generating `title`, `houseRules`, image alt text or host bios.
- Showing `highlights` in the app.
- Jev, Sanity Context and policy Q&A.

## Steps
### 1. Token and dependency
The user creates an Editor API token for `wutkash1` (sanity.io/manage → API → Tokens) and adds `SANITY_WRITE_TOKEN=` to `.env.local`. I add the name to `.env.example`. Then `cd studio && npm install --save-exact @sanity/client@<current>`. I confirm Agent Actions are enabled for the organization: a one-line `prompt` call must not return 403.
Done when the test prompt returns text and `git status` shows no token.

### 2. `highlights` field
In `studio/schemaTypes/documents/property.ts`, add `highlights` to the `listing` group, after `description`. It is an array of `string`, at most 8 items, each at most 80 characters, and optional. Its description reads: "Short facts about the stay's surroundings and feel, in the host's words. Generated copy may only use these and the other fields." The `description` field's description also gains: "Written by scripts/write-stay-copy.ts from this stay's facts." Deploy the schema (`npx sanity schemas deploy`) and Studio (`npx sanity deploy`), and note the schema ID for Agent Actions (`npx sanity schemas list`).
Done when Studio shows the field and the schema list shows the new deploy.

### 3. Seed highlights
For each of the 24 stays, write 2 to 6 highlights taken only from its current summary and description. Patch and publish them through the Sanity MCP. Before patching, list them in the chat for the user to read.
Done when `count(*[_type=="property" && count(highlights) > 0])` is 24.

### 4. The script
Write `studio/scripts/write-stay-copy.ts`:
- **Shared building blocks:** a client built from `EXPO_PUBLIC_SANITY_PROJECT_ID`, `EXPO_PUBLIC_SANITY_DATASET` and `SANITY_WRITE_TOKEN`, failing fast with a clear message if any is missing; the facts GROQ projection; the generate instruction; the code check; the prompt check.
- **Per stay:**
  1. Generate into the draft.
  2. Read the draft's summary and description.
  3. Check them.
  4. If the check fails, retry once.
  5. If the check passes and this isn't a dry run, publish the draft.
  6. Print one line: slug, then `published`, `draft (failed: …)` or `dry run ok`.
- Stays run one after another, not in parallel, to stay inside rate limits.

Run it first with `--slug a-frame-in-the-redwoods --dry-run` and show the user the old and new copy side by side. Then run it on all stays.
Done when every stay is published, or listed as a failed draft with its reasons.

### 5. Search still works
Rerun the plan 06 search cases against the new published copy and compare them with the results recorded there:
- quiet pet cabin hot tub under £300
- Cabins in California
- beachfront villa pool for 6
- Hawaii for 3 nights
- castle in Scotland under £50

Also run the soft-intent query "quiet cabin in the forest". The hard-filter cases must return the same stays. If the top results for soft intent change, report them by cause: the copy changed, or the highlights.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass for the app. The script type-checks with `npx tsc --noEmit` in `studio/`.
- `git status` shows no `.env.local` or token. `grep -r SANITY_WRITE_TOKEN src/` finds nothing.
- **Code check self-test:** feeding the check a hand-made bad copy ("hot tub" on a stay without one, "sleeps 10" on a stay for 4, "pets welcome" on a no-pets stay) fails each case. Feeding it the generated copy passes.
- **Prompt check self-test:** a copy with an invented "steps from the beach" on an inland cabin is flagged.
- **Spot check:** for 5 stays, read the facts and the published copy side by side. Every claim must trace to a field or highlight. I list any that don't.
- Script output for the full run: all 24 accounted for (`published` or `draft (failed: …)`). `*[_type=="property" && _id in path("drafts.**")]` lists only the failed ones.
- The search cases from Step 5 run as described.
- **End to end:** open Home and a stay in the app. The new copy shows, and searching "quiet cabin in the forest" still returns forest cabins first.

## AGENTS.md updates
- **Commands:** `cd studio && node --env-file=../.env.local scripts/write-stay-copy.ts [--slug <slug>] [--dry-run]`.
- **Who owns what → Content:** replace "generated property copy uses Agent Actions" with: `summary` and `description` are written by `studio/scripts/write-stay-copy.ts` (Agent Actions Generate) from the stay's fields, `highlights` and photo alt text only, checked in code and by Agent Actions Prompt, published only when nothing is unsupported. Edit facts or `highlights`, then rerun the script; don't hand-edit the copy.
- **Rules:** `SANITY_WRITE_TOKEN` joins the list of secret keys (local scripts only).

## Result
All 24 stays have a `summary` and `description` written by `studio/scripts/write-stay-copy.ts` and published. Every stay passed the code check and the Agent Actions Prompt check on the first attempt, so no drafts were left. Each stay has 3–5 `highlights`, taken from the old hand-written copy.
- **Changes from the plan:**
  - The facts go to Generate and to the check as one constant JSON value, not a `groq` param, so both see exactly the same facts.
  - Before generating, the script recreates the draft without `summary` and `description`, so no old wording can reach the generator.
  - The client types a JSON `prompt` result as `string`, so the script casts it.
- **Code check self-test:** it rejected an unlisted hot tub, "Sleeps 10" on a stay for 4, pets at a no-pets stay, a £ price, and a 130-character summary. It accepted negated amenities ("no pool, no hot tub") and copy built only from the facts.
- **Spot check:** five stays checked; every claim traces to a field, a highlight or a photo alt ("books" in Silver Lake comes from the photo alt; the life jackets on the lake cabin's dock come from its house rules).
- **Search:** results match plan 06 (quiet pet cabin hot tub under £300 → Modern Cabin with Hot Tub, Sunset A-Frame; Cabins in California → 6; beachfront villa pool for 6 → Oceanview Villa; Hawaii for 3 nights → 2; castle in Scotland under £50 → 0). "quiet cabin in the forest" still ranks Log Cabin in the Woods first.
- **Left for later:** some descriptions list amenities and room counts, which reads like a spec sheet; the instruction can ask for less of that. Rerun the script after changing a stay's facts or highlights.
