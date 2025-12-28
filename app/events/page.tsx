'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { EventSearch } from '@/components/events/EventSearch'
import type { Event } from '@/hooks/useEvents'

// ============================================================================
// Event Discovery Page
// ============================================================================

/**
 * Event Discovery Page
 *
 * Allows users to discover and search for nearby events.
 * Uses the EventSearch component with full filtering capabilities.
 *
 * Features:
 * - Location-based event search
 * - Category and platform filtering
 * - Radius selection
 * - Event navigation on selection
 */
export default function EventDiscoveryPage() {
  const router = useRouter()

  /**
   * Handle event selection - navigate to event detail page
   */
  const handleEventSelect = useCallback(
    (event: Event) => {
      router.push(`/events/${event.id}`)
    },
    [router]
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Discover Events
          </h1>
          <p className="mt-2 text-muted-foreground">
            Find events near you and connect with people who share your interests
          </p>
        </header>

        {/* Event Search Component */}
        <main>
          <EventSearch
            onEventSelect={handleEventSelect}
            showFilters={true}
            showLocationButton={true}
            autoFetchLocation={true}
            placeholder="Search for events..."
            emptyTitle="No events found"
            emptyMessage="Try adjusting your search filters or expanding your search radius."
            testID="event-discovery"
          />
        </main>
      </div>
    </div>
  )
}
