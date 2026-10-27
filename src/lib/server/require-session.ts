import { verifyToken } from "@clerk/backend";

// Server only: import from `+api.ts` files, never from screens, so the secret key
// stays out of the app bundle.

/**
 * Checks the Clerk session token the app sends as `Authorization: Bearer <token>`.
 * Returns the user id and the active organization (host mode only), or a 401 response
 * to return as is.
 */
export type Session = { userId: string; orgId: string | null; orgRole: "org:admin" | "org:member" | null };

export async function requireSession(request: Request): Promise<Session | Response> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) return unauthorized();

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error("CLERK_SECRET_KEY is missing: API routes can't verify sessions.");
    return Response.json({ error: "Server is not configured." }, { status: 500 });
  }

  try {
    const payload = await verifyToken(token, { secretKey });
    if (!payload.sub) return unauthorized();
    // v2 tokens carry the organization as `o` (role without the "org:" prefix); v1 as org_*.
    const claims = payload as { o?: { id?: string; rol?: string }; org_id?: string; org_role?: string };
    const orgId = claims.o?.id ?? claims.org_id ?? null;
    const role = claims.o?.rol ?? claims.org_role ?? "";
    const orgRole = !orgId ? null : role.replace(/^org:/, "") === "admin" ? "org:admin" : "org:member";
    return { userId: payload.sub, orgId, orgRole };
  } catch (error) {
    // Clerk's reason code only (e.g. "token-expired"), never the token.
    const reason = (error as { reason?: string } | null)?.reason ?? (error instanceof Error ? error.name : "error");
    console.warn("Session check failed:", reason);
    return unauthorized();
  }
}

/**
 * A host request: the session must have an active organization (host mode), and an
 * admin role when `admin` is set. The organization only ever comes from the token.
 */
export async function requireHost(request: Request, options: { admin?: boolean } = {}) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;
  if (!session.orgId || !session.orgRole) {
    return Response.json({ error: "Switch to your hosting account." }, { status: 403 });
  }
  if (options.admin && session.orgRole !== "org:admin") {
    return Response.json({ error: "Only the account owner can do that." }, { status: 403 });
  }
  return { ...session, orgId: session.orgId, orgRole: session.orgRole };
}

function unauthorized() {
  return Response.json({ error: "Sign in to continue." }, { status: 401 });
}
