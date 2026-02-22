-- ============================================================================
-- Group Hangouts Migration (M-054)
-- Creates tables and RLS policies for group hangout coordination
-- ============================================================================

-- Create hangouts table
CREATE TABLE IF NOT EXISTS hangouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  description TEXT CHECK (char_length(description) <= 500),
  scheduled_for TIMESTAMPTZ NOT NULL,
  max_attendees INT NOT NULL DEFAULT 8 CHECK (max_attendees BETWEEN 2 AND 20),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'cancelled', 'completed')),
  vibe TEXT CHECK (vibe IN ('chill', 'party', 'adventure', 'food', 'creative', 'active')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create hangout_attendees junction table
CREATE TABLE IF NOT EXISTS hangout_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hangout_id UUID NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'declined')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hangout_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hangouts_location_scheduled
  ON hangouts(location_id, scheduled_for)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_hangouts_creator
  ON hangouts(creator_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_hangouts_status_scheduled
  ON hangouts(status, scheduled_for)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_hangout_attendees_hangout
  ON hangout_attendees(hangout_id);

CREATE INDEX IF NOT EXISTS idx_hangout_attendees_user
  ON hangout_attendees(user_id);

-- ============================================================================
-- RPC: Get nearby hangouts
-- ============================================================================
CREATE OR REPLACE FUNCTION get_nearby_hangouts(
  p_lat FLOAT8,
  p_lng FLOAT8,
  p_radius_meters INT DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  creator_id UUID,
  location_id UUID,
  location_name TEXT,
  title TEXT,
  description TEXT,
  scheduled_for TIMESTAMPTZ,
  max_attendees INT,
  status TEXT,
  vibe TEXT,
  created_at TIMESTAMPTZ,
  attendee_count BIGINT,
  creator_avatar JSONB,
  attendee_avatars JSONB[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.creator_id,
    h.location_id,
    l.name AS location_name,
    h.title,
    h.description,
    h.scheduled_for,
    h.max_attendees,
    h.status,
    h.vibe,
    h.created_at,
    COUNT(DISTINCT ha.id) AS attendee_count,
    p.avatar AS creator_avatar,
    ARRAY_AGG(DISTINCT pa.avatar ORDER BY ha.joined_at ASC) FILTER (WHERE pa.avatar IS NOT NULL) AS attendee_avatars
  FROM hangouts h
  INNER JOIN locations l ON l.id = h.location_id
  INNER JOIN profiles p ON p.id = h.creator_id
  LEFT JOIN hangout_attendees ha ON ha.hangout_id = h.id AND ha.status IN ('going', 'maybe')
  LEFT JOIN profiles pa ON pa.id = ha.user_id
  WHERE
    h.is_active = true
    AND h.scheduled_for > NOW()
    AND h.status IN ('open', 'full')
    -- Calculate distance using Haversine formula
    AND (
      6371000 * acos(
        cos(radians(p_lat)) * cos(radians(l.latitude)) *
        cos(radians(l.longitude) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(l.latitude))
      )
    ) <= p_radius_meters
    -- Exclude hangouts by blocked users
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = v_user_id AND b.blocked_id = h.creator_id)
         OR (b.blocker_id = h.creator_id AND b.blocked_id = v_user_id)
    )
  GROUP BY h.id, l.name, p.avatar
  ORDER BY h.scheduled_for ASC
  LIMIT 50;
END;
$$;

-- ============================================================================
-- RPC: Join hangout
-- ============================================================================
CREATE OR REPLACE FUNCTION join_hangout(
  p_hangout_id UUID,
  p_status TEXT DEFAULT 'going'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_hangout RECORD;
  v_attendee_count BIGINT;
  v_new_status TEXT;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Validate status
  IF p_status NOT IN ('going', 'maybe', 'declined') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid status'
    );
  END IF;

  -- Get hangout details
  SELECT * INTO v_hangout
  FROM hangouts
  WHERE id = p_hangout_id
    AND is_active = true
    AND scheduled_for > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Hangout not found or has expired'
    );
  END IF;

  -- Check if hangout is open
  IF v_hangout.status NOT IN ('open', 'full') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Hangout is not accepting attendees'
    );
  END IF;

  -- Count current attendees
  SELECT COUNT(*)
  INTO v_attendee_count
  FROM hangout_attendees
  WHERE hangout_id = p_hangout_id
    AND status IN ('going', 'maybe');

  -- Check if full (only for 'going' status)
  IF p_status = 'going' AND v_attendee_count >= v_hangout.max_attendees THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Hangout is full'
    );
  END IF;

  -- Insert or update attendee record
  INSERT INTO hangout_attendees (hangout_id, user_id, status)
  VALUES (p_hangout_id, v_user_id, p_status)
  ON CONFLICT (hangout_id, user_id)
  DO UPDATE SET status = p_status, joined_at = NOW();

  -- Recalculate attendee count
  SELECT COUNT(*)
  INTO v_attendee_count
  FROM hangout_attendees
  WHERE hangout_id = p_hangout_id
    AND status IN ('going', 'maybe');

  -- Update hangout status if now full
  IF v_attendee_count >= v_hangout.max_attendees THEN
    v_new_status := 'full';
  ELSE
    v_new_status := 'open';
  END IF;

  UPDATE hangouts
  SET status = v_new_status, updated_at = NOW()
  WHERE id = p_hangout_id;

  RETURN jsonb_build_object(
    'success', true,
    'hangout_id', p_hangout_id,
    'attendee_count', v_attendee_count,
    'status', v_new_status
  );
END;
$$;

-- ============================================================================
-- RPC: Leave hangout
-- ============================================================================
CREATE OR REPLACE FUNCTION leave_hangout(
  p_hangout_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_attendee_count BIGINT;
  v_new_status TEXT;
  v_max_attendees INT;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Delete attendee record
  DELETE FROM hangout_attendees
  WHERE hangout_id = p_hangout_id
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are not attending this hangout'
    );
  END IF;

  -- Get hangout max_attendees
  SELECT max_attendees INTO v_max_attendees
  FROM hangouts
  WHERE id = p_hangout_id;

  -- Recalculate attendee count
  SELECT COUNT(*)
  INTO v_attendee_count
  FROM hangout_attendees
  WHERE hangout_id = p_hangout_id
    AND status IN ('going', 'maybe');

  -- Reopen hangout if was full
  IF v_attendee_count < v_max_attendees THEN
    v_new_status := 'open';

    UPDATE hangouts
    SET status = v_new_status, updated_at = NOW()
    WHERE id = p_hangout_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'hangout_id', p_hangout_id,
    'attendee_count', v_attendee_count
  );
END;
$$;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE hangouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hangout_attendees ENABLE ROW LEVEL SECURITY;

-- Hangouts policies
CREATE POLICY "Users can read all active hangouts"
  ON hangouts FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can create their own hangouts"
  ON hangouts FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own hangouts"
  ON hangouts FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own hangouts"
  ON hangouts FOR DELETE
  USING (auth.uid() = creator_id);

-- Attendees policies
CREATE POLICY "Users can read all attendees"
  ON hangout_attendees FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own attendance"
  ON hangout_attendees FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- Updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_hangouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_hangouts_updated_at
  BEFORE UPDATE ON hangouts
  FOR EACH ROW
  EXECUTE FUNCTION update_hangouts_updated_at();

-- ============================================================================
-- Grants
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON hangouts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hangout_attendees TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_hangouts TO authenticated;
GRANT EXECUTE ON FUNCTION join_hangout TO authenticated;
GRANT EXECUTE ON FUNCTION leave_hangout TO authenticated;
