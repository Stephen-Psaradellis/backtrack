-- Migration: Add rate_limits table for persistent rate limiting
-- Required by: supabase/functions/moderate-image/index.ts
-- Purpose: Prevent rate limit bypass during serverless cold starts

-- Create rate_limits table for tracking API request rates
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Composite unique constraint for upsert
  CONSTRAINT rate_limits_user_endpoint_unique UNIQUE (user_id, endpoint)
);

-- Index for fast lookups by user_id and endpoint
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint
ON public.rate_limits(user_id, endpoint);

-- Index for cleanup of old entries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
ON public.rate_limits(window_start);

-- RLS: Only service role can access this table (edge functions use service role)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No RLS policies for regular users - only service role has access
-- This is intentional: rate limiting should not be bypassable by clients

-- Function to check and increment rate limit atomically
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id text,
  p_window_ms bigint DEFAULT 60000,
  p_max_requests integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now bigint;
  v_window_start bigint;
  v_current_count integer;
  v_allowed boolean;
  v_remaining integer;
BEGIN
  v_now := (EXTRACT(EPOCH FROM now()) * 1000)::bigint;
  v_window_start := v_now - p_window_ms;

  -- Try to get existing rate limit entry
  SELECT request_count, window_start
  INTO v_current_count, v_window_start
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND endpoint = 'moderate-image'
  FOR UPDATE;

  IF NOT FOUND OR v_window_start < (v_now - p_window_ms) THEN
    -- New window or first request
    INSERT INTO public.rate_limits (user_id, endpoint, request_count, window_start)
    VALUES (p_user_id, 'moderate-image', 1, v_now)
    ON CONFLICT (user_id, endpoint)
    DO UPDATE SET request_count = 1, window_start = v_now;

    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_requests - 1,
      'count', 1
    );
  END IF;

  IF v_current_count >= p_max_requests THEN
    -- Rate limit exceeded
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'count', v_current_count
    );
  END IF;

  -- Increment count
  UPDATE public.rate_limits
  SET request_count = request_count + 1
  WHERE user_id = p_user_id
    AND endpoint = 'moderate-image';

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_max_requests - v_current_count - 1,
    'count', v_current_count + 1
  );
END;
$$;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION public.check_rate_limit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;

-- Cleanup function to remove old rate limit entries (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
  v_cutoff bigint;
BEGIN
  -- Delete entries older than 1 hour
  v_cutoff := (EXTRACT(EPOCH FROM now()) * 1000)::bigint - (60 * 60 * 1000);

  DELETE FROM public.rate_limits
  WHERE window_start < v_cutoff;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION public.cleanup_rate_limits FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits TO service_role;

COMMENT ON TABLE public.rate_limits IS 'Persistent rate limiting for edge functions - survives cold starts';
COMMENT ON FUNCTION public.check_rate_limit IS 'Atomically check and increment rate limit for a user/endpoint';
COMMENT ON FUNCTION public.cleanup_rate_limits IS 'Remove stale rate limit entries older than 1 hour';
