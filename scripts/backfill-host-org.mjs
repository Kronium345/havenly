/**
 * Fills bookings.host_org_id for every linked host's stays (rows that don't have one yet),
 * using the host field for the Clerk instance of CLERK_SECRET_KEY (prompts/21).
 *
 * Run: node --env-file=.env.local scripts/backfill-host-org.mjs
 */
import { backfillHost, HOST_ORG, sanityQuery } from './host-link.mjs';

const live = process.env.CLERK_SECRET_KEY?.startsWith('sk_live_') ?? false;
const hosts = await sanityQuery(
  `*[_type == "host" && defined(${HOST_ORG})]{_id, name, "orgId": ${HOST_ORG}}`,
  { live },
);
let total = 0;
for (const h of hosts) {
  const n = await backfillHost(h._id, h.orgId);
  total += n;
  console.log(`${h.name}: ${n} bookings`);
}
console.log(`Linked ${total} bookings across ${hosts.length} hosts (${live ? 'production' : 'dev'} organizations).`);
