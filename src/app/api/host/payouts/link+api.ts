import { dashboardLink, onboardingLink } from "@/lib/server/connect";
import { hostErrorResponse } from "@/lib/server/host";
import { requireHost } from "@/lib/server/require-session";
import { StripeError } from "@/lib/server/stripe";

// Body: { type: "onboarding" | "dashboard" }. Returns a single-use Stripe URL to open in
// the in-app browser: payout setup, or the host's Express dashboard. Owners only.
export async function POST(request: Request) {
  const host = await requireHost(request, { admin: true });
  if (host instanceof Response) return host;
  try {
    const { type } = ((await request.json().catch(() => null)) ?? {}) as { type?: unknown };
    if (type !== "onboarding" && type !== "dashboard") return Response.json({ error: "Unknown link." }, { status: 400 });
    const url = type === "onboarding" ? await onboardingLink(host.orgId, host.userId) : await dashboardLink(host.orgId);
    return Response.json({ url });
  } catch (error) {
    if (error instanceof StripeError) return Response.json({ error: error.message }, { status: error.status });
    return hostErrorResponse(error, "Payout link");
  }
}
