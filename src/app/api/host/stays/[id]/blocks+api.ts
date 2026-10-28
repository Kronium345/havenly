import { createBlock, hostBlocks, hostErrorResponse } from "@/lib/server/host";
import { requireHost } from "@/lib/server/require-session";

export async function GET(request: Request, { id }: Record<string, string>) {
  const host = await requireHost(request);
  if (host instanceof Response) return host;
  try {
    return Response.json(await hostBlocks(host.orgId, id ?? ""));
  } catch (error) {
    return hostErrorResponse(error, "Host blocks");
  }
}

// Body: { checkIn, checkOut, note? }. Owners only.
export async function POST(request: Request, { id }: Record<string, string>) {
  const host = await requireHost(request, { admin: true });
  if (host instanceof Response) return host;
  try {
    const block = await createBlock(host.orgId, host.userId, id ?? "", await request.json().catch(() => null));
    return Response.json(block, { status: 201 });
  } catch (error) {
    return hostErrorResponse(error, "Blocking dates");
  }
}
