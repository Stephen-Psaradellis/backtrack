# Database Schema Documentation

This document provides comprehensive documentation of the Backtrack database schema, including entity relationships, table structures, indexes, and PostGIS geospatial features.

## Table of Contents

- [Overview](#overview)
- [Entity-Relationship Diagram](#entity-relationship-diagram)
- [Tables](#tables)
  - [Profiles](#profiles)
  - [Locations](#locations)
  - [Posts](#posts)
  - [Conversations](#conversations)
  - [Messages](#messages)
  - [Notifications](#notifications)
- [Relationships Summary](#relationships-summary)
- [Indexes](#indexes)
  - [Index Strategy](#index-strategy)
  - [Index Reference](#index-reference)
- [PostGIS Geospatial Features](#postgis-geospatial-features)
  - [Extension Setup](#extension-setup)
  - [Geospatial Index](#geospatial-index)
  - [Common Geospatial Queries](#common-geospatial-queries)
- [Triggers and Functions](#triggers-and-functions)
- [Constraints](#constraints)
- [TypeScript Type Integration](#typescript-type-integration)
- [Related Documentation](#related-documentation)

---

## Overview

Backtrack uses **PostgreSQL** (managed by Supabase) with the **PostGIS** extension for geospatial queries. The database is designed around the Producer/Consumer model where:

- **Producers** create posts at physical locations
- **Consumers** browse locations and respond to posts
- **Conversations** form when Producers accept responses
- **Messages** are exchanged within active conversations

### Core Entities

| Entity | Purpose |
|--------|---------|
| **profiles** | User accounts linked to Supabase Auth |
| **locations** | Physical places with GPS coordinates |
| **posts** | "Missed connection" entries at locations |
| **conversations** | Threads between Producers and Consumers |
| **messages** | Individual messages in conversations |
| **notifications** | In-app notification system |

---

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            BACKTRACK DATABASE SCHEMA                                       │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│   ┌──────────────────┐                                                                       │
│   │   auth.users     │  (Supabase Auth - managed)                                           │
│   │   ────────────   │                                                                       │
│   │   id (PK)        │                                                                       │
│   │   email          │                                                                       │
│   │   ...            │                                                                       │
│   └────────┬─────────┘                                                                       │
│            │ 1:1                                                                             │
│            │ (profiles.id = auth.users.id)                                                  │
│            ▼                                                                                 │
│   ┌──────────────────┐                                                                       │
│   │   profiles       │                                                                       │
│   │   ────────────   │                                                                       │
│   │   id (PK, FK)    │◄─────────────────────────────────────────────────────────────┐       │
│   │   username       │                                                               │       │
│   │   avatar_config  │  ┌────────────────────────────────────────────────────────┐  │       │
│   │   created_at     │  │                                                        │  │       │
│   │   updated_at     │  │                                                        │  │       │
│   └────────┬─────────┘  │                                                        │  │       │
│            │            │                                                        │  │       │
│            │            │                                                        │  │       │
│            │ 1:N        │ 1:N                                                    │  │       │
│            │            │ (producer)        1:N                                  │  │       │
│            │            │                (consumer)                              │  │       │
│            │            │                   │                                    │  │       │
│            │            │                   │                                    │  │       │
│            │            ▼                   ▼                                    │  │       │
│            │   ┌──────────────────┐   ┌────────────────────┐                    │  │       │
│            │   │   posts          │   │   conversations    │                    │  │       │
│            │   │   ──────────     │   │   ──────────────   │                    │  │       │
│            │   │   id (PK)        │◄──│   post_id (FK)     │                    │  │       │
│            │   │   producer_id(FK)│   │   id (PK)          │                    │  │       │
│            │   │   location_id(FK)│   │   producer_id (FK) │────────────────────┘  │       │
│            │   │   selfie_url     │   │   consumer_id (FK) │───────────────────────┘       │
│            │   │   target_avatar  │   │   status           │                               │
│            │   │   target_desc    │   │   producer_accepted│                               │
│            │   │   message        │   │   created_at       │◄──────────────┐               │
│            │   │   seen_at        │   │   updated_at       │               │               │
│            │   │   is_active      │   └────────────────────┘               │               │
│            │   │   created_at     │               │                        │               │
│            │   │   expires_at     │               │ 1:N                    │               │
│            │   └────────┬─────────┘               │                        │               │
│            │            │                         ▼                        │               │
│            │            │                ┌──────────────────┐              │               │
│            │            │                │   messages       │              │               │
│            │            │                │   ────────────   │              │               │
│            │            │                │   id (PK)        │              │               │
│            │            │                │   conversation_id│              │               │
│            │            │                │   sender_id (FK) │──────────────│───────────┐   │
│            │            │                │   content        │              │           │   │
│            │            │                │   is_read        │              │           │   │
│            │            │                │   created_at     │              │           │   │
│            │            │                └──────────────────┘              │           │   │
│            │            │                                                  │           │   │
│            │            │                                                  │           │   │
│            │            │ N:1                                              │           │   │
│            │            │                ┌──────────────────┐              │           │   │
│            │            │                │   notifications  │              │           │   │
│            │            │                │   ────────────   │              │           │   │
│            │            │                │   id (PK)        │              │           │   │
│            │            │                │   user_id (FK)   │◄─────────────┴───────────┘   │
│            │            │                │   type           │                               │
│            │            │                │   reference_id   │ (poly: conv or post)          │
│            │            │                │   is_read        │                               │
│            │            │                │   created_at     │                               │
│            │            ▼                └──────────────────┘                               │
│   ┌──────────────────────────────┐                                                          │
│   │   locations                  │                                                          │
│   │   ────────────               │                                                          │
│   │   id (PK)                    │                                                          │
│   │   google_place_id (UNIQUE)   │                                                          │
│   │   name                       │                                                          │
│   │   address                    │                                                          │
│   │   latitude                   │  ◄── PostGIS geospatial queries                          │
│   │   longitude                  │                                                          │
│   │   place_types[]              │                                                          │
│   │   post_count                 │  ◄── Maintained by triggers                              │
│   │   created_at                 │                                                          │
│   └──────────────────────────────┘                                                          │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Relationship Cardinalities

```
auth.users  ───1:1───  profiles        (User has one profile)
profiles    ───1:N───  posts           (User can create many posts)
profiles    ───1:N───  conversations   (User participates in many conversations)
profiles    ───1:N───  messages        (User sends many messages)
profiles    ───1:N───  notifications   (User receives many notifications)
locations   ───1:N───  posts           (Location has many posts)
posts       ───1:N───  conversations   (Post can have many responses)
conversations ──1:N──  messages        (Conversation contains many messages)
```

---

## Tables

### Profiles

User profiles linked to Supabase Auth users. Each authenticated user has exactly one profile.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | - | Primary key, references `auth.users(id)` |
| `username` | TEXT | Yes | NULL | Unique display name |
| `avatar_config` | JSONB | Yes | NULL | Avataaars configuration for user's avatar |
| `created_at` | TIMESTAMPTZ | No | NOW() | Profile creation timestamp |
| `updated_at` | TIMESTAMPTZ | No | NOW() | Last update timestamp (auto-updated) |

**Avatar Config Structure:**
```json
{
  "avatarStyle": "Circle",
  "topType": "ShortHairShortFlat",
  "accessoriesType": "Blank",
  "hairColor": "Brown",
  "facialHairType": "Blank",
  "facialHairColor": "Brown",
  "clotheType": "ShirtCrewNeck",
  "clotheColor": "Blue01",
  "graphicType": "Bat",
  "eyeType": "Default",
  "eyebrowType": "Default",
  "mouthType": "Default",
  "skinColor": "Light"
}
```

---

### Locations

Physical locations where posts can be created. Integrated with Google Places API.

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
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `google_place_id` | TEXT | No | - | Unique Google Places identifier |
| `name` | TEXT | No | - | Place name from Google Places |
| `address` | TEXT | Yes | NULL | Formatted address |
| `latitude` | DOUBLE PRECISION | No | - | GPS latitude (used with PostGIS) |
| `longitude` | DOUBLE PRECISION | No | - | GPS longitude (used with PostGIS) |
| `place_types` | TEXT[] | Yes | NULL | Google place types array (e.g., `['gym', 'fitness_center']`) |
| `post_count` | INTEGER | No | 0 | Active posts at location (maintained by triggers) |
| `created_at` | TIMESTAMPTZ | No | NOW() | Location creation timestamp |

---

### Posts

"Missed connection" posts created by Producers at specific locations.

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  selfie_url TEXT NOT NULL,
  target_avatar JSONB NOT NULL,
  target_description TEXT,
  message TEXT NOT NULL,
  seen_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days') NOT NULL
);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `producer_id` | UUID | No | - | FK to profiles (the post creator) |
| `location_id` | UUID | No | - | FK to locations (where post is anchored) |
| `selfie_url` | TEXT | No | - | URL to Producer's selfie in Supabase Storage |
| `target_avatar` | JSONB | No | - | Avataaars config describing person of interest |
| `target_description` | TEXT | Yes | NULL | Additional text description of target |
| `message` | TEXT | No | - | The note left for the person |
| `seen_at` | TIMESTAMPTZ | Yes | NULL | When the Producer saw the person |
| `is_active` | BOOLEAN | No | TRUE | Whether post is visible in ledger |
| `created_at` | TIMESTAMPTZ | No | NOW() | Post creation timestamp |
| `expires_at` | TIMESTAMPTZ | No | NOW() + 30 days | Auto-expiration timestamp |

---

### Conversations

Threads between Producers and Consumers who respond to posts.

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

  CONSTRAINT conversations_unique_response UNIQUE(post_id, consumer_id),
  CONSTRAINT conversations_different_users CHECK (producer_id != consumer_id),
  CONSTRAINT conversations_valid_status CHECK (status IN ('pending', 'active', 'declined', 'blocked'))
);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `post_id` | UUID | No | - | FK to posts (the post being responded to) |
| `producer_id` | UUID | No | - | FK to profiles (post owner) |
| `consumer_id` | UUID | No | - | FK to profiles (person responding) |
| `status` | TEXT | No | 'pending' | Conversation state: pending, active, declined, blocked |
| `producer_accepted` | BOOLEAN | No | FALSE | Whether Producer accepted the response |
| `created_at` | TIMESTAMPTZ | No | NOW() | Conversation initiation timestamp |
| `updated_at` | TIMESTAMPTZ | No | NOW() | Last update timestamp (auto-updated) |

**Status Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│                  CONVERSATION STATUS FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Consumer responds to post                                      │
│         │                                                        │
│         ▼                                                        │
│   ┌───────────┐                                                  │
│   │  pending  │                                                  │
│   └─────┬─────┘                                                  │
│         │                                                        │
│         ├──── Producer accepts ────▶ ┌──────────┐               │
│         │                            │  active  │ ◀── Messaging │
│         │                            └──────────┘     enabled    │
│         │                                                        │
│         ├──── Producer declines ───▶ ┌──────────┐               │
│         │                            │ declined │ ◀── End state  │
│         │                            └──────────┘                │
│         │                                                        │
│         └──── Either party blocks ─▶ ┌──────────┐               │
│                                      │ blocked  │ ◀── End state  │
│                                      └──────────┘                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Messages

Individual messages within active conversations.

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

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `conversation_id` | UUID | No | - | FK to conversations |
| `sender_id` | UUID | No | - | FK to profiles (message author) |
| `content` | TEXT | No | - | Message text content |
| `is_read` | BOOLEAN | No | FALSE | Whether recipient has read the message |
| `created_at` | TIMESTAMPTZ | No | NOW() | Message sent timestamp |

---

### Notifications

In-app notifications for users about responses, messages, and status changes.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  reference_id UUID,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT notifications_valid_type CHECK (type IN ('new_response', 'new_message', 'response_accepted'))
);
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `user_id` | UUID | No | - | FK to profiles (notification recipient) |
| `type` | TEXT | No | - | Notification type (see below) |
| `reference_id` | UUID | Yes | NULL | Polymorphic reference to conversation or post |
| `is_read` | BOOLEAN | No | FALSE | Whether user has read the notification |
| `created_at` | TIMESTAMPTZ | No | NOW() | Notification creation timestamp |

**Notification Types:**

| Type | Description | reference_id |
|------|-------------|--------------|
| `new_response` | Consumer responded to Producer's post | conversation_id |
| `new_message` | New message in conversation | conversation_id |
| `response_accepted` | Producer accepted Consumer's response | conversation_id |

---

## Relationships Summary

### Foreign Key Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FOREIGN KEY REFERENCE MAP                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Table           Column            References              On Delete       │
│   ─────           ──────            ──────────              ─────────       │
│   profiles        id                auth.users(id)          CASCADE         │
│   posts           producer_id       profiles(id)            CASCADE         │
│   posts           location_id       locations(id)           CASCADE         │
│   conversations   post_id           posts(id)               CASCADE         │
│   conversations   producer_id       profiles(id)            CASCADE         │
│   conversations   consumer_id       profiles(id)            CASCADE         │
│   messages        conversation_id   conversations(id)       CASCADE         │
│   messages        sender_id         profiles(id)            CASCADE         │
│   notifications   user_id           profiles(id)            CASCADE         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cascading Delete Behavior

When a user is deleted from `auth.users`:
1. Their `profile` is deleted (CASCADE)
2. Their `posts` are deleted (CASCADE from profile)
3. All `conversations` they participated in are deleted (CASCADE)
4. All `messages` in those conversations are deleted (CASCADE)
5. Their `notifications` are deleted (CASCADE)
6. Location `post_count` is decremented via triggers

---

## Indexes

### Index Strategy

The database uses strategic indexes to optimize common query patterns:

| Query Pattern | Index Type | Tables |
|---------------|------------|--------|
| Location proximity | PostGIS GIST | locations |
| User's resources | B-tree | posts, conversations, messages |
| Status filtering | B-tree | posts, conversations |
| Time-based sorting | B-tree DESC | posts, messages, notifications |
| Unread counts | Partial B-tree | messages, notifications |
| Unique lookups | B-tree | profiles (username), locations (google_place_id) |

### Index Reference

#### Profiles Indexes

```sql
-- Username uniqueness and lookup
CREATE INDEX profiles_username_idx ON profiles(username);

-- Sorting by last update
CREATE INDEX profiles_updated_at_idx ON profiles(updated_at DESC);
```

#### Locations Indexes

```sql
-- PostGIS geospatial index for proximity queries
CREATE INDEX locations_geo_idx ON locations USING GIST (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

-- Google Place ID lookup
CREATE INDEX locations_google_place_id_idx ON locations(google_place_id);

-- Name searches
CREATE INDEX locations_name_idx ON locations(name);

-- Finding popular locations
CREATE INDEX locations_post_count_idx ON locations(post_count DESC);
```

#### Posts Indexes

```sql
-- Posts at a specific location
CREATE INDEX posts_location_idx ON posts(location_id);

-- User's posts
CREATE INDEX posts_producer_idx ON posts(producer_id);

-- Active posts sorted by date
CREATE INDEX posts_active_idx ON posts(is_active, created_at DESC);

-- Expired posts cleanup
CREATE INDEX posts_expires_at_idx ON posts(expires_at) WHERE is_active = TRUE;

-- Location ledger queries (active posts at location)
CREATE INDEX posts_location_active_idx ON posts(location_id, is_active, created_at DESC);
```

#### Conversations Indexes

```sql
-- Producer's conversations
CREATE INDEX conversations_producer_idx ON conversations(producer_id);

-- Consumer's conversations
CREATE INDEX conversations_consumer_idx ON conversations(consumer_id);

-- Conversations for a post
CREATE INDEX conversations_post_idx ON conversations(post_id);

-- Filter by status
CREATE INDEX conversations_status_idx ON conversations(status);

-- User's active conversations
CREATE INDEX conversations_user_active_idx ON conversations(producer_id, status)
  WHERE status = 'active';
```

#### Messages Indexes

```sql
-- Messages in a conversation sorted by time
CREATE INDEX messages_conversation_idx ON messages(conversation_id, created_at);

-- User's sent messages
CREATE INDEX messages_sender_idx ON messages(sender_id);

-- Unread messages in a conversation (partial index)
CREATE INDEX messages_unread_idx ON messages(conversation_id, is_read)
  WHERE is_read = FALSE;
```

#### Notifications Indexes

```sql
-- User's notifications sorted by date with read status
CREATE INDEX notifications_user_idx ON notifications(user_id, is_read, created_at DESC);

-- Unread notification count (partial index)
CREATE INDEX notifications_unread_idx ON notifications(user_id)
  WHERE is_read = FALSE;

-- Filter by notification type
CREATE INDEX notifications_type_idx ON notifications(user_id, type);
```

---

## PostGIS Geospatial Features

### Extension Setup

PostGIS is enabled for location-based queries:

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Geospatial Index

The locations table uses a GIST index on a dynamically computed point:

```sql
-- Uses SRID 4326 (WGS 84) - standard for GPS coordinates
CREATE INDEX locations_geo_idx ON locations USING GIST (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);
```

**SRID 4326** is the standard coordinate reference system for GPS, using degrees for latitude and longitude.

### Common Geospatial Queries

#### Find Nearby Locations

```sql
-- Find locations within 5km of a point (using ST_DWithin)
SELECT *
FROM locations
WHERE ST_DWithin(
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
  ST_SetSRID(ST_MakePoint($user_longitude, $user_latitude), 4326)::geography,
  5000  -- distance in meters
)
ORDER BY post_count DESC;
```

#### Calculate Distance to Location

```sql
-- Calculate distance in meters
SELECT
  name,
  ST_Distance(
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
    ST_SetSRID(ST_MakePoint($user_longitude, $user_latitude), 4326)::geography
  ) AS distance_meters
FROM locations
ORDER BY distance_meters;
```

#### Find Locations Within Bounding Box

```sql
-- Efficient bounding box query
SELECT *
FROM locations
WHERE latitude BETWEEN $min_lat AND $max_lat
  AND longitude BETWEEN $min_lng AND $max_lng;
```

### PostGIS in the Application

```typescript
// Using Supabase RPC for geospatial queries
const { data: nearbyLocations } = await supabase
  .rpc('find_nearby_locations', {
    lat: userLatitude,
    lng: userLongitude,
    radius_meters: 5000
  })
```

---

## Triggers and Functions

### Auto-Update Timestamps

Automatically updates `updated_at` on row modifications:

```sql
-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to profiles
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Applied to conversations
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Location Post Count Management

Automatically maintains the `post_count` on locations:

```sql
-- Increment on new post
CREATE OR REPLACE FUNCTION increment_location_post_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE locations
  SET post_count = post_count + 1
  WHERE id = NEW.location_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_increment_location_count
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION increment_location_post_count();

-- Decrement on post deletion
CREATE OR REPLACE FUNCTION decrement_location_post_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE locations
  SET post_count = GREATEST(post_count - 1, 0)
  WHERE id = OLD.location_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_decrement_location_count
  AFTER DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION decrement_location_post_count();
```

### Helper Functions

```sql
-- Check if current user is a conversation participant
CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conv_id
    AND (producer_id = auth.uid() OR consumer_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Constraints

### Unique Constraints

| Table | Constraint | Columns | Purpose |
|-------|------------|---------|---------|
| profiles | PRIMARY KEY | id | Unique user identity |
| profiles | UNIQUE | username | Prevent duplicate usernames |
| locations | PRIMARY KEY | id | Unique location identity |
| locations | UNIQUE | google_place_id | One entry per Google Place |
| conversations | UNIQUE | (post_id, consumer_id) | One response per user per post |

### Check Constraints

```sql
-- Prevent self-responses in conversations
CONSTRAINT conversations_different_users
  CHECK (producer_id != consumer_id)

-- Valid conversation status values
CONSTRAINT conversations_valid_status
  CHECK (status IN ('pending', 'active', 'declined', 'blocked'))

-- Valid notification type values
CONSTRAINT notifications_valid_type
  CHECK (type IN ('new_response', 'new_message', 'response_accepted'))
```

### Foreign Key Constraints

All foreign keys use `ON DELETE CASCADE` to maintain referential integrity:

- Deleting a user cascades to all their data
- Deleting a location cascades to all posts at that location
- Deleting a post cascades to all conversations about that post
- Deleting a conversation cascades to all messages in it

---

## TypeScript Type Integration

The database schema has corresponding TypeScript types in `types/database.ts`:

### Row Types

```typescript
interface Profile {
  id: UUID
  username: string | null
  avatar_config: AvatarConfig | null
  created_at: Timestamp
  updated_at: Timestamp
}

interface Location {
  id: UUID
  google_place_id: string
  name: string
  address: string | null
  latitude: number
  longitude: number
  place_types: string[]
  post_count: number
  created_at: Timestamp
}

interface Post {
  id: UUID
  producer_id: UUID
  location_id: UUID
  selfie_url: string
  target_avatar: AvatarConfig
  target_description: string | null
  message: string
  seen_at: Timestamp | null
  is_active: boolean
  created_at: Timestamp
  expires_at: Timestamp
}

interface Conversation {
  id: UUID
  post_id: UUID
  producer_id: UUID
  consumer_id: UUID
  status: 'pending' | 'active' | 'declined' | 'blocked'
  producer_accepted: boolean
  created_at: Timestamp
  updated_at: Timestamp
}

interface Message {
  id: UUID
  conversation_id: UUID
  sender_id: UUID
  content: string
  is_read: boolean
  created_at: Timestamp
}

interface Notification {
  id: UUID
  user_id: UUID
  type: 'new_response' | 'new_message' | 'response_accepted'
  reference_id: UUID | null
  is_read: boolean
  created_at: Timestamp
}
```

### Joined Types

For queries that include related data:

```typescript
interface PostWithLocation extends Post {
  location: Location
}

interface ConversationWithParticipants extends Conversation {
  producer: Profile
  consumer: Profile
  post: Post
}

interface MessageWithSender extends Message {
  sender: Profile
}
```

### Database Type for Supabase Client

```typescript
interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: ProfileInsert; Update: ProfileUpdate }
      locations: { Row: Location; Insert: LocationInsert; Update: LocationUpdate }
      posts: { Row: Post; Insert: PostInsert; Update: PostUpdate }
      conversations: { Row: Conversation; Insert: ConversationInsert; Update: ConversationUpdate }
      messages: { Row: Message; Insert: MessageInsert; Update: MessageUpdate }
      notifications: { Row: Notification; Insert: NotificationInsert; Update: NotificationUpdate }
    }
  }
}
```

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System overview and core concepts
- **[USER_FLOWS.md](./USER_FLOWS.md)** - Producer and Consumer journeys
- **[SUPABASE.md](./SUPABASE.md)** - Supabase integration details
- **DATABASE.md** (this document) - Schema and relationship documentation
- [COMPONENTS.md](./COMPONENTS.md) - UI component patterns
- [DATA_FLOW.md](./DATA_FLOW.md) - Data flow through the application
- [README.md](./README.md) - Documentation index

---

*Last updated: December 2024*
