-- ============================================================================
-- Fix Regulars RLS Policy and Create Missing View
-- ============================================================================
-- Issue: The location_regulars RLS policy has infinite recursion because it
-- references the same table it's protecting.
--
-- Solution:
-- 1. Create a SECURITY DEFINER function to check if user is regular at location
-- 2. Use this function in the RLS policy to avoid recursion
-- 3. Create the fellow_regulars view if it doesn't exist
-- ============================================================================

-- ============================================================================
-- STEP 1: Create helper function to check if user is regular at a location
-- ============================================================================
-- This function bypasses RLS to check regular status without recursion

CREATE OR REPLACE FUNCTION is_user_regular_at_location(
    p_user_id UUID,
    p_location_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM location_regulars
        WHERE user_id = p_user_id
          AND location_id = p_location_id
          AND is_regular = true
    );
$$;

COMMENT ON FUNCTION is_user_regular_at_location(UUID, UUID) IS
    'Check if a user is a regular at a specific location (bypasses RLS for internal use)';

-- ============================================================================
-- STEP 2: Fix location_regulars RLS policy
-- ============================================================================
-- Drop the existing problematic policy and create a simpler one

DROP POLICY IF EXISTS "location_regulars_select" ON location_regulars;

-- Create a simpler policy that only allows users to see their own records
-- Other regulars will be accessed via the SECURITY DEFINER get_fellow_regulars function
CREATE POLICY "location_regulars_select_own"
    ON location_regulars
    FOR SELECT
    USING (auth.uid() = user_id);

-- Ensure insert/update policies exist
DROP POLICY IF EXISTS "location_regulars_insert_system" ON location_regulars;
CREATE POLICY "location_regulars_insert_system"
    ON location_regulars
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "location_regulars_update_system" ON location_regulars;
CREATE POLICY "location_regulars_update_system"
    ON location_regulars
    FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 3: Create or replace the fellow_regulars view
-- ============================================================================
-- This view is used by get_fellow_regulars function

DROP VIEW IF EXISTS fellow_regulars;
CREATE OR REPLACE VIEW fellow_regulars AS
SELECT
    lr1.user_id AS current_user_id,
    lr2.user_id AS fellow_regular_id,
    lr1.location_id,
    l.name AS location_name,
    l.address AS location_address,
    lr2.weekly_visit_count,
    p.display_name,
    p.avatar AS avatar,
    p.is_verified,
    p.regulars_visibility
FROM location_regulars lr1
JOIN location_regulars lr2
    ON lr1.location_id = lr2.location_id
    AND lr1.user_id != lr2.user_id
    AND lr2.is_regular = true
JOIN locations l ON l.id = lr1.location_id
JOIN profiles p ON p.id = lr2.user_id
WHERE lr1.is_regular = true
  AND p.regulars_mode_enabled = true
  AND p.regulars_visibility != 'hidden';

COMMENT ON VIEW fellow_regulars IS
    'View of fellow regulars at shared locations';

-- ============================================================================
-- STEP 4: Update get_fellow_regulars function to use SECURITY DEFINER
-- ============================================================================
-- This ensures the function can access location_regulars data without RLS issues

