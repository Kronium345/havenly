# 10 · Ask about this stay (chat screen, sample answers, no backend)

Status: done

## Goal
From a stay's page, guests open a chat and ask about the stay, by typing or by tapping a topic chip. A chip sends its question as a message. Each reply is one answer card per topic matched, never a written paragraph. A card quotes this stay's own data or Havenly's policy word for word, with a source label. Answers are matched in the app for now. Jev and Sanity Context replace the matching in a later plan, without changing the screen.

## Decisions
- **Answers (user choice): this stay's real data, matched in code.**
  - **Data:** the screen loads `GET /api/stays/<slug>`, which the stay page already uses: `houseRules`, `checkInTime`/`checkOutTime`, `petsAllowed`, `cancellationPolicy`, and `havenlyPolicies`. There's no new API route, no LLM, and no Jev. AGENTS.md's "no generated answer text" rule holds, because every card body is stored text shown as is.
  - **Matching:** a question is matched to topics by keywords. Several matches give several cards, in the topic order below. No match gives one "not found" card, which says so and points to support (AGENTS.md rule).
- **Entry (user choice):** the stay page's "Ask about policies" card (copy unchanged from the design) now opens `/stay/[slug]/ask` instead of the policies page. The cancellation card still opens the policies page at Cancellation, and so do answer sources.
- **Topics, their chips and the question each chip sends** (`src/lib/ask/topics.ts`; keys match Sanity `policyTopics`):

  | Key | Chip | Sends | Keywords (lowercase, whole words or phrases) |
  |---|---|---|---|
  | `cancellation` | Cancellation | "What's the cancellation policy?" | cancel, cancellation, refund |
  | `checkIn` | Check-in | "What are the check-in and check-out times?" | check-in, check in, checkin, check-out, check out, checkout, arrive, arrival, leave, late |
  | `houseRules` | House rules | "What are the house rules?" | rule, rules, party, parties, smoking, smoke, quiet, noise, music |
  | `pets` | Pets | "Can I bring my pet?" | pet, pets, dog, dogs, cat, cats, animal |
  | `payments` | Payments | "How does payment work?" | pay, payment, paying, charge, charged, deposit, currency, card |
  | `damage` | Damage | "What if something gets damaged?" | damage, damaged, broke, broken, break |
  | `safety` | Safety | "What safety equipment is there?" | safety, safe, smoke alarm, first aid, fire, extinguisher |

  "smoke alarm" goes to Safety, not House rules: phrases are checked before single words.
- **What each topic's card shows** (`src/lib/ask/answer.ts`, a pure function `answerQuestion(question, stay)` → `Answer`):

  | Topic | Body, word for word | Source label | Source opens |
  |---|---|---|---|
  | `cancellation` | `cancellationPolicy.body` | "{policy.title} · Havenly policy" | policies page at Cancellation |
  | `checkIn` | "Check-in: {checkInTime}" / "Check-out: {checkOutTime}" (lines present only); if both are missing, the Havenly "Check-in and check-out" body | "This stay's details", or "{title} · Havenly policy" | stay page / policies page |
  | `houseRules` | `houseRules` as a list; if empty, the Havenly House rules body | "This stay's house rules", or the policy | policies page |
  | `pets` | "Pet friendly" or "Pets aren't allowed" (from `petsAllowed`), plus any house rule mentioning pet, pets, dog or animal; if none, the Havenly Pets body | "This stay's details" | stay page |
  | `payments`, `damage`, `safety` | that Havenly policy's `body` | "{title} · Havenly policy" | policies page |

  - **"Not found" card:** "I couldn't find that in this stay's details or Havenly's policies." with the source line "Try a topic below, or contact Havenly support." It has no link yet, because Help & support is "coming soon" on Profile.
  - **Facts used as labels:** the "Pet friendly" / "Pets aren't allowed" and "Check-in:" / "Check-out:" labels are the only fixed words, and they only label stored values.
- **Conversation:**
  - It lives in screen state only and isn't stored. Leaving the screen clears it.
  - It opens with one Havenly message: "Ask anything about {title}. Answers quote this stay's details and Havenly's policies word for word."
  - A reply appears after a short typing indicator (three dots, 500 ms), so the exchange reads as a chat. Matching itself is instant.
  - Sending is disabled while the indicator shows and when the input is empty (after trimming). Messages are at most 300 characters (`maxLength`).
