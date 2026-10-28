/**
 * Links a Sanity host to a Clerk organization (its host company) and invites the owner.
 * Safe to rerun: an existing organization is reused and an existing invitation reported.
 * Dev links `host.clerkOrgId`; --production asks for the Clerk production secret key
 * (hidden, never stored) and links `host.clerkOrgIdLive` (prompts/21).
 *
 * Run: node --env-file=.env.local scripts/invite-host.mjs --host <sanity host id> --email <owner email> [--production] [--dry-run]
 *      node --env-file=.env.local scripts/invite-host.mjs --list   (hosts and their link status)
 */
import { parseArgs } from "node:util";
import { createClerkClient } from "@clerk/backend";

import { backfillHost, orgField, productionClerkKey, sanityQuery, sanitySet } from "./host-link.mjs";

const { values } = parseArgs({
  options: {
    host: { type: "string" },
    email: { type: "string" },
    production: { type: "boolean" },
    "dry-run": { type: "boolean" },
    list: { type: "boolean" },
  },
});

async function list() {
  const hosts = await sanityQuery(
    `*[_type == "host"] | order(name asc){_id, name, clerkOrgId, clerkOrgIdLive, "stays": count(*[_type == "property" && references(^._id)])}`,
  );
  for (const h of hosts)
    console.log(
      `${h._id}  ${h.name} (${h.stays} stays)  dev: ${h.clerkOrgId ?? "not linked"}  production: ${h.clerkOrgIdLive ?? "not linked"}`,
    );
}

async function invite() {
  if (!values.host || !values.email)
    throw new Error(
      "Pass --host <sanity host id> and --email <owner email>, or --list.",
    );
  const live = Boolean(values.production);
  const field = orgField(live);
  const secretKey = live ? await productionClerkKey() : process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY must be set.");
  if (!live && secretKey.startsWith("sk_live_"))
    throw new Error("CLERK_SECRET_KEY is a production key: run with --production instead.");
  const clerk = createClerkClient({ secretKey });

  const host = await sanityQuery(
    `*[_type == "host" && _id == $id][0]{_id, name, clerkOrgId, clerkOrgIdLive}`,
    { id: values.host },
  );
  if (!host) throw new Error(`No host ${values.host}. List hosts with --list.`);
  const email = values.email.trim().toLowerCase();
  const instance = live ? "production" : "dev";

  if (values["dry-run"]) {
    console.log(
      `Would ${host[field] ? `reuse ${instance} organization ${host[field]}` : `create ${instance} organization "${host.name}"`}, ` +
        `link it to host ${host._id} (${field})${live ? "" : ", backfill its bookings"} and invite ${email} as owner (org:admin).`,
    );
    return;
  }

  // Created without a member: the invited owner becomes its first admin.
  let orgId = host[field];
  if (orgId) {
    await clerk.organizations.getOrganization({ organizationId: orgId });
    console.log(`Reusing ${instance} organization ${orgId}.`);
  } else {
    const org = await clerk.organizations.createOrganization({
      name: host.name,
      publicMetadata: { sanityHostId: host._id },
    });
    orgId = org.id;
    await sanitySet(host._id, { [field]: orgId });
    console.log(`Created ${instance} organization ${orgId} and linked it to ${host.name}.`);
  }

  // The production database (Neon main) isn't reachable from .env.local; its bookings
  // get host_org_id at checkout, so there is nothing older to backfill.
  if (live) console.log("Production: no backfill (new bookings store the organization at checkout).");
  else console.log(`Bookings linked to this host: ${await backfillHost(host._id, orgId)}.`);

  const { data: pending } =
    await clerk.organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ["pending"],
    });
  if (pending.some((i) => i.emailAddress.toLowerCase() === email)) {
    console.log(`${email} already has a pending invitation.`);
  } else {
    await clerk.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: email,
      role: "org:admin",
    });
    console.log(
      `Invited ${email} as owner. They accept from the email, then use Profile → Switch to hosting.`,
    );
  }
}

await (values.list ? list() : invite());
