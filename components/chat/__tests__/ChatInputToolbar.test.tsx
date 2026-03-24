import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInputToolbar } from '../ChatInputToolbar'
import type { ChatAttachment } from '../../../types/chat'

// Mock CSS module
vi.mock('../styles/ChatScreen.module.css', () => ({
  default: {
    toolbarContainer: 'toolbarContainer',
    toolbarButton: 'toolbarButton',
    toolbarButtonDisabled: 'toolbarButtonDisabled',
    toolbarButtonActive: 'toolbarButtonActive',
    hiddenInput: 'hiddenInput',
    attachmentPreviews: 'attachmentPreviews',
    attachmentPreview: 'attachmentPreview',
    attachmentPreviewFailed: 'attachmentPreviewFailed',
    attachmentPreviewUploading: 'attachmentPreviewUploading',
    attachmentThumbnail: 'attachmentThumbnail',
    attachmentIcon: 'attachmentIcon',
    attachmentInfo: 'attachmentInfo',
    attachmentName: 'attachmentName',
    attachmentSize: 'attachmentSize',
    attachmentProgress: 'attachmentProgress',
    attachmentProgressBar: 'attachmentProgressBar',
    attachmentError: 'attachmentError',
    removeAttachmentButton: 'removeAttachmentButton',
    attachmentBadge: 'attachmentBadge',
    buttonGroup: 'buttonGroup',
  },
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Paperclip: (props: Record<string, unknown>) => <svg data-testid="paperclip-icon" {...props} />,
  Smile: (props: Record<string, unknown>) => <svg data-testid="smile-icon" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
  FileText: (props: Record<string, unknown>) => <svg {...props} />,
  Video: (props: Record<string, unknown>) => <svg {...props} />,
  Music: (props: Record<string, unknown>) => <svg {...props} />,
  Image: (props: Record<string, unknown>) => <svg {...props} />,
  File: (props: Record<string, unknown>) => <svg {...props} />,
}))

function createAttachment(overrides: Partial<ChatAttachment> = {}): ChatAttachment {
  return {
    id: 'att-1',
    file: new File(['content'], 'test.png', { type: 'image/png' }),
    type: 'image',
    status: 'uploaded',
    ...overrides,
  }
}

describe('ChatInputToolbar', () => {
  const defaultProps = {
    onAttachmentClick: vi.fn(),
    onEmojiClick: vi.fn(),
  }

  it('renders toolbar with attachment and emoji buttons', () => {
    render(<ChatInputToolbar {...defaultProps} />)

    expect(screen.getByLabelText('Attach file')).toBeInTheDocument()
    expect(screen.getByLabelText('Open emoji picker')).toBeInTheDocument()
  })

  it('renders with toolbar role', () => {
    render(<ChatInputToolbar {...defaultProps} />)
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
  })

  it('calls onAttachmentClick when attachment button is clicked', () => {
    const onAttachmentClick = vi.fn()
    render(<ChatInputToolbar {...defaultProps} onAttachmentClick={onAttachmentClick} />)

    fireEvent.click(screen.getByLabelText('Attach file'))
    expect(onAttachmentClick).toHaveBeenCalled()
  })

  it('calls onEmojiClick when emoji button is clicked', () => {
    const onEmojiClick = vi.fn()
    render(<ChatInputToolbar {...defaultProps} onEmojiClick={onEmojiClick} />)

    fireEvent.click(screen.getByLabelText('Open emoji picker'))
    expect(onEmojiClick).toHaveBeenCalled()
  })

  it('disables buttons when disabled prop is true', () => {
    render(<ChatInputToolbar {...defaultProps} disabled={true} />)

    expect(screen.getByLabelText('Attach file')).toBeDisabled()
    expect(screen.getByLabelText('Open emoji picker')).toBeDisabled()
  })

  it('shows attachment count badge when attachments exist', () => {
    const attachments = [createAttachment()]
    render(<ChatInputToolbar {...defaultProps} attachments={attachments} />)

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders attachment previews', () => {
    const attachments = [createAttachment({ id: 'att-1' })]
    render(<ChatInputToolbar {...defaultProps} attachments={attachments} />)

    expect(screen.getByText('test.png')).toBeInTheDocument()
  })

  it('shows remove button for attachments when onRemoveAttachment provided', () => {
    const onRemoveAttachment = vi.fn()
    const attachments = [createAttachment()]
    render(
      <ChatInputToolbar
        {...defaultProps}
        attachments={attachments}
        onRemoveAttachment={onRemoveAttachment}
      />
    )

    const removeButton = screen.getByLabelText('Remove test.png')
    fireEvent.click(removeButton)
    expect(onRemoveAttachment).toHaveBeenCalledWith('att-1')
  })

  it('shows "Close emoji picker" label when emoji picker is open', () => {
    render(<ChatInputToolbar {...defaultProps} isEmojiPickerOpen={true} />)
    expect(screen.getByLabelText('Close emoji picker')).toBeInTheDocument()
  })

  it('disables attachment button when max attachments reached', () => {
    const attachments = Array.from({ length: 5 }, (_, i) =>
      createAttachment({ id: `att-${i}`, file: new File([''], `file${i}.png`, { type: 'image/png' }) })
    )
    render(<ChatInputToolbar {...defaultProps} attachments={attachments} maxAttachments={5} />)

    expect(screen.getByLabelText('Maximum 5 attachments reached')).toBeDisabled()
  })

  it('shows error message for failed attachments', () => {
    const attachments = [createAttachment({ status: 'failed', error: 'Upload failed' })]
    render(<ChatInputToolbar {...defaultProps} attachments={attachments} />)

    expect(screen.getByText('Upload failed')).toBeInTheDocument()
  })
})
