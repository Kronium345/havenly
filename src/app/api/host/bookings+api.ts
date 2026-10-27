import { hostBookings, hostErrorResponse } from "@/lib/server/host";
import { requireHost } from "@/lib/server/require-session";

export async function GET(request: Request) {
  const host = await requireHost(request);
  if (host instanceof Response) return host;
  const when = new URL(request.url).searchParams.get("when") === "past" ? "past" : "upcoming";
  try {
    return Response.json({ bookings: await hostBookings(host.orgId, when) });
  } catch (error) {
    return hostErrorResponse(error, "Host bookings");
  }
}
