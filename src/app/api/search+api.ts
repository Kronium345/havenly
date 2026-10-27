import { requireSession } from "@/lib/server/require-session";
import { readQuery } from "@/lib/server/read-query";
import { knownCities, searchStays } from "@/lib/server/stay-queries";
import { createTimer } from "@/lib/server/timing";
import { sanitizeParsedQuery, type ParsedQuery } from "@/lib/search/parse-query";
import type { SearchResponse, SearchSort } from "@/lib/search/types";
import { understoodChips } from "@/lib/search/understood";

const sorts: SearchSort[] = ["best", "priceLow", "priceHigh", "rating"];

// Body: { query: string } for a new sentence, or { parsed } after the guest removes a
// chip or applies filters. A sentence is read by Jev (falling back to the code parser);
// what guests type is never logged. Every response carries a Server-Timing header
// (step names and ms only), and dev logs one timing line per search.
export async function POST(request: Request) {
  const timer = createTimer();
  const respond = (body: unknown, status = 200) => {
    if (process.env.NODE_ENV !== "production") console.log("search timing:", timer.summary());
    return Response.json(body, { status, headers: { "Server-Timing": timer.header() } });
  };

  const session = await timer.time("session", () => requireSession(request));
  if (session instanceof Response) {
    return new Response(session.body, {
      status: session.status,
      headers: { "Content-Type": "application/json", "Server-Timing": timer.header() },
    });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const sort = sorts.includes(body?.sort as SearchSort) ? (body?.sort as SearchSort) : "best";

  let parsed: ParsedQuery | null = null;
  let readBy: SearchResponse["readBy"] = "code";
  try {
    if (typeof body?.query === "string") {
      const query = body.query;
      const { cities } = await timer.time("cities", knownCities, ({ cached }) => (cached ? "hit" : "miss"));
      const { readBy: reader, ...reading } = await timer.time(
        "read",
        () => readQuery(query, { cities }),
        (result) => result.readBy,
      );
      parsed = reading;
      readBy = reader;
    } else if (body?.parsed) {
      parsed = sanitizeParsedQuery(body.parsed);
    }
    if (!parsed) return respond({ error: "Send a query or parsed filters." }, 400);

    const finalParsed = parsed;
    const { count, results } = await timer.time("query", () => searchStays(finalParsed, sort), ({ via }) => via);
    const response: SearchResponse = { parsed, understood: understoodChips(parsed), count, results, readBy };
    return respond(response);
  } catch (error) {
    console.error("Search failed:", error instanceof Error ? error.message : error);
    return respond({ error: "Search is unavailable right now." }, 502);
  }
}
