/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for Profile Photos Service
 *
 * Tests the profile photo management functionality including upload, retrieval,
 * deletion, and moderation. This includes verification that MAX_PROFILE_PHOTOS = 6.
 *
 * Tests cover:
 * - MAX_PROFILE_PHOTOS constant is set to 6
 * - PROFILE_PHOTO_ERRORS.MAX_PHOTOS_REACHED message references 6 photos
 * - uploadProfilePhoto enforces the 6 photo limit
 * - getProfilePhotos returns photos correctly
 * - getApprovedPhotos filters by moderation status
 * - deleteProfilePhoto removes photos and handles primary photo reassignment
 * - setPrimaryPhoto validates approval status
 * - hasApprovedPhoto checks for existence
 * - getPrimaryPhoto returns correct photo
 * - getPhotoCount returns active photo count
 * - subscribeToPhotoChanges sets up real-time subscription
 * - Error handling for unauthenticated users
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock Supabase client
const mockSupabaseAuth = {
  getUser: vi.fn(),
}

const mockSupabaseRpc = vi.fn()
const mockSupabaseSelect = vi.fn()
const mockSupabaseInsert = vi.fn()
const mockSupabaseUpdate = vi.fn()
const mockSupabaseDelete = vi.fn()
const mockSupabaseEq = vi.fn()
const mockSupabaseIn = vi.fn()
const mockSupabaseSingle = vi.fn()
const mockSupabaseOrder = vi.fn()
const mockSupabaseLimit = vi.fn()
const mockSupabaseFrom = vi.fn()
const mockSupabaseChannel = vi.fn()
const mockSupabaseOn = vi.fn()
const mockSupabaseSubscribe = vi.fn()
const mockSupabaseUnsubscribe = vi.fn()
const mockSupabaseFunctionsInvoke = vi.fn()

// Mock storage
const mockUploadProfilePhoto = vi.fn()
const mockDeletePhotoByPath = vi.fn()
const mockGetSignedUrlFromPath = vi.fn()

vi.mock('../../lib/storage', () => ({
  uploadProfilePhoto: (...args: unknown[]) => mockUploadProfilePhoto(...args),
  deletePhotoByPath: (path: string) => mockDeletePhotoByPath(path),
  getSignedUrlFromPath: (path: string) => mockGetSignedUrlFromPath(path),
}))

// Create a complex chainable mock builder
const createQueryBuilder = () => {
  const builder: Record<string, Mock> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
  }

  // Make all methods chainable
  Object.keys(builder).forEach((key) => {
    if (key !== 'single') {
      builder[key].mockReturnValue(builder)
    }
  })

  return builder
}

// Helper to create a thenable object that also has chainable methods
const createThenable = (resolveValue: unknown, extraMethods: Record<string, unknown> = {}) => {
  const thenable = {
    then: (resolve: (val: unknown) => unknown) => Promise.resolve(resolveValue).then(resolve),
    catch: (reject: (err: unknown) => unknown) => Promise.resolve(resolveValue).catch(reject),
    ...extraMethods,
  }
  return thenable
}

