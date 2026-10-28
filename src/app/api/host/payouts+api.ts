import { payoutStatus } from "@/lib/server/connect";
import { hostErrorResponse } from "@/lib/server/host";
import { requireHost } from "@/lib/server/require-session";
import { StripeError } from "@/lib/server/stripe";

// The host company's payout setup (prompts/23). Owners only.
export async function GET(request: Request) {
  const host = await requireHost(request, { admin: true });
  if (host instanceof Response) return host;
  try {
    const { status } = await payoutStatus(host.orgId);
    return Response.json({ status });
  } catch (error) {
    if (error instanceof StripeError) return Response.json({ error: error.message }, { status: error.status });
    return hostErrorResponse(error, "Payout status");
  }
}
