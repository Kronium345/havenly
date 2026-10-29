import { View } from "react-native";

import { StayListMessage } from "@/components/stay-list-states";
import { useApiQuery } from "@/lib/api";
import { fullDate } from "@/lib/dates";
import type { LegalDoc } from "@/lib/legal-shared";
import { tw } from "@/theme";

import { LegalPage } from "./legal-page";

// Terms of Service (prompts/24): the `legalPage` "terms" document, edited in Studio and
// read through the public /api/legal/terms route, so it works signed out and on the web.
export function TermsScreen() {
  const result = useApiQuery<LegalDoc>("/api/legal/terms");

  if (result.status !== "ready") {
    return (
      <LegalPage title="Terms of Service" sections={[]}>
        {result.status === "loading" ? (
          <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={tw`mt-2 h-60 rounded-xl bg-canvas`} />
        ) : (
          <StayListMessage
            title={result.error.status === 404 ? "The terms aren't published yet." : "Couldn't load the terms."}
            message={result.error.message}
            actionLabel="Try again"
            onAction={result.retry}
          />
        )}
      </LegalPage>
    );
  }

  const page = result.data;
  return (
    <LegalPage
      title={page.title}
      updated={page.updated ? fullDate(page.updated) : undefined}
      intro={page.intro}
      sections={page.sections.map((section) => ({ title: section.heading, paragraphs: section.paragraphs }))}
    />
  );
}
