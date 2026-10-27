/**
 * Applies pending SQL files from db/migrations in name order, recording each in
 * schema_migrations so it runs once.
 *
 * Run: node --env-file=.env.local scripts/db-migrate.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set.');
const sql = neon(url);
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');

await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
const applied = new Set((await sql`SELECT name FROM schema_migrations`).map((row) => row.name));

for (const name of readdirSync(dir).filter((file) => file.endsWith('.sql')).sort()) {
  if (applied.has(name)) continue;
  // Each file runs as one transaction with its record, so a failure leaves nothing half-applied.
  const statements = readFileSync(join(dir, name), 'utf8')
    .split(/;\s*$/m)
    .map((statement) => statement.trim())
    .filter((statement) => statement && !/^(--[^\n]*\n?)+$/.test(statement));
  await sql.transaction([
    ...statements.map((statement) => sql.query(statement)),
    sql`INSERT INTO schema_migrations (name) VALUES (${name})`,
  ]);
  console.log(`applied ${name}`);
}
console.log('migrations up to date');
