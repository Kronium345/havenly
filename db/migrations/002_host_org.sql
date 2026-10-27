-- Host companies (prompts/19). Each booking keeps the Clerk organization of the stay's host
-- at booking time, so host screens filter on one column.
ALTER TABLE bookings ADD COLUMN host_org_id text;

CREATE INDEX bookings_host_org_id ON bookings (host_org_id, check_in);
