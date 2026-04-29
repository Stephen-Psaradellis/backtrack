/**
 * useVerifiedSocials (Feature 5.6)
 *
 * Returns the calling user's connected verified social accounts. Tokens are
 * never exposed — the underlying RPC strips them.
 */

import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'
import type { SocialPlatform } from '../lib/socialPlatforms'

export interface VerifiedSocial {
    platform: SocialPlatform
    handle: string
    verified_at: string
}

export interface UseVerifiedSocialsResult {
    socials: VerifiedSocial[]
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
    disconnect: (platform: SocialPlatform) => Promise<void>
}

export function useVerifiedSocials(): UseVerifiedSocialsResult {
    const [socials, setSocials] = useState<VerifiedSocial[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const refetch = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        const { data, error: rpcError } = await supabase.rpc('get_my_verified_socials')
        if (rpcError) {
            setError(rpcError.message)
            setIsLoading(false)
            return
        }
        setSocials((data ?? []) as VerifiedSocial[])
        setIsLoading(false)
    }, [])

    const disconnect = useCallback(async (platform: SocialPlatform) => {
        const { error: rpcError } = await supabase.rpc('disconnect_social_account', {
            p_platform: platform,
        })
        if (rpcError) throw new Error(rpcError.message)
        await refetch()
    }, [refetch])

    useEffect(() => {
        void refetch()
    }, [refetch])

    return { socials, isLoading, error, refetch, disconnect }
}

export default useVerifiedSocials
