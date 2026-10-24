import { bookingErrorResponse, createBooking, listBookings, parseNewBooking } from "@/lib/server/bookings";
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

export async function POST(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;
  try {
    const input = parseNewBooking(await request.json().catch(() => null));
    return Response.json(await createBooking(session.userId, input), { status: 201 });
  } catch (error) {
    return bookingErrorResponse(error, "Booking");
  }
}
