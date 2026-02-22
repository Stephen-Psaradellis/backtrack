/**
 * PostReactions Component
 *
 * Displays reaction buttons for posts where users can react with predefined types.
 * Features:
 * - Three reaction types: "That was me!", "Great description!", "I saw them too!"
 * - Shows reaction counts
 * - Toggle reactions on/off with press
 * - Animated press effects
 * - Haptic feedback
 * - Optimistic UI updates
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { supabase } from '../lib/supabase'
import { darkTheme } from '../constants/glassStyles'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Reaction type options
 */
export type ReactionType = 'thats_me' | 'great_description' | 'saw_them_too'

/**
 * Reaction configuration
 */
interface ReactionConfig {
  type: ReactionType
  label: string
  emoji: string
}

/**
 * Reaction count data from database
 */
interface ReactionData {
  reaction_type: ReactionType
  count: number
  user_reacted: boolean
}

/**
 * Props for PostReactions component
 */
export interface PostReactionsProps {
  /** Post ID to fetch/toggle reactions for */
  postId: string
  /** Current user ID (from auth context) */
  userId: string | null
  /** Additional container style */
  style?: ViewStyle
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Available reaction types with their labels and emojis
 */
const REACTIONS: ReactionConfig[] = [
  { type: 'thats_me', label: 'That was me!', emoji: '👋' },
  { type: 'great_description', label: 'Great description!', emoji: '✨' },
  { type: 'saw_them_too', label: 'I saw them too!', emoji: '👀' },
]

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PostReactions displays reaction buttons for a post
 */
export function PostReactions({
  postId,
  userId,
  style,
  testID = 'post-reactions',
}: PostReactionsProps) {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [reactions, setReactions] = useState<Map<ReactionType, ReactionData>>(
    new Map()
  )
  const [loading, setLoading] = useState(false)
  const [scaleAnimations] = useState(
    () => new Map(REACTIONS.map(r => [r.type, new Animated.Value(1)]))
  )

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Load reactions on mount and when postId changes
  useEffect(() => {
    loadReactions()
  }, [postId, userId])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Load reaction counts and user's reaction status from database
   */
  const loadReactions = useCallback(async () => {
    try {
      // Query all reactions for this post
      const { data, error } = await supabase
        .from('post_reactions')
        .select('reaction_type, user_id')
        .eq('post_id', postId)

      if (error) {
        console.error('Error loading reactions:', error)
        return
      }

      // Aggregate counts and check if current user has reacted
      const reactionMap = new Map<ReactionType, ReactionData>()

      REACTIONS.forEach(({ type }) => {
        const typeReactions = data?.filter(r => r.reaction_type === type) || []
        reactionMap.set(type, {
          reaction_type: type,
          count: typeReactions.length,
          user_reacted: userId
            ? typeReactions.some(r => r.user_id === userId)
            : false,
        })
      })

      setReactions(reactionMap)
    } catch (err) {
      console.error('Error loading reactions:', err)
    }
  }, [postId, userId])

  /**
   * Toggle a reaction on/off
   */
  const toggleReaction = useCallback(
    async (reactionType: ReactionType) => {
      if (!userId || loading) return

      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

      // Animate button press
      const animation = scaleAnimations.get(reactionType)
      if (animation) {
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(animation, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start()
      }

      setLoading(true)

      try {
        const currentReaction = reactions.get(reactionType)
        const userReacted = currentReaction?.user_reacted || false

        // Optimistically update UI
        const newReactions = new Map(reactions)
        newReactions.set(reactionType, {
          reaction_type: reactionType,
          count: userReacted
            ? (currentReaction?.count || 1) - 1
            : (currentReaction?.count || 0) + 1,
          user_reacted: !userReacted,
        })
        setReactions(newReactions)

        if (userReacted) {
          // Remove reaction
          const { error } = await supabase
            .from('post_reactions')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', userId)
            .eq('reaction_type', reactionType)

          if (error) {
            console.error('Error removing reaction:', error)
            // Revert optimistic update
            setReactions(reactions)
          }
        } else {
          // Add reaction
          const { error } = await supabase.from('post_reactions').insert({
            post_id: postId,
            user_id: userId,
            reaction_type: reactionType,
          })

          if (error) {
            console.error('Error adding reaction:', error)
            // Revert optimistic update
            setReactions(reactions)
          }
        }
      } catch (err) {
        console.error('Error toggling reaction:', err)
        // Revert optimistic update on error
        setReactions(reactions)
      } finally {
        setLoading(false)
      }
    },
    [postId, userId, reactions, loading, scaleAnimations]
  )

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (!userId) {
    // Don't show reactions if user is not authenticated
    return null
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {REACTIONS.map(({ type, label, emoji }) => {
        const reactionData = reactions.get(type)
        const count = reactionData?.count || 0
        const isActive = reactionData?.user_reacted || false
        const scaleAnimation = scaleAnimations.get(type)

        return (
          <Animated.View
            key={type}
            style={[
              { transform: [{ scale: scaleAnimation || 1 }] },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.reactionButton,
                isActive && styles.reactionButtonActive,
              ]}
              onPress={() => toggleReaction(type)}
              disabled={loading}
              activeOpacity={0.7}
              testID={`${testID}-${type}`}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${label}${count > 0 ? `, ${count} ${count === 1 ? 'person reacted' : 'people reacted'}` : ''}`}
              accessibilityState={{ selected: isActive }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.emoji}>{emoji}</Text>
              <Text
                style={[styles.label, isActive && styles.labelActive]}
                numberOfLines={1}
              >
                {label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.countBadge,
                    isActive && styles.countBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      isActive && styles.countTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        )
      })}
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },

  // Reaction button
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: darkTheme.surfaceElevated,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
    gap: 6,
  },
  reactionButtonActive: {
    backgroundColor: `${darkTheme.primary}20`,
    borderColor: darkTheme.primary,
  },

  // Emoji
  emoji: {
    fontSize: 16,
  },

  // Label
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: darkTheme.textSecondary,
  },
  labelActive: {
    color: darkTheme.primary,
    fontWeight: '600',
  },

  // Count badge
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: darkTheme.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countBadgeActive: {
    backgroundColor: darkTheme.primary,
  },

  // Count text
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: darkTheme.textSecondary,
  },
  countTextActive: {
    color: '#FFFFFF',
  },
})
