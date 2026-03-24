/**
 * useHistoryFeed Hook
 *
 * Consolidates check-ins, matches, posts at favorites/regulars/recent,
 * own posts, and post interactions into a single chronological feed.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useFavoriteLocations } from './useFavoriteLocations'
import { useLocationHistory } from './useLocationHistory'
import { useFellowRegulars } from './useRegulars'
import { useLocation } from './useLocation'

// ============================================================================
// TYPES
// ============================================================================

export type HistoryItemType =
  | 'checkin'
  | 'checkout'
  | 'match'
  | 'post_at_favorite'
  | 'post_at_regular'
  | 'post_at_recent'
  | 'own_post'
  | 'post_interaction'

export type HistoryFilter = 'all' | 'checkins' | 'matches' | 'posts' | 'interactions'

export interface DeepLinkTarget {
  screen: string
  params: Record<string, string>
}

export interface HistoryItem {
  id: string
  type: HistoryItemType
  timestamp: string
  title: string
  subtitle: string
  icon: string
  deepLinkTarget: DeepLinkTarget
}

// ============================================================================
// FILTER → TYPE MAPPING
// ============================================================================

const FILTER_TYPES: Record<HistoryFilter, HistoryItemType[] | null> = {
  all: null,
  checkins: ['checkin', 'checkout'],
  matches: ['match'],
  posts: ['post_at_favorite', 'post_at_regular', 'post_at_recent', 'own_post'],
  interactions: ['post_interaction'],
}

// ============================================================================
// HOOK
// ============================================================================

export function useHistoryFeed(filter: HistoryFilter = 'all') {
  const { userId, isAuthenticated } = useAuth()
  const { latitude, longitude } = useLocation()
  const userCoordinates = latitude && longitude ? { latitude, longitude } : null

  const { favorites, isLoading: favoritesLoading } = useFavoriteLocations({ userCoordinates })
  const { locations: recentLocations, isLoading: historyLoading } = useLocationHistory(30)
  const { regulars: fellowRegulars, isLoading: regularsLoading } = useFellowRegulars()

  const [items, setItems] = useState<HistoryItem[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setIsLoadingData(false)
      return
    }

    try {
      const allItems: HistoryItem[] = []

      // Parallel fetch all data sources
      const [
        checkinsResult,
        matchesResult,
        ownPostsResult,
        interactionsResult,
      ] = await Promise.all([
        // Check-ins
        supabase
          .from('user_checkins')
          .select('*, locations(name)')
          .eq('user_id', userId)
          .order('checked_in_at', { ascending: false })
          .limit(50),
        // Matches (conversations where user is consumer)
        supabase
          .from('conversations')
          .select('*')
          .eq('consumer_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
        // Own posts
        supabase
          .from('posts')
          .select('*, locations(name)')
          .eq('producer_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
        // Post interactions (someone matched your post)
        supabase
          .from('conversations')
          .select('*, posts!inner(id, producer_id)')
          .eq('posts.producer_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      // Process check-ins → checkin + checkout items
      if (checkinsResult.data) {
        for (const ci of checkinsResult.data) {
          const locName = (ci as any).locations?.name || 'Unknown location'
          allItems.push({
            id: `checkin-${ci.id}`,
            type: 'checkin',
            timestamp: ci.checked_in_at,
            title: `Checked in at ${locName}`,
            subtitle: ci.verified ? 'GPS verified' : 'Manual check-in',
            icon: 'log-in',
            deepLinkTarget: { screen: 'Ledger', params: { locationId: ci.location_id, locationName: locName } },
          })
          if (ci.checked_out_at) {
            allItems.push({
              id: `checkout-${ci.id}`,
              type: 'checkout',
              timestamp: ci.checked_out_at,
              title: `Checked out of ${locName}`,
              subtitle: formatDuration(ci.checked_in_at, ci.checked_out_at),
              icon: 'log-out',
              deepLinkTarget: { screen: 'Ledger', params: { locationId: ci.location_id, locationName: locName } },
            })
          }
        }
      }

      // Process matches
      if (matchesResult.data) {
        for (const conv of matchesResult.data) {
          allItems.push({
            id: `match-${conv.id}`,
            type: 'match',
            timestamp: conv.created_at,
            title: 'New Match',
            subtitle: 'Tap to start chatting',
            icon: 'heart',
            deepLinkTarget: { screen: 'Chat', params: { conversationId: conv.id } },
          })
        }
      }

      // Process own posts
      if (ownPostsResult.data) {
        for (const post of ownPostsResult.data) {
          const locName = (post as any).locations?.name || ''
          allItems.push({
            id: `own-post-${post.id}`,
            type: 'own_post',
            timestamp: post.created_at,
            title: post.content?.substring(0, 60) || 'Your post',
            subtitle: locName ? `at ${locName}` : 'Your post',
            icon: 'create',
            deepLinkTarget: { screen: 'PostDetail', params: { postId: post.id } },
          })
        }
      }

      // Process interactions on own posts
      if (interactionsResult.data) {
        for (const conv of interactionsResult.data) {
          allItems.push({
            id: `interaction-${conv.id}`,
            type: 'post_interaction',
            timestamp: conv.created_at,
            title: 'Someone matched your post',
            subtitle: 'Tap to view conversation',
            icon: 'chatbubble-ellipses',
            deepLinkTarget: { screen: 'Chat', params: { conversationId: conv.id } },
          })
        }
      }

      // Fetch posts at favorites/regulars/recent
      const favoriteIds = favorites.map(f => f.place_id).filter((id): id is string => !!id)
      const regularIds = [...new Set(fellowRegulars.map(r => r.location_id).filter((id): id is string => !!id))]
      const recentIds = recentLocations.map(l => l.id).filter((id): id is string => !!id)

      const locationPostPromises: PromiseLike<void>[] = []

      if (favoriteIds.length > 0) {
        locationPostPromises.push(
          supabase
            .from('posts')
            .select('*, locations(name)')
            .in('location_id', favoriteIds)
            .eq('is_active', true)
            .neq('producer_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)
            .then(({ data }) => {
              if (data) {
                for (const post of data) {
                  allItems.push({
                    id: `fav-post-${post.id}`,
                    type: 'post_at_favorite',
                    timestamp: post.created_at,
                    title: post.content?.substring(0, 60) || 'Post at favorite',
                    subtitle: `at ${(post as any).locations?.name || 'favorite spot'}`,
                    icon: 'star',
                    deepLinkTarget: { screen: 'PostDetail', params: { postId: post.id } },
                  })
                }
              }
            })
        )
      }

      if (regularIds.length > 0) {
        locationPostPromises.push(
          supabase
            .from('posts')
            .select('*, locations(name)')
            .in('location_id', regularIds)
            .eq('is_active', true)
            .neq('producer_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)
            .then(({ data }) => {
              if (data) {
                for (const post of data) {
                  allItems.push({
                    id: `reg-post-${post.id}`,
                    type: 'post_at_regular',
                    timestamp: post.created_at,
                    title: post.content?.substring(0, 60) || 'Post at regular spot',
                    subtitle: `at ${(post as any).locations?.name || 'regular spot'}`,
                    icon: 'people',
                    deepLinkTarget: { screen: 'PostDetail', params: { postId: post.id } },
                  })
                }
              }
            })
        )
      }

      if (recentIds.length > 0) {
        locationPostPromises.push(
          supabase
            .from('posts')
            .select('*, locations(name)')
            .in('location_id', recentIds)
            .eq('is_active', true)
            .neq('producer_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)
            .then(({ data }) => {
              if (data) {
                for (const post of data) {
                  allItems.push({
                    id: `recent-post-${post.id}`,
                    type: 'post_at_recent',
                    timestamp: post.created_at,
                    title: post.content?.substring(0, 60) || 'Post at recent place',
                    subtitle: `at ${(post as any).locations?.name || 'recent place'}`,
                    icon: 'time',
                    deepLinkTarget: { screen: 'PostDetail', params: { postId: post.id } },
                  })
                }
              }
            })
        )
      }

      await Promise.all(locationPostPromises)

      // Sort all items by timestamp desc
      allItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setItems(allItems)
    } catch (error) {
      if (__DEV__) console.error('Error fetching history feed:', error)
    } finally {
      setIsLoadingData(false)
    }
  }, [isAuthenticated, userId, favorites, recentLocations, fellowRegulars])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  // Apply filter
  const filteredItems = useMemo(() => {
    const allowedTypes = FILTER_TYPES[filter]
    if (!allowedTypes) return items
    return items.filter(item => allowedTypes.includes(item.type))
  }, [items, filter])

  const isLoading = favoritesLoading || historyLoading || regularsLoading || isLoadingData

  return {
    items: filteredItems,
    isLoading,
    refreshing,
    handleRefresh,
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes}m visit`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m visit` : `${hours}h visit`
}
