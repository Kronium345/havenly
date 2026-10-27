import { requireSession } from "@/lib/server/require-session";
import { listSavedStays, parseSavedIds, replaceSavedStays } from "@/lib/server/saved-stays";

// GET: the guest's hearted stays as cards. PUT { ids }: replaces the list (newest first).
export async function GET(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;
  try {
    return Response.json(await listSavedStays(session.userId));
  } catch (error) {
    console.error("Loading saved stays failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Saved stays are unavailable right now." }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;
  const ids = parseSavedIds(await request.json().catch(() => null));
  if (!ids) return Response.json({ error: "That list of stays isn't valid." }, { status: 400 });
  try {
    return Response.json(await replaceSavedStays(session.userId, ids));
  } catch (error) {
    console.error("Saving stays failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Couldn't save that. Try again." }, { status: 502 });
  }
}
