// Dynamic Expo configuration
// Environment variables are read at build time for flexibility across environments

export default ({ config }) => {
  // Separate API keys for iOS and Android (better for security restrictions and usage tracking)
  const googleMapsIosApiKey = process.env.EXPO_PUBLIC_GCP_MAPS_IOS_API_KEY || '';
  const googleMapsAndroidApiKey = process.env.EXPO_PUBLIC_GCP_MAPS_ANDROID_API_KEY || '';
  const easProjectId = process.env.EAS_PROJECT_ID;

  if (!easProjectId) {
    throw new Error('EAS_PROJECT_ID environment variable is required. Set it in your .env or eas.json.');
  }

  return {
    ...config,
    name: 'Backtrack',
    slug: 'backtrack',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    updates: {
      url: `https://u.expo.dev/${easProjectId}`,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'app.backtrack.social',
      runtimeVersion: {
        policy: 'appVersion',
      },
      associatedDomains: ['applinks:backtrack.social', 'webcredentials:backtrack.social'],
      // Note: Google Maps API key is configured via react-native-maps plugin
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Backtrack uses your location to show missed connections at nearby venues like cafes, gyms, and parks you visit.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'Backtrack uses background location to notify you when someone posts a missed connection at a venue you\'re visiting. You can disable this anytime in Settings.',
        NSCameraUsageDescription:
          'Backtrack needs camera access for selfie verification when posting missed connections.',
        NSPhotoLibraryUsageDescription:
          'Backtrack needs photo library access to select photos for your profile.',
        UIBackgroundModes: ['remote-notification', 'location', 'fetch'],
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      runtimeVersion: '1.0.0',
      package: 'app.backtrack.social',
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            { scheme: 'https', host: 'backtrack.social', pathPrefix: '/' },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      config: {
        googleMaps: {
          apiKey: googleMapsAndroidApiKey,
        },
      },
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-font',
      [
        'react-native-maps',
        {
          iosGoogleMapsApiKey: googleMapsIosApiKey,
          androidGoogleMapsApiKey: googleMapsAndroidApiKey,
        },
      ],
      [
        'expo-updates',
        {
          enabled: true,
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Backtrack uses background location to notify you when someone posts a missed connection at a venue you\'re visiting. You can disable this anytime in Settings.',
          locationWhenInUsePermission:
            'Backtrack uses your location to show missed connections at nearby venues like cafes, gyms, and parks you visit.',
          isBackgroundLocationEnabled: true,
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            'Backtrack needs camera access for selfie verification when posting missed connections.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Backtrack needs photo library access to select photos for your profile.',
          cameraPermission:
            'Backtrack needs camera access for selfie verification when posting missed connections.',
        },
      ],
      [
        'expo-notifications',
        {
          color: '#FF6B6B',
          defaultChannel: 'default',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: easProjectId,
      },
      // Expose environment variables to the app at runtime
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      googleMapsIosApiKey,
      googleMapsAndroidApiKey,
    },
    experiments: {
      typedRoutes: true,
    },
  };
};
