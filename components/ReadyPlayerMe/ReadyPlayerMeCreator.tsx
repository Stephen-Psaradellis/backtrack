/**
 * ReadyPlayerMeCreator Component
 *
 * Embeds the Ready Player Me avatar creator in a WebView.
 * Users can create realistic, customizable full-body avatars.
 */

import React, { useRef, useCallback, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView, WebViewMessageEvent } from 'react-native-webview'
import {
  ReadyPlayerMeCreatorProps,
  RPMAvatarData,
  RPMCreatorConfig,
} from './types'

// ============================================================================
// Constants
// ============================================================================

/**
 * Default Ready Player Me subdomain
 * Users should register at readyplayer.me to get their own subdomain
 */
const DEFAULT_SUBDOMAIN = 'demo'

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RPMCreatorConfig = {
  subdomain: DEFAULT_SUBDOMAIN,
  bodyType: 'fullbody',
  selectBodyType: false,
  clearCache: false,
  quickStart: true,
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build the Ready Player Me iframe URL with configuration
 */
function buildCreatorUrl(config: RPMCreatorConfig): string {
  const subdomain = config.subdomain || DEFAULT_SUBDOMAIN
  const baseUrl = `https://${subdomain}.readyplayer.me/avatar`

  const params = new URLSearchParams()

  // Enable postMessage API
  params.append('frameApi', '')

  // Body type
  if (config.bodyType) {
    params.append('bodyType', config.bodyType)
  }

  // Allow body type selection
  if (config.selectBodyType) {
    params.append('selectBodyType', '')
  }

  // Clear cache
  if (config.clearCache) {
    params.append('clearCache', '')
  }

  // Language
  if (config.language) {
    params.append('language', config.language)
  }

  // Quick start (skip intro)
  if (config.quickStart) {
    params.append('quickStart', '')
  }

  return `${baseUrl}?${params.toString()}`
}

/**
 * JavaScript to inject into WebView to handle Ready Player Me events.
 *
 * NOTE: There's a known RPM bug where v1.avatar.exported doesn't include eventName,
 * and instead just sends the GLB URL as a string. We handle both cases.
 * See: https://forum.readyplayer.me/t/avatar-iframe-v2-not-sending-correct-v1-eventnames/147
 */
const INJECTED_JAVASCRIPT = `
  (function() {
    let hasSubscribed = false;

    // Listen for Ready Player Me events
    window.addEventListener('message', function(event) {
      const data = event.data;

      // Handle string URL (known RPM bug - avatar.exported sends just the URL)
      if (typeof data === 'string' && data.includes('models.readyplayer.me') && data.includes('.glb')) {
        console.log('[RPM WebView] Avatar URL received:', data);
        window.ReactNativeWebView.postMessage(data);
        return;
      }

      // Try to parse JSON
      let json;
      try {
        json = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        return;
      }

      if (!json) return;

      // Log for debugging
      console.log('[RPM WebView] Received message:', JSON.stringify(json));

      // Only process Ready Player Me events
      if (json.source !== 'readyplayerme') {
        return;
      }

      // When frame is ready, subscribe to all events
      if (json.eventName === 'v1.frame.ready' && !hasSubscribed) {
        hasSubscribed = true;
        console.log('[RPM WebView] Frame ready, subscribing to events...');

        window.postMessage(
          JSON.stringify({
            target: 'readyplayerme',
            type: 'subscribe',
            eventName: 'v1.**'
          }),
          '*'
        );

        // Notify React Native
        window.ReactNativeWebView.postMessage(JSON.stringify({
          eventName: 'v1.frame.ready',
          source: 'readyplayerme'
        }));
      }

      // Forward avatar exported event (if it comes with proper format)
      if (json.eventName === 'v1.avatar.exported') {
        console.log('[RPM WebView] Avatar exported:', JSON.stringify(json));
        window.ReactNativeWebView.postMessage(JSON.stringify(json));
      }
    });

    true; // Required for Android
  })();
`

// ============================================================================
// Component
// ============================================================================

/**
 * ReadyPlayerMeCreator - Embeds Ready Player Me avatar creator
 *
 * Features:
 * - Full-body realistic avatar creation
 * - Selfie-based or manual customization
 * - Face, body, hair, clothing customization
 * - Returns avatar URL and metadata on completion
 */
export function ReadyPlayerMeCreator({
  onAvatarCreated,
  onClose,
  config = {},
  title = 'Create Avatar',
  subtitle,
  testID = 'rpm-creator',
}: ReadyPlayerMeCreatorProps): JSX.Element {
  const webViewRef = useRef<WebView>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  // Merge config with defaults
  const mergedConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config]
  )

  // Build the creator URL
  const creatorUrl = useMemo(
    () => buildCreatorUrl(mergedConfig),
    [mergedConfig]
  )

  // Handle messages from WebView
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const rawData = event.nativeEvent.data
        console.log('[ReadyPlayerMeCreator] Raw message:', rawData)
        console.log('[ReadyPlayerMeCreator] Raw type:', typeof rawData)

        // Check if rawData itself is already a URL string (not JSON-wrapped)
        if (typeof rawData === 'string' && rawData.includes('models.readyplayer.me') && rawData.includes('.glb')) {
          // It might be the URL directly or JSON-stringified
          let url = rawData

          // If it's JSON-stringified (starts and ends with quotes when logged)
          // Try to parse it first
          try {
            const parsed = JSON.parse(rawData)
            if (typeof parsed === 'string') {
              url = parsed
            }
          } catch {
            // Not JSON, use rawData as-is
          }

          console.log('[ReadyPlayerMeCreator] URL detected:', url)
          const avatarId = extractAvatarId(url)
          console.log('[ReadyPlayerMeCreator] Extracted avatar ID:', avatarId)

          if (avatarId) {
            console.log('[ReadyPlayerMeCreator] Avatar exported! Calling onAvatarCreated...')
            const avatarData: RPMAvatarData = {
              avatarId,
              url,
            }
            onAvatarCreated(avatarData)
            return
          }
        }

        // Try to parse as JSON for other message types
        let data: Record<string, unknown> | null = null
        try {
          data = JSON.parse(rawData)
        } catch {
          return // Not JSON and not a URL, ignore
        }

        if (!data || typeof data !== 'object') return

        // Handle v1.avatar.exported event (proper format)
        if (data.eventName === 'v1.avatar.exported') {
          console.log('[ReadyPlayerMeCreator] Avatar exported (event format)!')
          const eventData = data.data as Record<string, unknown> | undefined
          const url = eventData?.url as string | undefined
          const avatarId = extractAvatarId(url)

          if (avatarId) {
            const avatarData: RPMAvatarData = {
              avatarId,
              url: url || '',
              userId: eventData?.userId as string | undefined,
              metadata: eventData?.metadata as RPMAvatarData['metadata'],
            }
            onAvatarCreated(avatarData)
          }
          return
        }

        // Handle frame ready event - hide loading indicator
        if (data.eventName === 'v1.frame.ready') {
          console.log('[ReadyPlayerMeCreator] Frame ready')
          setIsLoading(false)
        }
      } catch (error) {
        console.error('[ReadyPlayerMeCreator] Error:', error)
      }
    },
    [onAvatarCreated]
  )

  // Handle WebView load
  const handleLoadEnd = useCallback(() => {
    setIsLoading(false)
  }, [])

  // Handle WebView error
  const handleError = useCallback((error: any) => {
    console.error('[ReadyPlayerMeCreator] WebView error:', error)
    setIsLoading(false)
  }, [])

  return (
    <SafeAreaView style={styles.container} testID={testID}>
      {/* Header with context and close button */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
            testID={`${testID}-close`}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* WebView container */}
      <View style={styles.webViewContainer}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FF6B47" />
            <Text style={styles.loadingText}>Loading avatar creator...</Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: creatorUrl }}
          style={styles.webView}
          onMessage={handleMessage}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          injectedJavaScript={INJECTED_JAVASCRIPT}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
          startInLoadingState={false}
          scalesPageToFit={true}
          // Allow camera access for selfie feature
          mediaCapturePermissionGrantType="grant"
          allowsProtectedMedia={true}
          testID={`${testID}-webview`}
        />
      </View>
    </SafeAreaView>
  )
}

/**
 * Extract avatar ID from URL
 */
function extractAvatarId(url: string | undefined): string {
  if (!url) return ''

  // URL format: https://models.readyplayer.me/{avatarId}.glb
  const match = url.match(/models\.readyplayer\.me\/([a-zA-Z0-9]+)\.glb/)
  return match ? match[1] : ''
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#FF6B47',
    fontWeight: '500',
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
})

export default ReadyPlayerMeCreator
