'use client'

/**
 * UserPresenceIndicator Component
 *
 * Displays a user's online/offline status with visual indicators.
 * Features:
 * - Green dot for online status
 * - Gray dot with "last seen" text for offline status
 * - Accessible with proper ARIA attributes
 * - Uses formatLastSeen utility for human-readable timestamps
 * - Memoized for performance
 *
 * @example
 * ```tsx
 * <UserPresenceIndicator isOnline={true} lastSeen={null} />
 * <UserPresenceIndicator isOnline={false} lastSeen="2024-01-15T10:30:00Z" />
 * ```
 */

import React, { memo } from 'react'
import type { UserPresenceIndicatorProps } from '../../types/chat'
import { formatLastSeen } from './utils/formatters'
import styles from './styles/ChatScreen.module.css'

/**
 * UserPresenceIndicator displays online/offline status
 *
 * @param isOnline - Whether the user is currently online
 * @param lastSeen - ISO timestamp of when the user was last seen (for offline status)
 */
function UserPresenceIndicatorComponent({
  isOnline,
  lastSeen,
}: UserPresenceIndicatorProps) {
  const statusText = isOnline ? 'Online' : formatLastSeen(lastSeen)
  const dotClass = isOnline
    ? `${styles.presenceDot} ${styles.presenceDotOnline}`
    : `${styles.presenceDot} ${styles.presenceDotOffline}`
  const textClass = isOnline
    ? `${styles.presenceText} ${styles.presenceTextOnline}`
    : `${styles.presenceText} ${styles.presenceTextOffline}`

  return (
    <div
      className={styles.presenceContainer}
      role="status"
      aria-live="polite"
      aria-label={`User is ${statusText}`}
    >
      {/* Status Indicator Dot */}
      <span className={dotClass} aria-hidden="true" />

      {/* Status Text */}
      <p className={textClass}>{statusText}</p>
    </div>
  )
}

/**
 * Memoized UserPresenceIndicator for performance optimization
 * Only re-renders when props change
 */
export const UserPresenceIndicator = memo(UserPresenceIndicatorComponent)
