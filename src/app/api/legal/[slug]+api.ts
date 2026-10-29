import { legalPage } from "@/lib/server/legal";

// Public, read-only (prompts/24): legal pages must be readable before sign-up and on the
// website, so there's no session check. Only published `legalPage` documents.
export async function GET(_request: Request, { slug }: Record<string, string>) {
  try {
    const page = await legalPage(slug ?? "");
    if (!page) return Response.json({ error: "We couldn't find that page." }, { status: 404 });
    return Response.json(page, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (error) {
    console.error("Legal page failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "This page is unavailable right now." }, { status: 502 });
  }
}
