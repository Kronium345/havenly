import { paymentErrorResponse, startCardSetup } from "@/lib/server/payment-methods";
import { requireSession } from "@/lib/server/require-session";

// Returns the secrets PaymentSheet needs to save a new card (setup mode).
export async function POST(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;
  try {
    return Response.json(await startCardSetup(session.userId));
  } catch (error) {
    return paymentErrorResponse(error, "Starting card setup");
  }
}
