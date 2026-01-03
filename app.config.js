// Dynamic Expo configuration
// Environment variables are read at build time for flexibility across environments

export default ({ config }) => {
  // Use the correct env var names that match .env file
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GCP_MAPS_API_KEY || '';
  const easProjectId = process.env.EAS_PROJECT_ID || 'c7e1ae8a-a8e1-4010-b978-d6f52acae3c0';

  return {
    ...config,
    name: 'Backtrack',
    slug: 'backtrack',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
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
      config: {
        googleMapsApiKey,
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Backtrack needs your location to show nearby venues where you can post or browse missed connections.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'Backtrack uses your location to discover nearby venues and help you find missed connections.',
        NSCameraUsageDescription:
          'Backtrack needs camera access for selfie verification when posting missed connections.',
        NSPhotoLibraryUsageDescription:
          'Backtrack needs photo library access to select photos for your profile.',
        UIBackgroundModes: ['remote-notification'],
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
          apiKey: googleMapsApiKey,
        },
      },
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
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
      [
        'expo-build-properties',
        {
          ios: {
            // Exclude react-native-maps from iOS autolinking since we only use it on Android
            excludedPackages: ['react-native-maps'],
          },
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
            'Backtrack uses your location to discover nearby venues and help you find missed connections.',
          locationWhenInUsePermission:
            'Backtrack needs your location to show nearby venues where you can post or browse missed connections.',
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
      googleMapsApiKey,
    },
    experiments: {
      typedRoutes: true,
    },
  };
};
