// Server only. How much of a paid trip is refunded on cancel, by the stay's cancellation
// tier. These rules restate Havenly's policy text in Sanity ("Flexible cancellation",
// "Moderate cancellation", "Strict cancellation"); change both together.
//
// Check-in is taken as 4:00 PM UTC on the check-in date (the Havenly default), so
// "24 hours before check-in" is measured from there.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type Tier = "flexible" | "moderate" | "strict";

export function tierOf(policyTitle: string | undefined | null): Tier | null {
  const word = policyTitle?.trim().split(/\s+/)[0]?.toLowerCase();
  return word === "flexible" || word === "moderate" || word === "strict" ? word : null;
}

export function checkInMoment(checkIn: string) {
  return Date.parse(`${checkIn}T16:00:00Z`);
}

/**
 * Refund in pence. `paid` and `firstNight` are in pence. Before check-in only;
 * after check-in, nights not stayed aren't refunded under any tier.
 */
export function refundFor(tier: Tier | null, paid: number, firstNight: number, checkIn: string, now = Date.now()) {
  const untilCheckIn = checkInMoment(checkIn) - now;
  if (untilCheckIn < 0) return 0;
  switch (tier) {
    case "flexible":
      // Up to 24 hours before: full. Later: every night but the first.
      return untilCheckIn >= DAY ? paid : Math.max(0, paid - firstNight);
    case "moderate":
      // Up to 7 days: full. 7 days to 24 hours: 50% of the nightly rate. Later: none.
      return untilCheckIn >= 7 * DAY ? paid : untilCheckIn >= DAY ? Math.round(paid / 2) : 0;
    case "strict":
      // Up to 14 days: full. 14 to 7 days: 50%. Later: none.
      return untilCheckIn >= 14 * DAY ? paid : untilCheckIn >= 7 * DAY ? Math.round(paid / 2) : 0;
    default:
      // No known tier: nothing automatic; support handles it.
      return 0;
  }
}
