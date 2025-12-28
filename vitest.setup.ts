/**
 * Vitest Setup File
 *
 * Unified setup merging jest.setup.ts and jest.setup.js
 * Global setup and mocks for all tests.
 */

import { vi, beforeAll, afterAll } from 'vitest'

// Import jest-dom matchers for DOM testing assertions
// This adds custom matchers like toBeInTheDocument(), toHaveClass(), etc.
import '@testing-library/jest-dom'

// Configure testing-library to auto-cleanup after each test
// This is default behavior but we explicitly configure it here
import { configure } from '@testing-library/react'

configure({
  // Recommended for async testing
  asyncUtilTimeout: 5000,
  // Show element in error messages for easier debugging
  getElementError: (message, container) => {
    const error = new Error(
      [message, container?.innerHTML].filter(Boolean).join('\n\n')
    )
    error.name = 'TestingLibraryElementError'
    return error
  },
})

// ============================================================================
// Browser API Mocks (from jest.setup.ts)
// ============================================================================

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver for components that use it
class MockIntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []

  constructor() {}

  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  unobserve() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

// Mock ResizeObserver for components that use it
class MockResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
})

// ============================================================================
// React Native Mocks (from jest.setup.js)
// ============================================================================

// Import react-native-gesture-handler setup for gesture handling in tests
// Note: This may need adjustment depending on Vitest compatibility
// import 'react-native-gesture-handler/jestSetup'

// Silence the warning: Animated: `useNativeDriver` is not supported
vi.mock('react-native/Libraries/Animated/NativeAnimatedHelper')

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

// Mock expo-camera
vi.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  CameraType: {
    front: 'front',
    back: 'back',
  },
  useCameraPermissions: vi.fn(() => [{ granted: true }, vi.fn()]),
}))

// Mock expo-location
vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: vi.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    })
  ),
  watchPositionAsync: vi.fn(),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
  PermissionStatus: {
    UNDETERMINED: 'undetermined',
    GRANTED: 'granted',
    DENIED: 'denied',
  },
}))

// Mock expo-image-picker
vi.mock('expo-image-picker', () => ({
  launchCameraAsync: vi.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [
        {
          uri: 'file:///mock/selfie.jpg',
          width: 1000,
          height: 1000,
          type: 'image',
        },
      ],
    })
  ),
  launchImageLibraryAsync: vi.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [
        {
          uri: 'file:///mock/photo.jpg',
          width: 1000,
          height: 1000,
          type: 'image',
        },
      ],
    })
  ),
  requestCameraPermissionsAsync: vi.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  requestMediaLibraryPermissionsAsync: vi.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  MediaTypeOptions: {
    All: 'All',
    Videos: 'Videos',
    Images: 'Images',
  },
  CameraType: {
    front: 'front',
    back: 'back',
  },
}))

// Mock react-native-maps
vi.mock('react-native-maps', () => {
  const { View } = require('react-native')
  const MockMapView = (props: { testID?: string; children?: React.ReactNode }) => {
    return <View testID={props.testID}>{props.children}</View>
  }
  MockMapView.Marker = (props: { testID?: string }) => {
    return <View testID={props.testID} />
  }
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMapView.Marker,
    PROVIDER_GOOGLE: 'google',
  }
})

// Mock react-native-svg for DiceBear avatar rendering
vi.mock('react-native-svg', () => {
  const { View } = require('react-native')
  return {
    Svg: View,
    Circle: View,
    Ellipse: View,
    G: View,
    Text: View,
    TSpan: View,
    TextPath: View,
    Path: View,
    Polygon: View,
    Polyline: View,
    Line: View,
    Rect: View,
    Use: View,
    Image: View,
    Symbol: View,
    Defs: View,
    LinearGradient: View,
    RadialGradient: View,
    Stop: View,
    ClipPath: View,
    Pattern: View,
    Mask: View,
    SvgXml: (props: Record<string, unknown>) => (
      <View testID="svg-xml-mock" {...props} />
    ),
  }
})

// Mock @dicebear/core
vi.mock('@dicebear/core', () => ({
  createAvatar: vi.fn((_style: unknown, _options: unknown) => ({
    toString: () =>
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#ccc"/></svg>',
    toDataUri: () =>
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23ccc"/></svg>',
  })),
}))

// Mock @dicebear/collection
vi.mock('@dicebear/collection', () => ({
  avataaars: {
    meta: { title: 'Avataaars' },
  },
}))

// Mock @react-navigation/native
vi.mock('@react-navigation/native', async () => {
  const actualNav = await vi.importActual('@react-navigation/native')
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: vi.fn(),
      goBack: vi.fn(),
      replace: vi.fn(),
      reset: vi.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: vi.fn((callback: () => void) => callback()),
  }
})

// Mock Alert
vi.spyOn(require('react-native').Alert, 'alert')

// ============================================================================
// Console Output Suppression
// ============================================================================

// Suppress console errors during tests (optional - comment out if you want to see them)
// This helps keep test output clean while still catching actual test failures
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Filter out React act() warnings and other known noise
    const message = args[0]?.toString() || ''
    if (
      message.includes('Warning: ReactDOM.render is no longer supported') ||
      message.includes('Warning: An update to') ||
      message.includes('act(')
    ) {
      return
    }
    originalError.apply(console, args)
  }

  // Suppress specific console warnings during tests
  console.warn = (...args: unknown[]) => {
    const message = args[0]?.toString() || ''
    if (
      message.includes('Animated: `useNativeDriver`') ||
      message.includes('componentWillReceiveProps') ||
      message.includes('componentWillMount')
    ) {
      return
    }
    originalWarn.apply(console, args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})
