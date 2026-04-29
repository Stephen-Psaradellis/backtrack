/**
 * useMyOverlappingCheckins
 *
 * Feature 2.1 — "I was there" timeline overlay.
 *
 * For a list of visible feed posts, batch-fetches the calling user's best
 * verified-check-in overlap with each post's sighting window (single round
 * trip via the get_my_overlaps_for_posts RPC).
 *
 * Returns a Map keyed by post_id so PostCard renders are O(1) lookups.
 * The hook re-fetches when the set of visible post IDs changes.
 */

import { useEffect, useRef, useState } from 'react'

import { supabase } from '../lib/supabase'

export interface PostOverlap {
  post_id: string
  location_id: string
  overlap_start: string
  overlap_end: string
  overlap_minutes: number
  checkin_id: string
  checkin_verified: boolean
  post_window_start: string
  post_window_end: string
}

export interface UseMyOverlappingCheckinsResult {
  overlaps: Map<string, PostOverlap>
  isLoading: boolean
  error: string | null
}

const EMPTY_OVERLAPS: Map<string, PostOverlap> = new Map()

export function useMyOverlappingCheckins(
  postIds: string[]
): UseMyOverlappingCheckinsResult {
  const [overlaps, setOverlaps] = useState<Map<string, PostOverlap>>(EMPTY_OVERLAPS)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lastKeyRef = useRef<string>('')
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (postIds.length === 0) {
      lastKeyRef.current = ''
      setOverlaps(EMPTY_OVERLAPS)
      return
    }

    const sorted = [...postIds].sort()
    const key = sorted.join(',')
    if (key === lastKeyRef.current) return
    lastKeyRef.current = key

    let cancelled = false
    setIsLoading(true)
    setError(null)

    void (async () => {
      const { data, error: rpcError } = await supabase.rpc('get_my_overlaps_for_posts', {
        p_post_ids: sorted,
      })

      if (cancelled || !isMountedRef.current) return

      if (rpcError) {
        setError(rpcError.message)
        setIsLoading(false)
        return
      }

      const next = new Map<string, PostOverlap>()
      for (const row of (data ?? []) as PostOverlap[]) {
        next.set(row.post_id, row)
      }
      setOverlaps(next)
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [postIds])

  return { overlaps, isLoading, error }
}

export default useMyOverlappingCheckins
