// Server only. Reads published content from the public dataset; no token needed.
// Values always go in as `$params`, never into the query string.

const projectId = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.EXPO_PUBLIC_SANITY_DATASET;
const API_VERSION = "v2025-02-19";

export class SanityError extends Error {}

export async function sanityQuery<T>(query: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!projectId || !dataset) {
    throw new SanityError("EXPO_PUBLIC_SANITY_PROJECT_ID and EXPO_PUBLIC_SANITY_DATASET must be set.");
  }
  const response = await fetch(
    `https://${projectId}.api.sanity.io/${API_VERSION}/data/query/${dataset}?perspective=published`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, params }),
    },
  );
  const body = (await response.json().catch(() => null)) as { result?: T; error?: { description?: string } } | null;
  if (!response.ok || !body || !("result" in body)) {
    throw new SanityError(body?.error?.description ?? `Sanity query failed (${response.status}).`);
  }
  return body.result as T;
}
