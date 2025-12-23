# Love Ledger Database Documentation

Comprehensive documentation and setup guide for the Love Ledger Supabase database schema, including tables, relationships, Row Level Security (RLS) policies, triggers, and TypeScript integration.

---

## Table of Contents

- [Database Overview](#database-overview)
- [Architecture](#architecture)
- [Schema Overview](#schema-overview)
- [Extensions](#extensions)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Tables](#tables)
  - [profiles](#profiles)
  - [locations](#locations)
  - [posts](#posts)
  - [conversations](#conversations)
  - [messages](#messages)
  - [notifications](#notifications)
- [Row Level Security (RLS)](#row-level-security-rls)
  - [Security Model](#love-ledger-security-model)
  - [Authentication Context](#authentication-context-authuid)
  - [Policy Types](#policy-types-and-clauses)
  - [profiles Policies](#profiles-rls-policies)
  - [locations Policies](#locations-rls-policies)
  - [posts Policies](#posts-rls-policies)
  - [conversations Policies](#conversations-rls-policies)
  - [messages Policies](#messages-rls-policies)
  - [notifications Policies](#notifications-rls-policies)
- [Functions and Triggers](#functions-and-triggers)
- [PostGIS Extension Setup](#postgis-extension-setup)
- [Running Migrations](#running-migrations)
- [Local Development with Supabase CLI](#local-development-with-supabase-cli)
- [Database Best Practices](#database-best-practices)
- [Common Database Operations](#common-database-operations)
- [TypeScript Integration](#typescript-integration)
- [Troubleshooting](#troubleshooting)
- [Quick Reference](#quick-reference)
  - [Tables Quick Reference](#tables-quick-reference)
  - [RLS Policies Quick Reference](#rls-policies-quick-reference)
  - [Column Reference by Table](#column-reference-by-table)
  - [Indexes Reference](#indexes-reference)
  - [Foreign Keys Reference](#foreign-keys-reference)

---

## Database Overview

Love Ledger is a location-based anonymous matchmaking application that allows users to create "missed connection" style posts at physical locations. The database is hosted on **Supabase** (PostgreSQL) and leverages:

- **PostGIS** for geospatial queries (proximity searches)
- **Row Level Security (RLS)** for fine-grained access control
- **Automatic triggers** for timestamp management and post counts
- **JSONB** fields for flexible avatar configuration storage
- **Real-time subscriptions** for live data updates

Love Ledger uses Supabase's hosted PostgreSQL database with the following features:

| Feature | Description |
|---------|-------------|
| **PostgreSQL** | Industry-standard relational database |
| **PostGIS** | Spatial database extension for geolocation queries |
| **Row Level Security** | Fine-grained access control at the row level |
| **Real-time** | Built-in real-time subscriptions for data changes |
| **Auth Integration** | Seamless integration with Supabase Auth |

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Producer** | User who creates a post at a location (looking for someone they saw) |
| **Consumer** | User who responds to a post (believing they might be the person described) |
| **Location** | Physical place (store, gym, cafe) with GPS coordinates |
| **Conversation** | Private chat between producer and consumer about a specific post |

[↑ Back to Table of Contents](#table-of-contents)

---

## Architecture

The Love Ledger database follows a **user-centric** design with the following key characteristics:

1. **Authentication Integration**: User profiles are linked to Supabase `auth.users` via foreign key
2. **Geospatial Indexing**: Locations use PostGIS for efficient proximity queries
3. **Privacy by Design**: RLS policies ensure users can only access their own data where appropriate
4. **Automatic Maintenance**: Triggers handle `updated_at` timestamps and location post counts

### Application Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     Love Ledger App                          │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │  Next.js Client  │    │  Next.js Server Components     │ │
│  │  (Browser)       │    │  (API Routes, Server Actions)   │ │
│  └────────┬────────┘    └───────────────┬─────────────────┘ │
│           │                             │                    │
│           │ @supabase/ssr               │ @supabase/ssr      │
│           │ (anon key)                  │ (anon/service key)  │
│           │                             │                    │
└───────────┼─────────────────────────────┼────────────────────┘
            │                             │
            ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Platform                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Auth        │  │ REST API    │  │ Real-time           │  │
│  │ (GoTrue)    │  │ (PostgREST) │  │ (Phoenix Channels)  │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                    │              │
│         ▼                ▼                    ▼              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              PostgreSQL Database                         ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐  ││
│  │  │profiles │ │locations│ │ posts   │ │ conversations │  ││
│  │  └─────────┘ └─────────┘ └─────────┘ └───────────────┘  ││
│  │  ┌─────────┐ ┌─────────────────┐                        ││
│  │  │messages │ │ notifications   │     + PostGIS          ││
│  │  └─────────┘ └─────────────────┘                        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Signs Up
     │
     ▼
┌─────────────┐
│  profiles   │◄──────────────────────────────────────────────┐
└─────────────┘                                                │
     │                                                         │
     │ creates                                                 │
     ▼                                                         │
┌─────────────┐         ┌─────────────┐                       │
│    posts    │────────▶│  locations  │                       │
└─────────────┘   at    └─────────────┘                       │
     │                                                         │
     │ triggers                                                │
     ▼                                                         │
┌─────────────────┐     ┌─────────────┐                       │
│ conversations   │────▶│  messages   │                       │
└─────────────────┘     └─────────────┘                       │
     │                                                         │
     │ generates                                               │
     ▼                                                         │
┌─────────────────┐                                            │
│ notifications   │───────────────────────────────────────────┘
└─────────────────┘
```

[↑ Back to Table of Contents](#table-of-contents)

---

## Schema Overview

Love Ledger's database consists of 6 main tables. Here's a detailed breakdown of each table and their relationships.

---

## Extensions

Love Ledger uses two PostgreSQL extensions:

### PostGIS

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

**Purpose**: Enables geospatial data types and functions for location-based queries.

**Usage in Love Ledger**:
- Store location coordinates as `DOUBLE PRECISION` latitude/longitude
- Create spatial indexes using `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)`
- Perform proximity queries to find nearby posts and locations

**SRID 4326 (WGS 84)**: The standard coordinate reference system for GPS coordinates worldwide.

### uuid-ossp

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

**Purpose**: Provides functions to generate universally unique identifiers (UUIDs).

**Usage in Love Ledger**:
- Primary keys for all tables (except `profiles` which uses `auth.users.id`)
- Generated via `gen_random_uuid()` (PostgreSQL 13+ native function)

[↑ Back to Table of Contents](#table-of-contents)

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOVE LEDGER ERD                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │   auth.users    │ (Supabase Built-in)
    │─────────────────│
    │ id (PK)         │
    │ email           │
    │ ...             │
    └────────┬────────┘
             │
             │ 1:1
             ▼
    ┌─────────────────┐
    │    profiles     │
    │─────────────────│
    │ id (PK, FK)     │───────────────────────────────────────────────┐
    │ username        │                                                │
    │ avatar_config   │ JSONB                                         │
    │ bio             │                                                │
    │ created_at      │                                                │
    │ updated_at      │                                                │
    └─────────────────┘                                                │
             │                                                         │
             │ 1:N (author)                                            │
             ▼                                                         │
    ┌─────────────────┐         ┌─────────────────┐                   │
    │      posts      │         │   locations     │                   │
    │─────────────────│         │─────────────────│                   │
    │ id (PK)         │   N:1   │ id (PK)         │                   │
    │ author_id (FK)  │────────▶│ google_place_id │                   │
    │ location_id(FK) │         │ name            │                   │
    │ title           │         │ address         │                   │
    │ description     │         │ coordinates     │ PostGIS geography │
    │ target_avatar   │ JSONB   │ post_count      │                   │
    │ seen_at         │         │ created_at      │                   │
    │ expires_at      │         │ updated_at      │                   │
    │ created_at      │         └─────────────────┘                   │
    │ updated_at      │                                                │
    └─────────────────┘                                                │
             │                                                         │
             │ 1:N                                                     │
             ▼                                                         │
    ┌─────────────────┐                                                │
    │  conversations  │                                                │
    │─────────────────│                                                │
    │ id (PK)         │                                                │
    │ post_id (FK)    │                                                │
    │ initiator_id(FK)│◄───────────────────────────────────────────────┤
    │ recipient_id(FK)│◄───────────────────────────────────────────────┘
    │ created_at      │                                                
    │ updated_at      │                                                
    └─────────────────┘
             │
             │ 1:N
             ▼
    ┌─────────────────┐          ┌─────────────────┐
    │    messages     │          │  notifications  │
    │─────────────────│          │─────────────────│
    │ id (PK)         │          │ id (PK)         │
    │ conversation_id │          │ user_id (FK)    │◄── profiles.id
    │ sender_id (FK)  │◄── profiles.id             │
    │ content         │          │ type            │ 'new_message'|
    │ created_at      │          │ data (JSONB)    │ 'new_conversation'|
    │ read_at         │          │ read            │ 'response_accepted'
    └─────────────────┘          │ created_at      │
                                 └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ LEGEND                                                                       │
│                                                                              │
│  ───────▶  Foreign Key Relationship                                         │
│  1:1       One-to-One                                                        │
│  1:N       One-to-Many                                                       │
│  N:1       Many-to-One                                                       │
│  PK        Primary Key                                                       │
│  FK        Foreign Key                                                       │
│  JSONB     JSON Binary data type                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Relationship Summary

| From | To | Relationship | Description |
|------|-----|--------------|-------------|
| `profiles` | `auth.users` | 1:1 | Profile extends Supabase auth user |
| `posts` | `profiles` | N:1 | Post created by one author |
| `posts` | `locations` | N:1 | Post placed at one location |
| `conversations` | `posts` | N:1 | Conversation about one post |
| `conversations` | `profiles` (initiator) | N:1 | Conversation initiated by one user |
| `conversations` | `profiles` (recipient) | N:1 | Conversation with one post author |
| `messages` | `conversations` | N:1 | Message belongs to one conversation |
| `messages` | `profiles` | N:1 | Message sent by one user |
| `notifications` | `profiles` | N:1 | Notification belongs to one user |

[↑ Back to Table of Contents](#table-of-contents)

---

## Tables

### profiles

User profiles linked to Supabase authentication. Each profile corresponds 1:1 with a Supabase `auth.users` record.

#### Schema Definition

```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    avatar_config JSONB DEFAULT '{}'::jsonb,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

#### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | - | Primary key, references `auth.users(id)`. Created when user signs up. |
| `username` | `TEXT` | NOT NULL | - | Unique display name for the user. Used in conversations and posts. |
| `avatar_config` | `JSONB` | NULL | `'{}'` | Avataaars configuration for avatar generation. Stores customization options. |
| `bio` | `TEXT` | NULL | - | User's biography or description. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | When the profile was created (automatically set on insert). |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Last update timestamp (automatically updated via trigger). |

#### Primary Key & Foreign Key Relationship

The `profiles.id` column serves a dual purpose:

1. **Primary Key**: Uniquely identifies each profile record
2. **Foreign Key**: References `auth.users(id)` in the Supabase authentication schema

```
┌──────────────────┐         ┌──────────────────┐
│   auth.users     │         │    profiles      │
│──────────────────│   1:1   │──────────────────│
│ id (PK)      ────┼────────▶│ id (PK, FK)      │
│ email            │         │ username         │
│ created_at       │         │ avatar_config    │
└──────────────────┘         └──────────────────┘
```

**Key Characteristics:**
- `ON DELETE CASCADE`: When a user is deleted from `auth.users`, their profile is automatically deleted
- Profile must be created **after** the user signs up (cannot exist without auth.users record)
- 1:1 relationship ensures one profile per authenticated user

#### avatar_config JSONB Structure

The `avatar_config` field stores user avatar customization as a flexible JSON object. See `types/avatar.ts` for the complete TypeScript interface.

**Example Structure:**

```json
{
  "skinTone": "light",
  "hairStyle": "short",
  "hairColor": "brown",
  "eyeColor": "blue",
  "accessories": ["glasses"],
  "clothing": {
    "top": "tshirt",
    "color": "navy"
  }
}
```

**Usage Notes:**
- Schema-less: Fields can be added without database migrations
- Null-safe: Defaults to empty object `{}`
- Query via JSONB operators: `->>`, `->`, `@>`, `?`

#### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| `profiles_pkey` | `id` | B-tree (Primary) | Fast lookup by user ID |
| `profiles_username_key` | `username` | B-tree (Unique) | Enforce unique usernames, fast username lookup |

#### Constraints

| Constraint | Type | Description |
|------------|------|-------------|
| `profiles_pkey` | PRIMARY KEY | `id` is the primary key |
| `profiles_username_key` | UNIQUE | Usernames must be unique across all profiles |
| `profiles_id_fkey` | FOREIGN KEY | References `auth.users(id)` with CASCADE delete |

#### Triggers

| Trigger Name | Timing | Event | Function |
|--------------|--------|-------|----------|
| `set_profiles_updated_at` | BEFORE | UPDATE | `update_updated_at_column()` |

The trigger automatically updates `updated_at` whenever any profile column is modified.

#### Usage Examples

**Creating a profile (after user signup):**

```typescript
import { supabase } from '@/lib/supabase';

// Called after successful auth.signUp()
const { data, error } = await supabase
  .from('profiles')
  .insert({
    id: user.id,  // From auth.users
    username: 'johndoe',
    avatar_config: {
      skinTone: 'medium',
      hairStyle: 'curly'
    }
  })
  .select()
  .single();
```

**Fetching current user's profile:**

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();
```

**Updating profile:**

```typescript
const { data, error } = await supabase
  .from('profiles')
  .update({
    username: 'newusername',
    avatar_config: { skinTone: 'dark' }
  })
  .eq('id', user.id)
  .select()
  .single();
```

**SQL Example: Get a user's profile**

```sql
SELECT * FROM profiles WHERE id = 'user-uuid-here';
```

**SQL Example: Update avatar configuration**

```sql
UPDATE profiles
SET avatar_config = '{"topType": "LongHairStraight", "hairColor": "Brown"}'::jsonb
WHERE id = 'user-uuid-here';
```

---

### locations

Physical locations where missed connection posts are created. Stores location data with PostGIS geography for spatial queries.

#### Schema Definition

```sql
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    google_place_id TEXT UNIQUE NOT NULL,
    coordinates GEOGRAPHY(POINT, 4326) NOT NULL,
    post_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

#### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | Primary key (auto-generated) |
| `name` | `TEXT` | NOT NULL | - | Display name of the location |
| `address` | `TEXT` | NOT NULL | - | Full address |
| `google_place_id` | `TEXT` | NOT NULL | - | Google Places API ID for reference |
| `coordinates` | `GEOGRAPHY(POINT, 4326)` | NOT NULL | - | PostGIS point for geospatial queries |
| `post_count` | `INTEGER` | NULL | `0` | Cached count of posts at this location |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | When the location was added |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Last update timestamp |

#### Key Constraints

- Primary key on `id`
- Unique constraint on `google_place_id`
- Spatial index on `coordinates` (using GIST)
- Default value of `0` for `post_count`

#### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| `locations_pkey` | `id` | B-tree (Primary) | Fast lookup by location ID |
| `locations_google_place_id_key` | `google_place_id` | B-tree (Unique) | Ensure unique places, fast place lookup |
| `locations_coordinates_idx` | `coordinates` | GIST (Spatial) | Efficient spatial queries |

#### Usage Examples

**Find locations within 5km of a point:**

```sql
SELECT id, name, address,
       ST_Distance(coordinates, ST_Point(-122.4194, 37.7749)::geography) AS distance_meters
FROM locations
WHERE ST_DWithin(
    coordinates,
    ST_Point(-122.4194, 37.7749)::geography,
    5000  -- 5000 meters = 5km
)
ORDER BY distance_meters;
```

**Create a new location:**

```sql
INSERT INTO locations (name, address, google_place_id, coordinates)
VALUES (
    'Philz Coffee',
    '3101 24th St, San Francisco, CA 94110',
    'ChIJxxxxxxxxxxxxxxxx',
    ST_Point(-122.4132, 37.7527)::geography
);
```

**TypeScript Example: Create a location**

```typescript
const { data, error } = await supabase
  .from('locations')
  .insert({
    name: 'Coffee Shop',
    address: '123 Main St',
    google_place_id: 'ChIJ...',
    coordinates: {
      type: 'Point',
      coordinates: [-122.4132, 37.7527]
    }
  })
  .select()
  .single();
```

---

### posts

The main content table for missed connection posts.

#### Schema Definition

```sql
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_avatar JSONB,
    seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

#### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | Primary key (auto-generated) |
| `author_id` | `UUID` | NOT NULL | - | Foreign key to `profiles(id)` |
| `location_id` | `UUID` | NULL | - | Foreign key to `locations(id)` |
| `title` | `TEXT` | NOT NULL | - | Post title/headline |
| `description` | `TEXT` | NOT NULL | - | Full description of the missed connection |
| `target_avatar` | `JSONB` | NULL | - | Avataaars config describing the person they saw |
| `seen_at` | `TIMESTAMPTZ` | NOT NULL | - | When the person was seen |
| `expires_at` | `TIMESTAMPTZ` | NULL | - | Optional expiration date |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | When the post was created |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Last update timestamp |

#### Key Constraints

- Primary key on `id`
- Foreign key to `profiles(id)` with `ON DELETE CASCADE`
- Foreign key to `locations(id)` with `ON DELETE SET NULL`
- Index on `author_id` for user's posts queries
- Index on `location_id` for location-based queries
- Trigger to update `locations.post_count` on insert/delete

#### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| `posts_pkey` | `id` | B-tree (Primary) | Fast lookup by post ID |
| `posts_author_id_idx` | `author_id` | B-tree | Find posts by user |
| `posts_location_id_idx` | `location_id` | B-tree | Find posts at location |

#### Usage Examples

**Get posts near a location:**

```sql
SELECT p.*, l.name AS location_name, pr.username AS author_username
FROM posts p
JOIN locations l ON p.location_id = l.id
JOIN profiles pr ON p.author_id = pr.id
WHERE ST_DWithin(
    l.coordinates,
    ST_Point(-122.4194, 37.7749)::geography,
    10000  -- 10km radius
)
ORDER BY p.created_at DESC
LIMIT 20;
```

**Create a new post:**

```typescript
const { data, error } = await supabase
  .from('posts')
  .insert({
    author_id: userId,
    location_id: locationId,
    title: 'Looking for someone I saw at the coffee shop',
    description: 'You were wearing a blue jacket...',
    target_avatar: { hairColor: 'brown', ... },
    seen_at: new Date()
  })
  .select()
  .single();
```

---

### conversations

Links two users in a conversation about a post.

#### Schema Definition

```sql
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    initiator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

#### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | Primary key (auto-generated) |
| `post_id` | `UUID` | NOT NULL | - | Foreign key to `posts(id)` |
| `initiator_id` | `UUID` | NOT NULL | - | User who started the conversation |
| `recipient_id` | `UUID` | NOT NULL | - | User receiving the message (post author) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | When the conversation started |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Last activity timestamp |

#### Key Constraints

- Primary key on `id`
- Foreign keys to `posts`, `profiles` (initiator and recipient)
- Unique constraint on `(post_id, initiator_id)` - one conversation per post per user
- Trigger to update `updated_at` on new messages

---

### messages

Stores individual messages within conversations.

#### Schema Definition

```sql
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE
);
```

#### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | Primary key (auto-generated) |
| `conversation_id` | `UUID` | NOT NULL | - | Foreign key to `conversations(id)` |
| `sender_id` | `UUID` | NOT NULL | - | Foreign key to `profiles(id)` |
| `content` | `TEXT` | NOT NULL | - | Message content |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | When the message was sent |
| `read_at` | `TIMESTAMPTZ` | NULL | - | When the message was read (null if unread) |

#### Key Constraints

- Primary key on `id`
- Foreign keys to `conversations` and `profiles`
- Index on `conversation_id` for efficient message retrieval

#### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| `messages_pkey` | `id` | B-tree (Primary) | Fast lookup by message ID |
| `messages_conversation_id_idx` | `conversation_id` | B-tree | Find messages in conversation |

---

### notifications

Stores notifications for various events.

#### Schema Definition

```sql
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

#### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | Primary key (auto-generated) |
| `user_id` | `UUID` | NOT NULL | - | Foreign key to `profiles(id)` |
| `type` | `TEXT` | NOT NULL | - | Notification type (e.g., 'new_message', 'new_conversation') |
| `data` | `JSONB` | NULL | - | Type-specific notification data |
| `read` | `BOOLEAN` | NULL | `FALSE` | Whether the notification has been read |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | When the notification was created |

#### Key Constraints

- Primary key on `id`
- Foreign key to `profiles(id)` with `ON DELETE CASCADE`
- Index on `(user_id, read)` for unread notifications query

#### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| `notifications_pkey` | `id` | B-tree (Primary) | Fast lookup by notification ID |
| `notifications_user_id_read_idx` | `(user_id, read)` | B-tree | Find unread notifications |

[↑ Back to Table of Contents](#table-of-contents)

---

## Row Level Security (RLS)

Row Level Security (RLS) is a PostgreSQL feature that restricts database access at the row level based on policies. Love Ledger uses RLS to ensure users can only access their own data and data they have permission to view.

### Love Ledger Security Model

The security model is based on three key principles:

1. **User Isolation**: Users can only see their own profiles and conversations
2. **Public Data**: Posts and locations are readable by all authenticated users (for discovery)
3. **Private Communication**: Only conversation participants can view and send messages

### Authentication Context (auth.uid)

RLS policies use `auth.uid()` to identify the current user. This function returns the UUID of the authenticated user making the request.

```sql
-- Example: Check if current user matches a user_id
auth.uid() = user_id
```

### Policy Types and Clauses

**USING Clause**: Applied when reading data (SELECT)
**WITH CHECK Clause**: Applied when writing data (INSERT, UPDATE, DELETE)

---

## Functions and Triggers

Functions and triggers maintain data integrity and consistency:

1. **update_updated_at_column()**: Automatically updates `updated_at` timestamp
2. **update_location_post_count()**: Updates post count when posts are created/deleted
3. **create_notification()**: Creates notifications when conversations are initiated

---

## PostGIS Extension Setup

Love Ledger uses the PostGIS extension for geospatial features like finding nearby locations and calculating distances.

### Why PostGIS?

PostGIS adds geographic object support to PostgreSQL, enabling:

- **Spatial queries**: Find locations within a radius
- **Distance calculations**: Calculate distance between two points
- **Geographic indexing**: Fast spatial lookups using GIST indexes
- **Standard compliance**: Uses industry-standard geography types

### Enabling PostGIS

You must enable PostGIS before running migrations. There are two methods:

#### Method 1: SQL Editor (Recommended for Supabase Cloud)

1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** in the sidebar
4. Click **New query**
5. Run the following SQL:

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
```

6. Click **Run**
7. You should see: "Success. No rows returned"

#### Method 2: Using Supabase CLI (Local Development)

For local development with Supabase CLI:

```bash
# In your SQL migrations folder, create a new migration
supabase migration new enable_postgis

# Then add this to the generated migration file:
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Verify PostGIS is Enabled

```sql
-- Check if PostGIS is installed
SELECT * FROM pg_extension WHERE extname = 'postgis';

-- You should see a row with name 'postgis' if enabled
```

---

## Running Migrations

Migrations manage database schema changes and should be run during setup and development.

### Local Development

With Supabase CLI:

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Create a new migration
supabase migration new <name>
```

### Production (Supabase Cloud)

Migrations are automatically applied when you push to your repository (if CI/CD is configured). You can also manually run SQL in the SQL Editor.

[↑ Back to Table of Contents](#table-of-contents)

---

## Local Development with Supabase CLI

Setting up a local PostgreSQL database for development:

### Installation

```bash
# Install Supabase CLI
npm install -g supabase

# Authenticate with your Supabase account
supabase login
```

### Initialize Project

```bash
# In your project root
supabase init

# This creates a 'supabase' directory with migrations and config
```

### Start Local Database

```bash
# Start local Supabase stack (PostgreSQL, Auth, etc.)
supabase start

# This starts Docker containers for your local database
# Output shows connection details
```

### Common Commands

```bash
# View logs
supabase logs

# Stop services
supabase stop

# Reset database
supabase db reset

# Pull schema from cloud
supabase db pull

# Push migrations to cloud
supabase db push
```

---

## Database Best Practices

Follow these best practices when working with Love Ledger database:

### 1. Always Use Prepared Statements

Prevent SQL injection by using parameterized queries:

```typescript
// ✅ Good
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId);

// ❌ Avoid string concatenation
// const query = `SELECT * FROM profiles WHERE id = '${userId}'`;
```

### 2. Leverage RLS Policies

RLS automatically filters data based on user context. You don't need manual permission checks:

```typescript
// ✅ Good - RLS handles authorization
const { data } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId);

// ❌ Don't manually check permissions for RLS-protected tables
```

### 3. Use Indexes for Performance

Indexes speed up queries on frequently filtered columns:

- `profiles(username)` - for username lookups
- `posts(author_id)` - for user's posts
- `locations(coordinates)` - for spatial queries

### 4. Handle PostGIS Coordinates Correctly

Always use the correct format:

```typescript
// ✅ Correct: Use GeoJSON format with [longitude, latitude]
{
  type: 'Point',
  coordinates: [-122.4194, 37.7749]  // [lng, lat]
}

// ❌ Avoid: [latitude, longitude] order
// [37.7749, -122.4194]
```

### 5. Implement Error Handling

Always handle potential database errors:

```typescript
const { data, error } = await supabase
  .from('posts')
  .insert(postData);

if (error) {
  console.error('Database error:', error.message);
  // Handle error appropriately
}
```

### 6. Use Transactions for Related Operations

For operations affecting multiple tables, use transactions:

```typescript
// Create post and update location count atomically
const { data, error } = await supabase.rpc('create_post_with_location', {
  author_id: userId,
  location_id: locationId,
  // ... other fields
});
```

---

## Common Database Operations

### User Registration

1. User signs up via Supabase Auth
2. Profile is created in `profiles` table
3. Profile inherits RLS permissions

```typescript
// After auth.signUp()
const { data: profile } = await supabase
  .from('profiles')
  .insert({
    id: user.id,
    username: formData.username,
    avatar_config: formData.avatarConfig
  })
  .select()
  .single();
```

### Creating a Post

```typescript
const { data: post } = await supabase
  .from('posts')
  .insert({
    author_id: userId,
    location_id: selectedLocation.id,
    title: formData.title,
    description: formData.description,
    target_avatar: formData.targetAvatar,
    seen_at: formData.seenAt
  })
  .select()
  .single();
```

### Finding Posts Near User

```typescript
// Get user's coordinates, then query
const { data: nearbyPosts } = await supabase
  .from('posts')
  .select(`
    *,
    locations(name, address, coordinates),
    profiles(username, avatar_config)
  `)
  .order('created_at', { ascending: false })
  .limit(20);
```

### Messaging

```typescript
// Send a message
const { data: message } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    sender_id: userId,
    content: messageText
  })
  .select()
  .single();

// Mark as read
await supabase
  .from('messages')
  .update({ read_at: new Date() })
  .eq('id', messageId);
```

---

## Troubleshooting

### Common Issues and Solutions

#### "PostGIS extension not found"

**Cause**: PostGIS hasn't been enabled

**Solution**: Run the PostGIS setup SQL:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

#### "Permission denied" errors in RLS

**Cause**: RLS policy is too restrictive or user authentication failed

**Solution**:
1. Check that user is authenticated: `auth.uid()` is not null
2. Review RLS policies in SQL Editor
3. Verify the policy logic matches your use case

#### "Unique constraint violation"

**Cause**: Attempted to insert duplicate value in unique column

**Solution**: Check existing data before insert, use `ON CONFLICT` clause:
```sql
INSERT INTO locations (google_place_id, ...)
VALUES (...)
ON CONFLICT (google_place_id) DO UPDATE SET ...;
```

#### Slow spatial queries

**Cause**: Missing spatial index on coordinates

**Solution**: Ensure GIST index exists:
```sql
CREATE INDEX IF NOT EXISTS idx_locations_coordinates 
ON locations USING GIST (coordinates);
```

#### Local database won't start

**Cause**: Docker not running or port already in use

**Solution**:
```bash
# Ensure Docker is running
docker ps

# Check logs
supabase logs

# Reset if needed
supabase stop
supabase start
```

---

## TypeScript Integration

Love Ledger uses TypeScript types generated from the Supabase schema:

```typescript
import { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Post = Database['public']['Tables']['posts']['Row'];

const getProfile = async (id: string): Promise<Profile | null> => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  return data;
};
```

Generate types:

```bash
supabase gen types typescript --project-id <project-id> > lib/database.types.ts
```

---

## Quick Reference

### Tables Quick Reference

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `profiles` | User info | id, username, avatar_config |
| `locations` | Physical places | id, name, coordinates |
| `posts` | Missed connections | id, author_id, location_id |
| `conversations` | User chats | id, post_id, initiator_id |
| `messages` | Chat messages | id, conversation_id, content |
| `notifications` | User alerts | id, user_id, type |

### RLS Policies Quick Reference

| Table | Policy | Effect |
|-------|--------|--------|
| `profiles` | SELECT - all can read | Users can view all profiles |
| `profiles` | UPDATE - self only | Users can update own profile |
| `messages` | SELECT - participants only | Only conversation members can read |
| `messages` | INSERT - conversation members only | Only members can send messages |

### Column Reference by Table

See individual table sections above for complete column references.

### Indexes Reference

| Table | Index | Type |
|-------|-------|------|
| `profiles` | username | Unique |
| `locations` | coordinates | GIST (Spatial) |
| `posts` | author_id | B-tree |
| `messages` | conversation_id | B-tree |
| `notifications` | (user_id, read) | B-tree |

### Foreign Keys Reference

| From | To | On Delete | Description |
|------|-----|-----------|-------------|
| `profiles.id` | `auth.users.id` | CASCADE | Profile deleted with user |
| `posts.author_id` | `profiles.id` | CASCADE | Posts deleted with user |
| `posts.location_id` | `locations.id` | SET NULL | Location can be deleted safely |
| `conversations.post_id` | `posts.id` | CASCADE | Conversations deleted with post |
| `messages.conversation_id` | `conversations.id` | CASCADE | Messages deleted with conversation |
| `notifications.user_id` | `profiles.id` | CASCADE | Notifications deleted with user |

[↑ Back to Table of Contents](#table-of-contents)