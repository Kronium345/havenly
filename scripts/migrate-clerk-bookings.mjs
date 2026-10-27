/**
 * Copies bookings stored in Clerk private metadata (before prompts/17) into Neon.
 * Rows that already exist are skipped; rows the overlap constraints refuse are listed.
 * It never deletes the Clerk copies: that's a separate step once the data is checked.
 *
 * Run: node --env-file=.env.local scripts/migrate-clerk-bookings.mjs
 */
import { createClerkClient } from '@clerk/backend';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL || !process.env.CLERK_SECRET_KEY) {
  throw new Error('DATABASE_URL and CLERK_SECRET_KEY must be set.');
}
const sql = neon(process.env.DATABASE_URL);
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

let found = 0;
let copied = 0;
let skipped = 0;
const refused = [];

for (let offset = 0; ; offset += 100) {
  const { data: users } = await clerk.users.getUserList({ limit: 100, offset });
  for (const user of users) {
    const bookings = Array.isArray(user.privateMetadata?.bookings) ? user.privateMetadata.bookings : [];
    for (const b of bookings) {
      found += 1;
      try {
        const rows = await sql`
          INSERT INTO bookings (id, user_id, stay_id, slug, title, city, region, image_url, check_in, check_out,
            nights, guests, price_per_night, total, status, payment_intent_id, amount_paid, policy_title, refunded, created_at)
          VALUES (${b.id}, ${user.id}, ${b.stayId}, ${b.slug}, ${b.title}, ${b.place?.city ?? ''}, ${b.place?.region ?? ''},
            ${b.imageUrl ?? null}, ${b.checkIn}, ${b.checkOut}, ${b.nights}, ${b.guests}, ${b.pricePerNight}, ${b.total},
            ${b.status === 'cancelled' ? 'cancelled' : 'confirmed'}, ${b.paymentIntentId ?? null}, ${b.amountPaid ?? null},
            ${b.policyTitle ?? null}, ${b.refunded ?? null}, ${b.createdAt ?? new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING
          RETURNING id`;
        if (rows.length > 0) copied += 1;
        else skipped += 1;
      } catch (error) {
        refused.push({ user: user.id, booking: b.id, stay: b.title, dates: `${b.checkIn} → ${b.checkOut}`, reason: error.code === '23P01' ? 'overlaps another booking' : error.message });
      }
    }
  }
  if (users.length < 100) break;
}

console.log(`Clerk bookings found: ${found}. Copied: ${copied}. Already there: ${skipped}. Refused: ${refused.length}.`);
for (const row of refused) console.log('  refused:', JSON.stringify(row));
console.log('Clerk copies were left in place.');
