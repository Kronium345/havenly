import type { AskTopic } from "../ask/topics";

import { callContextTool, ContextError, contextOutline } from "./context";
import { sanityQuery } from "./sanity";

// Server only. Reads the `havenly-policies` Knowledge Base (Context, Knowledge Base mode).
// Its entries are a rewrite of Havenly's policies, so their prose is never shown. Each
// entry's footnotes quote the source, e.g. `[^x]: "Cancel up to…" (Flexible cancellation,
// line 12)`; every quote is located in that Sanity policy and the full stored sentence is
// what the app shows, word for word. Quotes that match nothing are dropped.

const endpoint = process.env.SANITY_CONTEXT_KB_URL;
const CACHE_MS = 5 * 60 * 1000;

export type PolicySentence = {
  policyId: string;
  title: string;
  topic: AskTopic;
  /** Exactly as stored in the policy's summary or body. */
  text: string;
};

type Policy = { _id: string; title: string; topic: AskTopic; summary: string | null; body: string | null };

let cache: { at: number; sentences: Promise<PolicySentence[]> } | null = null;

/** Policy sentences the Knowledge Base cites, cached for 5 minutes. */
export function citedPolicySentences(): Promise<PolicySentence[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.sentences;
  const sentences = loadCitedSentences();
  cache = { at: Date.now(), sentences };
  // A failed load isn't cached, so the next question tries again.
  sentences.catch(() => {
    if (cache?.sentences === sentences) cache = null;
  });
  return sentences;
}

async function loadCitedSentences(): Promise<PolicySentence[]> {
  if (!endpoint) throw new ContextError("SANITY_CONTEXT_KB_URL must be set.");
  const outline = await contextOutline(endpoint);
  const knowledgeBase = outline.match(/Knowledge base id:\s*`(kb[\w-]+)`/)?.[1];
  const paths = [...outline.matchAll(/^([a-z0-9_]+(?:\/[a-z0-9_]+)*)\s+\[\w+\]\s*$/gm)].map((match) => match[1]);
  if (!knowledgeBase || paths.length === 0) throw new ContextError("The Knowledge Base outline has no entries.");

  const [entries, policies] = await Promise.all([
    callContextTool(endpoint, "knowledge_base_read", { knowledgeBase, paths: paths.slice(0, 20) }),
    sanityQuery<Policy[]>(`*[_type == "policy"]{_id, title, topic, summary, body}`),
  ]);

  const byTitle = new Map(policies.map((policy) => [normalize(policy.title), policy]));
  const found = new Map<string, PolicySentence>();
  for (const [, quote, source] of entries.matchAll(/^\[\^[\w-]+\]:\s*"(.*)"\s*\(([^()]+), line \d+\)\s*$/gm)) {
    const policy = byTitle.get(normalize(source));
    const sentences = policy ? sentencesQuoting(policy, quote) : [];
    if (sentences.length === 0) console.warn("Knowledge Base quote not found in Sanity:", source);
    for (const text of sentences) found.set(`${policy!._id}:${text}`, { policyId: policy!._id, title: policy!.title, topic: policy!.topic, text });
  }
  return [...found.values()];
}

/** The stored sentences a quote comes from (one, or several when it spans them). */
function sentencesQuoting(policy: Policy, quote: string): string[] {
  const target = normalize(quote);
  for (const field of [policy.body, policy.summary]) {
    if (!field) continue;
    const sentences = field.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/);
    let joined = "";
    const starts = sentences.map((sentence) => {
      const start = joined.length;
      joined += `${normalize(sentence, false)} `;
      return start;
    });
    const at = joined.indexOf(target);
    if (at === -1) continue;
    return sentences.filter((_, i) => starts[i] < at + target.length && (starts[i + 1] ?? Infinity) > at);
  }
  return [];
}

/** Lower-cased with plain quotes and single spaces; `trimEnd` also drops end punctuation. */
function normalize(text: string, trimEnd = true) {
  const plain = text.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
  return trimEnd ? plain.replace(/[\s.!?;,]+$/, "") : plain;
}
