/**
 * Fills bookings.host_org_id for every linked host's stays (rows that don't have one yet).
 *
 * Run: node --env-file=.env.local scripts/backfill-host-org.mjs
 */
import { backfillHost, sanityQuery } from './host-link.mjs';

const hosts = await sanityQuery(`*[_type == "host" && defined(clerkOrgId)]{_id, name, clerkOrgId}`);
let total = 0;
for (const h of hosts) {
  const n = await backfillHost(h._id, h.clerkOrgId);
  total += n;
  console.log(`${h.name}: ${n} bookings`);
}
console.log(`Linked ${total} bookings across ${hosts.length} hosts.`);
