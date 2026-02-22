/**
 * RealtimeManager Tests
 *
 * Tests the realtime subscription manager for Supabase channels.
 * Validates channel lifecycle, ref counting, and cleanup logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createMockSupabaseClient } from '../../__tests__/utils/supabase-mock'

// ============================================================================
// MOCKS
// ============================================================================

// Create a mock channel factory
const createMockChannel = () => {
  const mockOn = vi.fn()
  const mockSubscribe = vi.fn()

  const channel = {
    on: mockOn,
    subscribe: mockSubscribe,
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    send: vi.fn(),
  } as unknown as RealtimeChannel

  // Make methods chainable
  mockOn.mockReturnValue(channel)
  mockSubscribe.mockReturnValue(channel)

  return channel
}

const mockSupabaseClient = {
  ...createMockSupabaseClient(),
  channel: vi.fn(() => createMockChannel()),
  removeChannel: vi.fn(),
}

// Mock the supabase import
vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabaseClient,
}))

// Mock __DEV__ for console logs
global.__DEV__ = false

// ============================================================================
// TESTS
// ============================================================================

describe('realtimeManager', () => {
  let realtimeManager: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Reset singleton by re-importing
    vi.resetModules()
    const module = await import('../realtimeManager')
    realtimeManager = module.realtimeManager
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // --------------------------------------------------------------------------
  // MODULE IMPORT
  // --------------------------------------------------------------------------

  it('exports realtimeManager singleton', async () => {
    const module = await import('../realtimeManager')
    expect(module.realtimeManager).toBeDefined()
    expect(typeof module.realtimeManager).toBe('object')
  })

  it('has subscribe method', async () => {
    expect(realtimeManager.subscribe).toBeDefined()
    expect(typeof realtimeManager.subscribe).toBe('function')
  })

  it('has unsubscribe method', async () => {
    expect(realtimeManager.unsubscribe).toBeDefined()
    expect(typeof realtimeManager.unsubscribe).toBe('function')
  })

  it('has cleanup method', async () => {
    expect(realtimeManager.cleanup).toBeDefined()
    expect(typeof realtimeManager.cleanup).toBe('function')
  })

  it('has setAuthenticated method', async () => {
    expect(realtimeManager.setAuthenticated).toBeDefined()
    expect(typeof realtimeManager.setAuthenticated).toBe('function')
  })

  it('has getChannelCount method', async () => {
    expect(realtimeManager.getChannelCount).toBeDefined()
    expect(typeof realtimeManager.getChannelCount).toBe('function')
  })

  it('has getActiveChannels method', async () => {
    expect(realtimeManager.getActiveChannels).toBeDefined()
    expect(typeof realtimeManager.getActiveChannels).toBe('function')
  })

  // --------------------------------------------------------------------------
  // CHANNEL SUBSCRIPTION
  // --------------------------------------------------------------------------

  it('creates new channel on first subscription', async () => {
    const config = {
      table: 'messages',
      event: 'INSERT' as const,
      callback: vi.fn(),
    }

    const channelId = await realtimeManager.subscribe(config)

    expect(channelId).toBe('messages:INSERT:all')
    expect(mockSupabaseClient.channel).toHaveBeenCalledWith('messages:INSERT:all')
    expect(realtimeManager.getChannelCount()).toBe(1)
  })

  it('reuses existing channel for duplicate subscription', async () => {
    const config = {
      table: 'messages',
      event: 'INSERT' as const,
      callback: vi.fn(),
    }

    const channelId1 = await realtimeManager.subscribe(config)
    const channelId2 = await realtimeManager.subscribe(config)

    expect(channelId1).toBe(channelId2)
    expect(mockSupabaseClient.channel).toHaveBeenCalledTimes(1)
    expect(realtimeManager.getChannelCount()).toBe(1)
  })

  it('generates unique channel IDs based on config', async () => {
    const config1 = {
      table: 'messages',
      event: 'INSERT' as const,
      callback: vi.fn(),
    }

    const config2 = {
      table: 'posts',
      event: 'INSERT' as const,
      callback: vi.fn(),
    }

    const channelId1 = await realtimeManager.subscribe(config1)
    const channelId2 = await realtimeManager.subscribe(config2)

    expect(channelId1).not.toBe(channelId2)
    expect(realtimeManager.getChannelCount()).toBe(2)
  })

  it('includes filter in channel ID', async () => {
    const config = {
      table: 'messages',
      event: 'INSERT' as const,
      filter: 'user_id=eq.123',
      callback: vi.fn(),
    }

    const channelId = await realtimeManager.subscribe(config)

    expect(channelId).toBe('messages:INSERT:user_id=eq.123')
  })

  it('defaults to wildcard event', async () => {
    const config = {
      table: 'messages',
      callback: vi.fn(),
    }

    const channelId = await realtimeManager.subscribe(config)

    expect(channelId).toBe('messages:*:all')
  })

  // --------------------------------------------------------------------------
  // CHANNEL UNSUBSCRIPTION
  // --------------------------------------------------------------------------

  it('decrements ref count on unsubscribe', async () => {
    const config = {
      table: 'messages',
      callback: vi.fn(),
    }

    const channelId = await realtimeManager.subscribe(config)
    await realtimeManager.subscribe(config) // Increment ref count

    expect(realtimeManager.getChannelCount()).toBe(1)

    realtimeManager.unsubscribe(channelId)

    // Channel still exists (ref count = 1)
    expect(realtimeManager.getChannelCount()).toBe(1)
  })

  it('removes channel when ref count reaches zero', async () => {
    const config = {
      table: 'messages',
      callback: vi.fn(),
    }

    const channelId = await realtimeManager.subscribe(config)

    expect(realtimeManager.getChannelCount()).toBe(1)

    realtimeManager.unsubscribe(channelId)

    // Wait for async cleanup to complete
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Channel removed (ref count = 0)
    expect(realtimeManager.getChannelCount()).toBe(0)
    expect(mockSupabaseClient.removeChannel).toHaveBeenCalled()
  })

  it('warns when unsubscribing non-existent channel', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    realtimeManager.unsubscribe('non-existent')

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Channel not found')
    )

    consoleWarnSpy.mockRestore()
  })

  // --------------------------------------------------------------------------
  // CHANNEL LIMIT
  // --------------------------------------------------------------------------

  it('enforces max channel limit', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Subscribe to 6 channels (max is 5)
    for (let i = 0; i < 6; i++) {
      await realtimeManager.subscribe({
        table: `table${i}`,
        callback: vi.fn(),
      })
    }

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Max channels')
    )

    consoleWarnSpy.mockRestore()
  })

  // --------------------------------------------------------------------------
  // CLEANUP
  // --------------------------------------------------------------------------

  it('removes all channels on cleanup', async () => {
    // Create multiple channels
    await realtimeManager.subscribe({ table: 'messages', callback: vi.fn() })
    await realtimeManager.subscribe({ table: 'posts', callback: vi.fn() })
    await realtimeManager.subscribe({ table: 'profiles', callback: vi.fn() })

    expect(realtimeManager.getChannelCount()).toBe(3)

    await realtimeManager.cleanup()

    expect(realtimeManager.getChannelCount()).toBe(0)
    expect(mockSupabaseClient.removeChannel).toHaveBeenCalledTimes(3)
  })

  it('cleans up on setAuthenticated(false)', async () => {
    await realtimeManager.subscribe({ table: 'messages', callback: vi.fn() })

    expect(realtimeManager.getChannelCount()).toBe(1)

    await realtimeManager.setAuthenticated(false)

    expect(realtimeManager.getChannelCount()).toBe(0)
  })

  it('does not cleanup on setAuthenticated(true)', async () => {
    await realtimeManager.subscribe({ table: 'messages', callback: vi.fn() })

    expect(realtimeManager.getChannelCount()).toBe(1)

    await realtimeManager.setAuthenticated(true)

    expect(realtimeManager.getChannelCount()).toBe(1)
  })

  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------

  it('returns active channel IDs', async () => {
    await realtimeManager.subscribe({ table: 'messages', callback: vi.fn() })
    await realtimeManager.subscribe({ table: 'posts', callback: vi.fn() })

    const activeChannels = realtimeManager.getActiveChannels()

    expect(activeChannels).toHaveLength(2)
    expect(activeChannels).toContain('messages:*:all')
    expect(activeChannels).toContain('posts:*:all')
  })

  it('returns empty array when no channels', async () => {
    const activeChannels = realtimeManager.getActiveChannels()

    expect(activeChannels).toHaveLength(0)
    expect(Array.isArray(activeChannels)).toBe(true)
  })
})
