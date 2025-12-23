/**
 * Test Utilities
 *
 * Provides test helpers and custom render functions for React Native Testing Library.
 */

import React, { ReactElement, ReactNode } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react-native'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { AuthProvider } from '../../contexts/AuthContext'

// ============================================================================
// WRAPPER COMPONENTS
// ============================================================================

/**
 * All providers wrapper for testing
 */
interface AllProvidersProps {
  children: ReactNode
}

function AllProviders({ children }: AllProvidersProps): JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 0, height: 0 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
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

/**
 * Navigation wrapper only (for screens that need navigation context)
 */
function NavigationWrapper({ children }: AllProvidersProps): JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 0, height: 0 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <NavigationContainer>
          {children}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

// ============================================================================
// CUSTOM RENDER FUNCTIONS
// ============================================================================

/**
 * Custom render function that wraps component with all necessary providers
 *
 * @param ui - The component to render
 * @param options - Additional render options
 * @returns RenderResult with additional utilities
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  return render(ui, { wrapper: AllProviders, ...options })
}

/**
 * Custom render function with navigation only (no auth)
 *
 * @param ui - The component to render
 * @param options - Additional render options
 * @returns RenderResult with additional utilities
 */
export function renderWithNavigation(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  return render(ui, { wrapper: NavigationWrapper, ...options })
}

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Wait for a condition to be true
 *
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait (ms)
 * @param interval - Polling interval (ms)
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error(`Condition not met within ${timeout}ms`)
}

/**
 * Flush all pending promises
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve))
}

/**
 * Wait for React state updates to complete
 */
export async function waitForStateUpdate(): Promise<void> {
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Create a mock navigation object
 */
export function createMockNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    setOptions: jest.fn(),
    setParams: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => true),
    getParent: jest.fn(),
    getState: jest.fn(() => ({
      routes: [],
      index: 0,
    })),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
  }
}

/**
 * Create a mock route object
 */
export function createMockRoute<T extends Record<string, unknown>>(params: T = {} as T) {
  return {
    key: 'mock-route-key',
    name: 'MockScreen',
    params,
  }
}

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

/**
 * Create a mock post for testing
 */
export function createMockPost(overrides: Partial<{
  id: string
  producer_id: string
  location_id: string
  note: string
  is_active: boolean
}> = {}) {
  return {
    id: 'test-post-' + Math.random().toString(36).substr(2, 9),
    producer_id: 'test-user-123',
    location_id: 'test-location-123',
    target_avatar: {},
    note: 'This is a test note for the missed connection.',
    selfie_url: null,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    ...overrides,
  }
}

/**
 * Create a mock location for testing
 */
export function createMockLocation(overrides: Partial<{
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
}> = {}) {
  return {
    id: 'test-location-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Location',
    address: '123 Test St, Test City, TC 12345',
    latitude: 37.7749,
    longitude: -122.4194,
    place_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create a mock avatar config for testing
 */
export function createMockAvatarConfig(overrides: Partial<{
  topType: string
  hairColor: string
  skinColor: string
}> = {}) {
  return {
    topType: 'ShortHairShortFlat',
    accessoriesType: 'Blank',
    hairColor: 'Brown',
    facialHairType: 'Blank',
    facialHairColor: 'Brown',
    clotheType: 'BlazerShirt',
    clotheColor: 'Blue03',
    eyeType: 'Default',
    eyebrowType: 'Default',
    mouthType: 'Smile',
    skinColor: 'Light',
    ...overrides,
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export everything from @testing-library/react-native
export * from '@testing-library/react-native'

// Export custom render as default render
export { renderWithProviders as render }
