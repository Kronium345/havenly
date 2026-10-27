-- Bookings (prompts/17). Two exclusion constraints make overlaps impossible among rows
-- that are held or confirmed: one stay can't be booked twice for the same nights, and
-- one guest can't hold two trips on the same nights.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE bookings (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  stay_id text NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  city text NOT NULL,
  region text NOT NULL,
  image_url text,
  check_in date NOT NULL,
  check_out date NOT NULL,
  nights integer NOT NULL CHECK (nights > 0),
  guests integer NOT NULL CHECK (guests > 0),
  price_per_night integer NOT NULL,
  total integer NOT NULL,
  status text NOT NULL CHECK (status IN ('held', 'confirmed', 'cancelled', 'expired')),
  held_until timestamptz,
  payment_intent_id text UNIQUE,
  amount_paid integer,
  policy_title text,
  refunded integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in),
  CONSTRAINT bookings_no_double_booking EXCLUDE USING gist (
    stay_id WITH =, daterange(check_in, check_out, '[)') WITH &&
  ) WHERE (status IN ('held', 'confirmed')),
  CONSTRAINT bookings_no_overlapping_trips EXCLUDE USING gist (
    user_id WITH =, daterange(check_in, check_out, '[)') WITH &&
  ) WHERE (status IN ('held', 'confirmed'))
);

CREATE INDEX bookings_user_id ON bookings (user_id);
