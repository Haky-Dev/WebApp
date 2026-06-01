-- Events
CREATE TABLE IF NOT EXISTS events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  status     text NOT NULL DEFAULT 'collecting'
               CHECK (status IN ('collecting', 'closed')),
  admin_pin  text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Expected participants (organizer pre-list)
CREATE TABLE IF NOT EXISTS expected_participants (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name     text NOT NULL
);

-- Actual registered participants
CREATE TABLE IF NOT EXISTS participants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name          text NOT NULL,
  club          text,
  rating        numeric(4,2) NOT NULL
                  CHECK (rating >= 0 AND rating <= 30),
  registered_at timestamptz DEFAULT now()
);

-- Paired results
CREATE TABLE IF NOT EXISTS pairs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_number      integer NOT NULL,
  participant_a_id uuid NOT NULL REFERENCES participants(id),
  participant_b_id uuid NOT NULL REFERENCES participants(id)
);

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE expected_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;

-- Public read on everything (business logic enforced in API routes)
CREATE POLICY "public read events" ON events FOR SELECT USING (true);
CREATE POLICY "public read participants" ON participants FOR SELECT USING (true);
CREATE POLICY "public read pairs" ON pairs FOR SELECT USING (true);
CREATE POLICY "public read expected" ON expected_participants FOR SELECT USING (true);

-- Participants: anyone can insert when event is collecting
CREATE POLICY "insert participant when collecting"
  ON participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id AND status = 'collecting'
    )
  );
