import { createTypeSafeAi } from "@ai-sdk/typesafe-ai";
import { experimental_decide as decide, type Experimental_DecisionQuestion } from "ai";

// Server only. Jev answers typed questions with probabilities; it never writes text or
// queries. Keep `ai` and `@ai-sdk/typesafe-ai` pinned: the decision API is experimental.

/** Pinned so tuned cutoffs keep meaning the same thing. */
export const JEV_MODEL = "jev-1.14.0";
const TIMEOUT_MS = 2500;

const apiKey = process.env.TYPESAFE_AI_API_KEY;
const typeSafe = apiKey ? createTypeSafeAi({ apiKey }) : null;

export type ChoiceAnswer = { choice: string; probability: number };

/**
 * Asks choice questions about one piece of text. Throws when Jev isn't configured, times
 * out or fails, so callers can fall back to code. A refused question is left out.
 */
export async function decideChoices(
  state: string,
  questions: Record<string, Extract<Experimental_DecisionQuestion, { type: "choice" }>>,
): Promise<Record<string, ChoiceAnswer>> {
  if (!typeSafe) throw new Error("TYPESAFE_AI_API_KEY is not set.");
  const result = await decide({
    model: typeSafe.decisionModel(JEV_MODEL),
    state,
    questions,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const answers: Record<string, ChoiceAnswer> = {};
  for (const [id, answer] of Object.entries(result.answers)) {
    if (answer.type !== "choice") continue;
    answers[id] = { choice: answer.choice, probability: answer.probabilities?.[answer.choice] ?? 0 };
  }
  return answers;
}
