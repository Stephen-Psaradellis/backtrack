# Data Flow Architecture

This document describes how data moves through the Backtrack application, from UI interactions to Supabase backend and back. Understanding these patterns is essential for maintaining and extending the application.

## Table of Contents

- [Overview](#overview)
- [Data Flow Patterns](#data-flow-patterns)
  - [Next.js App Router Data Flow](#nextjs-app-router-data-flow)
  - [Client vs Server Data Fetching](#client-vs-server-data-fetching)
- [Core Data Flows](#core-data-flows)
  - [Creating a Post](#creating-a-post)
  - [Browsing and Responding](#browsing-and-responding)
  - [Conversations and Messaging](#conversations-and-messaging)
- [State Management](#state-management)
  - [Server State vs Client State](#server-state-vs-client-state)
  - [Data Caching Strategies](#data-caching-strategies)
  - [Optimistic Updates](#optimistic-updates)
- [Real-time Data Updates](#real-time-data-updates)
  - [Subscription Patterns](#subscription-patterns)
  - [Event-Driven Updates](#event-driven-updates)
- [Type Safety](#type-safety)
  - [End-to-End Type Flow](#end-to-end-type-flow)
  - [Database Type Generation](#database-type-generation)
- [Error Handling](#error-handling)
- [Related Documentation](#related-documentation)

---

## Overview

Backtrack follows a **server-first** data architecture leveraging Next.js 15 App Router and Supabase:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        BACKTRACK DATA FLOW ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │                           BROWSER                                       │    │
│   │                                                                         │    │
│   │   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │    │
│   │   │   React Client  │    │  Form Actions   │    │   Real-time     │   │    │
│   │   │   Components    │    │  (mutations)    │    │  Subscriptions  │   │    │
│   │   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘   │    │
│   │            │                      │                      │             │    │
│   └────────────┼──────────────────────┼──────────────────────┼─────────────┘    │
│                │                      │                      │                   │
│                ▼                      ▼                      │                   │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │                        NEXT.JS SERVER                                   │    │
│   │                                                                         │    │
│   │   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │    │
│   │   │     Server      │    │     Server      │    │   Middleware    │   │    │
│   │   │   Components    │    │     Actions     │    │   (session)     │   │    │
│   │   └────────┬────────┘    └────────┬────────┘    └─────────────────┘   │    │
│   │            │                      │                                    │    │
│   └────────────┼──────────────────────┼────────────────────────────────────┘    │
│                │                      │                      │                   │
│                ▼                      ▼                      ▼                   │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │                           SUPABASE                                      │    │
│   │                                                                         │    │
│   │   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │    │
│   │   │   PostgreSQL    │    │    Storage      │    │    Realtime     │   │    │
│   │   │   (+ PostGIS)   │    │   (selfies)     │    │   (WebSocket)   │   │    │
│   │   └─────────────────┘    └─────────────────┘    └─────────────────┘   │    │
│   │                                                                         │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Server-First** | Data fetching happens primarily in Server Components |
| **Type-Safe** | TypeScript types flow from database schema to UI |
| **RLS-Protected** | All data access controlled by Row Level Security policies |
| **Real-time Capable** | Critical data streams use Supabase Realtime |

---

## Data Flow Patterns

### Next.js App Router Data Flow

Backtrack uses Next.js 15 App Router patterns for data management:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS DATA FLOW PATTERNS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌───────────────────────────────────────────────────────────────────┐     │
│   │                     SERVER COMPONENTS (RSC)                        │     │
│   │                                                                    │     │
│   │   • Fetch data with Supabase server client                        │     │
│   │   • Access user session via cookies                               │     │
│   │   • Render initial HTML with data                                 │     │
│   │   • Pass data as props to Client Components                       │     │
│   └────────────────────────────┬──────────────────────────────────────┘     │
│                                │                                             │
│                                ▼                                             │
│   ┌───────────────────────────────────────────────────────────────────┐     │
│   │                     CLIENT COMPONENTS                              │     │
│   │                                                                    │     │
│   │   • Receive initial data as props (hydrated)                      │     │
│   │   • Handle user interactions                                      │     │
│   │   • Call Server Actions for mutations                             │     │
│   │   • Subscribe to real-time updates                                │     │
│   └────────────────────────────┬──────────────────────────────────────┘     │
│                                │                                             │
│                                ▼                                             │
│   ┌───────────────────────────────────────────────────────────────────┐     │
│   │                     SERVER ACTIONS                                 │     │
│   │                                                                    │     │
│   │   • Validate input data                                           │     │
│   │   • Execute mutations with server client                          │     │
│   │   • Revalidate affected paths                                     │     │
│   │   • Return result to client                                       │     │
│   └───────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Client vs Server Data Fetching

| Context | Supabase Client | Use Case |
|---------|-----------------|----------|
| **Server Component** | `createClient()` from `server.ts` | Initial page data, SEO content |
| **Server Action** | `createClient()` from `server.ts` | Mutations, form submissions |
| **Client Component** | `createClient()` from `client.ts` | Real-time subscriptions, interactive queries |
| **Middleware** | `updateSession()` from `middleware.ts` | Session refresh on every request |

#### Server Component Data Fetch Pattern

```typescript
// app/locations/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LocationPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch location with active posts
  const { data: location, error } = await supabase
    .from('locations')
    .select(`
      *,
      posts (
        *,
        producer:profiles!producer_id (username, avatar_config)
      )
    `)
    .eq('id', params.id)
    .eq('posts.is_active', true)
    .single()

  if (error || !location) {
    redirect('/map')
  }

  // Pass data to Client Component for interactivity
  return <LocationView location={location} currentUserId={user.id} />
}
```

#### Server Action Mutation Pattern

```typescript
// app/posts/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PostInsert } from '@/types/database'

export async function createPost(formData: FormData) {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Prepare post data
  const post: PostInsert = {
    producer_id: user.id,
    location_id: formData.get('location_id') as string,
    selfie_url: formData.get('selfie_url') as string,
    target_avatar: JSON.parse(formData.get('target_avatar') as string),
    message: formData.get('message') as string,
  }

  // Insert post
  const { data, error } = await supabase
    .from('posts')
    .insert(post)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Revalidate affected pages
  revalidatePath('/my-posts')
  revalidatePath(`/locations/${post.location_id}`)

  return { data }
}
```

---

## Core Data Flows

### Creating a Post

The Producer post creation flow involves multiple data operations across storage and database:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          POST CREATION DATA FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  STEP 1: LOCATION SELECTION                                            │    │
│   │                                                                         │    │
│   │  User Action: Select location from map or search                        │    │
│   │                                                                         │    │
│   │  ┌─────────────┐      ┌─────────────┐      ┌─────────────────────┐    │    │
│   │  │ Google Maps │─────▶│ Google      │─────▶│ Supabase DB:        │    │    │
│   │  │ Click/Search│      │ Places API  │      │ locations table     │    │    │
│   │  └─────────────┘      └─────────────┘      │                     │    │    │
│   │                                             │ INSERT or SELECT    │    │    │
│   │                                             │ by google_place_id  │    │    │
│   │                                             └─────────────────────┘    │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ▼                                          │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  STEP 2: SELFIE UPLOAD                                                  │    │
│   │                                                                         │    │
│   │  User Action: Take or select selfie photo                               │    │
│   │                                                                         │    │
│   │  ┌─────────────┐      ┌─────────────────────┐      ┌───────────────┐  │    │
│   │  │ Camera or   │─────▶│ Supabase Storage    │─────▶│ Returns       │  │    │
│   │  │ File Input  │      │                     │      │ selfie_url    │  │    │
│   │  └─────────────┘      │ Upload to:          │      └───────────────┘  │    │
│   │                        │ selfies/{uid}/{id}/ │                         │    │
│   │                        └─────────────────────┘                         │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ▼                                          │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  STEP 3: AVATAR CONFIGURATION                                           │    │
│   │                                                                         │    │
│   │  User Action: Build target avatar using Avataaars options               │    │
│   │                                                                         │    │
│   │  ┌─────────────┐      ┌─────────────────────┐                          │    │
│   │  │ Avatar      │─────▶│ target_avatar       │  (stored in React state) │    │
│   │  │ Builder UI  │      │ JSONB object        │                          │    │
│   │  └─────────────┘      └─────────────────────┘                          │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ▼                                          │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  STEP 4: POST SUBMISSION                                                │    │
│   │                                                                         │    │
│   │  User Action: Submit the complete post                                  │    │
│   │                                                                         │    │
│   │  ┌─────────────┐      ┌─────────────────────┐      ┌───────────────┐  │    │
│   │  │ Submit Form │─────▶│ Server Action       │─────▶│ Supabase DB   │  │    │
│   │  │             │      │ createPost()        │      │               │  │    │
│   │  └─────────────┘      └─────────────────────┘      │ INSERT INTO   │  │    │
│   │                                                     │ posts (...)   │  │    │
│   │                                                     └───────────────┘  │    │
│   │                                                            │           │    │
│   │                                                            ▼           │    │
│   │                                                     ┌───────────────┐  │    │
│   │                                                     │ Trigger:      │  │    │
│   │                                                     │ increment_    │  │    │
│   │                                                     │ location_     │  │    │
│   │                                                     │ post_count    │  │    │
│   │                                                     └───────────────┘  │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Post Creation Data Model

```typescript
// Data created during post creation

interface PostCreationPayload {
  // From Step 1: Location Selection
  location_id: string           // UUID of selected/created location

  // From Step 2: Selfie Upload
  selfie_url: string            // Storage URL: selfies/{uid}/{post_id}/selfie.jpg

  // From Step 3: Avatar Configuration
  target_avatar: AvatarConfig   // JSONB object with avatar options
  target_description?: string   // Optional text description

  // From Step 4: Message & Submission
  message: string               // The note for the target person
  seen_at?: string              // Optional timestamp when person was seen

  // Auto-populated
  producer_id: string           // auth.uid() from session
  is_active: boolean            // default: true
  created_at: string            // default: NOW()
  expires_at: string            // default: NOW() + 30 days
}
```

### Browsing and Responding

The Consumer browsing and response flow:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      CONSUMER BROWSING & RESPONSE DATA FLOW                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  STEP 1: LOCATION DISCOVERY                                             │    │
│   │                                                                         │    │
│   │  Query: Find nearby locations with active posts                         │    │
│   │                                                                         │    │
│   │  SELECT * FROM locations                                                │    │
│   │  WHERE ST_DWithin(                                                      │    │
│   │    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,     │    │
│   │    ST_SetSRID(ST_MakePoint($userLng, $userLat), 4326)::geography,      │    │
│   │    $radiusMeters                                                        │    │
│   │  )                                                                      │    │
│   │  AND post_count > 0                                                     │    │
│   │  ORDER BY post_count DESC;                                              │    │
│   │                                                                         │    │
│   │  Returns: Location[]  →  Rendered as map markers                        │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ▼                                          │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  STEP 2: LEDGER VIEW                                                    │    │
│   │                                                                         │    │
│   │  Query: Get active posts at selected location                           │    │
│   │                                                                         │    │
│   │  SELECT                                                                 │    │
│   │    p.*,                                                                 │    │
│   │    p.target_avatar,      -- Visible: the avatar describing target      │    │
│   │    p.message,            -- Visible: the producer's message            │    │
│   │    p.seen_at,            -- Visible: when they saw the person          │    │
│   │    -- NOTE: selfie_url NOT exposed until after matching                 │    │
│   │    l.name as location_name                                              │    │
│   │  FROM posts p                                                           │    │
│   │  JOIN locations l ON p.location_id = l.id                               │    │
│   │  WHERE p.location_id = $locationId                                      │    │
│   │    AND p.is_active = true                                               │    │
│   │    AND p.producer_id != auth.uid()  -- Can't see own posts in ledger   │    │
│   │  ORDER BY p.created_at DESC;                                            │    │
│   │                                                                         │    │
│   │  Returns: Post[] with limited fields →  Rendered as post cards          │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ▼                                          │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  STEP 3: RESPONSE SUBMISSION                                            │    │
│   │                                                                         │    │
│   │  User Action: Click "This is me" / "Respond"                            │    │
│   │                                                                         │    │
│   │  Validation:                                                            │    │
│   │  ✓ Post is active                                                       │    │
│   │  ✓ User is not the producer                                             │    │
│   │  ✓ User hasn't already responded to this post                           │    │
│   │                                                                         │    │
│   │  Mutations:                                                             │    │
│   │                                                                         │    │
│   │  1. INSERT INTO conversations (                                         │    │
│   │       post_id, producer_id, consumer_id, status                         │    │
│   │     ) VALUES (                                                          │    │
│   │       $postId, $producerId, auth.uid(), 'pending'                       │    │
│   │     );                                                                  │    │
│   │                                                                         │    │
│   │  2. INSERT INTO notifications (                                         │    │
│   │       user_id, type, reference_id                                       │    │
│   │     ) VALUES (                                                          │    │
│   │       $producerId, 'new_response', $conversationId                      │    │
│   │     );                                                                  │    │
│   │                                                                         │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Response State Transitions

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                    CONVERSATION STATE DATA TRANSITIONS                         │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│   Consumer                Producer                                             │
│   Responds               Notification                                          │
│      │                       │                                                 │
│      ▼                       ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐     │
│   │  STATUS: 'pending'                                                   │     │
│   │                                                                      │     │
│   │  Consumer sees:          Producer sees:                              │     │
│   │  • Post details          • Consumer's profile avatar                 │     │
│   │  • "Awaiting decision"   • Side-by-side avatar comparison           │     │
│   │  • Target avatar         • Accept/Decline buttons                   │     │
│   │  • NO selfie             • Response timestamp                       │     │
│   └─────────────────────────────────────────────────────────────────────┘     │
│                                │                                               │
│              ┌─────────────────┼─────────────────┐                            │
│              ▼                 │                 ▼                            │
│   ┌────────────────────┐      │      ┌────────────────────┐                  │
│   │  ACCEPT            │      │      │  DECLINE            │                  │
│   │                    │      │      │                     │                  │
│   │  UPDATE:           │      │      │  UPDATE:            │                  │
│   │  status='active'   │      │      │  status='declined'  │                  │
│   │  producer_accepted │      │      │                     │                  │
│   │  = true            │      │      │  Consumer notified  │                  │
│   │                    │      │      │  (optional)         │                  │
│   │  INSERT:           │      │      │                     │                  │
│   │  notification      │      │      │  END OF FLOW        │                  │
│   │  'response_accepted'│     │      └────────────────────┘                  │
│   └────────────────────┘      │                                               │
│              │                │                                               │
│              ▼                │                                               │
│   ┌────────────────────────────────────────────────────────────────────┐     │
│   │  STATUS: 'active'                                                   │     │
│   │                                                                     │     │
│   │  Consumer NOW sees:          Producer sees:                         │     │
│   │  • Producer's SELFIE         • Messaging enabled                    │     │
│   │  • Messaging enabled         • Consumer's profile                   │     │
│   │  • Full post details         • Chat interface                       │     │
│   │  • Chat interface                                                   │     │
│   │                                                                     │     │
│   │  Selfie access granted via:                                         │     │
│   │  RLS policy on storage.objects checking conversation.status        │     │
│   └────────────────────────────────────────────────────────────────────┘     │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Conversations and Messaging

Real-time messaging data flow:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        MESSAGING DATA FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  INITIAL LOAD (Server Component)                                        │    │
│   │                                                                         │    │
│   │  Query conversation with messages:                                       │    │
│   │                                                                         │    │
│   │  SELECT                                                                 │    │
│   │    c.*,                                                                 │    │
│   │    p.message as post_message,                                           │    │
│   │    p.selfie_url,  -- Only if c.status = 'active'                        │    │
│   │    p.target_avatar,                                                     │    │
│   │    producer:profiles!producer_id (*),                                   │    │
│   │    consumer:profiles!consumer_id (*)                                    │    │
│   │  FROM conversations c                                                   │    │
│   │  JOIN posts p ON c.post_id = p.id                                       │    │
│   │  WHERE c.id = $conversationId                                           │    │
│   │    AND (c.producer_id = auth.uid() OR c.consumer_id = auth.uid());     │    │
│   │                                                                         │    │
│   │  SELECT * FROM messages                                                 │    │
│   │  WHERE conversation_id = $conversationId                                │    │
│   │  ORDER BY created_at ASC;                                               │    │
│   │                                                                         │    │
│   │  →  Renders initial chat UI with message history                        │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ▼                                          │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  REAL-TIME SUBSCRIPTION (Client Component)                              │    │
│   │                                                                         │    │
│   │  const channel = supabase                                               │    │
│   │    .channel(`chat:${conversationId}`)                                   │    │
│   │    .on('postgres_changes', {                                            │    │
│   │        event: 'INSERT',                                                 │    │
│   │        schema: 'public',                                                │    │
│   │        table: 'messages',                                               │    │
│   │        filter: `conversation_id=eq.${conversationId}`                   │    │
│   │      },                                                                 │    │
│   │      (payload) => {                                                     │    │
│   │        // Append new message to local state                             │    │
│   │        addMessage(payload.new as Message)                               │    │
│   │      }                                                                  │    │
│   │    )                                                                    │    │
│   │    .subscribe()                                                         │    │
│   │                                                                         │    │
│   │  →  New messages appear instantly without page refresh                  │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ▼                                          │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  SEND MESSAGE (Server Action + Optimistic Update)                       │    │
│   │                                                                         │    │
│   │  Client Side (Optimistic):                                              │    │
│   │  ┌─────────────────────────────────────────────────────────────────┐   │    │
│   │  │  1. Add message to local state with temporary ID                │   │    │
│   │  │  2. Show message immediately in chat                            │   │    │
│   │  │  3. Mark as "sending..."                                        │   │    │
│   │  └─────────────────────────────────────────────────────────────────┘   │    │
│   │                                                                         │    │
│   │  Server Side (Action):                                                  │    │
│   │  ┌─────────────────────────────────────────────────────────────────┐   │    │
│   │  │  1. Validate conversation status = 'active'                     │   │    │
│   │  │  2. Validate user is participant                                │   │    │
│   │  │  3. INSERT INTO messages (...)                                  │   │    │
│   │  │  4. INSERT INTO notifications (type: 'new_message')             │   │    │
│   │  │  5. Return success/error                                        │   │    │
│   │  └─────────────────────────────────────────────────────────────────┘   │    │
│   │                                                                         │    │
│   │  Client Side (Confirmation):                                            │    │
│   │  ┌─────────────────────────────────────────────────────────────────┐   │    │
│   │  │  • On success: Update temp message with real ID                 │   │    │
│   │  │  • On error: Remove optimistic message, show error              │   │    │
│   │  └─────────────────────────────────────────────────────────────────┘   │    │
│   │                                                                         │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Message Read Receipts

```typescript
// Mark messages as read when conversation is opened
async function markMessagesAsRead(conversationId: string, userId: string) {
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)  // Don't mark own messages
    .eq('is_read', false)
}

// Query unread count for badge
const { count } = await supabase
  .from('messages')
  .select('*', { count: 'exact', head: true })
  .eq('conversation_id', conversationId)
  .neq('sender_id', userId)
  .eq('is_read', false)
```

---

## State Management

### Server State vs Client State

Backtrack uses a minimal state management approach:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         STATE MANAGEMENT STRATEGY                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  SERVER STATE (Source of Truth)                                         │    │
│   │                                                                         │    │
│   │  Managed by: Supabase                                                   │    │
│   │  Accessed via: Server Components, Server Actions                        │    │
│   │                                                                         │    │
│   │  • User profile data                                                    │    │
│   │  • Posts and conversations                                              │    │
│   │  • Messages and notifications                                           │    │
│   │  • Location data                                                        │    │
│   │                                                                         │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  CLIENT STATE (UI State)                                                │    │
│   │                                                                         │    │
│   │  Managed by: React useState/useReducer                                  │    │
│   │                                                                         │    │
│   │  • Form input values                                                    │    │
│   │  • Modal open/closed states                                             │    │
│   │  • Avatar builder configuration (before submission)                     │    │
│   │  • Loading/error states                                                 │    │
│   │  • Optimistic updates                                                   │    │
│   │                                                                         │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  SYNCED STATE (Real-time)                                               │    │
│   │                                                                         │    │
│   │  Managed by: Supabase Realtime + React state                            │    │
│   │                                                                         │    │
│   │  • Live messages in chat                                                │    │
│   │  • Notification counts                                                  │    │
│   │  • Conversation status changes                                          │    │
│   │                                                                         │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Data Caching Strategies

| Strategy | Implementation | Use Case |
|----------|----------------|----------|
| **Page Cache** | Next.js default caching | Static content, public pages |
| **Revalidation** | `revalidatePath()` / `revalidateTag()` | After mutations |
| **No Cache** | `export const dynamic = 'force-dynamic'` | User-specific data |
| **Client Cache** | React state | Form inputs, UI state |

#### Example: Revalidation After Mutation

```typescript
// app/posts/actions.ts
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'

export async function deletePost(postId: string, locationId: string) {
  const supabase = await createClient()

  await supabase.from('posts').delete().eq('id', postId)

  // Revalidate affected routes
  revalidatePath('/my-posts')                    // My posts list
  revalidatePath(`/locations/${locationId}`)     // Location ledger
  revalidateTag('posts')                         // All post-related queries
}
```

### Optimistic Updates

For instant UI feedback, Client Components implement optimistic updates:

```typescript
// components/chat/MessageInput.tsx
'use client'

function MessageInput({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [pending, setPending] = useState<Message | null>(null)

  async function sendMessage(content: string) {
    // 1. Create optimistic message
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
    }

    // 2. Add to UI immediately
    setMessages(prev => [...prev, optimistic])
    setPending(optimistic)

    try {
      // 3. Send to server
      const result = await createMessage({ conversationId, content })

      if (result.error) {
        throw new Error(result.error)
      }

      // 4. Replace temp with real message
      setMessages(prev =>
        prev.map(m => m.id === optimistic.id ? result.data : m)
      )
    } catch (error) {
      // 5. Rollback on error
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      // Show error toast
    } finally {
      setPending(null)
    }
  }
}
```

---

## Real-time Data Updates

### Subscription Patterns

Backtrack uses Supabase Realtime for live data synchronization:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        REAL-TIME SUBSCRIPTION PATTERNS                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  PATTERN 1: CONVERSATION MESSAGES                                       │    │
│   │                                                                         │    │
│   │  Scope: Single conversation                                             │    │
│   │  Channel: `chat:${conversationId}`                                      │    │
│   │  Events: INSERT on messages table                                       │    │
│   │                                                                         │    │
│   │  supabase                                                               │    │
│   │    .channel(`chat:${conversationId}`)                                   │    │
│   │    .on('postgres_changes', {                                            │    │
│   │      event: 'INSERT',                                                   │    │
│   │      schema: 'public',                                                  │    │
│   │      table: 'messages',                                                 │    │
│   │      filter: `conversation_id=eq.${conversationId}`                     │    │
│   │    }, handleNewMessage)                                                 │    │
│   │    .subscribe()                                                         │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  PATTERN 2: NOTIFICATION COUNT                                          │    │
│   │                                                                         │    │
│   │  Scope: Current user's notifications                                    │    │
│   │  Channel: `notifications:${userId}`                                     │    │
│   │  Events: INSERT, UPDATE, DELETE on notifications table                  │    │
│   │                                                                         │    │
│   │  supabase                                                               │    │
│   │    .channel(`notifications:${userId}`)                                  │    │
│   │    .on('postgres_changes', {                                            │    │
│   │      event: '*',                                                        │    │
│   │      schema: 'public',                                                  │    │
│   │      table: 'notifications',                                            │    │
│   │      filter: `user_id=eq.${userId}`                                     │    │
│   │    }, refreshNotificationCount)                                         │    │
│   │    .subscribe()                                                         │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  PATTERN 3: CONVERSATION STATUS                                         │    │
│   │                                                                         │    │
│   │  Scope: User's pending responses                                        │    │
│   │  Channel: `responses:${userId}`                                         │    │
│   │  Events: UPDATE on conversations table                                  │    │
│   │                                                                         │    │
│   │  supabase                                                               │    │
│   │    .channel(`responses:${userId}`)                                      │    │
│   │    .on('postgres_changes', {                                            │    │
│   │      event: 'UPDATE',                                                   │    │
│   │      schema: 'public',                                                  │    │
│   │      table: 'conversations',                                            │    │
│   │      filter: `consumer_id=eq.${userId}`                                 │    │
│   │    }, handleStatusChange)                                               │    │
│   │    .subscribe()                                                         │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Event-Driven Updates

```typescript
// hooks/useRealtimeMessages.ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types/database'

export function useRealtimeMessages(
  conversationId: string,
  initialMessages: Message[]
) {
  const [messages, setMessages] = useState(initialMessages)
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages(prev => {
            // Prevent duplicates (from optimistic updates)
            if (prev.some(m => m.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase])

  return messages
}
```

---

## Type Safety

### End-to-End Type Flow

Backtrack maintains type safety from database to UI:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          TYPE SAFETY FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  DATABASE SCHEMA                                                         │    │
│   │                                                                         │    │
│   │  CREATE TABLE posts (                                                   │    │
│   │    id UUID PRIMARY KEY,                                                 │    │
│   │    producer_id UUID REFERENCES profiles(id),                            │    │
│   │    location_id UUID REFERENCES locations(id),                           │    │
│   │    selfie_url TEXT NOT NULL,                                            │    │
│   │    target_avatar JSONB NOT NULL,                                        │    │
│   │    message TEXT NOT NULL,                                               │    │
│   │    is_active BOOLEAN DEFAULT TRUE                                       │    │
│   │  );                                                                     │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ▼                                          │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  TYPESCRIPT TYPES (types/database.ts)                                   │    │
│   │                                                                         │    │
│   │  interface Post {                                                       │    │
│   │    id: string                                                           │    │
│   │    producer_id: string                                                  │    │
│   │    location_id: string                                                  │    │
│   │    selfie_url: string                                                   │    │
│   │    target_avatar: AvatarConfig                                          │    │
│   │    message: string                                                      │    │
│   │    is_active: boolean                                                   │    │
│   │  }                                                                      │    │
│   │                                                                         │    │
│   │  type PostInsert = Omit<Post, 'id'>                                     │    │
│   │  type PostUpdate = Partial<PostInsert>                                  │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ▼                                          │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  SUPABASE CLIENT (typed queries)                                        │    │
│   │                                                                         │    │
│   │  // Query returns typed data                                            │    │
│   │  const { data, error } = await supabase                                 │    │
│   │    .from('posts')                                                       │    │
│   │    .select('*')                                                         │    │
│   │    .returns<Post[]>()                                                   │    │
│   │                                                                         │    │
│   │  // Insert requires typed input                                         │    │
│   │  const { data, error } = await supabase                                 │    │
│   │    .from('posts')                                                       │    │
│   │    .insert(postData satisfies PostInsert)                               │    │
│   │    .select()                                                            │    │
│   │    .single<Post>()                                                      │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                          │
│                                       ▼                                          │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  REACT COMPONENTS (typed props)                                         │    │
│   │                                                                         │    │
│   │  interface PostCardProps {                                              │    │
│   │    post: Post                                                           │    │
│   │    onRespond?: (postId: string) => void                                 │    │
│   │  }                                                                      │    │
│   │                                                                         │    │
│   │  function PostCard({ post, onRespond }: PostCardProps) {                │    │
│   │    // TypeScript enforces correct property access                       │    │
│   │    return (                                                             │    │
│   │      <div>                                                              │    │
│   │        <Avatar {...post.target_avatar} />                               │    │
│   │        <p>{post.message}</p>                                            │    │
│   │      </div>                                                             │    │
│   │    )                                                                    │    │
│   │  }                                                                      │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Database Type Generation

Types can be auto-generated from the Supabase schema:

```bash
# Generate types from Supabase project
npx supabase gen types typescript --project-id your-project-id > types/supabase.ts
```

#### Manual Type Definitions

For more control, Backtrack uses manually maintained types:

```typescript
// types/database.ts

// Base row types
export interface Profile {
  id: string
  username: string | null
  avatar_config: AvatarConfig | null
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  producer_id: string
  location_id: string
  selfie_url: string
  target_avatar: AvatarConfig
  target_description: string | null
  message: string
  seen_at: string | null
  is_active: boolean
  created_at: string
  expires_at: string
}

// Insert types (omit auto-generated fields)
export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>
export type PostInsert = Omit<Post, 'id' | 'created_at' | 'expires_at'>

// Update types (all fields optional)
export type ProfileUpdate = Partial<ProfileInsert>
export type PostUpdate = Partial<PostInsert>

// Joined types for queries
export interface PostWithLocation extends Post {
  location: Location
}

export interface PostWithProducer extends Post {
  producer: Profile
}

export interface ConversationWithDetails extends Conversation {
  post: Post
  producer: Profile
  consumer: Profile
}
```

---

## Error Handling

### Error Flow Patterns

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          ERROR HANDLING PATTERNS                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  SERVER ACTION ERRORS                                                    │    │
│   │                                                                         │    │
│   │  // Return errors instead of throwing                                   │    │
│   │  export async function createPost(data: PostInsert) {                   │    │
│   │    try {                                                                │    │
│   │      const supabase = await createClient()                              │    │
│   │                                                                         │    │
│   │      // Auth check                                                      │    │
│   │      const { data: { user } } = await supabase.auth.getUser()           │    │
│   │      if (!user) {                                                       │    │
│   │        return { error: 'Authentication required', data: null }          │    │
│   │      }                                                                  │    │
│   │                                                                         │    │
│   │      // Database operation                                              │    │
│   │      const { data, error } = await supabase                             │    │
│   │        .from('posts')                                                   │    │
│   │        .insert(data)                                                    │    │
│   │        .select()                                                        │    │
│   │        .single()                                                        │    │
│   │                                                                         │    │
│   │      if (error) {                                                       │    │
│   │        return { error: error.message, data: null }                      │    │
│   │      }                                                                  │    │
│   │                                                                         │    │
│   │      return { error: null, data }                                       │    │
│   │    } catch (e) {                                                        │    │
│   │      return { error: 'Unexpected error occurred', data: null }          │    │
│   │    }                                                                    │    │
│   │  }                                                                      │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  CLIENT-SIDE ERROR HANDLING                                             │    │
│   │                                                                         │    │
│   │  // Handle action results                                               │    │
│   │  async function handleSubmit() {                                        │    │
│   │    setIsLoading(true)                                                   │    │
│   │    setError(null)                                                       │    │
│   │                                                                         │    │
│   │    const result = await createPost(formData)                            │    │
│   │                                                                         │    │
│   │    if (result.error) {                                                  │    │
│   │      setError(result.error)                                             │    │
│   │      setIsLoading(false)                                                │    │
│   │      return                                                             │    │
│   │    }                                                                    │    │
│   │                                                                         │    │
│   │    // Success path                                                      │    │
│   │    router.push(`/posts/${result.data.id}`)                              │    │
│   │  }                                                                      │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │  REAL-TIME ERROR RECOVERY                                               │    │
│   │                                                                         │    │
│   │  useEffect(() => {                                                      │    │
│   │    const channel = supabase                                             │    │
│   │      .channel('messages')                                               │    │
│   │      .on('postgres_changes', {...}, handleMessage)                      │    │
│   │      .subscribe((status) => {                                           │    │
│   │        if (status === 'SUBSCRIBED') {                                   │    │
│   │          setConnected(true)                                             │    │
│   │        }                                                                │    │
│   │        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {         │    │
│   │          setConnected(false)                                            │    │
│   │          // Supabase auto-reconnects, but show UI indicator             │    │
│   │        }                                                                │    │
│   │      })                                                                 │    │
│   │                                                                         │    │
│   │    return () => supabase.removeChannel(channel)                         │    │
│   │  }, [])                                                                 │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Action Result Type

```typescript
// types/actions.ts

export interface ActionResult<T> {
  data: T | null
  error: string | null
}

// Usage in Server Actions
export async function createPost(input: PostInsert): Promise<ActionResult<Post>> {
  // ...
}

// Usage in Client Components
const result = await createPost(data)
if (result.error) {
  toast.error(result.error)
  return
}
// result.data is typed as Post
```

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System overview and tech stack
- **[USER_FLOWS.md](./USER_FLOWS.md)** - Producer and Consumer journeys
- **[SUPABASE.md](./SUPABASE.md)** - Backend integration details
- **[DATABASE.md](./DATABASE.md)** - Schema and relationships
- **[COMPONENTS.md](./COMPONENTS.md)** - UI component patterns
- **[README.md](./README.md)** - Documentation index

---

*Last updated: December 2024*
