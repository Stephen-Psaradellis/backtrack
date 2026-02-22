/**
 * Vitest Setup File
 *
 * Unified setup for all tests. Handles both Node and JSDOM environments.
 */

import React from 'react'
import { vi, beforeAll, afterAll } from 'vitest'

// Make React available globally for JSX transform
globalThis.React = React

// ============================================================================
// Jest Compatibility Layer
// ============================================================================

// Provide Jest globals that map to Vitest equivalents
// This allows Jest-style tests to work with Vitest
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).jest = vi

// ============================================================================
// Global Variables for React Native
// ============================================================================

// Define __DEV__ global for React Native compatibility
// This is typically set by the RN bundler but not in test environments
declare global {
  var __DEV__: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var React: typeof import('react')
}
globalThis.__DEV__ = process.env.NODE_ENV !== 'production'

// ============================================================================
// Browser API Mocks (only in jsdom environment)
// ============================================================================

if (typeof window !== 'undefined') {
  // Import jest-dom matchers for DOM testing assertions
  await import('@testing-library/jest-dom')

  // Configure testing-library
  const { configure } = await import('@testing-library/react')
  configure({
    asyncUtilTimeout: 5000,
    getElementError: (message, container) => {
      const error = new Error(
        [message, container?.innerHTML].filter(Boolean).join('\n\n')
      )
      error.name = 'TestingLibraryElementError'
      return error
    },
  })

  // Mock window.matchMedia for components that use media queries
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock IntersectionObserver
  class MockIntersectionObserver {
    readonly root: Element | null = null
    readonly rootMargin: string = ''
    readonly thresholds: ReadonlyArray<number> = []
    disconnect() {}
    observe() {}
    takeRecords(): IntersectionObserverEntry[] { return [] }
    unobserve() {}
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  })

  // Mock ResizeObserver
  class MockResizeObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: MockResizeObserver,
  })
}

// ============================================================================
// React Native Mocks (safe to define in any environment)
// ============================================================================

// Mock @testing-library/react-native → re-export from @testing-library/react
// RNTL imports actual react-native internals with Flow types that Vitest can't parse
vi.mock('@testing-library/react-native', async () => {
  const rtl = await vi.importActual('@testing-library/react')
  return {
    ...rtl,
    renderHook: (rtl as any).renderHook,
  }
})

// Mock react-native-gesture-handler (has Flow types that Vitest can't parse)
vi.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
  Swipeable: 'Swipeable',
  DrawerLayout: 'DrawerLayout',
  State: {},
  PanGestureHandler: 'PanGestureHandler',
  TapGestureHandler: 'TapGestureHandler',
  FlingGestureHandler: 'FlingGestureHandler',
  LongPressGestureHandler: 'LongPressGestureHandler',
  PinchGestureHandler: 'PinchGestureHandler',
  RotationGestureHandler: 'RotationGestureHandler',
  ForceTouchGestureHandler: 'ForceTouchGestureHandler',
  gestureHandlerRootHOC: vi.fn((component: any) => component),
  Directions: {},
}))

// Mock react-native-reanimated (has Flow types that Vitest can't parse)
vi.mock('react-native-reanimated', async () => {
  const RN = await import('./__tests__/mocks/react-native')
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      Image: RN.Image,
      ScrollView: RN.ScrollView,
      FlatList: RN.FlatList,
    },
    useSharedValue: (initial: any) => ({ value: initial }),
    useAnimatedStyle: (cb: any) => {
      try {
        return cb()
      } catch {
        return {}
      }
    },
    withSpring: (value: any) => value,
    withTiming: (value: any) => value,
    withSequence: (...values: any[]) => values[values.length - 1],
    withDelay: (delay: number, value: any) => value,
    withRepeat: (value: any) => value,
    useAnimatedGestureHandler: () => ({}),
    useAnimatedReaction: () => {},
    useDerivedValue: (fn: any) => ({ value: fn() }),
    useAnimatedRef: () => ({ current: null }),
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
  }
})

// Mock react-native-safe-area-context
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  initialWindowMetrics: { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 44, right: 0, bottom: 34, left: 0 } },
}))

// Mock react-native-url-polyfill (must be before other RN mocks)
vi.mock('react-native-url-polyfill/auto', () => ({}))
vi.mock('react-native-url-polyfill', () => ({
  setupURLPolyfill: vi.fn(),
}))

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
    getAllKeys: vi.fn(() => Promise.resolve([])),
    multiGet: vi.fn(() => Promise.resolve([])),
    multiSet: vi.fn(() => Promise.resolve()),
    multiRemove: vi.fn(() => Promise.resolve()),
  },
}))

