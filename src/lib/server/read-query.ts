import { findCandidates, type CandidateItem } from "../search/candidates";
import { parseQuery, type ParsedQuery, type SearchFilters } from "../search/parse-query";
import type { AmenityKey, PropertyType, SoftWord } from "../search/vocabulary";

import { decideChoices, type ChoiceAnswer } from "./jev";

// Reads a guest's sentence: code finds the candidates and the values, Jev says how the
// guest means each one, and code builds the filters. Anything Jev is unsure about keeps
// what the code parser decided; if Jev fails, the code parser's reading is used whole.

/** Below this, Jev's top answer is ignored for that item. */
export const JEV_CUTOFF = 0.6;

export type QueryReading = ParsedQuery & { readBy: "jev" | "code" };

const stance = {
  wanted: "The guest wants the stay to have or be this.",
  avoided: "The guest wants a stay without this, or rules it out (for example 'no …', 'not a …', 'without …', 'allergic to …').",
  mentioned: "Named, but the guest neither requires it nor rules it out (for example 'would be nice', 'not essential', 'either way').",
} as const;

const numberMeaning = {
  maxPrice: "The most the guest will pay per night.",
  minPrice: "The least the guest wants to pay per night.",
  totalBudget: "The guest's budget for the whole stay, not per night.",
  guests: "How many people are staying.",
  nights: "How many nights the stay lasts.",
  other: "Something else, such as a date, a bedroom count or part of a name.",
} as const;
type NumberMeaning = keyof typeof numberMeaning;

const limits: Record<Exclude<NumberMeaning, "other">, [number, number]> = {
  maxPrice: [10, 100000],
  minPrice: [10, 100000],
  totalBudget: [10, 1000000],
  guests: [1, 50],
  nights: [1, 60],
};

const describe = (item: CandidateItem) =>
  item.kind === "pets"
    ? `bringing pets ("${item.phrase}")`
    : item.kind === "type"
      ? `the stay being a "${item.phrase}"`
      : item.kind === "vibe"
        ? `the stay feeling or being "${item.phrase}"`
        : `"${item.phrase}"`;

export async function readQuery(sentence: string, options: { cities: string[] }): Promise<QueryReading> {
  const baseline = parseQuery(sentence, options);
  const { items, numbers } = findCandidates(sentence);
  if (items.length === 0 && numbers.length === 0) return { ...baseline, readBy: "code" };

  const questions: Parameters<typeof decideChoices>[1] = {};
  for (const item of items) {
    questions[item.id] = {
      type: "choice",
      instructions: `In this holiday-stay search, how does the guest feel about ${describe(item)}?`,
      criteria: stance,
    };
  }
  for (const number of numbers) {
    questions[number.id] = {
      type: "choice",
      instructions: `In this holiday-stay search, what does the number ${number.value} in "${number.phrase}" mean?`,
      criteria: numberMeaning,
    };
  }

  let answers: Record<string, ChoiceAnswer>;
  try {
    answers = await decideChoices(sentence.slice(0, 300), questions);
  } catch (error) {
    console.warn("Jev unavailable, used the code parser:", error instanceof Error ? error.name : "error");
    return { ...baseline, readBy: "code" };
  }
  const sure = (id: string) => {
    const answer = answers[id];
    return answer && answer.probability >= JEV_CUTOFF ? answer.choice : null;
  };

  const filters: SearchFilters = { ...baseline.filters };
  let soft = [...baseline.soft];
  const ranking: string[] = baseline.rest ? [baseline.rest] : [];

  for (const item of items) {
    const answer = sure(item.id);
    if (!answer) continue;
    if (item.kind === "vibe") {
      soft = soft.filter((word) => word !== item.word);
      if (answer !== "avoided") soft.push(item.word);
    } else if (item.kind === "pets") {
      filters.pets = answer === "wanted" ? true : answer === "avoided" ? false : undefined;
    } else if (item.kind === "amenity") {
      filters.amenities = without(filters.amenities, [item.key]);
      filters.notAmenities = without(filters.notAmenities, [item.key]);
      if (answer === "wanted") filters.amenities = add(filters.amenities, [item.key]);
      if (answer === "avoided") filters.notAmenities = add(filters.notAmenities, [item.key]);
      if (answer === "mentioned") ranking.push(item.phrase);
    } else {
      filters.types = without(filters.types, item.types);
      filters.notTypes = without(filters.notTypes, item.types);
      if (answer === "wanted") filters.types = add(filters.types, item.types);
      if (answer === "avoided") filters.notTypes = add(filters.notTypes, item.types);
      if (answer === "mentioned") ranking.push(item.phrase);
    }
  }

  // Numbers: Jev labels, code applies. A field Jev labelled replaces the code parser's
  // value; a code value that Jev labelled as something else is dropped.
  const labelled: Partial<Record<NumberMeaning, number>> = {};
  const relabelled = new Set<number>();
  for (const number of numbers) {
    const meaning = sure(number.id) as NumberMeaning | null;
    if (!meaning) continue;
    if (meaning !== "other") {
      const [min, max] = limits[meaning];
      if (number.value >= min && number.value <= max && labelled[meaning] === undefined) labelled[meaning] = number.value;
    }
    relabelled.add(number.value);
  }
  const pick = (field: "maxPrice" | "minPrice" | "guests", meaning: NumberMeaning) => {
    if (labelled[meaning] !== undefined) filters[field] = labelled[meaning];
    else if (filters[field] !== undefined && relabelled.has(filters[field])) delete filters[field];
  };
  let nights = baseline.nights;
  if (labelled.nights !== undefined) nights = labelled.nights;
  else if (nights !== undefined && relabelled.has(nights)) nights = undefined;
  pick("guests", "guests");
  pick("minPrice", "minPrice");
  pick("maxPrice", "maxPrice");
  if (labelled.maxPrice === undefined && labelled.totalBudget !== undefined && nights) {
    filters.maxPrice = Math.floor(labelled.totalBudget / nights);
  }
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice) {
    [filters.minPrice, filters.maxPrice] = [filters.maxPrice, filters.minPrice];
  }

  return {
    filters: clean(filters),
    soft: [...new Set(soft)] as SoftWord[],
    nights,
    rest: ranking.join(" ").trim(),
    readBy: "jev",
  };
}

function add<T extends AmenityKey | PropertyType>(list: T[] | undefined, values: T[]) {
  return [...new Set([...(list ?? []), ...values])];
}

function without<T extends AmenityKey | PropertyType>(list: T[] | undefined, values: T[]) {
  return list?.filter((value) => !values.includes(value));
}

function clean(filters: SearchFilters) {
  for (const key of Object.keys(filters) as (keyof SearchFilters)[]) {
    const value = filters[key];
    if (value === undefined || (Array.isArray(value) && value.length === 0)) delete filters[key];
  }
  return filters;
}
