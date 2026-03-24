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

vi.mock('../../../../components/LocationPicker', () => ({
  LocationPicker: (props: any) => (
    <div data-testid={props.testID}>LocationPicker</div>
  ),
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
}))

vi.mock('../../../../components/EmptyState', () => ({
  EmptyState: (props: any) => (
    <div data-testid={props.testID}>{props.title}</div>
  ),
}))

vi.mock('../../../../lib/haptics', () => ({
  lightFeedback: vi.fn().mockResolvedValue(undefined),
  successFeedback: vi.fn().mockResolvedValue(undefined),
  errorFeedback: vi.fn().mockResolvedValue(undefined),
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

import { SceneStep } from '../SceneStep'
import type { LocationItem } from '../../../../components/LocationPicker'

describe('SceneStep', () => {
  const mockLocationItem: LocationItem = {
    id: 'loc-1',
    name: 'Coffee Shop',
    latitude: 37.7749,
    longitude: -122.4194,
    visitedAt: new Date().toISOString(),
  }

  const mockOnLocationSelect = vi.fn()
  const mockOnDateChange = vi.fn()
  const mockOnGranularityChange = vi.fn()
  const mockOnNext = vi.fn()
  const mockOnBack = vi.fn()

  const defaultProps = {
    locations: [mockLocationItem],
    selectedLocation: null,
    onLocationSelect: mockOnLocationSelect,
    userCoordinates: { latitude: 37.7749, longitude: -122.4194 },
    loadingLocations: false,
    isPreselected: false,
    sightingDate: null,
    timeGranularity: null,
    onDateChange: mockOnDateChange,
    onGranularityChange: mockOnGranularityChange,
    onNext: mockOnNext,
    onBack: mockOnBack,
    testID: 'create-post',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders location section', () => {
    render(<SceneStep {...defaultProps} />)

    expect(screen.getByText('Where did you see them?')).toBeInTheDocument()
    expect(screen.getByTestId('create-post-location-picker')).toBeInTheDocument()
  })

  it('renders "When? (optional)" divider', () => {
    render(<SceneStep {...defaultProps} />)

    expect(screen.getByText('When? (optional)')).toBeInTheDocument()
  })

  it('shows empty state when no locations and not preselected', () => {
    render(<SceneStep {...defaultProps} locations={[]} />)

    expect(screen.getByText('No Recent Visits')).toBeInTheDocument()
  })

  it('disables Next button when no location selected', () => {
    render(<SceneStep {...defaultProps} selectedLocation={null} />)

    const nextButton = screen.getByTestId('create-post-scene-next')
    expect(nextButton).toBeDisabled()
  })

  it('enables Next button when location selected', () => {
    render(<SceneStep {...defaultProps} selectedLocation={mockLocationItem} />)

    const nextButton = screen.getByTestId('create-post-scene-next')
    expect(nextButton).not.toBeDisabled()
  })

  it('calls onBack when back button is pressed', () => {
    render(<SceneStep {...defaultProps} />)

    const backButton = screen.getByTestId('create-post-scene-back')
    fireEvent.click(backButton)

    expect(mockOnBack).toHaveBeenCalledOnce()
  })

  it('calls onNext when Next button is pressed', () => {
    render(<SceneStep {...defaultProps} selectedLocation={mockLocationItem} />)

    const nextButton = screen.getByTestId('create-post-scene-next')
    fireEvent.click(nextButton)

    expect(mockOnNext).toHaveBeenCalledOnce()
  })

  it('shows Required badge on location section', () => {
    render(<SceneStep {...defaultProps} />)

    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('renders LocationPicker component', () => {
    render(<SceneStep {...defaultProps} />)

    const locationPicker = screen.getByTestId('create-post-location-picker')
    expect(locationPicker).toBeInTheDocument()
  })

  it('shows empty state message when no locations', () => {
    render(
      <SceneStep
        {...defaultProps}
        locations={[]}
        loadingLocations={false}
        isPreselected={false}
      />
    )

    expect(screen.getByText(/No Recent Visits/)).toBeInTheDocument()
  })

  it('does not show empty state when preselected', () => {
    render(
      <SceneStep
        {...defaultProps}
        locations={[]}
        isPreselected={true}
      />
    )

    expect(screen.queryByText('No Recent Visits')).not.toBeInTheDocument()
  })

  it('renders back button in empty state', () => {
    render(
      <SceneStep
        {...defaultProps}
        locations={[]}
        loadingLocations={false}
        isPreselected={false}
      />
    )

    expect(screen.getByTestId('create-post-scene-back')).toBeInTheDocument()
  })

  it('shows time selector section when locations provided', () => {
    render(<SceneStep {...defaultProps} />)

    expect(screen.getByText('When? (optional)')).toBeInTheDocument()
  })
})
