# 13 · Ask chat answers from the havenly-policies Knowledge Base

Status: done

## Goal
A question asked in "Ask about this stay" goes to an API route. Jev picks which Havenly policy sentences and stay facts answer it, and the chat shows them word for word as answer cards with their source.

## Decisions
- **Route:** `POST /api/stays/<slug>/ask` with `{ question }` (at most 300 characters). `requireSession` runs first.
- **Knowledge Base:** `havenly-policies` (Knowledge Base mode, `SANITY_CONTEXT_KB_URL`, `SANITY_ORGANIZATION_TOKEN`), knowledge base `kb9It5z5WMyT`, 7 entries. It's read with `knowledge_base_read` over plain `fetch` (JSON-RPC), and entry paths come from the outline (`/initial-context`).
- **Card text: source sentences** (user's choice).
  - The entries' prose is a rewrite (and partly says "Roam"), so it's never shown.
  - Each entry's footnotes quote source sentences, e.g. `[^id]: "…" (Flexible cancellation, line 12)`. Each quote is matched to the Sanity `policy` whose title is named, and to the sentence in its `body` or `summary` that contains the quote. The card shows that **full Sanity sentence**, which also repairs truncated quotes such as "…(GBP".
  - A quote matching no sentence is dropped and logged (title only), never shown.
- **Stay facts too** (user's choice): this stay's check-in and check-out times, each house rule, and its pets-allowed flag (shown as the existing labels "Pet friendly" / "Pets aren't allowed") are candidates. Policy sentences about cancellation are offered only from the stay's own tier (`cancellationPolicy`).
- **Jev:**
  - One `experimental_decide` call (`decideChoices`'s sibling in `jev.ts`, for booleans) with one boolean question per candidate: "Does this text help answer the guest's question?" The state is the question; each candidate's text goes in its own question.
  - Candidates scoring at least `ASK_CUTOFF` (start at 0.6, tune in Verification) are shown, grouped into one card per source in source order. At most 3 cards, with at most 4 sentences each. None passing gives "No answer found".
- **Caching:** the outline, entries and matched sentences are kept in module memory for 5 minutes.
- **Fallback** (user's choice): a Knowledge Base failure (4 s timeout) or a Jev failure (2.5 s) means the route answers with `answerQuestion` from `src/lib/ask/answer.ts` on the stay's data. If the app can't reach the route, it runs the same matcher locally on the stay it has already loaded. Responses carry `answeredBy: "jev" | "keywords"`.
- **App:** the Ask screen calls the route through `useApiFetch`, and the typing indicator shows until the reply arrives (the fixed 500 ms delay goes). Cards, chips and "No answer found" look the same. Sources keep today's labels and links: "<Policy> · Havenly policy" opens Policies (the cancellation section for the tier), and "This stay's details" / "This stay's house rules" open the stay.
- **PostHog:** `stay_question_asked` gains `answered_by`. The question itself goes only to Jev, and is never logged or sent to PostHog.
- No new dependency or schema change. `.env.example` gains `SANITY_CONTEXT_KB_URL`.

## Out of scope
- Phone testing until disk space is cleared (user's instruction).
- Knowledge Base search: there are 7 entries, so all are read and cached.
- Any generated or reworded answer text.

## Steps
### 1. Read the Knowledge Base: `src/lib/server/policy-kb.ts`
- Fetch the outline, read all entry paths, and parse the footnotes into `{ quote, sourceTitle }`.
- Load the policies from Sanity (`title`, `topic`, `summary`, `body`), split them into sentences, and match each quote to a sentence by normalized containment.
- Return `PolicySentence[] = { policyId, title, topic, text }`, with a 5-minute cache.

Done when a script lists every quote with its Sanity sentence, and any unmatched quotes are explained.

### 2. Candidates and Jev: `src/lib/server/ask-question.ts`
`askQuestion(question, stay)`:
1. Builds the candidates (policy sentences, filtered to the stay's own tier, plus the stay's facts).
2. Asks Jev.
3. Groups the chosen candidates into `AnswerCardData` (reusing the shape from `answer.ts`).
4. Falls back to `answerQuestion` on failure.

Done when the question table in Verification passes from a script.

### 3. Route: `src/app/api/stays/[slug]/ask+api.ts`
Session check, `stayBySlug`, `askQuestion`, then return `{ answer, answeredBy }`. A stay that doesn't exist gives 404; an empty question gives 400.

Done when tsc and lint pass and `curl` without a session returns 401.

### 4. Ask screen
`ask-screen.tsx` calls the route, keeps the double-submit guard (a ref while a request is pending), falls back to the local `answerQuestion` on a network error, and adds `answered_by` to the event.

Done when lint and tsc pass.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- **Question table** (script, logging candidate scores only):
  - "can I bring my pup" → this stay's pets fact and the Pets policy
  - "what if I bail on the trip" → only the stay's own tier
  - "when do I get my money back" → the Payments refund sentence (and the tier's)
  - "is smoking ok inside" → the house rules default
  - "what time can I arrive" → this stay's check-in time
  - "can my friend sleep over" → the overnight guests sentence
  - "is there a fire extinguisher" → Safety
  - "what happens if I break a glass" → Damage
  - "what's the wifi password" → No answer found
  - plus about 10 more realistic questions
- Every sentence shown is checked as an exact substring of its Sanity policy or stay field.
- **Fallback:** an invalid Jev key, and separately an invalid Knowledge Base URL, each give keyword answers with `answeredBy: "keywords"`.
- Phone check deferred until the user has cleared space.

## AGENTS.md updates
- **Policy knowledge:** `havenly-policies` (Knowledge Base mode, `SANITY_CONTEXT_KB_URL`). Cards show Sanity policy sentences located through the entries' footnote quotes, and never the entries' prose.
- **Answer text:** the Ask chat answers through `/api/stays/<slug>/ask` (Jev picks candidates), with the keyword matcher as fallback. Remove "Until Jev and Context land…".
- **Typed decisions:** add the Ask route.

## Result
Steps 1–4 are built. Status stays `approved` until the phone check, which the user deferred until disk space is freed.
- **Knowledge Base:** 34 footnote quotes from 7 entries, and every one was located as a stored Sanity sentence, word for word. Two-sentence quotes and the cut-short "(GBP" quote resolve correctly; none were unmatched. Loading takes about 0.6 s, then 0 ms from the cache.
- **Question table:** 20 questions × 2 stays (Wooden Beach Lodge: pets allowed, Flexible; Overwater Beach Bungalow: no pets, Strict). All 40 were answered by Jev, in 130–580 ms each.
  - Each stay got its own tier, check-in time and pets fact. "what's the wifi password" gives No answer found.
  - Misses: "is the hot tub safe for kids" found nothing on the Lodge; "something was already broken" also returned a Strict-tier sentence. The cutoff was left at 0.6.
- **Fallback:** an invalid Jev key and an invalid Knowledge Base URL each give keyword answers (`answeredBy: "keywords"`).
- **Route:** compiles in Metro and returns 401 without a session. tsc and lint pass.
- **Other changes:** `context.ts` gained `callContextTool` and `contextOutline`, shared with search. Card keys on the Ask screen became `topic:source`, since a stay's house rules and the House rules policy share a topic.
- **Phone check** (SM-S942B, dev build on 8081, 2026-10-27), all answered by Jev. Screenshots are in `Pictures/Screenshots/havenly-ask-kb/`.
  - Wooden Beach Lodge, "can I bring my pup" → three cards: Pet friendly (This stay's details), Pets policy sentences (Pets · Havenly policy) and "Up to 2 pets" (This stay's house rules).
  - Overwater Beach Bungalow, "what if I bail on the trip" → only the four Strict cancellation sentences, plus the Payments refund sentence.
  - "whats the wifi password" → No answer found.
  - Requests took 3–4.6 s on the dev build (the first one included compiling the route). Jev itself takes about 0.15 s. The rest is the dev server, the session check and loading the stay, which plan 12's timing step can break down.
