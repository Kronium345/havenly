-- Blocked nights (prompts/22). A host blocks nights as a bookings row with status
-- 'blocked', so the same exclusion constraint keeps blocks and bookings from overlapping.
-- A block's user_id is 'block:<uuid>', so the per-guest overlap rule never matches it.
ALTER TABLE bookings DROP CONSTRAINT bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('held', 'confirmed', 'cancelled', 'expired', 'blocked'));

ALTER TABLE bookings DROP CONSTRAINT bookings_no_double_booking;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_double_booking EXCLUDE USING gist (
  stay_id WITH =, daterange(check_in, check_out, '[)') WITH &&
) WHERE (status IN ('held', 'confirmed', 'blocked'));

ALTER TABLE bookings ADD COLUMN blocked_by text;
ALTER TABLE bookings ADD COLUMN note text CHECK (char_length(note) <= 80);