DROP FUNCTION IF EXISTS get_fellow_regulars(UUID, UUID);
CREATE OR REPLACE FUNCTION get_fellow_regulars(
    p_user_id UUID,
    p_location_id UUID DEFAULT NULL
)
RETURNS TABLE (
    fellow_user_id UUID,
    display_name TEXT,
    avatar JSONB,
    is_verified BOOLEAN,
    location_id UUID,
    location_name TEXT,
    shared_weeks INTEGER,
    visibility VARCHAR(20)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_regulars_enabled BOOLEAN;
BEGIN
    -- Check if requesting user has regulars mode enabled
    SELECT regulars_mode_enabled INTO v_user_regulars_enabled
    FROM profiles
    WHERE id = p_user_id;

    IF NOT COALESCE(v_user_regulars_enabled, true) THEN
        RETURN; -- Return empty if user has disabled regulars mode
    END IF;

    RETURN QUERY
    SELECT
        fr.fellow_regular_id,
        fr.display_name,
        fr.avatar,
        fr.is_verified,
        fr.location_id,
        fr.location_name,
        fr.weekly_visit_count as shared_weeks,
        fr.regulars_visibility as visibility
    FROM fellow_regulars fr
    WHERE fr.current_user_id = p_user_id
      AND (p_location_id IS NULL OR fr.location_id = p_location_id)
      AND (
          -- Public visibility: visible to all regulars
          fr.regulars_visibility = 'public'
          OR
          -- Mutual visibility: visible only if there's a connection
          (fr.regulars_visibility = 'mutual' AND EXISTS (
              SELECT 1 FROM regulars_connections rc
              WHERE rc.location_id = fr.location_id
                AND (
                    (rc.user_a_id = p_user_id AND rc.user_b_id = fr.fellow_regular_id)
                    OR (rc.user_b_id = p_user_id AND rc.user_a_id = fr.fellow_regular_id)
                )
          ))
      )
    ORDER BY fr.weekly_visit_count DESC, fr.location_name;
END;
$$;

COMMENT ON FUNCTION get_fellow_regulars(UUID, UUID) IS
    'Returns fellow regulars for a user with privacy filtering (SECURITY DEFINER to bypass RLS)';

-- ============================================================================
-- STEP 5: Update get_location_regulars to use SECURITY DEFINER
-- ============================================================================

DROP FUNCTION IF EXISTS get_location_regulars(UUID, INTEGER);
CREATE OR REPLACE FUNCTION get_location_regulars(
    p_location_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar JSONB,
    is_verified BOOLEAN,
    weekly_visit_count INTEGER,
    visibility VARCHAR(20)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_user_is_regular BOOLEAN;
BEGIN
    -- Check if current user is a regular at this location
    v_current_user_is_regular := is_user_regular_at_location(auth.uid(), p_location_id);

    -- If current user is not a regular, only show count
    IF NOT COALESCE(v_current_user_is_regular, false) THEN
        RETURN; -- Return empty - caller should use count function instead
    END IF;

    RETURN QUERY
    SELECT
        lr.user_id,
        p.display_name,
        p.avatar,
        p.is_verified,
        lr.weekly_visit_count,
        p.regulars_visibility as visibility
    FROM location_regulars lr
    JOIN profiles p ON p.id = lr.user_id
    WHERE lr.location_id = p_location_id
      AND lr.is_regular = true
      AND lr.user_id != auth.uid()
      AND p.regulars_mode_enabled = true
      AND p.regulars_visibility != 'hidden'
    ORDER BY lr.weekly_visit_count DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_location_regulars(UUID, INTEGER) IS
    'Returns regulars at a location (only if current user is also a regular)';

-- ============================================================================
-- STEP 6: Update get_location_regulars_count to use SECURITY DEFINER
-- ============================================================================

DROP FUNCTION IF EXISTS get_location_regulars_count(UUID);
CREATE OR REPLACE FUNCTION get_location_regulars_count(
    p_location_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM location_regulars lr
    JOIN profiles p ON p.id = lr.user_id
    WHERE lr.location_id = p_location_id
      AND lr.is_regular = true
      AND p.regulars_mode_enabled = true
      AND p.regulars_visibility != 'hidden';

    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION get_location_regulars_count(UUID) IS
    'Returns count of regulars at a location';

-- ============================================================================
-- STEP 7: Ensure regulars_connections table has proper policies
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE regulars_connections ENABLE ROW LEVEL SECURITY;

-- Users can view their own connections
DROP POLICY IF EXISTS "regulars_connections_select" ON regulars_connections;
CREATE POLICY "regulars_connections_select"
    ON regulars_connections
    FOR SELECT
    USING (
        auth.uid() = user_a_id OR auth.uid() = user_b_id
    );

-- System can insert connections (via refresh function)
DROP POLICY IF EXISTS "regulars_connections_insert" ON regulars_connections;
CREATE POLICY "regulars_connections_insert"
    ON regulars_connections
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_a_id OR auth.uid() = user_b_id
    );

-- Users can update their own viewed status
DROP POLICY IF EXISTS "regulars_connections_update" ON regulars_connections;
CREATE POLICY "regulars_connections_update"
    ON regulars_connections
    FOR UPDATE
    USING (
        auth.uid() = user_a_id OR auth.uid() = user_b_id
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run these queries to verify the fix:
--
-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'location_regulars';
--
-- Check the view exists:
-- SELECT * FROM information_schema.views WHERE table_name = 'fellow_regulars';
--
-- Test the function:
-- SELECT * FROM get_fellow_regulars('some-user-id'::uuid);
-- ============================================================================
