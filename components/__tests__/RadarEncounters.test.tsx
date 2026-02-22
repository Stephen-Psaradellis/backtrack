/**
 * Tests for components/RadarEncounters.tsx
 *
 * Tests the RadarEncounters component that displays proximity encounters.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '../../__tests__/utils'
import { fireEvent } from '@testing-library/react'
import { RadarEncounters } from '../RadarEncounters'
import type { ProximityEncounter } from '../../hooks/useRadar'

// Mock navigation - do NOT use importActual as the real module has native deps
const mockNavigate = vi.fn()
vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: vi.fn(),
    replace: vi.fn(),
    reset: vi.fn(),
    setOptions: vi.fn(),
    addListener: vi.fn(() => () => {}),
  }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: vi.fn((cb) => { cb(); }),
  useIsFocused: () => true,
  NavigationContainer: ({ children }: any) => children,
  createNavigationContainerRef: () => ({ current: null }),
}))

// Mock haptics
vi.mock('../../lib/haptics', () => ({
  selectionFeedback: vi.fn().mockResolvedValue(undefined),
}))

describe('RadarEncounters', () => {
  const mockEncounters: ProximityEncounter[] = [
    {
      id: 'enc-1',
      encounter_type: 'walkby',
      distance_meters: 25,
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
      location_id: 'loc-1',
      location_name: 'Coffee House',
    },
    {
      id: 'enc-2',
      encounter_type: 'same_venue',
      distance_meters: 500,
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      location_id: 'loc-2',
      location_name: 'The Park',
    },
    {
      id: 'enc-3',
      encounter_type: 'repeated',
      distance_meters: 1500,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      location_id: null,
      location_name: null,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} testID="radar" />
      )

      expect(container.querySelector('[testid="radar"]')).toBeInTheDocument()
    })

    it('should render all encounters', () => {
      const { container } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} testID="radar" />
      )

      expect(container.querySelector('[testid="radar-encounter-0"]')).toBeInTheDocument()
      expect(container.querySelector('[testid="radar-encounter-1"]')).toBeInTheDocument()
      expect(container.querySelector('[testid="radar-encounter-2"]')).toBeInTheDocument()
    })
  })

  describe('encounter types', () => {
    it('should show walkby label', () => {
      const { getByText } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} />
      )

      expect(getByText('Walked by')).toBeInTheDocument()
    })

    it('should show same_venue label', () => {
      const { getByText } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} />
      )

      expect(getByText('Same venue')).toBeInTheDocument()
    })

    it('should show repeated label', () => {
      const { getByText } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} />
      )

      expect(getByText('Repeated encounter')).toBeInTheDocument()
    })
  })

  describe('distance display', () => {
    it('should display distance in meters for < 1km', () => {
      const { getByText } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} />
      )

      expect(getByText('25m away')).toBeInTheDocument()
    })

    it('should display distance in kilometers for >= 1km', () => {
      const { getByText } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} />
      )

      expect(getByText('1.5km away')).toBeInTheDocument()
    })

    it('should round meters to nearest integer', () => {
      const encounter: ProximityEncounter[] = [
        {
          id: 'enc-1',
          encounter_type: 'walkby',
          distance_meters: 42.7,
          created_at: new Date().toISOString(),
          location_id: null,
          location_name: null,
        },
      ]

      const { getByText } = renderWithProviders(
        <RadarEncounters encounters={encounter} />
      )

      expect(getByText('43m away')).toBeInTheDocument()
    })

    it('should format kilometers with 1 decimal place', () => {
      const encounter: ProximityEncounter[] = [
        {
          id: 'enc-1',
          encounter_type: 'walkby',
          distance_meters: 1234,
          created_at: new Date().toISOString(),
          location_id: null,
          location_name: null,
        },
      ]

      const { getByText } = renderWithProviders(
        <RadarEncounters encounters={encounter} />
      )

      expect(getByText('1.2km away')).toBeInTheDocument()
    })
  })

  describe('time display', () => {
    it('should show minutes ago for recent encounters', () => {
      const { getByText } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} />
      )

      expect(getByText('5m ago')).toBeInTheDocument()
    })

    it('should show hours ago for older encounters', () => {
      const { getByText } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} />
      )

      expect(getByText('1h ago')).toBeInTheDocument()
      expect(getByText('2h ago')).toBeInTheDocument()
    })

    it('should show just now for very recent', () => {
      const recentEncounter: ProximityEncounter[] = [
        {
          id: 'enc-1',
          encounter_type: 'walkby',
          distance_meters: 10,
          created_at: new Date().toISOString(),
          location_id: null,
          location_name: null,
        },
      ]

      const { getByText } = renderWithProviders(
        <RadarEncounters encounters={recentEncounter} />
      )

      expect(getByText('Just now')).toBeInTheDocument()
    })

    it('should show days for old encounters', () => {
      const oldEncounter: ProximityEncounter[] = [
        {
          id: 'enc-1',
          encounter_type: 'walkby',
          distance_meters: 50,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          location_id: null,
          location_name: null,
        },
      ]

      const { getByText } = renderWithProviders(
        <RadarEncounters encounters={oldEncounter} />
      )

      expect(getByText('2d ago')).toBeInTheDocument()
    })
  })

  describe('location display', () => {
    it('should show location name when available', () => {
      const { getByText } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} />
      )

      expect(getByText('Coffee House')).toBeInTheDocument()
      expect(getByText('The Park')).toBeInTheDocument()
    })

    it('should not show location when unavailable', () => {
      const { queryByText } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} />
      )

      // Third encounter has no location
      const encounter3 = mockEncounters[2]
      expect(encounter3.location_id).toBeNull()
    })
  })

  describe('interactions', () => {
    it('should navigate to Ledger when encounter with location is pressed', async () => {
      const { container } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} testID="radar" />
      )

      const encounterCard = container.querySelector('[testid="radar-encounter-0"]')
      fireEvent.click(encounterCard)

      await vi.waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Ledger', {
          locationId: 'loc-1',
          locationName: 'Coffee House',
        })
      })
    })

    it('should not navigate when encounter has no location', () => {
      const { container } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} testID="radar" />
      )

      const encounterCard = container.querySelector('[testid="radar-encounter-2"]')
      fireEvent.click(encounterCard)

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should show chevron only for encounters with locations', () => {
      const { container } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} />
      )

      expect(container).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should render empty state when no encounters', () => {
      const { container, getByText } = renderWithProviders(
        <RadarEncounters encounters={[]} testID="radar" />
      )

      expect(container.querySelector('[testid="radar-empty"]')).toBeInTheDocument()
      expect(getByText('No nearby encounters yet')).toBeInTheDocument()
    })

    it('should show helpful message in empty state', () => {
      const { getByText } = renderWithProviders(
        <RadarEncounters encounters={[]} />
      )

      expect(
        getByText(/Keep exploring! You'll be notified when you pass near others./)
      ).toBeInTheDocument()
    })

    it('should show radar icon in empty state', () => {
      const { container } = renderWithProviders(
        <RadarEncounters encounters={[]} testID="radar" />
      )

      expect(container.querySelector('[testid="radar-empty"]')).toBeInTheDocument()
    })
  })

  describe('custom testID', () => {
    it('should use custom testID', () => {
      const { container } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} testID="custom-radar" />
      )

      expect(container.querySelector('[testid="custom-radar"]')).toBeInTheDocument()
    })

    it('should use custom testID for encounters', () => {
      const { container } = renderWithProviders(
        <RadarEncounters encounters={mockEncounters} testID="custom" />
      )

      expect(container.querySelector('[testid="custom-encounter-0"]')).toBeInTheDocument()
      expect(container.querySelector('[testid="custom-encounter-1"]')).toBeInTheDocument()
    })

    it('should use custom testID for empty state', () => {
      const { container } = renderWithProviders(
        <RadarEncounters encounters={[]} testID="custom" />
      )

      expect(container.querySelector('[testid="custom-empty"]')).toBeInTheDocument()
    })
  })
})
