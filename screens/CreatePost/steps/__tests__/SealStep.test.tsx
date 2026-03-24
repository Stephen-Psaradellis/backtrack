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
}))

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <div data-testid={`icon-${props.name}`} />,
}))

vi.mock('../../../../hooks/useProfilePhotos', () => ({
  useProfilePhotos: () => ({
    photos: [],
    approvedPhotos: [],
    uploading: false,
    hasReachedLimit: false,
    uploadPhoto: vi.fn(),
  }),
}))

vi.mock('../../../../utils/imagePicker', () => ({
  pickSelfieFromCamera: vi.fn(),
  pickSelfieFromGallery: vi.fn(),
}))

vi.mock('../../../../lib/haptics', () => ({
  lightFeedback: vi.fn().mockResolvedValue(undefined),
  successFeedback: vi.fn().mockResolvedValue(undefined),
  errorFeedback: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../../constants/glassStyles', () => ({
  darkTheme: {
    background: '#000',
    cardBackground: '#1a1a1a',
    cardBorder: '#333',
    textPrimary: '#fff',
    textSecondary: '#aaa',
    surface: '#111',
    surfaceElevated: '#222',
    glassBorder: '#333',
    textMuted: '#666',
    accent: '#FF6B47',
    error: '#ff0000',
  },
}))

vi.mock('../../../../constants/theme', () => ({
  colors: {
    primary: { 500: '#FF6B47' },
    white: '#fff',
  },
}))

vi.mock('../../../../components/LocationPicker', () => ({}))

vi.mock('../../../../utils/dateTime', () => ({
  formatSightingTime: () => 'Today, Afternoon',
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
  GhostButton: (props: any) => (
    <button
      data-testid={props.testID}
      disabled={props.disabled}
      onClick={props.onPress}
    >
      {props.title}
    </button>
  ),
}))

vi.mock('react-native-svg', () => ({
  SvgXml: 'SvgXml',
}))

import { SealStep } from '../SealStep'
import type { LocationItem } from '../../../../components/LocationPicker'

// Helper to query RN testID attribute (renders as "testid" not "data-testid")
const queryTestId = (container: HTMLElement, id: string) =>
  container.querySelector(`[testid="${id}"]`)

describe('SealStep', () => {
  const mockLocation: LocationItem = {
    id: 'loc-1',
    name: 'Coffee Shop',
    latitude: 37.7749,
    longitude: -122.4194,
    visitedAt: new Date().toISOString(),
  }

  const mockOnPhotoSelect = vi.fn()
  const mockOnSubmit = vi.fn()
  const mockOnBack = vi.fn()
  const mockGoToStep = vi.fn()

  const defaultProps = {
    avatar: { config: { test: 'avatar' } } as any,
    note: 'Test note about someone I saw',
    location: mockLocation,
    sightingDate: new Date(),
    timeGranularity: 'afternoon' as any,
    selectedPhotoId: null,
    onPhotoSelect: mockOnPhotoSelect,
    isSubmitting: false,
    isFormValid: true,
    onSubmit: mockOnSubmit,
    onBack: mockOnBack,
    goToStep: mockGoToStep,
    testID: 'create-post',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders review card title', () => {
    render(<SealStep {...defaultProps} />)

    expect(screen.getByText('Review Your Post')).toBeInTheDocument()
  })

  it('renders location name in review card', () => {
    render(<SealStep {...defaultProps} />)

    expect(screen.getByText('Coffee Shop')).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<SealStep {...defaultProps} />)

    expect(screen.getByTestId('create-post-submit')).toBeInTheDocument()
  })

  it('disables submit button when form is not valid', () => {
    render(<SealStep {...defaultProps} isFormValid={false} />)

    const submitButton = screen.getByTestId('create-post-submit')
    expect(submitButton).toBeDisabled()
  })

  it('disables submit button when submitting', () => {
    render(<SealStep {...defaultProps} isSubmitting={true} />)

    const submitButton = screen.getByTestId('create-post-submit')
    expect(submitButton).toBeDisabled()
  })

  it('calls onBack when back button is pressed', () => {
    render(<SealStep {...defaultProps} />)

    const backButton = screen.getByTestId('create-post-seal-back')
    fireEvent.click(backButton)

    expect(mockOnBack).toHaveBeenCalledOnce()
  })

  it('submit button is disabled without approved photos', () => {
    render(<SealStep {...defaultProps} selectedPhotoId="photo-1" />)

    const submitButton = screen.getByTestId('create-post-submit')
    // No approved photos in mock, so button should be disabled
    expect(submitButton).toBeDisabled()
  })

  it('renders avatar thumbnail', () => {
    render(<SealStep {...defaultProps} />)

    expect(screen.getByTestId('avatar')).toBeInTheDocument()
  })

  it('shows note preview', () => {
    const note = 'This is a test note about someone I saw'
    render(<SealStep {...defaultProps} note={note} />)

    expect(screen.getByText(note)).toBeInTheDocument()
  })

  it('truncates long notes in preview', () => {
    const longNote = 'a'.repeat(100)
    render(<SealStep {...defaultProps} note={longNote} />)

    // The preview should be truncated to 80 chars + '...'
    const noteElements = screen.getAllByText(/^a{80}\.\.\.$/)
    expect(noteElements.length).toBeGreaterThan(0)
  })

  it('renders divider with "Verify it\'s you"', () => {
    render(<SealStep {...defaultProps} />)

    expect(screen.getByText("Verify it's you")).toBeInTheDocument()
  })

  it('renders photo section label', () => {
    render(<SealStep {...defaultProps} />)

    expect(screen.getByText('Select a verification photo')).toBeInTheDocument()
  })

  it('renders privacy text', () => {
    render(<SealStep {...defaultProps} />)

    expect(screen.getByText('Your photo is only shown to matches')).toBeInTheDocument()
  })

  it('renders edit moment section button', () => {
    const { container } = render(<SealStep {...defaultProps} />)

    const editMomentButton = queryTestId(container, 'create-post-edit-moment')
    expect(editMomentButton).toBeTruthy()
  })

  it('renders edit scene section button', () => {
    const { container } = render(<SealStep {...defaultProps} />)

    const editSceneButton = queryTestId(container, 'create-post-edit-scene')
    expect(editSceneButton).toBeTruthy()
  })

  it('disables submit when form is not valid', () => {
    render(<SealStep {...defaultProps} isFormValid={false} selectedPhotoId="photo-1" />)

    const submitButton = screen.getByTestId('create-post-submit')
    expect(submitButton).toBeDisabled()
  })

  it('shows submit button title "Post Missed Connection"', () => {
    render(<SealStep {...defaultProps} selectedPhotoId="photo-1" />)

    expect(screen.getByText('Post Missed Connection')).toBeInTheDocument()
  })

  it('renders back button labeled "Go Back"', () => {
    render(<SealStep {...defaultProps} />)

    expect(screen.getByTestId('create-post-seal-back')).toHaveTextContent('Go Back')
  })

  it('displays avatar with proper config', () => {
    const avatar = { config: { face: 'round', skin: 'light' } } as any
    render(<SealStep {...defaultProps} avatar={avatar} />)

    expect(screen.getByTestId('avatar')).toBeInTheDocument()
  })

  it('shows location icon', () => {
    render(<SealStep {...defaultProps} />)

    expect(screen.getByTestId('icon-location')).toBeInTheDocument()
  })

  it('renders your message label', () => {
    render(<SealStep {...defaultProps} />)

    expect(screen.getByText('Your message')).toBeInTheDocument()
  })
})
