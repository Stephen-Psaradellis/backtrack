/**
 * Unit tests for mock Supabase client for development mode
 *
 * These tests cover:
 * - Mock query builder chaining
 * - Mock auth methods
 * - Mock storage methods
 * - Mock channel (realtime) methods
 * - Mock data exports
 * - Type compatibility with real Supabase client
 *
 * Tests verify the mock client provides the same interface as the real Supabase client.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createDevSupabaseClient,
  createDevMockQueryBuilder,
  createDevMockAuth,
  createDevMockStorage,
  createDevMockChannel,
  createTypedDevSupabaseClient,
  devMockSupabaseClient,
  devMockUser,
  devMockSession,
  devMockProfile,
  devMockLocation,
  devMockPost,
  type DevMockSupabaseClient,
  type DevMockQueryBuilder,
  type DevMockAuth,
  type DevMockStorage,
} from '@/lib/dev/mock-supabase'

// ============================================================================
// Mock Data Export Tests
// ============================================================================

describe('Mock Data Exports', () => {
  describe('devMockUser', () => {
    it('has required id field', () => {
      expect(devMockUser.id).toBeDefined()
      expect(typeof devMockUser.id).toBe('string')
    })

    it('has email field', () => {
      expect(devMockUser.email).toBeDefined()
      expect(typeof devMockUser.email).toBe('string')
    })

    it('has timestamp fields', () => {
      expect(devMockUser.created_at).toBeDefined()
      expect(devMockUser.updated_at).toBeDefined()
    })
  })

  describe('devMockSession', () => {
    it('has access_token', () => {
      expect(devMockSession.access_token).toBeDefined()
      expect(typeof devMockSession.access_token).toBe('string')
    })

    it('has refresh_token', () => {
      expect(devMockSession.refresh_token).toBeDefined()
      expect(typeof devMockSession.refresh_token).toBe('string')
    })

    it('has user reference', () => {
      expect(devMockSession.user).toBeDefined()
      expect(devMockSession.user.id).toBe(devMockUser.id)
    })
  })

  describe('devMockProfile', () => {
    it('has required fields', () => {
      expect(devMockProfile.id).toBeDefined()
      expect(devMockProfile.username).toBeDefined()
      expect(devMockProfile.avatar_config).toBeDefined()
    })

    it('matches user id', () => {
      expect(devMockProfile.id).toBe(devMockUser.id)
    })
  })

  describe('devMockLocation', () => {
    it('has required fields', () => {
      expect(devMockLocation.id).toBeDefined()
      expect(devMockLocation.name).toBeDefined()
      expect(devMockLocation.address).toBeDefined()
      expect(devMockLocation.latitude).toBeDefined()
      expect(devMockLocation.longitude).toBeDefined()
    })

    it('has valid coordinates', () => {
      expect(typeof devMockLocation.latitude).toBe('number')
      expect(typeof devMockLocation.longitude).toBe('number')
    })
  })

  describe('devMockPost', () => {
    it('has required fields', () => {
      expect(devMockPost.id).toBeDefined()
      expect(devMockPost.producer_id).toBeDefined()
      expect(devMockPost.location_id).toBeDefined()
      expect(devMockPost.target_avatar).toBeDefined()
    })

    it('references mock user and location', () => {
      expect(devMockPost.producer_id).toBe(devMockUser.id)
      expect(devMockPost.location_id).toBe(devMockLocation.id)
    })

    it('has expiration in the future', () => {
      const expiresAt = new Date(devMockPost.expires_at!)
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now())
    })
  })
})

// ============================================================================
// Mock Query Builder Tests
// ============================================================================

describe('createDevMockQueryBuilder', () => {
  let queryBuilder: DevMockQueryBuilder

  beforeEach(() => {
    queryBuilder = createDevMockQueryBuilder()
  })

  describe('chainable methods', () => {
    it('select returns self for chaining', () => {
      const result = queryBuilder.select('*')
      expect(result).toBe(queryBuilder)
    })

    it('insert returns self for chaining', () => {
      const result = queryBuilder.insert({ test: 'data' })
      expect(result).toBe(queryBuilder)
    })

    it('update returns self for chaining', () => {
      const result = queryBuilder.update({ test: 'data' })
      expect(result).toBe(queryBuilder)
    })

    it('delete returns self for chaining', () => {
      const result = queryBuilder.delete()
      expect(result).toBe(queryBuilder)
    })

    it('upsert returns self for chaining', () => {
      const result = queryBuilder.upsert({ test: 'data' })
      expect(result).toBe(queryBuilder)
    })

    it('eq returns self for chaining', () => {
      const result = queryBuilder.eq('column', 'value')
      expect(result).toBe(queryBuilder)
    })

    it('neq returns self for chaining', () => {
      const result = queryBuilder.neq('column', 'value')
      expect(result).toBe(queryBuilder)
    })

    it('gt returns self for chaining', () => {
      const result = queryBuilder.gt('column', 5)
      expect(result).toBe(queryBuilder)
    })

    it('gte returns self for chaining', () => {
      const result = queryBuilder.gte('column', 5)
      expect(result).toBe(queryBuilder)
    })

    it('lt returns self for chaining', () => {
      const result = queryBuilder.lt('column', 5)
      expect(result).toBe(queryBuilder)
    })

    it('lte returns self for chaining', () => {
      const result = queryBuilder.lte('column', 5)
      expect(result).toBe(queryBuilder)
    })

    it('like returns self for chaining', () => {
      const result = queryBuilder.like('column', '%pattern%')
      expect(result).toBe(queryBuilder)
    })

    it('ilike returns self for chaining', () => {
      const result = queryBuilder.ilike('column', '%pattern%')
      expect(result).toBe(queryBuilder)
    })

    it('is returns self for chaining', () => {
      const result = queryBuilder.is('column', null)
      expect(result).toBe(queryBuilder)
    })

    it('in returns self for chaining', () => {
      const result = queryBuilder.in('column', ['a', 'b', 'c'])
      expect(result).toBe(queryBuilder)
    })

    it('not returns self for chaining', () => {
      const result = queryBuilder.not('column', 'eq', 'value')
      expect(result).toBe(queryBuilder)
    })

    it('or returns self for chaining', () => {
      const result = queryBuilder.or('column.eq.value')
      expect(result).toBe(queryBuilder)
    })

    it('and returns self for chaining', () => {
      const result = queryBuilder.and('column.eq.value')
      expect(result).toBe(queryBuilder)
    })

    it('order returns self for chaining', () => {
      const result = queryBuilder.order('column')
      expect(result).toBe(queryBuilder)
    })

    it('limit returns self for chaining', () => {
      const result = queryBuilder.limit(10)
      expect(result).toBe(queryBuilder)
    })

    it('range returns self for chaining', () => {
      const result = queryBuilder.range(0, 10)
      expect(result).toBe(queryBuilder)
    })

    it('filter returns self for chaining', () => {
      const result = queryBuilder.filter('column', 'eq', 'value')
      expect(result).toBe(queryBuilder)
    })

    it('match returns self for chaining', () => {
      const result = queryBuilder.match({ column: 'value' })
      expect(result).toBe(queryBuilder)
    })
  })

  describe('complex query chains', () => {
    it('supports typical select query chain', () => {
      const result = queryBuilder
        .select('*')
        .eq('id', '123')
        .order('created_at')
        .limit(10)

      expect(result).toBe(queryBuilder)
    })

    it('supports insert query chain', () => {
      const result = queryBuilder
        .insert({ name: 'test' })
        .select('*')

      expect(result).toBe(queryBuilder)
    })

    it('supports update query chain', () => {
      const result = queryBuilder
        .update({ name: 'updated' })
        .eq('id', '123')
        .select('*')

      expect(result).toBe(queryBuilder)
    })

    it('supports delete query chain', () => {
      const result = queryBuilder
        .delete()
        .eq('id', '123')

      expect(result).toBe(queryBuilder)
    })
  })

  describe('terminal methods', () => {
    it('single resolves with first item', async () => {
      const mockData = { id: '1', name: 'test' }
      const builder = createDevMockQueryBuilder(mockData)

      const result = await builder.single()

      expect(result.data).toEqual(mockData)
      expect(result.error).toBeNull()
    })

    it('single resolves with null for empty data', async () => {
      const builder = createDevMockQueryBuilder(null)

      const result = await builder.single()

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('maybeSingle resolves with first item', async () => {
      const mockData = { id: '1', name: 'test' }
      const builder = createDevMockQueryBuilder(mockData)

      const result = await builder.maybeSingle()

      expect(result.data).toEqual(mockData)
      expect(result.error).toBeNull()
    })

    it('maybeSingle resolves with null for empty data', async () => {
      const builder = createDevMockQueryBuilder(null)

      const result = await builder.maybeSingle()

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('returns error when configured', async () => {
      const mockError = new Error('Test error')
      const builder = createDevMockQueryBuilder(null, mockError)

      const result = await builder.single()

      expect(result.error).toBe(mockError)
    })
  })

  describe('thenable behavior', () => {
    it('is awaitable directly', async () => {
      const mockData = [{ id: '1' }, { id: '2' }]
      const builder = createDevMockQueryBuilder(mockData)

      const result = await builder.select('*')

      expect(result.data).toEqual(mockData)
      expect(result.error).toBeNull()
    })

    it('normalizes single item to array', async () => {
      const mockData = { id: '1' }
      const builder = createDevMockQueryBuilder(mockData)

      const result = await builder.select('*')

      expect(result.data).toEqual([mockData])
    })

    it('returns empty array for null data', async () => {
      const builder = createDevMockQueryBuilder(null)

      const result = await builder.select('*')

      expect(result.data).toEqual([])
    })
  })
})

// ============================================================================
// Mock Auth Tests
// ============================================================================

describe('createDevMockAuth', () => {
  describe('default state (logged out)', () => {
    let auth: DevMockAuth

    beforeEach(() => {
      auth = createDevMockAuth()
    })

    it('getUser returns null user', async () => {
      const result = await auth.getUser()

      expect(result.data.user).toBeNull()
      expect(result.error).toBeNull()
    })

    it('getSession returns null session', async () => {
      const result = await auth.getSession()

      expect(result.data.session).toBeNull()
      expect(result.error).toBeNull()
    })
  })

  describe('logged in state', () => {
    let auth: DevMockAuth

    beforeEach(() => {
      auth = createDevMockAuth({ startLoggedIn: true })
    })

    it('getUser returns mock user', async () => {
      const result = await auth.getUser()

      expect(result.data.user).toBeDefined()
      expect(result.data.user?.id).toBe(devMockUser.id)
      expect(result.error).toBeNull()
    })

    it('getSession returns mock session', async () => {
      const result = await auth.getSession()

      expect(result.data.session).toBeDefined()
      expect(result.data.session?.access_token).toBeDefined()
      expect(result.error).toBeNull()
    })
  })

  describe('signInWithPassword', () => {
    it('returns user and session', async () => {
      const auth = createDevMockAuth()

      const result = await auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.data.user).toBeDefined()
      expect(result.data.session).toBeDefined()
      expect(result.error).toBeNull()
    })
  })

  describe('signUp', () => {
    it('returns user and session', async () => {
      const auth = createDevMockAuth()

      const result = await auth.signUp({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.data.user).toBeDefined()
      expect(result.data.session).toBeDefined()
      expect(result.error).toBeNull()
    })
  })

  describe('signOut', () => {
    it('returns success', async () => {
      const auth = createDevMockAuth()

      const result = await auth.signOut()

      expect(result.error).toBeNull()
    })
  })

  describe('resetPasswordForEmail', () => {
    it('returns success', async () => {
      const auth = createDevMockAuth()

      const result = await auth.resetPasswordForEmail('test@example.com')

      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
    })
  })

  describe('updateUser', () => {
    it('returns updated user', async () => {
      const auth = createDevMockAuth()

      const result = await auth.updateUser({ email: 'new@example.com' })

      expect(result.data.user).toBeDefined()
      expect(result.error).toBeNull()
    })
  })

  describe('onAuthStateChange', () => {
    it('returns subscription with unsubscribe method', () => {
      const auth = createDevMockAuth()
      const callback = () => {}

      const result = auth.onAuthStateChange(callback)

      expect(result.data.subscription).toBeDefined()
      expect(typeof result.data.subscription.unsubscribe).toBe('function')
    })

    it('calls callback immediately with current state (logged out)', () => {
      const auth = createDevMockAuth()
      let callbackEvent: string | null = null
      let callbackSession: unknown = undefined

      auth.onAuthStateChange((event, session) => {
        callbackEvent = event
        callbackSession = session
      })

      expect(callbackEvent).toBe('SIGNED_OUT')
      expect(callbackSession).toBeNull()
    })

    it('calls callback immediately with current state (logged in)', () => {
      const auth = createDevMockAuth({ startLoggedIn: true })
      let callbackEvent: string | null = null
      let callbackSession: unknown = undefined

      auth.onAuthStateChange((event, session) => {
        callbackEvent = event
        callbackSession = session
      })

      expect(callbackEvent).toBe('SIGNED_IN')
      expect(callbackSession).toBeDefined()
    })

    it('notifies subscribers on signIn', async () => {
      const auth = createDevMockAuth()
      let callCount = 0
      let lastEvent: string | null = null

      auth.onAuthStateChange((event) => {
        callCount++
        lastEvent = event
      })

      await auth.signInWithPassword({ email: 'test@example.com', password: 'password' })

      expect(callCount).toBe(2) // Initial + signIn
      expect(lastEvent).toBe('SIGNED_IN')
    })

    it('notifies subscribers on signOut', async () => {
      const auth = createDevMockAuth({ startLoggedIn: true })
      let callCount = 0
      let lastEvent: string | null = null

      auth.onAuthStateChange((event) => {
        callCount++
        lastEvent = event
      })

      await auth.signOut()

      expect(callCount).toBe(2) // Initial + signOut
      expect(lastEvent).toBe('SIGNED_OUT')
    })

    it('unsubscribe removes listener', async () => {
      const auth = createDevMockAuth()
      let callCount = 0

      const { data: { subscription } } = auth.onAuthStateChange(() => {
        callCount++
      })

      subscription.unsubscribe()

      await auth.signInWithPassword({ email: 'test@example.com', password: 'password' })

      expect(callCount).toBe(1) // Only initial call
    })
  })

  describe('custom user and session', () => {
    it('uses provided user', async () => {
      const customUser = {
        id: 'custom-user-id',
        email: 'custom@example.com',
      }
      const auth = createDevMockAuth({ user: customUser, startLoggedIn: true })

      const result = await auth.getUser()

      expect(result.data.user?.id).toBe('custom-user-id')
    })

    it('uses provided session', async () => {
      const customSession = {
        access_token: 'custom-access-token',
        refresh_token: 'custom-refresh-token',
        user: devMockUser,
      }
      const auth = createDevMockAuth({ session: customSession, startLoggedIn: true })

      const result = await auth.getSession()

      expect(result.data.session?.access_token).toBe('custom-access-token')
    })
  })
})

// ============================================================================
// Mock Storage Tests
// ============================================================================

describe('createDevMockStorage', () => {
  let storage: DevMockStorage

  beforeEach(() => {
    storage = createDevMockStorage()
  })

  describe('from method', () => {
    it('returns bucket interface', () => {
      const bucket = storage.from('test-bucket')

      expect(bucket).toBeDefined()
      expect(typeof bucket.upload).toBe('function')
      expect(typeof bucket.download).toBe('function')
      expect(typeof bucket.remove).toBe('function')
      expect(typeof bucket.getPublicUrl).toBe('function')
      expect(typeof bucket.createSignedUrl).toBe('function')
      expect(typeof bucket.list).toBe('function')
    })
  })

  describe('upload', () => {
    it('returns path on success', async () => {
      const bucket = storage.from('avatars')

      const result = await bucket.upload('path/to/file.jpg', new Blob())

      expect(result.data.path).toBe('path/to/file.jpg')
      expect(result.error).toBeNull()
    })
  })

  describe('download', () => {
    it('returns blob on success', async () => {
      const bucket = storage.from('avatars')

      const result = await bucket.download('path/to/file.jpg')

      expect(result.data).toBeInstanceOf(Blob)
      expect(result.error).toBeNull()
    })
  })

  describe('remove', () => {
    it('returns success', async () => {
      const bucket = storage.from('avatars')

      const result = await bucket.remove(['path/to/file.jpg'])

      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
    })
  })

  describe('getPublicUrl', () => {
    it('returns public URL', () => {
      const bucket = storage.from('avatars')

      const result = bucket.getPublicUrl('path/to/file.jpg')

      expect(result.data.publicUrl).toContain('path/to/file.jpg')
      expect(typeof result.data.publicUrl).toBe('string')
    })
  })

  describe('createSignedUrl', () => {
    it('returns signed URL', async () => {
      const bucket = storage.from('avatars')

      const result = await bucket.createSignedUrl('path/to/file.jpg', 3600)

      expect(result.data.signedUrl).toContain('path/to/file.jpg')
      expect(result.error).toBeNull()
    })
  })

  describe('list', () => {
    it('returns empty array', async () => {
      const bucket = storage.from('avatars')

      const result = await bucket.list()

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })
  })
})

// ============================================================================
// Mock Channel Tests
// ============================================================================

describe('createDevMockChannel', () => {
  it('returns channel with chainable methods', () => {
    const channel = createDevMockChannel()

    expect(typeof channel.on).toBe('function')
    expect(typeof channel.subscribe).toBe('function')
    expect(typeof channel.unsubscribe).toBe('function')
  })

  it('on returns self for chaining', () => {
    const channel = createDevMockChannel()

    const result = channel.on('event', () => {})

    expect(result).toBe(channel)
  })

  it('subscribe returns self for chaining', () => {
    const channel = createDevMockChannel()

    const result = channel.subscribe()

    expect(result).toBe(channel)
  })

  it('supports complex chain', () => {
    const channel = createDevMockChannel()

    const result = channel
      .on('INSERT', () => {})
      .on('UPDATE', () => {})
      .subscribe()

    expect(result).toBe(channel)
  })
})

// ============================================================================
// Mock Supabase Client Tests
// ============================================================================

describe('createDevSupabaseClient', () => {
  let client: DevMockSupabaseClient

  beforeEach(() => {
    client = createDevSupabaseClient()
  })

  describe('client structure', () => {
    it('has auth property', () => {
      expect(client.auth).toBeDefined()
    })

    it('has storage property', () => {
      expect(client.storage).toBeDefined()
    })

    it('has from method', () => {
      expect(typeof client.from).toBe('function')
    })

    it('has channel method', () => {
      expect(typeof client.channel).toBe('function')
    })

    it('has removeChannel method', () => {
      expect(typeof client.removeChannel).toBe('function')
    })

    it('has rpc method', () => {
      expect(typeof client.rpc).toBe('function')
    })
  })

  describe('from method', () => {
    it('returns query builder for profiles table', () => {
      const builder = client.from('profiles')

      expect(builder).toBeDefined()
      expect(typeof builder.select).toBe('function')
    })

    it('returns mock profile data', async () => {
      const result = await client.from('profiles').select('*')

      expect(result.data).toBeDefined()
      expect(result.data!.length).toBeGreaterThan(0)
    })

    it('returns mock location data', async () => {
      const result = await client.from('locations').select('*')

      expect(result.data).toBeDefined()
      expect(result.data!.length).toBeGreaterThan(0)
    })

    it('returns mock post data', async () => {
      const result = await client.from('posts').select('*')

      expect(result.data).toBeDefined()
      expect(result.data!.length).toBeGreaterThan(0)
    })

    it('returns empty data for conversations', async () => {
      const result = await client.from('conversations').select('*')

      expect(result.data).toEqual([])
    })

    it('returns empty data for messages', async () => {
      const result = await client.from('messages').select('*')

      expect(result.data).toEqual([])
    })

    it('returns empty data for unknown tables', async () => {
      const result = await client.from('unknown_table').select('*')

      expect(result.data).toEqual([])
    })
  })

  describe('channel method', () => {
    it('returns mock channel', () => {
      const channel = client.channel('test-channel')

      expect(channel).toBeDefined()
      expect(typeof channel.on).toBe('function')
      expect(typeof channel.subscribe).toBe('function')
    })
  })

  describe('rpc method', () => {
    it('returns null data', async () => {
      const result = await client.rpc('test_function')

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })
  })

  describe('with custom options', () => {
    it('respects startLoggedIn option', async () => {
      const loggedInClient = createDevSupabaseClient({ startLoggedIn: true })

      const result = await loggedInClient.auth.getUser()

      expect(result.data.user).not.toBeNull()
    })

    it('respects custom user', async () => {
      const customUser = { id: 'custom-id', email: 'custom@test.com' }
      const customClient = createDevSupabaseClient({ user: customUser, startLoggedIn: true })

      const result = await customClient.auth.getUser()

      expect(result.data.user?.id).toBe('custom-id')
    })
  })
})

// ============================================================================
// Default Client Instance Tests
// ============================================================================

describe('devMockSupabaseClient', () => {
  it('is a valid mock client', () => {
    expect(devMockSupabaseClient).toBeDefined()
    expect(devMockSupabaseClient.auth).toBeDefined()
    expect(devMockSupabaseClient.storage).toBeDefined()
    expect(typeof devMockSupabaseClient.from).toBe('function')
  })

  it('starts in logged out state', async () => {
    const result = await devMockSupabaseClient.auth.getUser()

    expect(result.data.user).toBeNull()
  })
})

// ============================================================================
// Type Compatibility Tests
// ============================================================================

describe('createTypedDevSupabaseClient', () => {
  it('returns client compatible with SupabaseClient type', () => {
    const client = createTypedDevSupabaseClient()

    // Type check: should have all required SupabaseClient methods
    expect(client.auth).toBeDefined()
    expect(client.storage).toBeDefined()
    expect(typeof client.from).toBe('function')
  })

  it('can be used like a real Supabase client', async () => {
    const client = createTypedDevSupabaseClient()

    // Simulate typical usage
    const { data, error } = await client.from('profiles').select('*').single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
  })
})

// ============================================================================
// Integration-style Tests
// ============================================================================

describe('Mock Client Integration', () => {
  describe('typical auth flow', () => {
    it('handles sign up -> sign in -> sign out flow', async () => {
      const client = createDevSupabaseClient()

      // Sign up
      const signUpResult = await client.auth.signUp({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(signUpResult.error).toBeNull()
      expect(signUpResult.data.user).toBeDefined()

      // Sign in
      const signInResult = await client.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(signInResult.error).toBeNull()
      expect(signInResult.data.session).toBeDefined()

      // Sign out
      const signOutResult = await client.auth.signOut()
      expect(signOutResult.error).toBeNull()
    })
  })

  describe('typical query flow', () => {
    it('handles select -> filter -> single query', async () => {
      const client = createDevSupabaseClient()

      const result = await client
        .from('profiles')
        .select('*')
        .eq('id', devMockUser.id)
        .single()

      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()
    })

    it('handles insert -> select query', async () => {
      const client = createDevSupabaseClient()

      const result = await client
        .from('posts')
        .insert({ message: 'Hello world' })
        .select('*')

      expect(result.error).toBeNull()
    })

    it('handles update -> eq query', async () => {
      const client = createDevSupabaseClient()

      const result = await client
        .from('profiles')
        .update({ username: 'NewName' })
        .eq('id', devMockUser.id)
        .select('*')

      expect(result.error).toBeNull()
    })
  })

  describe('typical storage flow', () => {
    it('handles upload -> getPublicUrl flow', async () => {
      const client = createDevSupabaseClient()

      // Upload
      const uploadResult = await client.storage
        .from('avatars')
        .upload('user123/avatar.jpg', new Blob())

      expect(uploadResult.error).toBeNull()

      // Get public URL
      const urlResult = client.storage
        .from('avatars')
        .getPublicUrl('user123/avatar.jpg')

      expect(urlResult.data.publicUrl).toContain('avatar.jpg')
    })
  })

  describe('typical realtime flow', () => {
    it('handles channel subscribe flow', () => {
      const client = createDevSupabaseClient()

      const channel = client
        .channel('posts')
        .on('INSERT', () => {})
        .subscribe()

      expect(channel).toBeDefined()

      // Cleanup
      client.removeChannel(channel)
    })
  })
})
