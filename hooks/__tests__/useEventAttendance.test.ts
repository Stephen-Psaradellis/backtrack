/**
 * Tests for hooks/useEventAttendance.ts
 *
 * Tests event attendance management hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock supabase
const mockRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

// Mock useAuth
const mockUseAuth = vi.fn()
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

import { useEventAttendance, useUserEvents } from '../useEventAttendance'

describe('useEventAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated user
    mockUseAuth.mockReturnValue({
      userId: 'user-123',
      isAuthenticated: true,
    })

    // Default: no attendees
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_event_attendees') {
        return Promise.resolve({
          data: [],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })
  })

  describe('initial state', () => {
    it('should start with empty attendees', async () => {
      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.attendees).toEqual([])
    })

    it('should start with null userStatus', async () => {
      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.userStatus).toBeNull()
    })

    it('should start with zero counts', async () => {
      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.goingCount).toBe(0)
      expect(result.current.interestedCount).toBe(0)
    })

    it('should fetch attendees on mount', async () => {
      renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_event_attendees', {
          p_event_id: 'event-123',
          p_status: null,
          p_limit: 20,
        })
      })
    })

    it('should not fetch when enabled is false', async () => {
      renderHook(() => useEventAttendance('event-123', { enabled: false }))

      // Wait a bit to ensure no fetch happens
      await new Promise((r) => setTimeout(r, 50))

      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('should not fetch when eventId is empty', async () => {
      renderHook(() => useEventAttendance(''))

      await new Promise((r) => setTimeout(r, 50))

      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('should use custom limit when provided', async () => {
      renderHook(() => useEventAttendance('event-123', { limit: 50 }))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_event_attendees', {
          p_event_id: 'event-123',
          p_status: null,
          p_limit: 50,
        })
      })
    })
  })

  describe('attendees data', () => {
    it('should set attendees from response', async () => {
      const mockAttendees = [
        {
          user_id: 'user-1',
          display_name: 'Alice',
          avatar_url: null,
          is_verified: true,
          status: 'going',
          attended_at: '2024-01-01T12:00:00Z',
        },
        {
          user_id: 'user-2',
          display_name: 'Bob',
          avatar_url: null,
          is_verified: false,
          status: 'interested',
          attended_at: '2024-01-01T13:00:00Z',
        },
      ]

      mockRpc.mockImplementation((name: string) => {
        if (name === 'get_event_attendees') {
          return Promise.resolve({ data: mockAttendees, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.attendees).toEqual(mockAttendees)
      })

      expect(result.current.goingCount).toBe(1)
      expect(result.current.interestedCount).toBe(1)
    })

    it('should set userStatus when user is in attendees', async () => {
      const mockAttendees = [
        {
          user_id: 'user-123',
          display_name: 'Current User',
          avatar_url: null,
          is_verified: true,
          status: 'going',
          attended_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockRpc.mockImplementation((name: string) => {
        if (name === 'get_event_attendees') {
          return Promise.resolve({ data: mockAttendees, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.userStatus).toBe('going')
      })
    })
  })

  describe('setAttendance', () => {
    it('should set attendance to going', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'set_event_attendance') {
          return Promise.resolve({ data: { success: true }, error: null })
        }
        if (name === 'get_event_attendees') {
          return Promise.resolve({ data: [], error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let success: boolean
      await act(async () => {
        success = await result.current.setAttendance('going')
      })

      expect(success!).toBe(true)
      expect(result.current.userStatus).toBe('going')
      expect(result.current.goingCount).toBe(1)
      expect(mockRpc).toHaveBeenCalledWith('set_event_attendance', {
        p_user_id: 'user-123',
        p_event_id: 'event-123',
        p_status: 'going',
      })
    })

    it('should set attendance to interested', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'set_event_attendance') {
          return Promise.resolve({ data: { success: true }, error: null })
        }
        if (name === 'get_event_attendees') {
          return Promise.resolve({ data: [], error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.setAttendance('interested')
      })

      expect(result.current.userStatus).toBe('interested')
      expect(result.current.interestedCount).toBe(1)
    })

    it('should update counts when changing from going to interested', async () => {
      const mockAttendees = [
        {
          user_id: 'user-123',
          display_name: 'Current User',
          avatar_url: null,
          is_verified: true,
          status: 'going',
          attended_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockRpc.mockImplementation((name: string) => {
        if (name === 'set_event_attendance') {
          return Promise.resolve({ data: { success: true }, error: null })
        }
        if (name === 'get_event_attendees') {
          return Promise.resolve({ data: mockAttendees, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.userStatus).toBe('going')
      })

      expect(result.current.goingCount).toBe(1)

      await act(async () => {
        await result.current.setAttendance('interested')
      })

      expect(result.current.userStatus).toBe('interested')
      expect(result.current.goingCount).toBe(0)
      expect(result.current.interestedCount).toBe(1)
    })

    it('should fail when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      let success: boolean
      await act(async () => {
        success = await result.current.setAttendance('going')
      })

      expect(success!).toBe(false)
      expect(result.current.error?.code).toBe('AUTH_ERROR')
    })

    it('should rollback on RPC error', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'set_event_attendance') {
          return Promise.resolve({ data: null, error: { message: 'Database error' } })
        }
        if (name === 'get_event_attendees') {
          return Promise.resolve({ data: [], error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.setAttendance('going')
      })

      expect(result.current.userStatus).toBeNull()
      expect(result.current.goingCount).toBe(0)
      expect(result.current.error?.code).toBe('UPDATE_ERROR')
    })

    it('should rollback on exception', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'set_event_attendance') {
          return Promise.reject(new Error('Network error'))
        }
        if (name === 'get_event_attendees') {
          return Promise.resolve({ data: [], error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.setAttendance('going')
      })

      expect(result.current.userStatus).toBeNull()
      expect(result.current.error?.message).toBe('Network error')
    })
  })

  describe('removeAttendance', () => {
    it('should remove attendance successfully', async () => {
      const mockAttendees = [
        {
          user_id: 'user-123',
          display_name: 'Current User',
          avatar_url: null,
          is_verified: true,
          status: 'going',
          attended_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockRpc.mockImplementation((name: string) => {
        if (name === 'remove_event_attendance') {
          return Promise.resolve({ data: { success: true }, error: null })
        }
        if (name === 'get_event_attendees') {
          return Promise.resolve({ data: mockAttendees, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.userStatus).toBe('going')
      })

      let success: boolean
      await act(async () => {
        success = await result.current.removeAttendance()
      })

      expect(success!).toBe(true)
      expect(result.current.userStatus).toBeNull()
      expect(result.current.goingCount).toBe(0)
    })

    it('should fail when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        userId: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      let success: boolean
      await act(async () => {
        success = await result.current.removeAttendance()
      })

      expect(success!).toBe(false)
      expect(result.current.error?.code).toBe('AUTH_ERROR')
    })

    it('should rollback on error', async () => {
      const mockAttendees = [
        {
          user_id: 'user-123',
          display_name: 'Current User',
          avatar_url: null,
          is_verified: true,
          status: 'interested',
          attended_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockRpc.mockImplementation((name: string) => {
        if (name === 'remove_event_attendance') {
          return Promise.resolve({ data: null, error: { message: 'Error' } })
        }
        if (name === 'get_event_attendees') {
          return Promise.resolve({ data: mockAttendees, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.userStatus).toBe('interested')
      })

      await act(async () => {
        await result.current.removeAttendance()
      })

      expect(result.current.userStatus).toBe('interested')
      expect(result.current.interestedCount).toBe(1)
    })
  })

  describe('toggleGoing', () => {
    it('should toggle to going when not going', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'set_event_attendance') {
          return Promise.resolve({ data: { success: true }, error: null })
        }
        if (name === 'get_event_attendees') {
          return Promise.resolve({ data: [], error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.toggleGoing()
      })

      expect(result.current.userStatus).toBe('going')
    })

    it('should remove when already going', async () => {
      const mockAttendees = [
        {
          user_id: 'user-123',
          display_name: 'Current User',
          avatar_url: null,
          is_verified: true,
          status: 'going',
          attended_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockRpc.mockImplementation((name: string) => {
        if (name === 'remove_event_attendance') {
          return Promise.resolve({ data: { success: true }, error: null })
        }
        if (name === 'get_event_attendees') {
          return Promise.resolve({ data: mockAttendees, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.userStatus).toBe('going')
      })

      await act(async () => {
        await result.current.toggleGoing()
      })

      expect(result.current.userStatus).toBeNull()
    })
  })

  describe('toggleInterested', () => {
    it('should toggle to interested when not interested', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'set_event_attendance') {
          return Promise.resolve({ data: { success: true }, error: null })
        }
        if (name === 'get_event_attendees') {
          return Promise.resolve({ data: [], error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.toggleInterested()
      })

      expect(result.current.userStatus).toBe('interested')
    })

    it('should remove when already interested', async () => {
      const mockAttendees = [
        {
          user_id: 'user-123',
          display_name: 'Current User',
          avatar_url: null,
          is_verified: true,
          status: 'interested',
          attended_at: '2024-01-01T12:00:00Z',
        },
      ]

      mockRpc.mockImplementation((name: string) => {
        if (name === 'remove_event_attendance') {
          return Promise.resolve({ data: { success: true }, error: null })
        }
        if (name === 'get_event_attendees') {
          return Promise.resolve({ data: mockAttendees, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.userStatus).toBe('interested')
      })

      await act(async () => {
        await result.current.toggleInterested()
      })

      expect(result.current.userStatus).toBeNull()
    })
  })

  describe('refetch', () => {
    it('should refetch attendees', async () => {
      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockRpc.mockClear()

      await act(async () => {
        await result.current.refetch()
      })

      expect(mockRpc).toHaveBeenCalledWith('get_event_attendees', expect.any(Object))
    })
  })

  describe('error handling', () => {
    it('should set error when fetch fails', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'get_event_attendees') {
          return Promise.resolve({
            data: null,
            error: { message: 'Database error' },
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.error?.code).toBe('FETCH_ERROR')
      })
    })

    it('should handle fetch exception', async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === 'get_event_attendees') {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.error?.code).toBe('FETCH_ERROR')
        expect(result.current.error?.message).toBe('Network error')
      })
    })
  })

  describe('isUpdating state', () => {
    it('should set isUpdating during attendance update', async () => {
      let resolveRpc: (value: unknown) => void
      mockRpc.mockImplementation((name: string) => {
        if (name === 'set_event_attendance') {
          return new Promise((resolve) => {
            resolveRpc = resolve
          })
        }
        if (name === 'get_event_attendees') {
          return Promise.resolve({ data: [], error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useEventAttendance('event-123'))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setAttendance('going')
      })

      expect(result.current.isUpdating).toBe(true)

      await act(async () => {
        resolveRpc!({ data: { success: true }, error: null })
      })

      expect(result.current.isUpdating).toBe(false)
    })
  })
})

describe('useUserEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAuth.mockReturnValue({
      userId: 'user-123',
      isAuthenticated: true,
    })

    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_user_events') {
        return Promise.resolve({ data: [], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })
  })

  it('should fetch user events on mount', async () => {
    renderHook(() => useUserEvents())

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('get_user_events', {
        p_user_id: 'user-123',
        p_status: null,
      })
    })
  })

  it('should not fetch when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      userId: null,
      isAuthenticated: false,
    })

    const { result } = renderHook(() => useUserEvents())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.events).toEqual([])
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('should not fetch when disabled', async () => {
    renderHook(() => useUserEvents({ enabled: false }))

    await new Promise((r) => setTimeout(r, 50))

    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('should filter by status', async () => {
    renderHook(() => useUserEvents({ status: 'going' }))

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('get_user_events', {
        p_user_id: 'user-123',
        p_status: 'going',
      })
    })
  })

  it('should set events from response', async () => {
    const mockEvents = [
      {
        id: 'event-1',
        title: 'Concert',
        date_time: '2024-01-01T20:00:00Z',
        end_time: null,
        venue_name: 'Venue A',
        venue_address: '123 Main St',
        image_url: null,
        user_status: 'going',
        going_count: 10,
        interested_count: 5,
        post_count: 3,
      },
    ]

    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_user_events') {
        return Promise.resolve({ data: mockEvents, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { result } = renderHook(() => useUserEvents())

    await waitFor(() => {
      expect(result.current.events).toEqual(mockEvents)
    })
  })

  it('should set error when fetch fails', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_user_events') {
        return Promise.resolve({
          data: null,
          error: { message: 'Database error' },
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { result } = renderHook(() => useUserEvents())

    await waitFor(() => {
      expect(result.current.error?.code).toBe('FETCH_ERROR')
    })
  })

  it('should refetch on demand', async () => {
    const { result } = renderHook(() => useUserEvents())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    mockRpc.mockClear()

    await act(async () => {
      await result.current.refetch()
    })

    expect(mockRpc).toHaveBeenCalledWith('get_user_events', expect.any(Object))
  })
})
