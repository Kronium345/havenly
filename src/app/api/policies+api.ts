import { isPolicyTopic, policiesByTopic } from "@/lib/server/policy-queries";
import { requireSession } from "@/lib/server/require-session";

export async function GET(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;

  const topic = new URL(request.url).searchParams.get("topic");
  if (!isPolicyTopic(topic)) {
    return Response.json({ error: "Unknown policy topic." }, { status: 400 });
  }

  try {
    return Response.json(await policiesByTopic(topic));
  } catch (error) {
    console.error("Loading policies failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Policies are unavailable right now." }, { status: 502 });
  }
}
