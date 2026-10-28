import { runPayoutJob } from "@/lib/server/host-payouts";

// The daily host payout job (prompts/23), called by the EAS Workflows schedule. No user
// session: the JOB_SECRET bearer is the check.
export async function POST(request: Request) {
  const secret = process.env.JOB_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || header !== `Bearer ${secret}`) return Response.json({ error: "Not allowed." }, { status: 401 });
  try {
    return Response.json(await runPayoutJob());
  } catch (error) {
    console.error("Host payout job failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Job failed." }, { status: 500 });
  }
}
