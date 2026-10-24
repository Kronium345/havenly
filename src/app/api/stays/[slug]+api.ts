import { requireSession } from "@/lib/server/require-session";
import { stayBySlug } from "@/lib/server/stay-queries";

export async function GET(request: Request, { slug }: Record<string, string>) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;

  if (!slug || !/^[a-z0-9-]{1,96}$/.test(slug)) {
    return Response.json({ error: "Unknown stay." }, { status: 404 });
  }
  try {
    const stay = await stayBySlug(slug);
    if (!stay) return Response.json({ error: "This stay isn't available anymore." }, { status: 404 });
    return Response.json(stay);
  } catch (error) {
    console.error("Loading a stay failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "This stay is unavailable right now." }, { status: 502 });
  }
}