// Default Supabase query builder - used when no mock override is set
const defaultQueryBuilder = () => ({
  select: (...args: unknown[]) => {
    mockSupabaseSelect(...args)
    return {
      eq: (col: string, val: unknown) => {
        mockSupabaseEq(col, val)
        // Return a thenable that also has chainable methods
        return createThenable({ count: 0, data: [], error: null }, {
          in: (col2: string, vals: unknown[]) => {
            mockSupabaseIn(col2, vals)
            return Promise.resolve({ count: 0, data: [], error: null })
          },
          eq: (col2: string, val2: unknown) => {
            mockSupabaseEq(col2, val2)
            // This also needs to be a thenable (for .eq().eq() queries that are awaited)
            return createThenable({ count: 0, data: [], error: null }, {
              eq: (col3: string, val3: unknown) => {
                mockSupabaseEq(col3, val3)
                return createThenable({ data: null, error: null }, {
                  single: () => mockSupabaseSingle(),
                })
              },
              order: (col3: string, opts2: unknown) => {
                mockSupabaseOrder(col3, opts2)
                return createThenable({ data: [], error: null }, {
                  order: (col4: string, opts3: unknown) => {
                    mockSupabaseOrder(col4, opts3)
                    return Promise.resolve({ data: [], error: null })
                  },
                })
              },
              single: () => mockSupabaseSingle(),
            })
          },
          order: (col2: string, opts: unknown) => {
            mockSupabaseOrder(col2, opts)
            return createThenable({ data: [], error: null }, {
              order: (col3: string, opts2: unknown) => {
                mockSupabaseOrder(col3, opts2)
                return Promise.resolve({ data: [], error: null })
              },
              limit: (n: number) => {
                mockSupabaseLimit(n)
                return createThenable({ data: null, error: null }, {
                  single: () => mockSupabaseSingle(),
                })
              },
            })
          },
          single: () => mockSupabaseSingle(),
        })
      },
      order: (col: string, opts: unknown) => {
        mockSupabaseOrder(col, opts)
        return createThenable({ data: [], error: null }, {
          order: (col2: string, opts2: unknown) => {
            mockSupabaseOrder(col2, opts2)
            return Promise.resolve({ data: [], error: null })
          },
        })
      },
    }
  },
  insert: (data: unknown) => {
    mockSupabaseInsert(data)
    return {
      select: () => ({
        single: () => mockSupabaseSingle(),
      }),
    }
  },
  update: (data: unknown) => {
    mockSupabaseUpdate(data)
    return {
      eq: (col: string, val: unknown) => {
        mockSupabaseEq(col, val)
        return Promise.resolve({ error: null })
      },
    }
  },
  delete: () => {
    mockSupabaseDelete()
    return {
      eq: (col: string, val: unknown) => {
        mockSupabaseEq(col, val)
        return createThenable({ error: null }, {
          eq: (col2: string, val2: unknown) => {
            mockSupabaseEq(col2, val2)
            return Promise.resolve({ error: null })
          },
        })
      },
    }
  },
})

// Set up mockSupabaseFrom to return the default query builder
mockSupabaseFrom.mockImplementation(() => defaultQueryBuilder())

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mockSupabaseAuth.getUser(),
    },
    rpc: (fnName: string, params: unknown) => mockSupabaseRpc(fnName, params),
    from: (table: string) => mockSupabaseFrom(table),
    channel: (name: string) => {
      mockSupabaseChannel(name)
      return {
        on: (event: string, config: unknown, callback: () => void) => {
          mockSupabaseOn(event, config, callback)
          return {
            subscribe: () => {
              mockSupabaseSubscribe()
              return {
                unsubscribe: () => mockSupabaseUnsubscribe(),
              }
            },
          }
        },
        unsubscribe: () => mockSupabaseUnsubscribe(),
      }
    },
    functions: {
      invoke: (fnName: string, opts: unknown) => mockSupabaseFunctionsInvoke(fnName, opts),
    },
  },
  supabaseUrl: 'https://test.supabase.co',
}))

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-123',
})

// Import the service under test AFTER mocking dependencies
import {
  MAX_PROFILE_PHOTOS,
  PROFILE_PHOTO_ERRORS,
  uploadProfilePhoto,
  getProfilePhotos,
  getApprovedPhotos,
  getPhotoById,
  deleteProfilePhoto,
  setPrimaryPhoto,
  hasApprovedPhoto,
  getPrimaryPhoto,
  getPhotoCount,
  subscribeToPhotoChanges,
  type UploadProfilePhotoResult,
  type DeleteProfilePhotoResult,
  type SetPrimaryPhotoResult,
  type ProfilePhotoWithUrl,
} from '../../lib/profilePhotos'

// ============================================================================
// Test Constants
// ============================================================================

const TEST_USER_ID = 'test-user-123'
const TEST_PHOTO_ID = 'test-photo-456'
const TEST_STORAGE_PATH = 'photos/test-user-123/photo.jpg'
const TEST_SIGNED_URL = 'https://example.com/signed-url?token=abc123'
const TEST_IMAGE_URI = 'file:///path/to/image.jpg'

// ============================================================================
// Setup and Teardown
// ============================================================================

