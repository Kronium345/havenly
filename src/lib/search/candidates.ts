import { amenityWords, numberWords, PET_WORDS, softWordPattern, typeWords } from "./parse-query";
import { softWords, type AmenityKey, type PropertyType, type SoftWord } from "./vocabulary";

// Finds what a guest's sentence names, in code, so Jev is only ever asked about these
// (AGENTS: Jev chooses between candidates code found, never produces values).

export type CandidateItem =
  | { id: string; kind: "pets"; phrase: string }
  | { id: string; kind: "amenity"; key: AmenityKey; phrase: string }
  | { id: string; kind: "type"; types: PropertyType[]; phrase: string }
  | { id: string; kind: "vibe"; word: SoftWord; phrase: string };

export type CandidateNumber = {
  id: string;
  value: number;
  /** The number with a few words either side, as typed (lower-cased). */
  phrase: string;
};

export type Candidates = {
  items: CandidateItem[];
  numbers: CandidateNumber[];
  /** A price range ("between 150 and 300", "£150-£300") was found; code reads it, not Jev. */
  hasRange: boolean;
};

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

const RANGE = [
  /[£$]\s?\d{2,5}\s*(?:-|–|to|and)\s*[£$]?\s?\d{2,5}/g,
  /\bbetween\s+[£$]?\s?\d{2,5}\s*(?:and|-|–|to)\s*[£$]?\s?\d{2,5}/g,
];
const NUMBER = new RegExp(`[£$]?\\b(?:\\d{1,5}|${Object.keys(numberWords).join("|")})\\b`, "g");
const CONTEXT_WORDS = 3;

export function findCandidates(input: string): Candidates {
  const text = input.slice(0, 300).toLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ").trim();
  const items: CandidateItem[] = [];
  const add = (item: DistributiveOmit<CandidateItem, "id">) =>
    items.push({ ...item, id: `i${items.length}` } as CandidateItem);

  const pets = firstMatch(text, PET_WORDS);
  if (pets) add({ kind: "pets", phrase: pets });
  for (const [pattern, key] of amenityWords) {
    const phrase = firstMatch(text, pattern);
    if (phrase) add({ kind: "amenity", key, phrase });
  }
  // "a-frame" comes before "cabin" in the list; a sentence naming both asks about each.
  for (const [pattern, types] of typeWords) {
    const phrase = firstMatch(text, pattern);
    if (phrase) add({ kind: "type", types, phrase });
  }
  // A vibe word inside an amenity phrase ("views" in "mountain views") is part of that amenity.
  const amenityPhrases = items.filter((item) => item.kind === "amenity").map((item) => item.phrase);
  for (const word of softWords) {
    const phrase = firstMatch(text, softWordPattern(word));
    if (phrase && !amenityPhrases.some((amenity) => amenity.includes(phrase))) add({ kind: "vibe", word, phrase });
  }

  // Numbers inside a price range are left to the code parser.
  let rest = text;
  let hasRange = false;
  for (const pattern of RANGE) {
    rest = rest.replace(pattern, (match) => {
      hasRange = true;
      return " ".repeat(match.length);
    });
  }
  const numbers: CandidateNumber[] = [];
  for (const match of rest.matchAll(NUMBER)) {
    const raw = match[0].replace(/^[£$]/, "");
    const value = numberWords[raw] ?? Number(raw);
    if (!Number.isFinite(value)) continue;
    numbers.push({ id: `n${numbers.length}`, value, phrase: around(text, match.index, match[0].length) });
  }

  return { items, numbers, hasRange };
}

function firstMatch(text: string, pattern: RegExp) {
  return text.match(new RegExp(pattern.source))?.[0] ?? null;
}

/** The match plus up to CONTEXT_WORDS words on each side. */
function around(text: string, index: number, length: number) {
  const before = text.slice(0, index).split(" ").slice(-CONTEXT_WORDS - 1).join(" ");
  const after = text.slice(index + length).split(" ").slice(0, CONTEXT_WORDS + 1).join(" ");
  return `${before}${text.slice(index, index + length)}${after}`.trim();
}
