# Supabase Integration

This document details how Backtrack integrates with Supabase for authentication, database access, file storage, and real-time features.

## Table of Contents

- [Overview](#overview)
- [Environment Configuration](#environment-configuration)
- [Client Setup](#client-setup)
  - [Browser Client](#browser-client)
  - [Server Client](#server-client)
  - [Middleware Client](#middleware-client)
- [Authentication Flow](#authentication-flow)
  - [Session Management](#session-management)
  - [Auth State](#auth-state)
  - [Protected Routes](#protected-routes)
- [Middleware Session Handling](#middleware-session-handling)
  - [How It Works](#how-it-works)
  - [Route Matching](#route-matching)
- [Storage for Selfies](#storage-for-selfies)
  - [Bucket Structure](#bucket-structure)
  - [Upload Flow](#upload-flow)
  - [Access Control](#access-control)
  - [Signed URLs](#signed-urls)
- [Row Level Security (RLS)](#row-level-security-rls)
  - [Security Model Overview](#security-model-overview)
  - [Policy Summary by Table](#policy-summary-by-table)
- [Real-time Considerations](#real-time-considerations)
  - [Use Cases](#use-cases)
  - [Channel Setup Pattern](#channel-setup-pattern)
- [Related Documentation](#related-documentation)

---

## Overview

Backtrack uses [Supabase](https://supabase.com) as its Backend-as-a-Service (BaaS) platform, providing:

| Service | Purpose |
|---------|---------|
| **Supabase Auth** | User authentication with email/password, magic links, OAuth |
| **Supabase Database** | PostgreSQL database with PostGIS for geospatial queries |
| **Supabase Storage** | Object storage for user selfies and media |
| **Supabase Realtime** | WebSocket-based real-time subscriptions for messaging |

### Key Integration Points

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BACKTRACK + SUPABASE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────┐          ┌───────────────────────────────────────┐   │
│   │    Next.js App   │          │              SUPABASE                  │   │
│   │                  │          │                                        │   │
│   │  ┌────────────┐  │   Auth   │  ┌────────────┐   ┌────────────────┐  │   │
│   │  │  Browser   │◀─┼──────────┼─▶│   Auth     │   │   Database     │  │   │
│   │  │  Client    │  │          │  │  (JWT)     │   │  (PostgreSQL)  │  │   │
│   │  └────────────┘  │          │  └────────────┘   └────────────────┘  │   │
│   │                  │          │                                        │   │
│   │  ┌────────────┐  │  Query   │  ┌────────────┐   ┌────────────────┐  │   │
│   │  │   Server   │◀─┼──────────┼─▶│    RLS     │   │    Storage     │  │   │
│   │  │  Client    │  │          │  │  Policies  │   │   (selfies/)   │  │   │
│   │  └────────────┘  │          │  └────────────┘   └────────────────┘  │   │
│   │                  │          │                                        │   │
│   │  ┌────────────┐  │  Session │  ┌────────────┐                       │   │
│   │  │ Middleware │◀─┼──────────┼─▶│  Realtime  │                       │   │
│   │  │  Client    │  │  Refresh │  │ (WebSocket)│                       │   │
│   │  └────────────┘  │          │  └────────────┘                       │   │
│   │                  │          │                                        │   │
│   └──────────────────┘          └───────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Configuration

Supabase requires two environment variables for client initialization:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key (safe to expose in browser) |

> **Note:** The `NEXT_PUBLIC_` prefix makes these variables available in browser code. The anon key is safe to expose because RLS policies protect all data access.

---

## Client Setup

Backtrack uses the `@supabase/ssr` package for proper SSR/SSG support with Next.js App Router.

### Browser Client

**File:** `lib/supabase/client.ts`

The browser client is used in Client Components for:
- User authentication actions (sign in, sign out)
- Real-time subscriptions
- Direct database queries from the browser

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Usage:**

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'

function MyComponent() {
  const supabase = createClient()

  // Query data
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('is_active', true)
}
```

### Server Client

**File:** `lib/supabase/server.ts`

The server client is used in:
- Server Components (RSC)
- Server Actions
- Route Handlers (API routes)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        }
      }
    }
  )
}
```

**Usage:**

```tsx
// In a Server Component
import { createClient } from '@/lib/supabase/server'

async function ServerComponent() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
}
```

### Middleware Client

**File:** `lib/supabase/middleware.ts`

A specialized client for Next.js middleware that handles session refresh:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard
  // to debug issues with users being randomly logged out.

  await supabase.auth.getUser()

  return supabaseResponse
}
```

---

## Authentication Flow

Backtrack uses Supabase Auth for user authentication, supporting multiple auth methods.

### Authentication Methods

| Method | Description | Use Case |
|--------|-------------|----------|
| **Email/Password** | Traditional email and password login | Primary auth method |
| **Magic Link** | Passwordless email login | Convenient alternative |
| **OAuth** | Social login (Google, Apple, etc.) | Quick onboarding |

### Session Management

Supabase uses JWT (JSON Web Tokens) for session management:

```
┌─────────────────────────────────────────────────────────────────┐
│                   SESSION LIFECYCLE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌───────────┐    ┌──────────────┐    ┌───────────────────┐    │
│   │   User    │    │   Supabase   │    │     Browser       │    │
│   │  Action   │    │    Auth      │    │     Cookies       │    │
│   └───────────┘    └──────────────┘    └───────────────────┘    │
│        │                  │                     │               │
│        │  Sign In         │                     │               │
│        │─────────────────▶│                     │               │
│        │                  │                     │               │
│        │  JWT Tokens      │                     │               │
│        │◀─────────────────│                     │               │
│        │                  │                     │               │
│        │            Store access_token          │               │
│        │───────────────────────────────────────▶│               │
│        │            Store refresh_token         │               │
│        │───────────────────────────────────────▶│               │
│        │                  │                     │               │
│        │        [Time passes - token expires]   │               │
│        │                  │                     │               │
│        │  Middleware      │                     │               │
│        │  intercepts      │  Refresh token      │               │
│        │─────────────────▶│◀────────────────────│               │
│        │                  │                     │               │
│        │  New tokens      │                     │               │
│        │◀─────────────────│                     │               │
│        │                  │  Updated cookies    │               │
│        │───────────────────────────────────────▶│               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Auth State

The user's auth state can be accessed in different contexts:

**Server Component:**
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  redirect('/login')
}
```

**Client Component:**
```typescript
const supabase = createClient()
const { data: { session } } = await supabase.auth.getSession()

// Subscribe to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Handle sign out
  }
})
```

### Protected Routes

Routes are protected by checking the user session:

```typescript
// In a page component
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <div>Protected content for {user.email}</div>
}
```

---

## Middleware Session Handling

### How It Works

Next.js middleware runs on every request (matching the configured paths). The Backtrack middleware:

1. Creates a Supabase client with cookie access
2. Calls `supabase.auth.getUser()` to validate/refresh the session
3. Returns the response with updated cookies

**File:** `middleware.ts`

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
```

### Route Matching

The middleware runs on all routes **except**:

| Pattern | Description |
|---------|-------------|
| `_next/static` | Static assets |
| `_next/image` | Optimized images |
| `favicon.ico` | Favicon |
| `*.svg|png|jpg|jpeg|gif|webp` | Image files |

This ensures session refresh happens for all page and API requests while avoiding unnecessary processing for static files.

### Why Middleware is Critical

```
┌─────────────────────────────────────────────────────────────────┐
│                 WITHOUT MIDDLEWARE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User visits page ──▶ Server Component ──▶ Expired token!      │
│                                        ──▶ User appears logged out │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                  WITH MIDDLEWARE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User visits page                                               │
│         │                                                        │
│         ▼                                                        │
│   ┌───────────────┐                                             │
│   │  Middleware   │                                             │
│   │  intercepts   │──▶ Refresh token if needed                  │
│   │               │──▶ Set new cookies                          │
│   └───────────────┘                                             │
│         │                                                        │
│         ▼                                                        │
│   Server Component ──▶ Valid session! User stays logged in      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Storage for Selfies

Supabase Storage is used to store user selfies uploaded when creating posts.

### Bucket Structure

```
selfies/                          # Storage bucket
└── {user_id}/                   # Folder per user (UUID)
    └── {post_id}/               # Folder per post (UUID)
        └── selfie.{jpg|png}     # The selfie image
```

**Example path:** `selfies/a1b2c3d4-e5f6-7890-abcd-ef1234567890/post-uuid-here/selfie.jpg`

### Upload Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELFIE UPLOAD FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│   │  User takes  │     │   Upload to  │     │  Store URL   │    │
│   │    selfie    │────▶│   Storage    │────▶│  in posts    │    │
│   │              │     │   bucket     │     │    table     │    │
│   └──────────────┘     └──────────────┘     └──────────────┘    │
│                                                                  │
│   1. Capture/select    2. Upload to          3. Reference       │
│      image                selfies/{uid}/        stored in        │
│                           {post_id}/            selfie_url       │
│                           selfie.jpg                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Access Control

Storage bucket policies mirror the application's privacy model:

| Access Level | Who Can Access | Conditions |
|--------------|----------------|------------|
| **Producer** | Always | Own selfie in own posts |
| **Consumer** | Conditional | Only after Producer accepts their response |
| **Public** | Never | Selfies are never publicly accessible |

**Storage RLS Policies:**

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own selfies"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'selfies' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own selfies
CREATE POLICY "Users can view their own selfies"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'selfies' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow matched consumers to view selfies
CREATE POLICY "Matched consumers can view producer selfies"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'selfies' AND
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN posts p ON c.post_id = p.id
    WHERE p.selfie_url LIKE '%' || name
    AND c.consumer_id = auth.uid()
    AND c.status = 'active'
  )
);
```

### Signed URLs

For secure access, selfies use signed URLs with expiration:

```typescript
// Generate a signed URL (expires in 1 hour)
const { data, error } = await supabase
  .storage
  .from('selfies')
  .createSignedUrl(path, 3600) // 3600 seconds = 1 hour

// The URL is time-limited and includes a signature
// Example: https://project.supabase.co/storage/v1/object/sign/selfies/...?token=...
```

---

## Row Level Security (RLS)

All tables have RLS enabled, ensuring users can only access authorized data.

### Security Model Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     RLS SECURITY MODEL                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Every Database Query                                           │
│         │                                                        │
│         ▼                                                        │
│   ┌───────────────────────────────────────────────────────┐     │
│   │                    RLS Policies                         │     │
│   │                                                         │     │
│   │   auth.uid() = ?   ──▶  Check if user owns/participates│     │
│   │                                                         │     │
│   │   Row data check   ──▶  Check conditions on row itself │     │
│   │                                                         │     │
│   │   Related data     ──▶  Check related tables (EXISTS)  │     │
│   │                                                         │     │
│   └───────────────────────────────────────────────────────┘     │
│         │                                                        │
│         ├── Pass ──▶ Query succeeds, returns authorized rows    │
│         │                                                        │
│         └── Fail ──▶ Row filtered out (SELECT) or error (CUD)   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Policy Summary by Table

#### Profiles

| Operation | Policy | Rule |
|-----------|--------|------|
| SELECT | `profiles_select_all` | Anyone can view (for avatars/usernames) |
| INSERT | `profiles_insert_own` | `auth.uid() = id` |
| UPDATE | `profiles_update_own` | `auth.uid() = id` |
| DELETE | `profiles_delete_own` | `auth.uid() = id` |

#### Locations

| Operation | Policy | Rule |
|-----------|--------|------|
| SELECT | `locations_select_all` | Anyone can view (for map browsing) |
| INSERT | `locations_insert_authenticated` | Must be authenticated |
| UPDATE | — | Only service role (via triggers for post_count) |
| DELETE | — | Only service role |

#### Posts

| Operation | Policy | Rule |
|-----------|--------|------|
| SELECT | `posts_select_active` | `is_active = true` OR own posts |
| INSERT | `posts_insert_own` | `auth.uid() = producer_id` |
| UPDATE | `posts_update_own` | `auth.uid() = producer_id` |
| DELETE | `posts_delete_own` | `auth.uid() = producer_id` |

#### Conversations

| Operation | Policy | Rule |
|-----------|--------|------|
| SELECT | `conversations_select_participant` | Must be producer or consumer |
| INSERT | `conversations_insert_consumer` | `auth.uid() = consumer_id` AND post is active AND not own post |
| UPDATE | `conversations_update_participant` | Must be producer or consumer |
| DELETE | `conversations_delete_participant` | Must be producer or consumer |

#### Messages

| Operation | Policy | Rule |
|-----------|--------|------|
| SELECT | `messages_select_participant` | Must be in the conversation |
| INSERT | `messages_insert_participant` | `auth.uid() = sender_id` AND conversation is active |
| UPDATE | `messages_update_participant` | Must be in the conversation |
| DELETE | `messages_delete_sender` | `auth.uid() = sender_id` |

#### Notifications

| Operation | Policy | Rule |
|-----------|--------|------|
| SELECT | `notifications_select_own` | `auth.uid() = user_id` |
| INSERT | `notifications_insert_for_user` | `auth.uid() = user_id` |
| UPDATE | `notifications_update_own` | `auth.uid() = user_id` |
| DELETE | `notifications_delete_own` | `auth.uid() = user_id` |

---

## Real-time Considerations

Supabase Realtime enables WebSocket-based subscriptions for live updates.

### Use Cases

| Feature | Real-time Use Case | Channel Type |
|---------|-------------------|--------------|
| **Messaging** | New messages appear instantly | Postgres Changes |
| **Notifications** | New notification badge updates | Postgres Changes |
| **Conversation Status** | Status changes (accepted/declined) | Postgres Changes |

### Channel Setup Pattern

**Subscribing to new messages:**

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

function ChatView({ conversationId }: { conversationId: string }) {
  const supabase = createClient()

  useEffect(() => {
    // Create a channel for this conversation's messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // Handle new message
          const newMessage = payload.new
          // Update local state with new message
        }
      )
      .subscribe()

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase])
}
```

**Subscribing to notification count:**

```typescript
function NotificationBell({ userId }: { userId: string }) {
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // Refresh notification count
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])
}
```

### Real-time with RLS

Supabase Realtime respects RLS policies. Users only receive events for rows they have access to:

```
┌─────────────────────────────────────────────────────────────────┐
│              REALTIME + RLS INTERACTION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   New message inserted into messages table                       │
│         │                                                        │
│         ▼                                                        │
│   ┌───────────────────────────────────────────────────────┐     │
│   │              Realtime broadcasts event                  │     │
│   └───────────────────────────────────────────────────────┘     │
│         │                                                        │
│         ├──── User A (conversation participant)                  │
│         │         │                                              │
│         │         └── RLS check passes ──▶ Event delivered!     │
│         │                                                        │
│         └──── User B (NOT a participant)                         │
│                   │                                              │
│                   └── RLS check fails ──▶ Event NOT delivered   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Performance Considerations

| Consideration | Recommendation |
|---------------|----------------|
| **Channel per conversation** | Create specific channels rather than listening to all messages |
| **Cleanup on unmount** | Always call `removeChannel()` to prevent memory leaks |
| **Initial data fetch** | Load existing data first, then subscribe for updates |
| **Reconnection** | Supabase handles automatic reconnection |

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System overview and core concepts
- **[USER_FLOWS.md](./USER_FLOWS.md)** - Producer and Consumer journeys
- **SUPABASE.md** (this document) - Supabase integration details
- [DATABASE.md](./DATABASE.md) - Schema and relationship documentation
- [COMPONENTS.md](./COMPONENTS.md) - UI component patterns
- [DATA_FLOW.md](./DATA_FLOW.md) - Data flow through the application
- [README.md](./README.md) - Documentation index

---

*Last updated: December 2024*
