// Server only. Runs code-built GROQ through the `havenly-search` Sanity Context endpoint
// (GROQ mode) with its `groq_query` tool. That tool takes no params, so the code-built
// query's `$params` are swapped for literals here, and only here (`inlineParams`).
// Callers fall back to `sanityQuery` with real params when this throws.

const url = process.env.SANITY_CONTEXT_MCP_URL;
const token = process.env.SANITY_ORGANIZATION_TOKEN;
const TIMEOUT_MS = 4000;

export class ContextError extends Error {}

export async function contextQuery<T>(query: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!url || !token) throw new ContextError("SANITY_CONTEXT_MCP_URL and SANITY_ORGANIZATION_TOKEN must be set.");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "groq_query", arguments: { query: inlineParams(query, params) } },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const message = parseRpc(await response.text());
  if (!response.ok || !message || message.error) {
    throw new ContextError(message?.error?.message ?? `Context query failed (${response.status}).`);
  }
  const result = message.result;
  const text = result?.content?.find((part) => part.type === "text")?.text;
  if (result?.isError || text === undefined) throw new ContextError(text ?? "Context returned no result.");
  const parsed = JSON.parse(text) as { result?: T } | T;
  return parsed && typeof parsed === "object" && "result" in parsed ? (parsed.result as T) : (parsed as T);
}

type Literal = string | number | boolean | Literal[];

function isLiteral(value: unknown): value is Literal {
  if (typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return Array.isArray(value) && value.every(isLiteral);
}

/**
 * Replaces each `$name` with its value as a GROQ literal. JSON.stringify gives valid GROQ
 * strings (same escapes), so guest text stays inside its quotes. Code-built queries never
 * contain "$" inside string literals. Unknown names or other value types throw.
 */
export function inlineParams(query: string, params: Record<string, unknown>) {
  return query.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, name: string) => {
    const value = params[name];
    if (!isLiteral(value)) throw new ContextError(`Param $${name} can't be inlined.`);
    return JSON.stringify(value);
  });
}

type RpcMessage = {
  result?: { content?: { type: string; text?: string }[]; isError?: boolean };
  error?: { message?: string };
};

/** The endpoint may answer as plain JSON or as one server-sent event. */
function parseRpc(body: string): RpcMessage | null {
  const json = body.trimStart().startsWith("{")
    ? body
    : body
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5))
        .join("");
  try {
    return JSON.parse(json) as RpcMessage;
  } catch {
    return null;
  }
}
