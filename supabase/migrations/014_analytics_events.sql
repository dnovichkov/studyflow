-- Analytics events table for product analytics
-- Stores anonymized usage events (no PII beyond user UUID)

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_analytics_events_name_created
  ON analytics_events(event_name, created_at);
CREATE INDEX idx_analytics_events_user_created
  ON analytics_events(user_id, created_at);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RPC function: auto-fills user_id from auth context
CREATE FUNCTION track_event(p_event_name TEXT, p_metadata JSONB DEFAULT '{}')
RETURNS VOID AS $$
BEGIN
  INSERT INTO analytics_events (event_name, user_id, metadata)
  VALUES (p_event_name, auth.uid(), p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;
