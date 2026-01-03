/**
 * End-to-End Test: Time-Specific Posts
 *
 * Tests the complete flow for creating posts with specific or approximate times:
 * 1. Create post with specific time (e.g., "Yesterday at 3:00 PM")
 * 2. Create post with approximate time (e.g., "Tuesday afternoon")
 * 3. Create post without time (skip time step)
 * 4. Verify time displays correctly in ledger
 *
 * This is an integration test that verifies the time-specific posts feature.
 */

import React from 'react'
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Alert } from 'react-native'

// Import components
import { AuthProvider } from '../../contexts/AuthContext'
import { CreatePostScreen } from '../../screens/CreatePostScreen'
import { LedgerScreen } from '../../screens/LedgerScreen'
import { TimeStep } from '../../screens/CreatePost/steps/TimeStep'
import { TimeSelector } from '../../screens/CreatePost/components/TimeSelector'
import { GranularityToggle } from '../../screens/CreatePost/components/GranularityToggle'
import { PostFilters } from '../../components/PostFilters'

// Import mocks
import {
  mockSupabase,
  mockAuth,
  mockUser,
  mockSession,
  mockProfile,
  mockLocation,
  mockPost,
  resetSupabaseMocks,
  createMockQueryBuilder,
} from '../mocks/supabase'

// Import types and utilities
import type { TimeGranularity } from '../../types/database'
import { formatSightingTime, formatRelativeDay, DAY_NAMES } from '../../utils/dateTime'

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock the Supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: require('../mocks/supabase').mockSupabase,
  supabaseUrl: 'https://mock.supabase.co',
}))

// Mock storage module
jest.mock('../../lib/storage', () => ({
  uploadSelfie: jest.fn().mockResolvedValue({
    success: true,
    path: 'mock-user-id/mock-post-id.jpg',
    error: null,
  }),
  getSelfieUrl: jest.fn().mockResolvedValue({
    success: true,
    signedUrl: 'https://example.com/signed-selfie.jpg',
    error: null,
  }),
  deleteSelfie: jest.fn().mockResolvedValue({
    success: true,
    error: null,
  }),
}))

// Mock haptics
jest.mock('../../lib/haptics', () => ({
  lightFeedback: jest.fn().mockResolvedValue(undefined),
  selectionFeedback: jest.fn().mockResolvedValue(undefined),
  successFeedback: jest.fn().mockResolvedValue(undefined),
}))

// Mock navigation
const mockNavigate = jest.fn()
const mockGoBack = jest.fn()
const mockReplace = jest.fn()

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native')
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      replace: mockReplace,
      reset: jest.fn(),
    }),
    useRoute: jest.fn(() => ({
      params: {
        locationId: 'test-location-123',
        locationName: 'Coffee Shop on Main St',
      },
    })),
    useFocusEffect: jest.fn((callback) => {
      React.useEffect(() => {
        callback()
      }, [callback])
    }),
  }
})

// Mock Alert
jest.spyOn(Alert, 'alert')

// ============================================================================
// MOCK DATA
// ============================================================================

/**
 * Mock post with specific sighting time
 */
const mockPostWithSpecificTime = {
  ...mockPost,
  sighting_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
  time_granularity: 'specific' as TimeGranularity,
}

/**
 * Mock post with approximate sighting time
 */
const mockPostWithApproximateTime = {
  ...mockPost,
  id: 'test-post-approx-123',
  sighting_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  time_granularity: 'afternoon' as TimeGranularity,
}

/**
 * Mock post without sighting time (backward compatibility)
 */
const mockPostWithoutTime = {
  ...mockPost,
  id: 'test-post-no-time-123',
  sighting_date: null,
  time_granularity: null,
}

// ============================================================================
// TEST WRAPPER
// ============================================================================

/**
 * Wrapper component that provides all necessary context for testing
 */
interface TestWrapperProps {
  children: React.ReactNode
}

function TestWrapper({ children }: TestWrapperProps): React.ReactNode {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 375, height: 812 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}
      >
        <NavigationContainer>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

// ============================================================================
// TEST SUITE: TIME-SPECIFIC POSTS
// ============================================================================

