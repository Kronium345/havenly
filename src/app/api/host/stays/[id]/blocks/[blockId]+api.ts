import { hostErrorResponse, removeBlock } from "@/lib/server/host";
import { requireHost } from "@/lib/server/require-session";

// Owners only.
export async function DELETE(request: Request, { id, blockId }: Record<string, string>) {
  const host = await requireHost(request, { admin: true });
  if (host instanceof Response) return host;
  try {
    await removeBlock(host.orgId, id ?? "", blockId ?? "");
    return Response.json({ removed: true });
  } catch (error) {
    return hostErrorResponse(error, "Removing a block");
  }
}
