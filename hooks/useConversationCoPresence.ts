/**
 * useConversationCoPresence
 *
 * Feature 4.3 — fetches the best mutual overlap between both parties of a
 * conversation at the post's location. Backed by the
 * get_conversation_copresence RPC. Returns null when there is no overlap.
 */

import { useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'

export interface ConversationCoPresence {
  conversation_id: string
  location_id: string
  location_name: string | null
  overlap_start: string
  overlap_end: string
  overlap_minutes: number
  both_verified: boolean
}

export interface UseConversationCoPresenceResult {
  copresence: ConversationCoPresence | null
  isLoading: boolean
  error: string | null
}

export function useConversationCoPresence(
  conversationId: string | null
): UseConversationCoPresenceResult {
  const [copresence, setCoPresence] = useState<ConversationCoPresence | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!conversationId) {
      setCoPresence(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    void (async () => {
      const { data, error: rpcError } = await supabase.rpc(
        'get_conversation_copresence',
        { p_conversation_id: conversationId }
      )

      if (cancelled) return

      if (rpcError) {
        setError(rpcError.message)
        setCoPresence(null)
        setIsLoading(false)
        return
      }

      const row = (data as ConversationCoPresence[] | null)?.[0] ?? null
      setCoPresence(row)
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [conversationId])

  return { copresence, isLoading, error }
}

export default useConversationCoPresence