// Mock expo-camera
vi.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  CameraType: { front: 'front', back: 'back' },
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
  watchPositionAsync: vi.fn(() => Promise.resolve({ remove: vi.fn() })),
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
      assets: [{ uri: 'file:///mock/selfie.jpg', width: 1000, height: 1000, type: 'image' }],
    })
  ),
  launchImageLibraryAsync: vi.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ uri: 'file:///mock/photo.jpg', width: 1000, height: 1000, type: 'image' }],
    })
  ),
  requestCameraPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
  requestMediaLibraryPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
  // New MediaType enum (recommended)
  MediaType: { image: 'images', video: 'videos', livePhoto: 'livePhotos' },
  // Legacy MediaTypeOptions (deprecated but kept for backwards compatibility)
  MediaTypeOptions: { All: 'All', Videos: 'Videos', Images: 'Images' },
  CameraType: { front: 'front', back: 'back' },
}))

// Mock expo-haptics
vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(() => Promise.resolve()),
  notificationAsync: vi.fn(() => Promise.resolve()),
  selectionAsync: vi.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

// Mock expo-notifications
vi.mock('expo-notifications', () => ({
  getPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: vi.fn(() => Promise.resolve({ data: 'ExponentPushToken[mock]' })),
  setNotificationHandler: vi.fn(),
  addNotificationReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 },
}))

// Mock expo-secure-store
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(() => Promise.resolve(null)),
  setItemAsync: vi.fn(() => Promise.resolve()),
  deleteItemAsync: vi.fn(() => Promise.resolve()),
}))

// Mock expo-device
vi.mock('expo-device', () => ({
  isDevice: true,
  brand: 'Mock',
  modelName: 'MockDevice',
  osName: 'MockOS',
  osVersion: '1.0',
}))

// Mock expo-constants
vi.mock('expo-constants', () => ({
  default: {
    expoConfig: { name: 'test', slug: 'test' },
    manifest: null,
    systemFonts: [],
    appOwnership: 'expo',
    executionEnvironment: 'storeClient',
  },
}))

// Mock react-native-maps
vi.mock('react-native-maps', () => ({
  __esModule: true,
  default: 'MapView',
  Marker: 'Marker',
  PROVIDER_GOOGLE: 'google',
}))

// Mock react-native-svg
vi.mock('react-native-svg', () => {
  const React = require('react');
  const createSvgMock = (name: string) => {
    const Component = React.forwardRef((props: any, ref: any) =>
      React.createElement(name, { ...props, ref })
    );
    Component.displayName = name;
    return Component;
  };
  const Svg = createSvgMock('Svg');
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Circle: createSvgMock('Circle'),
    Ellipse: createSvgMock('Ellipse'),
    G: createSvgMock('G'),
    Text: createSvgMock('Text'),
    TSpan: createSvgMock('TSpan'),
    TextPath: createSvgMock('TextPath'),
    Path: createSvgMock('Path'),
    Polygon: createSvgMock('Polygon'),
    Polyline: createSvgMock('Polyline'),
    Line: createSvgMock('Line'),
    Rect: createSvgMock('Rect'),
    Use: createSvgMock('Use'),
    Image: createSvgMock('Image'),
    Symbol: createSvgMock('Symbol'),
    Defs: createSvgMock('Defs'),
    LinearGradient: createSvgMock('LinearGradient'),
    RadialGradient: createSvgMock('RadialGradient'),
    Stop: createSvgMock('Stop'),
    ClipPath: createSvgMock('ClipPath'),
    Pattern: createSvgMock('Pattern'),
    Mask: createSvgMock('Mask'),
    SvgXml: createSvgMock('SvgXml'),
  };
})

// Mock @dicebear/core
vi.mock('@dicebear/core', () => ({
  createAvatar: vi.fn(() => ({
    toString: () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#ccc"/></svg>',
    toDataUri: () => 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23ccc"/></svg>',
  })),
}))

// Mock @dicebear/collection
vi.mock('@dicebear/collection', () => ({
  avataaars: { meta: { title: 'Avataaars' } },
}))

// Mock @expo/vector-icons
vi.mock('@expo/vector-icons', () => ({
  AntDesign: 'AntDesign',
  Entypo: 'Entypo',
  EvilIcons: 'EvilIcons',
  Feather: 'Feather',
  FontAwesome: 'FontAwesome',
  FontAwesome5: 'FontAwesome5',
  FontAwesome6: 'FontAwesome6',
  Fontisto: 'Fontisto',
  Foundation: 'Foundation',
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  MaterialIcons: 'MaterialIcons',
  Octicons: 'Octicons',
  SimpleLineIcons: 'SimpleLineIcons',
  Zocial: 'Zocial',
  createIconSet: vi.fn(() => 'Icon'),
}))

