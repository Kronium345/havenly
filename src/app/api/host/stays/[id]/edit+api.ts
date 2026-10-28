import { hostErrorResponse } from "@/lib/server/host";
import { hostStayEditable, updateHostStay } from "@/lib/server/host-edit";
import { requireHost } from "@/lib/server/require-session";

// The stay's editable details (prompts/22). Owners only, for reading and writing.
export async function GET(request: Request, { id }: Record<string, string>) {
  const host = await requireHost(request, { admin: true });
  if (host instanceof Response) return host;
  try {
    return Response.json(await hostStayEditable(host.orgId, id ?? ""));
  } catch (error) {
    return hostErrorResponse(error, "Loading stay details");
  }
}

// Body: StayEdit plus `rev` from GET.
export async function PATCH(request: Request, { id }: Record<string, string>) {
  const host = await requireHost(request, { admin: true });
  if (host instanceof Response) return host;
  try {
    return Response.json(await updateHostStay(host.orgId, id ?? "", await request.json().catch(() => null)));
  } catch (error) {
    return hostErrorResponse(error, "Saving stay details");
  }
}
