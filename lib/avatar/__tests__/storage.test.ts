/**
 * Tests for lib/avatar/storage.ts
 *
 * Tests avatar storage operations with Supabase.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  saveUserAvatar,
  saveCurrentUserAvatar,
  saveCurrentUserAvatarConfig,
  loadUserAvatar,
  loadCurrentUserAvatar,
  deleteUserAvatar,
  deleteCurrentUserAvatar,
  hasUserAvatar,
  hasCurrentUserAvatar,
  updatePostTargetAvatar,
  loadPostTargetAvatar,
  loadMultipleUserAvatars,
  avatarStorage,
  type AvatarSaveResult,
  type AvatarLoadResult,
} from '../storage'
import type { StoredAvatar } from '../../../components/avatar/types'

// Create mock functions for the supabase client
const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('../../supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: () => mockGetUser(),
    },
  },
}))

// Mock defaults
vi.mock('../defaults', () => ({
  createStoredAvatar: vi.fn((avatarId: string) => ({
    id: 'stored-123',
    config: { avatarId },
    version: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  normalizeStoredAvatar: vi.fn((avatar: Partial<StoredAvatar>) => ({
    id: avatar.id || 'normalized-id',
    config: avatar.config || { avatarId: 'default' },
    version: avatar.version || 2,
    createdAt: avatar.createdAt || new Date().toISOString(),
    updatedAt: avatar.updatedAt || new Date().toISOString(),
  })),
}))

// Helper to create mock query builder
function createMockQueryBuilder(result: { data?: unknown; error?: object | null }) {
  const builder = {
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  }
  return builder
}

describe('saveUserAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockAvatar: StoredAvatar = {
    id: 'avatar-123',
    config: { avatarId: 'avatar_asian_m' },
    version: 2,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  }

  it('should save avatar successfully', async () => {
    const builder = createMockQueryBuilder({ data: { id: 'user-123' }, error: null })
    mockFrom.mockReturnValue(builder)

    const result = await saveUserAvatar('user-123', mockAvatar)

    expect(result.success).toBe(true)
    expect(result.avatar).toBeDefined()
    expect(result.avatar?.config.avatarId).toBe('avatar_asian_m')
    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(builder.update).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('id', 'user-123')
  })

  it('should return error when update fails', async () => {
    const builder = createMockQueryBuilder({ data: null, error: { message: 'Database error' } })
    mockFrom.mockReturnValue(builder)

    const result = await saveUserAvatar('user-123', mockAvatar)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Database error')
  })

  it('should return error when profile not found', async () => {
    const builder = createMockQueryBuilder({ data: null, error: null })
    mockFrom.mockReturnValue(builder)

    const result = await saveUserAvatar('user-123', mockAvatar)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Profile not found')
  })

  it('should handle exceptions', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('Connection failed')
    })

    const result = await saveUserAvatar('user-123', mockAvatar)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Connection failed')
  })
})

describe('saveCurrentUserAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockAvatar: StoredAvatar = {
    id: 'avatar-123',
    config: { avatarId: 'avatar_asian_m' },
    version: 2,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  }

  it('should save avatar for authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    const builder = createMockQueryBuilder({ data: { id: 'user-123' }, error: null })
    mockFrom.mockReturnValue(builder)

    const result = await saveCurrentUserAvatar(mockAvatar)

    expect(result.success).toBe(true)
  })

  it('should return error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const result = await saveCurrentUserAvatar(mockAvatar)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('should return error on auth error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth failed' },
    })

    const result = await saveCurrentUserAvatar(mockAvatar)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('should handle exceptions', async () => {
    mockGetUser.mockRejectedValue(new Error('Network error'))

    const result = await saveCurrentUserAvatar(mockAvatar)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
  })
})

describe('saveCurrentUserAvatarConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create and save stored avatar from config', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    const builder = createMockQueryBuilder({ data: { id: 'user-123' }, error: null })
    mockFrom.mockReturnValue(builder)

    const result = await saveCurrentUserAvatarConfig({ avatarId: 'avatar_asian_m' })

    expect(result.success).toBe(true)
  })
})

describe('loadUserAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load avatar successfully', async () => {
    const mockData = {
      avatar: {
        id: 'avatar-123',
        config: { avatarId: 'avatar_asian_m' },
        version: 2,
      },
      avatar_version: 2,
    }
    const builder = createMockQueryBuilder({ data: mockData, error: null })
    mockFrom.mockReturnValue(builder)

    const result = await loadUserAvatar('user-123')

    expect(result.avatar).toBeDefined()
    expect(result.error).toBeUndefined()
    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(builder.eq).toHaveBeenCalledWith('id', 'user-123')
  })

  it('should return null avatar when profile has no avatar', async () => {
    const builder = createMockQueryBuilder({ data: { avatar: null }, error: null })
    mockFrom.mockReturnValue(builder)

    const result = await loadUserAvatar('user-123')

    expect(result.avatar).toBeNull()
    expect(result.error).toBeUndefined()
  })

  it('should return error on database error', async () => {
    const builder = createMockQueryBuilder({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(builder)

    const result = await loadUserAvatar('user-123')

    expect(result.avatar).toBeNull()
    expect(result.error).toBe('Not found')
  })

  it('should handle exceptions', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('Connection failed')
    })

    const result = await loadUserAvatar('user-123')

    expect(result.avatar).toBeNull()
    expect(result.error).toBe('Connection failed')
  })
})

describe('loadCurrentUserAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load avatar for authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    const mockData = {
      avatar: { id: 'avatar-123', config: { avatarId: 'avatar_asian_m' } },
    }
    const builder = createMockQueryBuilder({ data: mockData, error: null })
    mockFrom.mockReturnValue(builder)

    const result = await loadCurrentUserAvatar()

    expect(result.avatar).toBeDefined()
  })

  it('should return error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const result = await loadCurrentUserAvatar()

    expect(result.avatar).toBeNull()
    expect(result.error).toBe('Not authenticated')
  })

  it('should handle exceptions', async () => {
    mockGetUser.mockRejectedValue(new Error('Network error'))

    const result = await loadCurrentUserAvatar()

    expect(result.avatar).toBeNull()
    expect(result.error).toBe('Network error')
  })
})

describe('deleteUserAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete avatar successfully', async () => {
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    mockFrom.mockReturnValue(builder)

    const result = await deleteUserAvatar('user-123')

    expect(result.success).toBe(true)
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({
      avatar: null,
      avatar_version: null,
    }))
  })

  it('should return error on database error', async () => {
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
    }
    mockFrom.mockReturnValue(builder)

    const result = await deleteUserAvatar('user-123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Delete failed')
  })

  it('should handle exceptions', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('Connection failed')
    })

    const result = await deleteUserAvatar('user-123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Connection failed')
  })
})

describe('deleteCurrentUserAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete avatar for authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    mockFrom.mockReturnValue(builder)

    const result = await deleteCurrentUserAvatar()

    expect(result.success).toBe(true)
  })

  it('should return error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const result = await deleteCurrentUserAvatar()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('should handle exceptions', async () => {
    mockGetUser.mockRejectedValue(new Error('Auth error'))

    const result = await deleteCurrentUserAvatar()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Auth error')
  })
})

describe('hasUserAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return true when user has avatar', async () => {
    const builder = createMockQueryBuilder({
      data: { avatar: { id: 'avatar-123' } },
      error: null,
    })
    mockFrom.mockReturnValue(builder)

    const result = await hasUserAvatar('user-123')

    expect(result).toBe(true)
  })

  it('should return false when user has no avatar', async () => {
    const builder = createMockQueryBuilder({ data: { avatar: null }, error: null })
    mockFrom.mockReturnValue(builder)

    const result = await hasUserAvatar('user-123')

    expect(result).toBe(false)
  })

  it('should return false on error', async () => {
    const builder = createMockQueryBuilder({ data: null, error: { message: 'Error' } })
    mockFrom.mockReturnValue(builder)

    const result = await hasUserAvatar('user-123')

    expect(result).toBe(false)
  })

  it('should return false on exception', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('Failed')
    })

    const result = await hasUserAvatar('user-123')

    expect(result).toBe(false)
  })
})

describe('hasCurrentUserAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return true when current user has avatar', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    const builder = createMockQueryBuilder({
      data: { avatar: { id: 'avatar-123' } },
      error: null,
    })
    mockFrom.mockReturnValue(builder)

    const result = await hasCurrentUserAvatar()

    expect(result).toBe(true)
  })

  it('should return false when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const result = await hasCurrentUserAvatar()

    expect(result).toBe(false)
  })

  it('should return false on exception', async () => {
    mockGetUser.mockRejectedValue(new Error('Auth error'))

    const result = await hasCurrentUserAvatar()

    expect(result).toBe(false)
  })
})

describe('updatePostTargetAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockAvatar: StoredAvatar = {
    id: 'avatar-123',
    config: { avatarId: 'avatar_asian_m' },
    version: 2,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  }

  it('should update post avatar successfully', async () => {
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    mockFrom.mockReturnValue(builder)

    const result = await updatePostTargetAvatar('post-123', mockAvatar)

    expect(result.success).toBe(true)
    expect(result.avatar).toEqual(mockAvatar)
    expect(mockFrom).toHaveBeenCalledWith('posts')
  })

  it('should return error on database error', async () => {
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
    }
    mockFrom.mockReturnValue(builder)

    const result = await updatePostTargetAvatar('post-123', mockAvatar)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Update failed')
  })

  it('should handle exceptions', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('Connection failed')
    })

    const result = await updatePostTargetAvatar('post-123', mockAvatar)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Connection failed')
  })
})

describe('loadPostTargetAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load post avatar successfully', async () => {
    const builder = createMockQueryBuilder({
      data: { target_avatar_v2: { id: 'avatar-123', config: { avatarId: 'avatar_asian_m' } } },
      error: null,
    })
    mockFrom.mockReturnValue(builder)

    const result = await loadPostTargetAvatar('post-123')

    expect(result.avatar).toBeDefined()
    expect(result.error).toBeUndefined()
    expect(mockFrom).toHaveBeenCalledWith('posts')
  })

  it('should return null when post has no avatar', async () => {
    const builder = createMockQueryBuilder({
      data: { target_avatar_v2: null },
      error: null,
    })
    mockFrom.mockReturnValue(builder)

    const result = await loadPostTargetAvatar('post-123')

    expect(result.avatar).toBeNull()
  })

  it('should return error on database error', async () => {
    const builder = createMockQueryBuilder({
      data: null,
      error: { message: 'Not found' },
    })
    mockFrom.mockReturnValue(builder)

    const result = await loadPostTargetAvatar('post-123')

    expect(result.avatar).toBeNull()
    expect(result.error).toBe('Not found')
  })

  it('should handle exceptions', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('Connection failed')
    })

    const result = await loadPostTargetAvatar('post-123')

    expect(result.avatar).toBeNull()
    expect(result.error).toBe('Connection failed')
  })
})

describe('loadMultipleUserAvatars', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty map for empty input', async () => {
    const result = await loadMultipleUserAvatars([])

    expect(result.size).toBe(0)
  })

  it('should load multiple avatars successfully', async () => {
    const mockData = [
      { id: 'user-1', avatar: { id: 'avatar-1', config: { avatarId: 'avatar_asian_m' } } },
      { id: 'user-2', avatar: { id: 'avatar-2', config: { avatarId: 'avatar_asian_f' } } },
    ]
    const builder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    }
    mockFrom.mockReturnValue(builder)

    const result = await loadMultipleUserAvatars(['user-1', 'user-2', 'user-3'])

    expect(result.size).toBe(3)
    expect(result.get('user-1')).toBeDefined()
    expect(result.get('user-2')).toBeDefined()
    expect(result.get('user-3')).toBeNull()
  })

  it('should return null for all users on error', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
    }
    mockFrom.mockReturnValue(builder)

    const result = await loadMultipleUserAvatars(['user-1', 'user-2'])

    expect(result.size).toBe(2)
    expect(result.get('user-1')).toBeNull()
    expect(result.get('user-2')).toBeNull()
  })

  it('should handle exceptions', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('Connection failed')
    })

    const result = await loadMultipleUserAvatars(['user-1', 'user-2'])

    expect(result.size).toBe(2)
    expect(result.get('user-1')).toBeNull()
    expect(result.get('user-2')).toBeNull()
  })
})

describe('avatarStorage export', () => {
  it('should export all functions', () => {
    expect(avatarStorage.save).toBe(saveCurrentUserAvatar)
    expect(avatarStorage.saveConfig).toBe(saveCurrentUserAvatarConfig)
    expect(avatarStorage.load).toBe(loadCurrentUserAvatar)
    expect(avatarStorage.delete).toBe(deleteCurrentUserAvatar)
    expect(avatarStorage.exists).toBe(hasCurrentUserAvatar)
    expect(avatarStorage.saveForUser).toBe(saveUserAvatar)
    expect(avatarStorage.loadForUser).toBe(loadUserAvatar)
    expect(avatarStorage.deleteForUser).toBe(deleteUserAvatar)
    expect(avatarStorage.existsForUser).toBe(hasUserAvatar)
    expect(avatarStorage.updatePostAvatar).toBe(updatePostTargetAvatar)
    expect(avatarStorage.loadPostAvatar).toBe(loadPostTargetAvatar)
    expect(avatarStorage.loadMultiple).toBe(loadMultipleUserAvatars)
  })
})