// Mock @react-navigation/native
vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: vi.fn(),
    goBack: vi.fn(),
    replace: vi.fn(),
    reset: vi.fn(),
    setOptions: vi.fn(),
    addListener: vi.fn(() => () => {}),
  }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: vi.fn((callback) => {
    const cleanup = callback()
    return cleanup
  }),
  useIsFocused: () => true,
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  createNavigationContainerRef: () => ({ current: null }),
}))

// Mock @react-navigation/native-stack
vi.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: () => null,
  }),
}))

// Mock @react-navigation/bottom-tabs
vi.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: () => null,
  }),
}))

// Mock react-native core
// Note: In Vitest 4, vi.importActual('react-native') fails due to Flow types
// So we provide a complete mock without importing the actual module
vi.mock('react-native', () => {
  const React = require('react')

  // Create a pressable component that maps onPress to onClick for jsdom
  const createPressable = (Tag: string) => {
    const Component = React.forwardRef(
      ({ onPress, children, testID, accessibilityState, accessibilityLabel, disabled, ...rest }: any, ref: any) =>
        React.createElement(Tag, {
          ...rest,
          ref,
          testid: testID,
          onClick: !disabled ? onPress : undefined,
          accessibilitystate: accessibilityState ? JSON.stringify(accessibilityState) : undefined,
          accessibilitylabel: accessibilityLabel,
          disabled: disabled || undefined,
        }, children)
    )
    Component.displayName = Tag
    return Component
  }

  // Mock FlatList to actually render items
  const FlatListMock = ({ data, renderItem, keyExtractor, ListHeaderComponent, ListEmptyComponent, testID, refreshControl, ...rest }: any) => {
    const items = data ?? []
    return React.createElement('div', { testid: testID, ...rest },
      ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? React.createElement(ListHeaderComponent) : ListHeaderComponent) : null,
      items.length === 0 && ListEmptyComponent
        ? (typeof ListEmptyComponent === 'function' ? React.createElement(ListEmptyComponent) : ListEmptyComponent)
        : items.map((item: any, index: number) =>
            renderItem ? renderItem({ item, index, separators: {} }) : null
          ),
      refreshControl || null
    )
  }
  FlatListMock.displayName = 'FlatList'

  // Mock SectionList to actually render sections
  const SectionListMock = ({ sections, renderItem, renderSectionHeader, keyExtractor, ListHeaderComponent, ListEmptyComponent, testID, ...rest }: any) => {
    return React.createElement('div', { testid: testID, ...rest },
      ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? React.createElement(ListHeaderComponent) : ListHeaderComponent) : null,
      (sections ?? []).map((section: any, sIdx: number) =>
        React.createElement('div', { key: sIdx },
          renderSectionHeader ? renderSectionHeader({ section }) : null,
          (section.data ?? []).map((item: any, index: number) =>
            renderItem ? renderItem({ item, index, section, separators: {} }) : null
          )
        )
      )
    )
  }
  SectionListMock.displayName = 'SectionList'

  return ({
  // Core components
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  FlatList: FlatListMock,
  SectionList: SectionListMock,
  TouchableOpacity: createPressable('button'),
  TouchableHighlight: createPressable('button'),
  TouchableWithoutFeedback: createPressable('div'),
  Pressable: createPressable('button'),
  Button: createPressable('button'),
  Switch: 'Switch',
  ActivityIndicator: 'ActivityIndicator',
  Modal: 'Modal',
  SafeAreaView: 'SafeAreaView',
  StatusBar: 'StatusBar',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  RefreshControl: 'RefreshControl',
  // StyleSheet
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T) => styles,
    flatten: (style: unknown) => style,
    hairlineWidth: 1,
    absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  },
  // APIs
  Alert: {
    alert: vi.fn(),
  },
  Linking: {
    openURL: vi.fn(() => Promise.resolve()),
    canOpenURL: vi.fn(() => Promise.resolve(true)),
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
    getInitialURL: vi.fn(() => Promise.resolve(null)),
  },
  Platform: {
    OS: 'ios',
    Version: '17.0',
    isPad: false,
    isTVOS: false,
    isTV: false,
    select: <T>(obj: { ios?: T; android?: T; default?: T }) => obj.ios ?? obj.default,
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }),
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
    set: vi.fn(),
  },
  Animated: {
    View: 'Animated.View',
    Text: 'Animated.Text',
    Image: 'Animated.Image',
    ScrollView: 'Animated.ScrollView',
    FlatList: 'Animated.FlatList',
    Value: class {
      _value: number
      constructor(val: number) { this._value = val }
      setValue(val: number) { this._value = val }
      __getValue() { return this._value }
      setOffset() {}
      flattenOffset() {}
      extractOffset() {}
      addListener() { return '' }
      removeListener() {}
      removeAllListeners() {}
      stopAnimation() {}
      resetAnimation() {}
      interpolate() { return this }
    },
    ValueXY: class {
      x: any
      y: any
      constructor(valueIn?: {x: number | any, y: number | any} | undefined) {
        this.x = valueIn?.x ?? 0
        this.y = valueIn?.y ?? 0
      }
      setValue(value: {x: number, y: number}) {
        this.x = value.x
        this.y = value.y
      }
      setOffset(offset: {x: number, y: number}) {}
      flattenOffset() {}
      extractOffset() {}
      __getValue() { return { x: this.x, y: this.y } }
      stopAnimation() {}
      addListener() { return '' }
      removeListener() {}
      removeAllListeners() {}
      getLayout() {
        return {
          left: this.x,
          top: this.y,
        }
      }
      getTranslateTransform() {
        return [
          { translateX: this.x },
          { translateY: this.y },
        ]
      }
    },
    timing: () => ({ start: (cb?: () => void) => cb?.(), stop: vi.fn(), reset: vi.fn() }),
    spring: () => ({ start: (cb?: () => void) => cb?.(), stop: vi.fn(), reset: vi.fn() }),
    decay: () => ({ start: (cb?: () => void) => cb?.(), stop: vi.fn(), reset: vi.fn() }),
    parallel: () => ({ start: (cb?: () => void) => cb?.(), stop: vi.fn(), reset: vi.fn() }),
    sequence: () => ({ start: (cb?: () => void) => cb?.(), stop: vi.fn(), reset: vi.fn() }),
    stagger: () => ({ start: (cb?: () => void) => cb?.(), stop: vi.fn(), reset: vi.fn() }),
    loop: () => ({ start: (cb?: () => void) => cb?.(), stop: vi.fn(), reset: vi.fn() }),
    event: () => vi.fn(),
    add: () => ({}),
    subtract: () => ({}),
    multiply: () => ({}),
    divide: () => ({}),
    modulo: () => ({}),
    diffClamp: () => ({}),
    delay: () => ({}),
    createAnimatedComponent: (component: unknown) => component,
  },
  Easing: {
    linear: (t: number) => t,
    ease: (t: number) => t,
    quad: (t: number) => t * t,
    cubic: (t: number) => t * t * t,
    poly: () => (t: number) => t,
    sin: (t: number) => t,
    circle: (t: number) => t,
    exp: (t: number) => t,
    elastic: () => (t: number) => t,
    back: () => (t: number) => t,
    bounce: (t: number) => t,
    bezier: () => (t: number) => t,
    in: (easing: (t: number) => number) => easing,
    out: (easing: (t: number) => number) => easing,
    inOut: (easing: (t: number) => number) => easing,
  },
  Keyboard: {
    dismiss: vi.fn(),
    addListener: vi.fn(() => ({ remove: vi.fn() })),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
    isVisible: vi.fn(() => false),
    metrics: vi.fn(() => null),
  },
  Appearance: {
    getColorScheme: vi.fn(() => 'light'),
    addChangeListener: vi.fn(() => ({ remove: vi.fn() })),
    setColorScheme: vi.fn(),
  },
  AppState: {
    currentState: 'active',
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
    removeEventListener: vi.fn(),
  },
  PanResponder: {
    create: (config: any) => ({
      panHandlers: {
        onMoveShouldSetResponder: vi.fn(),
        onMoveShouldSetResponderCapture: vi.fn(),
        onResponderEnd: vi.fn(),
        onResponderGrant: vi.fn(),
        onResponderMove: vi.fn(),
        onResponderReject: vi.fn(),
        onResponderRelease: vi.fn(),
        onResponderStart: vi.fn(),
        onResponderTerminate: vi.fn(),
        onResponderTerminationRequest: vi.fn(),
        onStartShouldSetResponder: vi.fn(),
        onStartShouldSetResponderCapture: vi.fn(),
      },
    }),
  },
  NativeModules: {},
  NativeEventEmitter: vi.fn(() => ({
    addListener: vi.fn(() => ({ remove: vi.fn() })),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
  })),
  PixelRatio: {
    get: () => 2,
    getFontScale: () => 1,
    getPixelSizeForLayoutSize: (size: number) => size * 2,
    roundToNearestPixel: (size: number) => size,
  },
  useWindowDimensions: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }),
  useColorScheme: () => 'light',
})})

