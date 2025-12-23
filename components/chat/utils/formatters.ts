/**
 * Chat Formatting Utilities
 * Functions for formatting timestamps and date-related display text
 */

/**
 * Formats a message timestamp for display
 * Shows time only for today, day + time for this week, full date otherwise
 *
 * @param timestamp - ISO timestamp string
 * @returns Formatted time string
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return `Yesterday ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } else {
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

/**
 * Formats a user's last seen timestamp for display
 *
 * @param timestamp - ISO timestamp string or null if never online
 * @returns Human-readable last seen text
 */
export function formatLastSeen(timestamp: string | null): string {
  if (!timestamp) return 'Offline'

  const date = new Date(timestamp)
  const now = new Date()
  const diffMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  )

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/**
 * Determines if a date separator should be shown before the current message
 *
 * @param currentTimestamp - Current message timestamp
 * @param previousTimestamp - Previous message timestamp, or null if first message
 * @returns True if a date separator should be displayed
 */
export function shouldShowDateSeparator(
  currentTimestamp: string,
  previousTimestamp: string | null
): boolean {
  if (!previousTimestamp) return true

  const currentDate = new Date(currentTimestamp).toDateString()
  const previousDate = new Date(previousTimestamp).toDateString()

  return currentDate !== previousDate
}

/**
 * Gets the text to display in a date separator
 *
 * @param timestamp - ISO timestamp string
 * @returns Date separator text (e.g., "Today", "Yesterday", or full date)
 */
export function getDateSeparatorText(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Generates a unique ID for optimistic messages
 *
 * @returns A unique string ID prefixed with "optimistic-"
 */
export function generateOptimisticId(): string {
  return `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
