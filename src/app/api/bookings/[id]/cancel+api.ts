import { bookingErrorResponse, cancelBooking } from "@/lib/server/bookings";
import { requireSession } from "@/lib/server/require-session";

export async function POST(request: Request, { id }: Record<string, string>) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;
  try {
    return Response.json(await cancelBooking(session.userId, id ?? ""));
  } catch (error) {
    return bookingErrorResponse(error, "Cancelling a booking");
  }
}
