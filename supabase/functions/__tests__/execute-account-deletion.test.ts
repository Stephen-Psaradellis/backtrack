/**
 * Integration tests for execute-account-deletion edge function
 *
 * Tests the cron job that processes scheduled account deletions:
 * - Authorization (cron secret or service role)
 * - Query for pending deletions
 * - RPC call to delete_user_account
 * - Admin auth deletion
 * - Marking deletions as executed
 * - Error handling and partial failures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Deno globals before importing the handler
const mockEnv = new Map([
  ['SUPABASE_URL', 'https://test.supabase.co'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key'],
  ['CRON_SECRET', 'test-cron-secret'],
])

// Capture handler from Deno.serve
let capturedHandler: ((req: Request) => Promise<Response>) | null = null

vi.stubGlobal('Deno', {
  env: {
    get: (key: string) => mockEnv.get(key),
  },
  serve: vi.fn((handler: (req: Request) => Promise<Response>) => {
    capturedHandler = handler
  }),
})

// Mock @supabase/supabase-js
const mockRpc = vi.fn()
const mockDeleteUser = vi.fn()
const mockFrom = vi.fn()

// Create a query builder that can be chained
const createQueryBuilder = (finalResult: any) => {
  const builder = {
    select: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    is: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => Promise.resolve({ error: null })),
  }

  // Make the second .is() call return the promise with the final result
  builder.is.mockImplementationOnce(() => builder)
    .mockImplementationOnce(() => Promise.resolve(finalResult))

  return builder
}

let currentQueryBuilder: any

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
    auth: {
      admin: {
        deleteUser: mockDeleteUser,
      },
    },
  })),
}))

describe('execute-account-deletion edge function', () => {
  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()
    capturedHandler = null
    currentQueryBuilder = null

    // Reset env to default
    mockEnv.set('SUPABASE_URL', 'https://test.supabase.co')
    mockEnv.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
    mockEnv.set('CRON_SECRET', 'test-cron-secret')

    // Setup default query builder for empty results
    currentQueryBuilder = createQueryBuilder({ data: [], error: null })
    mockFrom.mockReturnValue(currentQueryBuilder)

    // Import the module to trigger Deno.serve and capture handler
    await import('../execute-account-deletion/index.ts')
  })

  afterEach(() => {
    vi.resetModules()
  })

  const createRequest = (method = 'POST', headers: Record<string, string> = {}) => {
    return new Request('https://test.supabase.co/functions/v1/execute-account-deletion', {
      method,
      headers: new Headers(headers),
    })
  }

  it('returns 405 for non-POST requests', async () => {
    const req = createRequest('GET')
    const response = await capturedHandler!(req)

    expect(response.status).toBe(405)
    const body = await response.json()
    expect(body).toEqual({ error: 'Method not allowed' })
  })

  it('returns 401 for unauthorized requests when CRON_SECRET is set', async () => {
    const req = createRequest('POST', {})
    const response = await capturedHandler!(req)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('allows request with valid cron secret', async () => {
    const req = createRequest('POST', {
      'x-cron-secret': 'test-cron-secret',
    })
    const response = await capturedHandler!(req)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ processed: 0, results: [] })
  })

  it('allows request with service role key', async () => {
    const req = createRequest('POST', {
      'Authorization': 'Bearer test-service-role-key',
    })
    const response = await capturedHandler!(req)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ processed: 0, results: [] })
  })

  it('returns {processed: 0} when no pending deletions', async () => {
    const req = createRequest('POST', {
      'x-cron-secret': 'test-cron-secret',
    })
    const response = await capturedHandler!(req)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      processed: 0,
      results: [],
    })
  })

  it('successfully processes a single deletion', async () => {
    const mockDeletion = {
      id: 'deletion-1',
      user_id: 'user-123',
      scheduled_for: '2026-02-15T00:00:00Z',
      reason: 'User requested deletion',
    }

    // Setup query builder with one deletion
    currentQueryBuilder = createQueryBuilder({ data: [mockDeletion], error: null })
    mockFrom.mockReturnValueOnce(currentQueryBuilder)

    // Mock successful RPC call
    mockRpc.mockResolvedValueOnce({ error: null })

    // Mock successful auth deletion
    mockDeleteUser.mockResolvedValueOnce({ error: null })

    const req = createRequest('POST', {
      'x-cron-secret': 'test-cron-secret',
    })
    const response = await capturedHandler!(req)

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body).toEqual({
      processed: 1,
      succeeded: 1,
      failed: 0,
      results: [
        { userId: 'user-123', success: true },
      ],
    })

    // Verify RPC was called
    expect(mockRpc).toHaveBeenCalledWith('delete_user_account', {
      target_user_id: 'user-123',
    })

    // Verify auth deletion
    expect(mockDeleteUser).toHaveBeenCalledWith('user-123')
  })

  it('handles RPC error for a deletion (continues to next)', async () => {
    const mockDeletions = [
      {
        id: 'deletion-1',
        user_id: 'user-123',
        scheduled_for: '2026-02-15T00:00:00Z',
        reason: null,
      },
      {
        id: 'deletion-2',
        user_id: 'user-456',
        scheduled_for: '2026-02-15T00:00:00Z',
        reason: null,
      },
    ]

    currentQueryBuilder = createQueryBuilder({ data: mockDeletions, error: null })
    mockFrom.mockReturnValueOnce(currentQueryBuilder)

    // First RPC fails
    mockRpc.mockResolvedValueOnce({
      error: { message: 'Database connection failed' },
    })

    // Second RPC succeeds
    mockRpc.mockResolvedValueOnce({ error: null })
    mockDeleteUser.mockResolvedValueOnce({ error: null })

    const req = createRequest('POST', {
      'x-cron-secret': 'test-cron-secret',
    })
    const response = await capturedHandler!(req)

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body).toEqual({
      processed: 2,
      succeeded: 1,
      failed: 1,
      results: [
        {
          userId: 'user-123',
          success: false,
          error: 'Data deletion failed: Database connection failed',
        },
        {
          userId: 'user-456',
          success: true,
        },
      ],
    })

    // Verify both RPCs were called
    expect(mockRpc).toHaveBeenCalledTimes(2)
    // Only the second user's auth should be deleted
    expect(mockDeleteUser).toHaveBeenCalledTimes(1)
    expect(mockDeleteUser).toHaveBeenCalledWith('user-456')
  })

  it('handles auth delete error (marks partial completion)', async () => {
    const mockDeletion = {
      id: 'deletion-1',
      user_id: 'user-123',
      scheduled_for: '2026-02-15T00:00:00Z',
      reason: null,
    }

    currentQueryBuilder = createQueryBuilder({ data: [mockDeletion], error: null })
    mockFrom.mockReturnValueOnce(currentQueryBuilder)

    // RPC succeeds
    mockRpc.mockResolvedValueOnce({ error: null })

    // Auth deletion fails
    mockDeleteUser.mockResolvedValueOnce({
      error: { message: 'User not found in auth.users' },
    })

    const req = createRequest('POST', {
      'x-cron-secret': 'test-cron-secret',
    })
    const response = await capturedHandler!(req)

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body).toEqual({
      processed: 1,
      succeeded: 0,
      failed: 1,
      results: [
        {
          userId: 'user-123',
          success: false,
          error: 'Auth deletion failed: User not found in auth.users',
        },
      ],
    })
  })

  it('processes multiple deletions with mixed success', async () => {
    const mockDeletions = [
      {
        id: 'deletion-1',
        user_id: 'user-123',
        scheduled_for: '2026-02-15T00:00:00Z',
        reason: null,
      },
      {
        id: 'deletion-2',
        user_id: 'user-456',
        scheduled_for: '2026-02-15T00:00:00Z',
        reason: null,
      },
      {
        id: 'deletion-3',
        user_id: 'user-789',
        scheduled_for: '2026-02-15T00:00:00Z',
        reason: null,
      },
    ]

    currentQueryBuilder = createQueryBuilder({ data: mockDeletions, error: null })
    mockFrom.mockReturnValueOnce(currentQueryBuilder)

    // First succeeds
    mockRpc.mockResolvedValueOnce({ error: null })
    mockDeleteUser.mockResolvedValueOnce({ error: null })

    // Second RPC fails
    mockRpc.mockResolvedValueOnce({
      error: { message: 'RPC error' },
    })

    // Third succeeds
    mockRpc.mockResolvedValueOnce({ error: null })
    mockDeleteUser.mockResolvedValueOnce({ error: null })

    const req = createRequest('POST', {
      'x-cron-secret': 'test-cron-secret',
    })
    const response = await capturedHandler!(req)

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body).toEqual({
      processed: 3,
      succeeded: 2,
      failed: 1,
      results: [
        { userId: 'user-123', success: true },
        { userId: 'user-456', success: false, error: 'Data deletion failed: RPC error' },
        { userId: 'user-789', success: true },
      ],
    })
  })

  it('returns 500 when query fails', async () => {
    currentQueryBuilder = createQueryBuilder({
      data: null,
      error: { message: 'Database connection lost' },
    })
    mockFrom.mockReturnValueOnce(currentQueryBuilder)

    const req = createRequest('POST', {
      'x-cron-secret': 'test-cron-secret',
    })
    const response = await capturedHandler!(req)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toEqual({
      error: 'Database connection lost',
    })
  })

  it('handles unexpected errors in deletion processing', async () => {
    const mockDeletion = {
      id: 'deletion-1',
      user_id: 'user-123',
      scheduled_for: '2026-02-15T00:00:00Z',
      reason: null,
    }

    currentQueryBuilder = createQueryBuilder({ data: [mockDeletion], error: null })
    mockFrom.mockReturnValueOnce(currentQueryBuilder)

    // RPC throws unexpected error
    mockRpc.mockRejectedValueOnce(new Error('Network timeout'))

    const req = createRequest('POST', {
      'x-cron-secret': 'test-cron-secret',
    })
    const response = await capturedHandler!(req)

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body).toEqual({
      processed: 1,
      succeeded: 0,
      failed: 1,
      results: [
        {
          userId: 'user-123',
          success: false,
          error: 'Network timeout',
        },
      ],
    })
  })

  it('handles fatal errors before processing loop', async () => {
    // Create a builder that throws on the final is() call
    const errorBuilder = {
      select: vi.fn(() => errorBuilder),
      lt: vi.fn(() => errorBuilder),
      is: vi.fn(() => errorBuilder),
    }
    errorBuilder.is.mockImplementationOnce(() => errorBuilder)
      .mockImplementationOnce(() => Promise.reject(new Error('Database unreachable')))

    mockFrom.mockReturnValueOnce(errorBuilder)

    const req = createRequest('POST', {
      'x-cron-secret': 'test-cron-secret',
    })
    const response = await capturedHandler!(req)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toEqual({
      error: 'Database unreachable',
    })
  })

  it('works when CRON_SECRET is not set (no auth check)', async () => {
    // Remove CRON_SECRET
    mockEnv.delete('CRON_SECRET')

    // Reset and re-import to get fresh handler with new env
    vi.resetModules()
    capturedHandler = null

    currentQueryBuilder = createQueryBuilder({ data: [], error: null })
    mockFrom.mockReturnValue(currentQueryBuilder)

    await import('../execute-account-deletion/index.ts')

    // Request without any auth headers should work
    const req = createRequest('POST', {})
    const response = await capturedHandler!(req)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ processed: 0, results: [] })
  })

  it('verifies correct query parameters for pending deletions', async () => {
    currentQueryBuilder = createQueryBuilder({ data: [], error: null })
    mockFrom.mockReturnValueOnce(currentQueryBuilder)

    const req = createRequest('POST', {
      'x-cron-secret': 'test-cron-secret',
    })
    await capturedHandler!(req)

    // Verify the query chain
    expect(currentQueryBuilder.select).toHaveBeenCalledWith('id, user_id, scheduled_for, reason')
    expect(currentQueryBuilder.lt).toHaveBeenCalledWith('scheduled_for', expect.any(String))
    expect(currentQueryBuilder.is).toHaveBeenCalledWith('executed_at', null)
    expect(currentQueryBuilder.is).toHaveBeenCalledWith('cancelled_at', null)
  })
})
