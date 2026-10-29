import type { IsoDate } from "./dates";

/** A public legal page from Sanity (prompts/24), e.g. the Terms of Service. */
export type LegalDoc = {
  title: string;
  updated: IsoDate;
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
};

/** The user's hosted privacy policy (store listing privacy URL redirects here). */
export const PRIVACY_POLICY_URL = "https://www.privacypolicies.com/live/a0f0e2ba-fcb2-46d8-a084-c723dfe22764";
