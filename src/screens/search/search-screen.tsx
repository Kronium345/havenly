import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronDown } from "lucide-react-native";
import { ComponentRef, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { APP_TAB_BAR_HEIGHT } from "@/components/app-tab-bar";
import { StayCardPlaceholders, StayListMessage } from "@/components/stay-list-states";
import { Icon } from "@/components/ui/icon";
import { ListingCard } from "@/components/ui/listing-card";
import { AppText } from "@/components/ui/text";
import { cardBadges } from "@/lib/amenities";
import { ApiError, useApiFetch } from "@/lib/api";
import { formatPlace, formatPrice, plural, sanityImage } from "@/lib/format";
import { useSavedStays } from "@/lib/saved-stays";
import type { ParsedQuery, SearchFilters } from "@/lib/search/parse-query";
import type { SearchResponse, SearchSort } from "@/lib/search/types";
import { withoutChip } from "@/lib/search/understood";
import { tw } from "@/theme";

import { FilterSheet } from "./filter-sheet";
import { SearchHeader } from "./search-header";
import { SortSheet, sortLabels } from "./sort-sheet";
import { UnderstoodChips } from "./understood-chips";

type SearchInput = { query: string } | { parsed: ParsedQuery };
type SearchResult = { key: string } & ({ status: "ready"; data: SearchResponse } | { status: "error"; message: string });

const NO_FILTERS: SearchFilters = {};
const TYPING_PAUSE_MS = 450;
const MIN_TYPED_LENGTH = 3;

export function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const apiFetch = useApiFetch();
  const saved = useSavedStays();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  const [text, setText] = useState(q ?? "");
  const [input, setInput] = useState<SearchInput>({ query: q ?? "" });
  const [sort, setSort] = useState<SearchSort>("best");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [lastData, setLastData] = useState<SearchResponse | null>(null);
  const [sheet, setSheet] = useState<"filters" | "sort" | null>(null);

  // A new sentence from the home AI bar replaces the current search.
  const [seenQ, setSeenQ] = useState(q);
  if (q !== seenQ) {
    setSeenQ(q);
    if (q !== undefined) {
      setText(q);
      setInput({ query: q });
    }
  }

  // Search as the guest types, once they pause. Each search runs a semantic query (it
  // counts against Sanity's quota), so wait for a pause and at least 3 characters; an
  // empty field lists every stay. Chips and filters don't change the text, so they
  // don't retrigger this.
  useEffect(() => {
    const typed = text.trim();
    if (typed.length > 0 && typed.length < MIN_TYPED_LENGTH) return;
    const timer = setTimeout(() => {
      setInput((current) => ("query" in current && current.query === typed ? current : { query: typed }));
    }, TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  // Results remember the request they answer; anything else reads as loading.
  const requestKey = JSON.stringify({ input, sort, attempt });
  useEffect(() => {
    let current = true;
    apiFetch<SearchResponse>("/api/search", { method: "POST", body: JSON.stringify({ ...input, sort }) })
      .then((data) => {
        if (!current) return;
        setResult({ key: requestKey, status: "ready", data });
        setLastData(data);
      })
      .catch((error: unknown) => {
        if (!current) return;
        setResult({
          key: requestKey,
          status: "error",
          message: error instanceof ApiError ? error.message : "Check your connection and try again.",
        });
      });
    return () => {
      current = false;
    };
  }, [apiFetch, input, sort, requestKey]);

  const state = result && result.key === requestKey ? result : ({ status: "loading" } as const);
  // While a new search loads, keep showing the last chips and count.
  const data = state.status === "ready" ? state.data : lastData;
  const parsed = data?.parsed;
  const goBack = () => router.navigate("/home");

  return (
    <View style={tw`flex-1 bg-surface`}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          tw`px-screen`,
          { paddingTop: insets.top + 8, paddingBottom: APP_TAB_BAR_HEIGHT + insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <SearchHeader
          inputRef={inputRef}
          autoFocus={!q}
          value={text}
          onChangeText={setText}
          onSubmit={() => setInput({ query: text.trim() })} // Search key: right away, no pause
          onBack={goBack}
          onOpenFilters={() => setSheet("filters")}
        />

        <UnderstoodChips
          chips={data?.understood ?? []}
          onRemove={(key) => parsed && setInput({ parsed: withoutChip(parsed, key) })}
        />

        {data ? (
          <View style={tw`mt-5 flex-row items-center justify-between`}>
            <AppText variant="body" style={tw`text-ink`} accessibilityLiveRegion="polite">
              {plural(data.count, "stay")}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${sortLabels[sort]}`}
              hitSlop={8}
              onPress={() => setSheet("sort")}
              style={({ pressed }) => [tw`flex-row items-center gap-1`, { opacity: pressed ? 0.6 : 1 }]}
            >
              <AppText variant="callout" style={tw`font-regular text-ink`}>
                Sort by{" "}
                <AppText variant="callout" style={tw`font-bold`}>
                  {sortLabels[sort]}
                </AppText>
              </AppText>
              <Icon as={ChevronDown} size="md" />
            </Pressable>
          </View>
        ) : null}

        <View style={tw`mt-4`}>
          {state.status === "loading" ? (
            <StayCardPlaceholders />
          ) : state.status === "error" ? (
            <StayListMessage
              title="Couldn't load stays."
              message={state.message}
              actionLabel="Try again"
              onAction={() => setAttempt((n) => n + 1)}
            />
          ) : state.data.results.length === 0 ? (
            <StayListMessage
              title="No stays match that."
              message={state.data.understood.length > 0 ? "Try removing a filter above." : "Try describing it another way."}
            />
          ) : (
            <View style={tw`gap-4`}>
              {state.data.results.map((stay) => (
                <ListingCard
                  key={stay._id}
                  title={stay.title}
                  location={formatPlace(stay.place)}
                  imageUrl={sanityImage(stay.imageUrl, 400) ?? ""}
                  rating={stay.rating}
                  reviewCount={stay.reviewCount}
                  pricePerNight={formatPrice(stay.pricePerNight)}
                  amenities={cardBadges(stay, state.data.parsed.filters)}
                  saved={saved.isSaved(stay._id)}
                  onToggleSaved={() => saved.toggle(stay)}
                  savePlacement="end"
                  onPress={() =>
                    router.push({
                      pathname: "/stay/[slug]",
                      params: state.data.parsed.nights
                        ? { slug: stay.slug, nights: String(state.data.parsed.nights) }
                        : { slug: stay.slug },
                    })
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>


      <FilterSheet
        visible={sheet === "filters"}
        initial={parsed?.filters ?? NO_FILTERS}
        onClose={() => setSheet(null)}
        onApply={(filters) => {
          setSheet(null);
          setInput({ parsed: { ...(parsed ?? { soft: [], rest: text.trim() }), filters } });
        }}
      />
      <SortSheet
        visible={sheet === "sort"}
        value={sort}
        onClose={() => setSheet(null)}
        onChange={(next) => {
          setSheet(null);
          setSort(next);
        }}
      />
    </View>
  );
}
