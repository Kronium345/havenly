import { bookingErrorResponse, createPaidBooking, listBookings, parsePaymentIntentId } from "@/lib/server/bookings";
import { requireSession } from "@/lib/server/require-session";

export async function GET(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;
  try {
    return Response.json(await listBookings(session.userId));
  } catch (error) {
    return bookingErrorResponse(error, "Loading bookings");
  }
}

// Body: { paymentIntentId }. Saves the trip once Stripe confirms the payment succeeded.
export async function POST(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;
  try {
    const paymentIntentId = parsePaymentIntentId(await request.json().catch(() => null));
    return Response.json(await createPaidBooking(session.userId, paymentIntentId), { status: 201 });
  } catch (error) {
    return bookingErrorResponse(error, "Booking");
  }
}