- **Screen layout (no design exists; built from the design system, estimated values marked "est."):**
  - **Header:** Back `IconButton` (outline, md) on the left. Beside it, "Ask about this stay" (`title`) over the stay title (`caption`, one line). Status bar dark, `bg-surface`.
  - **Message list:** a `ScrollView`, `px-screen`, `gap-3`. It scrolls to the end on each new message.
    - **Guest message:** right-aligned bubble, `bg-lavender-tint`, `rounded-2xl` with a smaller bottom-right corner (est. `rounded-br-sm`), `px-4 py-3`, `callout` in ink, max width 80% (est.).
    - **Havenly opening message:** left-aligned, `bg-canvas`, same shape mirrored, `body`.
    - **Reply:** a stack of `AnswerCard`s (`gap-2`), left-aligned and full width.
    - **Typing indicator:** three 6 px (est.) `bg-muted` dots in a `bg-canvas` bubble.
  - **Composer** (pinned to the bottom, `border-t border-border bg-surface`, inside a `KeyboardAvoidingView`, `padding` on iOS and `height` on Android):
    1. A horizontal `ScrollView` of topic chips (`Chip`, filter variant, `gap-2`, `px-screen`, `py-3`). Tapping one sends its question.
    2. Below the chips, the input row: a `bg-canvas rounded-full` field (est. min height `control.lg` 56). It holds the **`MessageSquare` icon** on the left, a `TextInput` (placeholder "Ask about this stay", `type-callout`, multiline up to 4 lines), and a send `IconButton` with `ArrowUp` on the right.
    3. Bottom padding is `insets.bottom + 8`.
- **`AnswerCard`** (new shared primitive, `src/components/ui/answer-card.tsx`, also in `/design-system` section 19):
  - **Look:** `bg-canvas rounded-xl p-4 gap-2`.
  - **Header row:** topic icon (`Icon`) and title (`headline`).
  - **Body:** `body` in ink, either a paragraph or a bullet list for `lines`.
  - **Source row:** a `border-t border-border pt-2` row with `FileText` (sm) and a `caption` "Source: …". When the source can be opened, the row is a link-role `Pressable` with a `ChevronRight`.
  - **Props:** `{ icon, title, body?: string, lines?: string[], source: string, onSourcePress? }`.
  - **"Not found" variant:** the `CircleHelp` icon and title "No answer found".
  - **Topic icons:** cancellation `CalendarX`, checkIn `Clock`, houseRules `ScrollText`, pets `PawPrint`, payments `CreditCard`, damage `Hammer`, safety `ShieldCheck`. Each is checked to exist in lucide before use.
- **`IconButton` gains a `primary` variant** (`bg-primary`) for Send. When disabled, it uses the existing disabled opacity.
- **Analytics:** a new `stay_question_asked` event with `{ stay_id, source: "chip" | "typed", topic_count }`. The question text is never sent (AGENTS.md rule).
- **States:** the stay is loading → header plus three placeholder blocks. Error → `StayListMessage` with "Try again". The input stays disabled until the stay is loaded.
- **Route:** `src/app/(app)/stay/[slug]/ask.tsx` → `src/screens/stay/ask-screen.tsx`, with screen-only parts in `src/screens/stay/ask/` (`message-bubble.tsx`, `typing-indicator.tsx`, `composer.tsx`).
- **No new tokens and no new dependencies.**

## Out of scope
- Jev, Sanity Context and any API route for questions.
- Saving conversations, history across visits, and editing or deleting messages.
- A real Help & support destination.
- Questions about stays other than the open one.

## Steps
### 1. Topics and the matcher
Write `src/lib/ask/topics.ts` (the table above, typed by `PolicyTopic`) and `src/lib/ask/answer.ts`. `Answer` is `{ kind: "cards", cards: AnswerCardData[] } | { kind: "none" }`, with each card `{ topic, title, body?, lines?, source, opens: "policies" | "policies:cancellation" | "stay" }`.
Done when: a scratch script runs the cases in Verification against a real stay from `/api/stays/<slug>`'s query, and every result matches.

