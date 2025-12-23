/**
 * CreatePost Shared Styles
 *
 * Common styles used across multiple steps in the CreatePost wizard.
 * These styles provide consistent visual hierarchy and layout for:
 * - Container and layout styles
 * - Header and navigation styles
 * - Progress bar styles
 * - Common action button layouts
 *
 * Step-specific styles remain co-located with their respective components.
 */

import { StyleSheet, Platform, Dimensions } from 'react-native'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Screen dimensions
 */
export const SCREEN_WIDTH = Dimensions.get('window').width

/**
 * Common colors used throughout the CreatePost flow
 */
export const COLORS = {
  /** Primary brand color */
  primary: '#007AFF',
  /** Background color for screens */
  background: '#FFFFFF',
  /** Secondary background (cards, inputs) */
  backgroundSecondary: '#F2F2F7',
  /** Border and divider color */
  border: '#E5E5EA',
  /** Primary text color */
  textPrimary: '#000000',
  /** Secondary/muted text color */
  textSecondary: '#8E8E93',
  /** Error/danger color */
  error: '#FF3B30',
  /** Full screen background (camera, etc.) */
  fullScreenBackground: '#000000',
} as const

// ============================================================================
// SHARED STYLES
// ============================================================================

export const sharedStyles = StyleSheet.create({
  // ---------------------------------------------------------------------------
  // Container Styles
  // ---------------------------------------------------------------------------

  /**
   * Main container for standard steps with header and progress bar
   */
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /**
   * Full screen container for camera and avatar builder steps
   */
  fullScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.fullScreenBackground,
  },

  /**
   * Container for loading/submitting state
   */
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /**
   * Main content area below header and progress bar
   */
  content: {
    flex: 1,
  },

  /**
   * Scrollable content with standard padding
   */
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // ---------------------------------------------------------------------------
  // Header Styles
  // ---------------------------------------------------------------------------

  /**
   * Header container with back button and step indicator
   */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  /**
   * Back button in header
   */
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  /**
   * Back button text/icon
   */
  headerBackText: {
    fontSize: 22,
    color: COLORS.primary,
    fontWeight: '400',
  },

  /**
   * Step indicator container (icon + text)
   */
  stepIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  /**
   * Step icon (emoji)
   */
  stepIcon: {
    fontSize: 28,
    marginRight: 12,
  },

  /**
   * Container for step title and subtitle
   */
  stepTextContainer: {
    flex: 1,
  },

  /**
   * Step title text
   */
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },

  /**
   * Step subtitle/description text
   */
  stepSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // ---------------------------------------------------------------------------
  // Progress Bar Styles
  // ---------------------------------------------------------------------------

  /**
   * Container for progress bar and step counter
   */
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },

  /**
   * Progress bar track (background)
   */
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },

  /**
   * Progress bar fill (animated)
   */
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  /**
   * Step counter text (e.g., "Step 2 of 5")
   */
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // ---------------------------------------------------------------------------
  // Action Button Styles
  // ---------------------------------------------------------------------------

  /**
   * Container for step navigation buttons (Back/Next)
   * Used in note, location, and other steps
   */
  stepActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },

  /**
   * Container for action buttons at bottom of step
   * With border separator from content above
   */
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  /**
   * Submit/final action container with spacing
   */
  submitContainer: {
    gap: 12,
    marginTop: 8,
  },

  // ---------------------------------------------------------------------------
  // Card/Section Styles
  // ---------------------------------------------------------------------------

  /**
   * Standard card/section container
   */
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  /**
   * Section header with title and optional action
   */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  /**
   * Section title text (uppercase, muted)
   */
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // ---------------------------------------------------------------------------
  // Edit Button Styles
  // ---------------------------------------------------------------------------

  /**
   * Small edit button (used in review step)
   */
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
  },

  /**
   * Edit button text
   */
  editButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // ---------------------------------------------------------------------------
  // Step Content Container Styles
  // ---------------------------------------------------------------------------

  /**
   * Container for steps with secondary background (note, location, review)
   */
  stepContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default sharedStyles
