import { listCards, paymentErrorResponse } from "@/lib/server/payment-methods";
import { requireSession } from "@/lib/server/require-session";

export async function GET(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;
  try {
    return Response.json(await listCards(session.userId));
  } catch (error) {
    return paymentErrorResponse(error, "Loading cards");
  }
}
