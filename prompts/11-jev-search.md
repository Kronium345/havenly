# 11 · Jev reads the search sentence, Context runs the query

Status: done

## Goal
A guest's sentence is read on the server by Jev. For each pet, amenity, stay type and vibe it decides whether the guest wants it, wants to avoid it, or just mentioned it, and it decides what each number means. Code turns those answers into GROQ and runs the query through the `havenly-search` Sanity Context endpoint. "Quiet cabin, no hot tub, £600 for 3 nights, 2 of us" then finds quiet cabins without a hot tub, under £200 a night, for 2 guests.

## Decisions
- Search already runs on the server (`POST /api/search` → `parseQuery` → `searchStays`). This plan changes how the sentence is read and where the query runs. The request shape, the chips and "remove chip / apply filters" (which send `parsed` back) stay as they are.
- **Code finds the candidates, and Jev only rates those** (user's choice). Candidates are vocabulary words found in the sentence: pets, amenities, stay types, vibes (`softWords`) and every number. Jev is never asked about something the sentence doesn't contain. A paraphrase with no vocabulary word ("somewhere to swim") still only ranks, as it does today.
- Each item gets one Jev `choice` question with three answers: `wanted`, `avoided`, `mentioned`.
  - `wanted`: pets, amenities and types become the filters they are today; a vibe ranks.
  - `avoided`: **excluded with a GROQ filter** (user's choice). Amenity → `!($amenity in amenities)`, type → `!(propertyType in $notTypes)`, pets → `petsAllowed != true`. It shows as a removable chip ("No hot tub", "Not a cabin", "Pet-free"). An avoided vibe is removed from the ranking text, since embeddings can't rank something lower.
  - `mentioned`: no filter, and the word stays in the ranking text.
- Each number gets one `choice` question: `maxPrice`, `minPrice`, `totalBudget`, `guests`, `nights`, `other`. Jev only labels the number; code reads the value from the text and applies it:
  - Out-of-range values are dropped: guests 1–50, nights 1–60, price 10–100000.
  - `totalBudget` becomes `maxPrice = floor(total / nights)` when a nights value is known. Without one it isn't applied.
  - A reversed min/max pair is swapped.
- Place (city, state), category (beach, city) and ranges such as "between 200 and 300" are still read by code, as today. Jev decides prices, guests and nights only by labelling numbers that code found (AGENTS: "Jev may choose between candidates code found, but never produces the value").
- **Fallback (user's choice):** if the Jev call errors or takes more than 2.5 s, the whole sentence is read by `parseQuery` exactly as today. If Jev's top answer for an item is under a cutoff (start at 0.6, tuned in Verification), that item keeps what `parseQuery` decided for it.
- **Query path (user's choice):** the query built by `buildSearch` runs through the `havenly-search` endpoint's `groq_query` tool (JSON-RPC over plain `fetch`, Bearer `SANITY_ORGANIZATION_TOKEN`). If Context errors, the same query runs on Sanity's HTTP API (`sanityQuery`) and the server logs that. Search never depends on Context being up.
- Values always go in as `$params`. If `groq_query` turns out not to accept params, **stop and ask**: values must never be put inline in query strings.
- New dependencies (approval asked with this plan): `ai` (≥ 7.0.105, which adds `experimental_evaluate`) and `@ai-sdk/typesafe-ai`, both pinned to exact versions. The model is pinned to a versioned Jev id (e.g. `jev-1.13.0`, not `jev-latest`) once the thresholds are tuned. No MCP client library: Context is called with `fetch`.
- The Jev request sends the sentence (at most 300 characters) and nothing else: no user id or email. Zero data retention and no training are set per request if the provider exposes those options. The sentence is never logged; logs hold counts and `readBy` only.
- `SearchResponse` gains `readBy: "jev" | "code"` so a guest's results can be traced to the reader that produced them. The app doesn't show it.
- Server files added for this use relative imports (like `stay-queries.ts`), so a local Node script can call them in Verification.

## Out of scope
- Paraphrase detection without vocabulary words, and Jev questions about options the sentence doesn't name.
- Jev for place, category or dates.
- The Ask chat and policy answers. They stay on keyword matching until the Knowledge Base endpoint exists.
- Showing an agent anything. Context is used only to run code-built GROQ.
- Any UI change beyond the new "avoided" chip labels.

## Steps
### 1. Check the endpoint and add the packages
- Run `tools/list` and `/initial-context` against `SANITY_CONTEXT_MCP_URL` with `SANITY_ORGANIZATION_TOKEN`; the token needs Context access first (it returns 403 today).
- Record `groq_query`'s input schema. Confirm that it accepts params and that `text::semanticSimilarity()` works through it.
- Install exact versions of `ai` and `@ai-sdk/typesafe-ai`.
- Add `TYPESAFE_AI_API_KEY`, `SANITY_ORGANIZATION_TOKEN` and `SANITY_CONTEXT_MCP_URL` to `.env.example` (names only).
- Done when: one test evaluate call (a boolean on a fixed sentence) returns from a local script; `groq_query` runs a params query with semantic scoring; tsc passes.
- If params aren't supported, stop here and report.

### 2. Candidates in code: `src/lib/search/candidates.ts`
Export the amenity, type and pet word lists from `parse-query.ts` instead of duplicating them. `findCandidates(sentence)` returns:
- items: `{ id, kind: "amenity" | "type" | "pets" | "vibe", key, phrase }`, where `phrase` is the words as typed;
- numbers: `{ id, value, phrase, hasCurrency }`, where `phrase` is the number plus about three words either side.

No Jev here. Done when a small table of sentences gives the expected candidates (checked with a scratch Node script).

### 3. Jev reader: `src/lib/server/jev.ts` and `src/lib/server/read-query.ts`
- `jev.ts` creates the TypeSafe provider from `TYPESAFE_AI_API_KEY` and exports one `evaluate` wrapper with a 2.5 s `AbortSignal` timeout.
- `readQuery(sentence, { cities })`:
  1. Runs `parseQuery` (the baseline) and `findCandidates`.
  2. With no candidates, returns the baseline with `readBy: "code"` and makes no Jev call.
  3. Otherwise sends all questions in one `experimental_evaluate` call, with the sentence as `state`. Each question's instructions quote its phrase; numbers are referred to by their phrase.
  4. Merges the answers into a `ParsedQuery`, using the cutoff and value rules above.
- `SearchFilters` gains `notTypes?: PropertyType[]`, `notAmenities?: AmenityKey[]` and `pets?: boolean` (`false` means pet-free). `sanitizeParsedQuery` keeps them with the same checks as their wanted forms.
- Done when the Verification sentences give the expected filters from a local script.

### 4. Query path: `src/lib/server/context.ts`, and `buildSearch` gets the exclusions
- `buildSearch` adds:
  - `!(propertyType in $notTypes)`;
  - `count(amenities[@ in $notAmenities]) == 0`;
  - `petsAllowed != true` when `pets === false`.
- `contextQuery(query, params)` calls `groq_query` and parses its result into the same shape as `sanityQuery`.
- `searchStays` tries `contextQuery` first and falls back to `sanityQuery` on any error (logs `Context query failed, used direct`).
- `knownCities` keeps the direct path.
- Done when search results for the same parsed query match through both paths.

### 5. Route, chips, response
- `search+api.ts` uses `readQuery` for `{ query }` and keeps `sanitizeParsedQuery` for `{ parsed }`. It returns `readBy`.
- `understood.ts` adds the chips "No <amenity label>", "Not a <type label>" and "Pet-free"; `withoutChip` removes them (`notType`, `notAmenity:<key>`, `pets`).
- Done when lint and tsc pass and the Search screen shows and removes the new chips.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- **Sentence table** (run `readQuery` from a local script, logging the merged filters and Jev's top probability per item, never sending them anywhere). About 20 sentences, including:
  - "quiet pet friendly cabin with a hot tub under $300 a night" → cabin + a-frame, pets, hot tub, max 300, quiet ranks
  - "cabin but no hot tub, we have a toddler" → avoided hot tub
  - "anything except an apartment for 4" → not apartment, 4 guests
  - "£600 for 3 nights, 2 of us" → max 200, 3 nights, 2 guests
  - "4 nights for 2 people under 250" → nights 4, guests 2, max 250
  - "no dogs please, allergic" → pet-free
  - "a villa with a pool not too remote" → villa, pool, "remote" not ranked
  - "hot tub would be nice but not essential" → hot tub mentioned (ranks, no filter)
  - "sleeps 6 between 150 and 300" → guests 6, 150–300
  - a sentence with no candidates → `readBy: "code"`, no Jev call
- Each failure is explained by its cause: the candidate code found, Jev's answer, the cutoff, or the query.
- Tune the cutoff from the table, then pin the Jev model id.
- **Fallback:** an invalid `TYPESAFE_AI_API_KEY` gives the baseline parse (`readBy: "code"`). An invalid Context URL still returns results via the direct path, with the log line.
- **On the phone** (Argent): type the "no hot tub" and "£600 for 3 nights" sentences on Search. Chips show "No Hot Tub", "Under £200", "3 nights"; no result has a hot tub. Removing "No Hot Tub" brings them back.
- **End to end:** fresh launch → Search → "quiet cabin, no hot tub, £600 for 3 nights, 2 of us". Expected: only cabins/A-frames for 2+ guests at £200 or less a night, none with a hot tub, quieter ones first.

## AGENTS.md updates
- **Search parsing:** rewrite it:
  - Code finds candidates (`candidates.ts`) and Jev rates them as wanted / avoided / mentioned, and labels numbers; place, category and ranges stay in code.
  - Uncertain answers keep `parseQuery`'s reading, and a Jev failure falls back to `parseQuery` entirely.
  - Avoided items exclude, and show "No …" chips.
- **Exact constraints:** add the exclusions (`notTypes`, `notAmenities`, `pets: false`).
- **Typed decisions:** say Jev is used by `/api/search` through `src/lib/server/jev.ts`, with the pinned model id and the cutoff.
- **Content / the app reads Sanity:** search queries run through the `havenly-search` Context endpoint (GROQ mode, `groq_query`, organization token), falling back to direct HTTP. The policy endpoint is still the planned Knowledge Base one.
- **Rules:** add `SANITY_CONTEXT_MCP_URL` beside the secret names.

## Result
Built steps 1–5, except the Context check in step 1: `havenly-search` returns 403 because `SANITY_ORGANIZATION_TOKEN` has no Context access. Search falls back to direct Sanity until that is fixed. Status stays `approved` until `groq_query`'s params support and a phone check are done.
- `ai` 7.0.154 and `@ai-sdk/typesafe-ai` 3.0.28 are pinned exactly. The current API is `experimental_decide` + `decisionModel`; `experimental_evaluate` and `evaluationModel` are deprecated aliases. The model is pinned to `jev-1.14.0`.
- **Sentence table:** all 20 sentences read as expected at a 0.6 cutoff, with 120–680 ms per Jev call. TypeSafe's provider exposes no zero-retention option, so none is set.
- **Code changes:**
  - A vibe word inside an amenity phrase ("views" in "mountain views") isn't asked about.
  - Avoided-type chips read "No Cabins" (plural labels), not "Not a cabin".
  - Choosing an excluded type or amenity in the filter sheet lifts its exclusion.
- `agent/` (skill reference files) was excluded from tsc and lint; it broke the type check.
- Phone check (SM-S942B, dev build, 2026-10-27) passed. Screenshots are in `Pictures/Screenshots/havenly-jev-search/`.
  - "quiet cabin, no hot tub, 600 pounds for 3 nights, 2 of us" → Cabins, Under £200, 2 guests, No Hot Tub, Quiet, 3 nights → 2 cabins.
  - "cabin but no hot tub" → 4 stays; removing "No Hot Tub" gives 7 stays.
  - "no dogs please, allergic" → Pet-free → 11 stays.
- Found on the phone: `useApiFetch` was rebuilt on every render (from `useAuth()` functions), so Search refetched after every response, about one request every 1.25 s while idle. Each refetch was a Jev call plus a semantic query. Fixed with a ref; now one request per action.
- `requireSession` logs Clerk's failure reason, never the token.
- Context is still not verified: the new token is a project token (project Viewer grants, not an organization member), and Context only accepts organization tokens.
- Context now works with an organization token. `groq_query` rejects `$params` ("Use literal values instead"); the user chose inlined literals. `inlineParams` writes each value as a `JSON.stringify` literal just before the call.
  - Checked: Context and direct Sanity give identical counts and order for 6 sentences × 2 sorts, including the injection-style text `cozy "]} || true || {"x": ...` (read as ranking text, 24 stays).
  - Cost: Context adds about 0.2–0.35 s per search (Context 0.24–0.45 s against direct 0.04–0.14 s).
- Final phone check (2026-10-27, through Context, no fallbacks in the server log): "cabin but no hot tub" → Cabins + No Hot Tub, 4 stays; removing the chip → 7 stays in about 2 s.
  - The first search took about 11 s because Metro's cache had been cleared to free disk space, so the server compiled the search route from scratch.
