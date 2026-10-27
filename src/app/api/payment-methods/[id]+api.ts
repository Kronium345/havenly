import { paymentErrorResponse, removeCard } from "@/lib/server/payment-methods";
import { requireSession } from "@/lib/server/require-session";

export async function DELETE(request: Request, { id }: Record<string, string>) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;
  try {
    await removeCard(session.userId, id ?? "");
    return Response.json({ removed: true });
  } catch (error) {
    return paymentErrorResponse(error, "Removing a card");
  }
}
