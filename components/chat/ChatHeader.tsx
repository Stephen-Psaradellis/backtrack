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
 */

import React, { memo } from 'react'
import { ArrowLeft, MoreVertical } from 'lucide-react'
import type { ChatHeaderProps } from '../../types/chat'
import { UserPresenceIndicator } from './UserPresenceIndicator'
import { VerifiedBadgeIcon } from '../ui/Icons'
import styles from './styles/ChatScreen.module.css'

/**
 * ChatHeader displays the header bar for a chat conversation
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
  const displayLetter = avatarLetter || username?.[0]?.toUpperCase() || '?'

  return (
    <header className={styles.header}>
      <button
        className={styles.backButton}
        onClick={onBack}
        aria-label="Go back to conversations"
        type="button"
      >
        <ArrowLeft size={24} aria-hidden="true" />
      </button>

      <div className={styles.headerUserInfo}>
        <div className={styles.avatarContainer}>
          <div className={styles.avatar} aria-hidden="true">
            {displayLetter}
          </div>
          {isOnline && (
            <div
              className={styles.onlineIndicator}
              aria-hidden="true"
              title="Online"
            />
          )}
        </div>

        <div className={styles.userDetails}>
          <div className={styles.usernameContainer}>
            <h1 className={styles.username}>{username || 'Unknown User'}</h1>
            {isVerified && <VerifiedBadgeIcon />}
          </div>
          <UserPresenceIndicator isOnline={isOnline} lastSeen={lastSeen} />
        </div>
      </div>

      <button
        className={styles.actionsButton}
        onClick={onActionsClick}
        aria-label="Open chat actions menu"
        aria-haspopup="true"
        type="button"
      >
        <MoreVertical size={24} aria-hidden="true" />
      </button>
    </header>
  )
}

export const ChatHeader = memo(ChatHeaderComponent)
