/**
 * Network Status Singleton (P-041)
 *
 * Prevents duplicate NetInfo subscriptions by using a singleton pattern.
 * Multiple components can use useNetworkStatus without creating multiple listeners.
 */

import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo'

// ============================================================================
// SINGLETON
// ============================================================================

class NetworkStatusSingleton {
  private subscription: NetInfoSubscription | null = null
  private listeners: Set<(state: NetInfoState) => void> = new Set()
  private currentState: NetInfoState | null = null
  private initialized = false

  /**
   * Initialize the singleton (only once)
   */
  initialize(): void {
    if (this.initialized) return

    this.subscription = NetInfo.addEventListener((state) => {
      this.currentState = state
      // Notify all listeners
      this.listeners.forEach((listener) => {
        try {
          listener(state)
        } catch (error) {
          if (__DEV__) {
            console.error('[NetworkSingleton] Listener error:', error)
          }
        }
      })
    })

    // Get initial state
    NetInfo.fetch().then((state) => {
      this.currentState = state
    })

    this.initialized = true

    if (__DEV__) {
      console.log('[NetworkSingleton] Initialized with singleton subscription')
    }
  }

  /**
   * Add a listener for network state changes
   */
  addListener(listener: (state: NetInfoState) => void): () => void {
    this.initialize()
    this.listeners.add(listener)

    // If we have current state, immediately call listener
    if (this.currentState) {
      try {
        listener(this.currentState)
      } catch (error) {
        if (__DEV__) {
          console.error('[NetworkSingleton] Initial listener call error:', error)
        }
      }
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Get current network state
   */
  getCurrentState(): NetInfoState | null {
    return this.currentState
  }

  /**
   * Refresh network state
   */
  async refresh(): Promise<NetInfoState> {
    const state = await NetInfo.fetch()
    this.currentState = state
    return state
  }

  /**
   * Get listener count (for debugging)
   */
  getListenerCount(): number {
    return this.listeners.size
  }

  /**
   * Cleanup (typically not needed, but available for testing)
   */
  cleanup(): void {
    if (this.subscription) {
      this.subscription()
      this.subscription = null
    }
    this.listeners.clear()
    this.currentState = null
    this.initialized = false

    if (__DEV__) {
      console.log('[NetworkSingleton] Cleaned up')
    }
  }
}

// Export singleton instance
export const networkStatusSingleton = new NetworkStatusSingleton()
