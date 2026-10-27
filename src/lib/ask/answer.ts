import type { PolicyText, StayDetails } from "../search/types";

import { TOPICS, type AskTopic } from "./topics";

// The keyword matcher: the fallback when /api/stays/<slug>/ask can't use Jev or the
// Knowledge Base (server) or can't be reached (app). Questions are matched to topics by
// keyword, and each card quotes this stay's data or a Havenly policy word for word.
// Nothing here writes answer text; the only fixed words label stored values.

export type AnswerSource = "policies" | "policies:cancellation" | "stay";

export type AnswerCardData = {
  topic: AskTopic;
  title: string;
  body?: string;
  lines?: string[];
  source: string;
  opens: AnswerSource;
};

export type Answer = { kind: "cards"; cards: AnswerCardData[] } | { kind: "none" };

/** What /api/stays/<slug>/ask returns. */
export type AskResponse = { answer: Answer; answeredBy: "jev" | "keywords" };

type AnswerableStay = Pick<
  StayDetails,
  "petsAllowed" | "houseRules" | "checkInTime" | "checkOutTime" | "cancellationPolicy" | "havenlyPolicies"
>;

const PET_RULE = /\b(pet|pets|dog|dogs|animal|animals)\b/i;

/** Topics a question is about, in topic order. Phrases count first and are removed, so their words don't match again. */
export function topicsFor(question: string): AskTopic[] {
  // Padded with spaces so every phrase and word can be matched as " phrase ".
  let text = ` ${question.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ")} `;
  const found = new Set<AskTopic>();
  for (const topic of TOPICS) {
    for (const phrase of topic.phrases) {
      if (text.includes(` ${phrase} `)) {
        found.add(topic.key);
        text = text.replaceAll(` ${phrase} `, "  ");
      }
    }
  }
  const words = new Set(text.split(/[\s-]+/).filter(Boolean));
  for (const topic of TOPICS) {
    if (topic.words.some((word) => words.has(word))) found.add(topic.key);
  }
  return TOPICS.map((topic) => topic.key).filter((key) => found.has(key));
}

function policyCard(topic: AskTopic, policy: PolicyText | null | undefined, opens: AnswerSource = "policies") {
  if (!policy) return null;
  return { topic, title: policy.title, body: policy.body, source: `${policy.title} · Havenly policy`, opens };
}

function havenly(stay: AnswerableStay, topic: AskTopic) {
  return stay.havenlyPolicies.find((policy) => policy.topic === topic);
}

function cardFor(topic: AskTopic, stay: AnswerableStay): AnswerCardData | null {
  switch (topic) {
    case "cancellation":
      return policyCard(topic, stay.cancellationPolicy, "policies:cancellation");
    case "checkIn": {
      const lines = [
        stay.checkInTime ? `Check-in: ${stay.checkInTime}` : null,
        stay.checkOutTime ? `Check-out: ${stay.checkOutTime}` : null,
      ].filter((line): line is string => line !== null);
      return lines.length > 0
        ? { topic, title: "Check-in and check-out", lines, source: "This stay's details", opens: "stay" }
        : policyCard(topic, havenly(stay, topic));
    }
    case "houseRules":
      return stay.houseRules.length > 0
        ? { topic, title: "House rules", lines: stay.houseRules, source: "This stay's house rules", opens: "policies" }
        : policyCard(topic, havenly(stay, topic));
    case "pets": {
      const petRules = stay.houseRules.filter((rule) => PET_RULE.test(rule));
      return {
        topic,
        title: "Pets",
        lines: [stay.petsAllowed ? "Pet friendly" : "Pets aren't allowed", ...petRules],
        source: petRules.length > 0 ? "This stay's details and house rules" : "This stay's details",
        opens: "stay",
      };
    }
    default:
      return policyCard(topic, havenly(stay, topic));
  }
}

/** One card per matched topic, or "none" when nothing in the stay's data answers it. */
export function answerQuestion(question: string, stay: AnswerableStay): Answer {
  const cards = topicsFor(question)
    .map((topic) => cardFor(topic, stay))
    .filter((card): card is AnswerCardData => card !== null);
  return cards.length > 0 ? { kind: "cards", cards } : { kind: "none" };
}
