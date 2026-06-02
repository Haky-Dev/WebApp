CREATE TABLE IF NOT EXISTS clubs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clubs_public_read" ON clubs
  FOR SELECT USING (true);

CREATE POLICY "clubs_service_all" ON clubs
  USING (true) WITH CHECK (true);
