/**
 * PostDetailScreen
 *
 * Displays the full details of a post ("missed connection").
 * Consumers can view the complete note, avatar, location, and timestamp.
 * If the post matches the consumer's avatar, a "Start Chat" button is shown.
 *
 * Features:
 * - Full post details display (avatar, note, location, timestamp)
 * - Match indicator with score when user has configured avatar
 * - "Start Chat" button for initiating anonymous conversations
 * - "Block User" button for blocking the post producer
 * - Loading and error states
 * - Pull-to-refresh functionality
 *
 * Blocking Implementation:
 * - Block User button shown for posts that are not the user's own
 * - Calls blockUser() from lib/moderation.ts which deactivates conversations
 * - After successful block, navigates back to previous screen
 *
 * @example
 * ```tsx
 * // Navigation from LedgerScreen
 * navigation.navigate('PostDetail', { postId: '123e4567-e89b-12d3-a456-426614174000' })
 * ```
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'

import { LargeAvatarPreview } from '../components/AvatarPreview'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorState } from '../components/EmptyState'
import { Button, OutlineButton } from '../components/Button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  compareAvatars,
  isValidForMatching,
  getMatchSummary,
  getPrimaryMatchCount,
  DEFAULT_MATCH_THRESHOLD,
} from '../lib/matching'
import { startConversation } from '../lib/conversations'
import { blockUser, MODERATION_ERRORS } from '../lib/moderation'
import { formatRelativeTime, getMatchColor, getMatchLabel } from '../components/PostCard'
import type { PostDetailRouteProp, MainStackNavigationProp } from '../navigation/types'
import type { Post, Location } from '../types/database'
import type { AvatarConfig } from '../types/avatar'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Post with expanded location data
 */
