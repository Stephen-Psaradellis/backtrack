/**
 * Jest Setup File
 *
 * Global setup and mocks for all tests.
 */

import 'react-native-gesture-handler/jestSetup'

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper')

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

// Mock expo-camera
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  CameraType: {
    front: 'front',
    back: 'back',
  },
  useCameraPermissions: jest.fn(() => [
    { granted: true },
    jest.fn(),
  ]),
}))

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
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
  watchPositionAsync: jest.fn(),
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
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(() =>
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
  launchImageLibraryAsync: jest.fn(() =>
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
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
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
jest.mock('react-native-maps', () => {
  const { View } = require('react-native')
  const MockMapView = (props) => {
    return <View testID={props.testID}>{props.children}</View>
  }
  MockMapView.Marker = (props) => {
    return <View testID={props.testID} />
  }
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMapView.Marker,
    PROVIDER_GOOGLE: 'google',
  }
})

// Mock react-native-svg for avataaars
jest.mock('react-native-svg', () => {
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
  }
})

// Mock avataaars
jest.mock('avataaars', () => {
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: (props) => <View testID="avatar-mock" />,
  }
})

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native')
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
      reset: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn((callback) => callback()),
  }
})

// Mock Alert
jest.spyOn(require('react-native').Alert, 'alert')

// Set up global test timeout
jest.setTimeout(10000)

// Suppress specific console warnings during tests
const originalWarn = console.warn
console.warn = (...args) => {
  const message = args[0]
  if (
    typeof message === 'string' &&
    (message.includes('Animated: `useNativeDriver`') ||
      message.includes('componentWillReceiveProps') ||
      message.includes('componentWillMount'))
  ) {
    return
  }
  originalWarn.apply(console, args)
}
