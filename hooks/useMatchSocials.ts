/**
 * useMatchSocials (Feature 5.6)
 *
 * Within a conversation, returns:
 *   - the OTHER party's verified handles, but only those they've explicitly
 *     shared with this conversation
 *   - the caller's own platforms shared with this conversation (so the UI
 *     can show "shared with them" state)
 *
 * The underlying RPC enforces all auth + sharing rules. The hook simply
 * shapes the result into separate "them" and "me" arrays for ergonomic use.
 */

import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'
import type { SocialPlatform } from '../lib/socialPlatforms'

export interface MatchSocialEntry {
    platform: SocialPlatform
    handle: string
    shared_at: string
}

export interface UseMatchSocialsResult {
    them: MatchSocialEntry[]
    me: MatchSocialEntry[]
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
    share: (platforms: SocialPlatform[]) => Promise<number>
    revoke: (platform: SocialPlatform) => Promise<void>
}

interface RpcRow {
    side: 'them' | 'me'
    platform: SocialPlatform
    handle: string
    shared_at: string
}

export function useMatchSocials(conversationId: string | null): UseMatchSocialsResult {
    const [them, setThem] = useState<MatchSocialEntry[]>([])
    const [me, setMe] = useState<MatchSocialEntry[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const refetch = useCallback(async () => {
        if (!conversationId) {
            setThem([])
            setMe([])
            return
        }
        setIsLoading(true)
        setError(null)
        const { data, error: rpcError } = await supabase.rpc('get_match_socials', {
            p_conversation_id: conversationId,
        })
        if (rpcError) {
            setError(rpcError.message)
            setIsLoading(false)
            return
        }
        const rows = (data ?? []) as RpcRow[]
        const theirs: MatchSocialEntry[] = []
        const mine: MatchSocialEntry[] = []
        for (const row of rows) {
            const entry: MatchSocialEntry = {
                platform: row.platform,
                handle: row.handle,
                shared_at: row.shared_at,
            }
            if (row.side === 'them') theirs.push(entry)
            else mine.push(entry)
        }
        setThem(theirs)
        setMe(mine)
        setIsLoading(false)
    }, [conversationId])

    const share = useCallback(async (platforms: SocialPlatform[]): Promise<number> => {
        if (!conversationId) return 0
        const { data, error: rpcError } = await supabase.rpc('share_socials_with_conversation', {
            p_conversation_id: conversationId,
            p_platforms: platforms,
        })
        if (rpcError) throw new Error(rpcError.message)
        await refetch()
        return (data as number | null) ?? 0
    }, [conversationId, refetch])

    const revoke = useCallback(async (platform: SocialPlatform) => {
        if (!conversationId) return
        const { error: rpcError } = await supabase.rpc('revoke_social_share', {
            p_conversation_id: conversationId,
            p_platform: platform,
        })
        if (rpcError) throw new Error(rpcError.message)
        await refetch()
    }, [conversationId, refetch])

    useEffect(() => {
        void refetch()
    }, [refetch])

    return { them, me, isLoading, error, refetch, share, revoke }
}

export default useMatchSocials
