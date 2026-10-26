// Topics a guest can ask about. Keys match Sanity's `policyTopics`
// (studio/schemaTypes/shared/options.ts). Order is the order answer cards appear in.

export type AskTopic = "cancellation" | "checkIn" | "houseRules" | "pets" | "payments" | "damage" | "safety";

export type TopicDefinition = {
  key: AskTopic;
  /** Chip label. */
  label: string;
  /** What tapping the chip sends as the guest's message. */
  question: string;
  /** Multi-word phrases, checked before single words (so "smoke alarm" is Safety, not House rules). */
  phrases: string[];
  words: string[];
};

export const TOPICS: TopicDefinition[] = [
  {
    key: "cancellation",
    label: "Cancellation",
    question: "What's the cancellation policy?",
    phrases: [],
    words: ["cancel", "cancellation", "refund"],
  },
  {
    key: "checkIn",
    label: "Check-in",
    question: "What are the check-in and check-out times?",
    phrases: ["check-in", "check in", "check-out", "check out"],
    words: ["checkin", "checkout", "arrive", "arrival", "leave", "late"],
  },
  {
    key: "houseRules",
    label: "House rules",
    question: "What are the house rules?",
    phrases: [],
    words: ["rule", "rules", "party", "parties", "smoking", "smoke", "quiet", "noise", "music"],
  },
  {
    key: "pets",
    label: "Pets",
    question: "Can I bring my pet?",
    phrases: [],
    words: ["pet", "pets", "dog", "dogs", "cat", "cats", "animal"],
  },
  {
    key: "payments",
    label: "Payments",
    question: "How does payment work?",
    phrases: [],
    words: ["pay", "payment", "paying", "charge", "charged", "deposit", "currency", "card"],
  },
  {
    key: "damage",
    label: "Damage",
    question: "What if something gets damaged?",
    phrases: [],
    words: ["damage", "damaged", "broke", "broken", "break"],
  },
  {
    key: "safety",
    label: "Safety",
    question: "What safety equipment is there?",
    phrases: ["smoke alarm", "first aid"],
    words: ["safety", "safe", "fire", "extinguisher"],
  },
];
