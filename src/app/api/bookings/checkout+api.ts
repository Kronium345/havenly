import { bookingErrorResponse, parseNewBooking, startCheckout } from "@/lib/server/bookings";
import { requireSession } from "@/lib/server/require-session";

// Body: { stayId, checkIn, checkOut, guests }. Checks the trip, prices it from Sanity and
// returns the client secrets Stripe's PaymentSheet needs. Nothing is saved until
// POST /api/bookings confirms the payment.
export async function POST(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;
  try {
    const input = parseNewBooking(await request.json().catch(() => null));
    return Response.json(await startCheckout(session.userId, input));
  } catch (error) {
    return bookingErrorResponse(error, "Starting checkout");
  }
}
