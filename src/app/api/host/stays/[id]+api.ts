import { hostErrorResponse, hostStay } from "@/lib/server/host";
import { requireHost } from "@/lib/server/require-session";

export async function GET(request: Request, { id }: Record<string, string>) {
  const host = await requireHost(request);
  if (host instanceof Response) return host;
  try {
    return Response.json(await hostStay(host.orgId, id ?? ""));
  } catch (error) {
    return hostErrorResponse(error, "Host stay");
  }
}
