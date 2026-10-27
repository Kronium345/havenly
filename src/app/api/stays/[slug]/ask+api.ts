import type { AskResponse } from "@/lib/ask/answer";
import { askQuestion } from "@/lib/server/ask-question";
import { requireSession } from "@/lib/server/require-session";
import { stayBySlug } from "@/lib/server/stay-queries";

// Body: { question: string }. Answers quote this stay's data and Havenly's policies word
// for word (src/lib/server/ask-question.ts). What guests ask is never logged.
export async function POST(request: Request, { slug }: Record<string, string>) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;

  if (!slug || !/^[a-z0-9-]{1,96}$/.test(slug)) {
    return Response.json({ error: "Unknown stay." }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as { question?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 300) : "";
  if (!question) return Response.json({ error: "Ask a question." }, { status: 400 });

  try {
    const stay = await stayBySlug(slug);
    if (!stay) return Response.json({ error: "This stay isn't available anymore." }, { status: 404 });
    const response: AskResponse = await askQuestion(question, stay);
    return Response.json(response);
  } catch (error) {
    console.error("Answering a question failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Answers are unavailable right now." }, { status: 502 });
  }
}