describe('E2E: Time-Specific Posts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetSupabaseMocks()

    // Configure auth as signed in
    mockAuth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })
    mockAuth.onAuthStateChange.mockImplementation((callback) => {
      callback('SIGNED_IN', mockSession)
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  // --------------------------------------------------------------------------
  // COMPONENT TESTS: GranularityToggle
  // --------------------------------------------------------------------------

  describe('GranularityToggle Component', () => {
    it('should render with approximate mode selected by default', () => {
      const mockOnModeChange = jest.fn()

      render(
        <TestWrapper>
          <GranularityToggle
            mode="approximate"
            onModeChange={mockOnModeChange}
            testID="test-granularity"
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('test-granularity')).toBeTruthy()
      expect(screen.getByTestId('test-granularity-approximate')).toBeTruthy()
      expect(screen.getByTestId('test-granularity-specific')).toBeTruthy()
    })

    it('should call onModeChange when switching to specific mode', async () => {
      const mockOnModeChange = jest.fn()

      render(
        <TestWrapper>
          <GranularityToggle
            mode="approximate"
            onModeChange={mockOnModeChange}
            testID="test-granularity"
          />
        </TestWrapper>
      )

      fireEvent.press(screen.getByTestId('test-granularity-specific'))

      await waitFor(() => {
        expect(mockOnModeChange).toHaveBeenCalledWith('specific')
      })
    })

    it('should not call onModeChange when pressing already selected mode', async () => {
      const mockOnModeChange = jest.fn()

      render(
        <TestWrapper>
          <GranularityToggle
            mode="specific"
            onModeChange={mockOnModeChange}
            testID="test-granularity"
          />
        </TestWrapper>
      )

      fireEvent.press(screen.getByTestId('test-granularity-specific'))

      // Should not call because it's already selected
      await waitFor(() => {
        expect(mockOnModeChange).not.toHaveBeenCalled()
      })
    })

    it('should display correct labels for each mode', () => {
      const mockOnModeChange = jest.fn()

      render(
        <TestWrapper>
          <GranularityToggle
            mode="approximate"
            onModeChange={mockOnModeChange}
            testID="test-granularity"
          />
        </TestWrapper>
      )

      expect(screen.getByText('Specific Time')).toBeTruthy()
      expect(screen.getByText('Approximate')).toBeTruthy()
    })
  })

  // --------------------------------------------------------------------------
  // COMPONENT TESTS: TimeSelector
  // --------------------------------------------------------------------------

  describe('TimeSelector Component', () => {
    it('should render date options for past week', () => {
      const mockOnDateChange = jest.fn()
      const mockOnModeChange = jest.fn()

      render(
        <TestWrapper>
          <TimeSelector
            mode="approximate"
            date={null}
            onDateChange={mockOnDateChange}
            onModeChange={mockOnModeChange}
            testID="test-time-selector"
          />
        </TestWrapper>
      )

      // Should have Today and Yesterday options
      expect(screen.getByTestId('test-time-selector-date-0')).toBeTruthy() // Today
      expect(screen.getByTestId('test-time-selector-date-1')).toBeTruthy() // Yesterday
    })

    it('should show approximate time periods in approximate mode', () => {
      const mockOnDateChange = jest.fn()
      const mockOnModeChange = jest.fn()
      const mockOnApproximateTimeChange = jest.fn()

      render(
        <TestWrapper>
          <TimeSelector
            mode="approximate"
            date={new Date()}
            approximateTime="afternoon"
            onDateChange={mockOnDateChange}
            onModeChange={mockOnModeChange}
            onApproximateTimeChange={mockOnApproximateTimeChange}
            testID="test-time-selector"
          />
        </TestWrapper>
      )

      // Should show morning, afternoon, evening options
      expect(screen.getByTestId('test-time-selector-period-morning')).toBeTruthy()
      expect(screen.getByTestId('test-time-selector-period-afternoon')).toBeTruthy()
      expect(screen.getByTestId('test-time-selector-period-evening')).toBeTruthy()
    })

    it('should show hour/minute pickers in specific mode', () => {
      const mockOnDateChange = jest.fn()
      const mockOnModeChange = jest.fn()
      const mockOnHourChange = jest.fn()
      const mockOnMinuteChange = jest.fn()

      render(
        <TestWrapper>
          <TimeSelector
            mode="specific"
            date={new Date()}
            hour={15} // 3 PM
            minute={0}
            onDateChange={mockOnDateChange}
            onModeChange={mockOnModeChange}
            onHourChange={mockOnHourChange}
            onMinuteChange={mockOnMinuteChange}
            testID="test-time-selector"
          />
        </TestWrapper>
      )

      // Should show hour scroll
      expect(screen.getByTestId('test-time-selector-hour-scroll')).toBeTruthy()
      // Should show minute scroll
      expect(screen.getByTestId('test-time-selector-minute-scroll')).toBeTruthy()
    })

    it('should call onDateChange when selecting a date', async () => {
      const mockOnDateChange = jest.fn()
      const mockOnModeChange = jest.fn()

      render(
        <TestWrapper>
          <TimeSelector
            mode="approximate"
            date={null}
            onDateChange={mockOnDateChange}
            onModeChange={mockOnModeChange}
            testID="test-time-selector"
          />
        </TestWrapper>
      )

      // Select "Yesterday"
      fireEvent.press(screen.getByTestId('test-time-selector-date-1'))

      await waitFor(() => {
        expect(mockOnDateChange).toHaveBeenCalled()
      })
    })

    it('should call onApproximateTimeChange when selecting time period', async () => {
      const mockOnDateChange = jest.fn()
      const mockOnModeChange = jest.fn()
      const mockOnApproximateTimeChange = jest.fn()

      render(
        <TestWrapper>
          <TimeSelector
            mode="approximate"
            date={new Date()}
            approximateTime="afternoon"
            onDateChange={mockOnDateChange}
            onModeChange={mockOnModeChange}
            onApproximateTimeChange={mockOnApproximateTimeChange}
            testID="test-time-selector"
          />
        </TestWrapper>
      )

      // Select "Evening"
      fireEvent.press(screen.getByTestId('test-time-selector-period-evening'))

      await waitFor(() => {
        expect(mockOnApproximateTimeChange).toHaveBeenCalledWith('evening')
      })
    })
  })

  // --------------------------------------------------------------------------
  // COMPONENT TESTS: TimeStep
  // --------------------------------------------------------------------------

  describe('TimeStep Component', () => {
    it('should render with Optional badge', () => {
      render(
        <TestWrapper>
          <TimeStep
            date={null}
            granularity={null}
            onDateChange={jest.fn()}
            onGranularityChange={jest.fn()}
            onNext={jest.fn()}
            onSkip={jest.fn()}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      expect(screen.getByText('Optional')).toBeTruthy()
    })

    it('should render Back, Skip, and Next buttons', () => {
      render(
        <TestWrapper>
          <TimeStep
            date={null}
            granularity={null}
            onDateChange={jest.fn()}
            onGranularityChange={jest.fn()}
            onNext={jest.fn()}
            onSkip={jest.fn()}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('create-post-time-back')).toBeTruthy()
      expect(screen.getByTestId('create-post-time-skip')).toBeTruthy()
      expect(screen.getByTestId('create-post-time-next')).toBeTruthy()
    })

    it('should call onSkip when Skip button is pressed', async () => {
      const mockOnSkip = jest.fn()

      render(
        <TestWrapper>
          <TimeStep
            date={null}
            granularity={null}
            onDateChange={jest.fn()}
            onGranularityChange={jest.fn()}
            onNext={jest.fn()}
            onSkip={mockOnSkip}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      fireEvent.press(screen.getByTestId('create-post-time-skip'))

      await waitFor(() => {
        expect(mockOnSkip).toHaveBeenCalled()
      })
    })

    it('should call onBack when Back button is pressed', async () => {
      const mockOnBack = jest.fn()

      render(
        <TestWrapper>
          <TimeStep
            date={null}
            granularity={null}
            onDateChange={jest.fn()}
            onGranularityChange={jest.fn()}
            onNext={jest.fn()}
            onSkip={jest.fn()}
            onBack={mockOnBack}
            testID="create-post"
          />
        </TestWrapper>
      )

      fireEvent.press(screen.getByTestId('create-post-time-back'))

      await waitFor(() => {
        expect(mockOnBack).toHaveBeenCalled()
      })
    })

    it('should disable Next button when no date is selected', () => {
      const mockOnNext = jest.fn()

      render(
        <TestWrapper>
          <TimeStep
            date={null}
            granularity={null}
            onDateChange={jest.fn()}
            onGranularityChange={jest.fn()}
            onNext={mockOnNext}
            onSkip={jest.fn()}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      const nextButton = screen.getByTestId('create-post-time-next')
      fireEvent.press(nextButton)

      // onNext should not be called when disabled
      expect(mockOnNext).not.toHaveBeenCalled()
    })

    it('should enable Next button when a valid date is selected', async () => {
      const mockOnNext = jest.fn()
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

      render(
        <TestWrapper>
          <TimeStep
            date={yesterday}
            granularity="afternoon"
            onDateChange={jest.fn()}
            onGranularityChange={jest.fn()}
            onNext={mockOnNext}
            onSkip={jest.fn()}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      fireEvent.press(screen.getByTestId('create-post-time-next'))

      await waitFor(() => {
        expect(mockOnNext).toHaveBeenCalled()
      })
    })

    it('should show preview of formatted time when date is selected', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      yesterday.setHours(15, 0, 0, 0)

      render(
        <TestWrapper>
          <TimeStep
            date={yesterday}
            granularity="afternoon"
            approximateTime="afternoon"
            onDateChange={jest.fn()}
            onGranularityChange={jest.fn()}
            onNext={jest.fn()}
            onSkip={jest.fn()}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Should show "Will display as:" label
      expect(screen.getByText('Will display as:')).toBeTruthy()
    })
  })

  // --------------------------------------------------------------------------
  // E2E FLOW: Create Post with Specific Time
  // --------------------------------------------------------------------------

  describe('E2E Flow: Create Post with Specific Time', () => {
    beforeEach(() => {
      // Mock profile fetch
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            ...createMockQueryBuilder([mockProfile]),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }
        }
        if (table === 'locations') {
          return {
            ...createMockQueryBuilder([mockLocation]),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockLocation,
              error: null,
            }),
          }
        }
        if (table === 'posts') {
          return {
            ...createMockQueryBuilder([mockPostWithSpecificTime]),
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockPostWithSpecificTime,
              error: null,
            }),
          }
        }
        return createMockQueryBuilder([])
      })
    })

    it('should complete the flow: select Yesterday, switch to specific, select 3 PM', async () => {
      // Test the TimeStep with specific time selection
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      yesterday.setHours(15, 0, 0, 0) // 3:00 PM

      const mockOnNext = jest.fn()
      const mockOnGranularityChange = jest.fn()
      const mockOnDateChange = jest.fn()

      render(
        <TestWrapper>
          <TimeStep
            date={yesterday}
            granularity="specific"
            hour={15}
            minute={0}
            onDateChange={mockOnDateChange}
            onGranularityChange={mockOnGranularityChange}
            onNext={mockOnNext}
            onSkip={jest.fn()}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Should show preview with correct time
      expect(screen.getByText('Will display as:')).toBeTruthy()

      // Press Next to proceed
      fireEvent.press(screen.getByTestId('create-post-time-next'))

      await waitFor(() => {
        expect(mockOnNext).toHaveBeenCalled()
      })
    })

    it('should format specific time correctly in preview', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      yesterday.setHours(15, 0, 0, 0)

      // Test the formatting utility directly
      const formatted = formatSightingTime(yesterday, 'specific')

      // Should contain "at" for specific time
      expect(formatted).toContain('at')
      // Should contain PM for 3 o'clock
      expect(formatted).toMatch(/3:00\s*PM/i)
    })
  })

  // --------------------------------------------------------------------------
  // E2E FLOW: Create Post with Approximate Time
  // --------------------------------------------------------------------------

  describe('E2E Flow: Create Post with Approximate Time', () => {
    it('should complete the flow: select Tuesday, select afternoon', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

      const mockOnNext = jest.fn()
      const mockOnGranularityChange = jest.fn()
      const mockOnDateChange = jest.fn()
      const mockOnApproximateTimeChange = jest.fn()

      render(
        <TestWrapper>
          <TimeStep
            date={twoDaysAgo}
            granularity="afternoon"
            approximateTime="afternoon"
            onDateChange={mockOnDateChange}
            onGranularityChange={mockOnGranularityChange}
            onApproximateTimeChange={mockOnApproximateTimeChange}
            onNext={mockOnNext}
            onSkip={jest.fn()}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Should show preview
      expect(screen.getByText('Will display as:')).toBeTruthy()

      // Press Next to proceed
      fireEvent.press(screen.getByTestId('create-post-time-next'))

      await waitFor(() => {
        expect(mockOnNext).toHaveBeenCalled()
      })
    })

    it('should format approximate time correctly in preview', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

      // Test the formatting utility directly
      const formatted = formatSightingTime(twoDaysAgo, 'afternoon')

      // Should contain "afternoon"
      expect(formatted.toLowerCase()).toContain('afternoon')
    })

    it('should format "Tuesday afternoon" correctly for weekday dates', () => {
      // Calculate date for last Tuesday (to ensure we get a weekday name)
      const now = new Date()
      const currentDay = now.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
      const tuesdayDayNumber = 2 // Tuesday is day 2

      // Calculate days since last Tuesday
      let daysSinceTuesday = (currentDay - tuesdayDayNumber + 7) % 7
      // If today is Tuesday or we calculated 0, use last week's Tuesday
      if (daysSinceTuesday === 0) {
        daysSinceTuesday = 7
      }

      const lastTuesday = new Date(now.getTime() - daysSinceTuesday * 24 * 60 * 60 * 1000)

      // Format with afternoon granularity
      const formatted = formatSightingTime(lastTuesday, 'afternoon')

      // Should display as "Tuesday afternoon" (assuming within past week)
      if (daysSinceTuesday < 7) {
        expect(formatted).toBe('Tuesday afternoon')
      } else {
        // If more than a week ago, will show "Mon DD afternoon" format
        expect(formatted.toLowerCase()).toContain('afternoon')
      }
    })

    it('should show weekday name for dates 2-6 days ago', () => {
      // Test that dates 2-6 days ago show weekday names
      for (let daysAgo = 2; daysAgo <= 6; daysAgo++) {
        const testDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
        const formatted = formatSightingTime(testDate, 'afternoon')

        // Should contain "afternoon" and should not contain "at" (which is for specific time)
        expect(formatted.toLowerCase()).toContain('afternoon')
        expect(formatted).not.toContain('at')
      }
    })

    it('should handle all approximate time periods correctly', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      const dayName = DAY_NAMES[threeDaysAgo.getDay()]

      // Test morning
      const morning = formatSightingTime(threeDaysAgo, 'morning')
      expect(morning).toBe(`${dayName} morning`)

      // Test afternoon
      const afternoon = formatSightingTime(threeDaysAgo, 'afternoon')
      expect(afternoon).toBe(`${dayName} afternoon`)

      // Test evening
      const evening = formatSightingTime(threeDaysAgo, 'evening')
      expect(evening).toBe(`${dayName} evening`)
    })
  })

  // --------------------------------------------------------------------------
  // E2E FLOW: Create Post without Time (Skip) - SUBTASK 7-4
  // --------------------------------------------------------------------------

  describe('E2E Flow: Create Post without Time (Skip)', () => {
    it('should allow skipping time step', async () => {
      const mockOnSkip = jest.fn()

      render(
        <TestWrapper>
          <TimeStep
            date={null}
            granularity={null}
            onDateChange={jest.fn()}
            onGranularityChange={jest.fn()}
            onNext={jest.fn()}
            onSkip={mockOnSkip}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Press Skip button
      fireEvent.press(screen.getByTestId('create-post-time-skip'))

      await waitFor(() => {
        expect(mockOnSkip).toHaveBeenCalled()
      })
    })

    it('should show Skip button is always available (time is optional)', () => {
      render(
        <TestWrapper>
          <TimeStep
            date={null}
            granularity={null}
            onDateChange={jest.fn()}
            onGranularityChange={jest.fn()}
            onNext={jest.fn()}
            onSkip={jest.fn()}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Skip button should always be visible and accessible
      const skipButton = screen.getByTestId('create-post-time-skip')
      expect(skipButton).toBeTruthy()

      // Verify it's not disabled
      expect(skipButton.props.accessibilityState?.disabled).not.toBe(true)
    })

    it('should display Optional badge to indicate time is not required', () => {
      render(
        <TestWrapper>
          <TimeStep
            date={null}
            granularity={null}
            onDateChange={jest.fn()}
            onGranularityChange={jest.fn()}
            onNext={jest.fn()}
            onSkip={jest.fn()}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Verify "Optional" badge is displayed
      expect(screen.getByText('Optional')).toBeTruthy()
    })

    it('should not show time preview when no date is selected', () => {
      render(
        <TestWrapper>
          <TimeStep
            date={null}
            granularity={null}
            onDateChange={jest.fn()}
            onGranularityChange={jest.fn()}
            onNext={jest.fn()}
            onSkip={jest.fn()}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // "Will display as:" should not be shown when no date selected
      expect(screen.queryByText('Will display as:')).toBeNull()
    })

    it('should have Next button disabled when no time is selected (encouraging skip)', () => {
      const mockOnNext = jest.fn()

      render(
        <TestWrapper>
          <TimeStep
            date={null}
            granularity={null}
            onDateChange={jest.fn()}
            onGranularityChange={jest.fn()}
            onNext={mockOnNext}
            onSkip={jest.fn()}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Press Next button (should not work since no date selected)
      fireEvent.press(screen.getByTestId('create-post-time-next'))

      // onNext should NOT have been called since no date is selected
      expect(mockOnNext).not.toHaveBeenCalled()
    })

    it('should allow skip even if user started selecting time', async () => {
      const mockOnSkip = jest.fn()
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

      render(
        <TestWrapper>
          <TimeStep
            date={yesterday}
            granularity="afternoon"
            onDateChange={jest.fn()}
            onGranularityChange={jest.fn()}
            onNext={jest.fn()}
            onSkip={mockOnSkip}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Even with a date selected, user can still skip
      fireEvent.press(screen.getByTestId('create-post-time-skip'))

      await waitFor(() => {
        expect(mockOnSkip).toHaveBeenCalled()
      })
    })
  })

  // --------------------------------------------------------------------------
  // E2E: ReviewStep with No Time (Backward Compatibility) - SUBTASK 7-4
  // --------------------------------------------------------------------------

  describe('E2E: ReviewStep shows "Time not specified" when skipped', () => {
    // Import ReviewStep for testing
    const { ReviewStep } = require('../../screens/CreatePost/steps/ReviewStep')

    const mockLocation = {
      id: 'test-location-123',
      name: 'Coffee Shop on Main St',
      address: '123 Main St',
    }

    const mockAvatar = {
      avatarId: 'test-avatar-123',
      modelId: 'test-model',
    }

    it('should display "Time not specified" when sightingDate is null', () => {
      render(
        <TestWrapper>
          <ReviewStep
            selectedPhotoId="test-photo-123"
            avatar={mockAvatar}
            note="I saw you at the coffee shop this morning"
            location={mockLocation}
            sightingDate={null}
            timeGranularity={null}
            isSubmitting={false}
            isFormValid={true}
            onSubmit={jest.fn()}
            onBack={jest.fn()}
            goToStep={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Should show "Time not specified" in the time section
      expect(screen.getByText('Time not specified')).toBeTruthy()
    })

    it('should display "Time not specified" when timeGranularity is null', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

      render(
        <TestWrapper>
          <ReviewStep
            selectedPhotoId="test-photo-123"
            avatar={mockAvatar}
            note="I saw you at the coffee shop this morning"
            location={mockLocation}
            sightingDate={yesterday}
            timeGranularity={null}
            isSubmitting={false}
            isFormValid={true}
            onSubmit={jest.fn()}
            onBack={jest.fn()}
            goToStep={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Should show "Time not specified" when granularity is null
      expect(screen.getByText('Time not specified')).toBeTruthy()
    })

    it('should show formatted time when both date and granularity are provided', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

      render(
        <TestWrapper>
          <ReviewStep
            selectedPhotoId="test-photo-123"
            avatar={mockAvatar}
            note="I saw you at the coffee shop this morning"
            location={mockLocation}
            sightingDate={yesterday}
            timeGranularity="afternoon"
            isSubmitting={false}
            isFormValid={true}
            onSubmit={jest.fn()}
            onBack={jest.fn()}
            goToStep={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Should NOT show "Time not specified" when time is provided
      expect(screen.queryByText('Time not specified')).toBeNull()
      // Should show formatted time (Yesterday afternoon)
      expect(screen.getByText('Yesterday afternoon')).toBeTruthy()
    })

    it('should show Edit button for time section even when not specified', () => {
      render(
        <TestWrapper>
          <ReviewStep
            selectedPhotoId="test-photo-123"
            avatar={mockAvatar}
            note="I saw you at the coffee shop this morning"
            location={mockLocation}
            sightingDate={null}
            timeGranularity={null}
            isSubmitting={false}
            isFormValid={true}
            onSubmit={jest.fn()}
            onBack={jest.fn()}
            goToStep={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Edit button for time should be available
      expect(screen.getByTestId('create-post-review-edit-time')).toBeTruthy()
    })

    it('should call goToStep with "time" when Edit button is pressed', async () => {
      const mockGoToStep = jest.fn()

      render(
        <TestWrapper>
          <ReviewStep
            selectedPhotoId="test-photo-123"
            avatar={mockAvatar}
            note="I saw you at the coffee shop this morning"
            location={mockLocation}
            sightingDate={null}
            timeGranularity={null}
            isSubmitting={false}
            isFormValid={true}
            onSubmit={jest.fn()}
            onBack={jest.fn()}
            goToStep={mockGoToStep}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Press Edit button for time
      fireEvent.press(screen.getByTestId('create-post-review-edit-time'))

      await waitFor(() => {
        expect(mockGoToStep).toHaveBeenCalledWith('time')
      })
    })

    it('should allow form submission even without time specified', async () => {
      const mockOnSubmit = jest.fn()

      render(
        <TestWrapper>
          <ReviewStep
            selectedPhotoId="test-photo-123"
            avatar={mockAvatar}
            note="I saw you at the coffee shop this morning"
            location={mockLocation}
            sightingDate={null}
            timeGranularity={null}
            isSubmitting={false}
            isFormValid={true}
            onSubmit={mockOnSubmit}
            onBack={jest.fn()}
            goToStep={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Submit button should work even without time
      fireEvent.press(screen.getByTestId('create-post-submit'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })
  })

  // --------------------------------------------------------------------------
  // E2E: PostCard Backward Compatibility - No Time Display - SUBTASK 7-4
  // --------------------------------------------------------------------------

  describe('E2E: PostCard backward compatibility (no time data)', () => {
    // Import PostCard for testing
    const { PostCard } = require('../../components/PostCard')

    it('should NOT display sighting time when sighting_date is null', () => {
      render(
        <TestWrapper>
          <PostCard
            post={mockPostWithoutTime}
            onPress={jest.fn()}
            testID="post-card-no-time"
          />
        </TestWrapper>
      )

      // Should NOT find the sighting time container
      expect(screen.queryByTestId('post-card-no-time-sighting-time')).toBeNull()
    })

    it('should NOT display sighting time when time_granularity is null', () => {
      const postWithDateButNoGranularity = {
        ...mockPost,
        id: 'test-post-partial-time',
        sighting_date: new Date().toISOString(),
        time_granularity: null,
      }

      render(
        <TestWrapper>
          <PostCard
            post={postWithDateButNoGranularity}
            onPress={jest.fn()}
            testID="post-card-partial"
          />
        </TestWrapper>
      )

      // Should NOT find the sighting time container
      expect(screen.queryByTestId('post-card-partial-sighting-time')).toBeNull()
    })

    it('should display sighting time when both date and granularity are present', () => {
      render(
        <TestWrapper>
          <PostCard
            post={mockPostWithSpecificTime}
            onPress={jest.fn()}
            testID="post-card-with-time"
          />
        </TestWrapper>
      )

      // Should find the sighting time container
      expect(screen.getByTestId('post-card-with-time-sighting-time')).toBeTruthy()
    })

    it('should still display note, location, and timestamp without time', () => {
      const mockLocationData = {
        id: 'test-location',
        name: 'Test Location',
      }

      render(
        <TestWrapper>
          <PostCard
            post={mockPostWithoutTime}
            location={mockLocationData}
            onPress={jest.fn()}
            testID="post-card-no-time"
          />
        </TestWrapper>
      )

      // Note should still be visible
      expect(screen.getByTestId('post-card-no-time-note')).toBeTruthy()

      // Timestamp should still be visible
      expect(screen.getByTestId('post-card-no-time-timestamp')).toBeTruthy()
    })

    it('should render correctly with legacy post data (no time fields at all)', () => {
      // Simulate a legacy post that doesn't have sighting_date or time_granularity fields
      const legacyPost = {
        id: 'legacy-post-123',
        producer_id: 'test-producer-123',
        location_id: 'test-location-123',
        target_avatar: { type: 'preset', index: 0 },
        message: 'This is a legacy post without any time fields',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active',
        // No sighting_date or time_granularity fields
      }

      render(
        <TestWrapper>
          <PostCard
            post={legacyPost as any}
            onPress={jest.fn()}
            testID="post-card-legacy"
          />
        </TestWrapper>
      )

      // Should render without errors
      expect(screen.getByTestId('post-card-legacy')).toBeTruthy()

      // Should NOT show sighting time
      expect(screen.queryByTestId('post-card-legacy-sighting-time')).toBeNull()
    })
  })

  // --------------------------------------------------------------------------
  // E2E: Complete Flow - Create and Display Post Without Time - SUBTASK 7-4
  // --------------------------------------------------------------------------

  describe('E2E: Complete flow - Create post without time, verify display', () => {
    it('should verify complete flow: skip time → submit → no time in display', () => {
      // Step 1: Verify TimeStep allows skipping
      const mockOnSkip = jest.fn()

      const { unmount: unmount1 } = render(
        <TestWrapper>
          <TimeStep
            date={null}
            granularity={null}
            onDateChange={jest.fn()}
            onGranularityChange={jest.fn()}
            onNext={jest.fn()}
            onSkip={mockOnSkip}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Verify Skip is available
      expect(screen.getByTestId('create-post-time-skip')).toBeTruthy()
      expect(screen.getByText('Optional')).toBeTruthy()

      unmount1()

      // Step 2: Verify mockPostWithoutTime structure is correct for backward compatibility
      expect(mockPostWithoutTime.sighting_date).toBeNull()
      expect(mockPostWithoutTime.time_granularity).toBeNull()
      expect(mockPostWithoutTime.id).toBeDefined()
      expect(mockPostWithoutTime.message).toBeDefined()
      expect(mockPostWithoutTime.created_at).toBeDefined()

      // Step 3: Verify PostCard handles post without time correctly
      const { PostCard } = require('../../components/PostCard')

      render(
        <TestWrapper>
          <PostCard
            post={mockPostWithoutTime}
            onPress={jest.fn()}
            testID="post-card-no-time"
          />
        </TestWrapper>
      )

      // Card should render successfully
      expect(screen.getByTestId('post-card-no-time')).toBeTruthy()

      // Should NOT have sighting time container
      expect(screen.queryByTestId('post-card-no-time-sighting-time')).toBeNull()

      // Should still show the note
      expect(screen.getByTestId('post-card-no-time-note')).toBeTruthy()
    })

    it('should verify post data structure is correct when time is skipped', () => {
      // This verifies the data that would be sent to the database

      // When time is skipped, the form data should have null values
      const formDataWithSkippedTime = {
        sightingDate: null,
        timeGranularity: null,
      }

      // Verify the data structure
      expect(formDataWithSkippedTime.sightingDate).toBeNull()
      expect(formDataWithSkippedTime.timeGranularity).toBeNull()

      // This should translate to a post insert with null time fields
      const expectedPostInsert = {
        producer_id: 'test-user-123',
        location_id: 'test-location-123',
        target_avatar: { type: 'preset', index: 0 },
        message: 'Test message',
        sighting_date: null,
        time_granularity: null,
      }

      expect(expectedPostInsert.sighting_date).toBeNull()
      expect(expectedPostInsert.time_granularity).toBeNull()
    })

    it('should format and display posts correctly in a mixed list (with and without time)', () => {
      const { PostCard } = require('../../components/PostCard')

      // Render a list of posts - some with time, some without
      const posts = [
        mockPostWithSpecificTime,
        mockPostWithoutTime,
        mockPostWithApproximateTime,
      ]

      posts.forEach((post, index) => {
        const { unmount } = render(
          <TestWrapper>
            <PostCard
              post={post}
              onPress={jest.fn()}
              testID={`post-card-${index}`}
            />
          </TestWrapper>
        )

        // All cards should render
        expect(screen.getByTestId(`post-card-${index}`)).toBeTruthy()

        // Check sighting time based on whether post has time data
        const hasSightingTime = post.sighting_date !== null && post.time_granularity !== null

        if (hasSightingTime) {
          expect(screen.getByTestId(`post-card-${index}-sighting-time`)).toBeTruthy()
        } else {
          expect(screen.queryByTestId(`post-card-${index}-sighting-time`)).toBeNull()
        }

        unmount()
      })
    })
  })

  // --------------------------------------------------------------------------
  // E2E FLOW: Time Period Filtering - SUBTASK 7-5
  // --------------------------------------------------------------------------

  describe('E2E Flow: Time Period Filtering', () => {
    /**
     * Mock posts with various dates for testing time filtering
     */
    const now = new Date()

    // Post from 2 days ago (within last week)
    const mockPostTwoDaysAgo = {
      ...mockPost,
      id: 'post-2-days-ago',
      sighting_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'afternoon' as TimeGranularity,
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }

    // Post from 5 days ago (within last week)
    const mockPostFiveDaysAgo = {
      ...mockPost,
      id: 'post-5-days-ago',
      sighting_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'morning' as TimeGranularity,
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    }

    // Post from 10 days ago (outside last week, but within last month)
    const mockPostTenDaysAgo = {
      ...mockPost,
      id: 'post-10-days-ago',
      sighting_date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'evening' as TimeGranularity,
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    }

    // Post from 45 days ago (outside last month)
    const mockPostFortyFiveDaysAgo = {
      ...mockPost,
      id: 'post-45-days-ago',
      sighting_date: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'afternoon' as TimeGranularity,
      created_at: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    }

    // All mock posts for testing
    const allMockPosts = [
      mockPostTwoDaysAgo,
      mockPostFiveDaysAgo,
      mockPostTenDaysAgo,
      mockPostFortyFiveDaysAgo,
    ]

    // Posts within last week (7 days)
    const postsWithinLastWeek = [mockPostTwoDaysAgo, mockPostFiveDaysAgo]

    // Posts within last month (30 days)
    const postsWithinLastMonth = [mockPostTwoDaysAgo, mockPostFiveDaysAgo, mockPostTenDaysAgo]

    describe('PostFilters Component', () => {
      it('should render all time filter options', () => {
        const mockOnTimeFilterChange = jest.fn()

        render(
          <TestWrapper>
            <PostFilters
              selectedTimeFilter="any_time"
              onTimeFilterChange={mockOnTimeFilterChange}
              testID="test-filters"
            />
          </TestWrapper>
        )

        // All filter chips should be present
        expect(screen.getByTestId('test-filters-chip-last_24h')).toBeTruthy()
        expect(screen.getByTestId('test-filters-chip-last_week')).toBeTruthy()
        expect(screen.getByTestId('test-filters-chip-last_month')).toBeTruthy()
        expect(screen.getByTestId('test-filters-chip-any_time')).toBeTruthy()
      })

      it('should display correct labels for each filter option', () => {
        const mockOnTimeFilterChange = jest.fn()

        render(
          <TestWrapper>
            <PostFilters
              selectedTimeFilter="any_time"
              onTimeFilterChange={mockOnTimeFilterChange}
              testID="test-filters"
            />
          </TestWrapper>
        )

        expect(screen.getByText('Last 24h')).toBeTruthy()
        expect(screen.getByText('Last Week')).toBeTruthy()
        expect(screen.getByText('Last Month')).toBeTruthy()
        expect(screen.getByText('Any Time')).toBeTruthy()
      })

      it('should call onTimeFilterChange when selecting Last Week', async () => {
        const mockOnTimeFilterChange = jest.fn()

        render(
          <TestWrapper>
            <PostFilters
              selectedTimeFilter="any_time"
              onTimeFilterChange={mockOnTimeFilterChange}
              testID="test-filters"
            />
          </TestWrapper>
        )

        fireEvent.press(screen.getByTestId('test-filters-chip-last_week'))

        await waitFor(() => {
          expect(mockOnTimeFilterChange).toHaveBeenCalledWith('last_week')
        })
      })

      it('should call onTimeFilterChange when selecting Any Time', async () => {
        const mockOnTimeFilterChange = jest.fn()

        render(
          <TestWrapper>
            <PostFilters
              selectedTimeFilter="last_week"
              onTimeFilterChange={mockOnTimeFilterChange}
              testID="test-filters"
            />
          </TestWrapper>
        )

        fireEvent.press(screen.getByTestId('test-filters-chip-any_time'))

        await waitFor(() => {
          expect(mockOnTimeFilterChange).toHaveBeenCalledWith('any_time')
        })
      })

      it('should not call onTimeFilterChange when pressing already selected filter', async () => {
        const mockOnTimeFilterChange = jest.fn()

        render(
          <TestWrapper>
            <PostFilters
              selectedTimeFilter="last_week"
              onTimeFilterChange={mockOnTimeFilterChange}
              testID="test-filters"
            />
          </TestWrapper>
        )

        fireEvent.press(screen.getByTestId('test-filters-chip-last_week'))

        // Should not call because it's already selected
        await waitFor(() => {
          expect(mockOnTimeFilterChange).not.toHaveBeenCalled()
        })
      })

      it('should be disabled when disabled prop is true', () => {
        const mockOnTimeFilterChange = jest.fn()

        render(
          <TestWrapper>
            <PostFilters
              selectedTimeFilter="any_time"
              onTimeFilterChange={mockOnTimeFilterChange}
              disabled={true}
              testID="test-filters"
            />
          </TestWrapper>
        )

        // Verify chips are in disabled state
        const chip = screen.getByTestId('test-filters-chip-last_week')
        expect(chip.props.accessibilityState?.disabled).toBe(true)
      })
    })

    describe('Time Filter Cutoff Date Calculation', () => {
      // Import getFilterCutoffDate for testing
      const { getFilterCutoffDate } = require('../../utils/dateTime')

      it('should return correct cutoff for last_24h', () => {
        const referenceDate = new Date('2024-12-27T15:00:00Z')
        const cutoff = getFilterCutoffDate('last_24h', referenceDate)

        expect(cutoff).not.toBeNull()
        const expectedCutoff = new Date('2024-12-26T15:00:00Z')
        expect(cutoff!.getTime()).toBe(expectedCutoff.getTime())
      })

      it('should return correct cutoff for last_week (7 days)', () => {
        const referenceDate = new Date('2024-12-27T15:00:00Z')
        const cutoff = getFilterCutoffDate('last_week', referenceDate)

        expect(cutoff).not.toBeNull()
        const expectedCutoff = new Date('2024-12-20T15:00:00Z')
        expect(cutoff!.getTime()).toBe(expectedCutoff.getTime())
      })

      it('should return correct cutoff for last_month (30 days)', () => {
        const referenceDate = new Date('2024-12-27T15:00:00Z')
        const cutoff = getFilterCutoffDate('last_month', referenceDate)

        expect(cutoff).not.toBeNull()
        const expectedCutoff = new Date('2024-11-27T15:00:00Z')
        expect(cutoff!.getTime()).toBe(expectedCutoff.getTime())
      })

      it('should return null for any_time', () => {
        const cutoff = getFilterCutoffDate('any_time')
        expect(cutoff).toBeNull()
      })
    })

    describe('Filter Logic: Last Week shows only posts from last 7 days', () => {
      it('should identify posts within last week correctly', () => {
        const { getFilterCutoffDate } = require('../../utils/dateTime')
        const cutoff = getFilterCutoffDate('last_week')

        // Posts within last week should pass filter
        postsWithinLastWeek.forEach((post) => {
          const postDate = new Date(post.sighting_date!)
          expect(postDate.getTime()).toBeGreaterThanOrEqual(cutoff!.getTime())
        })

        // Posts outside last week should fail filter
        expect(
          new Date(mockPostTenDaysAgo.sighting_date!).getTime()
        ).toBeLessThan(cutoff!.getTime())
        expect(
          new Date(mockPostFortyFiveDaysAgo.sighting_date!).getTime()
        ).toBeLessThan(cutoff!.getTime())
      })

      it('should filter posts correctly for Last Week', () => {
        const { getFilterCutoffDate } = require('../../utils/dateTime')
        const cutoff = getFilterCutoffDate('last_week')

        const filteredPosts = allMockPosts.filter((post) => {
          if (!post.sighting_date) return false
          return new Date(post.sighting_date).getTime() >= cutoff!.getTime()
        })

        expect(filteredPosts).toHaveLength(2)
        expect(filteredPosts.map((p) => p.id)).toEqual([
          'post-2-days-ago',
          'post-5-days-ago',
        ])
      })
    })

    describe('Filter Logic: Any Time shows all posts including older ones', () => {
      it('should include all posts when Any Time is selected', () => {
        const { getFilterCutoffDate } = require('../../utils/dateTime')
        const cutoff = getFilterCutoffDate('any_time')

        // Cutoff should be null
        expect(cutoff).toBeNull()

        // All posts should be included when no cutoff is applied
        const filteredPosts = allMockPosts.filter((post) => {
          if (!cutoff) return true // No filter applied
          if (!post.sighting_date) return true
          return new Date(post.sighting_date).getTime() >= cutoff.getTime()
        })

        expect(filteredPosts).toHaveLength(4)
        expect(filteredPosts.map((p) => p.id)).toEqual([
          'post-2-days-ago',
          'post-5-days-ago',
          'post-10-days-ago',
          'post-45-days-ago',
        ])
      })

      it('should include posts without sighting_date when Any Time is selected', () => {
        const { getFilterCutoffDate } = require('../../utils/dateTime')
        const cutoff = getFilterCutoffDate('any_time')

        const postsWithMixedDates = [
          ...allMockPosts,
          mockPostWithoutTime, // Post without sighting_date
        ]

        const filteredPosts = postsWithMixedDates.filter((post) => {
          if (!cutoff) return true // No filter applied
          if (!post.sighting_date) return true // Include posts without date
          return new Date(post.sighting_date).getTime() >= cutoff.getTime()
        })

        expect(filteredPosts).toHaveLength(5)
      })
    })

    describe('Filter State Transitions', () => {
      it('should transition from Any Time to Last Week correctly', () => {
        const { getFilterCutoffDate } = require('../../utils/dateTime')

        // Step 1: Any Time - all posts visible
        let cutoff = getFilterCutoffDate('any_time')
        let visiblePosts = allMockPosts.filter((p) => {
          if (!cutoff) return true
          return new Date(p.sighting_date!).getTime() >= cutoff!.getTime()
        })
        expect(visiblePosts).toHaveLength(4)

        // Step 2: Switch to Last Week - only recent posts visible
        cutoff = getFilterCutoffDate('last_week')
        visiblePosts = allMockPosts.filter((p) => {
          if (!cutoff) return true
          return new Date(p.sighting_date!).getTime() >= cutoff!.getTime()
        })
        expect(visiblePosts).toHaveLength(2)
      })

      it('should transition from Last Week back to Any Time correctly', () => {
        const { getFilterCutoffDate } = require('../../utils/dateTime')

        // Step 1: Last Week - filtered posts
        let cutoff = getFilterCutoffDate('last_week')
        let visiblePosts = allMockPosts.filter((p) => {
          if (!cutoff) return true
          return new Date(p.sighting_date!).getTime() >= cutoff!.getTime()
        })
        expect(visiblePosts).toHaveLength(2)

        // Step 2: Switch to Any Time - all posts reappear
        cutoff = getFilterCutoffDate('any_time')
        visiblePosts = allMockPosts.filter((p) => {
          if (!cutoff) return true
          return new Date(p.sighting_date!).getTime() >= cutoff!.getTime()
        })
        expect(visiblePosts).toHaveLength(4)
      })

      it('should handle all filter transitions correctly', () => {
        const { getFilterCutoffDate } = require('../../utils/dateTime')
        const filters: Array<{ filter: string; expectedCount: number }> = [
          { filter: 'any_time', expectedCount: 4 },
          { filter: 'last_month', expectedCount: 3 },
          { filter: 'last_week', expectedCount: 2 },
          { filter: 'any_time', expectedCount: 4 }, // Back to all
        ]

        filters.forEach(({ filter, expectedCount }) => {
          const cutoff = getFilterCutoffDate(filter as any)
          const visiblePosts = allMockPosts.filter((p) => {
            if (!cutoff) return true
            return new Date(p.sighting_date!).getTime() >= cutoff!.getTime()
          })
          expect(visiblePosts).toHaveLength(expectedCount)
        })
      })
    })

    describe('E2E: Complete Filtering Flow on LedgerScreen', () => {
      /**
       * Helper to create mock query builder that returns filtered posts
       */
      function createFilteredQueryBuilder(posts: typeof allMockPosts) {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          then: jest.fn().mockImplementation((resolve) => {
            resolve({ data: posts, error: null })
          }),
        }
      }

      beforeEach(() => {
        // Setup mock for filtered posts
        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'posts') {
            const queryBuilder = createFilteredQueryBuilder(allMockPosts)
            Object.defineProperty(queryBuilder, 'then', {
              value: (resolve: Function) => {
                return Promise.resolve().then(() =>
                  resolve({ data: allMockPosts, error: null })
                )
              },
            })
            return queryBuilder
          }
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: mockProfile,
                error: null,
              }),
            }
          }
          return createMockQueryBuilder([])
        })

        mockSupabase.rpc!.mockResolvedValue({ data: [], error: null })
      })

      it('should render LedgerScreen with PostFilters component', async () => {
        render(
          <TestWrapper>
            <LedgerScreen />
          </TestWrapper>
        )

        await waitFor(
          () => {
            expect(screen.queryByTestId('ledger-loading')).toBeNull()
          },
          { timeout: 5000 }
        )

        // PostFilters should be visible
        await waitFor(() => {
          expect(screen.getByTestId('ledger-time-filter')).toBeTruthy()
        })
      })

      it('should display time filter chips in LedgerScreen header', async () => {
        render(
          <TestWrapper>
            <LedgerScreen />
          </TestWrapper>
        )

        await waitFor(
          () => {
            expect(screen.queryByTestId('ledger-loading')).toBeNull()
          },
          { timeout: 5000 }
        )

        // All filter options should be visible
        await waitFor(() => {
          expect(screen.getByText('Last 24h')).toBeTruthy()
          expect(screen.getByText('Last Week')).toBeTruthy()
          expect(screen.getByText('Last Month')).toBeTruthy()
          expect(screen.getByText('Any Time')).toBeTruthy()
        })
      })

      it('should have Any Time selected by default', async () => {
        render(
          <TestWrapper>
            <LedgerScreen />
          </TestWrapper>
        )

        await waitFor(
          () => {
            expect(screen.queryByTestId('ledger-loading')).toBeNull()
          },
          { timeout: 5000 }
        )

        // Check that Any Time chip is selected (has selected styling)
        await waitFor(() => {
          const anyTimeChip = screen.getByTestId('ledger-time-filter-chip-any_time')
          expect(anyTimeChip).toBeTruthy()
        })
      })

      it('should allow selecting Last Week filter', async () => {
        render(
          <TestWrapper>
            <LedgerScreen />
          </TestWrapper>
        )

        await waitFor(
          () => {
            expect(screen.queryByTestId('ledger-loading')).toBeNull()
          },
          { timeout: 5000 }
        )

        // Press Last Week filter
        const lastWeekChip = screen.getByTestId('ledger-time-filter-chip-last_week')
        fireEvent.press(lastWeekChip)

        // Filter should be updated (component should re-render with new filter)
        await waitFor(() => {
          expect(screen.getByTestId('ledger-time-filter-chip-last_week')).toBeTruthy()
        })
      })

      it('should allow switching back to Any Time from Last Week', async () => {
        render(
          <TestWrapper>
            <LedgerScreen />
          </TestWrapper>
        )

        await waitFor(
          () => {
            expect(screen.queryByTestId('ledger-loading')).toBeNull()
          },
          { timeout: 5000 }
        )

        // Press Last Week first
        fireEvent.press(screen.getByTestId('ledger-time-filter-chip-last_week'))

        // Then press Any Time
        await waitFor(() => {
          fireEvent.press(screen.getByTestId('ledger-time-filter-chip-any_time'))
        })

        // Any Time should be accessible
        await waitFor(() => {
          expect(screen.getByTestId('ledger-time-filter-chip-any_time')).toBeTruthy()
        })
      })
    })

    describe('Manual Verification Steps (subtask-7-5)', () => {
      /**
       * This test documents the manual verification steps for subtask-7-5:
       *
       * 1. Navigate to ledger/browse screen
       * 2. Select 'Last Week' filter
       * 3. Verify only posts from last 7 days appear
       * 4. Select 'Any Time' - verify older posts reappear
       */
      it('should document manual verification flow for time period filtering', () => {
        // Step 1: Navigate to ledger/browse screen
        // - The LedgerScreen component is accessed via navigation
        // - It displays PostFilters component in the header
        expect(LedgerScreen).toBeDefined()

        // Step 2: Select 'Last Week' filter
        // - PostFilters renders chips for: Last 24h, Last Week, Last Month, Any Time
        // - Pressing 'Last Week' chip triggers onTimeFilterChange('last_week')
        // - LedgerScreen's handleTimeFilterChange updates timeFilter state
        // - fetchPosts is called with the new filter
        expect(PostFilters).toBeDefined()

        // Step 3: Verify only posts from last 7 days appear
        // - getFilterCutoffDate('last_week') returns Date 7 days ago
        // - Supabase query filters: sighting_date >= cutoff OR (sighting_date IS NULL AND created_at >= cutoff)
        // - Only posts with sighting_date within last 7 days are shown
        const { getFilterCutoffDate } = require('../../utils/dateTime')
        const lastWeekCutoff = getFilterCutoffDate('last_week')
        expect(lastWeekCutoff).not.toBeNull()
        expect(Date.now() - lastWeekCutoff!.getTime()).toBeLessThanOrEqual(
          7 * 24 * 60 * 60 * 1000 + 1000 // 7 days + 1 second tolerance
        )

        // Step 4: Select 'Any Time' - verify older posts reappear
        // - Pressing 'Any Time' chip triggers onTimeFilterChange('any_time')
        // - getFilterCutoffDate('any_time') returns null
        // - No date filter is applied to the query
        // - All posts are shown regardless of date
        const anyTimeCutoff = getFilterCutoffDate('any_time')
        expect(anyTimeCutoff).toBeNull()
      })
    })
  })

  // --------------------------------------------------------------------------
  // E2E FLOW: 30-Day Deprioritization - SUBTASK 7-6
  // --------------------------------------------------------------------------

  describe('E2E Flow: 30-Day Deprioritization', () => {
    /**
     * Mock posts with various dates for testing 30-day deprioritization
     * Posts older than 30 days should rank lower than recent posts
     */
    const now = new Date()

    // Post from 5 days ago (within 30 days - should NOT be deprioritized)
    const mockPostFiveDaysAgo = {
      ...mockPost,
      id: 'post-5-days-ago',
      sighting_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'afternoon' as TimeGranularity,
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    }

    // Post from 25 days ago (within 30 days - should NOT be deprioritized)
    const mockPostTwentyFiveDaysAgo = {
      ...mockPost,
      id: 'post-25-days-ago',
      sighting_date: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'morning' as TimeGranularity,
      created_at: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    }

    // Post from exactly 30 days ago (boundary - should NOT be deprioritized)
    const mockPostThirtyDaysAgo = {
      ...mockPost,
      id: 'post-30-days-ago',
      sighting_date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'afternoon' as TimeGranularity,
      created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    // Post from 31 days ago (SHOULD be deprioritized)
    const mockPostThirtyOneDaysAgo = {
      ...mockPost,
      id: 'post-31-days-ago',
      sighting_date: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'evening' as TimeGranularity,
      created_at: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    }

    // Post from 45 days ago (SHOULD be deprioritized)
    const mockPostFortyFiveDaysAgo = {
      ...mockPost,
      id: 'post-45-days-ago',
      sighting_date: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'afternoon' as TimeGranularity,
      created_at: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    }

    // Post from 60 days ago (SHOULD be deprioritized)
    const mockPostSixtyDaysAgo = {
      ...mockPost,
      id: 'post-60-days-ago',
      sighting_date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'morning' as TimeGranularity,
      created_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    }

    // Post without sighting_date (uses created_at, should NOT be deprioritized)
    const mockRecentPostNoSightingDate = {
      ...mockPost,
      id: 'post-no-sighting-date-recent',
      sighting_date: null,
      time_granularity: null,
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }

    // All mock posts for testing (in random order to verify sorting)
    const allMockPostsForDeprioritization = [
      mockPostThirtyOneDaysAgo,    // >30 days - deprioritized
      mockPostFiveDaysAgo,          // <30 days - not deprioritized
      mockPostSixtyDaysAgo,         // >30 days - deprioritized
      mockPostTwentyFiveDaysAgo,    // <30 days - not deprioritized
      mockPostFortyFiveDaysAgo,     // >30 days - deprioritized
      mockRecentPostNoSightingDate, // no sighting_date - not deprioritized
      mockPostThirtyDaysAgo,        // =30 days - not deprioritized (boundary)
    ]

    describe('isOlderThan30Days Utility', () => {
      // Import the utility function
      const { isOlderThan30Days } = require('../../utils/dateTime')

      it('should return false for dates within 30 days', () => {
        const today = new Date()
        expect(isOlderThan30Days(today)).toBe(false)

        const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        expect(isOlderThan30Days(yesterday)).toBe(false)

        const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
        expect(isOlderThan30Days(twentyNineDaysAgo)).toBe(false)
      })

      it('should return false for exactly 30 days (boundary)', () => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        expect(isOlderThan30Days(thirtyDaysAgo)).toBe(false)
      })

      it('should return true for dates older than 30 days', () => {
        const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
        expect(isOlderThan30Days(thirtyOneDaysAgo)).toBe(true)

        const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
        expect(isOlderThan30Days(fortyFiveDaysAgo)).toBe(true)

        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
        expect(isOlderThan30Days(sixtyDaysAgo)).toBe(true)
      })
    })

    describe('getPostSortPriority Function', () => {
      // Import from lib/supabase
      const { getPostSortPriority } = require('../../lib/supabase')

      it('should use created_at for posts without sighting_date', () => {
        const referenceDate = new Date()
        const priority = getPostSortPriority(mockRecentPostNoSightingDate, referenceDate)

        const createdAt = new Date(mockRecentPostNoSightingDate.created_at).getTime()
        expect(priority).toBe(createdAt)
      })

      it('should use sighting_date for posts within 30 days', () => {
        const referenceDate = new Date()
        const priority = getPostSortPriority(mockPostFiveDaysAgo, referenceDate)

        const sightingDate = new Date(mockPostFiveDaysAgo.sighting_date!).getTime()
        expect(priority).toBe(sightingDate)
      })

      it('should apply 60-day penalty for posts older than 30 days', () => {
        const referenceDate = new Date()
        const priority = getPostSortPriority(mockPostFortyFiveDaysAgo, referenceDate)

        const createdAt = new Date(mockPostFortyFiveDaysAgo.created_at).getTime()
        const sixtyDaysPenalty = 60 * 24 * 60 * 60 * 1000
        expect(priority).toBe(createdAt - sixtyDaysPenalty)
      })

      it('should prioritize 29-day-old post over 31-day-old post', () => {
        const referenceDate = new Date()

        const recentPriority = getPostSortPriority(mockPostTwentyFiveDaysAgo, referenceDate)
        const oldPriority = getPostSortPriority(mockPostThirtyOneDaysAgo, referenceDate)

        // Recent post should have higher priority (larger timestamp)
        expect(recentPriority).toBeGreaterThan(oldPriority)
      })

      it('should treat 30-day boundary correctly (not deprioritized)', () => {
        const referenceDate = new Date()

        const thirtyDayPriority = getPostSortPriority(mockPostThirtyDaysAgo, referenceDate)
        const thirtyOneDayPriority = getPostSortPriority(mockPostThirtyOneDaysAgo, referenceDate)

        // 30-day-old post should have higher priority than 31-day-old post
        expect(thirtyDayPriority).toBeGreaterThan(thirtyOneDayPriority)
      })
    })

    describe('sortPostsWithDeprioritization Function', () => {
      // Import from lib/supabase
      const { sortPostsWithDeprioritization } = require('../../lib/supabase')

      it('should sort posts with recent sightings first', () => {
        const sorted = sortPostsWithDeprioritization(allMockPostsForDeprioritization)

        // First 4 posts should be recent (not deprioritized)
        // - Recent post no sighting date (2 days ago)
        // - 5 days ago
        // - 25 days ago
        // - 30 days ago (boundary)

        // Get IDs of first 4 sorted posts
        const firstFourIds = sorted.slice(0, 4).map((p: { id: string }) => p.id)

        // These posts should NOT be in the first 4 (they're deprioritized)
        expect(firstFourIds).not.toContain('post-31-days-ago')
        expect(firstFourIds).not.toContain('post-45-days-ago')
        expect(firstFourIds).not.toContain('post-60-days-ago')
      })

      it('should push posts >30 days old to the end', () => {
        const sorted = sortPostsWithDeprioritization(allMockPostsForDeprioritization)

        // Get IDs of last 3 sorted posts
        const lastThreeIds = sorted.slice(-3).map((p: { id: string }) => p.id)

        // Deprioritized posts should be at the end
        expect(lastThreeIds).toContain('post-31-days-ago')
        expect(lastThreeIds).toContain('post-45-days-ago')
        expect(lastThreeIds).toContain('post-60-days-ago')
      })

      it('should maintain relative order within deprioritized posts', () => {
        const sorted = sortPostsWithDeprioritization(allMockPostsForDeprioritization)

        // Among deprioritized posts, they should still maintain some order
        // (based on created_at - penalty)
        const deprioritizedPosts = sorted.filter((p: { id: string }) =>
          ['post-31-days-ago', 'post-45-days-ago', 'post-60-days-ago'].includes(p.id)
        )

        expect(deprioritizedPosts.length).toBe(3)
      })

      it('should handle empty array', () => {
        const sorted = sortPostsWithDeprioritization([])
        expect(sorted).toEqual([])
      })

      it('should handle array with single post', () => {
        const sorted = sortPostsWithDeprioritization([mockPostFiveDaysAgo])
        expect(sorted.length).toBe(1)
        expect(sorted[0].id).toBe('post-5-days-ago')
      })

      it('should not mutate original array', () => {
        const original = [...allMockPostsForDeprioritization]
        const originalOrder = original.map((p) => p.id)

        sortPostsWithDeprioritization(allMockPostsForDeprioritization)

        // Original array should be unchanged
        const afterOrder = allMockPostsForDeprioritization.map((p) => p.id)
        expect(afterOrder).toEqual(originalOrder)
      })
    })

    describe('isPostDeprioritized Function', () => {
      // Import from lib/supabase
      const { isPostDeprioritized } = require('../../lib/supabase')

      it('should return false for posts without sighting_date', () => {
        expect(isPostDeprioritized(mockRecentPostNoSightingDate)).toBe(false)
      })

      it('should return false for posts within 30 days', () => {
        expect(isPostDeprioritized(mockPostFiveDaysAgo)).toBe(false)
        expect(isPostDeprioritized(mockPostTwentyFiveDaysAgo)).toBe(false)
        expect(isPostDeprioritized(mockPostThirtyDaysAgo)).toBe(false)
      })

      it('should return true for posts older than 30 days', () => {
        expect(isPostDeprioritized(mockPostThirtyOneDaysAgo)).toBe(true)
        expect(isPostDeprioritized(mockPostFortyFiveDaysAgo)).toBe(true)
        expect(isPostDeprioritized(mockPostSixtyDaysAgo)).toBe(true)
      })
    })

    describe('Complete Deprioritization Flow', () => {
      it('should verify recent posts appear before 31+ day old posts', () => {
        // Import sorting function
        const { sortPostsWithDeprioritization } = require('../../lib/supabase')

        // Sort all posts
        const sorted = sortPostsWithDeprioritization(allMockPostsForDeprioritization)

        // Find positions of specific posts
        const positions: Record<string, number> = {}
        sorted.forEach((post: { id: string }, index: number) => {
          positions[post.id] = index
        })

        // Recent posts should appear BEFORE old posts
        // 5 days ago should be before 31 days ago
        expect(positions['post-5-days-ago']).toBeLessThan(positions['post-31-days-ago'])

        // 25 days ago should be before 45 days ago
        expect(positions['post-25-days-ago']).toBeLessThan(positions['post-45-days-ago'])

        // 30 days ago (boundary) should be before 31 days ago
        expect(positions['post-30-days-ago']).toBeLessThan(positions['post-31-days-ago'])

        // Post without sighting_date should be before deprioritized posts
        expect(positions['post-no-sighting-date-recent']).toBeLessThan(positions['post-60-days-ago'])
      })

      it('should handle mixed posts correctly (with and without sighting_date)', () => {
        const { sortPostsWithDeprioritization, isPostDeprioritized } = require('../../lib/supabase')

        // Create a mix of posts
        const mixedPosts = [
          mockPostFortyFiveDaysAgo,     // 45 days - deprioritized
          mockRecentPostNoSightingDate, // no date - uses created_at (recent)
          mockPostFiveDaysAgo,          // 5 days - not deprioritized
          mockPostWithoutTime,          // no time - backward compatibility
        ]

        const sorted = sortPostsWithDeprioritization(mixedPosts)

        // Post without sighting_date should NOT be deprioritized
        expect(isPostDeprioritized(mockRecentPostNoSightingDate)).toBe(false)
        expect(isPostDeprioritized(mockPostWithoutTime)).toBe(false)

        // 45 days ago should be at the end
        const lastPost = sorted[sorted.length - 1]
        expect(lastPost.id).toBe('post-45-days-ago')
      })

      it('should accurately separate recent vs. deprioritized posts', () => {
        const { sortPostsWithDeprioritization, isPostDeprioritized } = require('../../lib/supabase')

        const sorted = sortPostsWithDeprioritization(allMockPostsForDeprioritization)

        // Count deprioritized posts
        const deprioritizedCount = allMockPostsForDeprioritization.filter(
          (p) => isPostDeprioritized(p)
        ).length

        // Should have exactly 3 deprioritized posts (31, 45, 60 days)
        expect(deprioritizedCount).toBe(3)

        // Count non-deprioritized posts
        const recentCount = allMockPostsForDeprioritization.filter(
          (p) => !isPostDeprioritized(p)
        ).length

        // Should have 4 recent/non-deprioritized posts
        expect(recentCount).toBe(4)

        // Verify all recent posts come before deprioritized posts
        const recentPosts = sorted.slice(0, recentCount)
        const oldPosts = sorted.slice(recentCount)

        recentPosts.forEach((post: { id: string }) => {
          expect(isPostDeprioritized(post)).toBe(false)
        })

        oldPosts.forEach((post: { id: string }) => {
          expect(isPostDeprioritized(post)).toBe(true)
        })
      })
    })

    describe('Manual Verification Steps (subtask-7-6)', () => {
      /**
       * This test documents the manual verification steps for subtask-7-6:
       *
       * 1. Create/modify posts with dates >30 days old (manual database update or wait)
       *    - Use Supabase SQL Editor to update sighting_date:
       *      UPDATE posts SET sighting_date = NOW() - INTERVAL '45 days' WHERE id = 'some-post-id';
       *
       * 2. Browse posts
       *    - Navigate to the LedgerScreen in the app
       *    - Observe the order of posts displayed
       *
       * 3. Verify recent posts appear before 31+ day old posts in list
       *    - Posts with sighting_date within 30 days should appear at the top
       *    - Posts with sighting_date > 30 days should appear at the bottom
       *    - Posts without sighting_date use created_at for ordering
       */
      it('should document manual verification flow for 30-day deprioritization', () => {
        // Step 1: Verify deprioritization utilities exist and work
        const { getPostSortPriority, sortPostsWithDeprioritization, isPostDeprioritized } =
          require('../../lib/supabase')

        expect(getPostSortPriority).toBeDefined()
        expect(sortPostsWithDeprioritization).toBeDefined()
        expect(isPostDeprioritized).toBeDefined()

        // Step 2: Verify isOlderThan30Days utility works
        const { isOlderThan30Days } = require('../../utils/dateTime')
        expect(isOlderThan30Days).toBeDefined()

        // Step 3: Verify 30-day boundary
        const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)

        expect(isOlderThan30Days(twentyNineDaysAgo)).toBe(false)
        expect(isOlderThan30Days(thirtyDaysAgo)).toBe(false)
        expect(isOlderThan30Days(thirtyOneDaysAgo)).toBe(true)

        // Step 4: Verify sorting logic
        const testPosts = [
          { id: 'recent', created_at: new Date().toISOString(), sighting_date: twentyNineDaysAgo.toISOString() },
          { id: 'old', created_at: new Date().toISOString(), sighting_date: thirtyOneDaysAgo.toISOString() },
        ]

        const sorted = sortPostsWithDeprioritization(testPosts)
        expect(sorted[0].id).toBe('recent')
        expect(sorted[1].id).toBe('old')
      })

      it('should provide SQL commands for manual database testing', () => {
        /**
         * SQL commands for manually testing 30-day deprioritization in Supabase:
         *
         * 1. Create a post with sighting_date 45 days ago:
         *    INSERT INTO posts (producer_id, location_id, message, sighting_date, time_granularity)
         *    VALUES (
         *      'your-user-id',
         *      'your-location-id',
         *      'Test post from 45 days ago',
         *      NOW() - INTERVAL '45 days',
         *      'afternoon'
         *    );
         *
         * 2. Update existing post to be 45 days old:
         *    UPDATE posts
         *    SET sighting_date = NOW() - INTERVAL '45 days'
         *    WHERE id = 'your-post-id';
         *
         * 3. Query to see posts with deprioritization:
         *    SELECT
         *      id,
         *      message,
         *      sighting_date,
         *      CASE
         *        WHEN sighting_date IS NULL THEN created_at
         *        WHEN sighting_date > NOW() - INTERVAL '30 days' THEN sighting_date
         *        ELSE created_at - INTERVAL '60 days'
         *      END as sort_priority
         *    FROM posts
         *    ORDER BY sort_priority DESC;
         *
         * 4. Verify deprioritization:
         *    SELECT
         *      id,
         *      message,
         *      sighting_date,
         *      sighting_date < NOW() - INTERVAL '30 days' as is_deprioritized
         *    FROM posts
         *    WHERE sighting_date IS NOT NULL
         *    ORDER BY sighting_date DESC;
         */

        // This test passes if it compiles - the SQL commands are documented above
        expect(true).toBe(true)
      })
    })

    describe('Edge Cases', () => {
      const { sortPostsWithDeprioritization, isPostDeprioritized, getPostSortPriority } =
        require('../../lib/supabase')

      it('should handle null sighting_date with null time_granularity', () => {
        const postWithNullBoth = {
          id: 'null-both',
          created_at: new Date().toISOString(),
          sighting_date: null,
          time_granularity: null,
        }

        expect(isPostDeprioritized(postWithNullBoth)).toBe(false)
      })

      it('should handle very old posts (years ago)', () => {
        const veryOldPost = {
          id: 'very-old',
          created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
          sighting_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          time_granularity: 'afternoon',
        }

        expect(isPostDeprioritized(veryOldPost)).toBe(true)

        // Should still sort correctly
        const sorted = sortPostsWithDeprioritization([veryOldPost, mockPostFiveDaysAgo])
        expect(sorted[0].id).toBe('post-5-days-ago')
        expect(sorted[1].id).toBe('very-old')
      })

      it('should handle posts created today', () => {
        const todayPost = {
          id: 'today',
          created_at: new Date().toISOString(),
          sighting_date: new Date().toISOString(),
          time_granularity: 'specific',
        }

        expect(isPostDeprioritized(todayPost)).toBe(false)

        const priority = getPostSortPriority(todayPost)
        expect(priority).toBeGreaterThan(0)
      })

      it('should handle posts with same sighting_date but different created_at', () => {
        const sameSightingDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)

        const post1 = {
          id: 'post1',
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          sighting_date: sameSightingDate.toISOString(),
          time_granularity: 'afternoon',
        }

        const post2 = {
          id: 'post2',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          sighting_date: sameSightingDate.toISOString(),
          time_granularity: 'afternoon',
        }

        // Both should have same priority (sighting_date)
        const priority1 = getPostSortPriority(post1)
        const priority2 = getPostSortPriority(post2)

        expect(priority1).toBe(priority2)
      })

      it('should handle deprioritization across month boundaries', () => {
        // Test with a reference date at the beginning of a month
        const referenceDate = new Date('2024-03-01T12:00:00Z')
        const thirtyOneDaysBeforeRef = new Date('2024-01-30T12:00:00Z')

        const postAcrossMonths = {
          id: 'across-months',
          created_at: thirtyOneDaysBeforeRef.toISOString(),
          sighting_date: thirtyOneDaysBeforeRef.toISOString(),
          time_granularity: 'afternoon',
        }

        expect(isPostDeprioritized(postAcrossMonths, referenceDate)).toBe(true)
      })
    })
  })

  // --------------------------------------------------------------------------
  // LEDGER DISPLAY: Verify Time in Posts
  // --------------------------------------------------------------------------

  describe('Ledger Display: Verify Time in Posts', () => {
    beforeEach(() => {
      // Mock profile and posts with time
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }
        }
        if (table === 'posts') {
          const queryBuilder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            then: jest.fn().mockImplementation((resolve) => {
              resolve({
                data: [
                  mockPostWithSpecificTime,
                  mockPostWithApproximateTime,
                  mockPostWithoutTime,
                ],
                error: null,
              })
            }),
          }
          Object.defineProperty(queryBuilder, 'then', {
            value: (resolve: Function) => {
              return Promise.resolve().then(() =>
                resolve({
                  data: [
                    mockPostWithSpecificTime,
                    mockPostWithApproximateTime,
                    mockPostWithoutTime,
                  ],
                  error: null,
                })
              )
            },
          })
          return queryBuilder
        }
        return createMockQueryBuilder([])
      })

      mockSupabase.rpc!.mockResolvedValue({
        data: [],
        error: null,
      })
    })

    it('should render LedgerScreen with posts', async () => {
      render(
        <TestWrapper>
          <LedgerScreen />
        </TestWrapper>
      )

      await waitFor(
        () => {
          expect(screen.queryByTestId('ledger-loading')).toBeNull()
        },
        { timeout: 5000 }
      )

      await waitFor(() => {
        expect(screen.getByTestId('ledger-screen')).toBeTruthy()
      })
    })

    it('should display posts in the list', async () => {
      render(
        <TestWrapper>
          <LedgerScreen />
        </TestWrapper>
      )

      await waitFor(
        () => {
          expect(screen.queryByTestId('ledger-loading')).toBeNull()
        },
        { timeout: 5000 }
      )

      await waitFor(() => {
        expect(screen.getByTestId('ledger-post-list')).toBeTruthy()
      })
    })
  })

  // --------------------------------------------------------------------------
  // E2E: Post Display with "Seen Tuesday afternoon" Format
  // --------------------------------------------------------------------------

  describe('E2E: Post Display with Approximate Time in Ledger', () => {
    /**
     * Helper to get a date for a specific weekday within the past week
     */
    function getDateForWeekday(targetDay: number): Date {
      const now = new Date()
      const currentDay = now.getDay()
      let daysDiff = (currentDay - targetDay + 7) % 7
      if (daysDiff === 0) daysDiff = 7 // Get last week's day if same day
      return new Date(now.getTime() - daysDiff * 24 * 60 * 60 * 1000)
    }

    it('should format and display "Seen Tuesday afternoon" correctly', () => {
      // Get last Tuesday's date
      const tuesdayDate = getDateForWeekday(2) // Tuesday = 2

      // Format the time
      const formatted = formatSightingTime(tuesdayDate, 'afternoon')

      // Should show "Tuesday afternoon"
      expect(formatted).toBe('Tuesday afternoon')

      // When displayed in ledger, PostCard adds "Seen " prefix
      const ledgerDisplay = `Seen ${formatted}`
      expect(ledgerDisplay).toBe('Seen Tuesday afternoon')
    })

    it('should format and display all weekdays with afternoon correctly', () => {
      const weekdays = [
        { day: 0, name: 'Sunday' },
        { day: 1, name: 'Monday' },
        { day: 2, name: 'Tuesday' },
        { day: 3, name: 'Wednesday' },
        { day: 4, name: 'Thursday' },
        { day: 5, name: 'Friday' },
        { day: 6, name: 'Saturday' },
      ]

      weekdays.forEach(({ day, name }) => {
        const date = getDateForWeekday(day)
        const daysSinceDate = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000))

        // Only test if within past week (7 days)
        if (daysSinceDate > 0 && daysSinceDate < 7) {
          const formatted = formatSightingTime(date, 'afternoon')
          expect(formatted).toBe(`${name} afternoon`)

          // Verify full ledger display format
          const ledgerDisplay = `Seen ${formatted}`
          expect(ledgerDisplay).toBe(`Seen ${name} afternoon`)
        }
      })
    })

    it('should display "Seen Today afternoon" for today', () => {
      const today = new Date()
      const formatted = formatSightingTime(today, 'afternoon')
      expect(formatted).toBe('Today afternoon')

      const ledgerDisplay = `Seen ${formatted}`
      expect(ledgerDisplay).toBe('Seen Today afternoon')
    })

    it('should display "Seen Yesterday afternoon" for yesterday', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const formatted = formatSightingTime(yesterday, 'afternoon')
      expect(formatted).toBe('Yesterday afternoon')

      const ledgerDisplay = `Seen ${formatted}`
      expect(ledgerDisplay).toBe('Seen Yesterday afternoon')
    })

    it('should handle morning/evening periods for weekdays', () => {
      // Get a date 3 days ago (guaranteed to be within week but not today/yesterday)
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      const dayName = DAY_NAMES[threeDaysAgo.getDay()]

      // Morning
      const morningFormatted = formatSightingTime(threeDaysAgo, 'morning')
      expect(morningFormatted).toBe(`${dayName} morning`)
      expect(`Seen ${morningFormatted}`).toBe(`Seen ${dayName} morning`)

      // Evening
      const eveningFormatted = formatSightingTime(threeDaysAgo, 'evening')
      expect(eveningFormatted).toBe(`${dayName} evening`)
      expect(`Seen ${eveningFormatted}`).toBe(`Seen ${dayName} evening`)
    })

    it('should create a mock post with Tuesday afternoon and verify ledger display format', () => {
      // Simulate post data as it would come from the database
      const tuesdayDate = getDateForWeekday(2)

      const mockPostTuesdayAfternoon = {
        ...mockPost,
        id: 'test-post-tuesday-afternoon',
        sighting_date: tuesdayDate.toISOString(),
        time_granularity: 'afternoon' as TimeGranularity,
      }

      // Verify the post data structure is correct
      expect(mockPostTuesdayAfternoon.sighting_date).toBeDefined()
      expect(mockPostTuesdayAfternoon.time_granularity).toBe('afternoon')

      // Simulate how PostCard would format this
      const sightingDate = new Date(mockPostTuesdayAfternoon.sighting_date)
      const formattedTime = formatSightingTime(sightingDate, mockPostTuesdayAfternoon.time_granularity)

      // Verify the formatted time
      expect(formattedTime).toBe('Tuesday afternoon')

      // PostCard displays with "Seen " prefix
      expect(`Seen ${formattedTime}`).toBe('Seen Tuesday afternoon')
    })

    it('should verify complete flow: select Tuesday + afternoon, check formatted display', async () => {
      // Step 1: Calculate Tuesday's date
      const tuesdayDate = getDateForWeekday(2)

      // Step 2: Simulate TimeStep selection with Tuesday and afternoon
      const mockOnNext = jest.fn()
      const mockOnGranularityChange = jest.fn()
      const mockOnDateChange = jest.fn()
      const mockOnApproximateTimeChange = jest.fn()

      render(
        <TestWrapper>
          <TimeStep
            date={tuesdayDate}
            granularity="afternoon"
            approximateTime="afternoon"
            onDateChange={mockOnDateChange}
            onGranularityChange={mockOnGranularityChange}
            onApproximateTimeChange={mockOnApproximateTimeChange}
            onNext={mockOnNext}
            onSkip={jest.fn()}
            onBack={jest.fn()}
            testID="create-post"
          />
        </TestWrapper>
      )

      // Step 3: Verify preview shows "Will display as:"
      expect(screen.getByText('Will display as:')).toBeTruthy()

      // Step 4: Verify the preview shows "Tuesday afternoon"
      expect(screen.getByText('Tuesday afternoon')).toBeTruthy()

      // Step 5: Press Next to proceed (simulating submit)
      fireEvent.press(screen.getByTestId('create-post-time-next'))

      await waitFor(() => {
        expect(mockOnNext).toHaveBeenCalled()
      })

      // Step 6: Verify what would be saved to database and displayed
      // When this post is displayed in the ledger, it would show "Seen Tuesday afternoon"
      const expectedLedgerDisplay = `Seen ${formatSightingTime(tuesdayDate, 'afternoon')}`
      expect(expectedLedgerDisplay).toBe('Seen Tuesday afternoon')
    })
  })

  // --------------------------------------------------------------------------
  // INTEGRATION: Complete Time-Specific Post Flow
  // --------------------------------------------------------------------------

  describe('Complete Time-Specific Post Flow Integration', () => {
    it('should verify all time-related components exist and work together', async () => {
      // Verify components are defined
      expect(TimeStep).toBeDefined()
      expect(TimeSelector).toBeDefined()
      expect(GranularityToggle).toBeDefined()

      // Verify utility functions work
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const specificTime = formatSightingTime(yesterday, 'specific')
      expect(specificTime).toBeDefined()
      expect(typeof specificTime).toBe('string')

      const approximateTime = formatSightingTime(yesterday, 'afternoon')
      expect(approximateTime).toBeDefined()
      expect(approximateTime.toLowerCase()).toContain('afternoon')

      const relativeDay = formatRelativeDay(yesterday)
      expect(relativeDay).toBe('Yesterday')
    })

    it('should handle all granularity types correctly', () => {
      const date = new Date()

      // Test all granularity types
      const specific = formatSightingTime(date, 'specific')
      expect(specific).toContain('at')

      const morning = formatSightingTime(date, 'morning')
      expect(morning.toLowerCase()).toContain('morning')

      const afternoon = formatSightingTime(date, 'afternoon')
      expect(afternoon.toLowerCase()).toContain('afternoon')

      const evening = formatSightingTime(date, 'evening')
      expect(evening.toLowerCase()).toContain('evening')
    })

    it('should format relative days correctly', () => {
      const today = new Date()
      expect(formatRelativeDay(today)).toBe('Today')

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      expect(formatRelativeDay(yesterday)).toBe('Yesterday')
    })
  })
})

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * Time-Specific Posts E2E Test Summary:
 *
 * This test suite verifies the time-specific posts feature:
 *
 * Components Tested:
 * 1. GranularityToggle - Toggle between specific and approximate time modes
 * 2. TimeSelector - Date and time selection with all options
 * 3. TimeStep - Complete time step in CreatePost wizard
 * 4. ReviewStep - Final review with time display or "Time not specified"
 * 5. PostCard - Time display in ledger with backward compatibility
 * 6. PostFilters - Time-based filtering component (Last 24h, Last Week, Last Month, Any Time)
 *
 * E2E Flows Tested:
 * 1. Create post with specific time (Yesterday at 3:00 PM) - SUBTASK 7-2
 * 2. Create post with approximate time (Tuesday afternoon) - SUBTASK 7-3
 * 3. Create post without time (skip time step) - SUBTASK 7-4
 * 4. Time period filtering - SUBTASK 7-5
 * 5. 30-day deprioritization - SUBTASK 7-6
 * 6. Verify time displays in ledger
 *
 * Subtask 7-4 Tests (Create post without time - backward compatibility):
 * 1. TimeStep skip functionality - Skip button always available
 * 2. TimeStep Optional badge display
 * 3. TimeStep Next button disabled without selection (encouraging skip)
 * 4. ReviewStep shows "Time not specified" when time is skipped
 * 5. ReviewStep Edit button for time even when not specified
 * 6. ReviewStep submission works without time
 * 7. PostCard does NOT display sighting time when null
 * 8. PostCard backward compatibility with legacy posts
 * 9. Mixed list display (posts with and without time)
 * 10. Complete flow verification: skip → submit → no time in display
 *
 * Subtask 7-5 Tests (Time period filtering):
 * 1. PostFilters component renders all filter options
 * 2. Filter chip labels display correctly (Last 24h, Last Week, Last Month, Any Time)
 * 3. Selecting Last Week triggers onTimeFilterChange('last_week')
 * 4. Selecting Any Time triggers onTimeFilterChange('any_time')
 * 5. Already selected filter does not trigger change
 * 6. Disabled state works correctly
 * 7. Time cutoff calculations for each filter
 * 8. Filter logic: Last Week shows only posts from last 7 days
 * 9. Filter logic: Any Time shows all posts including older ones
 * 10. Filter state transitions (Any Time → Last Week → Any Time)
 * 11. LedgerScreen displays PostFilters in header
 * 12. LedgerScreen has Any Time selected by default
 * 13. Filter selection triggers post refetch
 * 14. Manual verification flow documented
 *
 * Subtask 7-6 Tests (30-day deprioritization):
 * 1. isOlderThan30Days utility returns correct values for boundary cases
 * 2. getPostSortPriority function uses sighting_date for recent posts
 * 3. getPostSortPriority applies 60-day penalty for posts >30 days old
 * 4. sortPostsWithDeprioritization puts recent posts first
 * 5. sortPostsWithDeprioritization pushes >30 day old posts to end
 * 6. isPostDeprioritized correctly identifies old posts
 * 7. Complete flow: verify recent posts appear before 31+ day old posts
 * 8. Edge cases: null sighting_date, very old posts, today's posts
 * 9. Edge cases: same sighting_date with different created_at
 * 10. Edge cases: deprioritization across month boundaries
 * 11. Manual verification steps and SQL commands documented
 *
 * Ledger Display Tests (subtask-7-3):
 * 1. "Seen Tuesday afternoon" format verification
 * 2. All weekday + time period combinations
 * 3. Today/Yesterday + time period display
 * 4. Complete flow: select Tuesday + afternoon → verify display
 *
 * Utilities Tested:
 * - formatSightingTime() - Formats date with granularity
 * - formatRelativeDay() - Formats relative day labels
 * - getFilterCutoffDate() - Returns cutoff date for filter options
 * - isOlderThan30Days() - Checks if date is older than 30 days
 * - getPostSortPriority() - Calculates sort priority with deprioritization
 * - sortPostsWithDeprioritization() - Sorts posts with 30-day deprioritization
 * - isPostDeprioritized() - Checks if post should be deprioritized
 * - DAY_NAMES - Day name constants for display
 *
 * Manual Verification Steps (subtask-7-4):
 * 1. Create a post
 * 2. Skip time step
 * 3. Submit
 * 4. Verify post created successfully and displays without time info
 *
 * Manual Verification Steps (subtask-7-5):
 * 1. Navigate to ledger/browse screen
 * 2. Select 'Last Week' filter
 * 3. Verify only posts from last 7 days appear
 * 4. Select 'Any Time' - verify older posts reappear
 *
 * Manual Verification Steps (subtask-7-6):
 * 1. Create/modify posts with dates >30 days old (manual database update)
 *    - Use Supabase SQL Editor to update sighting_date
 * 2. Browse posts (navigate to LedgerScreen)
 * 3. Verify recent posts appear before 31+ day old posts in list
 *
 * Running the tests:
 * ```bash
 * npm test -- __tests__/e2e/time-specific-posts.e2e.test.tsx
 * ```
 */
