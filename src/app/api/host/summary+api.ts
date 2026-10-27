import { hostErrorResponse, hostSummary } from "@/lib/server/host";
import { requireHost } from "@/lib/server/require-session";

export async function GET(request: Request) {
  const host = await requireHost(request);
  if (host instanceof Response) return host;
  try {
    return Response.json(await hostSummary(host.orgId, host.orgRole));
  } catch (error) {
    return hostErrorResponse(error, "Host summary");
  }
}