// Mock @react-native-community/netinfo
vi.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: vi.fn(() => vi.fn()),
    fetch: vi.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  },
  useNetInfo: () => ({ isConnected: true, isInternetReachable: true }),
}))

// Mock posthog-react-native
vi.mock('posthog-react-native', () => {
  const mockPostHog = vi.fn().mockImplementation(() => ({
    identify: vi.fn(),
    capture: vi.fn(),
    screen: vi.fn(),
    flush: vi.fn(() => Promise.resolve()),
    reset: vi.fn(),
    shutdown: vi.fn(() => Promise.resolve()),
    optIn: vi.fn(),
    optOut: vi.fn(),
    isOptOut: vi.fn(() => false),
    enable: vi.fn(),
    disable: vi.fn(),
    debug: vi.fn(),
  }))
  return {
    __esModule: true,
    default: mockPostHog,
    PostHog: mockPostHog,
    usePostHog: vi.fn(() => null),
    PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
  }
})

// Mock expo-crypto
vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => '00000000-0000-0000-0000-000000000000'),
  getRandomBytesAsync: vi.fn(() => Promise.resolve(new Uint8Array(16))),
  digestStringAsync: vi.fn(() => Promise.resolve('mock-hash')),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
    SHA384: 'SHA-384',
    SHA512: 'SHA-512',
    MD5: 'MD5',
    SHA1: 'SHA-1',
  },
  CryptoEncoding: {
    HEX: 'hex',
    BASE64: 'base64',
  },
}))

