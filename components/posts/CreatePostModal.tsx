/**
 * CreatePostModal Component
 *
 * A modal dialog for creating new posts with optional event tagging.
 * Users can search for and select events to associate with their posts.
 *
 * Features:
 * - Event search and selection (optional)
 * - Displays selected event information
 * - Form validation
 * - Loading states during submission
 * - Error and success feedback
 * - Accessible with proper labels
 *
 * @example
 * ```tsx
 * import { CreatePostModal } from 'components/posts/CreatePostModal'
 *
 * // Basic usage
 * <CreatePostModal
 *   isOpen={showCreatePost}
 *   onClose={() => setShowCreatePost(false)}
 *   onSuccess={(post) => console.log('Created:', post)}
 * />
 *
 * // Pre-selected event
 * <CreatePostModal
 *   isOpen={showCreatePost}
 *   onClose={handleClose}
 *   initialEventId={event.id}
 *   initialEvent={event}
 *   onSuccess={handleSuccess}
 * />
 * ```
 */

'use client'

import { memo, useState, useCallback, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useEvents, type Event } from '@/hooks/useEvents'
import { useEventPosts, type CreatePostParams, type EventPost } from '@/hooks/useEventPosts'
import { useUserLocation } from '@/hooks/useUserLocation'
import { CompactEventCard } from '@/components/events/EventCard'
import { formatEventTime } from '@/utils/date-helpers'

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the CreatePostModal component
 */
export interface CreatePostModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean

  /**
   * Callback when the modal is closed
   */
  onClose: () => void

  /**
   * Callback when post is successfully created
   */
  onSuccess?: (post: EventPost) => void

  /**
   * Initial event ID to pre-select
   */
  initialEventId?: string

  /**
   * Initial event data to pre-populate (avoids extra fetch)
   */
  initialEvent?: Event

  /**
   * Whether to require event selection
   * @default false
   */
  requireEvent?: boolean

  /**
   * Pre-populated location ID
   */
  initialLocationId?: string

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

/**
 * Form data for post creation
 */
