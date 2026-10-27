import { answerQuestion, type Answer, type AnswerCardData, type AnswerSource, type AskResponse } from "../ask/answer";
import type { AskTopic } from "../ask/topics";
import type { StayDetails } from "../search/types";

import { decideBooleans } from "./jev";
import { citedPolicySentences } from "./policy-kb";

// Answers a guest's question about a stay. Candidates are Havenly policy sentences the
// Knowledge Base cites (only the stay's own cancellation tier) and the stay's own facts;
// Jev says which help, and code groups them into cards. Nothing is reworded: cards show
// stored text, or a stored value after a fixed label. If the Knowledge Base or Jev fails,
// the keyword matcher answers instead.

/** Below this, Jev's P(helps) leaves a candidate out. */
export const ASK_CUTOFF = 0.6;
const MAX_CARDS = 3;
const MAX_LINES = 4;

type Group = { key: string; topic: AskTopic; title: string; source: string; opens: AnswerSource };
/** `line` is shown; `prompt` is what Jev reads (the same text, or a plain sentence for a labelled value). */
type Candidate = { id: string; line: string; prompt: string; group: Group };

export async function askQuestion(question: string, stay: StayDetails): Promise<AskResponse> {
  try {
    return { answer: await answerWithJev(question, stay), answeredBy: "jev" };
  } catch (error) {
    console.warn("Ask fell back to keywords:", error instanceof Error ? error.name : "error");
    return { answer: answerQuestion(question, stay), answeredBy: "keywords" };
  }
}

async function answerWithJev(question: string, stay: StayDetails): Promise<Answer> {
  const candidates = await candidatesFor(stay);
  const scores = await decideBooleans(
    `A guest's question about a holiday stay: "${question.slice(0, 300)}"`,
    Object.fromEntries(
      candidates.map((candidate) => [
        candidate.id,
        {
          type: "boolean" as const,
          instructions: `Does this text help answer the guest's question? Text: "${candidate.prompt}"`,
          criteria: {
            true: "The text answers the question, or part of it.",
            false: "The text is about something else, or doesn't help answer it.",
          },
        },
      ]),
    ),
  );

  const chosen = candidates.filter((candidate) => (scores[candidate.id] ?? 0) >= ASK_CUTOFF);
  const groups = new Map<string, { group: Group; lines: string[]; best: number }>();
  for (const candidate of chosen) {
    const entry = groups.get(candidate.group.key) ?? { group: candidate.group, lines: [], best: 0 };
    if (entry.lines.length < MAX_LINES) entry.lines.push(candidate.line);
    entry.best = Math.max(entry.best, scores[candidate.id] ?? 0);
    groups.set(candidate.group.key, entry);
  }
  const cards: AnswerCardData[] = [...groups.values()]
    .sort((a, b) => b.best - a.best)
    .slice(0, MAX_CARDS)
    .map(({ group, lines }) => ({ topic: group.topic, title: group.title, lines, source: group.source, opens: group.opens }));
  return cards.length > 0 ? { kind: "cards", cards } : { kind: "none" };
}

async function candidatesFor(stay: StayDetails): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  const add = (line: string, prompt: string, group: Group) =>
    candidates.push({ id: `c${candidates.length}`, line, prompt, group });

  const checkIn: Group = { key: "stay:checkIn", topic: "checkIn", title: "Check-in and check-out", source: "This stay's details", opens: "stay" };
  if (stay.checkInTime) add(`Check-in: ${stay.checkInTime}`, `This stay's check-in time is ${stay.checkInTime}.`, checkIn);
  if (stay.checkOutTime) add(`Check-out: ${stay.checkOutTime}`, `This stay's check-out time is ${stay.checkOutTime}.`, checkIn);

  const pets: Group = { key: "stay:pets", topic: "pets", title: "Pets", source: "This stay's details", opens: "stay" };
  add(
    stay.petsAllowed ? "Pet friendly" : "Pets aren't allowed",
    stay.petsAllowed ? "This stay is pet friendly: guests can bring pets." : "This stay does not allow pets.",
    pets,
  );

  const rules: Group = { key: "stay:houseRules", topic: "houseRules", title: "House rules", source: "This stay's house rules", opens: "policies" };
  for (const rule of stay.houseRules) add(rule, `A house rule of this stay: ${rule}`, rules);

  const tier = stay.cancellationPolicy?._id;
  for (const sentence of await citedPolicySentences()) {
    if (sentence.topic === "cancellation" && sentence.policyId !== tier) continue;
    add(sentence.text, sentence.text, {
      key: sentence.policyId,
      topic: sentence.topic,
      title: sentence.title,
      source: `${sentence.title} · Havenly policy`,
      opens: sentence.topic === "cancellation" ? "policies:cancellation" : "policies",
    });
  }
  return candidates;
}
