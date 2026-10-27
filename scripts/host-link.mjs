// Shared by the host scripts (prompts/19): Sanity reads/writes and the bookings backfill.
import { neon } from '@neondatabase/serverless';

const projectId = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.EXPO_PUBLIC_SANITY_DATASET;
const API = `https://${projectId}.api.sanity.io/v2025-02-19/data`;

export async function sanityQuery(query, params = {}) {
  const response = await fetch(`${API}/query/${dataset}?perspective=published`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.description ?? `Sanity query failed (${response.status}).`);
  return body.result;
}

/** Sets a published field on a document with the write token. */
export async function sanitySet(id, fields) {
  const token = process.env.SANITY_WRITE_TOKEN;
  if (!token) throw new Error('SANITY_WRITE_TOKEN must be set.');
  const response = await fetch(`${API}/mutate/${dataset}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mutations: [{ patch: { id, set: fields } }] }),
  });
  if (!response.ok) throw new Error(`Sanity write failed (${response.status}): ${await response.text()}`);
}

/** Copies a linked host's organization onto its stays' bookings that don't have one yet. */
export async function backfillHost(hostId, orgId) {
  const stayIds = await sanityQuery(`*[_type == "property" && host._ref == $hostId]._id`, { hostId });
  if (stayIds.length === 0) return 0;
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    UPDATE bookings SET host_org_id = ${orgId}
    WHERE stay_id = ANY(${stayIds}) AND host_org_id IS NULL
    RETURNING id`;
  return rows.length;
}
