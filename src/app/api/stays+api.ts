import { requireSession } from "@/lib/server/require-session";
import { allStays } from "@/lib/server/stay-queries";

export async function GET(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;

  try {
    return Response.json(await allStays());
  } catch (error) {
    console.error("Loading stays failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Stays are unavailable right now." }, { status: 502 });
  }
}
