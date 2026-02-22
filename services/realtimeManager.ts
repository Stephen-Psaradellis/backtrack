/**
 * Realtime Subscription Manager (P-029)
 *
 * Centralizes all Supabase Realtime channel management to:
 * - Prevent duplicate subscriptions
 * - Limit concurrent channels (3-5 max)
 * - Auth-aware cleanup on logout
 * - Efficient resource management
 *
 * Lazy-loads supabase to avoid blocking module initialization.
 */

import type { RealtimeChannel } from '@supabase/supabase-js'
import type { AppSupabaseClient } from '../lib/supabase'

// ============================================================================
// TYPES
// ============================================================================

interface ChannelConfig {
  table: string
  filter?: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  callback: (payload: any) => void
}

interface ManagedChannel {
  id: string
  channel: RealtimeChannel
  config: ChannelConfig
  refCount: number
}

// ============================================================================
// SINGLETON MANAGER
// ============================================================================

class RealtimeManager {
  private channels: Map<string, ManagedChannel> = new Map()
  private maxChannels = 5
  private isAuthenticated = false
  private supabaseClient: AppSupabaseClient | null = null

  /**
   * Lazy-load supabase client to avoid blocking module initialization
   */
  private async getSupabase(): Promise<AppSupabaseClient> {
    if (!this.supabaseClient) {
      const { supabase } = await import('../lib/supabase')
      this.supabaseClient = supabase
    }
    return this.supabaseClient
  }

  /**
   * Generate a unique channel ID from config
   */
  private getChannelId(config: ChannelConfig): string {
    const { table, filter, event } = config
    return `${table}:${event || '*'}:${filter || 'all'}`
  }

  /**
   * Subscribe to a Realtime channel (or reuse existing)
   */
  async subscribe(config: ChannelConfig): Promise<string> {
    const channelId = this.getChannelId(config)

    // Reuse existing channel if available
    const existing = this.channels.get(channelId)
    if (existing) {
      existing.refCount++
      if (__DEV__) {
        console.log(`[RealtimeManager] Reusing channel: ${channelId} (refs: ${existing.refCount})`)
      }
      return channelId
    }

    // Check channel limit
    if (this.channels.size >= this.maxChannels) {
      console.warn(
        `[RealtimeManager] Max channels (${this.maxChannels}) reached. Consider unsubscribing unused channels.`
      )
      // Remove oldest channel with refCount = 0
      for (const [id, managed] of this.channels.entries()) {
        if (managed.refCount === 0) {
          await this.forceUnsubscribe(id)
          break
        }
      }
    }

    // Lazy-load supabase
    const supabase = await this.getSupabase()

    // Create new channel
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: config.event || '*',
          schema: 'public',
          table: config.table,
          filter: config.filter,
        },
        config.callback
      )
      .subscribe((status) => {
        if (__DEV__) {
          console.log(`[RealtimeManager] Channel ${channelId} status: ${status}`)
        }
      })

    this.channels.set(channelId, {
      id: channelId,
      channel,
      config,
      refCount: 1,
    })

    if (__DEV__) {
      console.log(`[RealtimeManager] Created channel: ${channelId}`)
    }

    return channelId
  }

  /**
   * Unsubscribe from a channel (decrements ref count)
   */
  unsubscribe(channelId: string): void {
    const managed = this.channels.get(channelId)
    if (!managed) {
      console.warn(`[RealtimeManager] Channel not found: ${channelId}`)
      return
    }

    managed.refCount--

    if (__DEV__) {
      console.log(`[RealtimeManager] Decremented ref for ${channelId} (refs: ${managed.refCount})`)
    }

    // Remove channel when no more references
    if (managed.refCount <= 0) {
      this.forceUnsubscribe(channelId)
    }
  }

  /**
   * Force unsubscribe and remove a channel
   */
  private async forceUnsubscribe(channelId: string): Promise<void> {
    const managed = this.channels.get(channelId)
    if (!managed) return

    const supabase = await this.getSupabase()
    supabase.removeChannel(managed.channel)
    this.channels.delete(channelId)

    if (__DEV__) {
      console.log(`[RealtimeManager] Removed channel: ${channelId}`)
    }
  }

  /**
   * Cleanup all channels (called on logout)
   */
  async cleanup(): Promise<void> {
    if (__DEV__) {
      console.log(`[RealtimeManager] Cleaning up ${this.channels.size} channels`)
    }

    if (this.channels.size > 0) {
      const supabase = await this.getSupabase()
      for (const [channelId, managed] of this.channels.entries()) {
        supabase.removeChannel(managed.channel)
      }
    }

    this.channels.clear()
  }

  /**
   * Set authentication status
   */
  async setAuthenticated(isAuth: boolean): Promise<void> {
    this.isAuthenticated = isAuth
    if (!isAuth) {
      await this.cleanup()
    }
  }

  /**
   * Get current channel count
   */
  getChannelCount(): number {
    return this.channels.size
  }

  /**
   * Get all active channel IDs
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys())
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager()
