/**
 * GDPR/CCPA Data Export Service
 *
 * Provides "Download My Data" functionality required for GDPR compliance.
 * Users can request all personal data stored about them.
 *
 * Required for:
 * - GDPR Article 20 (Right to data portability)
 * - CCPA Section 1798.100 (Right to know)
 * - Apple App Store Review Guidelines 5.1.1
 *
 * @example
 * ```typescript
 * import { exportUserData } from './dataExport'
 *
 * const result = await exportUserData(userId)
 * if (result.success) {
 *   // result.data contains all user data as JSON
 *   await shareData(JSON.stringify(result.data, null, 2))
 * }
 * ```
 */

import { supabase, type AppSupabaseClient } from './supabase'
import { captureException } from './sentry'

// ============================================================================
// Types
// ============================================================================

export interface UserDataExport {
  exportedAt: string
  userId: string
  profile: Record<string, unknown> | null
  posts: Record<string, unknown>[]
  conversations: Record<string, unknown>[]
  messages: Record<string, unknown>[]
  checkins: Record<string, unknown>[]
  blocks: Record<string, unknown>[]
  reports: Record<string, unknown>[]
  pushTokens: Record<string, unknown>[]
  photos: Record<string, unknown>[]
  favoriteLocations: Record<string, unknown>[]
  notificationPreferences: Record<string, unknown>[]
  matchNotifications: Record<string, unknown>[]
  termsAcceptance: Record<string, unknown>[]
  frequentLocations: Record<string, unknown>[]
  locationVisitHistory: Record<string, unknown>[]
  userEventTokens: Record<string, unknown>[]
  sparkNotificationsSent: Record<string, unknown>[]
}

export interface DataExportResult {
  success: boolean
  data: UserDataExport | null
  error: string | null
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Export all personal data for the authenticated user.
 *
 * Collects data from all tables where the user has records.
 * Sensitive fields (like internal IDs of other users) are excluded.
 *
 * @param userId - The authenticated user's ID
 * @param client - Optional Supabase client (defaults to global instance)
 * @returns All user data in a structured JSON format
 */
export async function exportUserData(userId: string, client: AppSupabaseClient = supabase): Promise<DataExportResult> {
  try {
    // Verify the authenticated user matches
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user || user.id !== userId) {
      return {
        success: false,
        data: null,
        error: 'You can only export your own data.',
      }
    }

    // Collect data from all tables in parallel
    const [
      profileResult,
      postsResult,
      conversationsResult,
      messagesResult,
      checkinsResult,
      blocksResult,
      reportsResult,
      pushTokensResult,
      photosResult,
      favoriteLocationsResult,
      notificationPreferencesResult,
      matchNotificationsResult,
      termsAcceptanceResult,
      frequentLocationsResult,
      locationVisitHistoryResult,
      userEventTokensResult,
      sparkNotificationsSentResult,
    ] = await Promise.all([
      client.from('profiles').select('*').eq('id', userId).single(),
      client.from('posts').select('id, message, note, emoji, latitude, longitude, location_name, created_at').eq('producer_id', userId).order('created_at', { ascending: false }),
      client.from('conversations').select('id, created_at, is_active').or(`producer_id.eq.${userId},consumer_id.eq.${userId}`).order('created_at', { ascending: false }),
      client.from('messages').select('id, content, created_at, conversation_id').eq('sender_id', userId).order('created_at', { ascending: false }),
      client.from('checkins').select('id, location_id, location_name, latitude, longitude, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
      client.from('blocks').select('id, blocked_id, created_at').eq('blocker_id', userId),
      client.from('reports').select('id, reported_type, reason, additional_details, created_at').eq('reporter_id', userId),
      client.from('expo_push_tokens').select('id, created_at').eq('user_id', userId),
      client.from('profile_photos').select('id, storage_path, is_primary, moderation_status, created_at').eq('user_id', userId),
      client.from('favorite_locations').select('id, location_id, created_at').eq('user_id', userId),
      client.from('notification_preferences').select('*').eq('user_id', userId),
      client.from('match_notifications').select('id, post_id, created_at').eq('user_id', userId),
      client.from('terms_acceptance').select('id, version, accepted_at').eq('user_id', userId),
      client.from('frequent_locations').select('id, location_id, visit_count, last_visited_at').eq('user_id', userId),
      client.from('location_visit_history').select('id, location_id, visited_at').eq('user_id', userId),
      client.from('user_event_tokens').select('id, event_type, created_at').eq('user_id', userId),
      client.from('spark_notifications_sent').select('id, location_id, sent_at, created_at').eq('user_id', userId),
    ])

    // Strip internal fields from profile
    const profile = profileResult.data
    if (profile) {
      // Remove internal-only fields
      delete (profile as Record<string, unknown>).deletion_scheduled_for
      delete (profile as Record<string, unknown>).deletion_reason
    }

    const exportData: UserDataExport = {
      exportedAt: new Date().toISOString(),
      userId,
      profile: profile || null,
      posts: postsResult.data || [],
      conversations: conversationsResult.data || [],
      messages: messagesResult.data || [],
      checkins: checkinsResult.data || [],
      blocks: blocksResult.data || [],
      reports: reportsResult.data || [],
      pushTokens: pushTokensResult.data || [],
      photos: photosResult.data || [],
      favoriteLocations: favoriteLocationsResult.data || [],
      notificationPreferences: notificationPreferencesResult.data || [],
      matchNotifications: matchNotificationsResult.data || [],
      termsAcceptance: termsAcceptanceResult.data || [],
      frequentLocations: frequentLocationsResult.data || [],
      locationVisitHistory: locationVisitHistoryResult.data || [],
      userEventTokens: userEventTokensResult.data || [],
      sparkNotificationsSent: sparkNotificationsSentResult.data || [],
    }

    return {
      success: true,
      data: exportData,
      error: null,
    }
  } catch (error) {
    captureException(error, { operation: 'exportUserData', userId })
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Failed to export data',
    }
  }
}

// ============================================================================
// Location Data Retention
// ============================================================================

/**
 * Request cleanup of old location-related data for the authenticated user.
 * Calls a server-side function that removes location data older than the
 * specified retention period.
 *
 * @param userId - The authenticated user's ID
 * @param retentionDays - Days of location data to keep (default: 90)
 * @returns Result of the cleanup operation
 */
export async function cleanupOldLocationData(
  userId: string,
  retentionDays: number = 90
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Verify the authenticated user matches
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.id !== userId) {
      return { success: false, error: 'Authentication mismatch.' }
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    // Delete old checkins beyond retention period
    const { error } = await supabase
      .from('checkins')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', cutoffDate.toISOString())

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    captureException(error, { operation: 'cleanupOldLocationData', userId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Cleanup failed',
    }
  }
}

export default {
  exportUserData,
  cleanupOldLocationData,
}
