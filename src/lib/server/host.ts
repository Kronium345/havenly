import { createClerkClient } from "@clerk/backend";

import { addDays, toIso } from "../dates";
import type { HostBooking, HostStayDetails, HostSummary } from "../host-shared";
import type { StayCard } from "../search/types";

import { HOST_ORG_ID, hostOrgParams } from "./clerk-mode";
import { sql } from "./db";
import { sanityQuery } from "./sanity";
import { CARD_FIELDS } from "./stay-queries";

// Server only. Host mode (prompts/19): everything is scoped to the organization from the
// verified session, never one sent by the app. Stays come from Sanity by the host's
// organization for this Clerk instance (`HOST_ORG_ID`, prompts/21);
// bookings from Neon by host_org_id. Holds and expired rows are never shown, and guests
// appear as first name + last initial.

export class HostError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function clerk() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new HostError("Server is not configured.", 500);
  return createClerkClient({ secretKey });
}

type Row = {
  id: string;
  user_id: string;
  stay_id: string;
  title: string;
  image_url: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  total: number;
  status: "confirmed" | "cancelled";
};

/** "Daniel A." for each guest, looked up in one Clerk call. */
async function guestNames(userIds: string[]) {
  const names = new Map<string, string>();
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return names;
  const { data } = await clerk().users.getUserList({ userId: unique, limit: unique.length });
  for (const user of data) {
    const first = user.firstName?.trim() || "Guest";
    const initial = user.lastName?.trim()[0];
    names.set(user.id, initial ? `${first} ${initial.toUpperCase()}.` : first);
  }
  return names;
}

async function toHostBookings(rows: Row[]): Promise<HostBooking[]> {
  const names = await guestNames(rows.map((row) => row.user_id));
  return rows.map((row) => ({
    id: row.id,
    stayId: row.stay_id,
    stayTitle: row.title,
    imageUrl: row.image_url,
    guest: names.get(row.user_id) ?? "Former guest",
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: row.nights,
    guests: row.guests,
    total: row.total,
    status: row.status,
  }));
}

export function hostStays(orgId: string) {
  return sanityQuery<StayCard[]>(
    `*[_type == "property" && defined(slug.current) && ${HOST_ORG_ID} == $orgId] | order(title asc)${CARD_FIELDS}`,
    { orgId, ...hostOrgParams() },
  );
}

export async function hostSummary(orgId: string, role: HostSummary["role"]): Promise<HostSummary> {
  const today = toIso(new Date());
  const horizon = addDays(today, 30);
  const [org, stays, counts] = await Promise.all([
    clerk().organizations.getOrganization({ organizationId: orgId }),
    sanityQuery<number>(`count(*[_type == "property" && ${HOST_ORG_ID} == $orgId])`, { orgId, ...hostOrgParams() }),
    sql()`
      SELECT
        count(*) FILTER (WHERE check_out >= ${today}::date)::int AS upcoming,
        coalesce(sum(GREATEST(0, LEAST(check_out, ${horizon}::date) - GREATEST(check_in, ${today}::date))), 0)::int AS nights
      FROM bookings
      WHERE host_org_id = ${orgId} AND status = 'confirmed'`.then((rows) => rows as { upcoming: number; nights: number }[]),
  ]);
  return { company: org.name, role, stays, upcomingBookings: counts[0].upcoming, nightsNext30: counts[0].nights };
}

/** Upcoming: not yet checked out, soonest first. Past: checked out, newest first. */
export async function hostBookings(orgId: string, when: "upcoming" | "past", stayId: string | null = null) {
  const today = toIso(new Date());
  const rows = (await sql()`
    SELECT id, user_id, stay_id, title, image_url, check_in::text AS check_in, check_out::text AS check_out,
      nights, guests, total, status
    FROM bookings
    WHERE host_org_id = ${orgId} AND status IN ('confirmed', 'cancelled')
      AND (${stayId}::text IS NULL OR stay_id = ${stayId})
      AND CASE WHEN ${when} = 'upcoming' THEN check_out >= ${today}::date ELSE check_out < ${today}::date END
    ORDER BY
      CASE WHEN ${when} = 'upcoming' THEN check_in END ASC,
      CASE WHEN ${when} = 'past' THEN check_in END DESC
    LIMIT 100`) as Row[];
  return toHostBookings(rows);
}

export async function hostStay(orgId: string, stayId: string): Promise<HostStayDetails> {
  const stay = await sanityQuery<StayCard | null>(
    `*[_type == "property" && _id == $stayId && ${HOST_ORG_ID} == $orgId][0]${CARD_FIELDS}`,
    { orgId, stayId, ...hostOrgParams() },
  );
  if (!stay) throw new HostError("We couldn't find that stay.", 404);
  const bookings = await hostBookings(orgId, "upcoming", stayId);
  const booked = bookings
    .filter((booking) => booking.status === "confirmed")
    .map(({ checkIn, checkOut }) => ({ checkIn, checkOut }));
  return { stay, booked, bookings };
}

export function hostErrorResponse(error: unknown, action: string) {
  if (error instanceof HostError) return Response.json({ error: error.message }, { status: error.status });
  console.error(`${action} failed:`, error instanceof Error ? error.message : error);
  return Response.json({ error: "Hosting is unavailable right now." }, { status: 502 });
}