### 2. AnswerCard and IconButton primary
Add `AnswerCard`, the `primary` variant, and design-system section 19 (one quoted card, one list card, one "not found").
Done when: tsc and lint pass.

### 3. Ask screen and route
Build the screen, the composer and the message parts. Wire chips and typed questions through `answerQuestion`, the typing indicator, scrolling to the end, the event, and loading and error states.
Done when: tsc and lint pass.

### 4. Entry from the stay page
Point "Ask about policies" at `/stay/[slug]/ask`.

## Verification
- `npx tsc --noEmit`, `npx expo lint`, and the drift grep (no hex, `rgba(`, `fontSize`, `fontWeight` in `src/`) pass.
- **Matcher cases** (Modern Cabin with Hot Tub, live data):
  - "Can I cancel?" → 1 card, Moderate cancellation body word for word, source "Moderate cancellation · Havenly policy".
  - "can I bring my dog and what time is check in" → 2 cards in topic order (Check-in, then Pets), with the cabin's times and "Pet friendly" plus its pet rule.
  - "is there a smoke alarm" → Safety only (not House rules).
  - "parties?" → House rules, as the cabin's list.
  - "where's the nearest supermarket" → "not found" card.
  - A stay with no pet rule and `petsAllowed: false` → "Pets aren't allowed".
- **On the phone over ADB** (the dev build picks up JS changes, so no rebuild is needed):
  1. Stay page → "Ask about policies" opens the chat with the opening message.
  2. Tap the Cancellation chip → the guest bubble shows "What's the cancellation policy?", the typing dots appear, then one card with a source; tapping the source opens the policies page at Cancellation.
  3. Type "dog check in" → two cards.
  4. Type "supermarket" → the "not found" card.
  5. The keyboard doesn't cover the input.
  - Take screenshots and compare them with the design system: chips, input field, card radius and colours. List the differences and fix them.
- **PostHog:** `stay_question_asked` arrives with `source` and `topic_count`, and no question text.
- **End to end:** ask three questions in a row, go back, and reopen. The chat starts fresh with the opening message.

## AGENTS.md updates
- **Expo → Route groups:** add `stay/[slug]/ask` to the routes pushed over the tabs.
- **Who owns what → Answer text:** add "Until Jev and Context land, `src/lib/ask/answer.ts` matches questions to topics by keyword and answers from `/api/stays/<slug>` data and Havenly policies. One `AnswerCard` per topic with a source label, never a paragraph."
- **Analytics:** add `stay_question_asked` (`source`, `topic_count`) to the event list.
- **Design system:** `AnswerCard` for quoted answers with a source; `IconButton` `primary` variant for send actions.

## Result
Built as planned:
- `/stay/[slug]/ask` opens from "Ask about policies".
- Topic chips send their question; typed questions are matched by keyword in `src/lib/ask/answer.ts`.
- Each reply is one `AnswerCard` per topic, quoting the stay's data or Havenly's policy with a source label that opens the policies page (Cancellation at its section) or goes back to the stay. No match gives a "No answer found" card that points to support.
- The input has the `MessageSquare` icon and a yellow `primary` `IconButton` for Send.

Changes found while testing on the phone (Argent + ADB, Samsung S942B):
- `KeyboardAvoidingView` doesn't resize edge-to-edge Android. The composer is lifted by `window height − keyboard screenY` from `Keyboard` events; Android's `height` alone leaves out the navigation bar and left the input ~40 dp under the keyboard.
- Enter on Android sent a question twice in one tick. Sending is now guarded by the reply-timer ref, not state.
- `AnswerCard` takes either `source` ("Source: …") or a plain `footer`; the "No answer found" card uses `footer`.

Verified:
- tsc, lint and drift grep are clean.
- The matcher cases all match on live data (Cancel → Moderate; dog + check in → Check-in then Pets; smoke alarm → Safety only; parties → House rules; supermarket → none; North Beach pets → "Pets aren't allowed").
- On the phone: chip → card; typed two-topic question → two cards; supermarket → one "No answer found"; composer above the keyboard; source → policies at Cancellation.
- `stay_question_asked` sent with only `stay_id`, `source`, `topic_count` (200).
- The typing dots weren't caught in a screenshot (the 500 ms window is shorter than a capture).
