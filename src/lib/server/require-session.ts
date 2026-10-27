import { verifyToken } from "@clerk/backend";

// Server only: import from `+api.ts` files, never from screens, so the secret key
// stays out of the app bundle.

/**
 * Checks the Clerk session token the app sends as `Authorization: Bearer <token>`.
 * Returns the user id, or a 401 response to return as is.
 */
export async function requireSession(request: Request): Promise<{ userId: string } | Response> {
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
    return payload.sub ? { userId: payload.sub } : unauthorized();
  } catch (error) {
    // Clerk's reason code only (e.g. "token-expired"), never the token.
    const reason = (error as { reason?: string } | null)?.reason ?? (error instanceof Error ? error.name : "error");
    console.warn("Session check failed:", reason);
    return unauthorized();
  }
}

function unauthorized() {
  return Response.json({ error: "Sign in to continue." }, { status: 401 });
}
