-- Message moderation infrastructure
-- Automatic content filtering for spam, phishing, and harmful content

-- Add moderation columns to messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'blocked')),
  ADD COLUMN IF NOT EXISTS moderation_result JSONB,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_messages_moderation_status
  ON messages(moderation_status)
  WHERE moderation_status IN ('flagged', 'blocked');

COMMENT ON COLUMN messages.moderation_status IS 'Moderation status: pending (not checked), approved (clean), flagged (review needed), blocked (rejected)';
COMMENT ON COLUMN messages.moderation_result IS 'JSON containing matched patterns, categories, and severity';
COMMENT ON COLUMN messages.moderated_at IS 'Timestamp when moderation check was performed';

-- Moderation patterns table
CREATE TABLE IF NOT EXISTS message_moderation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('keyword', 'regex')),
  severity TEXT NOT NULL CHECK (severity IN ('block', 'flag')),
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_patterns_active
  ON message_moderation_patterns(is_active, severity)
  WHERE is_active = true;

COMMENT ON TABLE message_moderation_patterns IS
  'Patterns for automatic message moderation. Keywords are case-insensitive substring matches. Regex patterns use PostgreSQL regex syntax.';

-- Insert default moderation patterns
INSERT INTO message_moderation_patterns (pattern, pattern_type, severity, category) VALUES
  -- Phishing URLs (block)
  ('bit.ly/', 'keyword', 'block', 'phishing'),
  ('tinyurl.com/', 'keyword', 'block', 'phishing'),
  ('goo.gl/', 'keyword', 'block', 'phishing'),
  ('t.co/', 'keyword', 'block', 'phishing'),
  ('ow.ly/', 'keyword', 'block', 'phishing'),

  -- Common spam patterns (flag)
  ('click here to claim', 'keyword', 'flag', 'spam'),
  ('congratulations you won', 'keyword', 'flag', 'spam'),
  ('act now', 'keyword', 'flag', 'spam'),
  ('limited time offer', 'keyword', 'flag', 'spam'),
  ('claim your prize', 'keyword', 'flag', 'spam'),

  -- Financial scams (block)
  ('send money to', 'keyword', 'block', 'scam'),
  ('wire transfer', 'keyword', 'flag', 'scam'),
  ('bitcoin wallet', 'keyword', 'flag', 'scam'),
  ('cash app', 'keyword', 'flag', 'scam'),

  -- Regex patterns for suspicious content
  ('https?://[a-z0-9-]+\.(tk|ml|ga|cf|gq)/', 'regex', 'block', 'phishing'),
  ('\b\d{16}\b', 'regex', 'block', 'sensitive_data')
ON CONFLICT DO NOTHING;

-- Moderation function (lightweight keyword/regex matching)
CREATE OR REPLACE FUNCTION moderate_message_content(message_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  matched_patterns JSONB := '[]'::jsonb;
  pattern_record RECORD;
  highest_severity TEXT := 'approved';
  match_found BOOLEAN;
BEGIN
  -- Return approved if message is empty or null
  IF message_text IS NULL OR trim(message_text) = '' THEN
    RETURN jsonb_build_object(
      'status', 'approved',
      'matched_patterns', '[]'::jsonb,
      'checked_at', now()
    );
  END IF;

  -- Check against active patterns
  FOR pattern_record IN
    SELECT pattern, pattern_type, severity, category
    FROM message_moderation_patterns
    WHERE is_active = true
    ORDER BY severity DESC -- Check block patterns first
  LOOP
    match_found := false;

    -- Check pattern type
    IF pattern_record.pattern_type = 'keyword' THEN
      -- Case-insensitive substring match
      match_found := lower(message_text) LIKE '%' || lower(pattern_record.pattern) || '%';
    ELSIF pattern_record.pattern_type = 'regex' THEN
      -- Regex match
      match_found := message_text ~* pattern_record.pattern;
    END IF;

    -- If pattern matched, record it
    IF match_found THEN
      matched_patterns := matched_patterns || jsonb_build_object(
        'pattern', pattern_record.pattern,
        'type', pattern_record.pattern_type,
        'severity', pattern_record.severity,
        'category', pattern_record.category
      );

      -- Update highest severity (block > flag > approved)
      IF pattern_record.severity = 'block' THEN
        highest_severity := 'blocked';
      ELSIF pattern_record.severity = 'flag' AND highest_severity != 'blocked' THEN
        highest_severity := 'flagged';
      END IF;
    END IF;
  END LOOP;

  -- Return moderation result
  RETURN jsonb_build_object(
    'status', highest_severity,
    'matched_patterns', matched_patterns,
    'checked_at', now()
  );
END;
$$;

COMMENT ON FUNCTION moderate_message_content IS
  'Checks message content against moderation patterns. Returns JSON with status (approved/flagged/blocked) and matched patterns. Lightweight implementation using keyword and regex matching.';

-- Trigger function to auto-moderate messages
CREATE OR REPLACE FUNCTION auto_moderate_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  moderation_result JSONB;
BEGIN
  -- Run moderation on message content
  moderation_result := moderate_message_content(NEW.content);

  -- Set moderation fields
  NEW.moderation_status := moderation_result->>'status';
  NEW.moderation_result := moderation_result;
  NEW.moderated_at := now();

  -- Block message if status is 'blocked'
  IF NEW.moderation_status = 'blocked' THEN
    RAISE EXCEPTION 'Message blocked by moderation: %',
      moderation_result->'matched_patterns'->0->>'category'
      USING HINT = 'Your message contains prohibited content';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on messages INSERT
DROP TRIGGER IF EXISTS trigger_auto_moderate_message ON messages;
CREATE TRIGGER trigger_auto_moderate_message
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_moderate_message();

COMMENT ON TRIGGER trigger_auto_moderate_message ON messages IS
  'Automatically moderates message content before insertion. Blocks messages matching severity=block patterns. Flags suspicious content for review.';
