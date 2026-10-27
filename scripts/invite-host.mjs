/**
 * Links a Sanity host to a Clerk organization (its host company) and invites the owner.
 * Safe to rerun: an existing organization is reused and an existing invitation reported.
 *
 * Run: node --env-file=.env.local scripts/invite-host.mjs --host <sanity host id> --email <owner email> [--dry-run]
 *      node --env-file=.env.local scripts/invite-host.mjs --list   (hosts and their link status)
 */
import { parseArgs } from "node:util";
import { createClerkClient } from "@clerk/backend";

import { backfillHost, sanityQuery, sanitySet } from "./host-link.mjs";

const { values } = parseArgs({
  options: {
    host: { type: "string" },
    email: { type: "string" },
    "dry-run": { type: "boolean" },
    list: { type: "boolean" },
  },
});

async function list() {
  const hosts = await sanityQuery(
    `*[_type == "host"] | order(name asc){_id, name, clerkOrgId, "stays": count(*[_type == "property" && references(^._id)])}`,
  );
  for (const h of hosts)
    console.log(
      `${h._id}  ${h.name} (${h.stays} stays)  ${h.clerkOrgId ? `linked: ${h.clerkOrgId}` : "not linked"}`,
    );
}

async function invite() {
  if (!values.host || !values.email)
    throw new Error(
      "Pass --host <sanity host id> and --email <owner email>, or --list.",
    );
  if (!process.env.CLERK_SECRET_KEY)
    throw new Error("CLERK_SECRET_KEY must be set.");
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  const host = await sanityQuery(
    `*[_type == "host" && _id == $id][0]{_id, name, clerkOrgId}`,
    { id: values.host },
  );
  if (!host) throw new Error(`No host ${values.host}. List hosts with --list.`);
  const email = values.email.trim().toLowerCase();

  if (values["dry-run"]) {
    console.log(
      `Would ${host.clerkOrgId ? `reuse organization ${host.clerkOrgId}` : `create organization "${host.name}"`}, ` +
        `link it to host ${host._id}, backfill its bookings and invite ${email} as owner (org:admin).`,
    );
    return;
  }

  // Created without a member: the invited owner becomes its first admin.
  let orgId = host.clerkOrgId;
  if (orgId) {
    await clerk.organizations.getOrganization({ organizationId: orgId });
    console.log(`Reusing organization ${orgId}.`);
  } else {
    const org = await clerk.organizations.createOrganization({
      name: host.name,
      publicMetadata: { sanityHostId: host._id },
    });
    orgId = org.id;
    await sanitySet(host._id, { clerkOrgId: orgId });
    console.log(`Created organization ${orgId} and linked it to ${host.name}.`);
  }

  console.log(
    `Bookings linked to this host: ${await backfillHost(host._id, orgId)}.`,
  );

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
