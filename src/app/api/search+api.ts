import { requireSession } from "@/lib/server/require-session";
import { knownCities, searchStays } from "@/lib/server/stay-queries";
import { parseQuery, sanitizeParsedQuery, type ParsedQuery } from "@/lib/search/parse-query";
import type { SearchResponse, SearchSort } from "@/lib/search/types";
import { understoodChips } from "@/lib/search/understood";

const sorts: SearchSort[] = ["best", "priceLow", "priceHigh", "rating"];

// Body: { query: string } for a new sentence, or { parsed } after the guest removes a
// chip or applies filters. What guests type is never logged.
export async function POST(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const sort = sorts.includes(body?.sort as SearchSort) ? (body?.sort as SearchSort) : "best";

  let parsed: ParsedQuery | null = null;
  try {
    if (typeof body?.query === "string") {
      parsed = parseQuery(body.query, { cities: await knownCities() });
    } else if (body?.parsed) {
      parsed = sanitizeParsedQuery(body.parsed);
    }
    if (!parsed) return Response.json({ error: "Send a query or parsed filters." }, { status: 400 });

    const { count, results } = await searchStays(parsed, sort);
    const response: SearchResponse = { parsed, understood: understoodChips(parsed), count, results };
    return Response.json(response);
  } catch (error) {
    console.error("Search failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Search is unavailable right now." }, { status: 502 });
  }
}
