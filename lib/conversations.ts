/**
 * Conversation Management Utilities
 *
 * Handles conversation initiation and management for the Backtrack app.
 * Conversations are anonymous chats between a post producer and a consumer
 * who believes they match the post's description.
 *
 * KEY CONCEPTS:
 * - Each post can have multiple conversations (one per unique consumer)
 * - Each post-consumer pair can only have ONE conversation (enforced by DB)
 * - Conversations are anonymous - users are identified only by role (producer/consumer)
 * - Both users must be authenticated to participate
 *
 * @example
 * ```tsx
 * import { startConversation, getExistingConversation } from 'lib/conversations'
 *
 * // Start or resume a conversation
 * const result = await startConversation(userId, post)
 * if (result.success) {
 *   navigation.navigate('Chat', { conversationId: result.conversationId })
 * }
 * ```
 */

import { supabase } from './supabase'
import type { Conversation, ConversationInsert, Post, UUID } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result from a conversation operation
 */
export interface ConversationResult {
  /** Whether the operation was successful */
  success: boolean
  /** The conversation ID (if successful) */
  conversationId: string | null
  /** Whether this is a newly created conversation (vs existing) */
  isNew: boolean
  /** Error message if operation failed */
  error: string | null
}

/**
 * Result from fetching an existing conversation
 */
export interface GetConversationResult {
  /** Whether the operation was successful */
  success: boolean
  /** The conversation object (if found) */
  conversation: Conversation | null
  /** Error message if operation failed */
  error: string | null
}

/**
 * Result from checking if a conversation exists
 */
export interface ConversationExistsResult {
  /** Whether the check was successful */
  success: boolean
  /** Whether the conversation exists */
  exists: boolean
  /** The conversation ID if it exists */
  conversationId: string | null
  /** Error message if check failed */
  error: string | null
}

/**
 * Post data required for conversation initiation
 */
export interface PostForConversation {
  /** The post's unique identifier */
  id: UUID
  /** The producer who created the post */
  producer_id: UUID
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Error messages for conversation operations
 */
export const CONVERSATION_ERRORS = {
  MISSING_USER_ID: 'User ID is required to start a conversation.',
  MISSING_POST_ID: 'Post ID is required to start a conversation.',
  MISSING_POST: 'Post data is required to start a conversation.',
  OWN_POST: 'You cannot start a conversation with yourself.',
  CREATE_FAILED: 'Failed to create conversation. Please try again.',
  FETCH_FAILED: 'Failed to fetch conversation. Please try again.',
  CHECK_FAILED: 'Failed to check existing conversation.',
  NOT_FOUND: 'Conversation not found.',
  UNAUTHORIZED: 'You are not authorized to access this conversation.',
  INACTIVE: 'This conversation is no longer active.',
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate that a user can start a conversation with a post
 *
 * @param userId - The user trying to start the conversation
 * @param post - The post they want to contact
 * @returns Error message if invalid, null if valid
 */
export function validateConversationRequest(
  userId: string | null | undefined,
  post: PostForConversation | null | undefined
): string | null {
  if (!userId) {
    return CONVERSATION_ERRORS.MISSING_USER_ID
  }

  if (!post) {
    return CONVERSATION_ERRORS.MISSING_POST
  }

  if (!post.id) {
    return CONVERSATION_ERRORS.MISSING_POST_ID
  }

  if (post.producer_id === userId) {
    return CONVERSATION_ERRORS.OWN_POST
  }

  return null
}

/**
 * Check if a user is a participant in a conversation
 *
 * @param conversation - The conversation to check
 * @param userId - The user to check
 * @returns Whether the user is a participant
 */
export function isConversationParticipant(
  conversation: Conversation,
  userId: string
): boolean {
  return conversation.producer_id === userId || conversation.consumer_id === userId
}

/**
 * Get the role of a user in a conversation
 *
 * @param conversation - The conversation
 * @param userId - The user
 * @returns 'producer' | 'consumer' | null if not a participant
 */
export function getUserRole(
  conversation: Conversation,
  userId: string
): 'producer' | 'consumer' | null {
  if (conversation.producer_id === userId) {
    return 'producer'
  }
  if (conversation.consumer_id === userId) {
    return 'consumer'
  }
  return null
}

/**
 * Get the other user's ID in a conversation
 *
 * @param conversation - The conversation
 * @param userId - The current user's ID
 * @returns The other participant's ID, or null if not a participant
 */
export function getOtherUserId(
  conversation: Conversation,
  userId: string
): string | null {
  if (conversation.producer_id === userId) {
    return conversation.consumer_id
  }
  if (conversation.consumer_id === userId) {
    return conversation.producer_id
  }
  return null
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Check if a conversation already exists between a consumer and a post
 *
 * @param consumerId - The consumer's user ID
 * @param postId - The post's ID
 * @returns Result indicating if conversation exists and its ID
 *
 * @example
 * const result = await checkExistingConversation(userId, postId)
 * if (result.exists) {
 *   navigation.navigate('Chat', { conversationId: result.conversationId })
 * }
 */
export async function checkExistingConversation(
  consumerId: string,
  postId: string
): Promise<ConversationExistsResult> {
  if (!consumerId || !postId) {
    return {
      success: false,
      exists: false,
      conversationId: null,
      error: CONVERSATION_ERRORS.CHECK_FAILED,
    }
  }

  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('post_id', postId)
      .eq('consumer_id', consumerId)
      .single()

    // PGRST116 means no rows returned - conversation doesn't exist
    if (error && error.code === 'PGRST116') {
      return {
        success: true,
        exists: false,
        conversationId: null,
        error: null,
      }
    }

    if (error) {
      return {
        success: false,
        exists: false,
        conversationId: null,
        error: error.message || CONVERSATION_ERRORS.CHECK_FAILED,
      }
    }

    return {
      success: true,
      exists: true,
      conversationId: data?.id || null,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : CONVERSATION_ERRORS.CHECK_FAILED
    return {
      success: false,
      exists: false,
      conversationId: null,
      error: message,
    }
  }
}

/**
 * Get a conversation by its ID
 *
 * @param conversationId - The conversation's ID
 * @returns The conversation object if found
 *
 * @example
 * const result = await getConversation(conversationId)
 * if (result.success && result.conversation) {
 *   console.log('Conversation with:', result.conversation.producer_id)
 * }
 */
export async function getConversation(
  conversationId: string
): Promise<GetConversationResult> {
  if (!conversationId) {
    return {
      success: false,
      conversation: null,
      error: CONVERSATION_ERRORS.NOT_FOUND,
    }
  }

  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          conversation: null,
          error: CONVERSATION_ERRORS.NOT_FOUND,
        }
      }
      return {
        success: false,
        conversation: null,
        error: error.message || CONVERSATION_ERRORS.FETCH_FAILED,
      }
    }

