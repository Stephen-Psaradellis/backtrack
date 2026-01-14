/**
 * Tests for lib/conversations.ts
 *
 * Tests conversation management functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase with proper chaining
vi.mock('../supabase', () => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockOr = vi.fn()
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockUpdateEq = vi.fn()

  // Set up default chain
  mockSelect.mockReturnValue({ eq: mockEq, or: mockOr, single: mockSingle })
  mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) })
  mockUpdate.mockReturnValue({ eq: mockUpdateEq })
  mockEq.mockReturnValue({ eq: mockEq, single: mockSingle })
  mockOr.mockReturnValue({ order: mockOrder, eq: mockEq })
  mockOrder.mockReturnValue({ eq: mockEq })
  mockUpdateEq.mockResolvedValue({ error: null })

  return {
    supabase: {
      from: vi.fn(() => ({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
      })),
      // Expose mocks for test access
      __mocks: {
        mockSingle,
        mockEq,
        mockOrder,
        mockOr,
        mockSelect,
        mockInsert,
        mockUpdate,
        mockUpdateEq,
      },
    },
  }
})

import { supabase } from '../supabase'
import {
  CONVERSATION_ERRORS,
  validateConversationRequest,
  isConversationParticipant,
  getUserRole,
  getOtherUserId,
  checkExistingConversation,
  getConversation,
  createConversation,
  startConversation,
  getUserConversations,
  deactivateConversation,
} from '../conversations'
import type { Conversation } from '../../types/database'

// Get mocks from the supabase mock
const { __mocks } = supabase as unknown as { __mocks: Record<string, ReturnType<typeof vi.fn>> }
const { mockSingle, mockEq, mockOrder, mockOr, mockSelect, mockInsert, mockUpdate, mockUpdateEq } = __mocks

// Helper to create mock conversation
function createMockConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-123',
    post_id: 'post-456',
    producer_id: 'producer-user',
    consumer_id: 'consumer-user',
    status: 'active',
    producer_accepted: false,
    verification_tier: null,
    response_id: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset default chain behavior
    mockSelect.mockReturnValue({ eq: mockEq, or: mockOr, single: mockSingle })
    mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) })
    mockUpdate.mockReturnValue({ eq: mockUpdateEq })
    mockEq.mockReturnValue({ eq: mockEq, single: mockSingle })
    mockOr.mockReturnValue({ order: mockOrder, eq: mockEq })
    mockOrder.mockReturnValue({ eq: mockEq })
    mockUpdateEq.mockResolvedValue({ error: null })
  })

  describe('CONVERSATION_ERRORS', () => {
    it('should have required error messages', () => {
      expect(CONVERSATION_ERRORS.MISSING_USER_ID).toBeDefined()
      expect(CONVERSATION_ERRORS.MISSING_POST_ID).toBeDefined()
      expect(CONVERSATION_ERRORS.MISSING_POST).toBeDefined()
      expect(CONVERSATION_ERRORS.OWN_POST).toBeDefined()
      expect(CONVERSATION_ERRORS.CREATE_FAILED).toBeDefined()
      expect(CONVERSATION_ERRORS.FETCH_FAILED).toBeDefined()
      expect(CONVERSATION_ERRORS.CHECK_FAILED).toBeDefined()
      expect(CONVERSATION_ERRORS.NOT_FOUND).toBeDefined()
      expect(CONVERSATION_ERRORS.UNAUTHORIZED).toBeDefined()
      expect(CONVERSATION_ERRORS.INACTIVE).toBeDefined()
    })
  })

  describe('validateConversationRequest', () => {
    it('should return error for missing user ID', () => {
      const result = validateConversationRequest(null, { id: 'post-1', producer_id: 'user-2' })
      expect(result).toBe(CONVERSATION_ERRORS.MISSING_USER_ID)
    })

    it('should return error for undefined user ID', () => {
      const result = validateConversationRequest(undefined, { id: 'post-1', producer_id: 'user-2' })
      expect(result).toBe(CONVERSATION_ERRORS.MISSING_USER_ID)
    })

    it('should return error for empty user ID', () => {
      const result = validateConversationRequest('', { id: 'post-1', producer_id: 'user-2' })
      expect(result).toBe(CONVERSATION_ERRORS.MISSING_USER_ID)
    })

    it('should return error for missing post', () => {
      const result = validateConversationRequest('user-1', null)
      expect(result).toBe(CONVERSATION_ERRORS.MISSING_POST)
    })

    it('should return error for undefined post', () => {
      const result = validateConversationRequest('user-1', undefined)
      expect(result).toBe(CONVERSATION_ERRORS.MISSING_POST)
    })

    it('should return error for missing post ID', () => {
      const result = validateConversationRequest('user-1', { id: '', producer_id: 'user-2' })
      expect(result).toBe(CONVERSATION_ERRORS.MISSING_POST_ID)
    })

    it('should return error for own post', () => {
      const result = validateConversationRequest('user-1', { id: 'post-1', producer_id: 'user-1' })
      expect(result).toBe(CONVERSATION_ERRORS.OWN_POST)
    })

    it('should return null for valid request', () => {
      const result = validateConversationRequest('user-1', { id: 'post-1', producer_id: 'user-2' })
      expect(result).toBeNull()
    })
  })

  describe('isConversationParticipant', () => {
    it('should return true for producer', () => {
      const conversation = createMockConversation()
      expect(isConversationParticipant(conversation, 'producer-user')).toBe(true)
    })

    it('should return true for consumer', () => {
      const conversation = createMockConversation()
      expect(isConversationParticipant(conversation, 'consumer-user')).toBe(true)
    })

    it('should return false for non-participant', () => {
      const conversation = createMockConversation()
      expect(isConversationParticipant(conversation, 'other-user')).toBe(false)
    })
  })

  describe('getUserRole', () => {
    it('should return producer for producer user', () => {
      const conversation = createMockConversation()
      expect(getUserRole(conversation, 'producer-user')).toBe('producer')
    })

    it('should return consumer for consumer user', () => {
      const conversation = createMockConversation()
      expect(getUserRole(conversation, 'consumer-user')).toBe('consumer')
    })

    it('should return null for non-participant', () => {
      const conversation = createMockConversation()
      expect(getUserRole(conversation, 'other-user')).toBeNull()
    })
  })

  describe('getOtherUserId', () => {
    it('should return consumer ID for producer', () => {
      const conversation = createMockConversation()
      expect(getOtherUserId(conversation, 'producer-user')).toBe('consumer-user')
    })

    it('should return producer ID for consumer', () => {
      const conversation = createMockConversation()
      expect(getOtherUserId(conversation, 'consumer-user')).toBe('producer-user')
    })

    it('should return null for non-participant', () => {
      const conversation = createMockConversation()
      expect(getOtherUserId(conversation, 'other-user')).toBeNull()
    })
  })

  describe('checkExistingConversation', () => {
    it('should return error for missing consumer ID', async () => {
      const result = await checkExistingConversation('', 'post-123')
      expect(result.success).toBe(false)
      expect(result.error).toBe(CONVERSATION_ERRORS.CHECK_FAILED)
    })

    it('should return error for missing post ID', async () => {
      const result = await checkExistingConversation('user-123', '')
      expect(result.success).toBe(false)
      expect(result.error).toBe(CONVERSATION_ERRORS.CHECK_FAILED)
    })

    it('should return exists=false when conversation not found (PGRST116)', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      })

      const result = await checkExistingConversation('user-123', 'post-456')

      expect(result.success).toBe(true)
      expect(result.exists).toBe(false)
      expect(result.conversationId).toBeNull()
    })

    it('should return exists=true when conversation found', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'conv-789' },
        error: null,
      })

      const result = await checkExistingConversation('user-123', 'post-456')

      expect(result.success).toBe(true)
      expect(result.exists).toBe(true)
      expect(result.conversationId).toBe('conv-789')
    })

    it('should handle other database errors', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: '42000', message: 'Database error' },
      })

      const result = await checkExistingConversation('user-123', 'post-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })

    it('should handle exceptions', async () => {
      mockSingle.mockRejectedValueOnce(new Error('Network error'))

      const result = await checkExistingConversation('user-123', 'post-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('getConversation', () => {
    it('should return error for missing conversation ID', async () => {
      const result = await getConversation('')
      expect(result.success).toBe(false)
      expect(result.error).toBe(CONVERSATION_ERRORS.NOT_FOUND)
    })

    it('should return conversation when found', async () => {
      const mockConversation = createMockConversation()
      mockSingle.mockResolvedValueOnce({
        data: mockConversation,
        error: null,
      })

      const result = await getConversation('conv-123')

      expect(result.success).toBe(true)
      expect(result.conversation).toEqual(mockConversation)
    })

    it('should return not found error when conversation does not exist (PGRST116)', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      })

      const result = await getConversation('conv-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe(CONVERSATION_ERRORS.NOT_FOUND)
    })

    it('should handle other database errors', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Permission denied' },
      })

      const result = await getConversation('conv-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Permission denied')
    })

    it('should handle exceptions', async () => {
      mockSingle.mockRejectedValueOnce(new Error('Network error'))

      const result = await getConversation('conv-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('createConversation', () => {
    it('should return error for invalid request', async () => {
      const result = await createConversation('', { id: 'post-1', producer_id: 'user-2' })
      expect(result.success).toBe(false)
      expect(result.error).toBe(CONVERSATION_ERRORS.MISSING_USER_ID)
    })

    it('should return error for own post', async () => {
      const result = await createConversation('user-1', { id: 'post-1', producer_id: 'user-1' })
      expect(result.success).toBe(false)
      expect(result.error).toBe(CONVERSATION_ERRORS.OWN_POST)
    })

    it('should create conversation successfully', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'conv-new' },
        error: null,
      })

      const result = await createConversation('consumer-123', { id: 'post-456', producer_id: 'producer-789' })

      expect(result.success).toBe(true)
      expect(result.conversationId).toBe('conv-new')
      expect(result.isNew).toBe(true)
    })

    it('should return existing conversation on unique constraint violation', async () => {
      // First call - insert fails with unique constraint
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'Unique constraint violation' },
      })
      // Second call - fetch existing conversation
      mockSingle.mockResolvedValueOnce({
        data: { id: 'existing-conv' },
        error: null,
      })

      const result = await createConversation('consumer-123', { id: 'post-456', producer_id: 'producer-789' })

      expect(result.success).toBe(true)
      expect(result.conversationId).toBe('existing-conv')
      expect(result.isNew).toBe(false)
    })

    it('should handle other database errors', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: '42000', message: 'Insert failed' },
      })

      const result = await createConversation('consumer-123', { id: 'post-456', producer_id: 'producer-789' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insert failed')
    })

    it('should handle exceptions', async () => {
      mockSingle.mockRejectedValueOnce(new Error('Network error'))

      const result = await createConversation('consumer-123', { id: 'post-456', producer_id: 'producer-789' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('startConversation', () => {
    it('should return error for invalid request', async () => {
      const result = await startConversation(null, { id: 'post-1', producer_id: 'user-2' })
      expect(result.success).toBe(false)
      expect(result.error).toBe(CONVERSATION_ERRORS.MISSING_USER_ID)
    })

    it('should return existing conversation if found', async () => {
      // Check existing returns found
      mockSingle.mockResolvedValueOnce({
        data: { id: 'existing-conv' },
        error: null,
      })

      const result = await startConversation('consumer-123', { id: 'post-456', producer_id: 'producer-789' })

      expect(result.success).toBe(true)
      expect(result.conversationId).toBe('existing-conv')
      expect(result.isNew).toBe(false)
    })

    it('should create new conversation if none exists', async () => {
      // Check existing returns not found
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows' },
      })
      // Create new conversation
      mockSingle.mockResolvedValueOnce({
        data: { id: 'new-conv' },
        error: null,
      })

      const result = await startConversation('consumer-123', { id: 'post-456', producer_id: 'producer-789' })

      expect(result.success).toBe(true)
      expect(result.conversationId).toBe('new-conv')
      expect(result.isNew).toBe(true)
    })

    it('should handle check failure', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: '42000', message: 'Check failed' },
      })

      const result = await startConversation('consumer-123', { id: 'post-456', producer_id: 'producer-789' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Check failed')
    })

    it('should handle exceptions', async () => {
      mockSingle.mockRejectedValueOnce(new Error('Network error'))

      const result = await startConversation('consumer-123', { id: 'post-456', producer_id: 'producer-789' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('getUserConversations', () => {
    it('should return error for missing user ID', async () => {
      const result = await getUserConversations('')
      expect(result.success).toBe(false)
      expect(result.error).toBe(CONVERSATION_ERRORS.MISSING_USER_ID)
    })

    it('should return conversations for user', async () => {
      const mockConversations = [
        createMockConversation({ id: 'conv-1' }),
        createMockConversation({ id: 'conv-2' }),
      ]
      mockEq.mockResolvedValueOnce({
        data: mockConversations,
        error: null,
      })

      const result = await getUserConversations('user-123')

      expect(result.success).toBe(true)
      expect(result.conversations).toHaveLength(2)
    })

    it('should filter by active only by default', async () => {
      mockEq.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      await getUserConversations('user-123')

      expect(mockOrder).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('is_active', true)
    })

    it('should return all conversations when activeOnly is false', async () => {
      mockOrder.mockReturnValueOnce({
        then: vi.fn((cb) => cb({ data: [], error: null })),
      })

      await getUserConversations('user-123', false)

      // When activeOnly is false, eq('is_active', true) should not be called after order
    })

    it('should handle database error', async () => {
      mockEq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Query failed' },
      })

      const result = await getUserConversations('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Query failed')
    })

    it('should handle exceptions', async () => {
      mockEq.mockRejectedValueOnce(new Error('Network error'))

      const result = await getUserConversations('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('deactivateConversation', () => {
    it('should return error for missing conversation ID', async () => {
      const result = await deactivateConversation('', 'user-123')
      expect(result.success).toBe(false)
      expect(result.error).toBe(CONVERSATION_ERRORS.NOT_FOUND)
    })

    it('should return error for missing user ID', async () => {
      const result = await deactivateConversation('conv-123', '')
      expect(result.success).toBe(false)
      expect(result.error).toBe(CONVERSATION_ERRORS.NOT_FOUND)
    })

    it('should return error when conversation not found', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      const result = await deactivateConversation('conv-123', 'user-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe(CONVERSATION_ERRORS.NOT_FOUND)
    })

    it('should return unauthorized when user is not participant', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { producer_id: 'other-user', consumer_id: 'another-user' },
        error: null,
      })

      const result = await deactivateConversation('conv-123', 'user-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe(CONVERSATION_ERRORS.UNAUTHORIZED)
    })

    it('should deactivate conversation as producer', async () => {
      // First call fetches conversation
      mockSingle.mockResolvedValueOnce({
        data: { producer_id: 'user-456', consumer_id: 'other-user' },
        error: null,
      })
      // For update chain
      mockUpdateEq.mockResolvedValueOnce({ error: null })

      const result = await deactivateConversation('conv-123', 'user-456')

      expect(result.success).toBe(true)
    })

    it('should deactivate conversation as consumer', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { producer_id: 'other-user', consumer_id: 'user-456' },
        error: null,
      })
      mockUpdateEq.mockResolvedValueOnce({ error: null })

      const result = await deactivateConversation('conv-123', 'user-456')

      expect(result.success).toBe(true)
    })

    it('should handle update error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { producer_id: 'user-456', consumer_id: 'other-user' },
        error: null,
      })
      mockUpdateEq.mockResolvedValueOnce({ error: { message: 'Update failed' } })

      const result = await deactivateConversation('conv-123', 'user-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
    })

    it('should handle exceptions', async () => {
      mockSingle.mockRejectedValueOnce(new Error('Network error'))

      const result = await deactivateConversation('conv-123', 'user-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })
})
