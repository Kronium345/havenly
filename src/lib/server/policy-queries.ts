import type { PolicyText } from "../search/types";

import { sanityQuery } from "./sanity";

// Mirrors `policyTopics` in studio/schemaTypes/shared/options.ts.
export const POLICY_TOPICS = ["cancellation", "pets", "checkIn", "payments", "damage", "houseRules", "safety"] as const;
export type PolicyTopic = (typeof POLICY_TOPICS)[number];

export function isPolicyTopic(value: string | null): value is PolicyTopic {
  return POLICY_TOPICS.includes(value as PolicyTopic);
}

/** Havenly's policies on one topic. Cancellation runs from most to least flexible. */
export function policiesByTopic(topic: PolicyTopic) {
  return sanityQuery<PolicyText[]>(
    `*[_type == "policy" && topic == $topic]
      | order(select(title match "Flexible*" => 0, title match "Moderate*" => 1, title match "Strict*" => 2, 3), title asc)
      {_id, title, topic, summary, body}`,
    { topic },
  );
}
