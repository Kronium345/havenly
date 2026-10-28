-- Host payouts (prompts/23). At payment the host's 85% moves to their Stripe balance
-- (payouts paused); the day after check-in it's paid out to their bank. Amounts in pence,
-- because 85% of a whole-pound total isn't always whole pounds.
ALTER TABLE bookings ADD COLUMN charge_id text;
ALTER TABLE bookings ADD COLUMN host_share_pence integer CHECK (host_share_pence >= 0);
ALTER TABLE bookings ADD COLUMN transfer_id text;
ALTER TABLE bookings ADD COLUMN transfer_status text NOT NULL DEFAULT 'none'
  CHECK (transfer_status IN ('none', 'awaiting_host', 'sent', 'failed'));
ALTER TABLE bookings ADD COLUMN transferred_pence integer CHECK (transferred_pence >= 0);
ALTER TABLE bookings ADD COLUMN payout_due_at timestamptz;
ALTER TABLE bookings ADD COLUMN payout_id text;
ALTER TABLE bookings ADD COLUMN payout_status text NOT NULL DEFAULT 'none'
  CHECK (payout_status IN ('none', 'pending', 'paid', 'failed'));

CREATE INDEX bookings_payout_work ON bookings (transfer_status, payout_status, payout_due_at)
  WHERE transfer_status IN ('awaiting_host', 'failed') OR payout_status = 'pending';
