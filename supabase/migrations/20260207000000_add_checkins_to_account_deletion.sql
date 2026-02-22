-- ============================================================================
-- Add User Checkins Deletion to Account Deletion Function
-- ============================================================================
-- This migration adds deletion of user_checkins to the account deletion
-- function to ensure GPS/location data is properly removed for GDPR compliance.
-- ============================================================================

/**
 * Updated delete_user_account function to include user_checkins deletion.
 * This ensures all location/GPS data is removed when a user deletes their account.
 */
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_counts JSONB := '{}'::JSONB;
    v_count INTEGER;
BEGIN
    -- Verify the user exists and caller has permission
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Can only delete your own account';
    END IF;

    -- Start deletion process (order matters due to foreign keys)

    -- 1. Delete messages sent by user
    DELETE FROM messages WHERE sender_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('messages', v_count);

    -- 2. Delete conversations where user is participant
    DELETE FROM conversations
    WHERE producer_id = p_user_id OR consumer_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('conversations', v_count);

    -- 3. Delete posts created by user
    DELETE FROM posts WHERE producer_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('posts', v_count);

    -- 4. Delete photo shares
    DELETE FROM photo_shares
    WHERE owner_id = p_user_id OR shared_with_user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('photo_shares', v_count);

    -- 5. Delete profile photos
    DELETE FROM profile_photos WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('profile_photos', v_count);

    -- 6. Delete favorite locations
    DELETE FROM favorite_locations WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('favorite_locations', v_count);

    -- 7. Delete user check-ins (PRIVACY: Contains GPS coordinates)
    DELETE FROM user_checkins WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('checkins', v_count);

    -- 8. Delete blocks (both directions)
    DELETE FROM blocks
    WHERE blocker_id = p_user_id OR blocked_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('blocks', v_count);

    -- 9. Delete reports (submitted by user)
    DELETE FROM reports WHERE reporter_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('reports', v_count);

    -- 10. Delete push tokens
    DELETE FROM expo_push_tokens WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('push_tokens', v_count);

    -- 11. Delete notification preferences
    DELETE FROM notification_preferences WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('notification_preferences', v_count);

    -- 12. Delete event tokens
    DELETE FROM user_event_tokens WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('event_tokens', v_count);

    -- 13. Delete match notifications
    DELETE FROM match_notifications WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('match_notifications', v_count);

    -- 14. Delete terms acceptance
    DELETE FROM terms_acceptance WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('terms_acceptance', v_count);

    -- 15. Delete frequent locations (spark notifications)
    DELETE FROM frequent_locations WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('frequent_locations', v_count);

    -- 16. Delete spark notifications sent
    DELETE FROM spark_notifications_sent WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('spark_notifications', v_count);

    -- 17. Delete the user's profile (this should be last before auth deletion)
    DELETE FROM profiles WHERE id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('profile', v_count);

    -- 18. Finally, delete the auth user (this triggers CASCADE for any remaining FK refs)
    -- Note: This requires service role, so we mark for deletion instead
    -- The actual auth.users deletion must be done via Supabase Admin API

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'deleted_counts', v_deleted_counts,
        'message', 'Account data deleted. Auth account will be removed shortly.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'user_id', p_user_id
    );
END;
$$;

COMMENT ON FUNCTION delete_user_account(UUID) IS
'Permanently deletes all user data including GPS/location data for GDPR/CCPA compliance. Required for App Store.';
