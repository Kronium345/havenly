import { bookingErrorResponse, releaseHold } from "@/lib/server/bookings";
import { requireSession } from "@/lib/server/require-session";

// Frees the 15-minute hold on dates the guest didn't pay for (PaymentSheet closed).
export async function POST(request: Request, { id }: Record<string, string>) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;
  try {
    await releaseHold(session.userId, id ?? "");
    return Response.json({ released: true });
  } catch (error) {
    return bookingErrorResponse(error, "Releasing a hold");
  }
}
