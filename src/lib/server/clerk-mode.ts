// Server only. Dev and production use different Clerk instances, so the same host
// company has a different organization id in each. Both read the same Sanity dataset,
// where `host.clerkOrgId` holds the dev id and `host.clerkOrgIdLive` the production one.

/** True when this server runs on Clerk's production instance. */
export function clerkIsLive() {
  return process.env.CLERK_SECRET_KEY?.startsWith("sk_live_") ?? false;
}

/**
 * GROQ for a stay's host organization in this mode. Fixed text: the mode is passed as
 * the `$live` param (`hostOrgParams()`), never pasted in.
 */
export const HOST_ORG_ID = "select($live => host->clerkOrgIdLive, host->clerkOrgId)";

export function hostOrgParams() {
  return { live: clerkIsLive() };
}
