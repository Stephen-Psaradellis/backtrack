import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'

// Mock react-native modules
vi.mock('react-native', async () => {
  const actual = await vi.importActual('react-native')
  return {
    ...actual,
    Platform: { OS: 'ios' },
  }
})

vi.mock('react-native-bitmoji', () => ({
  Avatar: ({ config, size }: any) => <div data-testid="avatar" />,
  useAvatarEditor: () => ({
    config: {},
    activeCategory: 'face',
    activeSubcategory: 'shape',
    setCategory: vi.fn(),
    setSubcategory: vi.fn(),
    updateConfig: vi.fn(),
    randomize: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    getStoredAvatar: vi.fn(() => ({
      config: { test: 'avatar' },
      createdAt: new Date().toISOString(),
    })),
  }),
  EDITOR_CATEGORIES: [],
  CategoryTabs: () => null,
  OptionGrid: () => null,
  ColorPicker: () => null,
}))

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <div data-testid={`icon-${props.name}`} />,
}))

vi.mock('../../../../lib/haptics', () => ({
  lightFeedback: vi.fn().mockResolvedValue(undefined),
  successFeedback: vi.fn().mockResolvedValue(undefined),
  errorFeedback: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../../constants/glassStyles', () => ({
  darkTheme: {
    background: '#000',
    surface: '#111',
    surfaceElevated: '#222',
    glassBorder: '#333',
    textPrimary: '#fff',
    textSecondary: '#aaa',
    textMuted: '#666',
    accent: '#FF6B47',
    error: '#ff0000',
    cardBackground: '#1a1a1a',
    cardBorder: '#333',
  },
}))

vi.mock('../../../../constants/theme', () => ({
  colors: {
    primary: { 500: '#FF6B47' },
    white: '#fff',
  },
}))

vi.mock('../../types', () => ({
  MIN_NOTE_LENGTH: 10,
  MAX_NOTE_LENGTH: 500,
}))

vi.mock('../../styles', () => ({
  COLORS: {
    primary: '#FF6B47',
    primaryDisabled: '#ccc',
    background: '#000',
    backgroundSecondary: '#111',
    border: '#333',
    textPrimary: '#fff',
    textSecondary: '#aaa',
    error: '#ff0000',
    warning: '#F59E0B',
  },
}))

vi.mock('../../../../lib/utils/contentScreening', () => ({
  screenPostContent: () => ({
    isBlocked: false,
    warnings: [],
    blockedReason: null,
  }),
}))

vi.mock('../../../../components/Button', () => ({
  Button: (props: any) => (
    <button
      data-testid={props.testID}
      disabled={props.disabled}
      onClick={props.onPress}
    >
      {props.title}
    </button>
  ),
  OutlineButton: (props: any) => (
    <button data-testid={props.testID} onClick={props.onPress}>
      {props.title}
    </button>
  ),
  GhostButton: (props: any) => (
    <button data-testid={props.testID} onClick={props.onPress}>
      {props.title}
    </button>
  ),
}))

import { MomentStep } from '../MomentStep'

// Helper to query RN testID attribute (renders as "testid" not "data-testid")
const queryTestId = (container: HTMLElement, id: string) =>
  container.querySelector(`[testid="${id}"]`)

describe('MomentStep', () => {
  const mockOnAvatarChange = vi.fn()
  const mockOnNoteChange = vi.fn()
  const mockOnNext = vi.fn()
  const mockOnBack = vi.fn()

  const defaultProps = {
    avatar: null,
    note: '',
    onAvatarChange: mockOnAvatarChange,
    onNoteChange: mockOnNoteChange,
    onNext: mockOnNext,
    onBack: mockOnBack,
    testID: 'create-post',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders avatar section with placeholder when no avatar', () => {
    const { container } = render(<MomentStep {...defaultProps} />)

    expect(screen.getByText('Who did you see?')).toBeInTheDocument()
    expect(screen.getByText('Tap to create avatar')).toBeInTheDocument()
    expect(queryTestId(container, 'create-post-avatar-preview')).toBeTruthy()
  })

  it('renders note input field', () => {
    const { container } = render(<MomentStep {...defaultProps} />)

    expect(queryTestId(container, 'create-post-note-input')).toBeTruthy()
  })

  it('shows character count', () => {
    render(<MomentStep {...defaultProps} note="hello" />)

    const characterText = screen.getByText(/more characters needed/)
    expect(characterText).toBeInTheDocument()
  })

  it('shows remaining characters when note is valid', () => {
    const longNote = 'a'.repeat(20)
    render(<MomentStep {...defaultProps} note={longNote} />)

    const remainingText = screen.getByText(/characters remaining/)
    expect(remainingText).toBeInTheDocument()
  })

  it('calls onBack when back button is pressed', () => {
    render(<MomentStep {...defaultProps} />)

    const backButton = screen.getByTestId('create-post-moment-back')
    fireEvent.click(backButton)

    expect(mockOnBack).toHaveBeenCalledOnce()
  })

  it('disables Next button when no avatar', () => {
    const validNote = 'a'.repeat(15)
    render(<MomentStep {...defaultProps} note={validNote} avatar={null} />)

    const nextButton = screen.getByTestId('create-post-moment-next')
    expect(nextButton).toBeDisabled()
  })

  it('disables Next button when note is too short', () => {
    render(<MomentStep {...defaultProps} avatar={{ config: {} } as any} note="short" />)

    const nextButton = screen.getByTestId('create-post-moment-next')
    expect(nextButton).toBeDisabled()
  })

  it('enables Next button when both avatar and valid note provided', () => {
    const validNote = 'a'.repeat(15)
    render(
      <MomentStep
        {...defaultProps}
        avatar={{ config: {} } as any}
        note={validNote}
      />
    )

    const nextButton = screen.getByTestId('create-post-moment-next')
    expect(nextButton).not.toBeDisabled()
  })

  it('renders note input element', () => {
    const { container } = render(<MomentStep {...defaultProps} />)

    const noteInput = queryTestId(container, 'create-post-note-input')
    expect(noteInput).toBeTruthy()
  })

  it('shows avatar with config when avatar is provided', () => {
    const avatar = { config: { face: 'round' } } as any
    render(<MomentStep {...defaultProps} avatar={avatar} />)

    // Avatar mock renders with data-testid="avatar"
    expect(screen.getAllByTestId('avatar').length).toBeGreaterThan(0)
  })

  it('shows "Create Avatar" text when no avatar exists', () => {
    render(<MomentStep {...defaultProps} avatar={null} />)

    // "Create Avatar" appears in both the button and modal header
    const elements = screen.getAllByText('Create Avatar')
    expect(elements.length).toBeGreaterThan(0)
  })

  it('displays avatar required hint when no avatar selected', () => {
    render(<MomentStep {...defaultProps} avatar={null} />)

    expect(screen.getByText('Avatar is required')).toBeInTheDocument()
  })

  it('renders divider text', () => {
    render(<MomentStep {...defaultProps} />)

    expect(screen.getByText('What would you say to them?')).toBeInTheDocument()
  })

  it('calls onNext when Next button is pressed', () => {
    const validNote = 'a'.repeat(15)
    render(
      <MomentStep
        {...defaultProps}
        avatar={{ config: {} } as any}
        note={validNote}
      />
    )

    const nextButton = screen.getByTestId('create-post-moment-next')
    fireEvent.click(nextButton)

    expect(mockOnNext).toHaveBeenCalledOnce()
  })
})
