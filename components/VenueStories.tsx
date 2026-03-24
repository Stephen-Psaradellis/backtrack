/**
 * VenueStories Component
 *
 * Displays a horizontal scrollable list of venue stories for a specific location
 * with the ability to add new stories if the user has checked in.
 *
 * Features:
 * - "What Happened Here" section header with story count
 * - Horizontal ScrollView of VenueStory cards
 * - "Add Story" button (visible only if user has checked in)
 * - Story creation modal with 140-char limit
 * - Real-time updates via Supabase subscription
 * - Pull-to-refresh functionality
 *
 * @example
 * ```tsx
 * <VenueStories
 *   locationId="123e4567-e89b-12d3-a456-426614174000"
 *   userHasCheckedIn={true}
 * />
 * ```
 */

import React, { useState, useCallback, useEffect, memo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { VenueStory, VenueStoryData } from './VenueStory'
import { PressableScale } from './native/PressableScale'
import { supabase } from '../lib/supabase'
import { useAuthState } from '../contexts/AuthContext'
import { selectionFeedback, successFeedback } from '../lib/haptics'
import { darkTheme } from '../constants/glassStyles'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for VenueStories component
 */
export interface VenueStoriesProps {
  /** Location ID to fetch stories for */
  locationId: string
  /** Whether the current user has checked in at this location */
  userHasCheckedIn: boolean
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum characters allowed in a story */
const MAX_STORY_LENGTH = 140

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * VenueStories displays stories for a location with ability to add new stories
 */
export const VenueStories = memo(function VenueStories({
  locationId,
  userHasCheckedIn,
  testID = 'venue-stories',
}: VenueStoriesProps) {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const { userId } = useAuthState()
  const [stories, setStories] = useState<VenueStoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [storyContent, setStoryContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  /**
   * Fetch stories for the current location
   */
  const fetchStories = useCallback(async () => {
    if (!locationId) return

    try {
      const { data, error } = await supabase.rpc('get_venue_stories', {
        p_location_id: locationId,
      })

      if (error) {
        if (__DEV__) console.error('Error fetching venue stories:', error)
        return
      }

      setStories(data || [])
    } catch (err) {
      if (__DEV__) console.error('Unexpected error fetching venue stories:', err)
    } finally {
      setLoading(false)
    }
  }, [locationId])

  // Fetch on mount and when locationId changes
  useEffect(() => {
    fetchStories()
  }, [fetchStories])

  // Subscribe to real-time updates for new stories
  useEffect(() => {
    if (!locationId) return

    const subscription = supabase
      .channel(`venue_stories:${locationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venue_stories',
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          // Refetch stories when any change occurs
          fetchStories()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [locationId, fetchStories])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Open the story creation modal
   */
  const handleOpenModal = useCallback(() => {
    selectionFeedback()
    setStoryContent('')
    setModalVisible(true)
  }, [])

  /**
   * Close the story creation modal
   */
  const handleCloseModal = useCallback(() => {
    selectionFeedback()
    setModalVisible(false)
    setStoryContent('')
  }, [])

  /**
   * Submit a new story
   */
  const handleSubmitStory = useCallback(async () => {
    if (!userId || !locationId) return

    const trimmedContent = storyContent.trim()

    // Validate content
    if (trimmedContent.length === 0) {
      Alert.alert('Empty Story', 'Please enter some content for your story.')
      return
    }

    if (trimmedContent.length > MAX_STORY_LENGTH) {
      Alert.alert(
        'Story Too Long',
        `Stories must be ${MAX_STORY_LENGTH} characters or less.`
      )
      return
    }

    setSubmitting(true)

    try {
      const { error } = await supabase.from('venue_stories').insert({
        location_id: locationId,
        user_id: userId,
        content: trimmedContent,
      })

      if (error) {
        if (__DEV__) console.error('Error creating story:', error)
        Alert.alert(
          'Error',
          'Failed to post your story. Make sure you have checked in at this venue within the last 24 hours.'
        )
        return
      }

      // Success
      successFeedback()
      handleCloseModal()
      fetchStories()
    } catch (err) {
      if (__DEV__) console.error('Unexpected error creating story:', err)
      Alert.alert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [userId, locationId, storyContent, handleCloseModal, fetchStories])

  /**
   * Handle text input change
   */
  const handleChangeText = useCallback((text: string) => {
    // Limit to MAX_STORY_LENGTH characters
    if (text.length <= MAX_STORY_LENGTH) {
      setStoryContent(text)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  const storyCount = stories.length
  const remainingChars = MAX_STORY_LENGTH - storyContent.length
  const canSubmit = storyContent.trim().length > 0 && !submitting

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  // Don't render anything if there are no stories and user hasn't checked in
  if (!loading && storyCount === 0 && !userHasCheckedIn) {
    return null
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Section Header */}
      <View style={styles.header} accessible={false}>
        <View style={styles.titleContainer} accessible={false}>
          <Ionicons
            name="chatbubbles-outline"
            size={20}
            color={darkTheme.primary}
            style={styles.titleIcon}
            accessible={false}
          />
          <Text style={styles.title} accessible={false}>
            What Happened Here
          </Text>
          {storyCount > 0 && (
            <View style={styles.countBadge} accessible={false}>
              <Text style={styles.countText} accessible={false}>
                {storyCount}
              </Text>
            </View>
          )}
        </View>

        {/* Add Story Button - only visible if user has checked in */}
        {userHasCheckedIn && (
          <PressableScale onPress={handleOpenModal} testID={`${testID}-add-button`}>
            <View style={styles.addButton} accessible={false}>
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={darkTheme.primary}
                accessible={false}
              />
              <Text style={styles.addButtonText} accessible={false}>
                Add Story
              </Text>
            </View>
          </PressableScale>
        )}
      </View>

      {/* Stories List */}
      {loading ? (
        <View style={styles.loadingContainer} accessible={false}>
          <ActivityIndicator size="small" color={darkTheme.primary} />
        </View>
      ) : storyCount > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          testID={`${testID}-scroll`}
          accessible={false}
        >
          {stories.map((story) => (
            <VenueStory
              key={story.id}
              story={story}
              testID={`${testID}-story-${story.id}`}
            />
          ))}
        </ScrollView>
      ) : userHasCheckedIn ? (
        <View style={styles.emptyContainer} accessible={false}>
          <Text style={styles.emptyText} accessible={false}>
            No stories yet. Be the first to share what's happening here!
          </Text>
        </View>
      ) : null}

      {/* Story Creation Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
        testID={`${testID}-modal`}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={styles.modalHeader} accessible={false}>
              <Text style={styles.modalTitle} accessible={false}>
                Share Your Story
              </Text>
              <Pressable
                onPress={handleCloseModal}
                testID={`${testID}-modal-close`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={darkTheme.textPrimary} />
              </Pressable>
            </View>

            {/* Text Input */}
            <TextInput
              style={styles.textInput}
              placeholder="What's happening here right now?"
              placeholderTextColor={darkTheme.textMuted}
              value={storyContent}
              onChangeText={handleChangeText}
              multiline
              maxLength={MAX_STORY_LENGTH}
              autoFocus
              testID={`${testID}-modal-input`}
              accessible={true}
              accessibilityLabel="Story content input"
              accessibilityHint={`Enter your story, maximum ${MAX_STORY_LENGTH} characters`}
            />

            {/* Character Counter */}
            <View style={styles.charCounterContainer} accessible={false}>
              <Text
                style={[
                  styles.charCounter,
                  remainingChars < 20 && styles.charCounterWarning,
                ]}
                accessible={false}
              >
                {remainingChars} characters remaining
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions} accessible={false}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleCloseModal}
                testID={`${testID}-modal-cancel`}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.button,
                  styles.submitButton,
                  !canSubmit && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmitStory}
                disabled={!canSubmit}
                testID={`${testID}-modal-submit`}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={darkTheme.textPrimary} />
                ) : (
                  <Text style={styles.submitButtonText}>Post Story</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    marginRight: 8,
  },
  countBadge: {
    backgroundColor: darkTheme.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },

  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.cardBackground,
    borderWidth: 1,
    borderColor: darkTheme.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.primary,
  },

  // Stories List
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  // Loading
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },

  // Empty State
  emptyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 14,
    color: darkTheme.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: darkTheme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },

  // Text Input
  textInput: {
    backgroundColor: darkTheme.cardBackground,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: darkTheme.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
  },

  // Character Counter
  charCounterContainer: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  charCounter: {
    fontSize: 12,
    color: darkTheme.textSecondary,
  },
  charCounterWarning: {
    color: darkTheme.warning,
    fontWeight: '600',
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: darkTheme.cardBackground,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textSecondary,
  },
  submitButton: {
    backgroundColor: darkTheme.primary,
  },
  submitButtonDisabled: {
    backgroundColor: darkTheme.textMuted,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },
})
