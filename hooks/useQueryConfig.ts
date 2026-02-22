import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds - data considered fresh
      gcTime: 5 * 60 * 1000, // 5 minutes - cache garbage collection
      retry: 2,
      refetchOnWindowFocus: false, // RN doesn't have window focus like web
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
})

// Query key factories for consistent cache management
export const queryKeys = {
  conversations: {
    all: ['conversations'] as const,
    list: () => [...queryKeys.conversations.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.conversations.all, 'detail', id] as const,
  },
  messages: {
    all: ['messages'] as const,
    list: (conversationId: string) => [...queryKeys.messages.all, 'list', conversationId] as const,
  },
  posts: {
    all: ['posts'] as const,
    feed: (filters?: Record<string, unknown>) => [...queryKeys.posts.all, 'feed', filters] as const,
    detail: (id: string) => [...queryKeys.posts.all, 'detail', id] as const,
  },
  profile: {
    all: ['profile'] as const,
    me: () => [...queryKeys.profile.all, 'me'] as const,
    user: (id: string) => [...queryKeys.profile.all, 'user', id] as const,
  },
  locations: {
    all: ['locations'] as const,
    nearby: (lat: number, lon: number) => [...queryKeys.locations.all, 'nearby', lat, lon] as const,
    favorites: () => [...queryKeys.locations.all, 'favorites'] as const,
  },
  regulars: {
    all: ['regulars'] as const,
    mode: (userId: string) => [...queryKeys.regulars.all, 'mode', userId] as const,
    fellows: (userId: string, locationId?: string) =>
      [...queryKeys.regulars.all, 'fellows', userId, locationId] as const,
    location: (locationId: string, userId: string | null) =>
      [...queryKeys.regulars.all, 'location', locationId, userId] as const,
  },
  checkins: {
    all: ['checkins'] as const,
    active: (userId: string) => [...queryKeys.checkins.all, 'active', userId] as const,
    live: (locationId: string, userId: string | null) =>
      [...queryKeys.checkins.all, 'live', locationId, userId] as const,
  },
} as const
