# Love Ledger Database Documentation

Comprehensive documentation for the Love Ledger Supabase database schema, including tables, relationships, Row Level Security (RLS) policies, triggers, and TypeScript integration.

---

## Table of Contents

- [Overview](#overview)
- [Database Architecture](#database-architecture)
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
- [TypeScript Integration](#typescript-integration)
- [Quick Reference](#quick-reference)
  - [Tables Quick Reference](#tables-quick-reference)
  - [RLS Policies Quick Reference](#rls-policies-quick-reference)
  - [Column Reference by Table](#column-reference-by-table)
  - [Indexes Reference](#indexes-reference)
  - [Foreign Keys Reference](#foreign-keys-reference)

---

## Overview

Love Ledger is a location-based anonymous matchmaking application that allows users to create "missed connection" style posts at physical locations. The database is hosted on **Supabase** (PostgreSQL) and leverages:

- **PostGIS** for geospatial queries (proximity searches)
- **Row Level Security (RLS)** for fine-grained access control
- **Automatic triggers** for timestamp management and post counts
- **JSONB** fields for flexible avatar configuration storage

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Producer** | User who creates a post at a location (looking for someone they saw) |
| **Consumer** | User who responds to a post (believing they might be the person described) |
| **Location** | Physical place (store, gym, cafe) with GPS coordinates |
| **Conversation** | Private chat between producer and consumer about a specific post |

[↑ Back to Table of Contents](#table-of-contents)

---

## Database Architecture

The Love Ledger database follows a **user-centric** design with the following key characteristics:

1. **Authentication Integration**: User profiles are linked to Supabase `auth.users` via foreign key
2. **Geospatial Indexing**: Locations use PostGIS for efficient proximity queries
3. **Privacy by Design**: RLS policies ensure users can only access their own data where appropriate
4. **Automatic Maintenance**: Triggers handle `updated_at` timestamps and location post counts

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
    │ created_at      │                                                │
    │ updated_at      │                                                │
    └─────────────────┘                                                │
             │                                                         │
             │ 1:N (producer)                                          │
             ▼                                                         │
    ┌─────────────────┐         ┌─────────────────┐                   │
    │      posts      │         │   locations     │                   │
    │─────────────────│         │─────────────────│                   │
    │ id (PK)         │   N:1   │ id (PK)         │                   │
    │ producer_id(FK) │────────▶│ google_place_id │                   │
    │ location_id(FK) │         │ name            │                   │
    │ selfie_url      │         │ address         │                   │
    │ target_avatar   │ JSONB   │ latitude        │                   │
    │ target_desc     │         │ longitude       │ PostGIS Index     │
    │ message         │         │ place_types     │ TEXT[]            │
    │ seen_at         │         │ post_count      │                   │
    │ is_active       │         │ created_at      │                   │
    │ created_at      │         └─────────────────┘                   │
    │ expires_at      │                                                │
    └─────────────────┘                                                │
             │                                                         │
             │ 1:N                                                     │
             ▼                                                         │
    ┌─────────────────┐                                                │
    │  conversations  │                                                │
    │─────────────────│                                                │
    │ id (PK)         │                                                │
    │ post_id (FK)    │                                                │
    │ producer_id(FK) │◄───────────────────────────────────────────────┤
    │ consumer_id(FK) │◄───────────────────────────────────────────────┘
    │ status          │ 'pending'|'active'|'declined'|'blocked'
    │ producer_accept │
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
    │ content         │          │ type            │ 'new_response'|
    │ is_read         │          │ reference_id    │ 'new_message'|
    │ created_at      │          │ is_read         │ 'response_accepted'
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
| `posts` | `profiles` | N:1 | Post created by one producer |
| `posts` | `locations` | N:1 | Post placed at one location |
| `conversations` | `posts` | N:1 | Conversation about one post |
| `conversations` | `profiles` (producer) | N:1 | Conversation has one producer |
| `conversations` | `profiles` (consumer) | N:1 | Conversation has one consumer |
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

#### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | - | Primary key, references `auth.users(id)`. Created when user signs up. |
| `username` | `TEXT` | NOT NULL | - | Unique display name for the user. Used in conversations and posts. |
| `avatar_config` | `JSONB` | NULL | `'{}'` | Configuration for the user's avatar. Stores customization options. |
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
    avatar_config: { ...profile.avatar_config, hairColor: 'black' }
  })
  .eq('id', user.id)
  .select()
  .single();
```

**Checking if username exists:**

```typescript
const { data } = await supabase
  .from('profiles')
  .select('id')
  .eq('username', 'desired_username')
  .single();

const usernameAvailable = !data;
```

**Querying avatar configuration with JSONB:**

```sql
-- Find users with glasses
SELECT * FROM profiles
WHERE avatar_config->'accessories' ? 'glasses';

-- Find users with brown hair
SELECT * FROM profiles
WHERE avatar_config->>'hairColor' = 'brown';
```

---

### locations

Physical locations where "missed connection" posts can be created. Locations are integrated with Google Places API and use PostGIS for efficient geospatial queries.

#### Schema Definition

```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  place_types TEXT[],
  post_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- PostGIS geospatial index for proximity queries
CREATE INDEX locations_geo_idx ON locations USING GIST (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);
```

#### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | Primary key. Auto-generated UUID. |
| `google_place_id` | `TEXT` | NOT NULL | - | Unique identifier from Google Places API. Used for deduplication. |
| `name` | `TEXT` | NOT NULL | - | Display name of the location (e.g., "Starbucks", "24 Hour Fitness"). |
| `address` | `TEXT` | NULL | - | Formatted street address from Google Places. |
| `latitude` | `DOUBLE PRECISION` | NOT NULL | - | GPS latitude coordinate (-90 to 90). |
| `longitude` | `DOUBLE PRECISION` | NOT NULL | - | GPS longitude coordinate (-180 to 180). |
| `place_types` | `TEXT[]` | NULL | - | Array of Google Places types (e.g., `['gym', 'fitness_center']`). |
| `post_count` | `INTEGER` | NOT NULL | `0` | Cached count of active posts at this location. Managed via triggers. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | When the location was first added to the database. |

#### Google Places API Integration

The `locations` table is designed to integrate seamlessly with the [Google Places API](https://developers.google.com/maps/documentation/places/web-service/overview):

```
┌──────────────────────┐         ┌──────────────────────┐
│   Google Places API  │         │     locations        │
│──────────────────────│         │──────────────────────│
│ place_id         ────┼────────▶│ google_place_id      │
│ name             ────┼────────▶│ name                 │
│ formatted_address ───┼────────▶│ address              │
│ geometry.location ───┼────────▶│ latitude, longitude  │
│ types            ────┼────────▶│ place_types          │
└──────────────────────┘         └──────────────────────┘
```

**Key Integration Points:**

1. **`google_place_id`**: Unique identifier from Google's Place Search or Place Details API
   - Used to prevent duplicate location entries
   - Enables fetching updated place details from Google
   - Stable across API calls (unlike `place_id` which may change)

2. **`place_types`**: Array of place type tags from Google
   - Examples: `['gym', 'health']`, `['cafe', 'restaurant']`, `['supermarket', 'store']`
   - Used for filtering and categorization in the UI
   - Multiple types per location are common

#### PostGIS Geospatial Indexing

The locations table uses **PostGIS** with **SRID 4326 (WGS 84)** for efficient proximity queries.

##### What is SRID 4326?

**SRID 4326** (Spatial Reference Identifier 4326) refers to **WGS 84** (World Geodetic System 1984):
- Standard coordinate system for GPS worldwide
- Uses latitude/longitude in degrees
- The same system used by Google Maps, Apple Maps, and mobile device GPS

##### Geospatial Index

```sql
CREATE INDEX locations_geo_idx ON locations USING GIST (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);
```

**Index Breakdown:**
- `GIST`: Generalized Search Tree index type, optimized for spatial data
- `ST_MakePoint(longitude, latitude)`: Creates a PostGIS point geometry
- `ST_SetSRID(..., 4326)`: Assigns the WGS 84 coordinate reference system
- **Important**: Note that `longitude` comes BEFORE `latitude` in PostGIS functions

##### Proximity Query Examples

**Find locations within a radius (in meters):**

```sql
-- Find locations within 1km of a point
SELECT id, name, address,
       ST_Distance(
         ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
         ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography
       ) AS distance_meters
FROM locations
WHERE ST_DWithin(
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
  ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography,
  1000  -- radius in meters
)
ORDER BY distance_meters;
```

**TypeScript usage with Supabase:**

```typescript
import { supabase } from '@/lib/supabase';

// Using a database function for proximity queries
const { data: nearbyLocations, error } = await supabase
  .rpc('get_nearby_locations', {
    user_lat: 37.7749,
    user_lng: -122.4194,
    radius_meters: 1000
  });
```

**Find the nearest N locations:**

```sql
-- Find the 10 nearest locations to a user's position
SELECT id, name, address,
       ST_Distance(
         ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
         ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography
       ) AS distance_meters
FROM locations
ORDER BY ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography <->
         ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography
LIMIT 10;
```

**Find locations by type within radius:**

```sql
-- Find all gyms within 5km
SELECT id, name, address, place_types
FROM locations
WHERE 'gym' = ANY(place_types)
  AND ST_DWithin(
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
    ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography,
    5000
  );
```

#### post_count Counter Cache

The `post_count` column is a **denormalized counter** that tracks the number of posts at each location. This is managed automatically via database triggers.

```
┌──────────────┐    INSERT    ┌─────────────────────────────────┐
│    posts     │─────────────▶│ posts_increment_location_count  │
└──────────────┘              └─────────────────────────────────┘
       │                                      │
       │                                      ▼
       │                          ┌───────────────────┐
       │                          │ locations.post_count += 1 │
       │                          └───────────────────┘
       │
       │              DELETE      ┌─────────────────────────────────┐
       └─────────────────────────▶│ posts_decrement_location_count  │
                                  └─────────────────────────────────┘
                                              │
                                              ▼
                                  ┌───────────────────┐
                                  │ locations.post_count -= 1 │
                                  └───────────────────┘
```

**Why use a counter cache?**
- Avoids expensive `COUNT(*)` queries on the `posts` table
- Enables fast sorting by popularity: `ORDER BY post_count DESC`
- Instantly available for UI display without subqueries

**Trigger Implementation:**

```sql
-- Increment on post insert
CREATE TRIGGER posts_increment_location_count
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION increment_location_post_count();

-- Decrement on post delete
CREATE TRIGGER posts_decrement_location_count
  AFTER DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION decrement_location_post_count();
```

**Note**: The counter uses `GREATEST(post_count - 1, 0)` to prevent negative values.

#### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| `locations_pkey` | `id` | B-tree (Primary) | Fast lookup by location ID |
| `locations_google_place_id_idx` | `google_place_id` | B-tree (Unique) | Prevent duplicate places, fast place ID lookup |
| `locations_geo_idx` | `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)` | GIST (Spatial) | Efficient proximity/radius queries |
| `locations_name_idx` | `name` | B-tree | Fast name search |
| `locations_post_count_idx` | `post_count DESC` | B-tree | Fast popularity sorting |

#### Constraints

| Constraint | Type | Description |
|------------|------|-------------|
| `locations_pkey` | PRIMARY KEY | `id` is the primary key |
| `locations_google_place_id_key` | UNIQUE | Each Google Place ID can only appear once |

#### Usage Examples

**Creating a new location (from Google Places):**

```typescript
import { supabase } from '@/lib/supabase';
import type { LocationInsert } from '@/types/database';

const googlePlace = await fetchPlaceDetails(placeId);

const newLocation: LocationInsert = {
  google_place_id: googlePlace.place_id,
  name: googlePlace.name,
  address: googlePlace.formatted_address,
  latitude: googlePlace.geometry.location.lat,
  longitude: googlePlace.geometry.location.lng,
  place_types: googlePlace.types
};

const { data, error } = await supabase
  .from('locations')
  .upsert(newLocation, {
    onConflict: 'google_place_id'  // Update if exists
  })
  .select()
  .single();
```

**Finding or creating a location:**

```typescript
async function findOrCreateLocation(googlePlace: GooglePlace): Promise<Location> {
  // First, try to find existing location
  const { data: existing } = await supabase
    .from('locations')
    .select('*')
    .eq('google_place_id', googlePlace.place_id)
    .single();

  if (existing) return existing;

  // Create new location
  const { data: created, error } = await supabase
    .from('locations')
    .insert({
      google_place_id: googlePlace.place_id,
      name: googlePlace.name,
      address: googlePlace.formatted_address,
      latitude: googlePlace.geometry.location.lat,
      longitude: googlePlace.geometry.location.lng,
      place_types: googlePlace.types
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}
```

**Fetching popular locations:**

```typescript
// Get locations sorted by post count
const { data: popularLocations } = await supabase
  .from('locations')
  .select('*')
  .order('post_count', { ascending: false })
  .limit(20);
```

**Filtering locations by type:**

```typescript
// Find all coffee shops
const { data: coffeeShops } = await supabase
  .from('locations')
  .select('*')
  .contains('place_types', ['cafe']);
```

**SQL query for filtering by place type:**

```sql
-- Find all gyms and fitness centers
SELECT * FROM locations
WHERE place_types && ARRAY['gym', 'fitness_center'];

-- Find locations that are exactly a cafe (contains check)
SELECT * FROM locations
WHERE 'cafe' = ANY(place_types);
```

---

### posts

"Missed connection" posts created by users at specific locations. Each post describes someone the user saw and wants to reconnect with, including a description, an avatar representation of the person, and optionally a selfie of the poster.

#### Schema Definition

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  selfie_url TEXT,
  target_avatar JSONB DEFAULT '{}'::jsonb,
  target_description TEXT NOT NULL,
  message TEXT NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days') NOT NULL
);
```

#### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | Primary key. Auto-generated unique identifier for the post. |
| `producer_id` | `UUID` | NOT NULL | - | Foreign key to `profiles(id)`. The user who created this post (the "producer"). |
| `location_id` | `UUID` | NOT NULL | - | Foreign key to `locations(id)`. The physical location where the missed connection occurred. |
| `selfie_url` | `TEXT` | NULL | - | URL to the producer's selfie in Supabase Storage. Optional verification photo. |
| `target_avatar` | `JSONB` | NULL | `'{}'` | Avatar configuration describing the person the producer is looking for. |
| `target_description` | `TEXT` | NOT NULL | - | Freeform text description of the person (what they were wearing, doing, etc.). |
| `message` | `TEXT` | NOT NULL | - | The message/context the producer wants to share (why they want to connect). |
| `seen_at` | `TIMESTAMPTZ` | NOT NULL | - | When the producer saw the person at the location. User-provided timestamp. |
| `is_active` | `BOOLEAN` | NOT NULL | `true` | Whether the post is active and visible to other users. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | When the post was created in the database. |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | `NOW() + 30 days` | When the post automatically expires. Defaults to 30 days from creation. |

#### Producer Relationship

The `producer_id` column establishes a **many-to-one** relationship with the `profiles` table:

```
┌──────────────────┐         ┌──────────────────┐
│    profiles      │         │      posts       │
│──────────────────│   1:N   │──────────────────│
│ id (PK)      ◄───┼─────────│ producer_id (FK) │
│ username         │         │ ...              │
│ avatar_config    │         │                  │
└──────────────────┘         └──────────────────┘
```

**Key Characteristics:**
- `ON DELETE CASCADE`: When a user's profile is deleted, all their posts are automatically deleted
- Each post has exactly one producer (the user who created it)
- A user (producer) can create many posts
- The producer is the only user who can edit or delete the post

#### Location Relationship

The `location_id` column establishes a **many-to-one** relationship with the `locations` table:

```
┌──────────────────┐         ┌──────────────────┐
│    locations     │         │      posts       │
│──────────────────│   1:N   │──────────────────│
│ id (PK)      ◄───┼─────────│ location_id (FK) │
│ name             │         │ ...              │
│ latitude         │         │                  │
│ longitude        │         │                  │
└──────────────────┘         └──────────────────┘
```

**Key Characteristics:**
- `ON DELETE CASCADE`: If a location is removed, associated posts are deleted
- Each post is tied to exactly one physical location
- Multiple posts can reference the same location
- Location's `post_count` is automatically updated via triggers when posts are added/removed

#### target_avatar JSONB Structure

The `target_avatar` field stores a description of the person the producer is looking for as a flexible JSON object. This mirrors the structure of `profiles.avatar_config`.

**Example Structure:**

```json
{
  "skinTone": "medium",
  "hairStyle": "long",
  "hairColor": "black",
  "eyeColor": "brown",
  "height": "tall",
  "build": "athletic",
  "accessories": ["sunglasses", "hat"],
  "clothing": {
    "top": "hoodie",
    "color": "red"
  }
}
```

**Usage Notes:**
- Schema-less: Fields can vary per post based on what the producer remembers
- Defaults to empty object `{}`
- Used to render an avatar of the target person in the UI
- Can be queried using PostgreSQL JSONB operators

**Querying target_avatar:**

```sql
-- Find posts looking for someone with glasses
SELECT * FROM posts
WHERE target_avatar->'accessories' ? 'glasses';

-- Find posts looking for someone with brown hair
SELECT * FROM posts
WHERE target_avatar->>'hairColor' = 'brown';
```

#### Selfie Storage

The `selfie_url` column stores a reference to an optional selfie photo uploaded by the producer.

**Storage Architecture:**

```
┌──────────────────┐         ┌──────────────────┐
│      posts       │         │ Supabase Storage │
│──────────────────│         │──────────────────│
│ selfie_url   ────┼────────▶│ /posts/selfies/  │
│                  │         │   {uuid}.jpg     │
└──────────────────┘         └──────────────────┘
```

**Key Points:**
- Stored in Supabase Storage bucket (not in the database directly)
- URL format: `https://{project}.supabase.co/storage/v1/object/public/posts/selfies/{filename}`
- NULL when producer chooses not to include a selfie
- Helps consumers verify they might know the producer
- Storage bucket should have appropriate RLS policies for privacy

**TypeScript Upload Pattern:**

```typescript
import { supabase } from '@/lib/supabase';

async function uploadSelfie(postId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${postId}.${fileExt}`;
  const filePath = `selfies/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('posts')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('posts')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
```

#### Expiration Logic

Posts have a built-in expiration mechanism to keep content fresh and relevant:

```
┌─────────────────────────────────────────────────────────────────┐
│                    POST LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  created_at                              expires_at              │
│      │                                       │                   │
│      ▼                                       ▼                   │
│      ├───────────── 30 days ─────────────────┤                  │
│      │                                       │                   │
│      │◄────── is_active = true ──────────────┤                  │
│                                              │                   │
│                                   Post no longer visible         │
│                                   in public searches             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Default Expiration:**
- Posts expire **30 days** after creation by default
- Calculated as: `NOW() + INTERVAL '30 days'`
- Stored in the `expires_at` column

**Active Status:**
- `is_active = true`: Post is visible in searches and feeds
- `is_active = false`: Post is hidden (manually deactivated or matched)
- Producers can always see their own posts regardless of `is_active` status

**Querying Active Posts:**

```sql
-- Find all active, non-expired posts at a location
SELECT * FROM posts
WHERE location_id = $1
  AND is_active = true
  AND expires_at > NOW()
ORDER BY created_at DESC;

-- Find posts expiring in the next 7 days (for reminder notifications)
SELECT * FROM posts
WHERE is_active = true
  AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days';
```

**TypeScript Usage:**

```typescript
// Fetch active posts at a location
const { data: activePosts } = await supabase
  .from('posts')
  .select('*, location:locations(*), producer:profiles(username, avatar_config)')
  .eq('location_id', locationId)
  .eq('is_active', true)
  .gt('expires_at', new Date().toISOString())
  .order('created_at', { ascending: false });
```

#### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| `posts_pkey` | `id` | B-tree (Primary) | Fast lookup by post ID |
| `posts_producer_id_idx` | `producer_id` | B-tree | Fast lookup of posts by producer |
| `posts_location_id_idx` | `location_id` | B-tree | Fast lookup of posts at a location |
| `posts_is_active_idx` | `is_active` | B-tree | Efficient filtering of active posts |
| `posts_expires_at_idx` | `expires_at` | B-tree | Efficient expiration queries |
| `posts_created_at_idx` | `created_at DESC` | B-tree | Fast sorting by creation date |

#### Constraints

| Constraint | Type | Description |
|------------|------|-------------|
| `posts_pkey` | PRIMARY KEY | `id` is the primary key |
| `posts_producer_id_fkey` | FOREIGN KEY | References `profiles(id)` with CASCADE delete |
| `posts_location_id_fkey` | FOREIGN KEY | References `locations(id)` with CASCADE delete |

#### Triggers

| Trigger Name | Timing | Event | Function |
|--------------|--------|-------|----------|
| `posts_increment_location_count` | AFTER | INSERT | `increment_location_post_count()` |
| `posts_decrement_location_count` | AFTER | DELETE | `decrement_location_post_count()` |

These triggers automatically maintain the `locations.post_count` counter cache.

#### Usage Examples

**Creating a new post:**

```typescript
import { supabase } from '@/lib/supabase';
import type { PostInsert } from '@/types/database';

const newPost: PostInsert = {
  producer_id: user.id,
  location_id: selectedLocation.id,
  target_description: 'Wearing a red jacket, reading a book at the corner table',
  target_avatar: {
    hairColor: 'brown',
    accessories: ['glasses']
  },
  message: 'You smiled at me when I walked in. Would love to chat!',
  seen_at: new Date('2024-01-15T14:30:00Z').toISOString(),
  selfie_url: null  // Optional
};

const { data: post, error } = await supabase
  .from('posts')
  .insert(newPost)
  .select('*, location:locations(*)')
  .single();
```

**Fetching posts at a location:**

```typescript
// Get active posts at a specific location
const { data: posts, error } = await supabase
  .from('posts')
  .select(`
    *,
    location:locations(id, name, address),
    producer:profiles(id, username, avatar_config)
  `)
  .eq('location_id', locationId)
  .eq('is_active', true)
  .gt('expires_at', new Date().toISOString())
  .order('seen_at', { ascending: false });
```

**Fetching a user's own posts:**

```typescript
// Get all posts by the current user (including inactive)
const { data: myPosts, error } = await supabase
  .from('posts')
  .select('*, location:locations(name, address)')
  .eq('producer_id', user.id)
  .order('created_at', { ascending: false });
```

**Deactivating a post:**

```typescript
// Deactivate a post (e.g., after successful match)
const { error } = await supabase
  .from('posts')
  .update({ is_active: false })
  .eq('id', postId)
  .eq('producer_id', user.id);  // Ensure user owns the post
```

**Extending post expiration:**

```typescript
// Extend post expiration by another 30 days
const { error } = await supabase
  .from('posts')
  .update({
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  })
  .eq('id', postId)
  .eq('producer_id', user.id);
```

**Finding nearby posts (using RPC function):**

```typescript
// Using a database function for proximity-based post search
const { data: nearbyPosts, error } = await supabase
  .rpc('get_nearby_posts', {
    user_lat: 37.7749,
    user_lng: -122.4194,
    radius_meters: 5000,
    limit_count: 20
  });
```

---

### conversations

Private conversation threads between post producers and consumers. When someone (a "consumer") responds to a post, a conversation is created linking them to the post's creator (the "producer").

#### Schema Definition

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  producer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  consumer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  producer_accepted BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Prevent duplicate responses to the same post by the same consumer
  CONSTRAINT conversations_unique_response UNIQUE(post_id, consumer_id),

  -- Ensure producer and consumer are different users
  CONSTRAINT conversations_different_users CHECK (producer_id != consumer_id),

  -- Validate status values
  CONSTRAINT conversations_valid_status CHECK (status IN ('pending', 'active', 'declined', 'blocked'))
);
```

#### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | Primary key. Auto-generated unique identifier for the conversation. |
| `post_id` | `UUID` | NOT NULL | - | Foreign key to `posts(id)`. The post this conversation is about. |
| `producer_id` | `UUID` | NOT NULL | - | Foreign key to `profiles(id)`. The user who created the original post. |
| `consumer_id` | `UUID` | NOT NULL | - | Foreign key to `profiles(id)`. The user who responded to the post. |
| `status` | `TEXT` | NOT NULL | `'pending'` | Current status of the conversation. One of: `pending`, `active`, `declined`, `blocked`. |
| `producer_accepted` | `BOOLEAN` | NOT NULL | `false` | Whether the producer has accepted the consumer's response. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | When the conversation was initiated (consumer responded). |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Last update timestamp (automatically updated via trigger). |

#### Status Enum

The `status` column uses a text field with a CHECK constraint to enforce valid values:

| Status | Description | Who Sets It | Next Possible States |
|--------|-------------|-------------|----------------------|
| `pending` | Consumer has responded; waiting for producer's decision | System (on creation) | `active`, `declined`, `blocked` |
| `active` | Producer accepted; both parties can exchange messages | Producer | `blocked` |
| `declined` | Producer declined the response; conversation is closed | Producer | - (terminal) |
| `blocked` | One party blocked the other; conversation is terminated | Either participant | - (terminal) |

#### Status Workflow Diagram

```
                              ┌────────────────┐
                              │   Consumer     │
                              │   responds     │
                              │   to post      │
                              └───────┬────────┘
                                      │
                                      ▼
                              ┌────────────────┐
                              │    PENDING     │◄───── Initial state
                              │                │       (awaiting producer)
                              └───────┬────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
            ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
            │    ACTIVE     │ │   DECLINED    │ │    BLOCKED    │
            │               │ │               │ │               │
            │ producer_     │ │  (terminal)   │ │  (terminal)   │
            │ accepted=true │ │               │ │               │
            └───────┬───────┘ └───────────────┘ └───────────────┘
                    │
                    ▼
            ┌───────────────┐
            │    BLOCKED    │
            │               │
            │  (either can  │
            │   trigger)    │
            └───────────────┘
```

**Key Workflow Points:**

1. **Creation**: Consumer responds to a post → status = `pending`, producer_accepted = `false`
2. **Acceptance**: Producer reviews and accepts → status = `active`, producer_accepted = `true`
3. **Decline**: Producer rejects the response → status = `declined`
4. **Block**: Either party can block at any time → status = `blocked`

#### Producer/Consumer Relationships

The conversations table connects three entities: a post, its producer (creator), and a consumer (responder).

```
┌──────────────────┐         ┌──────────────────────┐         ┌──────────────────┐
│    profiles      │         │    conversations     │         │    profiles      │
│  (producer)      │         │                      │         │  (consumer)      │
│──────────────────│   1:N   │──────────────────────│   N:1   │──────────────────│
│ id (PK)      ◄───┼─────────│ producer_id (FK)     │         │ id (PK)      ◄───┤
│ username         │         │ consumer_id (FK) ────┼─────────┼──────────────────│
│                  │         │ post_id (FK)         │         │ username         │
└──────────────────┘         │ status               │         └──────────────────┘
        │                    │ producer_accepted    │
        │                    └──────────┬───────────┘
        │                               │
        │ 1:N                           │ N:1
        ▼                               ▼
┌──────────────────┐         ┌──────────────────┐
│      posts       │◄────────│   (same post)    │
│──────────────────│         └──────────────────┘
│ id (PK)          │
│ producer_id (FK) │ ◄─── Same as conversations.producer_id
│ ...              │
└──────────────────┘
```

**Relationship Details:**

| Relationship | From | To | Type | Description |
|--------------|------|-----|------|-------------|
| Post | `conversations` | `posts` | N:1 | Each conversation relates to exactly one post |
| Producer | `conversations` | `profiles` | N:1 | The post creator; can have many conversations for their posts |
| Consumer | `conversations` | `profiles` | N:1 | The responder; can respond to many different posts |

**Key Characteristics:**

- `ON DELETE CASCADE` on all foreign keys: If the post, producer, or consumer is deleted, the conversation is automatically removed
- `producer_id` is denormalized (also stored in `posts.producer_id`) for efficient queries without JOINs
- A producer can have multiple conversations for a single post (different consumers responding)
- A consumer can only have one conversation per post (enforced by unique constraint)

#### Unique Constraint: Preventing Duplicate Responses

The `conversations_unique_response` constraint prevents the same consumer from responding to the same post multiple times:

```sql
CONSTRAINT conversations_unique_response UNIQUE(post_id, consumer_id)
```

**Why This Matters:**

```
Post #123                    ┌────────────────────────────────┐
┌────────────────────┐       │ conversations                  │
│ Looking for person │       │                                │
│ at coffee shop     │       │ ┌───────────────────────────┐  │
│                    │───────┼▶│ post_id: 123               │  │
│ producer: Alice    │       │ │ consumer_id: Bob           │  │ ✓ OK
│                    │       │ │ status: pending            │  │
└────────────────────┘       │ └───────────────────────────┘  │
                             │                                │
                             │ ┌───────────────────────────┐  │
                             │ │ post_id: 123               │  │ ✗ REJECTED
                             │ │ consumer_id: Bob           │  │ (duplicate)
                             │ │ status: pending            │  │
                             │ └───────────────────────────┘  │
                             │                                │
                             │ ┌───────────────────────────┐  │
                             │ │ post_id: 123               │  │ ✓ OK
                             │ │ consumer_id: Carol         │  │ (different consumer)
                             │ │ status: pending            │  │
                             │ └───────────────────────────┘  │
                             └────────────────────────────────┘
```

**Benefits:**
- Prevents spam/repeated responses to the same post
- Simplifies UI logic (user either has responded or hasn't)
- Clear data model for conversation history

**Handling Declined Conversations:**

If a producer declines a response, the conversation remains in `declined` status. The consumer cannot create a new conversation for the same post because of the unique constraint. This is intentional to prevent harassment.

#### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| `conversations_pkey` | `id` | B-tree (Primary) | Fast lookup by conversation ID |
| `conversations_producer_idx` | `producer_id` | B-tree | Fast lookup of producer's conversations |
| `conversations_consumer_idx` | `consumer_id` | B-tree | Fast lookup of consumer's conversations |
| `conversations_post_idx` | `post_id` | B-tree | Fast lookup of conversations for a post |
| `conversations_status_idx` | `status` | B-tree | Efficient filtering by status |
| `conversations_user_active_idx` | `producer_id, status` (WHERE status = 'active') | B-tree (Partial) | Optimized query for producer's active conversations |

#### Constraints

| Constraint | Type | Description |
|------------|------|-------------|
| `conversations_pkey` | PRIMARY KEY | `id` is the primary key |
| `conversations_post_id_fkey` | FOREIGN KEY | References `posts(id)` with CASCADE delete |
| `conversations_producer_id_fkey` | FOREIGN KEY | References `profiles(id)` with CASCADE delete |
| `conversations_consumer_id_fkey` | FOREIGN KEY | References `profiles(id)` with CASCADE delete |
| `conversations_unique_response` | UNIQUE | Prevents same consumer responding twice to same post |
| `conversations_different_users` | CHECK | Ensures `producer_id != consumer_id` (no self-responses) |
| `conversations_valid_status` | CHECK | Validates status is one of: `pending`, `active`, `declined`, `blocked` |

#### Triggers

| Trigger Name | Timing | Event | Function |
|--------------|--------|-------|----------|
| `conversations_updated_at` | BEFORE | UPDATE | `update_updated_at_column()` |

The trigger automatically updates `updated_at` whenever any conversation column is modified (e.g., status change).

#### Usage Examples

**Creating a conversation (consumer responding to a post):**

```typescript
import { supabase } from '@/lib/supabase';
import type { ConversationInsert } from '@/types/database';

// When a consumer responds to a post
const { data: conversation, error } = await supabase
  .from('conversations')
  .insert({
    post_id: postId,
    producer_id: post.producer_id,  // From the post
    consumer_id: currentUser.id,    // The responding user
    status: 'pending',
    producer_accepted: false
  })
  .select(`
    *,
    post:posts(id, message, target_description),
    producer:profiles!conversations_producer_id_fkey(id, username, avatar_config),
    consumer:profiles!conversations_consumer_id_fkey(id, username, avatar_config)
  `)
  .single();
```

**Checking if user has already responded to a post:**

```typescript
// Check before showing "Respond" button
const { data: existingConversation } = await supabase
  .from('conversations')
  .select('id, status')
  .eq('post_id', postId)
  .eq('consumer_id', currentUser.id)
  .single();

const hasResponded = !!existingConversation;
const responseStatus = existingConversation?.status;
```

**Producer accepting a response:**

```typescript
// Producer accepts a pending conversation
const { error } = await supabase
  .from('conversations')
  .update({
    status: 'active',
    producer_accepted: true
  })
  .eq('id', conversationId)
  .eq('producer_id', currentUser.id);  // Ensure only producer can accept
```

**Producer declining a response:**

```typescript
// Producer declines a pending conversation
const { error } = await supabase
  .from('conversations')
  .update({ status: 'declined' })
  .eq('id', conversationId)
  .eq('producer_id', currentUser.id);
```

**Blocking a conversation (either party):**

```typescript
// Either participant can block
const { error } = await supabase
  .from('conversations')
  .update({ status: 'blocked' })
  .eq('id', conversationId)
  .or(`producer_id.eq.${currentUser.id},consumer_id.eq.${currentUser.id}`);
```

**Fetching user's conversations (as producer or consumer):**

```typescript
// Get all conversations where user is either producer or consumer
const { data: conversations, error } = await supabase
  .from('conversations')
  .select(`
    *,
    post:posts(id, message, target_avatar, location:locations(name)),
    producer:profiles!conversations_producer_id_fkey(id, username, avatar_config),
    consumer:profiles!conversations_consumer_id_fkey(id, username, avatar_config),
    messages(id, content, sender_id, created_at, is_read)
  `)
  .or(`producer_id.eq.${currentUser.id},consumer_id.eq.${currentUser.id}`)
  .order('updated_at', { ascending: false });
```

**Fetching pending responses for a producer:**

```typescript
// Get all pending responses awaiting producer's decision
const { data: pendingResponses, error } = await supabase
  .from('conversations')
  .select(`
    *,
    post:posts(id, message, target_description),
    consumer:profiles!conversations_consumer_id_fkey(id, username, avatar_config)
  `)
  .eq('producer_id', currentUser.id)
  .eq('status', 'pending')
  .order('created_at', { ascending: false });
```

**Fetching active conversations for messaging:**

```typescript
// Get conversations where messaging is enabled
const { data: activeChats, error } = await supabase
  .from('conversations')
  .select(`
    *,
    post:posts(id, message),
    producer:profiles!conversations_producer_id_fkey(id, username, avatar_config),
    consumer:profiles!conversations_consumer_id_fkey(id, username, avatar_config)
  `)
  .eq('status', 'active')
  .or(`producer_id.eq.${currentUser.id},consumer_id.eq.${currentUser.id}`)
  .order('updated_at', { ascending: false });
```

**SQL: Get conversation counts by status:**

```sql
-- Count conversations by status for a user
SELECT status, COUNT(*) as count
FROM conversations
WHERE producer_id = $user_id OR consumer_id = $user_id
GROUP BY status;
```

**SQL: Find posts with multiple responses:**

```sql
-- Posts that have received multiple responses
SELECT p.id, p.message, COUNT(c.id) as response_count
FROM posts p
JOIN conversations c ON c.post_id = p.id
WHERE p.producer_id = $user_id
GROUP BY p.id, p.message
HAVING COUNT(c.id) > 1
ORDER BY response_count DESC;
```

---

### messages

Individual chat messages exchanged between participants within a conversation. Messages can only be sent in **active** conversations (where the producer has accepted the consumer's response).

#### Schema Definition

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | Primary key. Auto-generated unique identifier for the message. |
| `conversation_id` | `UUID` | NOT NULL | - | Foreign key to `conversations(id)`. The conversation this message belongs to. |
| `sender_id` | `UUID` | NOT NULL | - | Foreign key to `profiles(id)`. The user who sent this message. |
| `content` | `TEXT` | NOT NULL | - | The message content/text. Cannot be empty. |
| `is_read` | `BOOLEAN` | NOT NULL | `false` | Whether the recipient has read this message. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | When the message was sent. |

#### Conversation Relationship

The `conversation_id` column establishes a **many-to-one** relationship with the `conversations` table:

```
┌──────────────────────┐         ┌──────────────────┐
│    conversations     │         │     messages     │
│──────────────────────│   1:N   │──────────────────│
│ id (PK)          ◄───┼─────────│ conversation_id  │
│ post_id              │         │ sender_id        │
│ producer_id          │         │ content          │
│ consumer_id          │         │ is_read          │
│ status               │         │ created_at       │
└──────────────────────┘         └──────────────────┘
```

**Key Characteristics:**

- `ON DELETE CASCADE`: When a conversation is deleted, all its messages are automatically deleted
- Messages can only exist within a conversation context
- Multiple messages can belong to the same conversation (chat history)
- The application should enforce that messages are only sent in `active` conversations

**Message Flow in Conversation Lifecycle:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MESSAGE FLOW BY STATUS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PENDING Status:                                                             │
│  ┌──────────────────────────────────────────┐                               │
│  │ Consumer sends initial response message  │◄── First message created     │
│  │ (awaiting producer acceptance)           │                               │
│  └──────────────────────────────────────────┘                               │
│                    │                                                         │
│                    ▼                                                         │
│  ACTIVE Status:                                                              │
│  ┌──────────────────────────────────────────┐                               │
│  │ Both producer and consumer can send      │◄── Full messaging enabled    │
│  │ unlimited messages back and forth        │                               │
│  └──────────────────────────────────────────┘                               │
│                    │                                                         │
│                    ▼                                                         │
│  DECLINED/BLOCKED Status:                                                    │
│  ┌──────────────────────────────────────────┐                               │
│  │ No new messages can be sent              │◄── Messaging disabled        │
│  │ Existing messages remain visible         │                               │
│  └──────────────────────────────────────────┘                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Sender Relationship

The `sender_id` column establishes a **many-to-one** relationship with the `profiles` table:

```
┌──────────────────┐         ┌──────────────────┐
│    profiles      │         │     messages     │
│──────────────────│   1:N   │──────────────────│
│ id (PK)      ◄───┼─────────│ sender_id (FK)   │
│ username         │         │ conversation_id  │
│ avatar_config    │         │ content          │
└──────────────────┘         └──────────────────┘
```

**Key Characteristics:**

- `ON DELETE CASCADE`: When a user's profile is deleted, all their messages are automatically deleted
- Each message has exactly one sender
- A user can send many messages across different conversations
- The sender must be either the `producer_id` or `consumer_id` of the parent conversation

**Sender Validation:**

While not enforced at the database level, the application should ensure:

```sql
-- Sender must be a participant in the conversation
SELECT m.*
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
WHERE m.sender_id IN (c.producer_id, c.consumer_id);
```

This validation is typically enforced via RLS policies or application logic.

#### Read Status Tracking

The `is_read` column tracks whether the recipient has seen a message:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        READ STATUS LIFECYCLE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Message Sent                    Message Viewed                              │
│       │                               │                                      │
│       ▼                               ▼                                      │
│  ┌─────────────┐              ┌─────────────┐                               │
│  │ is_read =   │─────────────▶│ is_read =   │                               │
│  │   FALSE     │  User views  │   TRUE      │                               │
│  └─────────────┘  message     └─────────────┘                               │
│                                                                              │
│  • Message appears in          • Message no longer                          │
│    unread count                  contributes to count                       │
│  • May trigger                 • Visual indicator                           │
│    notification                  changes (e.g., checkmark)                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Usage Patterns:**

1. **Unread Badge Count**: Count unread messages for notification badges
2. **Mark as Read**: Update when user opens/views a conversation
3. **Read Receipts**: Show sender that their message was read

**Important Notes:**

- The `is_read` field tracks whether the **other** participant has read the message
- When the sender views their own message, `is_read` remains `false` until the recipient views it
- Bulk update is typically used when opening a conversation (mark all as read)

#### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| `messages_pkey` | `id` | B-tree (Primary) | Fast lookup by message ID |
| `messages_conversation_idx` | `conversation_id, created_at` | B-tree (Composite) | Efficient retrieval of conversation messages in chronological order |
| `messages_sender_idx` | `sender_id` | B-tree | Fast lookup of all messages sent by a user |
| `messages_unread_idx` | `conversation_id, is_read` (WHERE is_read = FALSE) | B-tree (Partial) | Optimized query for unread message counts |

#### Index Details

**Composite Index for Conversation Messages:**

```sql
CREATE INDEX messages_conversation_idx ON messages(conversation_id, created_at);
```

This composite index optimizes the most common query pattern: fetching all messages for a conversation sorted by time.

```sql
-- Query that benefits from this index
SELECT * FROM messages
WHERE conversation_id = $1
ORDER BY created_at ASC;
```

**Partial Index for Unread Messages:**

```sql
CREATE INDEX messages_unread_idx ON messages(conversation_id, is_read)
WHERE is_read = FALSE;
```

This partial index only includes unread messages, making it extremely efficient for:

```sql
-- Count unread messages in a conversation
SELECT COUNT(*) FROM messages
WHERE conversation_id = $1 AND is_read = FALSE;

-- Count total unread messages for a user (across all conversations)
SELECT COUNT(*) FROM messages m
JOIN conversations c ON c.id = m.conversation_id
WHERE (c.producer_id = $user_id OR c.consumer_id = $user_id)
  AND m.sender_id != $user_id
  AND m.is_read = FALSE;
```

#### Constraints

| Constraint | Type | Description |
|------------|------|-------------|
| `messages_pkey` | PRIMARY KEY | `id` is the primary key |
| `messages_conversation_id_fkey` | FOREIGN KEY | References `conversations(id)` with CASCADE delete |
| `messages_sender_id_fkey` | FOREIGN KEY | References `profiles(id)` with CASCADE delete |

#### Usage Examples

**Sending a message:**

```typescript
import { supabase } from '@/lib/supabase';
import type { MessageInsert } from '@/types/database';

// Send a new message in a conversation
const { data: message, error } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    sender_id: currentUser.id,
    content: 'Hello! I think I remember you from the coffee shop.',
    is_read: false
  })
  .select(`
    *,
    sender:profiles(id, username, avatar_config)
  `)
  .single();
```

**Fetching conversation messages:**

```typescript
// Get all messages in a conversation, sorted by time
const { data: messages, error } = await supabase
  .from('messages')
  .select(`
    *,
    sender:profiles(id, username, avatar_config)
  `)
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true });
```

**Fetching messages with pagination:**

```typescript
// Paginated message loading (for infinite scroll)
const PAGE_SIZE = 50;

const { data: messages, error } = await supabase
  .from('messages')
  .select(`
    *,
    sender:profiles(id, username, avatar_config)
  `)
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: false })  // Newest first for loading
  .range(offset, offset + PAGE_SIZE - 1);

// Reverse for display (oldest to newest in chat)
const displayMessages = messages?.reverse();
```

**Marking messages as read:**

```typescript
// Mark all unread messages in a conversation as read
// (where the current user is NOT the sender)
const { error } = await supabase
  .from('messages')
  .update({ is_read: true })
  .eq('conversation_id', conversationId)
  .neq('sender_id', currentUser.id)
  .eq('is_read', false);
```

**Counting unread messages:**

```typescript
// Get unread message count for a specific conversation
const { count, error } = await supabase
  .from('messages')
  .select('*', { count: 'exact', head: true })
  .eq('conversation_id', conversationId)
  .neq('sender_id', currentUser.id)
  .eq('is_read', false);

const unreadCount = count ?? 0;
```

**Fetching user's total unread count:**

```typescript
// Get total unread messages across all conversations for notification badge
const { data: unreadMessages, error } = await supabase
  .from('messages')
  .select(`
    id,
    conversation:conversations!inner(
      id,
      producer_id,
      consumer_id
    )
  `)
  .eq('is_read', false)
  .or(`conversation.producer_id.eq.${currentUser.id},conversation.consumer_id.eq.${currentUser.id}`)
  .neq('sender_id', currentUser.id);

const totalUnread = unreadMessages?.length ?? 0;
```

**Real-time message subscription:**

```typescript
// Subscribe to new messages in a conversation
const subscription = supabase
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
      const newMessage = payload.new as Message;
      // Add to message list
      setMessages(prev => [...prev, newMessage]);

      // Mark as read if from other user and conversation is open
      if (newMessage.sender_id !== currentUser.id) {
        markMessageAsRead(newMessage.id);
      }
    }
  )
  .subscribe();

// Cleanup
return () => {
  subscription.unsubscribe();
};
```

**SQL: Get conversation with latest message:**

```sql
-- For conversation list view with last message preview
SELECT
  c.*,
  m.content AS last_message_content,
  m.created_at AS last_message_at,
  m.sender_id AS last_message_sender,
  (
    SELECT COUNT(*)
    FROM messages
    WHERE conversation_id = c.id
      AND is_read = FALSE
      AND sender_id != $user_id
  ) AS unread_count
FROM conversations c
LEFT JOIN LATERAL (
  SELECT content, created_at, sender_id
  FROM messages
  WHERE conversation_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) m ON true
WHERE c.producer_id = $user_id OR c.consumer_id = $user_id
ORDER BY COALESCE(m.created_at, c.created_at) DESC;
```

**SQL: Get message thread between two users:**

```sql
-- Find all messages exchanged between two specific users
SELECT m.*
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
WHERE (c.producer_id = $user1_id AND c.consumer_id = $user2_id)
   OR (c.producer_id = $user2_id AND c.consumer_id = $user1_id)
ORDER BY m.created_at ASC;
```

---

### notifications

In-app notifications to alert users about activity related to their posts and conversations. Notifications are generated for key events like new responses, messages, and acceptances.

#### Schema Definition

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Validate notification types
  CONSTRAINT notifications_valid_type CHECK (type IN ('new_response', 'new_message', 'response_accepted'))
);
```

#### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | Primary key. Auto-generated unique identifier for the notification. |
| `user_id` | `UUID` | NOT NULL | - | Foreign key to `profiles(id)`. The user who receives this notification. |
| `type` | `TEXT` | NOT NULL | - | Type of notification event. One of: `new_response`, `new_message`, `response_accepted`. |
| `reference_id` | `UUID` | NOT NULL | - | Polymorphic reference to the related entity. The target entity depends on the `type`. |
| `is_read` | `BOOLEAN` | NOT NULL | `false` | Whether the user has read/acknowledged this notification. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | When the notification was created. |

#### User Relationship

The `user_id` column establishes a **many-to-one** relationship with the `profiles` table:

```
┌──────────────────┐         ┌──────────────────┐
│    profiles      │         │  notifications   │
│──────────────────│   1:N   │──────────────────│
│ id (PK)      ◄───┼─────────│ user_id (FK)     │
│ username         │         │ type             │
│ avatar_config    │         │ reference_id     │
└──────────────────┘         │ is_read          │
                             └──────────────────┘
```

**Key Characteristics:**

- `ON DELETE CASCADE`: When a user's profile is deleted, all their notifications are automatically deleted
- Each notification belongs to exactly one user (the recipient)
- A user can have many notifications
- Only the notification owner can view, read, or delete their notifications

#### Notification Types

The `type` column categorizes notifications into distinct event types:

| Type | Description | Recipient | Reference ID Points To |
|------|-------------|-----------|------------------------|
| `new_response` | Someone responded to your post | Post producer | `conversations.id` |
| `new_message` | New message in a conversation | Other participant | `messages.id` |
| `response_accepted` | Producer accepted your response | Post consumer | `conversations.id` |

#### Notification Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NOTIFICATION TRIGGERS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  EVENT                          NOTIFICATION              RECIPIENT          │
│  ─────                          ────────────              ─────────          │
│                                                                              │
│  ┌─────────────────┐           ┌─────────────────┐                          │
│  │ Consumer        │           │ type:           │                          │
│  │ responds to     │──────────▶│ 'new_response'  │────────▶ Post Producer   │
│  │ a post          │           │ ref: conv.id    │                          │
│  └─────────────────┘           └─────────────────┘                          │
│                                                                              │
│  ┌─────────────────┐           ┌─────────────────┐                          │
│  │ User sends      │           │ type:           │                          │
│  │ message in      │──────────▶│ 'new_message'   │────────▶ Other           │
│  │ conversation    │           │ ref: message.id │         Participant      │
│  └─────────────────┘           └─────────────────┘                          │
│                                                                              │
│  ┌─────────────────┐           ┌─────────────────┐                          │
│  │ Producer        │           │ type:           │                          │
│  │ accepts         │──────────▶│ 'response_      │────────▶ Consumer        │
│  │ response        │           │  accepted'      │                          │
│  └─────────────────┘           │ ref: conv.id    │                          │
│                                └─────────────────┘                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### reference_id: Polymorphic Reference

The `reference_id` column is a **polymorphic foreign key** that points to different tables depending on the notification `type`. This design allows a single notifications table to reference multiple entity types.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REFERENCE_ID POLYMORPHISM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  notifications.reference_id                                                  │
│           │                                                                  │
│           │                                                                  │
│           ├──── type = 'new_response' ──────▶ conversations.id              │
│           │                                                                  │
│           ├──── type = 'new_message' ───────▶ messages.id                   │
│           │                                                                  │
│           └──── type = 'response_accepted' ─▶ conversations.id              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Usage Pattern:**

```typescript
// Determine what the notification references based on type
function getNotificationTarget(notification: Notification) {
  switch (notification.type) {
    case 'new_response':
    case 'response_accepted':
      // reference_id is a conversation ID
      return { table: 'conversations', id: notification.reference_id };
    case 'new_message':
      // reference_id is a message ID
      return { table: 'messages', id: notification.reference_id };
    default:
      throw new Error(`Unknown notification type: ${notification.type}`);
  }
}
```

**Important Notes:**

- No database-level foreign key constraint exists on `reference_id` since it can reference different tables
- The application must maintain referential integrity
- If the referenced entity is deleted, the notification should be cleaned up (via application logic or triggers)
- Always check `type` before interpreting `reference_id`

#### Read Status Tracking

The `is_read` column tracks whether the user has viewed/acknowledged a notification:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NOTIFICATION READ LIFECYCLE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Event Occurs                   User Opens                                   │
│       │                         Notification                                 │
│       ▼                              │                                       │
│  ┌─────────────┐                     ▼                                       │
│  │ is_read =   │  ─────────────▶ ┌─────────────┐                            │
│  │   FALSE     │   User views    │ is_read =   │                            │
│  └─────────────┘   or taps       │   TRUE      │                            │
│       │                          └─────────────┘                             │
│       │                                                                      │
│       ▼                                                                      │
│  • Appears in unread count                                                   │
│  • Badge/indicator shown                                                     │
│  • May trigger push notification                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Common Patterns:**

1. **Unread Badge**: Count notifications where `is_read = false`
2. **Mark as Read**: Update when user taps or views the notification
3. **Mark All as Read**: Bulk update all unread notifications for a user
4. **Notification Center**: Display sorted by `created_at DESC` with visual distinction for unread

#### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| `notifications_pkey` | `id` | B-tree (Primary) | Fast lookup by notification ID |
| `notifications_user_idx` | `user_id` | B-tree | Fast lookup of all notifications for a user |
| `notifications_user_unread_idx` | `user_id, is_read` (WHERE is_read = FALSE) | B-tree (Partial) | Optimized query for unread notification counts |
| `notifications_created_at_idx` | `created_at DESC` | B-tree | Efficient sorting by time for notification lists |
| `notifications_type_idx` | `type` | B-tree | Filtering notifications by type |

#### Index Details

**Partial Index for Unread Notifications:**

```sql
CREATE INDEX notifications_user_unread_idx ON notifications(user_id, is_read)
WHERE is_read = FALSE;
```

This partial index only includes unread notifications, making it extremely efficient for:

```sql
-- Count unread notifications for a user (notification badge)
SELECT COUNT(*) FROM notifications
WHERE user_id = $1 AND is_read = FALSE;
```

**Composite Index for User Notifications:**

```sql
CREATE INDEX notifications_user_created_idx ON notifications(user_id, created_at DESC);
```

Optimizes the most common query pattern: fetching a user's notifications sorted by time.

#### Constraints

| Constraint | Type | Description |
|------------|------|-------------|
| `notifications_pkey` | PRIMARY KEY | `id` is the primary key |
| `notifications_user_id_fkey` | FOREIGN KEY | References `profiles(id)` with CASCADE delete |
| `notifications_valid_type` | CHECK | Validates type is one of: `new_response`, `new_message`, `response_accepted` |

#### Usage Examples

**Creating a notification (new response):**

```typescript
import { supabase } from '@/lib/supabase';
import type { NotificationInsert } from '@/types/database';

// When a consumer responds to a post, notify the producer
async function notifyNewResponse(conversationId: string, producerId: string) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: producerId,
      type: 'new_response',
      reference_id: conversationId,
      is_read: false
    });

  if (error) console.error('Failed to create notification:', error);
}
```

**Creating a notification (new message):**

```typescript
// When a message is sent, notify the other participant
async function notifyNewMessage(
  messageId: string,
  senderId: string,
  conversation: Conversation
) {
  // Determine the recipient (the other participant)
  const recipientId = conversation.producer_id === senderId
    ? conversation.consumer_id
    : conversation.producer_id;

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: recipientId,
      type: 'new_message',
      reference_id: messageId,
      is_read: false
    });
}
```

**Creating a notification (response accepted):**

```typescript
// When a producer accepts a response, notify the consumer
async function notifyResponseAccepted(conversationId: string, consumerId: string) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: consumerId,
      type: 'response_accepted',
      reference_id: conversationId,
      is_read: false
    });
}
```

**Fetching user's notifications:**

```typescript
// Get all notifications for the current user, sorted by newest first
const { data: notifications, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', currentUser.id)
  .order('created_at', { ascending: false })
  .limit(50);
```

**Fetching notifications with related data:**

```typescript
// Fetch notifications with context based on type
async function fetchNotificationsWithContext(userId: string) {
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!notifications) return [];

  // Fetch related data for each notification
  return Promise.all(notifications.map(async (notification) => {
    switch (notification.type) {
      case 'new_response':
      case 'response_accepted': {
        const { data: conversation } = await supabase
          .from('conversations')
          .select(`
            id,
            post:posts(id, message, target_description),
            producer:profiles!conversations_producer_id_fkey(username),
            consumer:profiles!conversations_consumer_id_fkey(username)
          `)
          .eq('id', notification.reference_id)
          .single();
        return { ...notification, conversation };
      }
      case 'new_message': {
        const { data: message } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            sender:profiles(username),
            conversation:conversations(id)
          `)
          .eq('id', notification.reference_id)
          .single();
        return { ...notification, message };
      }
      default:
        return notification;
    }
  }));
}
```

**Counting unread notifications:**

```typescript
// Get unread notification count for badge display
const { count, error } = await supabase
  .from('notifications')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', currentUser.id)
  .eq('is_read', false);

const unreadCount = count ?? 0;
```

**Marking a notification as read:**

```typescript
// Mark a single notification as read when user taps it
const { error } = await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('id', notificationId)
  .eq('user_id', currentUser.id);  // Security: ensure user owns notification
```

**Marking all notifications as read:**

```typescript
// "Mark all as read" functionality
const { error } = await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('user_id', currentUser.id)
  .eq('is_read', false);
```

**Deleting old notifications:**

```typescript
// Clean up notifications older than 30 days
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

const { error } = await supabase
  .from('notifications')
  .delete()
  .eq('user_id', currentUser.id)
  .lt('created_at', thirtyDaysAgo);
```

**Real-time notification subscription:**

```typescript
// Subscribe to new notifications for the current user
const subscription = supabase
  .channel(`notifications:${currentUser.id}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${currentUser.id}`
    },
    (payload) => {
      const newNotification = payload.new as Notification;
      // Update notification list
      setNotifications(prev => [newNotification, ...prev]);
      // Update unread count
      setUnreadCount(prev => prev + 1);
      // Optionally show toast/alert
      showNotificationToast(newNotification);
    }
  )
  .subscribe();

// Cleanup on unmount
return () => {
  subscription.unsubscribe();
};
```

**SQL: Get notification summary by type:**

```sql
-- Count notifications grouped by type for analytics
SELECT type, COUNT(*) as count,
       SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_count
FROM notifications
WHERE user_id = $user_id
GROUP BY type;
```

**SQL: Get recent notifications with deduplication:**

```sql
-- Get latest notification per conversation (avoid spam from rapid messages)
SELECT DISTINCT ON (reference_id) *
FROM notifications
WHERE user_id = $user_id
  AND type IN ('new_message')
ORDER BY reference_id, created_at DESC;
```

**SQL: Clean up orphaned notifications:**

```sql
-- Remove notifications referencing deleted conversations
DELETE FROM notifications
WHERE type IN ('new_response', 'response_accepted')
  AND reference_id NOT IN (SELECT id FROM conversations);

-- Remove notifications referencing deleted messages
DELETE FROM notifications
WHERE type = 'new_message'
  AND reference_id NOT IN (SELECT id FROM messages);
```

[↑ Back to Table of Contents](#table-of-contents)

---

## Row Level Security (RLS)

Row Level Security (RLS) is PostgreSQL's built-in feature for restricting which rows users can access or modify based on their identity. Love Ledger uses RLS extensively to enforce data privacy at the database level.

### What is RLS and Why Use It?

**Row Level Security** enables fine-grained access control directly in the database. Instead of relying solely on application code to filter data, RLS policies act as automatic filters on every query.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RLS SECURITY LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Application                                                                │
│       │                                                                      │
│       │ SELECT * FROM messages WHERE conversation_id = $1                   │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │              SUPABASE / POSTGREST               │                       │
│   │     (Extracts user identity from JWT)           │                       │
│   └───────────────────────┬─────────────────────────┘                       │
│                           │                                                  │
│                           ▼                                                  │
│   ┌─────────────────────────────────────────────────┐                       │
│   │               RLS POLICIES                       │                       │
│   │                                                  │                       │
│   │   Original Query:                                │                       │
│   │   SELECT * FROM messages                         │                       │
│   │   WHERE conversation_id = $1                     │                       │
│   │                                                  │                       │
│   │   After RLS Applied:                             │                       │
│   │   SELECT * FROM messages                         │                       │
│   │   WHERE conversation_id = $1                     │                       │
│   │     AND (conversation is participant check...)   │◄── Automatic filter  │
│   │                                                  │                       │
│   └───────────────────────┬─────────────────────────┘                       │
│                           │                                                  │
│                           ▼                                                  │
│                    Only authorized                                           │
│                    rows returned                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Benefits of RLS:**

| Benefit | Description |
|---------|-------------|
| **Defense in Depth** | Even if application code has bugs, the database enforces access rules |
| **Consistent Enforcement** | Same policies apply whether accessed via API, admin tools, or direct queries |
| **Simplified Application Logic** | Less need to filter data in application code |
| **Audit Trail** | Security rules are version-controlled with database migrations |
| **Performance** | PostgreSQL optimizes queries with RLS predicates |

**RLS in Supabase:**

When RLS is enabled on a table, **no rows are accessible by default** (deny-by-default). You must create explicit policies to grant access. Supabase PostgREST automatically respects these policies for all API requests.

```sql
-- Enable RLS on a table (required before policies work)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
```

---

### Love Ledger Security Model

Love Ledger implements a **privacy-first security model** with the following access patterns:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LOVE LEDGER SECURITY MODEL                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      PUBLIC ACCESS (Read Only)                       │   │
│  │                                                                      │   │
│  │   • profiles - Usernames and avatars visible to all authenticated   │   │
│  │   • locations - All location data is public                          │   │
│  │   • posts (active) - Active posts visible to find matches            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      OWNER-ONLY ACCESS                               │   │
│  │                                                                      │   │
│  │   • profiles - Only you can modify your own profile                  │   │
│  │   • posts - Only producers can modify/delete their posts             │   │
│  │   • notifications - Only you can see/manage your notifications       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PARTICIPANT-ONLY ACCESS                           │   │
│  │                                                                      │   │
│  │   • conversations - Only producer/consumer can access                │   │
│  │   • messages - Only conversation participants can read/send          │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    AUTHENTICATED CREATE                              │   │
│  │                                                                      │   │
│  │   • locations - Any authenticated user can add new locations         │   │
│  │   • posts - Any authenticated user can create posts                  │   │
│  │   • conversations - Consumers can create (with validation)           │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Security Model by Table:**

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | All authenticated users | Own profile only | Own profile only | Own profile only |
| `locations` | All authenticated users | Authenticated users | Service role only | Service role only |
| `posts` | Active posts (or own) | Own posts only | Own posts only | Own posts only |
| `conversations` | Participants only | Consumers (with validation) | Participants only | Participants only |
| `messages` | Participants only | Participants (active conv.) | Participants only | Sender only |
| `notifications` | Owner only | Owner only | Owner only | Owner only |

---

### Authentication Context: `auth.uid()`

RLS policies use Supabase's authentication context to identify the current user. The primary function is `auth.uid()`, which returns the authenticated user's ID.

#### How `auth.uid()` Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTH.UID() FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User logs in via Supabase Auth                                          │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────┐                        │
│  │   JWT Token Generated                            │                        │
│  │   {                                              │                        │
│  │     "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", │◄── User's UUID     │
│  │     "role": "authenticated",                     │                        │
│  │     "aud": "authenticated",                      │                        │
│  │     ...                                          │                        │
│  │   }                                              │                        │
│  └─────────────────────────────────────────────────┘                        │
│       │                                                                      │
│       ▼                                                                      │
│  2. Client includes JWT in API requests                                     │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────┐                        │
│  │   Supabase PostgREST                             │                        │
│  │   - Validates JWT signature                      │                        │
│  │   - Extracts claims                              │                        │
│  │   - Sets auth.uid() = JWT.sub                    │                        │
│  └─────────────────────────────────────────────────┘                        │
│       │                                                                      │
│       ▼                                                                      │
│  3. RLS policy checks auth.uid()                                            │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────┐                        │
│  │   Policy: profiles_update_own                    │                        │
│  │   USING (id = auth.uid())                        │                        │
│  │            ▲                                     │                        │
│  │            │                                     │                        │
│  │   Returns: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'│                        │
│  └─────────────────────────────────────────────────┘                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Key Authentication Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `auth.uid()` | `UUID` | The current user's ID (from JWT `sub` claim) |
| `auth.role()` | `TEXT` | The user's role (`authenticated`, `anon`, `service_role`) |
| `auth.jwt()` | `JSON` | The complete decoded JWT payload |

#### Common Patterns with `auth.uid()`

**1. Owner Check (most common):**

```sql
-- User can only access their own data
CREATE POLICY "users_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());
```

**2. Participant Check (for relationships):**

```sql
-- User must be either producer or consumer
CREATE POLICY "conversations_select_participants" ON conversations
  FOR SELECT USING (
    producer_id = auth.uid() OR consumer_id = auth.uid()
  );
```

**3. JOIN-based Participant Check:**

```sql
-- User must be participant in the parent conversation
CREATE POLICY "messages_select_participants" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.producer_id = auth.uid() OR c.consumer_id = auth.uid())
    )
  );
```

**4. Authenticated User Check:**

```sql
-- Any logged-in user can insert
CREATE POLICY "locations_insert_authenticated" ON locations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

#### Important Notes

- `auth.uid()` returns `NULL` for anonymous users (not logged in)
- Policies using `auth.uid()` will implicitly deny access to anonymous users
- The service role bypasses RLS entirely (use with caution)
- Always test policies with different user contexts

---

### Policy Types and Clauses

RLS policies can be created for specific operations with different clause types:

#### Operations

| Operation | Applies To | Description |
|-----------|------------|-------------|
| `SELECT` | Read queries | Controls which rows can be returned |
| `INSERT` | New rows | Controls which rows can be inserted |
| `UPDATE` | Existing rows | Controls which rows can be modified |
| `DELETE` | Existing rows | Controls which rows can be removed |
| `ALL` | All operations | Shorthand for all four operations |

#### Clauses

| Clause | Used For | Description |
|--------|----------|-------------|
| `USING` | SELECT, UPDATE, DELETE | Filters which **existing rows** are accessible |
| `WITH CHECK` | INSERT, UPDATE | Validates that **new/modified rows** meet criteria |

**Understanding USING vs WITH CHECK:**

```sql
-- USING: "Which existing rows can I see/modify?"
-- Applied when reading or before modifying

-- WITH CHECK: "Is this new/modified row valid?"
-- Applied after INSERT/UPDATE to validate the result

CREATE POLICY "posts_update_own" ON posts
  FOR UPDATE
  USING (producer_id = auth.uid())      -- Can only see my posts to update
  WITH CHECK (producer_id = auth.uid()); -- Can't change producer_id to someone else
```

---

### Policy Naming Convention

Love Ledger follows a consistent naming convention for RLS policies:

```
{table}_{operation}_{scope}
```

#### Convention Components

| Component | Values | Description |
|-----------|--------|-------------|
| `{table}` | `profiles`, `posts`, etc. | The table the policy applies to |
| `{operation}` | `select`, `insert`, `update`, `delete` | The SQL operation |
| `{scope}` | `all`, `own`, `authenticated`, `participants`, `active`, `sender` | Who can perform the operation |

#### Scope Definitions

| Scope | Meaning | Example |
|-------|---------|---------|
| `all` | Any authenticated user | `profiles_select_all` - Anyone can read profiles |
| `own` | Only the row's owner | `profiles_update_own` - Only update your profile |
| `authenticated` | Any logged-in user | `locations_insert_authenticated` - Logged-in users can add locations |
| `participants` | Conversation participants | `messages_select_participants` - Only chat members can read |
| `active` | Active records + owner fallback | `posts_select_active` - See active posts or your own |
| `sender` | The message sender | `messages_delete_sender` - Only delete your own messages |

#### Policy Name Examples

| Policy Name | Table | Operation | Who Can Access |
|-------------|-------|-----------|----------------|
| `profiles_select_all` | profiles | SELECT | All authenticated users |
| `profiles_insert_own` | profiles | INSERT | Creating your own profile |
| `profiles_update_own` | profiles | UPDATE | Updating your own profile |
| `profiles_delete_own` | profiles | DELETE | Deleting your own profile |
| `locations_select_all` | locations | SELECT | All authenticated users |
| `locations_insert_authenticated` | locations | INSERT | Any authenticated user |
| `posts_select_active` | posts | SELECT | Active posts OR own posts |
| `posts_insert_own` | posts | INSERT | Creating your own post |
| `posts_update_own` | posts | UPDATE | Updating your own post |
| `posts_delete_own` | posts | DELETE | Deleting your own post |
| `conversations_select_participants` | conversations | SELECT | Producer or consumer |
| `messages_select_participants` | messages | SELECT | Conversation participants |
| `messages_delete_sender` | messages | DELETE | Message sender only |
| `notifications_select_own` | notifications | SELECT | Notification recipient |

---

### Enabling RLS on Tables

Before policies take effect, RLS must be enabled on each table:

```sql
-- Enable RLS (deny-by-default - no access until policies are created)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

**Important:** Tables owned by the `postgres` user bypass RLS by default. In Supabase, the `service_role` key also bypasses RLS, which is useful for admin operations but should be kept secret.

---

### Policy Summary by Table

Below is a quick reference of all 24 RLS policies in Love Ledger:

| Table | Policies | Description |
|-------|----------|-------------|
| `profiles` | 4 | Public read, owner modify |
| `locations` | 2 | Public read, authenticated create |
| `posts` | 4 | Active/own read, owner modify |
| `conversations` | 4 | Participant-only access with validation |
| `messages` | 4 | Participant access, sender delete |
| `notifications` | 4 | Owner-only access |

*Detailed documentation for each table's policies follows in the sections below.*

---

### Profiles RLS Policies

The `profiles` table implements **public read, owner-only modify** security pattern with 4 policies.

#### Security Model Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PROFILES RLS SECURITY MODEL                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                           SELECT                                     │   │
│   │                                                                      │   │
│   │   ┌─────────┐     ┌─────────┐     ┌─────────┐                       │   │
│   │   │ User A  │     │ User B  │     │ User C  │                       │   │
│   │   └────┬────┘     └────┬────┘     └────┬────┘                       │   │
│   │        │               │               │                             │   │
│   │        └───────────────┼───────────────┘                             │   │
│   │                        ▼                                             │   │
│   │              ┌─────────────────┐                                     │   │
│   │              │  ALL PROFILES   │  Any authenticated user can        │   │
│   │              │   (Read Only)   │  view any profile                  │   │
│   │              └─────────────────┘                                     │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     INSERT / UPDATE / DELETE                         │   │
│   │                                                                      │   │
│   │   ┌─────────┐           ┌─────────────────┐                         │   │
│   │   │ User A  │──────────▶│ User A Profile  │  ✓ Owner can modify    │   │
│   │   └─────────┘           └─────────────────┘                         │   │
│   │                                                                      │   │
│   │   ┌─────────┐           ┌─────────────────┐                         │   │
│   │   │ User A  │────╳─────▶│ User B Profile  │  ✗ Cannot modify       │   │
│   │   └─────────┘           └─────────────────┘    others' profiles     │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Policy Definitions

##### 1. `profiles_select_all` (SELECT)

```sql
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT
  USING (true);
```

| Aspect | Details |
|--------|---------|
| **Operation** | SELECT |
| **Clause** | `USING (true)` |
| **Effect** | Any authenticated user can read any profile row |
| **Condition** | Always returns true for authenticated users |

**Rationale for Public Read Access:**

The profiles table uses public read access (for authenticated users) because:

1. **Username Display**: When users view posts, conversations, or messages, they need to see the usernames of other participants
2. **Avatar Rendering**: User avatars must be visible throughout the UI for visual identification
3. **Conversation Context**: In chat interfaces, both producer and consumer profiles must be visible to each other
4. **No Sensitive Data**: The profiles table only contains username and avatar configuration—no email, phone, or other PII

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WHY PUBLIC READ FOR PROFILES?                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Post View                 Conversation View           Messages View         │
│  ┌─────────────┐           ┌─────────────┐            ┌─────────────┐       │
│  │ Posted by:  │           │ Chat with:  │            │ From:       │       │
│  │ @JaneD      │◄──────────│ @JaneD      │◄───────────│ @JaneD      │       │
│  │ [Avatar]    │   Need    │ [Avatar]    │   Need     │ "Hello!"    │       │
│  └─────────────┘   Profile └─────────────┘   Profile  └─────────────┘       │
│                    Data                      Data                            │
│                                                                              │
│  Without public read:                                                        │
│  • Posts would show "[Unknown User]"                                         │
│  • Avatars couldn't render in conversations                                  │
│  • Real-time chat would lose participant identity                            │
│                                                                              │
│  Security preserved by:                                                      │
│  • Email stored only in auth.users (not exposed)                            │
│  • No PII in profiles table                                                  │
│  • Modification restricted to owner                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**

```typescript
// ✓ Allowed: Fetch any user's profile for display
const { data: profile } = await supabase
  .from('profiles')
  .select('username, avatar_config')
  .eq('id', otherUserId)
  .single();

// ✓ Allowed: Fetch multiple profiles for a conversation
const { data: participants } = await supabase
  .from('profiles')
  .select('id, username, avatar_config')
  .in('id', [producerId, consumerId]);

// ✓ Allowed: Search for profiles by username pattern
const { data: matches } = await supabase
  .from('profiles')
  .select('*')
  .ilike('username', '%jane%');
```

---

##### 2. `profiles_insert_own` (INSERT)

```sql
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());
```

| Aspect | Details |
|--------|---------|
| **Operation** | INSERT |
| **Clause** | `WITH CHECK (id = auth.uid())` |
| **Effect** | User can only create a profile with their own user ID |
| **Condition** | The `id` field of the new row must match `auth.uid()` |

**Why `WITH CHECK` Instead of `USING`?**

For INSERT operations, `WITH CHECK` validates the **new row being inserted**. There are no existing rows to filter, so `USING` doesn't apply.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INSERT WITH CHECK FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   User (auth.uid() = 'abc-123')                                              │
│       │                                                                      │
│       │  INSERT INTO profiles (id, username, avatar_config)                  │
│       │  VALUES ('abc-123', 'JaneD', '{"style":"female1"}')                 │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │            WITH CHECK Validation                 │                       │
│   │                                                  │                       │
│   │   id = auth.uid()                                │                       │
│   │   'abc-123' = 'abc-123'                          │                       │
│   │                                                  │                       │
│   │   Result: TRUE ✓                                 │                       │
│   └─────────────────────────────────────────────────┘                       │
│       │                                                                      │
│       ▼                                                                      │
│   ✓ Row inserted successfully                                                │
│                                                                              │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                         │
│                                                                              │
│   User (auth.uid() = 'abc-123')                                              │
│       │                                                                      │
│       │  INSERT INTO profiles (id, username, avatar_config)                  │
│       │  VALUES ('xyz-789', 'FakeUser', '{}')  ◄── Wrong ID!                │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │            WITH CHECK Validation                 │                       │
│   │                                                  │                       │
│   │   id = auth.uid()                                │                       │
│   │   'xyz-789' ≠ 'abc-123'                          │                       │
│   │                                                  │                       │
│   │   Result: FALSE ✗                                │                       │
│   └─────────────────────────────────────────────────┘                       │
│       │                                                                      │
│       ▼                                                                      │
│   ✗ INSERT blocked - RLS policy violation                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**

```typescript
// ✓ Allowed: Create your own profile after signup
const { data: newProfile, error } = await supabase
  .from('profiles')
  .insert({
    id: user.id,  // Must match auth.uid()
    username: 'JaneD',
    avatar_config: { style: 'female1', skinTone: 3 }
  })
  .select()
  .single();

// ✗ Blocked: Attempt to create profile for another user
const { error } = await supabase
  .from('profiles')
  .insert({
    id: 'some-other-user-id',  // Does not match auth.uid()
    username: 'FakeProfile',
    avatar_config: {}
  });
// Error: new row violates row-level security policy
```

---

##### 3. `profiles_update_own` (UPDATE)

```sql
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

| Aspect | Details |
|--------|---------|
| **Operation** | UPDATE |
| **Clauses** | `USING (id = auth.uid())` + `WITH CHECK (id = auth.uid())` |
| **USING Effect** | Can only target rows where you are the owner |
| **WITH CHECK Effect** | Cannot change the `id` field to another user's ID |

**Two-Clause Protection:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        UPDATE DUAL CLAUSE PROTECTION                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   UPDATE profiles SET username = 'NewName' WHERE id = 'abc-123'             │
│       │                                                                      │
│       ▼                                                                      │
│   ┌───────────────────────────────────────┐                                  │
│   │        STEP 1: USING Clause            │                                  │
│   │        "Which rows can I target?"      │                                  │
│   │                                        │                                  │
│   │   id = auth.uid()                      │                                  │
│   │   Only rows where id matches current   │                                  │
│   │   user are visible for modification    │                                  │
│   └───────────────────────────────────────┘                                  │
│       │                                                                      │
│       ▼                                                                      │
│   ┌───────────────────────────────────────┐                                  │
│   │      STEP 2: WITH CHECK Clause         │                                  │
│   │      "Is the modified row valid?"      │                                  │
│   │                                        │                                  │
│   │   id = auth.uid()                      │                                  │
│   │   Ensures you can't change 'id' to     │                                  │
│   │   transfer ownership to another user   │                                  │
│   └───────────────────────────────────────┘                                  │
│       │                                                                      │
│       ▼                                                                      │
│   ✓ Update applied (or ✗ blocked)                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why Both Clauses?**

| Clause | Purpose | Without It... |
|--------|---------|---------------|
| `USING` | Filter which rows can be targeted | Users could attempt updates on others' profiles (would fail but leak info) |
| `WITH CHECK` | Validate the resulting row | Users could change `id` to transfer ownership to another user |

**Example Use Cases:**

```typescript
// ✓ Allowed: Update your own profile
const { data, error } = await supabase
  .from('profiles')
  .update({
    username: 'JaneDoe2024',
    avatar_config: { style: 'female2', skinTone: 4 }
  })
  .eq('id', user.id)  // Your own ID
  .select()
  .single();

// ✗ Blocked: Attempt to update another user's profile
const { data, error } = await supabase
  .from('profiles')
  .update({ username: 'Hacked' })
  .eq('id', 'other-user-id');  // Not your ID
// Result: No rows updated (USING filters out the row)

// ✗ Blocked: Attempt to change profile ownership
const { error } = await supabase
  .from('profiles')
  .update({ id: 'other-user-id' })  // Trying to transfer ownership
  .eq('id', user.id);
// Error: new row violates row-level security policy (WITH CHECK fails)
```

---

##### 4. `profiles_delete_own` (DELETE)

```sql
CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE
  USING (id = auth.uid());
```

| Aspect | Details |
|--------|---------|
| **Operation** | DELETE |
| **Clause** | `USING (id = auth.uid())` |
| **Effect** | Can only delete your own profile |
| **Condition** | Only rows where `id` matches `auth.uid()` are deletable |

**Note:** DELETE only uses `USING` (not `WITH CHECK`) because there's no resulting row to validate—the row is being removed.

**Example Use Cases:**

```typescript
// ✓ Allowed: Delete your own profile (account deletion)
const { error } = await supabase
  .from('profiles')
  .delete()
  .eq('id', user.id);

// ✗ Blocked: Attempt to delete another user's profile
const { error } = await supabase
  .from('profiles')
  .delete()
  .eq('id', 'other-user-id');
// Result: No rows deleted (USING filters out the row)
```

**Cascade Behavior:**

When a profile is deleted, the `ON DELETE CASCADE` constraints on related tables automatically remove associated data:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PROFILE DELETE CASCADE EFFECT                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   DELETE FROM profiles WHERE id = 'abc-123'                                  │
│       │                                                                      │
│       ├──────▶ posts (producer_id) ───────────────▶ DELETED                 │
│       │            │                                                         │
│       │            └──▶ conversations (post_id) ──▶ DELETED                 │
│       │                      │                                               │
│       │                      └──▶ messages ───────▶ DELETED                 │
│       │                                                                      │
│       ├──────▶ conversations (producer_id) ───────▶ DELETED                 │
│       │                                                                      │
│       ├──────▶ conversations (consumer_id) ───────▶ DELETED                 │
│       │                                                                      │
│       ├──────▶ messages (sender_id) ──────────────▶ DELETED                 │
│       │                                                                      │
│       └──────▶ notifications (user_id) ───────────▶ DELETED                 │
│                                                                              │
│   All orphaned data is automatically cleaned up                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### Profiles RLS Quick Reference

| Policy | Operation | Clause(s) | Who Can Access |
|--------|-----------|-----------|----------------|
| `profiles_select_all` | SELECT | `USING (true)` | All authenticated users |
| `profiles_insert_own` | INSERT | `WITH CHECK (id = auth.uid())` | Only self |
| `profiles_update_own` | UPDATE | `USING + WITH CHECK (id = auth.uid())` | Only self |
| `profiles_delete_own` | DELETE | `USING (id = auth.uid())` | Only self |

---

### Locations RLS Policies

The `locations` table represents physical places where users create posts. Unlike user-owned data, locations are **shared resources** with a unique security model:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LOCATIONS SECURITY MODEL                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Operation    │ Who Can Perform    │ Rationale                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│   SELECT       │ All authenticated  │ Users browse locations to find posts  │
│   INSERT       │ All authenticated  │ Any user can create a post at a place │
│   UPDATE       │ Service role ONLY  │ post_count managed by triggers        │
│   DELETE       │ Service role ONLY  │ Locations are permanent shared data   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Differences from User-Owned Tables:**

| Aspect | Profiles/Posts/etc. | Locations |
|--------|---------------------|-----------|
| Ownership | User owns their rows | Shared resource |
| Updates | Owner can update | System-managed only |
| Deletion | Owner can delete | Never deleted |
| Data Source | User input | Google Places API |

#### Security Model Rationale

Locations in Love Ledger are:

1. **Immutable Reference Data**: Location details (name, address, coordinates) come from Google Places API and should not be modified by users
2. **Shared Across Users**: Multiple users can post at the same location; no single user "owns" a location
3. **Counter Cache Managed**: The `post_count` field is incremented/decremented by database triggers when posts are created/deleted
4. **Permanent Records**: Locations should never be deleted as they may be referenced by historical posts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LOCATION DATA FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Google Places API                                                          │
│         │                                                                    │
│         │ Search/Autocomplete                                                │
│         ▼                                                                    │
│   ┌─────────────────┐         ┌─────────────────┐                           │
│   │   Frontend      │         │   Supabase      │                           │
│   │   (User picks   │────────▶│   INSERT        │                           │
│   │    a location)  │         │   (if new)      │                           │
│   └─────────────────┘         └─────────────────┘                           │
│                                      │                                       │
│                                      ▼                                       │
│                               ┌─────────────────┐                           │
│                               │   locations     │                           │
│                               │   table         │◄──────┐                   │
│                               │                 │       │                   │
│                               │   post_count    │───────┤  Triggers         │
│                               │   managed by    │       │  manage           │
│                               │   triggers      │◄──────┘  this field       │
│                               └─────────────────┘                           │
│                                                                              │
│   User actions on locations:                                                 │
│   ✓ SELECT - Browse and search locations                                    │
│   ✓ INSERT - Add new location when creating a post                          │
│   ✗ UPDATE - Only triggers can modify (post_count)                          │
│   ✗ DELETE - Locations are permanent                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Policy Definitions

##### 1. `locations_select_all` (SELECT)

```sql
CREATE POLICY "locations_select_all" ON locations
  FOR SELECT
  USING (true);
```

| Aspect | Details |
|--------|---------|
| **Operation** | SELECT |
| **Clause** | `USING (true)` |
| **Effect** | Any authenticated user can read all locations |
| **Condition** | Always returns true for authenticated users |

**Rationale for Public Read Access:**

Locations must be publicly readable (for authenticated users) because:

1. **Location Discovery**: Users need to browse locations to find posts near them
2. **Search Functionality**: The app's core feature requires searching for locations by name, type, or proximity
3. **Post Context**: Every post displays its location; users must be able to resolve location details
4. **Map Views**: Location coordinates and details are shown on maps throughout the UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WHY PUBLIC READ FOR LOCATIONS?                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Nearby Search              Post Detail               Create Post           │
│   ┌─────────────┐           ┌─────────────┐           ┌─────────────┐       │
│   │ Starbucks   │           │ Posted at:  │           │ Select      │       │
│   │ 0.3 mi      │◄──────────│ Starbucks   │           │ Location:   │       │
│   │ 5 posts     │   Need    │ Main Street │◄──────────│ [Search...] │       │
│   │             │   Location│ [Map Pin]   │   Need    │             │       │
│   │ Planet      │   Data    └─────────────┘   Location│ ▼ Starbucks │       │
│   │ Fitness     │                             Data    │ ▼ Target    │       │
│   │ 0.5 mi      │                                     │ ▼ Gym       │       │
│   │ 2 posts     │                                     └─────────────┘       │
│   └─────────────┘                                                            │
│                                                                              │
│   Without public read:                                                       │
│   • Users couldn't browse locations with posts                               │
│   • Posts would show "[Unknown Location]"                                   │
│   • Proximity search would fail                                              │
│   • Map features would be broken                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**

```typescript
// ✓ Allowed: Fetch all locations
const { data: locations } = await supabase
  .from('locations')
  .select('*');

// ✓ Allowed: Fetch locations by proximity (PostGIS)
const { data: nearbyLocations } = await supabase
  .rpc('get_locations_within_radius', {
    lat: 40.7128,
    lng: -74.0060,
    radius_meters: 5000
  });

// ✓ Allowed: Fetch a specific location by Google Place ID
const { data: location } = await supabase
  .from('locations')
  .select('*')
  .eq('google_place_id', 'ChIJN1t_tDeuEmsRUsoyG83frY4')
  .single();

// ✓ Allowed: Fetch locations with post counts
const { data: activeLocations } = await supabase
  .from('locations')
  .select('id, name, address, post_count')
  .gt('post_count', 0)
  .order('post_count', { ascending: false });
```

---

##### 2. `locations_insert_authenticated` (INSERT)

```sql
CREATE POLICY "locations_insert_authenticated" ON locations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

| Aspect | Details |
|--------|---------|
| **Operation** | INSERT |
| **Clause** | `WITH CHECK (auth.role() = 'authenticated')` |
| **Effect** | Any authenticated user can insert a new location |
| **Condition** | User must be logged in (not anonymous) |

**Understanding `auth.role()` vs `auth.uid()`:**

| Function | Returns | Use Case |
|----------|---------|----------|
| `auth.uid()` | Current user's UUID | Row ownership checks (`id = auth.uid()`) |
| `auth.role()` | Authentication role | Role-based access (`'authenticated'`, `'anon'`, `'service_role'`) |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      auth.role() VALUES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Role            │ Description                  │ Example Context           │
│  ─────────────────────────────────────────────────────────────────────────  │
│   'anon'          │ Anonymous (not logged in)    │ Public API access         │
│   'authenticated' │ Logged-in user               │ User session active       │
│   'service_role'  │ Backend with service key     │ Server-side operations    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why Use `auth.role()` Instead of Ownership Check?**

Locations are shared resources—there's no `user_id` column because:

1. **No Single Owner**: A Starbucks location isn't "owned" by the first user who added it
2. **Insert-Only Pattern**: Users add locations when creating posts, but don't "own" them
3. **Google Place ID Uniqueness**: The `google_place_id` constraint prevents duplicates regardless of who inserts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LOCATION INSERT FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   User A creates a post at "Starbucks Main St"                               │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │        Location Already Exists?                  │                       │
│   │        (Check google_place_id)                   │                       │
│   └─────────────────────────────────────────────────┘                       │
│       │                          │                                           │
│       │ NO                       │ YES                                       │
│       ▼                          ▼                                           │
│   ┌─────────────────┐    ┌─────────────────┐                                │
│   │ INSERT location │    │ Use existing ID │                                │
│   │ (RLS allows -   │    │ (No insert      │                                │
│   │  user is authed)│    │  needed)        │                                │
│   └─────────────────┘    └─────────────────┘                                │
│       │                          │                                           │
│       └──────────────┬───────────┘                                          │
│                      ▼                                                       │
│   ┌─────────────────────────────────────────────────┐                       │
│   │        Create post with location_id             │                       │
│   └─────────────────────────────────────────────────┘                       │
│                                                                              │
│   User B later creates a post at the same Starbucks:                        │
│   • Location already exists (same google_place_id)                          │
│   • No INSERT needed, use existing location_id                              │
│   • post_count incremented by trigger                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**

```typescript
// ✓ Allowed: Insert a new location (authenticated user)
const { data: newLocation, error } = await supabase
  .from('locations')
  .insert({
    google_place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    name: 'Starbucks',
    address: '123 Main Street, New York, NY 10001',
    latitude: 40.7128,
    longitude: -74.0060,
    place_types: ['cafe', 'food', 'point_of_interest']
  })
  .select()
  .single();

// ✓ Allowed: Upsert pattern for post creation
const { data: location } = await supabase
  .from('locations')
  .upsert(
    {
      google_place_id: placeId,
      name: placeName,
      address: placeAddress,
      latitude: lat,
      longitude: lng,
      place_types: types
    },
    { onConflict: 'google_place_id', ignoreDuplicates: true }
  )
  .select()
  .single();

// ✗ Blocked: Anonymous insert attempt
// (Would fail because auth.role() !== 'authenticated')
```

---

##### No UPDATE Policy (Service Role Only)

**There is intentionally no UPDATE policy for locations.** Updates are restricted to the service role only.

```sql
-- NO USER-FACING UPDATE POLICY EXISTS
-- Only the service role (which bypasses RLS) can update locations
```

| Aspect | Details |
|--------|---------|
| **Policy** | None (denied by default) |
| **Who Can Update** | Service role only (bypasses RLS) |
| **Primary Use** | Trigger-managed `post_count` field |

**Why Restrict Updates?**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WHY NO USER UPDATES FOR LOCATIONS?                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. DATA INTEGRITY                                                          │
│   ─────────────────                                                          │
│   Location data comes from Google Places API. Allowing user edits would:     │
│   • Create inconsistency with the authoritative source                       │
│   • Enable misinformation about places                                       │
│   • Break geospatial searches if coordinates are changed                     │
│                                                                              │
│   2. POST_COUNT CONSISTENCY                                                  │
│   ─────────────────────────                                                  │
│   The post_count field is a counter cache managed by triggers:               │
│                                                                              │
│   ┌─────────────────┐    trigger     ┌─────────────────┐                    │
│   │ INSERT post     │ ─────────────▶ │ INCREMENT       │                    │
│   │ at location X   │                │ post_count      │                    │
│   └─────────────────┘                └─────────────────┘                    │
│                                                                              │
│   ┌─────────────────┐    trigger     ┌─────────────────┐                    │
│   │ DELETE post     │ ─────────────▶ │ DECREMENT       │                    │
│   │ at location X   │                │ post_count      │                    │
│   └─────────────────┘                └─────────────────┘                    │
│                                                                              │
│   If users could update post_count:                                          │
│   • Counts would become incorrect                                            │
│   • Malicious users could hide active locations                              │
│   • Analytics would be unreliable                                            │
│                                                                              │
│   3. NO OWNERSHIP CONCEPT                                                    │
│   ───────────────────────                                                    │
│   There's no user_id on locations, so there's no logical "owner" who         │
│   should have update privileges.                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Trigger-Managed `post_count`:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      POST_COUNT TRIGGER FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   User creates a post                                                        │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │        INSERT INTO posts (...)                   │                       │
│   └─────────────────────────────────────────────────┘                       │
│       │                                                                      │
│       │ AFTER INSERT trigger fires                                           │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │   increment_location_post_count()                │                       │
│   │   ─────────────────────────────────              │                       │
│   │   UPDATE locations                               │                       │
│   │   SET post_count = post_count + 1               │                       │
│   │   WHERE id = NEW.location_id                     │                       │
│   │                                                  │                       │
│   │   Runs with SECURITY DEFINER                     │                       │
│   │   (executes as function owner, not user)         │                       │
│   └─────────────────────────────────────────────────┘                       │
│       │                                                                      │
│       ▼                                                                      │
│   Location post_count updated automatically                                  │
│   (User never directly touches locations table)                              │
│                                                                              │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                         │
│                                                                              │
│   User deletes a post                                                        │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │        DELETE FROM posts WHERE ...               │                       │
│   └─────────────────────────────────────────────────┘                       │
│       │                                                                      │
│       │ AFTER DELETE trigger fires                                           │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │   decrement_location_post_count()                │                       │
│   │   ─────────────────────────────────              │                       │
│   │   UPDATE locations                               │                       │
│   │   SET post_count = post_count - 1               │                       │
│   │   WHERE id = OLD.location_id                     │                       │
│   └─────────────────────────────────────────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**SECURITY DEFINER Functions:**

The trigger functions use `SECURITY DEFINER`, which means:
- They execute with the privileges of the function owner (typically the DB admin)
- They can update locations even though users cannot directly
- This is safe because the trigger logic is controlled, not arbitrary user input

```typescript
// ✗ Blocked: User attempting to update a location
const { error } = await supabase
  .from('locations')
  .update({ name: 'Malicious Name Change' })
  .eq('id', locationId);
// Error: new row violates row-level security policy
// (No UPDATE policy exists, so all updates are denied)

// ✗ Blocked: User attempting to manipulate post_count
const { error } = await supabase
  .from('locations')
  .update({ post_count: 9999 })
  .eq('id', locationId);
// Error: new row violates row-level security policy

// ✓ This happens automatically via triggers when posts are created/deleted
// Users never need to (and cannot) update locations directly
```

---

##### No DELETE Policy (Service Role Only)

**There is intentionally no DELETE policy for locations.** Deletions are restricted to the service role only.

```sql
-- NO USER-FACING DELETE POLICY EXISTS
-- Only the service role (which bypasses RLS) can delete locations
```

| Aspect | Details |
|--------|---------|
| **Policy** | None (denied by default) |
| **Who Can Delete** | Service role only (bypasses RLS) |
| **Rationale** | Locations are permanent shared resources |

**Why Prevent Location Deletion?**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WHY LOCATIONS ARE NEVER DELETED                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. REFERENTIAL INTEGRITY                                                   │
│   ─────────────────────────                                                  │
│   Posts reference locations via foreign key. Deleting a location would:     │
│   • CASCADE delete all posts at that location (if configured)               │
│   • Or cause foreign key violations                                          │
│                                                                              │
│   2. HISTORICAL DATA PRESERVATION                                            │
│   ─────────────────────────────────                                          │
│   Even if a location has no active posts:                                    │
│   • Past conversations reference the location via their post                │
│   • Audit trails and analytics depend on location history                   │
│   • The location may become active again                                     │
│                                                                              │
│   3. SHARED RESOURCE NATURE                                                  │
│   ──────────────────────────                                                 │
│   If users could delete locations:                                           │
│   • User A could delete a location, affecting User B's posts                │
│   • Malicious users could disrupt the platform                               │
│   • No single user "owns" a location to justify deletion rights             │
│                                                                              │
│   4. GOOGLE PLACES CONSISTENCY                                               │
│   ─────────────────────────────                                              │
│   Locations mirror real-world places that don't disappear:                   │
│   • A business might close, but the address still exists                    │
│   • The google_place_id remains valid for reference                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Administrative Cleanup (Service Role Only):**

In rare cases, the service role may need to delete locations (e.g., duplicate cleanup, data migration):

```typescript
// ✓ Service role can delete (bypasses RLS)
// This would only be done in admin scripts or migrations
const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY);

await supabaseAdmin
  .from('locations')
  .delete()
  .eq('id', duplicateLocationId);

// ✗ Regular authenticated user cannot delete
const { error } = await supabase
  .from('locations')
  .delete()
  .eq('id', locationId);
// Error: new row violates row-level security policy
```

---

#### Locations RLS Quick Reference

| Policy | Operation | Clause(s) | Who Can Access |
|--------|-----------|-----------|----------------|
| `locations_select_all` | SELECT | `USING (true)` | All authenticated users |
| `locations_insert_authenticated` | INSERT | `WITH CHECK (auth.role() = 'authenticated')` | Any authenticated user |
| *(none)* | UPDATE | N/A | Service role only |
| *(none)* | DELETE | N/A | Service role only |

**Key Takeaways:**

1. **Locations are shared, immutable reference data** - unlike user-owned tables
2. **`auth.role()` is used instead of `auth.uid()`** - because there's no ownership column
3. **No UPDATE/DELETE policies exist** - RLS defaults to deny, so users cannot modify/delete
4. **`post_count` is trigger-managed** - using `SECURITY DEFINER` functions that bypass RLS
5. **Service role bypasses RLS** - for administrative operations only

---

### Posts RLS Policies

The `posts` table implements **visibility-aware access control** with 4 policies. Unlike profiles (public read) or locations (shared resource), posts have nuanced visibility rules: active posts are public, but inactive posts are only visible to their producer.

#### Security Model Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         POSTS RLS SECURITY MODEL                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                           SELECT                                     │   │
│   │                                                                      │   │
│   │   Active Posts (is_active = true)                                   │   │
│   │   ┌─────────┐     ┌─────────┐     ┌─────────┐                       │   │
│   │   │ User A  │     │ User B  │     │ User C  │                       │   │
│   │   └────┬────┘     └────┬────┘     └────┬────┘                       │   │
│   │        └───────────────┼───────────────┘                             │   │
│   │                        ▼                                             │   │
│   │              ┌─────────────────┐                                     │   │
│   │              │  ALL ACTIVE     │  Any user can see                  │   │
│   │              │     POSTS       │  active posts                      │   │
│   │              └─────────────────┘                                     │   │
│   │                                                                      │   │
│   │   Inactive Posts (is_active = false)                                │   │
│   │   ┌─────────┐                 ┌─────────────────┐                   │   │
│   │   │Producer │────────────────▶│ Producer's Own  │  ✓ Producer      │   │
│   │   └─────────┘                 │ Inactive Posts  │    can see       │   │
│   │                               └─────────────────┘                   │   │
│   │   ┌─────────┐                 ┌─────────────────┐                   │   │
│   │   │ Other   │───────╳────────▶│ Producer's Own  │  ✗ Others        │   │
│   │   │ Users   │                 │ Inactive Posts  │    cannot see    │   │
│   │   └─────────┘                 └─────────────────┘                   │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     INSERT / UPDATE / DELETE                         │   │
│   │                                                                      │   │
│   │   ┌─────────┐           ┌─────────────────┐                         │   │
│   │   │Producer │──────────▶│  Producer's     │  ✓ Producer can        │   │
│   │   └─────────┘           │  Own Posts      │    create/modify       │   │
│   │                         └─────────────────┘                         │   │
│   │                                                                      │   │
│   │   ┌─────────┐           ┌─────────────────┐                         │   │
│   │   │ Other   │────╳─────▶│  Producer's     │  ✗ Cannot modify       │   │
│   │   │ Users   │           │  Own Posts      │    others' posts       │   │
│   │   └─────────┘           └─────────────────┘                         │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Understanding Active/Inactive Post Visibility

The posts table uses `is_active` to control visibility:

| `is_active` | Meaning | Who Can See |
|-------------|---------|-------------|
| `true` | Post is live and discoverable | All authenticated users |
| `false` | Post is hidden/deactivated | Only the producer (owner) |

**Common Scenarios for Inactive Posts:**

1. **Manual Deactivation**: Producer hides post after connecting with someone
2. **Match Confirmed**: Producer marks post as resolved after successful match
3. **Content Moderation**: Admin deactivates inappropriate content
4. **Expired Posts**: Application sets `is_active = false` when post expires

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      POST VISIBILITY STATE DIAGRAM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────┐                     ┌──────────────────┐             │
│   │                  │                     │                  │             │
│   │   is_active =    │                     │   is_active =    │             │
│   │      true        │                     │     false        │             │
│   │                  │                     │                  │             │
│   │ ┌──────────────┐ │                     │ ┌──────────────┐ │             │
│   │ │ Visible to   │ │   Deactivate       │ │ Visible ONLY │ │             │
│   │ │ ALL users    │ │ ─────────────────▶ │ │ to producer  │ │             │
│   │ │ in searches  │ │                     │ │              │ │             │
│   │ │ and feeds    │ │                     │ │ Hidden from  │ │             │
│   │ └──────────────┘ │   Reactivate       │ │ all searches │ │             │
│   │                  │ ◀───────────────── │ │              │ │             │
│   └──────────────────┘                     │ └──────────────┘ │             │
│                                            └──────────────────┘             │
│                                                                              │
│   Use Cases:                                                                 │
│   • Producer reviewing their post history (sees all own posts)              │
│   • Feed showing active posts only (filters is_active = true)               │
│   • Producer reactivating an old post (UPDATE their own post)               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Policy Definitions

##### 1. `posts_select_active` (SELECT)

```sql
CREATE POLICY "posts_select_active" ON posts
  FOR SELECT
  USING (is_active = true OR producer_id = auth.uid());
```

| Aspect | Details |
|--------|---------|
| **Operation** | SELECT |
| **Clause** | `USING (is_active = true OR producer_id = auth.uid())` |
| **Effect** | Users can see active posts OR their own posts (active or inactive) |
| **Condition** | Either `is_active = true` OR the post belongs to the current user |

**Breaking Down the Logic:**

The `OR` condition creates two paths to visibility:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      posts_select_active LOGIC FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Query: SELECT * FROM posts WHERE id = 'abc-123'                            │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │        RLS Policy Evaluation                     │                       │
│   │        USING (is_active = true                   │                       │
│   │               OR producer_id = auth.uid())       │                       │
│   └─────────────────────────────────────────────────┘                       │
│       │                                                                      │
│       ├─────────────────────────────────────────────────────────────────┐   │
│       │                                                                  │   │
│       ▼                                                                  ▼   │
│   ┌─────────────────┐                           ┌─────────────────┐         │
│   │ Path 1:         │                           │ Path 2:         │         │
│   │ is_active=true? │                           │ My post?        │         │
│   │                 │                           │ producer_id =   │         │
│   │                 │                           │   auth.uid()    │         │
│   └────────┬────────┘                           └────────┬────────┘         │
│            │                                              │                  │
│       YES  │  NO                                     YES  │  NO             │
│            ▼  ▼                                           ▼  ▼              │
│          ┌─────┐ ┌─────┐                              ┌─────┐ ┌─────┐       │
│          │  ✓  │ │Check│                              │  ✓  │ │  ✗  │       │
│          │Show │ │Path2│                              │Show │ │Hide │       │
│          └─────┘ └─────┘                              └─────┘ └─────┘       │
│                                                                              │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │
│                                                                              │
│   Examples:                                                                  │
│                                                                              │
│   Post A: is_active=true, producer_id='user-123'                            │
│   User 'user-456' queries:  ✓ Visible (is_active = true)                    │
│   User 'user-123' queries:  ✓ Visible (both conditions true)               │
│                                                                              │
│   Post B: is_active=false, producer_id='user-123'                           │
│   User 'user-456' queries:  ✗ Hidden (is_active=false, not owner)          │
│   User 'user-123' queries:  ✓ Visible (producer_id = auth.uid())           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why This Pattern?**

| Scenario | Without Fallback | With Producer Fallback |
|----------|------------------|------------------------|
| Producer views their deactivated post | ✗ Hidden | ✓ Visible |
| Producer reactivates old post | ✗ Can't find it | ✓ Can find and update |
| Producer sees all post history | ✗ Only active posts | ✓ Complete history |
| Non-owner sees inactive post | ✗ Hidden | ✗ Still hidden |

**Example Use Cases:**

```typescript
// ✓ Allowed: Fetch all active posts (public feed)
const { data: activePosts } = await supabase
  .from('posts')
  .select('*, location:locations(*), producer:profiles(*)')
  .eq('is_active', true)
  .order('created_at', { ascending: false });
// Returns: All active posts from all users

// ✓ Allowed: Producer fetches their own posts (including inactive)
const { data: myPosts } = await supabase
  .from('posts')
  .select('*')
  .eq('producer_id', user.id);
// Returns: All of user's posts, both active and inactive

// ✓ Allowed: Producer fetches a specific inactive post they own
const { data: myInactivePost } = await supabase
  .from('posts')
  .select('*')
  .eq('id', inactivePostId)
  .eq('producer_id', user.id)  // User owns this post
  .single();
// Returns: The inactive post (because producer_id = auth.uid())

// ✗ Blocked: User tries to fetch another user's inactive post
const { data: otherInactivePost } = await supabase
  .from('posts')
  .select('*')
  .eq('id', inactivePostId)
  .single();
// Returns: null (is_active=false AND producer_id != auth.uid())
```

---

##### 2. `posts_insert_own` (INSERT)

```sql
CREATE POLICY "posts_insert_own" ON posts
  FOR INSERT
  WITH CHECK (producer_id = auth.uid());
```

| Aspect | Details |
|--------|---------|
| **Operation** | INSERT |
| **Clause** | `WITH CHECK (producer_id = auth.uid())` |
| **Effect** | User can only create posts where they are the producer |
| **Condition** | The `producer_id` of the new post must match `auth.uid()` |

**Preventing Impersonation:**

This policy prevents users from creating posts that appear to be from other users:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      posts_insert_own VALIDATION                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   User (auth.uid() = 'user-123')                                            │
│       │                                                                      │
│       │  INSERT INTO posts (producer_id, location_id, ...)                  │
│       │  VALUES ('user-123', 'loc-abc', ...)                                │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │          WITH CHECK Validation                   │                       │
│   │                                                  │                       │
│   │   producer_id = auth.uid()                       │                       │
│   │   'user-123' = 'user-123'                        │                       │
│   │                                                  │                       │
│   │   Result: TRUE ✓                                 │                       │
│   └─────────────────────────────────────────────────┘                       │
│       │                                                                      │
│       ▼                                                                      │
│   ✓ Post created successfully                                                │
│                                                                              │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                         │
│                                                                              │
│   User (auth.uid() = 'user-123')                                            │
│       │                                                                      │
│       │  INSERT INTO posts (producer_id, location_id, ...)                  │
│       │  VALUES ('user-456', 'loc-abc', ...)  ◄── Impersonation attempt!    │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │          WITH CHECK Validation                   │                       │
│   │                                                  │                       │
│   │   producer_id = auth.uid()                       │                       │
│   │   'user-456' ≠ 'user-123'                        │                       │
│   │                                                  │                       │
│   │   Result: FALSE ✗                                │                       │
│   └─────────────────────────────────────────────────┘                       │
│       │                                                                      │
│       ▼                                                                      │
│   ✗ INSERT blocked - Cannot create posts for other users                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**

```typescript
// ✓ Allowed: Create your own post
const { data: newPost, error } = await supabase
  .from('posts')
  .insert({
    producer_id: user.id,  // Must match auth.uid()
    location_id: locationId,
    target_description: 'Tall person with red jacket',
    message: 'We made eye contact at the coffee shop!',
    seen_at: new Date().toISOString(),
    target_avatar: { hairColor: 'brown', height: 'tall' }
  })
  .select()
  .single();

// ✗ Blocked: Attempt to create post for another user
const { error } = await supabase
  .from('posts')
  .insert({
    producer_id: 'some-other-user-id',  // Not auth.uid()!
    location_id: locationId,
    target_description: 'Impersonation attempt',
    message: 'This should not work',
    seen_at: new Date().toISOString()
  });
// Error: new row violates row-level security policy
```

---

##### 3. `posts_update_own` (UPDATE)

```sql
CREATE POLICY "posts_update_own" ON posts
  FOR UPDATE
  USING (producer_id = auth.uid())
  WITH CHECK (producer_id = auth.uid());
```

| Aspect | Details |
|--------|---------|
| **Operation** | UPDATE |
| **Clauses** | `USING (producer_id = auth.uid())` + `WITH CHECK (producer_id = auth.uid())` |
| **USING Effect** | Can only target posts where you are the producer |
| **WITH CHECK Effect** | Cannot transfer ownership by changing `producer_id` |

**Dual Protection Explained:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      posts_update_own DUAL CLAUSE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   UPDATE posts SET message = 'New message' WHERE id = 'post-abc'             │
│       │                                                                      │
│       ▼                                                                      │
│   ┌───────────────────────────────────────┐                                  │
│   │        STEP 1: USING Clause            │                                  │
│   │        "Which posts can I target?"     │                                  │
│   │                                        │                                  │
│   │   producer_id = auth.uid()             │                                  │
│   │                                        │                                  │
│   │   Only posts where user is producer    │                                  │
│   │   are visible for modification         │                                  │
│   └───────────────────────────────────────┘                                  │
│       │                                                                      │
│       ▼                                                                      │
│   ┌───────────────────────────────────────┐                                  │
│   │      STEP 2: WITH CHECK Clause         │                                  │
│   │      "Is the modified row valid?"      │                                  │
│   │                                        │                                  │
│   │   producer_id = auth.uid()             │                                  │
│   │                                        │                                  │
│   │   Ensures producer_id cannot be        │                                  │
│   │   changed to transfer ownership        │                                  │
│   └───────────────────────────────────────┘                                  │
│       │                                                                      │
│       ▼                                                                      │
│   ✓ Update applied (or ✗ blocked)                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Common Update Operations:**

| Update Action | Allowed? | Reason |
|---------------|----------|--------|
| Change `message` text | ✓ | Owner updating content |
| Change `target_description` | ✓ | Owner updating content |
| Set `is_active = false` | ✓ | Owner deactivating post |
| Set `is_active = true` | ✓ | Owner reactivating post |
| Extend `expires_at` | ✓ | Owner extending visibility |
| Change `producer_id` | ✗ | Cannot transfer ownership |
| Update another user's post | ✗ | Not the owner |

**Example Use Cases:**

```typescript
// ✓ Allowed: Deactivate your own post
const { data, error } = await supabase
  .from('posts')
  .update({ is_active: false })
  .eq('id', postId)
  .eq('producer_id', user.id)  // Ensures ownership
  .select()
  .single();

// ✓ Allowed: Reactivate your own post
const { data, error } = await supabase
  .from('posts')
  .update({ is_active: true })
  .eq('id', postId)
  .eq('producer_id', user.id)
  .select()
  .single();

// ✓ Allowed: Update post content
const { data, error } = await supabase
  .from('posts')
  .update({
    message: 'Updated message with more details',
    target_description: 'More specific description'
  })
  .eq('id', postId)
  .eq('producer_id', user.id)
  .select()
  .single();

// ✓ Allowed: Extend post expiration
const newExpiry = new Date();
newExpiry.setDate(newExpiry.getDate() + 30);
const { data, error } = await supabase
  .from('posts')
  .update({ expires_at: newExpiry.toISOString() })
  .eq('id', postId)
  .eq('producer_id', user.id)
  .select()
  .single();

// ✗ Blocked: Attempt to update another user's post
const { data, error } = await supabase
  .from('posts')
  .update({ is_active: false })
  .eq('id', otherUsersPostId);
// Result: No rows updated (USING filters out the row)

// ✗ Blocked: Attempt to transfer post ownership
const { error } = await supabase
  .from('posts')
  .update({ producer_id: 'other-user-id' })  // Ownership transfer
  .eq('id', postId)
  .eq('producer_id', user.id);
// Error: new row violates row-level security policy (WITH CHECK fails)
```

---

##### 4. `posts_delete_own` (DELETE)

```sql
CREATE POLICY "posts_delete_own" ON posts
  FOR DELETE
  USING (producer_id = auth.uid());
```

| Aspect | Details |
|--------|---------|
| **Operation** | DELETE |
| **Clause** | `USING (producer_id = auth.uid())` |
| **Effect** | Can only delete posts where you are the producer |
| **Condition** | Only posts where `producer_id` matches `auth.uid()` can be deleted |

**Note:** DELETE only uses `USING` (not `WITH CHECK`) because there's no resulting row to validate—the row is being removed.

**Cascade Effects:**

When a post is deleted, related data is automatically cleaned up:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      POST DELETE CASCADE EFFECT                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   DELETE FROM posts WHERE id = 'post-abc' AND producer_id = auth.uid()       │
│       │                                                                      │
│       │ RLS Check: producer_id = auth.uid()                                 │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────┐                                                        │
│   │ Post Deleted    │                                                        │
│   └────────┬────────┘                                                        │
│            │                                                                 │
│            ├──────▶ conversations (post_id FK) ──────────▶ DELETED          │
│            │            │                                                    │
│            │            └──▶ messages (conversation_id FK) ─▶ DELETED       │
│            │                                                                 │
│            └──────▶ TRIGGER: decrement_location_post_count()                │
│                         │                                                    │
│                         └──▶ location.post_count -= 1                       │
│                                                                              │
│   All conversations and messages for this post are automatically deleted.   │
│   Location's post_count is decremented by the trigger.                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**

```typescript
// ✓ Allowed: Delete your own post
const { error } = await supabase
  .from('posts')
  .delete()
  .eq('id', postId)
  .eq('producer_id', user.id);  // Ensures ownership

// ✗ Blocked: Attempt to delete another user's post
const { error } = await supabase
  .from('posts')
  .delete()
  .eq('id', otherUsersPostId);
// Result: No rows deleted (USING filters out the row)

// Note: Typically prefer deactivation over deletion for data retention
const { error } = await supabase
  .from('posts')
  .update({ is_active: false })  // Soft delete
  .eq('id', postId)
  .eq('producer_id', user.id);
```

---

#### Posts RLS Quick Reference

| Policy | Operation | Clause(s) | Who Can Access |
|--------|-----------|-----------|----------------|
| `posts_select_active` | SELECT | `USING (is_active = true OR producer_id = auth.uid())` | All users (active posts) or producer (all own posts) |
| `posts_insert_own` | INSERT | `WITH CHECK (producer_id = auth.uid())` | Only self (as producer) |
| `posts_update_own` | UPDATE | `USING + WITH CHECK (producer_id = auth.uid())` | Only producer |
| `posts_delete_own` | DELETE | `USING (producer_id = auth.uid())` | Only producer |

**Key Takeaways:**

1. **Active/Inactive visibility pattern** - `is_active` controls public visibility while producers always see their own posts
2. **Producer ownership** - All write operations require `producer_id = auth.uid()`
3. **No ownership transfer** - UPDATE's `WITH CHECK` prevents changing `producer_id`
4. **Cascade on delete** - Deleting a post removes all associated conversations and messages
5. **Prefer deactivation** - Use `is_active = false` instead of DELETE for soft deletes

---

### Conversations RLS Policies

The `conversations` table implements **participant-only access control** with 4 policies. Conversations are private channels between a post producer and a consumer who responded—only these two participants can access, modify, or delete the conversation.

#### Security Model Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CONVERSATIONS RLS SECURITY MODEL                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                           SELECT                                     │   │
│   │                                                                      │   │
│   │   ┌──────────┐            ┌─────────────────┐                       │   │
│   │   │ Producer │───────────▶│  Conversation   │  ✓ Producer can view │   │
│   │   └──────────┘            └─────────────────┘                       │   │
│   │                                   ▲                                  │   │
│   │   ┌──────────┐                    │                                  │   │
│   │   │ Consumer │────────────────────┘            ✓ Consumer can view  │   │
│   │   └──────────┘                                                       │   │
│   │                                                                      │   │
│   │   ┌──────────┐            ┌─────────────────┐                       │   │
│   │   │ Other    │─────╳─────▶│  Conversation   │  ✗ Others blocked    │   │
│   │   │ Users    │            └─────────────────┘                       │   │
│   │   └──────────┘                                                       │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                           INSERT                                     │   │
│   │                                                                      │   │
│   │   ┌──────────┐            ┌─────────────────┐                       │   │
│   │   │ Consumer │──────────▶ │  New Response   │  ✓ Consumer creates  │   │
│   │   │ (not     │   create   │  to a Post      │    response to post  │   │
│   │   │ producer)│            └─────────────────┘                       │   │
│   │   └──────────┘                                                       │   │
│   │                                                                      │   │
│   │   ┌──────────┐            ┌─────────────────┐                       │   │
│   │   │ Producer │─────╳─────▶│  Self-Response  │  ✗ Cannot respond    │   │
│   │   │ (of post)│            │                 │    to own post       │   │
│   │   └──────────┘            └─────────────────┘                       │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      UPDATE / DELETE                                 │   │
│   │                                                                      │   │
│   │   ┌──────────┐            ┌─────────────────┐                       │   │
│   │   │ Producer │──────────▶ │  Conversation   │  ✓ Producer can      │   │
│   │   │    OR    │   modify   │                 │    modify/delete     │   │
│   │   │ Consumer │──────────▶ │                 │  ✓ Consumer can      │   │
│   │   └──────────┘            └─────────────────┘    modify/delete     │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Key Security Concepts

**1. Participant-Only Access**

Conversations are strictly private between producer and consumer:

| User Role | SELECT | INSERT | UPDATE | DELETE |
|-----------|--------|--------|--------|--------|
| Producer (post creator) | ✓ | ✗ | ✓ | ✓ |
| Consumer (responder) | ✓ | ✓ | ✓ | ✓ |
| Other Users | ✗ | ✗ | ✗ | ✗ |

**2. Self-Response Prevention**

The INSERT policy prevents producers from responding to their own posts:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SELF-RESPONSE PREVENTION                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   User A creates a post                                                      │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────┐                                                        │
│   │ Post            │                                                        │
│   │ producer_id:    │                                                        │
│   │   'user-A'      │                                                        │
│   └─────────────────┘                                                        │
│       │                                                                      │
│       ├─── User A tries to respond ──▶ ✗ BLOCKED                            │
│       │    (producer_id = consumer_id)   (self-response)                     │
│       │                                                                      │
│       └─── User B responds ──────────▶ ✓ ALLOWED                            │
│            (producer_id ≠ consumer_id)   (valid response)                    │
│                                                                              │
│   The INSERT policy uses: producer_id != auth.uid()                         │
│   Combined with: consumer_id = auth.uid()                                   │
│                                                                              │
│   This ensures:                                                              │
│   • The responding user IS the consumer (consumer_id = auth.uid())          │
│   • The responding user is NOT the producer (producer_id != auth.uid())     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**3. Post Validation on Insert**

The INSERT policy validates that the referenced post exists, is active, and the producer_id matches:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      POST VALIDATION ON INSERT                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   INSERT INTO conversations (post_id, producer_id, consumer_id, ...)        │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │            EXISTS Subquery Validation            │                       │
│   │                                                  │                       │
│   │   SELECT 1 FROM posts                            │                       │
│   │   WHERE posts.id = [provided post_id]            │                       │
│   │     AND posts.producer_id = [provided producer]  │                       │
│   │     AND posts.is_active = true                   │                       │
│   │                                                  │                       │
│   └─────────────────────────────────────────────────┘                       │
│       │                                                                      │
│       ├─── Post exists, active, producer matches ──▶ ✓ INSERT allowed       │
│       │                                                                      │
│       ├─── Post doesn't exist ────────────────────▶ ✗ INSERT blocked        │
│       │                                                                      │
│       ├─── Post is inactive (is_active = false) ──▶ ✗ INSERT blocked        │
│       │                                                                      │
│       └─── producer_id mismatch ──────────────────▶ ✗ INSERT blocked        │
│                                                                              │
│   This prevents:                                                             │
│   • Responding to non-existent posts                                         │
│   • Responding to expired/deactivated posts                                  │
│   • Fabricating conversations with wrong producer_id                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**4. Bi-Directional Update Permissions**

Both producer and consumer can update the conversation (e.g., change status):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BI-DIRECTIONAL UPDATE FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                    ┌─────────────────────────┐                               │
│                    │      Conversation       │                               │
│                    │                         │                               │
│                    │  status: 'pending'      │                               │
│                    │  producer_id: 'A'       │                               │
│                    │  consumer_id: 'B'       │                               │
│                    │  producer_accept: false │                               │
│                    └────────────┬────────────┘                               │
│                                 │                                            │
│          ┌──────────────────────┼──────────────────────┐                    │
│          │                      │                      │                    │
│          ▼                      │                      ▼                    │
│   ┌─────────────┐               │               ┌─────────────┐             │
│   │  Producer   │               │               │  Consumer   │             │
│   │  (User A)   │               │               │  (User B)   │             │
│   └─────────────┘               │               └─────────────┘             │
│          │                      │                      │                    │
│          │ Can UPDATE:          │         Can UPDATE:  │                    │
│          │ • Accept response    │         • No typical │                    │
│          │   (set status to     │           updates    │                    │
│          │   'active')          │           needed     │                    │
│          │ • Decline response   │                      │                    │
│          │   (set status to     │                      │                    │
│          │   'declined')        │                      │                    │
│          │ • Block user         │                      │                    │
│          │   (set status to     │                      │                    │
│          │   'blocked')         │                      │                    │
│          │                      │                      │                    │
│          └──────────────────────┴──────────────────────┘                    │
│                                 │                                            │
│                                 ▼                                            │
│                    ┌─────────────────────────┐                               │
│                    │  Both can modify, but   │                               │
│                    │  typical workflow has   │                               │
│                    │  producer accepting/    │                               │
│                    │  declining responses    │                               │
│                    └─────────────────────────┘                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Policy Definitions

##### 1. `conversations_select_participant` (SELECT)

```sql
CREATE POLICY "conversations_select_participant" ON conversations
  FOR SELECT
  TO authenticated
  USING (
    producer_id = auth.uid() OR consumer_id = auth.uid()
  );
```

| Aspect | Details |
|--------|---------|
| **Operation** | SELECT |
| **Clause** | `USING (producer_id = auth.uid() OR consumer_id = auth.uid())` |
| **Effect** | Only producer or consumer can view the conversation |
| **Condition** | User must be either the producer or consumer of the conversation |

**Participant Check Logic:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                conversations_select_participant LOGIC                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Query: SELECT * FROM conversations WHERE id = 'conv-123'                   │
│   Current user: auth.uid() = 'user-A'                                        │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │        RLS Policy Evaluation                     │                       │
│   │        USING (producer_id = auth.uid()           │                       │
│   │               OR consumer_id = auth.uid())       │                       │
│   └─────────────────────────────────────────────────┘                       │
│       │                                                                      │
│       ├─────────────────────────────────────────────────────────────────┐   │
│       │                                                                  │   │
│       ▼                                                                  ▼   │
│   ┌─────────────────┐                           ┌─────────────────┐         │
│   │ Path 1:         │                           │ Path 2:         │         │
│   │ Am I producer?  │                           │ Am I consumer?  │         │
│   │ producer_id =   │                           │ consumer_id =   │         │
│   │   auth.uid()    │                           │   auth.uid()    │         │
│   └────────┬────────┘                           └────────┬────────┘         │
│            │                                              │                  │
│       YES  │  NO                                     YES  │  NO             │
│            ▼  ▼                                           ▼  ▼              │
│          ┌─────┐ ┌─────┐                              ┌─────┐ ┌─────┐       │
│          │  ✓  │ │Check│                              │  ✓  │ │  ✗  │       │
│          │Show │ │Path2│                              │Show │ │Hide │       │
│          └─────┘ └─────┘                              └─────┘ └─────┘       │
│                                                                              │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │
│                                                                              │
│   Example:                                                                   │
│                                                                              │
│   Conversation: producer_id='user-A', consumer_id='user-B'                  │
│                                                                              │
│   User 'user-A' queries: ✓ Visible (producer_id = auth.uid())              │
│   User 'user-B' queries: ✓ Visible (consumer_id = auth.uid())              │
│   User 'user-C' queries: ✗ Hidden (neither producer nor consumer)          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**

```typescript
// ✓ Allowed: Producer fetches their conversations
const { data: myConversations } = await supabase
  .from('conversations')
  .select(`
    *,
    post:posts(id, message, target_description),
    consumer:profiles!conversations_consumer_id_fkey(id, username, avatar_config)
  `)
  .eq('producer_id', user.id);
// Returns: All conversations where user is the producer

// ✓ Allowed: Consumer fetches their conversations
const { data: myResponses } = await supabase
  .from('conversations')
  .select(`
    *,
    post:posts(id, message, target_description),
    producer:profiles!conversations_producer_id_fkey(id, username, avatar_config)
  `)
  .eq('consumer_id', user.id);
// Returns: All conversations where user is the consumer

// ✓ Allowed: Fetch all conversations (as participant)
const { data: allMyConversations } = await supabase
  .from('conversations')
  .select('*')
  .or(`producer_id.eq.${user.id},consumer_id.eq.${user.id}`);
// Returns: All conversations where user is producer OR consumer

// ✗ Blocked: User tries to fetch another user's conversation
const { data: otherConvo } = await supabase
  .from('conversations')
  .select('*')
  .eq('id', someConversationId)
  .single();
// Returns: null if user is not producer or consumer
```

---

##### 2. `conversations_insert_consumer` (INSERT)

```sql
CREATE POLICY "conversations_insert_consumer" ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    consumer_id = auth.uid()
    AND producer_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id
        AND posts.producer_id = conversations.producer_id
        AND posts.is_active = true
    )
  );
```

| Aspect | Details |
|--------|---------|
| **Operation** | INSERT |
| **Clause** | `WITH CHECK (consumer_id = auth.uid() AND producer_id != auth.uid() AND EXISTS(...))` |
| **Effect** | Only consumers can create conversations, not the post producer |
| **Validations** | (1) Inserting user is consumer, (2) Not self-response, (3) Post exists and is active |

**Three-Part Validation:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              conversations_insert_consumer VALIDATION CHAIN                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   INSERT INTO conversations                                                  │
│     (post_id, producer_id, consumer_id, status)                             │
│   VALUES ('post-123', 'user-A', 'user-B', 'pending')                        │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │        VALIDATION 1: Consumer Identity          │                       │
│   │                                                  │                       │
│   │   consumer_id = auth.uid()                       │                       │
│   │   'user-B' = auth.uid() ?                        │                       │
│   │                                                  │                       │
│   │   ✓ Must be true: You are the consumer          │                       │
│   └─────────────────────────────────────────────────┘                       │
│       │                                                                      │
│       │ PASS                                                                 │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │        VALIDATION 2: Self-Response Check        │                       │
│   │                                                  │                       │
│   │   producer_id != auth.uid()                      │                       │
│   │   'user-A' != auth.uid() ?                       │                       │
│   │                                                  │                       │
│   │   ✓ Must be true: You are NOT the producer      │                       │
│   └─────────────────────────────────────────────────┘                       │
│       │                                                                      │
│       │ PASS                                                                 │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────┐                       │
│   │        VALIDATION 3: Post Existence & State     │                       │
│   │                                                  │                       │
│   │   EXISTS (                                       │                       │
│   │     SELECT 1 FROM posts                          │                       │
│   │     WHERE posts.id = 'post-123'                  │                       │
│   │       AND posts.producer_id = 'user-A'           │                       │
│   │       AND posts.is_active = true                 │                       │
│   │   )                                              │                       │
│   │                                                  │                       │
│   │   ✓ Post must exist                              │                       │
│   │   ✓ Producer must match                          │                       │
│   │   ✓ Post must be active                          │                       │
│   └─────────────────────────────────────────────────┘                       │
│       │                                                                      │
│       │ PASS                                                                 │
│       ▼                                                                      │
│   ✓ INSERT allowed                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why Use EXISTS Subquery?**

The EXISTS subquery pattern is crucial for RLS policies that need to validate related data:

| Pattern | Purpose | Example |
|---------|---------|---------|
| `EXISTS (SELECT 1 FROM posts ...)` | Validate related record exists | Ensure post is real and active |
| `posts.producer_id = conversations.producer_id` | Cross-table validation | Ensure producer_id matches post's actual producer |
| `posts.is_active = true` | State validation | Only allow responses to active posts |

**Security Implications:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SECURITY IMPLICATIONS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Without producer_id != auth.uid():                                         │
│   ─────────────────────────────────                                          │
│   User could respond to their own post, creating fake "matches"             │
│   to game the system or mislead other users.                                 │
│                                                                              │
│   Without EXISTS validation:                                                 │
│   ─────────────────────────────                                              │
│   User could create conversations referencing:                               │
│   • Non-existent posts (data integrity violation)                           │
│   • Inactive/expired posts (business rule violation)                        │
│   • Posts with wrong producer_id (fabricated connections)                   │
│                                                                              │
│   The database-level CHECK constraint also helps:                            │
│   ─────────────────────────────────────────────                              │
│   CONSTRAINT conversations_different_users                                   │
│     CHECK (producer_id != consumer_id)                                      │
│                                                                              │
│   This is a defense-in-depth approach where both RLS and CHECK              │
│   constraints enforce the no-self-response rule.                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**

```typescript
// ✓ Allowed: Consumer responds to an active post
const { data: newConversation, error } = await supabase
  .from('conversations')
  .insert({
    post_id: activePostId,
    producer_id: postProducerId,  // Must match post's actual producer
    consumer_id: user.id,          // Must be auth.uid()
    status: 'pending'
  })
  .select()
  .single();
// Returns: New conversation if all validations pass

// ✗ Blocked: Producer tries to respond to their own post
const { error } = await supabase
  .from('conversations')
  .insert({
    post_id: myPostId,
    producer_id: user.id,     // Same as consumer_id - blocked!
    consumer_id: user.id,
    status: 'pending'
  });
// Error: new row violates row-level security policy

// ✗ Blocked: Attempt to respond to inactive post
const { error } = await supabase
  .from('conversations')
  .insert({
    post_id: inactivePostId,  // Post has is_active = false
    producer_id: postProducerId,
    consumer_id: user.id,
    status: 'pending'
  });
// Error: new row violates row-level security policy

// ✗ Blocked: Attempt to impersonate consumer
const { error } = await supabase
  .from('conversations')
  .insert({
    post_id: postId,
    producer_id: postProducerId,
    consumer_id: 'other-user-id',  // Not auth.uid() - blocked!
    status: 'pending'
  });
// Error: new row violates row-level security policy
```

---

##### 3. `conversations_update_participant` (UPDATE)

```sql
CREATE POLICY "conversations_update_participant" ON conversations
  FOR UPDATE
  TO authenticated
  USING (producer_id = auth.uid() OR consumer_id = auth.uid())
  WITH CHECK (producer_id = auth.uid() OR consumer_id = auth.uid());
```

| Aspect | Details |
|--------|---------|
| **Operation** | UPDATE |
| **Clauses** | `USING` + `WITH CHECK (producer_id = auth.uid() OR consumer_id = auth.uid())` |
| **USING Effect** | Can only target conversations where you are a participant |
| **WITH CHECK Effect** | Cannot transfer participation by changing producer/consumer IDs |

**Bi-Directional Access Explained:**

Unlike posts (where only the producer can update), conversations allow **both participants** to update. This is because both parties need to interact with the conversation:

| Action | Who Performs | Status Change |
|--------|--------------|---------------|
| Accept response | Producer | `pending` → `active` |
| Decline response | Producer | `pending` → `declined` |
| Block user | Either participant | `*` → `blocked` |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              CONVERSATION STATUS TRANSITIONS BY ROLE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   INITIAL STATE                                                              │
│   ┌─────────────────┐                                                        │
│   │    'pending'    │  Consumer has responded, awaiting producer decision   │
│   └────────┬────────┘                                                        │
│            │                                                                 │
│            ├── Producer accepts ──────▶ 'active'    (messaging enabled)     │
│            │                                                                 │
│            ├── Producer declines ─────▶ 'declined' (conversation closed)    │
│            │                                                                 │
│            └── Either blocks ─────────▶ 'blocked'  (user blocked)           │
│                                                                              │
│   FROM 'active' STATE                                                        │
│   ┌─────────────────┐                                                        │
│   │    'active'     │  Both users can exchange messages                     │
│   └────────┬────────┘                                                        │
│            │                                                                 │
│            └── Either blocks ─────────▶ 'blocked'  (user blocked)           │
│                                                                              │
│   TERMINAL STATES: 'declined', 'blocked' (no further transitions)           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Dual Clause Protection:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│           conversations_update_participant DUAL CLAUSE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   UPDATE conversations SET status = 'active' WHERE id = 'conv-123'          │
│       │                                                                      │
│       ▼                                                                      │
│   ┌───────────────────────────────────────┐                                  │
│   │        STEP 1: USING Clause            │                                  │
│   │        "Which rows can I target?"      │                                  │
│   │                                        │                                  │
│   │   producer_id = auth.uid()             │                                  │
│   │   OR consumer_id = auth.uid()          │                                  │
│   │                                        │                                  │
│   │   Only conversations where user is     │                                  │
│   │   producer OR consumer are visible     │                                  │
│   └───────────────────────────────────────┘                                  │
│       │                                                                      │
│       ▼                                                                      │
│   ┌───────────────────────────────────────┐                                  │
│   │      STEP 2: WITH CHECK Clause         │                                  │
│   │      "Is the modified row valid?"      │                                  │
│   │                                        │                                  │
│   │   producer_id = auth.uid()             │                                  │
│   │   OR consumer_id = auth.uid()          │                                  │
│   │                                        │                                  │
│   │   Ensures you can't change producer_id │                                  │
│   │   or consumer_id to transfer the       │                                  │
│   │   conversation to other users          │                                  │
│   └───────────────────────────────────────┘                                  │
│       │                                                                      │
│       ▼                                                                      │
│   ✓ Update applied (or ✗ blocked)                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**

```typescript
// ✓ Allowed: Producer accepts a response
const { data, error } = await supabase
  .from('conversations')
  .update({
    status: 'active',
    producer_accept: true
  })
  .eq('id', conversationId)
  .eq('producer_id', user.id)  // Verify ownership
  .select()
  .single();

// ✓ Allowed: Producer declines a response
const { data, error } = await supabase
  .from('conversations')
  .update({ status: 'declined' })
  .eq('id', conversationId)
  .eq('producer_id', user.id)
  .select()
  .single();

// ✓ Allowed: Either participant blocks the conversation
const { data, error } = await supabase
  .from('conversations')
  .update({ status: 'blocked' })
  .eq('id', conversationId)
  .or(`producer_id.eq.${user.id},consumer_id.eq.${user.id}`)
  .select()
  .single();

// ✗ Blocked: Non-participant tries to update
const { data, error } = await supabase
  .from('conversations')
  .update({ status: 'active' })
  .eq('id', someConversationId);
// Result: No rows updated (USING filters out the row)

// ✗ Blocked: Attempt to transfer conversation
const { error } = await supabase
  .from('conversations')
  .update({ producer_id: 'another-user' })  // Transfer attempt
  .eq('id', conversationId);
// Error: new row violates row-level security policy (WITH CHECK fails)
```

---

##### 4. `conversations_delete_participant` (DELETE)

```sql
CREATE POLICY "conversations_delete_participant" ON conversations
  FOR DELETE
  TO authenticated
  USING (
    producer_id = auth.uid() OR consumer_id = auth.uid()
  );
```

| Aspect | Details |
|--------|---------|
| **Operation** | DELETE |
| **Clause** | `USING (producer_id = auth.uid() OR consumer_id = auth.uid())` |
| **Effect** | Either participant can delete the conversation |
| **Condition** | User must be the producer or consumer |

**Note:** DELETE only uses `USING` (not `WITH CHECK`) because there's no resulting row to validate—the row is being removed.

**Cascade Effects:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   CONVERSATION DELETE CASCADE EFFECT                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   DELETE FROM conversations WHERE id = 'conv-123'                            │
│   AND (producer_id = auth.uid() OR consumer_id = auth.uid())                │
│       │                                                                      │
│       │ RLS Check: Am I producer or consumer?                               │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────┐                                                        │
│   │ Conversation    │                                                        │
│   │ Deleted         │                                                        │
│   └────────┬────────┘                                                        │
│            │                                                                 │
│            └──────▶ messages (conversation_id FK) ─────▶ DELETED            │
│                                                                              │
│   All messages in the conversation are automatically deleted                 │
│   due to ON DELETE CASCADE foreign key constraint.                           │
│                                                                              │
│   Note: The post is NOT affected—only the conversation and its              │
│   messages are removed.                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**When to Use DELETE vs Status Change:**

| Approach | Use Case | Behavior |
|----------|----------|----------|
| `status = 'blocked'` | Block a user | Conversation remains, user blocked |
| `status = 'declined'` | Decline response | Conversation remains as record |
| DELETE | Remove all traces | Conversation and messages removed |

**Typical Application Behavior:**

Most dating/matching apps prefer **status changes over deletion** to:
- Maintain audit trails
- Prevent re-matching (unique constraint on post_id + consumer_id)
- Allow for moderation review

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   DELETE vs STATUS CHANGE COMPARISON                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Scenario: User wants to "end" a conversation                               │
│                                                                              │
│   Option A: Set status = 'declined' or 'blocked'                            │
│   ─────────────────────────────────────────────                              │
│   • Conversation record remains                                              │
│   • Messages remain (for potential moderation)                               │
│   • Unique constraint prevents re-response                                   │
│   • Can be "unblocked" if needed                                            │
│                                                                              │
│   Option B: DELETE conversation                                              │
│   ─────────────────────────────                                              │
│   • Conversation completely removed                                          │
│   • All messages CASCADE deleted                                             │
│   • User COULD respond again (unique constraint removed)                    │
│   • No audit trail                                                           │
│                                                                              │
│   Recommendation: Use status changes for most cases                          │
│   Reserve DELETE for data cleanup or GDPR compliance                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**

```typescript
// ✓ Allowed: Participant deletes conversation
const { error } = await supabase
  .from('conversations')
  .delete()
  .eq('id', conversationId)
  .or(`producer_id.eq.${user.id},consumer_id.eq.${user.id}`);
// Conversation and all its messages are deleted

// ✗ Blocked: Non-participant tries to delete
const { error } = await supabase
  .from('conversations')
  .delete()
  .eq('id', someOtherConversationId);
// Result: No rows deleted (USING filters out the row)

// Preferred approach: Use status change instead of delete
const { data, error } = await supabase
  .from('conversations')
  .update({ status: 'declined' })  // Soft "delete"
  .eq('id', conversationId)
  .or(`producer_id.eq.${user.id},consumer_id.eq.${user.id}`)
  .select()
  .single();
```

---

#### Conversations RLS Quick Reference

| Policy | Operation | Clause(s) | Who Can Access |
|--------|-----------|-----------|----------------|
| `conversations_select_participant` | SELECT | `USING (producer_id = auth.uid() OR consumer_id = auth.uid())` | Producer or consumer |
| `conversations_insert_consumer` | INSERT | `WITH CHECK (consumer_id = auth.uid() AND producer_id != auth.uid() AND EXISTS(...))` | Consumer only (with post validation) |
| `conversations_update_participant` | UPDATE | `USING + WITH CHECK (producer_id = auth.uid() OR consumer_id = auth.uid())` | Producer or consumer |
| `conversations_delete_participant` | DELETE | `USING (producer_id = auth.uid() OR consumer_id = auth.uid())` | Producer or consumer |

**Key Takeaways:**

1. **Participant-only access** - Only producer and consumer can see/modify conversations
2. **Self-response prevention** - INSERT policy blocks producers from responding to their own posts
3. **Post validation** - INSERT uses EXISTS subquery to verify post exists and is active
4. **Bi-directional permissions** - Both producer and consumer can update/delete
5. **Status-based workflow** - Updates typically change status rather than delete
6. **Cascade on delete** - Deleting conversation removes all associated messages

---

### Messages RLS Policies

The `messages` table implements **participant-only access with sender-restricted delete** security pattern with 4 policies. Messages require users to be participants in the parent conversation, and enforce active conversation status for sending new messages.

#### Security Model Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MESSAGES RLS SECURITY MODEL                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                           SELECT                                     │   │
│   │                                                                      │   │
│   │   Conversation Participants Only (via JOIN)                         │   │
│   │                                                                      │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │                      Conversation                            │   │   │
│   │   │                                                              │   │   │
│   │   │   Producer ◄──────┐                                          │   │   │
│   │   │                   │                                          │   │   │
│   │   │   Consumer ◄──────┼── Can view all messages                  │   │   │
│   │   │                   │                                          │   │   │
│   │   └───────────────────┼──────────────────────────────────────────┘   │   │
│   │                       │                                              │   │
│   │   Other Users ────────┴── ✗ Cannot view (blocked by JOIN)           │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                           INSERT                                     │   │
│   │                                                                      │   │
│   │   Participants in ACTIVE Conversations Only                         │   │
│   │                                                                      │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │  Conversation Status = 'active'                              │   │   │
│   │   │                                                              │   │   │
│   │   │  Producer ────────▶ ✓ Can send messages                      │   │   │
│   │   │  Consumer ────────▶ ✓ Can send messages                      │   │   │
│   │   └──────────────────────────────────────────────────────────────┘   │   │
│   │                                                                      │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │  Conversation Status = 'pending'/'declined'/'blocked'        │   │   │
│   │   │                                                              │   │   │
│   │   │  Any User ────────▶ ✗ Cannot send messages                   │   │   │
│   │   └──────────────────────────────────────────────────────────────┘   │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                           UPDATE                                     │   │
│   │                                                                      │   │
│   │   Conversation Participants Can Update (for read status)           │   │
│   │                                                                      │   │
│   │   Producer/Consumer ──▶ ✓ Can mark messages as read                 │   │
│   │   Other Users ────────▶ ✗ Cannot update (blocked by JOIN)           │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                           DELETE                                     │   │
│   │                                                                      │   │
│   │   Sender Only (more restrictive than other operations)              │   │
│   │                                                                      │   │
│   │   Message Sender ─────▶ ✓ Can delete own messages                   │   │
│   │   Other Participant ──▶ ✗ Cannot delete (not sender)                │   │
│   │   Other Users ────────▶ ✗ Cannot delete (not sender)                │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Key Security Concepts

| Concept | Description |
|---------|-------------|
| **Participant access via JOIN** | SELECT/UPDATE use EXISTS subquery joining to `conversations` table to verify user is producer or consumer |
| **Active conversation requirement** | INSERT requires conversation status = 'active' to prevent messaging in pending/declined/blocked conversations |
| **Sender validation on INSERT** | INSERT verifies `sender_id = auth.uid()` to prevent impersonation |
| **Sender-only delete** | DELETE is more restrictive—only the message sender can delete, not the other participant |

---

##### 1. `messages_select_participants` (SELECT)

```sql
CREATE POLICY "messages_select_participants" ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.producer_id = auth.uid() OR conversations.consumer_id = auth.uid())
    )
  );
```

| Aspect | Details |
|--------|---------|
| **Operation** | SELECT |
| **Clause** | `USING (EXISTS (SELECT ... FROM conversations WHERE ...))` |
| **Effect** | Only conversation participants can view messages |
| **Pattern** | JOIN-based participant verification |

**EXISTS Subquery Pattern Explained:**

The messages table doesn't directly store participant IDs—it only has `conversation_id` and `sender_id`. To verify a user is allowed to view messages, we must JOIN to the `conversations` table:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│          messages_select_participants JOIN PATTERN                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   SELECT * FROM messages WHERE id = 'msg-123'                               │
│       │                                                                      │
│       ▼                                                                      │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                    USING Clause: EXISTS Subquery                       │ │
│   │                                                                        │ │
│   │   Does this conversation include the current user?                    │ │
│   │                                                                        │ │
│   │   ┌─────────────────────────────────────────────────────────────────┐ │ │
│   │   │  messages                    conversations                       │ │ │
│   │   │  ┌──────────────────┐       ┌──────────────────┐                │ │ │
│   │   │  │ id: 'msg-123'    │       │ id: 'conv-456'   │                │ │ │
│   │   │  │ conversation_id ─┼──────▶│ producer_id      │── = auth.uid()? │ │ │
│   │   │  │ sender_id        │       │ consumer_id      │── = auth.uid()? │ │ │
│   │   │  │ content          │       │ status           │                │ │ │
│   │   │  └──────────────────┘       └──────────────────┘                │ │ │
│   │   │                                                                  │ │ │
│   │   │  If producer_id = auth.uid() OR consumer_id = auth.uid()        │ │ │
│   │   │  → EXISTS returns TRUE → Message visible                         │ │ │
│   │   │                                                                  │ │ │
│   │   │  Otherwise → EXISTS returns FALSE → Message hidden               │ │ │
│   │   └─────────────────────────────────────────────────────────────────┘ │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│       │                                                                      │
│       ▼                                                                      │
│   ✓ Message returned (or ✗ filtered out)                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why EXISTS Instead of Direct Column Check:**

Unlike `conversations` where we can simply check `producer_id = auth.uid() OR consumer_id = auth.uid()`, the `messages` table doesn't have these columns directly:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DIRECT VS JOIN-BASED ACCESS CONTROL                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   conversations table:                    messages table:                    │
│   ┌──────────────────────────┐           ┌──────────────────────────┐       │
│   │ id                       │           │ id                       │       │
│   │ producer_id  ◄── Check!  │           │ conversation_id          │       │
│   │ consumer_id  ◄── Check!  │           │ sender_id                │       │
│   │ status                   │           │ content                  │       │
│   └──────────────────────────┘           │ is_read                  │       │
│                                          └──────────────────────────┘       │
│   Direct check possible:                                                     │
│   producer_id = auth.uid()               Must JOIN to get participants:     │
│   OR consumer_id = auth.uid()            EXISTS (SELECT FROM conversations) │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**

```typescript
// ✓ Allowed: Participant fetches messages in their conversation
const { data: messages, error } = await supabase
  .from('messages')
  .select('*, sender:profiles!sender_id(username, avatar_config)')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true });
// Returns: All messages in the conversation (user is participant)

// ✓ Allowed: Fetch unread message count for a conversation
const { count, error } = await supabase
  .from('messages')
  .select('*', { count: 'exact', head: true })
  .eq('conversation_id', conversationId)
  .eq('is_read', false)
  .neq('sender_id', user.id);  // Don't count own messages
// Returns: Number of unread messages from the other participant

// ✓ Allowed: Paginated message retrieval
const { data: olderMessages, error } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .lt('created_at', lastMessageTimestamp)
  .order('created_at', { ascending: false })
  .limit(20);
// Returns: Previous 20 messages before the specified timestamp

// ✗ Blocked: Non-participant tries to read messages
// User is NOT producer or consumer of this conversation
const { data: secretMessages, error } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', otherConversationId);
// Returns: [] (empty array - EXISTS subquery returns FALSE)
```

---

##### 2. `messages_insert_participant` (INSERT)

```sql
CREATE POLICY "messages_insert_participant" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.status = 'active'
      AND (conversations.producer_id = auth.uid() OR conversations.consumer_id = auth.uid())
    )
  );
```

| Aspect | Details |
|--------|---------|
| **Operation** | INSERT |
| **Clause** | `WITH CHECK (sender_id = auth.uid() AND EXISTS (...))` |
| **Effect** | Only participants in active conversations can send messages |
| **Conditions** | 1) Must be the sender, 2) Must be a participant, 3) Conversation must be active |

**Three-Part Validation:**

This policy enforces three security requirements in a single WITH CHECK clause:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               messages_insert_participant VALIDATION                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   INSERT INTO messages (conversation_id, sender_id, content)                │
│   VALUES ('conv-123', 'user-456', 'Hello!')                                 │
│       │                                                                      │
│       ▼                                                                      │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                 CHECK 1: Sender Identity                               │ │
│   │                                                                        │ │
│   │   sender_id = auth.uid()                                              │ │
│   │   'user-456' = auth.uid()?                                            │ │
│   │                                                                        │ │
│   │   ✓ TRUE: User is sending as themselves                               │ │
│   │   ✗ FALSE: Impersonation attempt blocked                              │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│       │                                                                      │
│       ▼ (if TRUE)                                                            │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                 CHECK 2: Participant Verification                      │ │
│   │                                                                        │ │
│   │   EXISTS (SELECT FROM conversations WHERE id = 'conv-123'             │ │
│   │          AND (producer_id = auth.uid() OR consumer_id = auth.uid()))  │ │
│   │                                                                        │ │
│   │   ✓ TRUE: User is producer or consumer of this conversation           │ │
│   │   ✗ FALSE: User has no access to this conversation                    │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│       │                                                                      │
│       ▼ (if TRUE)                                                            │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                 CHECK 3: Active Conversation Status                    │ │
│   │                                                                        │ │
│   │   conversations.status = 'active'                                      │ │
│   │                                                                        │ │
│   │   ✓ 'active': Full messaging enabled                                   │ │
│   │   ✗ 'pending': Awaiting producer acceptance—no messages yet           │ │
│   │   ✗ 'declined': Producer rejected—messaging disabled                  │ │
│   │   ✗ 'blocked': User blocked—messaging disabled                        │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│       │                                                                      │
│       ▼                                                                      │
│   ✓ All checks pass → Message inserted                                       │
│   ✗ Any check fails → INSERT blocked                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Active Conversation Requirement Explained:**

The `status = 'active'` check is critical for the Love Ledger messaging flow:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              CONVERSATION STATUS AND MESSAGING PERMISSIONS                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Status        │ Producer Can Message │ Consumer Can Message │ Rationale   │
│   ──────────────┼──────────────────────┼──────────────────────┼─────────────│
│   'pending'     │        ✗ No          │        ✗ No          │ Awaiting    │
│                 │                      │                      │ acceptance  │
│   ──────────────┼──────────────────────┼──────────────────────┼─────────────│
│   'active'      │        ✓ Yes         │        ✓ Yes         │ Both        │
│                 │                      │                      │ approved    │
│   ──────────────┼──────────────────────┼──────────────────────┼─────────────│
│   'declined'    │        ✗ No          │        ✗ No          │ Producer    │
│                 │                      │                      │ rejected    │
│   ──────────────┼──────────────────────┼──────────────────────┼─────────────│
│   'blocked'     │        ✗ No          │        ✗ No          │ User        │
│                 │                      │                      │ blocked     │
│                                                                              │
│   Why This Matters:                                                          │
│   ─────────────────                                                          │
│   1. Prevents harassment - Users can't message before being accepted        │
│   2. Respects consent - Producer must explicitly approve the conversation   │
│   3. Enforces blocking - Blocked users cannot continue messaging            │
│   4. Maintains boundaries - Declined responses stay declined                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Message Flow Timeline:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONVERSATION → MESSAGE FLOW TIMELINE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. Consumer finds a post and responds                                      │
│      ┌────────────────────────────────────────────────────────────────┐     │
│      │ INSERT INTO conversations (post_id, consumer_id, status)        │     │
│      │ VALUES ('post-123', 'consumer-id', 'pending')                   │     │
│      └────────────────────────────────────────────────────────────────┘     │
│                              │                                               │
│                              ▼                                               │
│   2. Consumer tries to send message (BLOCKED - status is 'pending')         │
│      ┌────────────────────────────────────────────────────────────────┐     │
│      │ INSERT INTO messages (conversation_id, sender_id, content)      │     │
│      │ VALUES ('conv-456', 'consumer-id', 'Hi!')                       │     │
│      │ → ✗ BLOCKED: conversations.status != 'active'                   │     │
│      └────────────────────────────────────────────────────────────────┘     │
│                              │                                               │
│                              ▼                                               │
│   3. Producer accepts the response                                           │
│      ┌────────────────────────────────────────────────────────────────┐     │
│      │ UPDATE conversations SET status = 'active', producer_accept = true │  │
│      │ WHERE id = 'conv-456' AND producer_id = auth.uid()              │     │
│      └────────────────────────────────────────────────────────────────┘     │
│                              │                                               │
│                              ▼                                               │
│   4. Now both can message freely (status is 'active')                        │
│      ┌────────────────────────────────────────────────────────────────┐     │
│      │ INSERT INTO messages (...) VALUES ('conv-456', 'consumer-id'...) │    │
│      │ → ✓ ALLOWED: status = 'active' AND is participant               │     │
│      │                                                                  │     │
│      │ INSERT INTO messages (...) VALUES ('conv-456', 'producer-id'...) │    │
│      │ → ✓ ALLOWED: status = 'active' AND is participant               │     │
│      └────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**

```typescript
// ✓ Allowed: Participant sends message in active conversation
const { data: newMessage, error } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    sender_id: user.id,  // Must match auth.uid()
    content: 'Hello! Nice to meet you!'
  })
  .select()
  .single();
// Returns: The newly created message

// ✓ Allowed: Send message with real-time broadcast
const { data, error } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: message.trim()
  })
  .select('*, sender:profiles!sender_id(username, avatar_config)')
  .single();

// ✗ Blocked: Attempt to send in pending conversation
// Conversation where status = 'pending' (not yet accepted)
const { error } = await supabase
  .from('messages')
  .insert({
    conversation_id: pendingConversationId,
    sender_id: user.id,
    content: 'Can we talk?'
  });
// Error: new row violates row-level security policy
// (conversations.status != 'active')

// ✗ Blocked: Attempt to send in declined conversation
const { error } = await supabase
  .from('messages')
  .insert({
    conversation_id: declinedConversationId,
    sender_id: user.id,
    content: 'Please reconsider!'
  });
// Error: new row violates row-level security policy

// ✗ Blocked: Impersonation attempt (sender_id != auth.uid())
const { error } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    sender_id: 'other-user-id',  // Not the authenticated user!
    content: 'Pretending to be someone else'
  });
// Error: new row violates row-level security policy
// (sender_id != auth.uid())

// ✗ Blocked: Non-participant attempts to send message
// User is not producer or consumer of this conversation
const { error } = await supabase
  .from('messages')
  .insert({
    conversation_id: someOtherConversationId,
    sender_id: user.id,
    content: 'Trying to join conversation'
  });
// Error: new row violates row-level security policy
// (EXISTS returns FALSE - not a participant)
```

---

##### 3. `messages_update_participant` (UPDATE)

```sql
CREATE POLICY "messages_update_participant" ON messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.producer_id = auth.uid() OR conversations.consumer_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.producer_id = auth.uid() OR conversations.consumer_id = auth.uid())
    )
  );
```

| Aspect | Details |
|--------|---------|
| **Operation** | UPDATE |
| **Clauses** | `USING + WITH CHECK (EXISTS ... participant check)` |
| **USING Effect** | Can only target messages in conversations where you're a participant |
| **WITH CHECK Effect** | Cannot move message to a conversation where you're not a participant |
| **Primary Use Case** | Marking messages as read (`is_read = true`) |

**Why Both Participants Can Update:**

Unlike DELETE (sender-only), UPDATE allows **both participants** to modify messages. This is intentional:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MESSAGE UPDATE USE CASES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Primary Use Case: Mark as Read                                             │
│   ───────────────────────────────                                            │
│                                                                              │
│   When Bob receives a message from Alice:                                    │
│                                                                              │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │ Alice (sender)                           Bob (recipient)              │ │
│   │                                                                        │ │
│   │ ┌──────────────────────┐                                              │ │
│   │ │ "Hey Bob!"           │                                              │ │
│   │ │ sender_id: Alice     │──────────────────▶ Bob views message        │ │
│   │ │ is_read: FALSE       │                           │                  │ │
│   │ └──────────────────────┘                           │                  │ │
│   │                                                    ▼                  │ │
│   │                                     UPDATE messages                   │ │
│   │                                     SET is_read = TRUE                │ │
│   │                                     WHERE id = 'msg-123'              │ │
│   │                                                    │                  │ │
│   │                                                    ▼                  │ │
│   │ ┌──────────────────────┐           ┌───────────────────────────────┐ │ │
│   │ │ "Hey Bob!"           │           │ ✓ Bob is participant (USING)  │ │ │
│   │ │ sender_id: Alice     │◀──────────│ ✓ Still participant (W/CHECK) │ │ │
│   │ │ is_read: TRUE ◀───── │ Updated!  └───────────────────────────────┘ │ │
│   │ └──────────────────────┘                                              │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   Key Point: The RECIPIENT (not sender) marks messages as read              │
│   That's why both participants need UPDATE access                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What UPDATE Cannot Do:**

The policy allows updating message fields but doesn't control which fields. However, application logic typically restricts updates to `is_read` only:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TYPICAL VS ATYPICAL MESSAGE UPDATES                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ✓ Normal Operation                     ⚠ Technically Possible             │
│   ───────────────────                    ─────────────────────               │
│                                                                              │
│   UPDATE messages                        UPDATE messages                     │
│   SET is_read = TRUE                     SET content = 'Edited!'             │
│   WHERE id = 'msg-123';                  WHERE id = 'msg-123';               │
│                                                                              │
│   Marking messages read                  Editing message content             │
│   is the expected use case               is allowed by RLS but               │
│                                          typically prevented by              │
│                                          application logic                   │
│                                                                              │
│   Application Best Practice:                                                 │
│   ─────────────────────────                                                  │
│   • Only expose "mark as read" functionality to users                        │
│   • If message editing is needed, add sender_id check in application         │
│   • Consider adding database-level trigger if editing must be restricted     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**

```typescript
// ✓ Allowed: Mark single message as read
const { error } = await supabase
  .from('messages')
  .update({ is_read: true })
  .eq('id', messageId);

// ✓ Allowed: Mark all unread messages in conversation as read
const { error } = await supabase
  .from('messages')
  .update({ is_read: true })
  .eq('conversation_id', conversationId)
  .eq('is_read', false)
  .neq('sender_id', user.id);  // Only mark OTHER person's messages

// ✓ Allowed: Bulk mark as read on conversation open
const markConversationRead = async (conversationId: string) => {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)  // Messages from other participant
    .eq('is_read', false);      // Only unread ones

  return { error };
};

// ✗ Blocked: Non-participant tries to update
const { error } = await supabase
  .from('messages')
  .update({ is_read: true })
  .eq('id', messageInOtherConversation);
// Result: No rows updated (USING filters out the message)
```

---

##### 4. `messages_delete_sender` (DELETE)

```sql
CREATE POLICY "messages_delete_sender" ON messages
  FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());
```

| Aspect | Details |
|--------|---------|
| **Operation** | DELETE |
| **Clause** | `USING (sender_id = auth.uid())` |
| **Effect** | Only the message sender can delete their own messages |
| **Key Difference** | More restrictive than SELECT/UPDATE (sender only, not participant) |

**Sender-Only Delete Explained:**

This policy is intentionally **more restrictive** than the participant-based policies for SELECT/UPDATE:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DELETE: SENDER-ONLY RESTRICTION                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Comparison with Other Operations:                                          │
│   ───────────────────────────────                                            │
│                                                                              │
│   Operation │ Who Can Access         │ Check Pattern                        │
│   ──────────┼────────────────────────┼────────────────────────────────────── │
│   SELECT    │ Both participants      │ EXISTS (JOIN to conversations)       │
│   INSERT    │ Both participants*     │ sender_id = auth.uid() AND EXISTS... │
│   UPDATE    │ Both participants      │ EXISTS (JOIN to conversations)       │
│   DELETE    │ SENDER ONLY           │ sender_id = auth.uid()               │
│                                                                              │
│   * INSERT also requires active status and sender = self                     │
│                                                                              │
│   Why Sender-Only for DELETE?                                                │
│   ───────────────────────────                                                │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                      │   │
│   │   1. Ownership: You can only delete what you created                 │   │
│   │                                                                      │   │
│   │   2. Audit Trail: Prevents one user from erasing evidence of        │   │
│   │      harassment or inappropriate content from the other user         │   │
│   │                                                                      │   │
│   │   3. User Control: Each user controls their own messages            │   │
│   │                                                                      │   │
│   │   4. Consistency: Similar to most chat apps (WhatsApp, iMessage)    │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Delete Behavior Visualization:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MESSAGE DELETE PERMISSIONS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Conversation between Alice (producer) and Bob (consumer):                  │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Message History                                                      │   │
│   │                                                                      │   │
│   │ ┌─────────────────────────────────────────────────────────────────┐ │   │
│   │ │ [Bob]: "Hi! I think we met at the coffee shop"                  │ │   │
│   │ │ sender_id: Bob                                                   │ │   │
│   │ │                                                                  │ │   │
│   │ │ Can DELETE: Bob ✓   |   Alice ✗                                  │ │   │
│   │ └─────────────────────────────────────────────────────────────────┘ │   │
│   │                                                                      │   │
│   │ ┌─────────────────────────────────────────────────────────────────┐ │   │
│   │ │ [Alice]: "Yes! I remember you!"                                  │ │   │
│   │ │ sender_id: Alice                                                 │ │   │
│   │ │                                                                  │ │   │
│   │ │ Can DELETE: Alice ✓   |   Bob ✗                                  │ │   │
│   │ └─────────────────────────────────────────────────────────────────┘ │   │
│   │                                                                      │   │
│   │ ┌─────────────────────────────────────────────────────────────────┐ │   │
│   │ │ [Bob]: "Would you like to grab coffee again?"                    │ │   │
│   │ │ sender_id: Bob                                                   │ │   │
│   │ │                                                                  │ │   │
│   │ │ Can DELETE: Bob ✓   |   Alice ✗                                  │ │   │
│   │ └─────────────────────────────────────────────────────────────────┘ │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Key: Each user can only delete their own messages                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Simpler Check Pattern:**

Notice that this policy uses a direct column check (`sender_id = auth.uid()`) rather than an EXISTS subquery:

```sql
-- DELETE policy: Simple sender check
USING (sender_id = auth.uid())

-- vs SELECT policy: JOIN-based participant check
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (producer_id = auth.uid() OR consumer_id = auth.uid())
  )
)
```

This is because:
1. The `sender_id` column is directly on the `messages` table
2. There's no need to verify conversation participation—if you're the sender, you created the message
3. Simpler checks are more performant

**Example Use Cases:**

```typescript
// ✓ Allowed: Delete your own message
const { error } = await supabase
  .from('messages')
  .delete()
  .eq('id', messageId)
  .eq('sender_id', user.id);  // Explicit check (matches RLS)
// Message deleted successfully

// ✓ Allowed: Delete your recent message (unsend)
const deleteRecentMessage = async (messageId: string) => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);
    // RLS automatically filters to only your messages

  return { error };
};

// ✗ Blocked: Try to delete other participant's message
// Bob tries to delete Alice's message
const { error } = await supabase
  .from('messages')
  .delete()
  .eq('id', alicesMessageId);
// Result: No rows deleted (USING filters out - sender_id != auth.uid())

// ✗ Blocked: Non-participant tries to delete any message
const { error } = await supabase
  .from('messages')
  .delete()
  .eq('id', someMessageId);
// Result: No rows deleted (not the sender)

// Note: Deleting all your messages in a conversation
const { error } = await supabase
  .from('messages')
  .delete()
  .eq('conversation_id', conversationId)
  .eq('sender_id', user.id);
// Deletes only YOUR messages, other participant's messages remain
```

**Important Considerations:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MESSAGE DELETE CONSIDERATIONS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. Deletion is Permanent                                                   │
│   ────────────────────────                                                   │
│   • No soft delete - message is removed from database                        │
│   • Consider implementing soft delete (is_deleted flag) if undo is needed   │
│                                                                              │
│   2. Other User Still Sees Gap                                               │
│   ────────────────────────────                                               │
│   • When a message is deleted, the conversation may have "missing" messages │
│   • UI should handle this gracefully (no tombstone shown by default)        │
│                                                                              │
│   3. Alternative: Conversation Deletion                                       │
│   ────────────────────────────────────                                       │
│   • To remove ALL messages, delete the conversation instead                  │
│   • CASCADE will delete all messages automatically                          │
│   • Either participant can delete the conversation                           │
│                                                                              │
│   4. Moderation Access                                                       │
│   ────────────────────                                                       │
│   • Service role bypasses RLS for admin/moderation purposes                 │
│   • Reported messages can be reviewed before user deletes them              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### Messages RLS Quick Reference

| Policy | Operation | Clause(s) | Who Can Access |
|--------|-----------|-----------|----------------|
| `messages_select_participants` | SELECT | `USING (EXISTS (... participant check ...))` | Conversation participants |
| `messages_insert_participant` | INSERT | `WITH CHECK (sender_id = auth.uid() AND EXISTS (... active + participant ...))` | Participants in active conversations |
| `messages_update_participant` | UPDATE | `USING + WITH CHECK (EXISTS (... participant check ...))` | Conversation participants |
| `messages_delete_sender` | DELETE | `USING (sender_id = auth.uid())` | Message sender only |

**Key Takeaways:**

1. **Participant access via JOIN** - SELECT/UPDATE use EXISTS subquery to join with `conversations` table
2. **Active conversation requirement** - INSERT requires `status = 'active'` to prevent messaging before acceptance
3. **Sender validation** - INSERT requires `sender_id = auth.uid()` to prevent impersonation
4. **Sender-only delete** - DELETE is more restrictive than other operations—only the sender can delete
5. **Read status updates** - UPDATE allows both participants to mark messages as read
6. **No status check for SELECT** - Participants can view message history regardless of conversation status

---

### Notifications RLS Policies

The `notifications` table implements a **simple owner-only access** security pattern with 4 policies. This is the most straightforward RLS model in Love Ledger—each user can only access their own notifications.

#### Security Model Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATIONS RLS SECURITY MODEL                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Key Principle: Simple Owner-Only Access                                    │
│   ─────────────────────────────────────────                                  │
│   • Every notification belongs to exactly one user (via user_id)            │
│   • Users can only access notifications where user_id = auth.uid()          │
│   • No shared access, no complex joins, no exceptions                        │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     ALL OPERATIONS (CRUD)                            │   │
│   │                                                                      │   │
│   │   ┌─────────┐                                                        │   │
│   │   │ User A  │                                                        │   │
│   │   │         │──────────▶ User A Notifications  ✓ Full CRUD access   │   │
│   │   │         │                                                        │   │
│   │   │         │────╳─────▶ User B Notifications  ✗ No access          │   │
│   │   │         │                                                        │   │
│   │   │         │────╳─────▶ User C Notifications  ✗ No access          │   │
│   │   └─────────┘                                                        │   │
│   │                                                                      │   │
│   │   Every user exists in their own notification "silo"                 │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Ownership Model:                                                           │
│   ────────────────                                                           │
│                                                                              │
│   ┌───────────────────┐      ┌─────────────────────────────────────────┐   │
│   │     profiles      │      │            notifications                 │   │
│   ├───────────────────┤      ├─────────────────────────────────────────┤   │
│   │ id (PK)           │◄──FK─│ user_id                                 │   │
│   │ username          │      │ id (PK)                                 │   │
│   │ ...               │      │ type, reference_id, is_read, created_at │   │
│   └───────────────────┘      └─────────────────────────────────────────┘   │
│                                                                              │
│   Unlike profiles (where id = auth.uid()), notifications use user_id        │
│   as the foreign key to identify the owner.                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### The `user_id` Ownership Model

Notifications use `user_id` (not `id`) as the ownership field because:

1. **Separate Identity**: Notifications have their own UUID `id` as a primary key
2. **Foreign Key Reference**: `user_id` links to `profiles.id` (which equals `auth.users.id`)
3. **Clear Separation**: The notification's identity vs. the notification's owner are distinct concepts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      OWNERSHIP FIELD COMPARISON                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   PROFILES Table                    NOTIFICATIONS Table                       │
│   ────────────────                  ────────────────────                      │
│                                                                              │
│   ┌─────────────────────┐          ┌─────────────────────────────────────┐  │
│   │ id = 'user-abc-123' │          │ id = 'notif-xyz-789'                │  │
│   │     ▲               │          │ user_id = 'user-abc-123'            │  │
│   │     │               │          │         ▲                           │  │
│   │     └── This IS the │          │         └── This references the    │  │
│   │         user's ID   │          │             user (owner)            │  │
│   └─────────────────────┘          └─────────────────────────────────────┘  │
│                                                                              │
│   RLS Check:                        RLS Check:                                │
│   id = auth.uid()                   user_id = auth.uid()                     │
│                                                                              │
│   Why the difference?                                                         │
│   • profiles.id IS the auth.users.id (1:1 relationship)                      │
│   • notifications.id is a unique identifier for EACH notification            │
│   • One user can have MANY notifications (1:N relationship)                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Policy Definitions

##### 1. `notifications_select_own` (SELECT)

```sql
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

| Aspect | Details |
|--------|---------|
| **Operation** | SELECT |
| **Clause** | `USING (user_id = auth.uid())` |
| **Effect** | User can only read their own notifications |
| **Condition** | Only rows where `user_id` matches `auth.uid()` are visible |

**Why Owner-Only Read (Not Public)?**

Unlike profiles (which are publicly readable), notifications are strictly private:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  WHY NOTIFICATIONS ARE PRIVATE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Profiles: PUBLIC READ                Notifications: OWNER-ONLY READ       │
│   ────────────────────                 ──────────────────────────────       │
│                                                                              │
│   • Usernames need to be visible       • Contains activity information      │
│   • Avatars render in conversations    • Reveals who responded to posts     │
│   • No sensitive data stored           • Leaks conversation existence       │
│   • Essential for UI functionality     • Private by nature                  │
│                                                                              │
│   Notification Privacy Concerns:                                             │
│   ──────────────────────────────                                             │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │ If notifications were public, attackers could:                      │    │
│   │                                                                     │    │
│   │ 1. See who's receiving responses → track user activity             │    │
│   │ 2. See reference_id → discover conversation IDs                    │    │
│   │ 3. See timestamps → build behavioral profiles                      │    │
│   │ 4. Enumerate notifications → map the social graph                  │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**

```typescript
// ✓ Allowed: Fetch your own notifications
const { data: notifications, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });
// Returns: Array of user's notifications

// ✓ Allowed: Fetch unread notifications count
const { count, error } = await supabase
  .from('notifications')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('is_read', false);
// Returns: Number of unread notifications

// ✓ Allowed: Fetch notifications by type
const { data: newResponses, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', user.id)
  .eq('type', 'new_response')
  .eq('is_read', false);
// Returns: Unread response notifications for current user

// ✗ Blocked: Attempt to read another user's notifications
const { data, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', 'other-user-id');
// Returns: [] (empty array - USING filters out all rows)
// RLS silently returns no results rather than throwing an error

// ✗ Blocked: Attempt to read all notifications (enumeration attack)
const { data, error } = await supabase
  .from('notifications')
  .select('*');
// Returns: Only the current user's notifications (RLS filters automatically)
```

---

##### 2. `notifications_insert_own` (INSERT)

```sql
CREATE POLICY "notifications_insert_own" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
```

| Aspect | Details |
|--------|---------|
| **Operation** | INSERT |
| **Clause** | `WITH CHECK (user_id = auth.uid())` |
| **Effect** | User can only create notifications addressed to themselves |
| **Condition** | The `user_id` field of the new row must match `auth.uid()` |

**Important Design Note:**

While this policy allows users to insert their own notifications, in practice, notifications are typically created by the **backend/service role** or **database triggers** when events occur (new message, new response, etc.). The policy exists for completeness and potential client-side use cases.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   NOTIFICATION CREATION PATTERNS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Pattern 1: Service Role (Recommended)                                      │
│   ─────────────────────────────────────                                      │
│                                                                              │
│   Backend/Edge Function creates notifications for OTHER users:               │
│                                                                              │
│   ┌────────────┐       ┌─────────────────┐       ┌──────────────────┐       │
│   │   Event    │──────▶│  Backend/Edge   │──────▶│  notifications   │       │
│   │ (message   │       │   Function      │       │  (service_role   │       │
│   │  received) │       │  service_role   │       │   bypasses RLS)  │       │
│   └────────────┘       └─────────────────┘       └──────────────────┘       │
│                                                                              │
│   Example: When User A messages User B, the backend creates a notification  │
│   for User B using service_role (which bypasses RLS)                        │
│                                                                              │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                              │
│   Pattern 2: Database Trigger                                                │
│   ───────────────────────────                                                │
│                                                                              │
│   Trigger functions run with SECURITY DEFINER (bypasses RLS):               │
│                                                                              │
│   ┌────────────┐       ┌─────────────────┐       ┌──────────────────┐       │
│   │  INSERT    │──────▶│    TRIGGER      │──────▶│  notifications   │       │
│   │  message   │       │ create_notif()  │       │  (trigger runs   │       │
│   │            │       │ SECURITY DEFINER│       │   as owner)      │       │
│   └────────────┘       └─────────────────┘       └──────────────────┘       │
│                                                                              │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                              │
│   Pattern 3: Client-Side (Limited Use)                                       │
│   ────────────────────────────────────                                       │
│                                                                              │
│   User creates notification for THEMSELVES only:                             │
│                                                                              │
│   ┌────────────┐       ┌─────────────────┐       ┌──────────────────┐       │
│   │   Client   │──────▶│   RLS Policy    │──────▶│  notifications   │       │
│   │   User A   │       │ user_id = A ✓   │       │  (user_id = A)   │       │
│   └────────────┘       └─────────────────┘       └──────────────────┘       │
│                                                                              │
│   Use case: Self-reminders, debug notifications in development              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example Use Cases:**

```typescript
// ✓ Allowed: Create a notification for yourself (edge case)
const { data: notification, error } = await supabase
  .from('notifications')
  .insert({
    user_id: user.id,  // Must match auth.uid()
    type: 'new_response',
    reference_id: conversationId,
    is_read: false
  })
  .select()
  .single();
// Returns: The newly created notification

// ✗ Blocked: Attempt to create notification for another user
const { error } = await supabase
  .from('notifications')
  .insert({
    user_id: 'other-user-id',  // Does not match auth.uid()
    type: 'new_message',
    reference_id: conversationId
  });
// Error: new row violates row-level security policy
// Reason: user_id != auth.uid() fails WITH CHECK

// ✓ Service Role: Create notification for any user (bypasses RLS)
// This is typically done in backend Edge Functions
const { data, error } = await supabaseAdmin  // service_role client
  .from('notifications')
  .insert({
    user_id: recipientUserId,  // Can be any user
    type: 'new_message',
    reference_id: conversationId
  });
// Returns: Success - service_role bypasses RLS
```

---

##### 3. `notifications_update_own` (UPDATE)

```sql
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

| Aspect | Details |
|--------|---------|
| **Operation** | UPDATE |
| **Clauses** | `USING (user_id = auth.uid())` + `WITH CHECK (user_id = auth.uid())` |
| **USING Effect** | Can only target notifications you own |
| **WITH CHECK Effect** | Cannot change `user_id` to transfer notification to another user |

**Primary Use Case: Marking Notifications as Read**

The main reason users update notifications is to mark them as read. The dual-clause protection ensures:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION UPDATE FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   User marks notification as read:                                           │
│                                                                              │
│   UPDATE notifications SET is_read = TRUE WHERE id = 'notif-123'            │
│       │                                                                      │
│       ▼                                                                      │
│   ┌───────────────────────────────────────┐                                  │
│   │        STEP 1: USING Clause            │                                  │
│   │        "Can I access this row?"        │                                  │
│   │                                        │                                  │
│   │   SELECT * FROM notifications          │                                  │
│   │   WHERE id = 'notif-123'               │                                  │
│   │   AND user_id = auth.uid()             │◄── Only see own notifications   │
│   │                                        │                                  │
│   │   ✓ Found: notification belongs to me  │                                  │
│   │   ✗ Not found: no rows to update       │                                  │
│   └───────────────────────────────────────┘                                  │
│       │                                                                      │
│       ▼ (if row found)                                                       │
│   ┌───────────────────────────────────────┐                                  │
│   │      STEP 2: Apply Update              │                                  │
│   │                                        │                                  │
│   │   SET is_read = TRUE                   │                                  │
│   └───────────────────────────────────────┘                                  │
│       │                                                                      │
│       ▼                                                                      │
│   ┌───────────────────────────────────────┐                                  │
│   │      STEP 3: WITH CHECK Clause         │                                  │
│   │      "Is modified row still valid?"    │                                  │
│   │                                        │                                  │
│   │   user_id = auth.uid()                 │◄── Prevents ownership transfer  │
│   │                                        │                                  │
│   │   ✓ user_id unchanged: allowed         │                                  │
│   │   ✗ user_id changed: blocked           │                                  │
│   └───────────────────────────────────────┘                                  │
│       │                                                                      │
│       ▼                                                                      │
│   ✓ Update applied                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Common Update Operations:**

| Operation | Fields Modified | Allowed? |
|-----------|-----------------|----------|
| Mark as read | `is_read = TRUE` | ✓ Yes |
| Mark as unread | `is_read = FALSE` | ✓ Yes |
| Transfer ownership | `user_id = 'other-user'` | ✗ No (WITH CHECK fails) |

**Example Use Cases:**

```typescript
// ✓ Allowed: Mark single notification as read
const { data, error } = await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('id', notificationId)
  .eq('user_id', user.id)  // Good practice: explicit ownership check
  .select()
  .single();
// Returns: Updated notification with is_read = true

// ✓ Allowed: Mark all notifications as read
const { data, error } = await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('user_id', user.id)
  .eq('is_read', false);
// Updates all unread notifications for current user

// ✓ Allowed: Mark specific type of notifications as read
const { data, error } = await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('user_id', user.id)
  .eq('type', 'new_message')
  .eq('is_read', false);
// Marks all unread message notifications as read

// ✗ Blocked: Attempt to update another user's notification
const { data, error } = await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('id', 'other-users-notification-id');
// Result: No rows updated (USING filters out the row)
// The notification isn't visible to you, so nothing updates

// ✗ Blocked: Attempt to transfer notification to another user
const { error } = await supabase
  .from('notifications')
  .update({ user_id: 'other-user-id' })  // Trying to change owner
  .eq('id', myNotificationId)
  .eq('user_id', user.id);
// Error: new row violates row-level security policy
// Reason: WITH CHECK (user_id = auth.uid()) fails after update
```

---

##### 4. `notifications_delete_own` (DELETE)

```sql
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
```

| Aspect | Details |
|--------|---------|
| **Operation** | DELETE |
| **Clause** | `USING (user_id = auth.uid())` |
| **Effect** | Can only delete your own notifications |
| **Condition** | Only rows where `user_id` matches `auth.uid()` are deletable |

**Note:** DELETE only uses `USING` (not `WITH CHECK`) because there's no resulting row to validate—the row is being removed.

**Notification Deletion Scenarios:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  NOTIFICATION DELETION SCENARIOS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Scenario 1: Clear Single Notification                                      │
│   ─────────────────────────────────────                                      │
│                                                                              │
│   User dismisses a notification from their list:                             │
│                                                                              │
│   DELETE FROM notifications WHERE id = 'notif-123'                           │
│       │                                                                      │
│       ▼                                                                      │
│   ┌──────────────────────────────┐                                           │
│   │ USING: user_id = auth.uid() │                                           │
│   │                              │                                           │
│   │ Is 'notif-123' owned by me?  │                                           │
│   │ ✓ Yes → Delete allowed       │                                           │
│   │ ✗ No → No rows deleted       │                                           │
│   └──────────────────────────────┘                                           │
│                                                                              │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                                              │
│   Scenario 2: Clear All Notifications                                        │
│   ────────────────────────────────────                                        │
│                                                                              │
│   User clears their entire notification inbox:                               │
│                                                                              │
│   DELETE FROM notifications WHERE user_id = 'my-id'                          │
│       │                                                                      │
│       ▼                                                                      │
│   RLS automatically filters to only user's notifications                     │
│   All matching notifications deleted                                         │
│                                                                              │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                                              │
│   Scenario 3: Clear Read Notifications                                       │
│   ─────────────────────────────────────                                       │
│                                                                              │
│   User clears old, already-read notifications:                               │
│                                                                              │
│   DELETE FROM notifications                                                   │
│   WHERE user_id = 'my-id' AND is_read = TRUE                                 │
│       │                                                                      │
│       ▼                                                                      │
│   Only read notifications owned by user are deleted                          │
│   Unread notifications are preserved                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Cascade Behavior:**

Unlike some other tables, notifications have **no cascade effects**:

| Table | Cascade Effect When Deleted |
|-------|---------------------------|
| `profiles` | **Cascades to notifications** (all user's notifications deleted) |
| `conversations` | No cascade to notifications (notifications are independent) |
| `messages` | No cascade to notifications |
| `notifications` | **No cascades** (standalone data) |

**Example Use Cases:**

```typescript
// ✓ Allowed: Delete a single notification
const { error } = await supabase
  .from('notifications')
  .delete()
  .eq('id', notificationId)
  .eq('user_id', user.id);  // Good practice: explicit ownership
// Deletes the notification if owned by current user

// ✓ Allowed: Clear all notifications
const { error } = await supabase
  .from('notifications')
  .delete()
  .eq('user_id', user.id);
// Deletes all notifications for current user

// ✓ Allowed: Clear only read notifications
const { error } = await supabase
  .from('notifications')
  .delete()
  .eq('user_id', user.id)
  .eq('is_read', true);
// Deletes read notifications, preserves unread

// ✓ Allowed: Clear notifications older than 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const { error } = await supabase
  .from('notifications')
  .delete()
  .eq('user_id', user.id)
  .lt('created_at', thirtyDaysAgo.toISOString());
// Deletes old notifications for current user

// ✗ Blocked: Attempt to delete another user's notification
const { error } = await supabase
  .from('notifications')
  .delete()
  .eq('id', 'other-users-notification-id');
// Result: No rows deleted (USING filters out the row)
// Silent failure - no error, but nothing deleted

// ✗ Blocked: Attempt to delete all notifications (enumeration prevention)
const { error } = await supabase
  .from('notifications')
  .delete()
  .neq('user_id', 'some-value');  // Trying to match everyone
// Result: Only current user's notifications matching the filter are deleted
// RLS automatically scopes to user_id = auth.uid()
```

---

#### Notifications RLS vs Other Tables

The notifications table uses the **simplest** RLS model in Love Ledger:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RLS COMPLEXITY COMPARISON                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Table           │ Complexity │ Pattern           │ Key Features            │
│   ────────────────┼────────────┼───────────────────┼─────────────────────────│
│   notifications   │ ★☆☆☆☆     │ Owner-only        │ Simple user_id check    │
│   profiles        │ ★★☆☆☆     │ Public + owner    │ Public read, owner mod  │
│   locations       │ ★★☆☆☆     │ Public + auth     │ Auth for insert only    │
│   posts           │ ★★★☆☆     │ Conditional read  │ is_active OR owner      │
│   conversations   │ ★★★★☆     │ Participant-based │ EXISTS with validation  │
│   messages        │ ★★★★★     │ Multi-condition   │ Status + participant    │
│                                                                              │
│   Notifications Pattern:                                                      │
│   ───────────────────────                                                     │
│   • All 4 policies use the same check: user_id = auth.uid()                 │
│   • No joins or subqueries needed                                            │
│   • No conditional logic or status checks                                    │
│   • No multi-party access scenarios                                          │
│                                                                              │
│   Why So Simple?                                                              │
│   ───────────────                                                             │
│   • Notifications are strictly personal data                                 │
│   • One owner, no sharing, no exceptions                                     │
│   • Privacy is paramount for activity tracking                               │
│   • Simplicity reduces attack surface                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### Notifications RLS Quick Reference

| Policy | Operation | Clause(s) | Who Can Access |
|--------|-----------|-----------|----------------|
| `notifications_select_own` | SELECT | `USING (user_id = auth.uid())` | Notification recipient only |
| `notifications_insert_own` | INSERT | `WITH CHECK (user_id = auth.uid())` | Creating for yourself only |
| `notifications_update_own` | UPDATE | `USING + WITH CHECK (user_id = auth.uid())` | Notification recipient only |
| `notifications_delete_own` | DELETE | `USING (user_id = auth.uid())` | Notification recipient only |

**Key Takeaways:**

1. **Simple ownership model** - All 4 policies use the same check: `user_id = auth.uid()`
2. **Strictly private** - Unlike profiles (public read), notifications are never visible to other users
3. **user_id vs id** - Ownership is determined by `user_id` field (references `profiles.id`), not the notification's own `id`
4. **Service role for cross-user** - Creating notifications for other users requires service_role (backend operations)
5. **No cascades on delete** - Deleting notifications doesn't affect any other tables
6. **Profile cascade** - When a profile is deleted, all user's notifications are automatically removed (FK cascade)

[↑ Back to Table of Contents](#table-of-contents)

---

## Functions and Triggers

Love Ledger uses PostgreSQL functions and triggers for automatic data maintenance and security. This section documents all database functions and their associated triggers.

### Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FUNCTIONS AND TRIGGERS OVERVIEW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   AUTOMATIC TIMESTAMP MANAGEMENT                                             │
│   ───────────────────────────────                                            │
│                                                                              │
│   ┌──────────────────┐     BEFORE UPDATE      ┌─────────────────────────┐   │
│   │     profiles     │ ─────────────────────▶ │ update_updated_at_column│   │
│   │   conversations  │                        │        function         │   │
│   └──────────────────┘                        └─────────────────────────┘   │
│                                                                              │
│   LOCATION POST COUNT CACHE                                                  │
│   ─────────────────────────                                                  │
│                                                                              │
│   ┌──────────────────┐     AFTER INSERT       ┌─────────────────────────┐   │
│   │      posts       │ ─────────────────────▶ │ increment_location_     │   │
│   │                  │                        │    post_count           │   │
│   │                  │     AFTER DELETE       ├─────────────────────────┤   │
│   │                  │ ─────────────────────▶ │ decrement_location_     │   │
│   └──────────────────┘                        │    post_count           │   │
│                                               └─────────────────────────┘   │
│                                                                              │
│   HELPER FUNCTIONS (for RLS policies)                                        │
│   ───────────────────────────────────                                        │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │   is_conversation_participant(conversation_id, user_id)              │   │
│   │   ─────────────────────────────────────────────────────              │   │
│   │   Returns TRUE if user is producer or consumer of conversation       │   │
│   │   Used in messages RLS policies for access control                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Quick Reference

| Function | Type | Purpose | Security |
|----------|------|---------|----------|
| `update_updated_at_column()` | Trigger Function | Auto-update `updated_at` timestamps | INVOKER |
| `increment_location_post_count()` | Trigger Function | Increment location's `post_count` on post insert | SECURITY DEFINER |
| `decrement_location_post_count()` | Trigger Function | Decrement location's `post_count` on post delete | SECURITY DEFINER |
| `is_conversation_participant()` | Helper Function | Check if user is participant in conversation | SECURITY DEFINER |

### Triggers Summary

| Trigger Name | Table | Timing | Event | Function |
|--------------|-------|--------|-------|----------|
| `set_profiles_updated_at` | `profiles` | BEFORE | UPDATE | `update_updated_at_column()` |
| `conversations_updated_at` | `conversations` | BEFORE | UPDATE | `update_updated_at_column()` |
| `posts_increment_location_count` | `posts` | AFTER | INSERT | `increment_location_post_count()` |
| `posts_decrement_location_count` | `posts` | AFTER | DELETE | `decrement_location_post_count()` |

---

### Timestamp Management Functions

#### update_updated_at_column()

Automatically sets the `updated_at` column to the current timestamp whenever a row is updated.

**Function Definition:**

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

| Attribute | Value |
|-----------|-------|
| **Return Type** | `TRIGGER` |
| **Language** | PL/pgSQL |
| **Security** | INVOKER (runs as calling user) |
| **Volatility** | VOLATILE |

**How It Works:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     update_updated_at_column() FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   User updates a row                                                         │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │   UPDATE profiles SET username = 'newname' WHERE id = ...   │           │
│   └─────────────────────────────────────────────────────────────┘           │
│       │                                                                      │
│       │ BEFORE UPDATE trigger fires                                          │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │   update_updated_at_column()                                 │           │
│   │   ─────────────────────────────────                          │           │
│   │   NEW.updated_at = now()                                     │           │
│   │   RETURN NEW                                                 │           │
│   └─────────────────────────────────────────────────────────────┘           │
│       │                                                                      │
│       ▼                                                                      │
│   Row is updated with:                                                       │
│   - User's changes (e.g., username = 'newname')                             │
│   - Automatically updated timestamp (updated_at = '2024-01-15T10:30:00Z')   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Triggers Using This Function:**

##### set_profiles_updated_at

```sql
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

| Attribute | Value |
|-----------|-------|
| **Table** | `profiles` |
| **Timing** | BEFORE UPDATE |
| **Granularity** | FOR EACH ROW |
| **Purpose** | Track when user profiles are modified |

**Use Cases:**
- Display "last updated" time on user profiles
- Sync profiles to external systems based on modification time
- Audit trail for profile changes

##### conversations_updated_at

```sql
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

| Attribute | Value |
|-----------|-------|
| **Table** | `conversations` |
| **Timing** | BEFORE UPDATE |
| **Granularity** | FOR EACH ROW |
| **Purpose** | Track conversation status changes and activity |

**Use Cases:**
- Sort conversations by recent activity
- Track when status changes (pending → active, etc.)
- Display "last activity" in conversation lists

**TypeScript Example:**

```typescript
// When you update a profile, updated_at is automatically set
const { data, error } = await supabase
  .from('profiles')
  .update({ username: 'newusername' })
  .eq('id', userId)
  .select()
  .single();

console.log(data.updated_at);  // Automatically set to current time

// Sort conversations by most recently updated
const { data: conversations } = await supabase
  .from('conversations')
  .select('*')
  .order('updated_at', { ascending: false })
  .limit(20);
```

---

### Location Post Count Functions

These functions maintain the `post_count` counter cache on the `locations` table. They use `SECURITY DEFINER` to bypass RLS since users cannot directly update locations.

#### increment_location_post_count()

Increments the `post_count` of a location when a new post is created.

**Function Definition:**

```sql
CREATE OR REPLACE FUNCTION increment_location_post_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE locations
  SET post_count = post_count + 1
  WHERE id = NEW.location_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

| Attribute | Value |
|-----------|-------|
| **Return Type** | `TRIGGER` |
| **Language** | PL/pgSQL |
| **Security** | SECURITY DEFINER (runs as function owner) |
| **Search Path** | `public` (explicit for security) |
| **Accesses** | `NEW.location_id` (the inserted post's location) |

**Trigger Definition:**

```sql
CREATE TRIGGER posts_increment_location_count
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION increment_location_post_count();
```

| Attribute | Value |
|-----------|-------|
| **Table** | `posts` |
| **Timing** | AFTER INSERT |
| **Granularity** | FOR EACH ROW |
| **Fired When** | A new post is created |

---

#### decrement_location_post_count()

Decrements the `post_count` of a location when a post is deleted, ensuring it never goes below zero.

**Function Definition:**

```sql
CREATE OR REPLACE FUNCTION decrement_location_post_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE locations
  SET post_count = GREATEST(post_count - 1, 0)
  WHERE id = OLD.location_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

| Attribute | Value |
|-----------|-------|
| **Return Type** | `TRIGGER` |
| **Language** | PL/pgSQL |
| **Security** | SECURITY DEFINER (runs as function owner) |
| **Search Path** | `public` (explicit for security) |
| **Accesses** | `OLD.location_id` (the deleted post's location) |
| **Safety** | Uses `GREATEST(..., 0)` to prevent negative values |

**Trigger Definition:**

```sql
CREATE TRIGGER posts_decrement_location_count
  AFTER DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION decrement_location_post_count();
```

| Attribute | Value |
|-----------|-------|
| **Table** | `posts` |
| **Timing** | AFTER DELETE |
| **Granularity** | FOR EACH ROW |
| **Fired When** | A post is deleted |

---

#### Post Count Trigger Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      POST COUNT MANAGEMENT FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         POST CREATION                                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   User: INSERT INTO posts (location_id, ...)                                │
│       │                                                                      │
│       │ Row Level Security: posts_insert_own policy                          │
│       │ (Validates producer_id = auth.uid())                                │
│       ▼                                                                      │
│   Post is inserted successfully                                              │
│       │                                                                      │
│       │ AFTER INSERT trigger fires                                           │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │   increment_location_post_count()                            │           │
│   │   ───────────────────────────────                            │           │
│   │   Runs as SECURITY DEFINER (bypasses RLS)                    │           │
│   │                                                              │           │
│   │   UPDATE locations                                           │           │
│   │   SET post_count = post_count + 1                           │           │
│   │   WHERE id = NEW.location_id                                 │           │
│   └─────────────────────────────────────────────────────────────┘           │
│       │                                                                      │
│       ▼                                                                      │
│   Location.post_count: 5 → 6                                                │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         POST DELETION                                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   User: DELETE FROM posts WHERE id = ...                                    │
│       │                                                                      │
│       │ Row Level Security: posts_delete_own policy                          │
│       │ (Validates producer_id = auth.uid())                                │
│       ▼                                                                      │
│   Post is deleted successfully                                               │
│       │                                                                      │
│       │ AFTER DELETE trigger fires                                           │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │   decrement_location_post_count()                            │           │
│   │   ───────────────────────────────                            │           │
│   │   Runs as SECURITY DEFINER (bypasses RLS)                    │           │
│   │                                                              │           │
│   │   UPDATE locations                                           │           │
│   │   SET post_count = GREATEST(post_count - 1, 0)              │           │
│   │   WHERE id = OLD.location_id                                 │           │
│   └─────────────────────────────────────────────────────────────┘           │
│       │                                                                      │
│       ▼                                                                      │
│   Location.post_count: 6 → 5                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why SECURITY DEFINER?**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SECURITY DEFINER EXPLANATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Problem: Users should NOT be able to update locations directly             │
│   ─────────────────────────────────────────────────────────────              │
│   - No UPDATE policy exists on locations table                               │
│   - This prevents users from modifying location names, addresses, etc.       │
│   - But we need to update post_count when posts are created/deleted          │
│                                                                              │
│   Solution: SECURITY DEFINER functions                                       │
│   ──────────────────────────────────────                                     │
│                                                                              │
│   ┌─────────────┐                     ┌─────────────────────────────────┐   │
│   │    User     │                     │       Trigger Function          │   │
│   │  (limited   │ ─── triggers ─────▶ │     (SECURITY DEFINER)          │   │
│   │ privileges) │                     │   Runs as function OWNER        │   │
│   └─────────────┘                     │   (has full privileges)         │   │
│                                       └─────────────────────────────────┘   │
│                                                   │                          │
│                                                   ▼                          │
│                                       ┌─────────────────────────────────┐   │
│                                       │   UPDATE locations              │   │
│                                       │   SET post_count = ...          │   │
│                                       │   ✓ Allowed (owner privileges)  │   │
│                                       └─────────────────────────────────┘   │
│                                                                              │
│   Security Measures:                                                         │
│   ─────────────────                                                          │
│   1. SET search_path = public  → Prevents search path injection attacks     │
│   2. Trigger logic only        → No arbitrary SQL from user input           │
│   3. Only affects post_count   → Limited, controlled scope                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**TypeScript Example:**

```typescript
// Creating a post automatically increments location.post_count
const { data: post, error } = await supabase
  .from('posts')
  .insert({
    producer_id: userId,
    location_id: locationId,
    target_description: 'Saw you at the coffee counter',
    message: 'Would love to chat!',
    seen_at: new Date().toISOString()
  })
  .select()
  .single();

// The location's post_count is now incremented (no manual update needed)
// Query to verify:
const { data: location } = await supabase
  .from('locations')
  .select('post_count')
  .eq('id', locationId)
  .single();

console.log(location.post_count);  // Automatically incremented

// Deleting a post automatically decrements location.post_count
const { error: deleteError } = await supabase
  .from('posts')
  .delete()
  .eq('id', postId);

// The location's post_count is now decremented automatically
```

**Edge Cases Handled:**

| Scenario | Behavior |
|----------|----------|
| Post created at new location | `post_count` goes from 0 → 1 |
| Last post at location deleted | `post_count` goes from 1 → 0 (never negative) |
| Concurrent post creations | Each trigger runs atomically |
| Post deletion during ongoing transaction | Trigger fires only on commit |

---

### Helper Functions

#### is_conversation_participant()

A helper function that checks if a user is a participant (either producer or consumer) in a conversation. Used primarily in RLS policies for the `messages` table.

**Function Definition:**

```sql
CREATE OR REPLACE FUNCTION is_conversation_participant(
  conversation_uuid UUID,
  user_uuid UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_uuid
      AND (producer_id = user_uuid OR consumer_id = user_uuid)
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

| Attribute | Value |
|-----------|-------|
| **Return Type** | `BOOLEAN` |
| **Language** | PL/pgSQL |
| **Parameters** | `conversation_uuid UUID`, `user_uuid UUID` |
| **Security** | SECURITY DEFINER |
| **Volatility** | STABLE (consistent within transaction) |
| **Search Path** | `public` (explicit for security) |

**How It Works:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               is_conversation_participant() FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Input: conversation_uuid, user_uuid                                        │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │   SELECT 1 FROM conversations                                │           │
│   │   WHERE id = conversation_uuid                               │           │
│   │     AND (producer_id = user_uuid OR consumer_id = user_uuid) │           │
│   └─────────────────────────────────────────────────────────────┘           │
│       │                                                                      │
│       ├── Row found ───────────▶ RETURN TRUE  (user is participant)         │
│       │                                                                      │
│       └── No row found ────────▶ RETURN FALSE (user is NOT participant)     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Usage in RLS Policies:**

The function simplifies RLS policy definitions by encapsulating the participant check logic:

```sql
-- Example: messages SELECT policy
CREATE POLICY messages_select_participants ON messages
  FOR SELECT
  USING (
    is_conversation_participant(conversation_id, auth.uid())
  );

-- Without the helper function, you'd need:
CREATE POLICY messages_select_participants ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (
          conversations.producer_id = auth.uid()
          OR conversations.consumer_id = auth.uid()
        )
    )
  );
```

**Why SECURITY DEFINER?**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              WHY is_conversation_participant() USES SECURITY DEFINER         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   RLS Policy Evaluation Context:                                             │
│   ──────────────────────────────                                             │
│                                                                              │
│   When evaluating RLS policies, the function needs to read the              │
│   conversations table. With SECURITY DEFINER, it can:                        │
│                                                                              │
│   1. Access conversations table reliably                                     │
│   2. Avoid recursive RLS checks (function runs as owner)                     │
│   3. Return consistent results regardless of calling context                 │
│                                                                              │
│   ┌─────────────┐     Policy Check     ┌─────────────────────────────────┐  │
│   │   User      │ ──────────────────▶  │  messages RLS policy             │  │
│   │   SELECT    │                      │  calls is_conversation_          │  │
│   │   messages  │                      │  participant(conv_id, uid)       │  │
│   └─────────────┘                      └─────────────────────────────────┘  │
│                                                    │                         │
│                                                    ▼                         │
│                                        ┌─────────────────────────────────┐  │
│                                        │  Function runs as OWNER         │  │
│                                        │  Reads conversations table      │  │
│                                        │  Returns TRUE/FALSE             │  │
│                                        └─────────────────────────────────┘  │
│                                                    │                         │
│                                                    ▼                         │
│                                        ┌─────────────────────────────────┐  │
│                                        │  RLS policy allows/denies       │  │
│                                        │  based on function result       │  │
│                                        └─────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**STABLE Volatility:**

The function is marked as `STABLE` because:
- It returns the same result for the same inputs within a single transaction
- It only reads data (no modifications)
- PostgreSQL can optimize multiple calls with the same parameters

**TypeScript Example:**

```typescript
// The helper function is used internally by RLS policies
// You don't call it directly, but it protects your queries:

// ✓ User can read messages in their conversations
const { data: messages, error } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId);  // RLS uses is_conversation_participant()

// ✗ User cannot read messages from other conversations
// (is_conversation_participant returns FALSE, RLS denies access)

// If you needed to call it directly (e.g., from a server function):
const { data, error } = await supabase
  .rpc('is_conversation_participant', {
    conversation_uuid: conversationId,
    user_uuid: userId
  });

console.log(data);  // true or false
```

**Comparison: With vs Without Helper Function:**

| Aspect | With Helper Function | Without (Inline EXISTS) |
|--------|---------------------|------------------------|
| **Readability** | Clean, self-documenting | Verbose, harder to read |
| **Maintainability** | Single point of change | Multiple policies to update |
| **Performance** | STABLE allows optimization | Each policy re-evaluates |
| **Consistency** | Guaranteed same logic | Risk of inconsistent checks |
| **Testing** | Can test function directly | Must test each policy |

---

### Function Security Best Practices

Love Ledger follows PostgreSQL security best practices for all database functions:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FUNCTION SECURITY BEST PRACTICES                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. EXPLICIT SEARCH_PATH                                                    │
│   ───────────────────────                                                    │
│      SET search_path = public                                                │
│      Prevents search path injection attacks by explicitly setting the        │
│      schema to search. Without this, attackers could create malicious        │
│      functions in a schema that comes before 'public' in the search path.   │
│                                                                              │
│   2. SECURITY DEFINER vs INVOKER                                             │
│   ──────────────────────────────                                             │
│      SECURITY DEFINER: Function runs with owner's privileges                 │
│        → Used when function needs elevated access (e.g., triggers)          │
│        → Must be carefully audited                                           │
│                                                                              │
│      SECURITY INVOKER: Function runs with caller's privileges (default)     │
│        → Safer, subject to caller's RLS policies                             │
│        → Used when no privilege escalation is needed                         │
│                                                                              │
│   3. MINIMAL PRIVILEGE PRINCIPLE                                             │
│   ──────────────────────────────                                             │
│      Each function only has access to what it needs:                         │
│      - increment/decrement only touch post_count                            │
│      - is_conversation_participant only reads conversations                  │
│      - update_updated_at_column only modifies the triggering row            │
│                                                                              │
│   4. VOLATILITY MARKING                                                      │
│   ─────────────────────                                                      │
│      VOLATILE: Can modify data, may return different results (default)       │
│      STABLE: Returns same result within transaction, reads only              │
│      IMMUTABLE: Always returns same result for same inputs                   │
│                                                                              │
│      Correct marking allows PostgreSQL to optimize query execution.          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Functions and Triggers Quick Reference

#### All Functions

| Function | Parameters | Returns | Security | Purpose |
|----------|------------|---------|----------|---------|
| `update_updated_at_column()` | None (trigger) | `TRIGGER` | INVOKER | Auto-update timestamps |
| `increment_location_post_count()` | None (trigger) | `TRIGGER` | DEFINER | Increment location counter |
| `decrement_location_post_count()` | None (trigger) | `TRIGGER` | DEFINER | Decrement location counter |
| `is_conversation_participant(uuid, uuid)` | `conversation_uuid`, `user_uuid` | `BOOLEAN` | DEFINER | Check participant status |

#### All Triggers by Table

**profiles:**
| Trigger | Event | Function |
|---------|-------|----------|
| `set_profiles_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |

**posts:**
| Trigger | Event | Function |
|---------|-------|----------|
| `posts_increment_location_count` | AFTER INSERT | `increment_location_post_count()` |
| `posts_decrement_location_count` | AFTER DELETE | `decrement_location_post_count()` |

**conversations:**
| Trigger | Event | Function |
|---------|-------|----------|
| `conversations_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |

**locations, messages, notifications:**
| Trigger | Event | Function |
|---------|-------|----------|
| (none) | - | - |

[↑ Back to Table of Contents](#table-of-contents)

---

## TypeScript Integration

This section documents how the database schema integrates with TypeScript types in the Love Ledger application. Type definitions provide compile-time safety and IntelliSense support when working with the Supabase client.

### File Reference

```
types/
├── database.ts     # Database type definitions
└── avatar.ts       # AvatarConfig type definitions
```

### Core Type Files

#### `types/database.ts`

The main database type definitions file that maps PostgreSQL schema to TypeScript interfaces.

```typescript
import type { Database } from '@/types/database'
import { createClient } from '@supabase/supabase-js'

// Create typed Supabase client
const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)
```

#### `types/avatar.ts`

Defines the `AvatarConfig` interface used in the `avatar_config` (profiles) and `target_avatar` (posts) JSONB fields.

---

### Type Pattern: Row / Insert / Update

Each database table has **three corresponding TypeScript interfaces** that map to different use cases:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Type Pattern Per Table                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│   │     Row      │    │    Insert    │    │    Update    │          │
│   │  (SELECT)    │    │   (INSERT)   │    │   (UPDATE)   │          │
│   ├──────────────┤    ├──────────────┤    ├──────────────┤          │
│   │ All fields   │    │ Required +   │    │ All fields   │          │
│   │ required     │    │ Optional     │    │ optional     │          │
│   └──────────────┘    └──────────────┘    └──────────────┘          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

| Interface Pattern | Use Case | Field Optionality |
|-------------------|----------|-------------------|
| `{Table}` (Row) | Reading data from database | All fields required |
| `{Table}Insert` | Creating new records | Required fields + optional defaults |
| `{Table}Update` | Modifying existing records | All fields optional (partial update) |

#### Example: Profile Types

```typescript
// Row type - represents data read from the database
export interface Profile {
  id: UUID                        // Always present
  username: string | null         // Always present (nullable)
  avatar_config: AvatarConfig | null
  created_at: Timestamp           // Always present
  updated_at: Timestamp           // Always present
}

// Insert type - for creating new profiles
export interface ProfileInsert {
  id: UUID                        // Required (from auth.users)
  username?: string | null        // Optional (defaults to null)
  avatar_config?: AvatarConfig | null
  created_at?: Timestamp          // Optional (auto-generated)
  updated_at?: Timestamp          // Optional (auto-generated)
}

// Update type - for modifying profiles
export interface ProfileUpdate {
  username?: string | null        // Optional
  avatar_config?: AvatarConfig | null
  updated_at?: Timestamp          // Optional (trigger updates)
}
```

#### Type Definitions by Table

**profiles**
```typescript
Profile          // Row type (SELECT)
ProfileInsert    // Insert type (INSERT)
ProfileUpdate    // Update type (UPDATE)
```

**locations**
```typescript
Location         // Row type (SELECT)
LocationInsert   // Insert type (INSERT)
LocationUpdate   // Update type (UPDATE - service role only)
```

**posts**
```typescript
Post             // Row type (SELECT)
PostInsert       // Insert type (INSERT)
PostUpdate       // Update type (UPDATE)
```

**conversations**
```typescript
Conversation         // Row type (SELECT)
ConversationInsert   // Insert type (INSERT)
ConversationUpdate   // Update type (UPDATE)
```

**messages**
```typescript
Message          // Row type (SELECT)
MessageInsert    // Insert type (INSERT)
MessageUpdate    // Update type (UPDATE)
```

**notifications**
```typescript
Notification         // Row type (SELECT)
NotificationInsert   // Insert type (INSERT)
NotificationUpdate   // Update type (UPDATE)
```

---

### Base Types

The database types build on these fundamental type definitions:

```typescript
// UUID string type (matches PostgreSQL UUID)
export type UUID = string

// ISO 8601 timestamp string (matches PostgreSQL TIMESTAMPTZ)
export type Timestamp = string  // e.g., "2024-01-15T10:30:00.000Z"
```

### Enum Types

Status and type enums are defined as TypeScript union types:

```typescript
// Conversation status (conversations.status)
export type ConversationStatus = 'pending' | 'active' | 'declined' | 'blocked'

// Notification types (notifications.type)
export type NotificationType = 'new_response' | 'new_message' | 'response_accepted'
```

---

### Joined Types

For queries that join multiple tables, the application defines extended types that include related data:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Joined Types                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   PostWithLocation                                                   │
│   ├── All Post fields                                               │
│   └── location: Location                                            │
│                                                                      │
│   PostWithProducer                                                   │
│   ├── All Post fields                                               │
│   └── producer: Profile                                             │
│                                                                      │
│   PostWithDetails                                                    │
│   ├── All Post fields                                               │
│   ├── location: Location                                            │
│   └── producer: Profile                                             │
│                                                                      │
│   ConversationWithParticipants                                       │
│   ├── All Conversation fields                                       │
│   ├── producer: Profile                                             │
│   ├── consumer: Profile                                             │
│   └── post: Post                                                    │
│                                                                      │
│   MessageWithSender                                                  │
│   ├── All Message fields                                            │
│   └── sender: Profile                                               │
│                                                                      │
│   NotificationWithReference                                          │
│   ├── All Notification fields                                       │
│   ├── conversation?: Conversation                                   │
│   └── post?: Post                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Joined Type Definitions

```typescript
// Post with its location details
export interface PostWithLocation extends Post {
  location: Location
}

// Post with producer profile
export interface PostWithProducer extends Post {
  producer: Profile
}

// Post with full details (location + producer)
export interface PostWithDetails extends Post {
  location: Location
  producer: Profile
}

// Conversation with all participant profiles
export interface ConversationWithParticipants extends Conversation {
  producer: Profile
  consumer: Profile
  post: Post
}

// Message with sender profile
export interface MessageWithSender extends Message {
  sender: Profile
}

// Notification with referenced entity
export interface NotificationWithReference extends Notification {
  conversation?: Conversation  // For new_message, response_accepted
  post?: Post                  // For new_response
}
```

---

### Database Schema Type

The `Database` interface provides complete typing for the Supabase client, enabling type-safe queries across all tables:

```typescript
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      locations: {
        Row: Location
        Insert: LocationInsert
        Update: LocationUpdate
      }
      posts: {
        Row: Post
        Insert: PostInsert
        Update: PostUpdate
      }
      conversations: {
        Row: Conversation
        Insert: ConversationInsert
        Update: ConversationUpdate
      }
      messages: {
        Row: Message
        Insert: MessageInsert
        Update: MessageUpdate
      }
      notifications: {
        Row: Notification
        Insert: NotificationInsert
        Update: NotificationUpdate
      }
    }
  }
}
```

---

### Supabase Client Usage Examples

#### Creating a Typed Client

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Create typed client (browser)
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Create typed client (server with service role)
export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

#### Basic CRUD Operations

**SELECT (Row type)**
```typescript
// Fetch profile - result is typed as Profile | null
const { data: profile, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()

// TypeScript knows: profile.username, profile.avatar_config, etc.
if (profile) {
  console.log(profile.username)      // string | null
  console.log(profile.created_at)    // string (Timestamp)
}
```

**INSERT (Insert type)**
```typescript
// Create profile - input is typed as ProfileInsert
const { data, error } = await supabase
  .from('profiles')
  .insert({
    id: userId,                      // Required
    username: 'newuser',             // Optional
    // created_at auto-generated
    // updated_at auto-generated
  })
  .select()
  .single()
```

**UPDATE (Update type)**
```typescript
// Update profile - input is typed as ProfileUpdate
const { data, error } = await supabase
  .from('profiles')
  .update({
    username: 'updated_username',    // Only fields being updated
    avatar_config: newAvatarConfig,
    // updated_at handled by trigger
  })
  .eq('id', userId)
  .select()
  .single()
```

**DELETE**
```typescript
const { error } = await supabase
  .from('profiles')
  .delete()
  .eq('id', userId)
```

#### Joined Queries with Type Assertions

**PostWithLocation**
```typescript
const { data: posts, error } = await supabase
  .from('posts')
  .select(`
    *,
    location:locations(*)
  `)
  .eq('is_active', true)

// Assert type for joined data
const typedPosts = posts as PostWithLocation[]

typedPosts.forEach(post => {
  console.log(post.message)           // From Post
  console.log(post.location.name)     // From Location
  console.log(post.location.address)  // From Location
})
```

**PostWithDetails**
```typescript
const { data: posts, error } = await supabase
  .from('posts')
  .select(`
    *,
    location:locations(*),
    producer:profiles!producer_id(*)
  `)
  .eq('is_active', true)

const typedPosts = posts as PostWithDetails[]

typedPosts.forEach(post => {
  console.log(post.message)              // From Post
  console.log(post.location.name)        // From Location
  console.log(post.producer.username)    // From Profile
})
```

**ConversationWithParticipants**
```typescript
const { data: conversations, error } = await supabase
  .from('conversations')
  .select(`
    *,
    producer:profiles!producer_id(*),
    consumer:profiles!consumer_id(*),
    post:posts(*)
  `)
  .eq('status', 'active')

const typedConversations = conversations as ConversationWithParticipants[]

typedConversations.forEach(conv => {
  console.log(conv.producer.username)    // Producer profile
  console.log(conv.consumer.username)    // Consumer profile
  console.log(conv.post.message)         // Related post
})
```

**MessageWithSender**
```typescript
const { data: messages, error } = await supabase
  .from('messages')
  .select(`
    *,
    sender:profiles!sender_id(*)
  `)
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true })

const typedMessages = messages as MessageWithSender[]

typedMessages.forEach(msg => {
  console.log(msg.content)              // Message content
  console.log(msg.sender.username)      // Sender's username
  console.log(msg.sender.avatar_config) // Sender's avatar
})
```

#### Real-time Subscriptions with Types

```typescript
// Subscribe to new messages with typed payload
const channel = supabase
  .channel('messages')
  .on<Message>(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      const newMessage: Message = payload.new
      console.log(newMessage.content)
      console.log(newMessage.sender_id)
    }
  )
  .subscribe()
```

#### Working with JSONB Fields (AvatarConfig)

```typescript
import type { AvatarConfig } from '@/types/avatar'

// Reading avatar config
const { data: profile } = await supabase
  .from('profiles')
  .select('avatar_config')
  .eq('id', userId)
  .single()

const avatarConfig: AvatarConfig | null = profile?.avatar_config

// Updating avatar config
const newConfig: AvatarConfig = {
  topType: 'ShortHairShortFlat',
  hairColor: 'Brown',
  clotheType: 'Hoodie',
  eyeType: 'Happy',
  skinColor: 'Light',
}

await supabase
  .from('profiles')
  .update({ avatar_config: newConfig })
  .eq('id', userId)
```

---

### Type Utilities and Helpers

#### Extracting Types from Database Interface

```typescript
import type { Database } from '@/types/database'

// Extract Row types
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type PostRow = Database['public']['Tables']['posts']['Row']

// Extract Insert types
type ProfileInsertType = Database['public']['Tables']['profiles']['Insert']

// Extract Update types
type ProfileUpdateType = Database['public']['Tables']['profiles']['Update']
```

#### Type Guards

```typescript
import { isValidAvatarConfig } from '@/types/avatar'

// Validate avatar config at runtime
function updateAvatar(config: unknown): void {
  if (isValidAvatarConfig(config)) {
    // config is now typed as AvatarConfig
    console.log(config.topType)
  }
}
```

---

### Quick Reference: Type Mappings

| PostgreSQL Type | TypeScript Type | Notes |
|-----------------|-----------------|-------|
| `UUID` | `string` | Aliased as `UUID` type |
| `TIMESTAMPTZ` | `string` | ISO 8601 format, aliased as `Timestamp` |
| `TEXT` | `string` | - |
| `TEXT[]` | `string[]` | Array of strings |
| `BOOLEAN` | `boolean` | - |
| `INTEGER` | `number` | - |
| `DOUBLE PRECISION` | `number` | For latitude/longitude |
| `JSONB` | `AvatarConfig \| null` | Typed as specific interface |
| `VARCHAR(50)` | `string` | Status enums use union types |

### Quick Reference: Joined Types

| Joined Type | Base Table | Joined Tables | Use Case |
|-------------|------------|---------------|----------|
| `PostWithLocation` | posts | locations | Display posts with place names |
| `PostWithProducer` | posts | profiles | Show post author info |
| `PostWithDetails` | posts | locations, profiles | Full post display |
| `ConversationWithParticipants` | conversations | profiles (x2), posts | Chat list display |
| `MessageWithSender` | messages | profiles | Chat messages with avatars |
| `NotificationWithReference` | notifications | conversations, posts | Rich notifications |

[↑ Back to Table of Contents](#table-of-contents)

---

## Quick Reference

This section provides at-a-glance summaries of all database components for quick lookup. For detailed information, click the links to navigate to the relevant sections.

---

### Tables Quick Reference

| Table | Columns | Primary Key | Foreign Keys | RLS Policies | Description |
|-------|---------|-------------|--------------|--------------|-------------|
| [`profiles`](#profiles) | 5 | `id` (from auth.users) | auth.users(id) | 4 | User profiles linked to Supabase auth |
| [`locations`](#locations) | 9 | `id` (UUID) | None | 2 | Physical places with GPS coordinates |
| [`posts`](#posts) | 11 | `id` (UUID) | producer_id → profiles, location_id → locations | 4 | "Missed connection" posts at locations |
| [`conversations`](#conversations) | 7 | `id` (UUID) | post_id → posts, producer_id → profiles, consumer_id → profiles | 4 | Private chats between producer and consumer |
| [`messages`](#messages) | 5 | `id` (UUID) | conversation_id → conversations, sender_id → profiles | 4 | Chat messages within conversations |
| [`notifications`](#notifications) | 6 | `id` (UUID) | user_id → profiles | 4 | User notifications for app events |

**Totals:** 6 tables, 43 columns, 22 RLS policies

---

### RLS Policies Quick Reference

All RLS policies follow the naming convention: `{table}_{operation}_{scope}`

#### profiles (4 policies)

| Policy Name | Operation | Scope | Access Pattern |
|-------------|-----------|-------|----------------|
| `profiles_select_all` | SELECT | All authenticated | Any authenticated user can view any profile |
| `profiles_insert_own` | INSERT | Own | Users can only create their own profile (id = auth.uid()) |
| `profiles_update_own` | UPDATE | Own | Users can only update their own profile |
| `profiles_delete_own` | DELETE | Own | Users can only delete their own profile |

[↑ Back to profiles table](#profiles) · [↑ Back to RLS section](#row-level-security-rls)

#### locations (2 policies)

| Policy Name | Operation | Scope | Access Pattern |
|-------------|-----------|-------|----------------|
| `locations_select_all` | SELECT | All authenticated | Any authenticated user can view locations |
| `locations_insert_authenticated` | INSERT | Authenticated | Any authenticated user can add new locations |

**Note:** UPDATE and DELETE require service_role (admin only)

[↑ Back to locations table](#locations) · [↑ Back to RLS section](#row-level-security-rls)

#### posts (4 policies)

| Policy Name | Operation | Scope | Access Pattern |
|-------------|-----------|-------|----------------|
| `posts_select_active` | SELECT | Active or Own | View active posts OR own posts (regardless of status) |
| `posts_insert_own` | INSERT | Own | Only create posts as yourself (producer_id = auth.uid()) |
| `posts_update_own` | UPDATE | Own | Only update your own posts |
| `posts_delete_own` | DELETE | Own | Only delete your own posts |

[↑ Back to posts table](#posts) · [↑ Back to RLS section](#row-level-security-rls)

#### conversations (4 policies)

| Policy Name | Operation | Scope | Access Pattern |
|-------------|-----------|-------|----------------|
| `conversations_select_participant` | SELECT | Participants | Only producer or consumer can view |
| `conversations_insert_consumer` | INSERT | Consumer | Only consumers can start conversations |
| `conversations_update_participant` | UPDATE | Participants | Only participants can update status |
| `conversations_delete_participant` | DELETE | Participants | Only participants can delete |

[↑ Back to conversations table](#conversations) · [↑ Back to RLS section](#row-level-security-rls)

#### messages (4 policies)

| Policy Name | Operation | Scope | Access Pattern |
|-------------|-----------|-------|----------------|
| `messages_select_participants` | SELECT | Participants | Only conversation participants can view |
| `messages_insert_participant` | INSERT | Participants | Participants can send in active conversations |
| `messages_update_participant` | UPDATE | Participants | Participants can update (mark as read) |
| `messages_delete_sender` | DELETE | Sender | Only the sender can delete their message |

[↑ Back to messages table](#messages) · [↑ Back to RLS section](#row-level-security-rls)

#### notifications (4 policies)

| Policy Name | Operation | Scope | Access Pattern |
|-------------|-----------|-------|----------------|
| `notifications_select_own` | SELECT | Own | Only view your own notifications |
| `notifications_insert_own` | INSERT | Own | Only create notifications for yourself |
| `notifications_update_own` | UPDATE | Own | Only update your own notifications |
| `notifications_delete_own` | DELETE | Own | Only delete your own notifications |

[↑ Back to notifications table](#notifications) · [↑ Back to RLS section](#row-level-security-rls)

---

### Column Reference by Table

#### profiles

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| `id` | UUID | NOT NULL | - | PK, FK → auth.users |
| `username` | TEXT | NOT NULL | - | UNIQUE |
| `avatar_config` | JSONB | NULL | `'{}'` | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | - |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | - |

[↑ Back to profiles](#profiles)

#### locations

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `google_place_id` | TEXT | NOT NULL | - | UNIQUE |
| `name` | TEXT | NOT NULL | - | IDX |
| `address` | TEXT | NULL | - | - |
| `latitude` | DOUBLE PRECISION | NOT NULL | - | GIST (geo) |
| `longitude` | DOUBLE PRECISION | NOT NULL | - | GIST (geo) |
| `place_types` | TEXT[] | NULL | - | - |
| `post_count` | INTEGER | NOT NULL | `0` | IDX |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | - |

[↑ Back to locations](#locations)

#### posts

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `producer_id` | UUID | NOT NULL | - | FK → profiles |
| `location_id` | UUID | NOT NULL | - | FK → locations |
| `selfie_url` | TEXT | NULL | - | - |
| `target_avatar` | JSONB | NULL | `'{}'` | - |
| `target_description` | TEXT | NOT NULL | - | - |
| `message` | TEXT | NOT NULL | - | - |
| `seen_at` | TIMESTAMPTZ | NOT NULL | - | - |
| `is_active` | BOOLEAN | NOT NULL | `true` | IDX |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | IDX |
| `expires_at` | TIMESTAMPTZ | NOT NULL | `now() + 30 days` | - |

[↑ Back to posts](#posts)

#### conversations

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `post_id` | UUID | NOT NULL | - | FK → posts |
| `producer_id` | UUID | NOT NULL | - | FK → profiles, IDX |
| `consumer_id` | UUID | NOT NULL | - | FK → profiles, IDX |
| `status` | TEXT | NOT NULL | `'pending'` | - |
| `producer_accept` | BOOLEAN | NULL | - | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | - |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | - |

**Status Values:** `'pending'` | `'active'` | `'declined'` | `'blocked'`

[↑ Back to conversations](#conversations)

#### messages

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `conversation_id` | UUID | NOT NULL | - | FK → conversations, IDX |
| `sender_id` | UUID | NOT NULL | - | FK → profiles |
| `content` | TEXT | NOT NULL | - | - |
| `is_read` | BOOLEAN | NOT NULL | `false` | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | IDX |

[↑ Back to messages](#messages)

#### notifications

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | UUID | NOT NULL | - | FK → profiles, IDX |
| `type` | TEXT | NOT NULL | - | - |
| `reference_id` | UUID | NULL | - | - |
| `is_read` | BOOLEAN | NOT NULL | `false` | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | IDX |

**Notification Types:** `'new_response'` | `'new_message'` | `'response_accepted'`

[↑ Back to notifications](#notifications)

---

### Indexes Reference

| Table | Index Name | Column(s) | Type | Purpose |
|-------|------------|-----------|------|---------|
| `profiles` | `profiles_pkey` | id | B-tree (Primary) | Primary key lookup |
| `profiles` | `profiles_username_key` | username | B-tree (Unique) | Username uniqueness, lookup |
| `locations` | `locations_pkey` | id | B-tree (Primary) | Primary key lookup |
| `locations` | `locations_google_place_id_key` | google_place_id | B-tree (Unique) | Prevent duplicates |
| `locations` | `locations_geo_idx` | (longitude, latitude) | GIST (Spatial) | Proximity queries |
| `locations` | `locations_name_idx` | name | B-tree | Name search |
| `locations` | `locations_post_count_idx` | post_count DESC | B-tree | Popularity sorting |
| `posts` | `posts_pkey` | id | B-tree (Primary) | Primary key lookup |
| `posts` | `posts_producer_id_idx` | producer_id | B-tree | User's posts lookup |
| `posts` | `posts_location_id_idx` | location_id | B-tree | Posts at location |
| `posts` | `posts_is_active_idx` | is_active | B-tree | Active posts filter |
| `posts` | `posts_created_at_idx` | created_at DESC | B-tree | Chronological sorting |
| `conversations` | `conversations_pkey` | id | B-tree (Primary) | Primary key lookup |
| `conversations` | `conversations_producer_id_idx` | producer_id | B-tree | Producer's conversations |
| `conversations` | `conversations_consumer_id_idx` | consumer_id | B-tree | Consumer's conversations |
| `conversations` | `conversations_post_id_idx` | post_id | B-tree | Conversations per post |
| `messages` | `messages_pkey` | id | B-tree (Primary) | Primary key lookup |
| `messages` | `messages_conversation_id_idx` | conversation_id | B-tree | Messages in conversation |
| `messages` | `messages_created_at_idx` | created_at | B-tree | Chronological ordering |
| `notifications` | `notifications_pkey` | id | B-tree (Primary) | Primary key lookup |
| `notifications` | `notifications_user_id_idx` | user_id | B-tree | User's notifications |
| `notifications` | `notifications_created_at_idx` | created_at DESC | B-tree | Recent notifications |

---

### Foreign Keys Reference

| From Table | Column | To Table | Column | On Delete |
|------------|--------|----------|--------|-----------|
| `profiles` | id | auth.users | id | CASCADE |
| `posts` | producer_id | profiles | id | CASCADE |
| `posts` | location_id | locations | id | CASCADE |
| `conversations` | post_id | posts | id | CASCADE |
| `conversations` | producer_id | profiles | id | CASCADE |
| `conversations` | consumer_id | profiles | id | CASCADE |
| `messages` | conversation_id | conversations | id | CASCADE |
| `messages` | sender_id | profiles | id | CASCADE |
| `notifications` | user_id | profiles | id | CASCADE |

---

### Extensions Used

| Extension | Purpose | Key Features Used |
|-----------|---------|-------------------|
| **PostGIS** | Geospatial queries | `ST_SetSRID`, `ST_MakePoint`, `ST_Distance`, `ST_DWithin`, GIST indexes |
| **uuid-ossp** | UUID generation | `gen_random_uuid()` for primary keys |

---

### Navigation

**Jump to Section:**

| Section | Description |
|---------|-------------|
| [Overview](#overview) | Introduction and core concepts |
| [Database Architecture](#database-architecture) | Data flow and design principles |
| [Extensions](#extensions) | PostGIS and uuid-ossp details |
| [Entity Relationship Diagram](#entity-relationship-diagram) | Visual schema representation |
| [Tables](#tables) | Complete table documentation |
| [Row Level Security (RLS)](#row-level-security-rls) | Security policies and patterns |
| [Functions and Triggers](#functions-and-triggers) | Automatic data maintenance |
| [TypeScript Integration](#typescript-integration) | Type definitions and usage |

**Jump to Table:**

| [`profiles`](#profiles) | [`locations`](#locations) | [`posts`](#posts) | [`conversations`](#conversations) | [`messages`](#messages) | [`notifications`](#notifications) |
|---|---|---|---|---|---|

---

*This documentation is maintained as part of the Love Ledger project. Last updated: Generated during initial documentation phase.*
