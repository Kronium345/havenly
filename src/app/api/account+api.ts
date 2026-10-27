import { accountErrorResponse, deleteAccount } from "@/lib/server/account";
import { requireSession } from "@/lib/server/require-session";

// Deletes the signed-in guest's account and everything personal (src/lib/server/account.ts).
export async function DELETE(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;
  try {
    await deleteAccount(session.userId);
    return Response.json({ deleted: true });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