interface PostWithLocation extends Post {
  location?: Location | null
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Colors used in the PostDetailScreen
 */
const COLORS = {
  primary: '#007AFF',
  background: '#F2F2F7',
  cardBackground: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  border: '#E5E5EA',
  success: '#34C759',
  warning: '#FF9500',
} as const

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PostDetailScreen - View full details of a missed connection post
 *
 * Fetches post data from Supabase, displays all post information,
 * calculates match score if user has configured their avatar,
 * and provides "Start Chat" button for initiating conversations.
 */
export function PostDetailScreen(): JSX.Element {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const route = useRoute<PostDetailRouteProp>()
  const navigation = useNavigation<MainStackNavigationProp>()
  const { profile, userId } = useAuth()

  const { postId } = route.params

  // Get user's avatar for matching
  const userAvatar = profile?.own_avatar as AvatarConfig | null
  const hasValidAvatar = isValidForMatching(userAvatar)

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [post, setPost] = useState<PostWithLocation | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startingChat, setStartingChat] = useState(false)
  const [blocking, setBlocking] = useState(false)

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  /**
   * Fetch post details from Supabase
   */
  const fetchPost = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true)
    }
    setError(null)

    try {
      // Fetch post with location data
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*, location:locations(*)')
        .eq('id', postId)
        .eq('is_active', true)
        .single()

      if (postError) {
        if (postError.code === 'PGRST116') {
          setError('This post is no longer available.')
        } else {
          setError('Failed to load post. Please try again.')
        }
        return
      }

      if (!postData) {
        setError('Post not found.')
        return
      }

      setPost(postData as PostWithLocation)
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [postId])

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  /**
   * Fetch post when screen mounts or postId changes
   */
  useEffect(() => {
    fetchPost()
  }, [fetchPost])

  // ---------------------------------------------------------------------------
  // MATCHING
  // ---------------------------------------------------------------------------

  /**
   * Calculate match result between user's avatar and post's target avatar
   */
  const matchResult = useMemo(() => {
    if (!hasValidAvatar || !userAvatar || !post?.target_avatar) {
      return null
    }

    const targetAvatar = post.target_avatar as AvatarConfig
    return compareAvatars(targetAvatar, userAvatar, DEFAULT_MATCH_THRESHOLD)
  }, [post, userAvatar, hasValidAvatar])

  /**
   * Get primary match count for display
   */
  const primaryMatch = useMemo(() => {
    if (!hasValidAvatar || !userAvatar || !post?.target_avatar) {
      return null
    }

    const targetAvatar = post.target_avatar as AvatarConfig
    return getPrimaryMatchCount(targetAvatar, userAvatar)
  }, [post, userAvatar, hasValidAvatar])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    fetchPost(true)
  }, [fetchPost])

  /**
   * Handle retry on error
   */
  const handleRetry = useCallback(() => {
    fetchPost()
  }, [fetchPost])

  /**
   * Handle starting a chat with the post creator
   *
   * Uses the startConversation utility from lib/conversations.ts which:
   * - Validates that user isn't trying to chat with themselves
   * - Checks for existing conversation (returns it if found)
   * - Creates new conversation if none exists
   */
  const handleStartChat = useCallback(async () => {
    if (!post || !userId) {
      Alert.alert('Error', 'Unable to start chat. Please try again.')
      return
    }

    setStartingChat(true)

    const result = await startConversation(userId, {
      id: post.id,
      producer_id: post.producer_id,
    })

    setStartingChat(false)

    if (result.success && result.conversationId) {
      navigation.navigate('Chat', { conversationId: result.conversationId })
    } else {
      Alert.alert(
        'Error',
        result.error || 'Failed to start chat. Please try again later.'
      )
    }
  }, [post, userId, navigation])

  /**
   * Navigate to location ledger
   */
  const handleViewLocation = useCallback(() => {
    if (!post?.location) return

    navigation.navigate('Ledger', {
      locationId: post.location.id,
      locationName: post.location.name,
    })
  }, [post, navigation])

  /**
   * Handle blocking the post producer
   */
  const handleBlockUser = useCallback(async () => {
    if (!post || !userId || blocking) {
      return
    }

    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? You will no longer see their posts or be able to chat with them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setBlocking(true)

            const result = await blockUser(userId, post.producer_id)

            setBlocking(false)

            if (result.success) {
              Alert.alert(
                'User Blocked',
                'You will no longer see content from this user.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              )
            } else {
              Alert.alert(
                'Error',
                result.error || MODERATION_ERRORS.BLOCK_FAILED
              )
            }
          },
        },
      ]
    )
  }, [post, userId, blocking, navigation])

  // ---------------------------------------------------------------------------
  // RENDER: LOADING STATE
  // ---------------------------------------------------------------------------

  if (loading && !refreshing) {
    return (
      <View style={styles.centeredContainer} testID="post-detail-loading">
        <LoadingSpinner message="Loading post..." />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: ERROR STATE
  // ---------------------------------------------------------------------------

  if (error || !post) {
    return (
      <View style={styles.centeredContainer} testID="post-detail-error">
        <ErrorState
          title="Unable to Load Post"
          message={error || 'Post not found.'}
          onAction={handleRetry}
          actionLabel="Try Again"
        />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: POST DETAILS
  // ---------------------------------------------------------------------------

  const isOwnPost = post.producer_id === userId
  const showStartChat = !isOwnPost
  const showMatchIndicator = matchResult !== null && !isOwnPost

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
          testID="post-detail-refresh-control"
        />
      }
      testID="post-detail-screen"
    >
      {/* Avatar Section */}
      <View style={styles.avatarSection} testID="post-detail-avatar-section">
        <LargeAvatarPreview
          config={post.target_avatar as AvatarConfig}
          testID="post-detail-avatar"
        />

        {/* Match Badge */}
        {showMatchIndicator && matchResult && (
          <View
            style={[
              styles.matchBadge,
              { backgroundColor: getMatchColor(matchResult.score) },
            ]}
            testID="post-detail-match-badge"
          >
            <Text style={styles.matchBadgeText}>
              {matchResult.score}% Match
            </Text>
          </View>
        )}
      </View>

      {/* Match Details */}
      {showMatchIndicator && matchResult && (
        <View style={styles.matchSection} testID="post-detail-match-section">
          <Text
            style={[styles.matchTitle, { color: getMatchColor(matchResult.score) }]}
          >
            {getMatchLabel(matchResult.score)}
          </Text>
          {primaryMatch && (
            <Text style={styles.matchSubtitle}>
              {primaryMatch.matchCount} of {primaryMatch.total} key features match
            </Text>
          )}
        </View>
      )}

      {/* Note Section */}
      <View style={styles.noteSection} testID="post-detail-note-section">
        <Text style={styles.sectionLabel}>Message</Text>
        <View style={styles.noteCard}>
          <Text style={styles.noteText} testID="post-detail-note">
            {post.note}
          </Text>
        </View>
      </View>

      {/* Location Section */}
      {post.location && (
        <View style={styles.locationSection} testID="post-detail-location-section">
          <Text style={styles.sectionLabel}>Location</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationInfo}>
              <Text style={styles.locationIcon}>📍</Text>
              <View style={styles.locationText}>
                <Text style={styles.locationName} testID="post-detail-location-name">
                  {post.location.name}
                </Text>
                {post.location.address && (
                  <Text
                    style={styles.locationAddress}
                    numberOfLines={1}
                    testID="post-detail-location-address"
                  >
                    {post.location.address}
                  </Text>
                )}
              </View>
            </View>
            <OutlineButton
              title="View All Posts"
              onPress={handleViewLocation}
              size="small"
              testID="post-detail-view-location"
            />
          </View>
        </View>
      )}

      {/* Timestamp Section */}
      <View style={styles.timestampSection} testID="post-detail-timestamp-section">
        <Text style={styles.timestampText} testID="post-detail-timestamp">
          Posted {formatRelativeTime(post.created_at)}
        </Text>
        {post.expires_at && (
          <Text style={styles.expiresText}>
            Expires {formatRelativeTime(post.expires_at)}
          </Text>
        )}
      </View>

      {/* Own Post Indicator */}
      {isOwnPost && (
        <View style={styles.ownPostBanner} testID="post-detail-own-post-banner">
          <Text style={styles.ownPostText}>
            This is your post
          </Text>
        </View>
      )}

      {/* Action Section */}
      {showStartChat && (
        <View style={styles.actionSection} testID="post-detail-action-section">
          <Button
            title={startingChat ? 'Starting Chat...' : 'Start Chat'}
            onPress={handleStartChat}
            loading={startingChat}
            disabled={startingChat || blocking}
            testID="post-detail-start-chat"
          />
          {matchResult?.isMatch && (
            <Text style={styles.matchHint}>
              You appear to match this description!
            </Text>
          )}
          {!hasValidAvatar && (
            <Text style={styles.avatarHint}>
              Create your avatar in Profile to see if you match!
            </Text>
          )}
          <View style={styles.blockSection}>
            <Button
              title={blocking ? 'Blocking...' : 'Block User'}
              onPress={handleBlockUser}
              loading={blocking}
              disabled={blocking || startingChat}
              variant="outline"
              size="small"
              testID="post-detail-block-user"
              textStyle={styles.blockButtonText}
            />
          </View>
        </View>
      )}
    </ScrollView>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  matchBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  matchBadgeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Match Section
  matchSection: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
  },
  matchTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  matchSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // Note Section
  noteSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  noteCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  noteText: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textPrimary,
  },

  // Location Section
  locationSection: {
    marginBottom: 20,
  },
  locationCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  locationText: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // Timestamp Section
  timestampSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timestampText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  expiresText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 4,
  },

  // Own Post Banner
  ownPostBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  ownPostText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.warning,
  },

  // Action Section
  actionSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  matchHint: {
    textAlign: 'center',
    fontSize: 14,
    color: COLORS.success,
    marginTop: 12,
    fontWeight: '500',
  },
  avatarHint: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 12,
    fontStyle: 'italic',
  },
  blockSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  blockButtonText: {
    color: '#FF3B30', // iOS red for destructive action
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default PostDetailScreen