// Mock @sentry/react-native
vi.mock('@sentry/react-native', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  wrap: vi.fn((component: unknown) => component),
  withScope: vi.fn((callback: (scope: unknown) => void) => callback({ setExtra: vi.fn() })),
  Severity: {
    Fatal: 'fatal',
    Error: 'error',
    Warning: 'warning',
    Info: 'info',
    Debug: 'debug',
  },
}))

// Mock react-native-webview
vi.mock('react-native-webview', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(({ onMessage, onLoad, onError, style, ...props }) => {
    // Simulate WebView component
    return {
      ...props,
      type: 'WebView',
      style,
      injectJavaScript: vi.fn(),
      postMessage: vi.fn(),
    }
  }),
  WebView: 'WebView',
}))

// Mock expo-file-system with new File class and legacy functions
vi.mock('expo-file-system', () => ({
  // New File class API (expo-file-system v19+)
  File: class MockFile {
    uri: string
    constructor(...uris: string[]) {
      this.uri = uris.join('/')
    }
    base64 = vi.fn(() => Promise.resolve('bW9jay1iYXNlNjQtY29udGVudA==')) // mock base64 content
    base64Sync = vi.fn(() => 'bW9jay1iYXNlNjQtY29udGVudA==')
    text = vi.fn(() => Promise.resolve('mock-file-content'))
    textSync = vi.fn(() => 'mock-file-content')
    exists = true
  },
  // Paths utilities
  Paths: {
    cache: { uri: 'file:///mock/cache/' },
    document: { uri: 'file:///mock/documents/' },
    join: (...paths: string[]) => paths.join('/'),
  },
  // Legacy functions (for backward compatibility)
  documentDirectory: 'file:///mock/documents/',
  cacheDirectory: 'file:///mock/cache/',
  downloadAsync: vi.fn(() => Promise.resolve({ uri: 'file:///mock/downloaded.jpg' })),
  getInfoAsync: vi.fn(() => Promise.resolve({ exists: true, isDirectory: false, size: 1024 })),
  readAsStringAsync: vi.fn(() => Promise.resolve('mock-file-content')),
  writeAsStringAsync: vi.fn(() => Promise.resolve()),
  deleteAsync: vi.fn(() => Promise.resolve()),
  makeDirectoryAsync: vi.fn(() => Promise.resolve()),
  copyAsync: vi.fn(() => Promise.resolve()),
  moveAsync: vi.fn(() => Promise.resolve()),
  EncodingType: {
    Base64: 'base64',
    UTF8: 'utf8',
  },
}))

// ============================================================================
// Console Output Suppression
// ============================================================================

const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args: unknown[]) => {
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
