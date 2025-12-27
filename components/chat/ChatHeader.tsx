'use client'

/**
 * ChatHeader Component
 *
 * Displays the chat header bar with:
 * - Back navigation button
 * - Other user's avatar with online status indicator
 * - Username with optional verified badge
 * - Presence status (online/last seen)
 * - Actions menu trigger button (for block, report, etc.)
 *
 * This component is designed to be used at the top of the ChatScreen
 * and receives all necessary data and callbacks as props.
 *
 * @example
 * ```tsx
 * <ChatHeader
 *   username="Sarah"
 *   isOnline={true}
 *   lastSeen={null}
 *   isVerified={true}
 *   onBack={() => navigation.goBack()}
 *   onActionsClick={() => setIsActionsMenuOpen(true)}
 * />
 * ```
 */

import React, { memo } from 'react'
import type { ChatHeaderProps } from '../../types/chat'
import { UserPresenceIndicator } from './UserPresenceIndicator'
import styles from './styles/ChatScreen.module.css'

/**
 * Back arrow icon for navigation
 */
function BackIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

/**
 * Vertical ellipsis icon for actions menu
 */
function MoreActionsIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )
}

/**
 * Verified badge icon - blue circle with white checkmark
 * Matches the VerifiedBadge component design for visual consistency
 * Uses 'md' size (20px) as recommended for chat headers
 */
function VerifiedBadgeIcon() {
  return (
    <span
      className={styles.verifiedBadge}
      role="img"
      aria-label="Verified user"
      title="Verified user"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="12" fill="#3B82F6" />
        <path
          d="M7.5 12.5L10.5 15.5L16.5 9.5"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

/**
 * ChatHeader displays the header bar for a chat conversation
 *
 * @param username - The other user's display name
 * @param avatarLetter - Single character for avatar fallback (usually first letter of username)
 * @param isOnline - Whether the other user is currently online
 * @param lastSeen - ISO timestamp of when the user was last seen
 * @param isVerified - Whether the other user is verified
 * @param onBack - Callback when back button is pressed
 * @param onActionsClick - Callback when actions menu button is pressed
 */
function ChatHeaderComponent({
  username,
  avatarLetter,
  isOnline,
  lastSeen,
  isVerified,
  onBack,
  onActionsClick,
}: ChatHeaderProps) {
  // Get the avatar letter to display (first character of username or fallback)
  const displayLetter = avatarLetter || username?.[0]?.toUpperCase() || '?'

  return (
    <header className={styles.header}>
      {/* Back Button */}
      <button
        className={styles.backButton}
        onClick={onBack}
        aria-label="Go back to conversations"
        type="button"
      >
        <BackIcon />
      </button>

      {/* User Info */}
      <div className={styles.headerUserInfo}>
        {/* Avatar */}
        <div className={styles.avatarContainer}>
          <div className={styles.avatar} aria-hidden="true">
            {displayLetter}
          </div>
          {/* Online indicator */}
          {isOnline && (
            <div
              className={styles.onlineIndicator}
              aria-hidden="true"
              title="Online"
            />
          )}
        </div>

        {/* User Details */}
        <div className={styles.userDetails}>
          <div className={styles.usernameContainer}>
            <h1 className={styles.username}>{username || 'Unknown User'}</h1>
            {isVerified && <VerifiedBadgeIcon />}
          </div>
          <UserPresenceIndicator isOnline={isOnline} lastSeen={lastSeen} />
        </div>
      </div>

      {/* Actions Button */}
      <button
        className={styles.actionsButton}
        onClick={onActionsClick}
        aria-label="Open chat actions menu"
        aria-haspopup="true"
        type="button"
      >
        <MoreActionsIcon />
      </button>
    </header>
  )
}

/**
 * Memoized ChatHeader for performance optimization
 * Only re-renders when props change
 */
export const ChatHeader = memo(ChatHeaderComponent)