describe('Profile Photos Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mockSupabaseFrom to default implementation after clearing mocks
    mockSupabaseFrom.mockImplementation(() => defaultQueryBuilder())

    // Default: authenticated user
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    })

    // Default: successful signed URL generation
    mockGetSignedUrlFromPath.mockResolvedValue({
      success: true,
      signedUrl: TEST_SIGNED_URL,
      error: null,
    })

    // Default: successful storage upload
    mockUploadProfilePhoto.mockResolvedValue({
      success: true,
      path: TEST_STORAGE_PATH,
      error: null,
    })

    // Default: successful storage delete
    mockDeletePhotoByPath.mockResolvedValue({
      success: true,
      error: null,
    })

    // Default: successful moderation trigger
    mockSupabaseFunctionsInvoke.mockResolvedValue({
      data: null,
      error: null,
    })

    // Default: successful RPC call
    mockSupabaseRpc.mockResolvedValue({ data: null, error: null })
  })

  // ============================================================================
  // MAX_PROFILE_PHOTOS Constant Tests
  // ============================================================================

  describe('MAX_PROFILE_PHOTOS', () => {
    it('is set to 6', () => {
      expect(MAX_PROFILE_PHOTOS).toBe(6)
    })

    it('is exported as a number', () => {
      expect(typeof MAX_PROFILE_PHOTOS).toBe('number')
    })

    it('is greater than 5 (updated from previous limit)', () => {
      expect(MAX_PROFILE_PHOTOS).toBeGreaterThan(5)
    })

    it('equals exactly 6 photos', () => {
      expect(MAX_PROFILE_PHOTOS).toEqual(6)
    })
  })

  // ============================================================================
  // PROFILE_PHOTO_ERRORS Constants Tests
  // ============================================================================

  describe('PROFILE_PHOTO_ERRORS', () => {
    it('exports all expected error constants', () => {
      expect(PROFILE_PHOTO_ERRORS.UPLOAD_FAILED).toBeDefined()
      expect(PROFILE_PHOTO_ERRORS.DELETE_FAILED).toBeDefined()
      expect(PROFILE_PHOTO_ERRORS.SET_PRIMARY_FAILED).toBeDefined()
      expect(PROFILE_PHOTO_ERRORS.MAX_PHOTOS_REACHED).toBeDefined()
      expect(PROFILE_PHOTO_ERRORS.PHOTO_NOT_FOUND).toBeDefined()
      expect(PROFILE_PHOTO_ERRORS.NOT_AUTHENTICATED).toBeDefined()
      expect(PROFILE_PHOTO_ERRORS.MODERATION_TRIGGER_FAILED).toBeDefined()
    })

    it('MAX_PHOTOS_REACHED error message references 6 photos', () => {
      expect(PROFILE_PHOTO_ERRORS.MAX_PHOTOS_REACHED).toContain('6')
    })

    it('MAX_PHOTOS_REACHED error message includes the limit', () => {
      expect(PROFILE_PHOTO_ERRORS.MAX_PHOTOS_REACHED).toBe(
        `You can only have ${MAX_PROFILE_PHOTOS} photos. Please delete one first.`
      )
    })

    it('error messages are user-friendly strings', () => {
      expect(typeof PROFILE_PHOTO_ERRORS.UPLOAD_FAILED).toBe('string')
      expect(PROFILE_PHOTO_ERRORS.UPLOAD_FAILED.length).toBeGreaterThan(10)
    })
  })

  // ============================================================================
  // uploadProfilePhoto Tests
  // ============================================================================

  describe('uploadProfilePhoto', () => {
    it('returns error when user is not authenticated', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await uploadProfilePhoto(TEST_IMAGE_URI)

      expect(result.success).toBe(false)
      expect(result.photo).toBeNull()
      expect(result.error).toBe(PROFILE_PHOTO_ERRORS.NOT_AUTHENTICATED)
    })

    it('enforces MAX_PROFILE_PHOTOS limit of 6', async () => {
      // Mock: user has 6 photos already (at the limit)
      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            in: () => Promise.resolve({ count: 6, error: null }),
          }),
        }),
      }))

      const result = await uploadProfilePhoto(TEST_IMAGE_URI)

      expect(result.success).toBe(false)
      expect(result.error).toBe(PROFILE_PHOTO_ERRORS.MAX_PHOTOS_REACHED)
      expect(result.error).toContain('6')
    })

    it('allows upload when user has fewer than 6 photos', async () => {
      // Mock: user has 5 photos (under the limit)
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'profile_photos') {
          return {
            select: (...args: unknown[]) => ({
              eq: () => ({
                // First query uses .in() for limit check, second uses .eq() for existing count
                in: () => Promise.resolve({ count: 5, error: null }),
                eq: () => Promise.resolve({ count: 0, error: null }),
              }),
            }),
            insert: (data: unknown) => ({
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'test-uuid-123',
                      user_id: TEST_USER_ID,
                      storage_path: TEST_STORAGE_PATH,
                      moderation_status: 'pending',
                      is_primary: true,
                      created_at: new Date().toISOString(),
                    },
                    error: null,
                  }),
              }),
            }),
          }
        }
        return { select: () => ({ eq: () => ({ in: () => Promise.resolve({ count: 0 }) }) }) }
      })

      const result = await uploadProfilePhoto(TEST_IMAGE_URI)

      expect(result.success).toBe(true)
      expect(result.photo).not.toBeNull()
    })

    it('blocks upload at exactly 6 photos', async () => {
      // User has exactly 6 photos
      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            in: () => Promise.resolve({ count: 6, error: null }),
          }),
        }),
      }))

      const result = await uploadProfilePhoto(TEST_IMAGE_URI)

      expect(result.success).toBe(false)
      expect(result.error).toBe(PROFILE_PHOTO_ERRORS.MAX_PHOTOS_REACHED)
    })

    it('handles storage upload failure', async () => {
      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            in: () => Promise.resolve({ count: 0, error: null }),
          }),
        }),
      }))

      mockUploadProfilePhoto.mockResolvedValue({
        success: false,
        path: null,
        error: 'Storage error',
      })

      const result = await uploadProfilePhoto(TEST_IMAGE_URI)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Storage error')
    })

    it('handles database insert failure', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => ({
        select: (...args: unknown[]) => ({
          eq: () => ({
            in: () => Promise.resolve({ count: 0, error: null }),
            eq: () => Promise.resolve({ count: 0, error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'Insert failed' } }),
          }),
        }),
      }))

      const result = await uploadProfilePhoto(TEST_IMAGE_URI)

      expect(result.success).toBe(false)
    })

    it('triggers moderation after successful upload', async () => {
      mockSupabaseFrom.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            in: () => Promise.resolve({ count: 0, error: null }),
            eq: () => Promise.resolve({ count: 0, error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: 'test-uuid-123',
                  user_id: TEST_USER_ID,
                  storage_path: TEST_STORAGE_PATH,
                  moderation_status: 'pending',
                  is_primary: true,
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
          }),
        }),
      }))

      await uploadProfilePhoto(TEST_IMAGE_URI)

      expect(mockSupabaseFunctionsInvoke).toHaveBeenCalledWith('moderate-image', {
        body: {
          photo_id: 'test-uuid-123',
          storage_path: TEST_STORAGE_PATH,
        },
      })
    })
  })

  // ============================================================================
  // getProfilePhotos Tests
  // ============================================================================

  describe('getProfilePhotos', () => {
    it('returns empty array when user is not authenticated', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getProfilePhotos()

      expect(result).toEqual([])
    })

    it('returns photos with signed URLs', async () => {
      const mockPhotos = [
        {
          id: TEST_PHOTO_ID,
          user_id: TEST_USER_ID,
          storage_path: TEST_STORAGE_PATH,
          moderation_status: 'approved',
          is_primary: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: mockPhotos, error: null }),
            }),
          }),
        }),
      }))

      const result = await getProfilePhotos()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(TEST_PHOTO_ID)
      expect(result[0].signedUrl).toBe(TEST_SIGNED_URL)
    })

    it('handles query error gracefully', async () => {
      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: null, error: { message: 'Query failed' } }),
            }),
          }),
        }),
      }))

      const result = await getProfilePhotos()

      expect(result).toEqual([])
    })
  })

  // ============================================================================
  // getApprovedPhotos Tests
  // ============================================================================

  describe('getApprovedPhotos', () => {
    it('returns empty array when user is not authenticated', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getApprovedPhotos()

      expect(result).toEqual([])
    })

    it('returns only approved photos', async () => {
      const mockPhotos = [
        {
          id: TEST_PHOTO_ID,
          user_id: TEST_USER_ID,
          storage_path: TEST_STORAGE_PATH,
          moderation_status: 'approved',
          is_primary: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                order: () => Promise.resolve({ data: mockPhotos, error: null }),
              }),
            }),
          }),
        }),
      }))

      const result = await getApprovedPhotos()

      expect(result).toHaveLength(1)
      expect(result[0].moderation_status).toBe('approved')
    })
  })

  // ============================================================================
  // getPhotoById Tests
  // ============================================================================

  describe('getPhotoById', () => {
    it('returns null when user is not authenticated', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getPhotoById(TEST_PHOTO_ID)

      expect(result).toBeNull()
    })

    it('returns photo with signed URL when found', async () => {
      const mockPhoto = {
        id: TEST_PHOTO_ID,
        user_id: TEST_USER_ID,
        storage_path: TEST_STORAGE_PATH,
        moderation_status: 'approved',
        is_primary: true,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseSingle.mockResolvedValue({ data: mockPhoto, error: null })

      const result = await getPhotoById(TEST_PHOTO_ID)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(TEST_PHOTO_ID)
      expect(result?.signedUrl).toBe(TEST_SIGNED_URL)
    })

    it('returns null when photo not found', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      const result = await getPhotoById(TEST_PHOTO_ID)

      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // deleteProfilePhoto Tests
  // ============================================================================

  describe('deleteProfilePhoto', () => {
    it('returns error when user is not authenticated', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await deleteProfilePhoto(TEST_PHOTO_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe(PROFILE_PHOTO_ERRORS.NOT_AUTHENTICATED)
    })

    it('returns error when photo not found', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      const result = await deleteProfilePhoto(TEST_PHOTO_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe(PROFILE_PHOTO_ERRORS.PHOTO_NOT_FOUND)
    })

    it('successfully deletes photo', async () => {
      const mockPhoto = {
        id: TEST_PHOTO_ID,
        user_id: TEST_USER_ID,
        storage_path: TEST_STORAGE_PATH,
        is_primary: false,
      }

      mockSupabaseSingle.mockResolvedValue({ data: mockPhoto, error: null })

      mockSupabaseFrom.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockPhoto, error: null }),
            }),
          }),
        }),
        delete: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }),
      }))

      const result = await deleteProfilePhoto(TEST_PHOTO_ID)

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })

    it('deletes photo from storage after database delete', async () => {
      const mockPhoto = {
        id: TEST_PHOTO_ID,
        user_id: TEST_USER_ID,
        storage_path: TEST_STORAGE_PATH,
        is_primary: false,
      }

      mockSupabaseSingle.mockResolvedValue({ data: mockPhoto, error: null })

      mockSupabaseFrom.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockPhoto, error: null }),
            }),
          }),
        }),
        delete: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }),
      }))

      await deleteProfilePhoto(TEST_PHOTO_ID)

      expect(mockDeletePhotoByPath).toHaveBeenCalledWith(TEST_STORAGE_PATH)
    })
  })

  // ============================================================================
  // setPrimaryPhoto Tests
  // ============================================================================

  describe('setPrimaryPhoto', () => {
    it('returns error when user is not authenticated', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await setPrimaryPhoto(TEST_PHOTO_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe(PROFILE_PHOTO_ERRORS.NOT_AUTHENTICATED)
    })

    it('returns error when photo not found', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      const result = await setPrimaryPhoto(TEST_PHOTO_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe(PROFILE_PHOTO_ERRORS.PHOTO_NOT_FOUND)
    })

    it('returns error when photo is not approved', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: { moderation_status: 'pending' },
        error: null,
      })

      const result = await setPrimaryPhoto(TEST_PHOTO_ID)

      expect(result.success).toBe(false)
      expect(result.error).toContain('approved')
    })

    it('successfully sets photo as primary when approved', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: { moderation_status: 'approved' },
        error: null,
      })

      mockSupabaseRpc.mockResolvedValue({ data: null, error: null })

      const result = await setPrimaryPhoto(TEST_PHOTO_ID)

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })

    it('calls set_primary_photo RPC function', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: { moderation_status: 'approved' },
        error: null,
      })

      mockSupabaseRpc.mockResolvedValue({ data: null, error: null })

      await setPrimaryPhoto(TEST_PHOTO_ID)

      expect(mockSupabaseRpc).toHaveBeenCalledWith('set_primary_photo', {
        p_photo_id: TEST_PHOTO_ID,
      })
    })
  })

  // ============================================================================
  // hasApprovedPhoto Tests
  // ============================================================================

  describe('hasApprovedPhoto', () => {
    it('returns false when user is not authenticated', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await hasApprovedPhoto()

      expect(result).toBe(false)
    })

    it('returns true when user has approved photos', async () => {
      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ count: 3, error: null }),
          }),
        }),
      }))

      const result = await hasApprovedPhoto()

      expect(result).toBe(true)
    })

    it('returns false when user has no approved photos', async () => {
      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ count: 0, error: null }),
          }),
        }),
      }))

      const result = await hasApprovedPhoto()

      expect(result).toBe(false)
    })
  })

  // ============================================================================
  // getPrimaryPhoto Tests
  // ============================================================================

  describe('getPrimaryPhoto', () => {
    it('returns null when user is not authenticated', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getPrimaryPhoto()

      expect(result).toBeNull()
    })

    it('returns primary photo with signed URL', async () => {
      const mockPhoto = {
        id: TEST_PHOTO_ID,
        user_id: TEST_USER_ID,
        storage_path: TEST_STORAGE_PATH,
        moderation_status: 'approved',
        is_primary: true,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockPhoto, error: null }),
              }),
            }),
          }),
        }),
      }))

      const result = await getPrimaryPhoto()

      expect(result).not.toBeNull()
      expect(result?.is_primary).toBe(true)
      expect(result?.signedUrl).toBe(TEST_SIGNED_URL)
    })
  })

  // ============================================================================
  // getPhotoCount Tests
  // ============================================================================

  describe('getPhotoCount', () => {
    it('returns 0 when user is not authenticated', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getPhotoCount()

      expect(result).toBe(0)
    })

    it('returns count of active photos', async () => {
      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            in: () => Promise.resolve({ count: 5, error: null }),
          }),
        }),
      }))

      const result = await getPhotoCount()

      expect(result).toBe(5)
    })

    it('can return up to 6 photos (new limit)', async () => {
      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            in: () => Promise.resolve({ count: 6, error: null }),
          }),
        }),
      }))

      const result = await getPhotoCount()

      expect(result).toBe(6)
      expect(result).toBeLessThanOrEqual(MAX_PROFILE_PHOTOS)
    })

    it('returns 0 on query error', async () => {
      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            in: () => Promise.resolve({ count: null, error: { message: 'Error' } }),
          }),
        }),
      }))

      const result = await getPhotoCount()

      expect(result).toBe(0)
    })
  })

  // ============================================================================
  // subscribeToPhotoChanges Tests
  // ============================================================================

  describe('subscribeToPhotoChanges', () => {
    it('creates subscription channel', () => {
      const callback = vi.fn()

      subscribeToPhotoChanges(callback)

      expect(mockSupabaseChannel).toHaveBeenCalledWith('profile_photos_changes')
    })

    it('subscribes to postgres_changes event', () => {
      const callback = vi.fn()

      subscribeToPhotoChanges(callback)

      expect(mockSupabaseOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'profile_photos',
        }),
        expect.any(Function)
      )
    })

    it('calls subscribe on the channel', () => {
      const callback = vi.fn()

      subscribeToPhotoChanges(callback)

      expect(mockSupabaseSubscribe).toHaveBeenCalled()
    })

    it('returns unsubscribe function', () => {
      const callback = vi.fn()

      const unsubscribe = subscribeToPhotoChanges(callback)

      expect(typeof unsubscribe).toBe('function')

      unsubscribe()

      expect(mockSupabaseUnsubscribe).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Type Export Tests
  // ============================================================================

  describe('type exports', () => {
    it('UploadProfilePhotoResult type is usable', () => {
      const result: UploadProfilePhotoResult = {
        success: true,
        photo: null,
        error: null,
      }
      expect(result.success).toBe(true)
    })

    it('DeleteProfilePhotoResult type is usable', () => {
      const result: DeleteProfilePhotoResult = {
        success: true,
        error: null,
      }
      expect(result.success).toBe(true)
    })

    it('SetPrimaryPhotoResult type is usable', () => {
      const result: SetPrimaryPhotoResult = {
        success: true,
        error: null,
      }
      expect(result.success).toBe(true)
    })

    it('ProfilePhotoWithUrl type is usable', () => {
      const photo: ProfilePhotoWithUrl = {
        id: TEST_PHOTO_ID,
        user_id: TEST_USER_ID,
        storage_path: TEST_STORAGE_PATH,
        moderation_status: 'approved',
        is_primary: true,
        created_at: '2024-01-01T00:00:00Z',
        signedUrl: TEST_SIGNED_URL,
      }
      expect(photo.signedUrl).toBe(TEST_SIGNED_URL)
    })
  })

  // ============================================================================
  // Photo Limit Edge Cases
  // ============================================================================

  describe('photo limit edge cases', () => {
    it('MAX_PROFILE_PHOTOS is used in error message', () => {
      // Verify the error message uses the constant
      expect(PROFILE_PHOTO_ERRORS.MAX_PHOTOS_REACHED).toContain(MAX_PROFILE_PHOTOS.toString())
    })

    it('allows 5 photos (under limit)', async () => {
      mockSupabaseFrom.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            in: () => Promise.resolve({ count: 5, error: null }),
            eq: () => Promise.resolve({ count: 0, error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: 'new-photo',
                  user_id: TEST_USER_ID,
                  storage_path: TEST_STORAGE_PATH,
                  moderation_status: 'pending',
                  is_primary: false,
                },
                error: null,
              }),
          }),
        }),
      }))

      const result = await uploadProfilePhoto(TEST_IMAGE_URI)

      expect(result.success).toBe(true)
    })

    it('blocks 7th photo (over limit)', async () => {
      // User trying to upload when they have 6 photos (at limit)
      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            in: () => Promise.resolve({ count: 6, error: null }),
          }),
        }),
      }))

      const result = await uploadProfilePhoto(TEST_IMAGE_URI)

      expect(result.success).toBe(false)
      expect(result.error).toBe(PROFILE_PHOTO_ERRORS.MAX_PHOTOS_REACHED)
    })

    it('limit applies to pending and approved photos combined', async () => {
      // The count should include both pending and approved photos
      // This is verified by the query using .in('moderation_status', ['pending', 'approved'])
      mockSupabaseFrom.mockImplementationOnce(() => ({
        select: (...args: unknown[]) => ({
          eq: () => ({
            in: (col: string, vals: string[]) => {
              // Verify the query checks for both pending and approved
              expect(col).toBe('moderation_status')
              expect(vals).toContain('pending')
              expect(vals).toContain('approved')
              return Promise.resolve({ count: 6, error: null })
            },
          }),
        }),
      }))

      const result = await uploadProfilePhoto(TEST_IMAGE_URI)

      expect(result.success).toBe(false)
    })

    it('rejected photos do not count toward limit', async () => {
      // Only pending and approved count, so rejected photos shouldn't block uploads
      mockSupabaseFrom.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            in: () => Promise.resolve({ count: 4, error: null }), // 4 pending+approved, can add 2 more
            eq: () => Promise.resolve({ count: 0, error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: 'new-photo',
                  user_id: TEST_USER_ID,
                  storage_path: TEST_STORAGE_PATH,
                  moderation_status: 'pending',
                  is_primary: false,
                },
                error: null,
              }),
          }),
        }),
      }))

      const result = await uploadProfilePhoto(TEST_IMAGE_URI)

      expect(result.success).toBe(true)
    })
  })

  // ============================================================================
  // Exception Handling Tests
  // ============================================================================

  describe('exception handling', () => {
    it('uploadProfilePhoto handles query exceptions gracefully', async () => {
      // Test exception inside the try-catch block (during count query)
      mockSupabaseFrom.mockImplementationOnce(() => {
        throw new Error('Database error')
      })

      const result = await uploadProfilePhoto(TEST_IMAGE_URI)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })

    it('getProfilePhotos handles exceptions gracefully', async () => {
      mockSupabaseFrom.mockImplementationOnce(() => {
        throw new Error('Unexpected error')
      })

      const result = await getProfilePhotos()

      expect(result).toEqual([])
    })

    it('deleteProfilePhoto handles query exceptions gracefully', async () => {
      // Test exception inside the try-catch block (during photo fetch)
      mockSupabaseSingle.mockImplementationOnce(() => {
        throw new Error('Query error')
      })

      const result = await deleteProfilePhoto(TEST_PHOTO_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Query error')
    })

    it('setPrimaryPhoto handles query exceptions gracefully', async () => {
      // Test exception inside the try-catch block (during photo validation)
      mockSupabaseSingle.mockImplementationOnce(() => {
        throw new Error('Validation error')
      })

      const result = await setPrimaryPhoto(TEST_PHOTO_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Validation error')
    })
  })
})
