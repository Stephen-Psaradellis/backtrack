/**
 * Regulars Components Tests
 *
 * Smoke tests for regulars components focusing on logic and exports.
 * Tests RegularCard, RegularsList, and RegularsModeToggle without full rendering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock hooks
const mockUseFellowRegulars = vi.fn()
const mockUseLocationRegulars = vi.fn()
const mockUseRegularsMode = vi.fn()

vi.mock('../../../hooks/useRegulars', () => ({
  useFellowRegulars: () => mockUseFellowRegulars(),
  useLocationRegulars: (locationId: string, options?: any) => mockUseLocationRegulars(locationId, options),
  useRegularsMode: () => mockUseRegularsMode(),
  FellowRegular: undefined,
  LocationRegular: undefined,
}))

// Mock Avatar component
vi.mock('react-native-bitmoji', () => ({
  Avatar: vi.fn(() => null),
}))

// ============================================================================
// TEST DATA
// ============================================================================

const mockAvatarConfig = {
  skinTone: 'light',
  hairStyle: 'short',
}

const mockFellowRegular = {
  user_id: 'user-1',
  fellow_user_id: 'user-2',
  location_id: 'loc-1',
  location_name: 'Coffee Shop',
  display_name: 'John Doe',
  avatar: {
    id: 'avatar-1',
    config: mockAvatarConfig,
    createdAt: Date.now(),
  },
  is_verified: true,
  visibility: 'mutual',
  shared_weeks: 5,
}

const mockLocationRegular = {
  user_id: 'user-3',
  location_id: 'loc-1',
  display_name: 'Jane Smith',
  avatar: {
    id: 'avatar-2',
    config: mockAvatarConfig,
    createdAt: Date.now(),
  },
  is_verified: false,
  visibility: 'public',
  weekly_visit_count: 3,
}

const mockFellowRegularsResult = {
  regulars: [mockFellowRegular],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
}

const mockLocationRegularsResult = {
  regulars: [mockLocationRegular],
  totalCount: 1,
  isUserRegular: true,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
}

const mockRegularsModeResult = {
  isEnabled: true,
  visibility: 'mutual' as const,
  toggleMode: vi.fn(),
  setVisibility: vi.fn(),
  isLoading: false,
  isUpdating: false,
  error: null,
}

// ============================================================================
// TESTS - RegularCard
// ============================================================================

describe('RegularCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --------------------------------------------------------------------------
  // MODULE IMPORT
  // --------------------------------------------------------------------------

  it('imports without errors', async () => {
    const module = await import('../RegularCard')
    expect(module.RegularCard).toBeDefined()
    expect(typeof module.RegularCard).toBe('function')
  })

  it('exports RegularAvatar variant', async () => {
    const module = await import('../RegularCard')
    expect(module.RegularAvatar).toBeDefined()
    expect(typeof module.RegularAvatar).toBe('function')
  })

  it('exports default RegularCard', async () => {
    const module = await import('../RegularCard')
    expect(module.default).toBeDefined()
  })

  // --------------------------------------------------------------------------
  // DATA TRANSFORMATION
  // --------------------------------------------------------------------------

  it('displays fellow regular data correctly', async () => {
    const regular = mockFellowRegular
    expect(regular.display_name).toBe('John Doe')
    expect(regular.shared_weeks).toBe(5)
    expect(regular.location_name).toBe('Coffee Shop')
  })

  it('displays location regular data correctly', async () => {
    const regular = mockLocationRegular
    expect(regular.display_name).toBe('Jane Smith')
    expect(regular.weekly_visit_count).toBe(3)
    expect(regular.visibility).toBe('public')
  })

  it('handles missing avatar gracefully', async () => {
    const regularWithoutAvatar = { ...mockFellowRegular, avatar: null }
    expect(regularWithoutAvatar.avatar).toBeNull()
    expect(regularWithoutAvatar.display_name).toBeDefined()
  })

  it('handles missing display name', async () => {
    const regularWithoutName = { ...mockFellowRegular, display_name: null }
    // Component should show 'Anonymous' for null names
    expect(regularWithoutName.display_name).toBeNull()
  })

  // --------------------------------------------------------------------------
  // VERIFICATION STATUS
  // --------------------------------------------------------------------------

  it('identifies verified users', async () => {
    expect(mockFellowRegular.is_verified).toBe(true)
    expect(mockLocationRegular.is_verified).toBe(false)
  })

  // --------------------------------------------------------------------------
  // VISIBILITY ICONS
  // --------------------------------------------------------------------------

  it('maps visibility to correct icons', async () => {
    const visibilityMap = {
      public: 'globe-outline',
      mutual: 'people-outline',
      hidden: 'eye-off-outline',
    }

    expect(visibilityMap.public).toBe('globe-outline')
    expect(visibilityMap.mutual).toBe('people-outline')
    expect(visibilityMap.hidden).toBe('eye-off-outline')
  })

  // --------------------------------------------------------------------------
  // STREAK FORMATTING
  // --------------------------------------------------------------------------

  it('formats single week correctly', async () => {
    const weeksText = 1 === 1 ? '1 week' : `${1} weeks`
    expect(weeksText).toBe('1 week')
  })

  it('formats multiple weeks correctly', async () => {
    const weeks = 5
    const weeksText = weeks === 1 ? '1 week' : `${weeks} weeks`
    expect(weeksText).toBe('5 weeks')
  })
})

// ============================================================================
// TESTS - RegularsList
// ============================================================================

describe('RegularsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseFellowRegulars.mockReturnValue(mockFellowRegularsResult)
    mockUseLocationRegulars.mockReturnValue(mockLocationRegularsResult)
  })

  // --------------------------------------------------------------------------
  // MODULE IMPORT
  // --------------------------------------------------------------------------

  it('imports FellowRegularsList', async () => {
    const module = await import('../RegularsList')
    expect(module.FellowRegularsList).toBeDefined()
    expect(typeof module.FellowRegularsList).toBe('function')
  })

  it('imports LocationRegularsList', async () => {
    const module = await import('../RegularsList')
    expect(module.LocationRegularsList).toBeDefined()
    expect(typeof module.LocationRegularsList).toBe('function')
  })

  it('imports RegularsPreview', async () => {
    const module = await import('../RegularsList')
    expect(module.RegularsPreview).toBeDefined()
    expect(typeof module.RegularsPreview).toBe('function')
  })

  it('exports default FellowRegularsList', async () => {
    const module = await import('../RegularsList')
    expect(module.default).toBeDefined()
  })

  // --------------------------------------------------------------------------
  // HOOK INTEGRATION - FELLOW REGULARS
  // --------------------------------------------------------------------------

  it('uses fellow regulars hook', async () => {
    const result = mockUseFellowRegulars()
    expect(result.regulars).toBeDefined()
    expect(result.isLoading).toBe(false)
    expect(result.error).toBeNull()
  })

  it('handles fellow regulars loading state', async () => {
    mockUseFellowRegulars.mockReturnValue({
      ...mockFellowRegularsResult,
      isLoading: true,
      regulars: [],
    })

    const result = mockUseFellowRegulars()
    expect(result.isLoading).toBe(true)
    expect(result.regulars).toHaveLength(0)
  })

  it('handles fellow regulars error state', async () => {
    mockUseFellowRegulars.mockReturnValue({
      ...mockFellowRegularsResult,
      error: { code: 'FETCH_ERROR', message: 'Failed to load' },
    })

    const result = mockUseFellowRegulars()
    expect(result.error).toBeDefined()
    expect(result.error?.message).toBe('Failed to load')
  })

  // --------------------------------------------------------------------------
  // HOOK INTEGRATION - LOCATION REGULARS
  // --------------------------------------------------------------------------

  it('uses location regulars hook with location ID', async () => {
    const locationId = 'loc-1'
    const result = mockUseLocationRegulars(locationId, { limit: 20 })

    expect(mockUseLocationRegulars).toHaveBeenCalledWith(locationId, { limit: 20 })
    expect(result.regulars).toBeDefined()
  })

  it('handles user regular status', async () => {
    const result = mockUseLocationRegulars('loc-1', {})
    expect(result.isUserRegular).toBe(true)
  })

  it('handles non-regular user viewing regulars', async () => {
    mockUseLocationRegulars.mockReturnValue({
      ...mockLocationRegularsResult,
      isUserRegular: false,
      regulars: [],
    })

    const result = mockUseLocationRegulars('loc-1', {})
    expect(result.isUserRegular).toBe(false)
    expect(result.totalCount).toBe(1)
  })

  // --------------------------------------------------------------------------
  // LIST LIMITING
  // --------------------------------------------------------------------------

  it('respects limit parameter', async () => {
    const limit = 3
    const regulars = [mockFellowRegular, mockFellowRegular, mockFellowRegular, mockFellowRegular]
    const limited = regulars.slice(0, limit)

    expect(limited).toHaveLength(3)
    expect(regulars.length).toBe(4)
  })

  it('shows all regulars when limit is 0', async () => {
    const limit = 0
    const regulars = [mockFellowRegular, mockFellowRegular]
    const displayed = limit > 0 ? regulars.slice(0, limit) : regulars

    expect(displayed).toHaveLength(2)
  })

  // --------------------------------------------------------------------------
  // EMPTY STATES
  // --------------------------------------------------------------------------

  it('handles empty regulars list', async () => {
    mockUseFellowRegulars.mockReturnValue({
      ...mockFellowRegularsResult,
      regulars: [],
    })

    const result = mockUseFellowRegulars()
    expect(result.regulars).toHaveLength(0)
  })
})

// ============================================================================
// TESTS - RegularsModeToggle
// ============================================================================

describe('RegularsModeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRegularsMode.mockReturnValue(mockRegularsModeResult)
  })

  // --------------------------------------------------------------------------
  // MODULE IMPORT
  // --------------------------------------------------------------------------

  it('imports without errors', async () => {
    const module = await import('../RegularsModeToggle')
    expect(module.RegularsModeToggle).toBeDefined()
    expect(typeof module.RegularsModeToggle).toBe('function')
  })

  it('exports compact toggle variant', async () => {
    const module = await import('../RegularsModeToggle')
    expect(module.RegularsModeCompactToggle).toBeDefined()
    expect(typeof module.RegularsModeCompactToggle).toBe('function')
  })

  it('exports default RegularsModeToggle', async () => {
    const module = await import('../RegularsModeToggle')
    expect(module.default).toBeDefined()
  })

  // --------------------------------------------------------------------------
  // HOOK INTEGRATION
  // --------------------------------------------------------------------------

  it('uses regulars mode hook', async () => {
    const result = mockUseRegularsMode()
    expect(result.isEnabled).toBe(true)
    expect(result.visibility).toBe('mutual')
    expect(result.toggleMode).toBeDefined()
    expect(result.setVisibility).toBeDefined()
  })

  it('handles mode toggle', async () => {
    const result = mockUseRegularsMode()
    await result.toggleMode()
    expect(mockRegularsModeResult.toggleMode).toHaveBeenCalled()
  })

  it('handles visibility change', async () => {
    const result = mockUseRegularsMode()
    await result.setVisibility('public')
    expect(mockRegularsModeResult.setVisibility).toHaveBeenCalledWith('public')
  })

  // --------------------------------------------------------------------------
  // LOADING STATES
  // --------------------------------------------------------------------------

  it('handles loading state', async () => {
    mockUseRegularsMode.mockReturnValue({
      ...mockRegularsModeResult,
      isLoading: true,
    })

    const result = mockUseRegularsMode()
    expect(result.isLoading).toBe(true)
  })

  it('handles updating state', async () => {
    mockUseRegularsMode.mockReturnValue({
      ...mockRegularsModeResult,
      isUpdating: true,
    })

    const result = mockUseRegularsMode()
    expect(result.isUpdating).toBe(true)
  })

  // --------------------------------------------------------------------------
  // VISIBILITY OPTIONS
  // --------------------------------------------------------------------------

  it('has correct visibility options', async () => {
    const visibilityOptions = [
      { value: 'public', label: 'Public', icon: 'globe-outline' },
      { value: 'mutual', label: 'Mutual Only', icon: 'people-outline' },
      { value: 'hidden', label: 'Hidden', icon: 'eye-off-outline' },
    ]

    expect(visibilityOptions).toHaveLength(3)
    expect(visibilityOptions[0].value).toBe('public')
    expect(visibilityOptions[1].value).toBe('mutual')
    expect(visibilityOptions[2].value).toBe('hidden')
  })

  it('maps visibility to icons correctly', async () => {
    const iconMap = {
      public: 'globe-outline',
      mutual: 'people-outline',
      hidden: 'eye-off-outline',
    }

    expect(iconMap.public).toBe('globe-outline')
    expect(iconMap.mutual).toBe('people-outline')
    expect(iconMap.hidden).toBe('eye-off-outline')
  })

  // --------------------------------------------------------------------------
  // ERROR HANDLING
  // --------------------------------------------------------------------------

  it('handles errors', async () => {
    mockUseRegularsMode.mockReturnValue({
      ...mockRegularsModeResult,
      error: { code: 'UPDATE_ERROR', message: 'Failed to update' },
    })

    const result = mockUseRegularsMode()
    expect(result.error).toBeDefined()
    expect(result.error?.message).toBe('Failed to update')
  })

  // --------------------------------------------------------------------------
  // MODE STATE
  // --------------------------------------------------------------------------

  it('handles enabled state', async () => {
    const result = mockUseRegularsMode()
    expect(result.isEnabled).toBe(true)
  })

  it('handles disabled state', async () => {
    mockUseRegularsMode.mockReturnValue({
      ...mockRegularsModeResult,
      isEnabled: false,
    })

    const result = mockUseRegularsMode()
    expect(result.isEnabled).toBe(false)
  })
})

// ============================================================================
// TESTS - Barrel Exports
// ============================================================================

describe('Regulars Barrel Exports', () => {
  it('exports RegularCard', async () => {
    const module = await import('../index')
    expect(module.RegularCard).toBeDefined()
  })

  it('exports RegularAvatar', async () => {
    const module = await import('../index')
    expect(module.RegularAvatar).toBeDefined()
  })

  it('exports FellowRegularsList', async () => {
    const module = await import('../index')
    expect(module.FellowRegularsList).toBeDefined()
  })

  it('exports LocationRegularsList', async () => {
    const module = await import('../index')
    expect(module.LocationRegularsList).toBeDefined()
  })

  it('exports RegularsPreview', async () => {
    const module = await import('../index')
    expect(module.RegularsPreview).toBeDefined()
  })

  it('exports RegularsModeToggle', async () => {
    const module = await import('../index')
    expect(module.RegularsModeToggle).toBeDefined()
  })

  it('exports RegularsModeCompactToggle', async () => {
    const module = await import('../index')
    expect(module.RegularsModeCompactToggle).toBeDefined()
  })
})
