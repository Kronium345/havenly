import { hostErrorResponse, hostStays } from "@/lib/server/host";
import { requireHost } from "@/lib/server/require-session";

export async function GET(request: Request) {
  const host = await requireHost(request);
  if (host instanceof Response) return host;
  try {
    return Response.json({ stays: await hostStays(host.orgId) });
  } catch (error) {
    return hostErrorResponse(error, "Host stays");
  }
}