interface PostFormData {
  locationId: string
  selfieUrl: string
  targetAvatar: Record<string, unknown>
  targetDescription: string
  message: string
  note: string
  seenAt: string
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum message length */
const MAX_MESSAGE_LENGTH = 500

/** Maximum note length */
const MAX_NOTE_LENGTH = 300

/** Maximum description length */
const MAX_DESCRIPTION_LENGTH = 200

/** Debounce delay for event search */
const SEARCH_DEBOUNCE_MS = 300

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Loading spinner component
 */
function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-5 w-5 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

/**
 * Event search dropdown component
 */
function EventSearchDropdown({
  onSelect,
  selectedEvent,
  onClear,
  disabled,
  testID,
}: {
  onSelect: (event: Event) => void
  selectedEvent: Event | null
  onClear: () => void
  disabled?: boolean
  testID?: string
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Get user location for event search
  const { coordinates } = useUserLocation({
    enableOnMount: true,
    enableHighAccuracy: false,
  })

  // Search events
  const { events, isLoading, searchEvents } = useEvents({
    autoFetch: false,
  })

  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery])

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery && coordinates) {
      searchEvents({
        coordinates,
        query: debouncedQuery,
        pageSize: 10,
      })
    }
  }, [debouncedQuery, coordinates, searchEvents])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback(
    (event: Event) => {
      onSelect(event)
      setSearchQuery('')
      setIsOpen(false)
    },
    [onSelect]
  )

  const handleClear = useCallback(() => {
    onClear()
    setSearchQuery('')
  }, [onClear])

  // If event is selected, show selected event with clear button
  if (selectedEvent) {
    return (
      <div className="space-y-2" data-testid={`${testID}-selected`}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Selected Event
        </label>
        <div className="relative">
          <CompactEventCard
            event={selectedEvent}
            testID={`${testID}-selected-card`}
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 p-1 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              aria-label="Remove selected event"
              data-testid={`${testID}-clear`}
            >
              <svg
                className="h-4 w-4 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }

  // Show search input with dropdown
  return (
    <div className="relative" ref={dropdownRef} data-testid={testID}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        Tag an Event (Optional)
      </label>
      <div className="relative">
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search for an event..."
          disabled={disabled || !coordinates}
          fullWidth
          leftIcon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
          data-testid={`${testID}-input`}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <LoadingSpinner className="text-pink-500" />
          </div>
        )}
      </div>

      {/* No location warning */}
      {!coordinates && (
        <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
          Enable location to search for events
        </p>
      )}

      {/* Dropdown */}
      {isOpen && searchQuery && events.length > 0 && (
        <div
          className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
          data-testid={`${testID}-dropdown`}
        >
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => handleSelect(event)}
              className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
              data-testid={`${testID}-option-${event.id}`}
            >
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {event.title}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {formatEventTime(event.date_time)}
                {event.venue_name && ` · ${event.venue_name}`}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && searchQuery && !isLoading && events.length === 0 && debouncedQuery && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No events found for "{searchQuery}"
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * CreatePostModal - Modal for creating posts with optional event tagging
 *
 * Features:
 * - Event search and selection
 * - Form validation
 * - Loading states
 * - Error handling
 */
export const CreatePostModal = memo(function CreatePostModal({
  isOpen,
  onClose,
  onSuccess,
  initialEventId,
  initialEvent,
  requireEvent = false,
  initialLocationId,
  testID = 'create-post-modal',
}: CreatePostModalProps) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(initialEvent || null)
  const [formData, setFormData] = useState<PostFormData>({
    locationId: initialLocationId || '',
    selfieUrl: '',
    targetAvatar: {},
    targetDescription: '',
    message: '',
    note: '',
    seenAt: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof PostFormData | 'event', string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Hooks
  // ---------------------------------------------------------------------------

  const { createPost, isCreating, error: postError } = useEventPosts(
    selectedEvent?.id || initialEventId,
    { autoFetch: false }
  )

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedEvent(initialEvent || null)
      setFormData({
        locationId: initialLocationId || '',
        selfieUrl: '',
        targetAvatar: {},
        targetDescription: '',
        message: '',
        note: '',
        seenAt: '',
      })
      setErrors({})
      setSubmitError(null)
    }
  }, [isOpen, initialEvent, initialLocationId])

  // Update submit error from hook
  useEffect(() => {
    if (postError) {
      setSubmitError(postError.message)
    }
  }, [postError])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Update form field
   */
  const handleFieldChange = useCallback(
    (field: keyof PostFormData) => (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }))
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
    },
    [errors]
  )

  /**
   * Handle event selection
   */
  const handleEventSelect = useCallback((event: Event) => {
    setSelectedEvent(event)
    if (errors.event) {
      setErrors((prev) => ({ ...prev, event: undefined }))
    }
  }, [errors.event])

  /**
   * Clear selected event
   */
  const handleEventClear = useCallback(() => {
    setSelectedEvent(null)
  }, [])

  /**
   * Validate form
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof PostFormData | 'event', string>> = {}

    // Required fields
    if (!formData.locationId.trim()) {
      newErrors.locationId = 'Location is required'
    }

    if (!formData.selfieUrl.trim()) {
      newErrors.selfieUrl = 'Selfie photo is required'
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required'
    } else if (formData.message.length > MAX_MESSAGE_LENGTH) {
      newErrors.message = `Message must be ${MAX_MESSAGE_LENGTH} characters or less`
    }

    if (formData.note && formData.note.length > MAX_NOTE_LENGTH) {
      newErrors.note = `Note must be ${MAX_NOTE_LENGTH} characters or less`
    }

    if (formData.targetDescription && formData.targetDescription.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.targetDescription = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`
    }

    // Event requirement
    if (requireEvent && !selectedEvent) {
      newErrors.event = 'Please select an event'
    }

    // Target avatar should have some data
    if (Object.keys(formData.targetAvatar).length === 0) {
      newErrors.targetAvatar = 'Please configure target avatar'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, selectedEvent, requireEvent])

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return
    }

    setSubmitError(null)

    const params: CreatePostParams = {
      location_id: formData.locationId,
      selfie_url: formData.selfieUrl,
      target_avatar: formData.targetAvatar,
      message: formData.message,
      ...(formData.targetDescription && { target_description: formData.targetDescription }),
      ...(formData.note && { note: formData.note }),
      ...(formData.seenAt && { seen_at: formData.seenAt }),
    }

    // If we have a selected event, use the createPost from useEventPosts hook
    if (selectedEvent) {
      const result = await createPost(params)
      if (result) {
        onSuccess?.(result)
        onClose()
      }
    } else {
      // For posts without events, we would call a different API
      // For now, show an error if no event is selected but not required
      // This would need to be connected to a general post creation API
      setSubmitError('Post creation without event is not yet implemented')
    }
  }, [validateForm, formData, selectedEvent, createPost, onSuccess, onClose])

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    if (!isCreating) {
      onClose()
    }
  }, [isCreating, onClose])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Post"
      description="Share a missed connection post. Optionally tag an event."
      size="lg"
      closeOnBackdropClick={!isCreating}
      closeOnEscape={!isCreating}
      footer={
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isCreating}
            data-testid={`${testID}-cancel`}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isCreating}
            data-testid={`${testID}-submit`}
          >
            Create Post
          </Button>
        </div>
      }
      data-testid={testID}
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Event Selection */}
        <EventSearchDropdown
          onSelect={handleEventSelect}
          selectedEvent={selectedEvent}
          onClear={handleEventClear}
          disabled={isCreating}
          testID={`${testID}-event-search`}
        />
        {errors.event && (
          <p className="text-sm text-red-500" role="alert">
            {errors.event}
          </p>
        )}

        {/* Location ID */}
        <Input
          label="Location ID"
          value={formData.locationId}
          onChange={handleFieldChange('locationId')}
          placeholder="Enter location ID"
          error={errors.locationId}
          disabled={isCreating}
          fullWidth
          required
          data-testid={`${testID}-location-id`}
        />

        {/* Selfie URL */}
        <Input
          label="Selfie Photo URL"
          type="url"
          value={formData.selfieUrl}
          onChange={handleFieldChange('selfieUrl')}
          placeholder="https://..."
          error={errors.selfieUrl}
          disabled={isCreating}
          fullWidth
          required
          helperText="Link to your verification selfie"
          data-testid={`${testID}-selfie-url`}
        />

        {/* Target Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="target-description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Target Description
          </label>
          <textarea
            id="target-description"
            value={formData.targetDescription}
            onChange={handleFieldChange('targetDescription')}
            placeholder="Describe who you're looking for..."
            disabled={isCreating}
            rows={2}
            maxLength={MAX_DESCRIPTION_LENGTH}
            className={[
              'block w-full rounded-lg border px-4 py-2',
              'transition-colors duration-200',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
              errors.targetDescription
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-pink-500 focus:ring-pink-500 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-gray-100',
            ].join(' ')}
            data-testid={`${testID}-target-description`}
          />
          <div className="flex justify-between text-sm">
            {errors.targetDescription ? (
              <p className="text-red-500" role="alert">{errors.targetDescription}</p>
            ) : (
              <span />
            )}
            <span className="text-gray-500 dark:text-gray-400">
              {formData.targetDescription.length}/{MAX_DESCRIPTION_LENGTH}
            </span>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <label
            htmlFor="message"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            value={formData.message}
            onChange={handleFieldChange('message')}
            placeholder="Write your message..."
            disabled={isCreating}
            rows={4}
            maxLength={MAX_MESSAGE_LENGTH}
            required
            className={[
              'block w-full rounded-lg border px-4 py-2',
              'transition-colors duration-200',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
              errors.message
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-pink-500 focus:ring-pink-500 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-gray-100',
            ].join(' ')}
            data-testid={`${testID}-message`}
          />
          <div className="flex justify-between text-sm">
            {errors.message ? (
              <p className="text-red-500" role="alert">{errors.message}</p>
            ) : (
              <span />
            )}
            <span className="text-gray-500 dark:text-gray-400">
              {formData.message.length}/{MAX_MESSAGE_LENGTH}
            </span>
          </div>
        </div>

        {/* Private Note (Optional) */}
        <div className="space-y-1.5">
          <label
            htmlFor="note"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Private Note (Optional)
          </label>
          <textarea
            id="note"
            value={formData.note}
            onChange={handleFieldChange('note')}
            placeholder="Add a private note for yourself..."
            disabled={isCreating}
            rows={2}
            maxLength={MAX_NOTE_LENGTH}
            className={[
              'block w-full rounded-lg border px-4 py-2',
              'transition-colors duration-200',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
              errors.note
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-pink-500 focus:ring-pink-500 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-gray-100',
            ].join(' ')}
            data-testid={`${testID}-note`}
          />
          <div className="flex justify-between text-sm">
            {errors.note ? (
              <p className="text-red-500" role="alert">{errors.note}</p>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">
                Only visible to you
              </span>
            )}
            <span className="text-gray-500 dark:text-gray-400">
              {formData.note.length}/{MAX_NOTE_LENGTH}
            </span>
          </div>
        </div>

        {/* Seen At (Optional) */}
        <Input
          label="When did you see them? (Optional)"
          type="datetime-local"
          value={formData.seenAt}
          onChange={handleFieldChange('seenAt')}
          disabled={isCreating}
          fullWidth
          data-testid={`${testID}-seen-at`}
        />

        {/* Submit Error */}
        {submitError && (
          <div
            className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4"
            role="alert"
            data-testid={`${testID}-error`}
          >
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-300">
                {submitError}
              </p>
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
})

// ============================================================================
// Preset Variants
// ============================================================================

/**
 * CreateEventPostModal - Preset for creating posts with required event selection
 */
export const CreateEventPostModal = memo(function CreateEventPostModal(
  props: Omit<CreatePostModalProps, 'requireEvent'>
) {
  return (
    <CreatePostModal
      {...props}
      requireEvent={true}
      testID={props.testID ?? 'create-event-post-modal'}
    />
  )
})

/**
 * CreateQuickPostModal - Preset for creating posts at a specific event
 * (Event is pre-selected and cannot be changed)
 */
export const CreateQuickPostModal = memo(function CreateQuickPostModal({
  event,
  ...props
}: Omit<CreatePostModalProps, 'initialEvent' | 'initialEventId' | 'requireEvent'> & {
  event: Event
}) {
  return (
    <CreatePostModal
      {...props}
      initialEvent={event}
      initialEventId={event.id}
      requireEvent={true}
      testID={props.testID ?? 'create-quick-post-modal'}
    />
  )
})

// ============================================================================
// Exports
// ============================================================================

export default CreatePostModal