    return {
      success: true,
      conversation: data as Conversation,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : CONVERSATION_ERRORS.FETCH_FAILED
    return {
      success: false,
      conversation: null,
      error: message,
    }
  }
}

/**
 * Create a new conversation between a consumer and a post producer
 *
 * @param consumerId - The consumer's user ID
 * @param post - The post to start a conversation about
 * @returns The newly created conversation ID
 *
 * @example
 * const result = await createConversation(userId, post)
 * if (result.success) {
 *   navigation.navigate('Chat', { conversationId: result.conversationId })
 * }
 */
export async function createConversation(
  consumerId: string,
  post: PostForConversation
): Promise<ConversationResult> {
  // Validate the request
  const validationError = validateConversationRequest(consumerId, post)
  if (validationError) {
    return {
      success: false,
      conversationId: null,
      isNew: false,
      error: validationError,
    }
  }

  try {
    const insertData: ConversationInsert = {
      post_id: post.id,
      producer_id: post.producer_id,
      consumer_id: consumerId,
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert(insertData)
      .select('id')
      .single()

    if (error) {
      // Unique constraint violation - conversation already exists
      if (error.code === '23505') {
        // Try to fetch the existing conversation
        const existingResult = await checkExistingConversation(consumerId, post.id)
        if (existingResult.exists && existingResult.conversationId) {
          return {
            success: true,
            conversationId: existingResult.conversationId,
            isNew: false,
            error: null,
          }
        }
      }

      return {
        success: false,
        conversationId: null,
        isNew: false,
        error: error.message || CONVERSATION_ERRORS.CREATE_FAILED,
      }
    }

    return {
      success: true,
      conversationId: data?.id || null,
      isNew: true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : CONVERSATION_ERRORS.CREATE_FAILED
    return {
      success: false,
      conversationId: null,
      isNew: false,
      error: message,
    }
  }
}

/**
 * Start a conversation with a post - either returns existing or creates new
 *
 * This is the main entry point for initiating a conversation.
 * It handles all validation, checks for existing conversations,
 * and creates a new one if needed.
 *
 * @param consumerId - The consumer's user ID
 * @param post - The post to start a conversation about
 * @returns Result with conversation ID and whether it's new
 *
 * @example
 * ```tsx
 * const handleStartChat = async () => {
 *   const result = await startConversation(userId, post)
 *   if (result.success) {
 *     if (result.isNew) {
 *       console.log('Created new conversation')
 *     }
 *     navigation.navigate('Chat', { conversationId: result.conversationId })
 *   } else {
 *     Alert.alert('Error', result.error)
 *   }
 * }
 * ```
 */
export async function startConversation(
  consumerId: string | null | undefined,
  post: PostForConversation | null | undefined
): Promise<ConversationResult> {
  // Validate the request
  const validationError = validateConversationRequest(consumerId, post)
  if (validationError) {
    return {
      success: false,
      conversationId: null,
      isNew: false,
      error: validationError,
    }
  }

  // TypeScript now knows these are defined due to validation
  const userId = consumerId as string
  const validPost = post as PostForConversation

  try {
    // First, check if conversation already exists
    const existingResult = await checkExistingConversation(userId, validPost.id)

    if (!existingResult.success) {
      return {
        success: false,
        conversationId: null,
        isNew: false,
        error: existingResult.error,
      }
    }

    if (existingResult.exists && existingResult.conversationId) {
      // Return existing conversation
      return {
        success: true,
        conversationId: existingResult.conversationId,
        isNew: false,
        error: null,
      }
    }

    // Create new conversation
    return await createConversation(userId, validPost)
  } catch (err) {
    const message = err instanceof Error ? err.message : CONVERSATION_ERRORS.CREATE_FAILED
    return {
      success: false,
      conversationId: null,
      isNew: false,
      error: message,
    }
  }
}

/**
 * Get all conversations for a user
 *
 * @param userId - The user's ID
 * @param activeOnly - Only return active conversations (default: true)
 * @returns Array of conversations
 *
 * @example
 * const result = await getUserConversations(userId)
 * if (result.success) {
 *   setConversations(result.conversations)
 * }
 */
export async function getUserConversations(
  userId: string,
  activeOnly: boolean = true
): Promise<{
  success: boolean
  conversations: Conversation[]
  error: string | null
}> {
  if (!userId) {
    return {
      success: false,
      conversations: [],
      error: CONVERSATION_ERRORS.MISSING_USER_ID,
    }
  }

  try {
    let query = supabase
      .from('conversations')
      .select('*')
      .or(`producer_id.eq.${userId},consumer_id.eq.${userId}`)
      .order('updated_at', { ascending: false })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      return {
        success: false,
        conversations: [],
        error: error.message || CONVERSATION_ERRORS.FETCH_FAILED,
      }
    }

    return {
      success: true,
      conversations: (data as Conversation[]) || [],
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : CONVERSATION_ERRORS.FETCH_FAILED
    return {
      success: false,
      conversations: [],
      error: message,
    }
  }
}

/**
 * Deactivate a conversation (soft delete)
 *
 * @param conversationId - The conversation to deactivate
 * @param userId - The user requesting deactivation (must be participant)
 * @returns Success status
 *
 * @example
 * const result = await deactivateConversation(conversationId, userId)
 * if (result.success) {
 *   navigation.goBack()
 * }
 */
export async function deactivateConversation(
  conversationId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!conversationId || !userId) {
    return {
      success: false,
      error: CONVERSATION_ERRORS.NOT_FOUND,
    }
  }

  try {
    // First verify the user is a participant
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('producer_id, consumer_id')
      .eq('id', conversationId)
      .single()

    if (fetchError || !conversation) {
      return {
        success: false,
        error: CONVERSATION_ERRORS.NOT_FOUND,
      }
    }

    if (
      conversation.producer_id !== userId &&
      conversation.consumer_id !== userId
    ) {
      return {
        success: false,
        error: CONVERSATION_ERRORS.UNAUTHORIZED,
      }
    }

    // Deactivate the conversation
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ is_active: false })
      .eq('id', conversationId)

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to deactivate conversation.'
    return {
      success: false,
      error: message,
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  startConversation,
  checkExistingConversation,
  getConversation,
  createConversation,
  getUserConversations,
  deactivateConversation,
  validateConversationRequest,
  isConversationParticipant,
  getUserRole,
  getOtherUserId,
  CONVERSATION_ERRORS,
}
