'use client'

/**
 * ChatInputToolbar Component
 *
 * A toolbar for chat input that provides action buttons for:
 * - Attaching files (images, documents, etc.)
 * - Opening an emoji picker
 * - Showing attachment previews with remove capability
 *
 * Features:
 * - File picker integration via hidden input
 * - Emoji picker trigger button
 * - Attachment preview with count badge
 * - Proper accessibility labels and keyboard navigation
 * - Disabled state handling
 * - Keyboard-aware positioning support
 */

import React, {
  memo,
  useCallback,
  useRef,
  useMemo,
  KeyboardEvent,
} from 'react'
import { Paperclip, Smile, X, FileText, Video, Music, Image as LucideImage, File } from 'lucide-react'
import type { ChatInputToolbarProps, ChatAttachment } from '../../types/chat'
import styles from './styles/ChatScreen.module.css'

/**
 * Default accepted file types for attachments
 */
const DEFAULT_ACCEPTED_FILE_TYPES = 'image/*,.pdf,.doc,.docx,.txt'

/**
 * Default maximum file size: 10MB
 */
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Default maximum number of attachments
 */
const DEFAULT_MAX_ATTACHMENTS = 5

/**
 * Get file type category from MIME type or extension
 */
function getFileTypeCategory(file: File): ChatAttachment['type'] {
  const mimeType = file.type.toLowerCase()

  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('msword') ||
    mimeType.includes('text/')
  ) {
    return 'document'
  }

  return 'other'
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * ChatInputToolbar provides action buttons for file attachment and emoji selection
 *
 * @param onAttachmentClick - Callback when attachment button is clicked
 * @param onEmojiClick - Callback when emoji button is clicked
 * @param onFileSelect - Optional callback when files are selected
 * @param disabled - Whether the toolbar is disabled
 * @param isEmojiPickerOpen - Whether the emoji picker is currently open
 * @param attachments - Currently attached files
 * @param onRemoveAttachment - Callback to remove an attachment
 * @param acceptedFileTypes - Accepted file types for the file input
 * @param maxFileSize - Maximum file size in bytes
 * @param maxAttachments - Maximum number of attachments allowed
 */
