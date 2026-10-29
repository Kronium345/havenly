import type { LegalDoc } from "../legal-shared";

import { sanityQuery } from "./sanity";

// Server only. Public legal pages edited in Studio (prompts/24): published `legalPage`
// documents from the public dataset, looked up by slug (a param, never pasted in).

const SLUG = /^[a-z0-9-]{1,40}$/;

/** The published page, or null when there is none for that slug. */
export async function legalPage(slug: string): Promise<LegalDoc | null> {
  if (!SLUG.test(slug)) return null;
  const page = await sanityQuery<LegalDoc | null>(
    `*[_type == "legalPage" && slug.current == $slug][0]{title, updated, intro, "sections": coalesce(sections[]{heading, "paragraphs": coalesce(paragraphs, [])}, [])}`,
    { slug },
  );
  return page;
}
