import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Server only. Neon Postgres over HTTP (works on EAS Hosting's Workers runtime). Use the
// tagged template only (`sql\`... ${value}\``), so values are always sent as parameters.

let client: NeonQueryFunction<false, false> | null = null;

export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  client ??= neon(url);
  return client;
}

/** Postgres refused a row because it overlaps another (exclusion constraint, 23P01). */
export function isOverlap(error: unknown) {
  return (error as { code?: string } | null)?.code === "23P01";
}