function ChatInputToolbarComponent({
  onAttachmentClick,
  onEmojiClick,
  onFileSelect,
  disabled = false,
  isEmojiPickerOpen = false,
  attachments = [],
  onRemoveAttachment,
  acceptedFileTypes = DEFAULT_ACCEPTED_FILE_TYPES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxAttachments = DEFAULT_MAX_ATTACHMENTS,
}: ChatInputToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  const attachmentCount = attachments.length
  const hasAttachments = attachmentCount > 0
  const canAddMoreAttachments = attachmentCount < maxAttachments

  const attachmentStatusSummary = useMemo(() => {
    const uploading = attachments.filter(a => a.status === 'uploading').length
    const failed = attachments.filter(a => a.status === 'failed').length

    if (failed > 0) return `${failed} failed`
    if (uploading > 0) return `Uploading ${uploading}...`
    return `${attachmentCount} file${attachmentCount !== 1 ? 's' : ''}`
  }, [attachments, attachmentCount])

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  const handleAttachmentButtonClick = useCallback(() => {
    if (disabled) return

    // Trigger file input click
    fileInputRef.current?.click()
    onAttachmentClick()
  }, [disabled, onAttachmentClick])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      // Validate file count
      if (attachmentCount + files.length > maxAttachments) {
        // Could trigger an error callback here in the future
        return
      }

      // Validate file sizes
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > maxFileSize) {
          // Could trigger an error callback here in the future
          return
        }
      }

      // Call the onFileSelect callback if provided
      if (onFileSelect) {
        onFileSelect(files)
      }

      // Reset the input so the same file can be selected again
      e.target.value = ''
    },
    [attachmentCount, maxAttachments, maxFileSize, onFileSelect]
  )

  const handleEmojiButtonClick = useCallback(() => {
    if (disabled) return
    onEmojiClick()
  }, [disabled, onEmojiClick])

  const handleRemoveAttachment = useCallback(
    (attachmentId: string) => {
      if (onRemoveAttachment) {
        onRemoveAttachment(attachmentId)
      }
    },
    [onRemoveAttachment]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, action: 'attachment' | 'emoji') => {
      // Handle Enter and Space for accessibility
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (action === 'attachment') {
          handleAttachmentButtonClick()
        } else {
          handleEmojiButtonClick()
        }
      }
    },
    [handleAttachmentButtonClick, handleEmojiButtonClick]
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const toolbarButtonClass = (isActive = false, isDisabled = false) => {
    let className = styles.toolbarButton
    if (isDisabled) className += ` ${styles.toolbarButtonDisabled}`
    if (isActive) className += ` ${styles.toolbarButtonActive}`
    return className
  }

  const getAttachmentPreviewClass = (attachment: ChatAttachment) => {
    let className = styles.attachmentPreview
    if (attachment.status === 'failed') className += ` ${styles.attachmentPreviewFailed}`
    if (attachment.status === 'uploading') className += ` ${styles.attachmentPreviewUploading}`
    return className
  }

  return (
    <div className={styles.toolbarContainer} role="toolbar" aria-label="Message actions">
      {/* Hidden file input for attachment selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes}
        multiple
        className={styles.hiddenInput}
        onChange={handleFileInputChange}
        disabled={disabled || !canAddMoreAttachments}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Attachment previews (if any) */}
      {hasAttachments && (
        <div
          className={styles.attachmentPreviews}
          role="list"
          aria-label={`Attachments: ${attachmentStatusSummary}`}
        >
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className={getAttachmentPreviewClass(attachment)}
              role="listitem"
            >
              {/* Preview thumbnail for images */}
              {attachment.type === 'image' && attachment.previewUrl ? (
                <img
                  src={attachment.previewUrl}
                  alt={attachment.file.name}
                  className={styles.attachmentThumbnail}
                />
              ) : (
                <div className={styles.attachmentIcon}>
                  <FileTypeIcon type={attachment.type} />
                </div>
              )}

              {/* File info */}
              <div className={styles.attachmentInfo}>
                <span className={styles.attachmentName} title={attachment.file.name}>
                  {attachment.file.name}
                </span>
                <span className={styles.attachmentSize}>
                  {formatFileSize(attachment.file.size)}
                </span>
              </div>

              {/* Upload progress */}
              {attachment.status === 'uploading' && attachment.progress !== undefined && (
                <div
                  className={styles.attachmentProgress}
                  role="progressbar"
                  aria-valuenow={attachment.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={styles.attachmentProgressBar}
                    style={{ width: `${attachment.progress}%` }}
                  />
                </div>
              )}

              {/* Error message */}
              {attachment.status === 'failed' && attachment.error && (
                <span className={styles.attachmentError}>{attachment.error}</span>
              )}

              {/* Remove button */}
              {onRemoveAttachment && (
                <button
                  className={styles.removeAttachmentButton}
                  onClick={() => handleRemoveAttachment(attachment.id)}
                  aria-label={`Remove ${attachment.file.name}`}
                  type="button"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Toolbar buttons */}
      <div className={styles.buttonGroup}>
        {/* Attachment button */}
        <button
          className={toolbarButtonClass(false, disabled || !canAddMoreAttachments)}
          onClick={handleAttachmentButtonClick}
          onKeyDown={(e) => handleKeyDown(e, 'attachment')}
          disabled={disabled || !canAddMoreAttachments}
          aria-label={
            !canAddMoreAttachments
              ? `Maximum ${maxAttachments} attachments reached`
              : 'Attach file'
          }
          title={
            !canAddMoreAttachments
              ? `Maximum ${maxAttachments} attachments`
              : 'Attach file'
          }
          type="button"
        >
          <Paperclip size={20} aria-hidden="true" />
          {hasAttachments && (
            <span className={styles.attachmentBadge} aria-hidden="true">
              {attachmentCount}
            </span>
          )}
        </button>

        {/* Emoji button */}
        <button
          className={toolbarButtonClass(isEmojiPickerOpen, disabled)}
          onClick={handleEmojiButtonClick}
          onKeyDown={(e) => handleKeyDown(e, 'emoji')}
          disabled={disabled}
          aria-label={isEmojiPickerOpen ? 'Close emoji picker' : 'Open emoji picker'}
          aria-pressed={isEmojiPickerOpen}
          title="Emoji"
          type="button"
        >
          <Smile size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

/**
 * File type icon based on attachment type using Lucide icons
 */
function FileTypeIcon({ type }: { type: ChatAttachment['type'] }) {
  const iconProps = { size: 20, strokeWidth: 2, 'aria-hidden': true as const }
  switch (type) {
    case 'document': return <FileText {...iconProps} />
    case 'video': return <Video {...iconProps} />
    case 'audio': return <Music {...iconProps} />
    case 'image': return <LucideImage {...iconProps} />
    default: return <File {...iconProps} />
  }
}

export const ChatInputToolbar = memo(ChatInputToolbarComponent)
