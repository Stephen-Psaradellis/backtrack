# Backtrack User Flows

This document details the user journeys for both Producers and Consumers in the Backtrack application. Understanding these flows is essential for developing and maintaining features that support the core matchmaking experience.

## Table of Contents

- [Overview](#overview)
- [Producer Flow](#producer-flow)
  - [Journey Overview](#producer-journey-overview)
  - [Step 1: Visiting a Location](#step-1-visiting-a-location)
  - [Step 2: Creating a New Post](#step-2-creating-a-new-post)
  - [Step 3: Uploading a Selfie](#step-3-uploading-a-selfie)
  - [Step 4: Configuring the Target Avatar](#step-4-configuring-the-target-avatar)
  - [Step 5: Writing the Message](#step-5-writing-the-message)
  - [Step 6: Managing Posts](#step-6-managing-posts)
  - [Step 7: Handling Responses](#step-7-handling-responses)
  - [Step 8: Conversing with Consumers](#step-8-conversing-with-consumers)
- [Producer Data Model](#producer-data-model)
- [Consumer Flow](#consumer-flow)
  - [Consumer Journey Overview](#consumer-journey-overview)
  - [Step 1: Browsing Locations](#consumer-step-1-browsing-locations)
  - [Step 2: Viewing the Ledger](#consumer-step-2-viewing-the-ledger)
  - [Step 3: Matching to Avatar Descriptions](#consumer-step-3-matching-to-avatar-descriptions)
  - [Step 4: Responding to a Post](#consumer-step-4-responding-to-a-post)
  - [Step 5: Awaiting Producer Decision](#consumer-step-5-awaiting-producer-decision)
  - [Step 6: Conversing with Producers](#consumer-step-6-conversing-with-producers)
- [Consumer Data Model](#consumer-data-model)
- [Related Documentation](#related-documentation)

---

## Overview

Backtrack operates on a **Producer/Consumer model** where:

- **Producers** create "missed connection" posts at physical locations
- **Consumers** browse locations and respond to posts that match their appearance

This document covers both user journeys in detail:

1. **Producer Flow**: Creating posts, managing responses, and conversing with matches
2. **Consumer Flow**: Browsing locations, matching to posts, and initiating conversations

> **Note**: Any user can act as both Producer and Consumer at different times. The roles describe the relationship to a specific post, not the user's account type.

---

## Producer Flow

### Producer Journey Overview

The Producer flow follows this sequence:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PRODUCER JOURNEY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│   │   1. Visit   │     │  2. Create   │     │  3. Upload   │                │
│   │   Location   │────▶│    Post      │────▶│   Selfie     │                │
│   │              │     │              │     │              │                │
│   └──────────────┘     └──────────────┘     └──────────────┘                │
│          │                                         │                         │
│          │                                         ▼                         │
│          │              ┌──────────────┐     ┌──────────────┐                │
│          │              │  5. Write    │     │ 4. Configure │                │
│          │              │   Message    │◀────│ Target Avatar│                │
│          │              │              │     │              │                │
│          │              └──────────────┘     └──────────────┘                │
│          │                     │                                             │
│          ▼                     ▼                                             │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│   │  6. Manage   │◀────│ Post Created │────▶│  7. Handle   │                │
│   │    Posts     │     │              │     │  Responses   │                │
│   │              │     └──────────────┘     │              │                │
│   └──────────────┘                          └──────────────┘                │
│                                                    │                         │
│                                                    ▼                         │
│                                             ┌──────────────┐                │
│                                             │ 8. Converse  │                │
│                                             │  with Match  │                │
│                                             │              │                │
│                                             └──────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Step 1: Visiting a Location

The Producer's journey begins at a physical location where they've noticed someone they'd like to connect with.

#### UI Screens Involved

| Screen | Description |
|--------|-------------|
| **Map View** | Interactive Google Map showing nearby locations with post counts |
| **Location Search** | Google Places-powered search to find specific venues |
| **Location Details** | View of a specific location with its active posts (ledger) |

#### User Actions

1. **Browse Map**: View the map of their current area
2. **Search Location**: Use Google Places autocomplete to find a specific venue
3. **Select Location**: Tap on a location marker or search result
4. **View Location Details**: See the location's name, address, and current post count

#### Data Interactions

| Action | Database Operation |
|--------|-------------------|
| Load nearby locations | `SELECT` from `locations` with PostGIS proximity query |
| Search locations | Google Places API call → may insert new `locations` row |
| View location | `SELECT` from `locations` by `google_place_id` |

#### Technical Notes

- Locations are identified by Google Place ID for consistency
- New locations are created in the database when a user posts to a place not yet tracked
- PostGIS extension enables efficient geospatial queries: `ST_DWithin()` for nearby location search
- Location coordinates use SRID 4326 (WGS 84 / GPS standard)

---

### Step 2: Creating a New Post

Once at a location, the Producer initiates the post creation process.

#### UI Screens Involved

| Screen | Description |
|--------|-------------|
| **Location Ledger** | List of active posts at this location with "Create Post" button |
| **Post Creation Wizard** | Multi-step form guiding the Producer through post creation |

#### User Actions

1. **Tap "Create Post"**: Initiate the post creation flow
2. **Confirm Location**: Verify the location is correct
3. **Optionally set "Seen At"**: Record when they saw the person (defaults to current time)

#### Validation Requirements

- User must be authenticated
- User cannot have more than a configured limit of active posts
- Location must be valid (has Google Place ID)

---

### Step 3: Uploading a Selfie

The selfie serves as the Producer's identity reveal after a successful match.

#### UI Screens Involved

| Screen | Description |
|--------|-------------|
| **Selfie Upload Screen** | Camera interface or file picker for selfie upload |
| **Selfie Preview** | Review and confirm the selected photo |

#### User Actions

1. **Take Photo**: Use device camera to capture a selfie
2. **Or Select from Gallery**: Choose an existing photo
3. **Preview**: Review the selected image
4. **Confirm**: Accept the selfie for the post

#### Data Interactions

| Action | Storage/Database Operation |
|--------|---------------------------|
| Upload selfie | Upload to Supabase Storage bucket `selfies` |
| Store reference | `selfie_url` field in `posts` table |

#### Privacy Considerations

- Selfies are stored in Supabase Storage with restricted access
- Only the Producer and matched Consumers (after acceptance) can view the selfie
- RLS policies enforce that `selfie_url` is not publicly exposed
- Selfie URLs use signed/temporary URLs for secure access

#### Technical Notes

```
Supabase Storage Structure:
selfies/
└── {user_id}/
    └── {post_id}/
        └── selfie.{jpg|png}
```

---

### Step 4: Configuring the Target Avatar

The Producer creates a cartoon avatar representing the person they're looking for.

#### UI Screens Involved

| Screen | Description |
|--------|-------------|
| **Avatar Builder** | Interactive Avataaars configuration interface |
| **Avatar Preview** | Real-time preview of the configured avatar |

#### User Actions

The Producer customizes the following avatar attributes:

| Category | Options | Purpose |
|----------|---------|---------|
| **Hair/Head** (`topType`) | 35+ styles including hats, hijabs, various hair styles | Match hair style or head covering |
| **Hair Color** (`hairColor`) | 11 colors from black to pastel pink | Match hair color |
| **Accessories** (`accessoriesType`) | Glasses, sunglasses, or none | Identify eyewear |
| **Facial Hair** (`facialHairType`) | Beards, mustaches, or clean-shaven | Match facial hair |
| **Facial Hair Color** (`facialHairColor`) | 8 colors | Match facial hair color |
| **Eyes** (`eyeType`) | 12 styles | Capture eye expression |
| **Eyebrows** (`eyebrowType`) | 12 styles | Match eyebrow shape |
| **Mouth** (`mouthType`) | 12 expressions | Capture expression/smile |
| **Clothes** (`clotheType`) | 9 clothing types | Identify clothing style |
| **Clothes Color** (`clotheColor`) | 15 colors | Match outfit color |
| **Skin Color** (`skinColor`) | 7 options | Match skin tone |

#### Data Model

```typescript
interface AvatarConfig {
  avatarStyle?: 'Circle' | 'Transparent'
  topType?: TopType          // Hair style or head covering
  accessoriesType?: AccessoriesType
  hairColor?: HairColor
  facialHairType?: FacialHairType
  facialHairColor?: FacialHairColor
  clotheType?: ClotheType
  clotheColor?: ClotheColor
  graphicType?: GraphicType  // For graphic tees
  eyeType?: EyeType
  eyebrowType?: EyebrowType
  mouthType?: MouthType
  skinColor?: SkinColor
}
```

#### Optional: Text Description

In addition to the avatar, Producers may add a text description (`target_description`) for additional context:
- Physical characteristics not captured by avatar
- Specific identifying details (e.g., "You were reading a red book")
- Time-specific details (e.g., "You were in the yoga class at 6pm")

---

### Step 5: Writing the Message

The Producer composes a personal message to the person they're looking for.

#### UI Screens Involved

| Screen | Description |
|--------|-------------|
| **Message Composer** | Text area for the Producer's message |
| **Post Preview** | Final review of the complete post before submission |

#### User Actions

1. **Write Message**: Compose a personal note (stored in `message` field)
2. **Review Post**: Preview the complete post (avatar + message)
3. **Submit Post**: Create the post in the database

#### Message Guidelines (UI hints)

- Be respectful and genuine
- Mention something specific about the encounter
- Avoid explicit or inappropriate content
- Keep it brief but memorable

#### Data Created on Submit

| Table | Fields |
|-------|--------|
| `posts` | `id`, `producer_id`, `location_id`, `selfie_url`, `target_avatar`, `target_description`, `message`, `seen_at`, `is_active`, `created_at`, `expires_at` |
| `locations` | `post_count` incremented via trigger |

#### Post Expiration

- Posts automatically expire after 30 days (`expires_at` default)
- Expired posts are marked `is_active = false`
- Producers can extend or manually deactivate posts

---

### Step 6: Managing Posts

After creating posts, Producers can manage them from their dashboard.

#### UI Screens Involved

| Screen | Description |
|--------|-------------|
| **My Posts** | List of all Producer's posts (active and expired) |
| **Post Details** | Individual post view with response count |
| **Edit Post** | Modify message, avatar, or deactivate |

#### User Actions

| Action | Description | Database Operation |
|--------|-------------|-------------------|
| **View Posts** | See all created posts | `SELECT` from `posts` where `producer_id = user.id` |
| **Edit Post** | Update message or avatar | `UPDATE` on `posts` |
| **Deactivate** | Make post invisible | Set `is_active = false` |
| **Delete Post** | Permanently remove | `DELETE` from `posts` (cascades to conversations) |
| **Extend Expiry** | Keep post active longer | Update `expires_at` |

#### Post States

```
┌─────────────────────────────────────────────────┐
│              POST LIFECYCLE                      │
├─────────────────────────────────────────────────┤
│                                                  │
│   ┌────────┐    30 days    ┌─────────┐          │
│   │ Active │──────────────▶│ Expired │          │
│   └────────┘               └─────────┘          │
│       │                         │               │
│       │ manual                  │               │
│       ▼                         ▼               │
│   ┌────────────┐          ┌─────────┐          │
│   │ Deactivated│          │ Deleted │          │
│   └────────────┘          └─────────┘          │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

### Step 7: Handling Responses

When Consumers respond to a post, Producers receive notifications and must decide whether to accept.

#### UI Screens Involved

| Screen | Description |
|--------|-------------|
| **Notifications** | List of new responses and messages |
| **Response Review** | View Consumer's profile avatar alongside the target avatar |
| **Accept/Decline** | Action buttons to accept or decline the response |

#### User Actions

1. **Receive Notification**: `new_response` notification created when Consumer responds
2. **Review Response**: Compare Consumer's avatar with target avatar
3. **View Match Confidence**: Assess if the Consumer matches the description
4. **Accept Response**: Convert conversation to `active` status
5. **Or Decline Response**: Mark conversation as `declined`

#### Conversation Status Flow

```
Consumer Responds
       │
       ▼
┌──────────────┐
│   PENDING    │◀── Awaiting Producer decision
└──────────────┘
       │
       ├──── Accept ────▶ ┌──────────────┐
       │                  │    ACTIVE    │ ◀── Messaging enabled
       │                  └──────────────┘
       │                         │
       │                         │ Either party blocks
       │                         ▼
       │                  ┌──────────────┐
       └──── Decline ────▶│   DECLINED   │
                          └──────────────┘
                          ┌──────────────┐
                          │   BLOCKED    │◀── No further interaction
                          └──────────────┘
```

#### Data Interactions

| Action | Database Operation |
|--------|-------------------|
| Load responses | `SELECT` from `conversations` where `producer_id = user.id` and `status = 'pending'` |
| Accept response | `UPDATE conversations SET status = 'active', producer_accepted = true` |
| Decline response | `UPDATE conversations SET status = 'declined'` |
| Block user | `UPDATE conversations SET status = 'blocked'` |

#### Notifications Created

| Event | Notification Type | Recipient |
|-------|------------------|-----------|
| Consumer responds | `new_response` | Producer |
| Producer accepts | `response_accepted` | Consumer |

---

### Step 8: Conversing with Consumers

Once a response is accepted, the Producer and Consumer can exchange messages.

#### UI Screens Involved

| Screen | Description |
|--------|-------------|
| **Conversations List** | All active conversations |
| **Chat View** | Real-time messaging interface |
| **User Profile** | View matched user's profile and selfie |

#### User Actions

| Action | Description |
|--------|-------------|
| **View Conversations** | See all active matches |
| **Open Chat** | View message history with a specific Consumer |
| **Send Message** | Compose and send a text message |
| **View Selfie** | After accepting, view Consumer's profile |
| **Block User** | End conversation and prevent future contact |

#### Message Data Model

```typescript
interface Message {
  id: UUID
  conversation_id: UUID
  sender_id: UUID
  content: string
  is_read: boolean
  created_at: Timestamp
}
```

#### Real-time Considerations

- Messages can be delivered in real-time using Supabase Realtime
- Read receipts are tracked via `is_read` field
- Unread message count available via index `messages_unread_idx`

#### Privacy After Matching

Once a Producer accepts a response:
- Consumer can view Producer's selfie
- Producer can view Consumer's profile avatar
- Full messaging is enabled
- Both parties can block at any time

---

## Producer Data Model

### Summary of Data Created/Modified by Producer Actions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PRODUCER DATA INTERACTIONS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   CREATES                          MODIFIES                                  │
│   ───────                          ────────                                  │
│                                                                              │
│   ┌────────────────┐               ┌────────────────┐                       │
│   │     posts      │               │   locations    │                       │
│   │  - selfie_url  │               │  - post_count  │ (via trigger)         │
│   │  - target_avatar               │                │                       │
│   │  - message     │               └────────────────┘                       │
│   │  - location_id │                                                        │
│   └────────────────┘               ┌────────────────┐                       │
│                                    │  conversations │                       │
│   ┌────────────────┐               │  - status      │                       │
│   │    messages    │               │  - producer_   │                       │
│   │  - content     │               │    accepted    │                       │
│   │  - sender_id   │               └────────────────┘                       │
│   └────────────────┘                                                        │
│                                    ┌────────────────┐                       │
│   ┌────────────────┐               │   messages     │                       │
│   │ notifications  │ (received)    │  - is_read     │                       │
│   └────────────────┘               └────────────────┘                       │
│                                                                              │
│   STORAGE                                                                    │
│   ───────                                                                    │
│   ┌────────────────┐                                                        │
│   │    selfies/    │                                                        │
│   │   {user_id}/   │                                                        │
│   │   {post_id}/   │                                                        │
│   └────────────────┘                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Tables Involved

| Table | Producer Role |
|-------|--------------|
| `profiles` | Own profile (avatar, username) |
| `locations` | Select existing or create new locations |
| `posts` | Create, read, update, delete own posts |
| `conversations` | Accept/decline/block responses to own posts |
| `messages` | Send and receive messages in active conversations |
| `notifications` | Receive and read notifications |

### RLS Policy Summary for Producer

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | All | Own only | Own only | Own only |
| `locations` | All | Authenticated | No | No |
| `posts` | Active + own inactive | Own only | Own only | Own only |
| `conversations` | Participant | Consumer only | Participant | Participant |
| `messages` | Participant | Participant (active conv) | Participant | Sender only |
| `notifications` | Own only | Own only | Own only | Own only |

---

## Consumer Flow

The Consumer flow represents the journey of a user who browses posts at locations and responds to ones that match their appearance.

### Consumer Journey Overview

The Consumer flow follows this sequence:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CONSUMER JOURNEY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│   │  1. Browse   │     │  2. View     │     │  3. Match to │                │
│   │  Locations   │────▶│   Ledger     │────▶│    Avatar    │                │
│   │              │     │              │     │              │                │
│   └──────────────┘     └──────────────┘     └──────────────┘                │
│          │                                         │                         │
│          │                                         ▼                         │
│          │              ┌──────────────┐     ┌──────────────┐                │
│          │              │  5. Await    │     │ 4. Respond   │                │
│          │              │   Decision   │◀────│  to Post     │                │
│          │              │              │     │              │                │
│          │              └──────────────┘     └──────────────┘                │
│          │                     │                                             │
│          │              ┌──────┴──────┐                                      │
│          │              │             │                                      │
│          │        Accepted      Declined                                     │
│          │              │             │                                      │
│          ▼              ▼             ▼                                      │
│   ┌──────────────┐┌──────────────┐┌──────────────┐                          │
│   │   Browse     ││ 6. Converse  ││  End of      │                          │
│   │   More...    ││  with Match  ││  Journey     │                          │
│   │              ││              ││              │                          │
│   └──────────────┘└──────────────┘└──────────────┘                          │
│                          │                                                   │
│                          ▼                                                   │
│                   ┌──────────────┐                                          │
│                   │ View Selfie  │                                          │
│                   │ & Message    │                                          │
│                   │              │                                          │
│                   └──────────────┘                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Consumer Step 1: Browsing Locations

The Consumer's journey begins by exploring locations they've visited or locations near them.

#### UI Screens Involved

| Screen | Description |
|--------|-------------|
| **Map View** | Interactive Google Map showing locations with active posts |
| **Location Search** | Google Places-powered search for specific venues |
| **Nearby Locations** | List of locations sorted by proximity or post count |

#### User Actions

1. **Open Map**: View the interactive map centered on current location
2. **Explore Markers**: Locations with active posts display markers with post counts
3. **Search for Location**: Use Google Places autocomplete to find a specific venue
4. **Filter by Type**: Optionally filter locations by type (gym, cafe, etc.)
5. **Select Location**: Tap a marker or search result to view the location's ledger

#### Data Interactions

| Action | Database Operation |
|--------|-------------------|
| Load nearby locations | `SELECT` from `locations` with PostGIS `ST_DWithin()` proximity query |
| Filter by post activity | `SELECT` from `locations` where `post_count > 0` |
| Search locations | Google Places API call |
| Get location details | `SELECT` from `locations` by `google_place_id` |

#### Finding Relevant Locations

Consumers are most likely to find relevant posts at:
- **Recently visited locations** (places they frequent)
- **Locations near their current position** (using geolocation)
- **Memorable locations** (where something notable happened)

#### Technical Notes

- PostGIS `ST_DWithin()` enables efficient radius-based queries
- Location markers show post count badges for quick scanning
- Geolocation permissions enhance the experience but aren't required

---

### Consumer Step 2: Viewing the Ledger

After selecting a location, the Consumer views the "ledger" - all active posts at that location.

#### UI Screens Involved

| Screen | Description |
|--------|-------------|
| **Location Details** | Location name, address, and metadata |
| **Post Ledger** | Scrollable list of active posts at this location |
| **Post Card** | Summary view showing target avatar and message preview |

#### User Actions

1. **View Location Info**: See location name, address, and total post count
2. **Scroll Through Posts**: Browse the list of active "missed connection" posts
3. **Preview Avatars**: See the target avatar for each post
4. **Read Message Previews**: See truncated versions of Producer messages
5. **Select Post**: Tap a post card to view full details

#### Post Card Information

Each post card in the ledger displays:

| Element | Description | Privacy Note |
|---------|-------------|--------------|
| **Target Avatar** | Visual representation of who the Producer is looking for | Public |
| **Message Preview** | First ~100 characters of the message | Public |
| **Time Posted** | Relative timestamp (e.g., "2 hours ago") | Public |
| **"Seen At" Time** | When the Producer saw the person (if specified) | Public |
| **Producer Selfie** | NOT shown - only revealed after matching | Hidden |

#### Data Interactions

| Action | Database Operation |
|--------|-------------------|
| Load location posts | `SELECT` from `posts` where `location_id = ?` and `is_active = true` |
| Sort by recency | `ORDER BY created_at DESC` |
| Paginate results | `LIMIT/OFFSET` or cursor-based pagination |

#### Filtering Options

Consumers may filter the ledger by:
- **Date Posted**: Recent posts vs. older posts
- **"Seen At" Time**: Filter by when the person was spotted
- **Avatar Traits**: (Future) Filter by specific avatar attributes

---

### Consumer Step 3: Matching to Avatar Descriptions

The Consumer evaluates posts to find ones where the target avatar matches their appearance.

#### UI Screens Involved

| Screen | Description |
|--------|-------------|
| **Post Detail View** | Full view of a single post with complete avatar |
| **Avatar Comparison** | Side-by-side view of target avatar and Consumer's profile avatar |
| **Text Description** | Additional description if provided by Producer |

#### User Actions

1. **View Full Avatar**: See the complete target avatar configuration
2. **Compare to Self**: Mentally or visually compare avatar to own appearance
3. **Read Description**: Review any additional text description from the Producer
4. **Read Full Message**: See the Producer's complete message
5. **Check Context**: Verify location and timing make sense ("Was I here at that time?")

#### Avatar Attributes to Match

Consumers should consider whether these attributes match their appearance:

| Category | What to Compare |
|----------|-----------------|
| **Hair Style** | Does the top type match your hair or head covering? |
| **Hair Color** | Is the color close to yours? |
| **Skin Tone** | Does the skin color match? |
| **Accessories** | Were you wearing glasses? |
| **Facial Hair** | Do you have the beard/mustache shown? |
| **Clothing** | Were you wearing similar clothes that day? |

#### The Matching Decision

```
┌─────────────────────────────────────────────────────────────┐
│                    MATCHING DECISION TREE                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   "Is this post about me?"                                   │
│           │                                                  │
│           ▼                                                  │
│   ┌───────────────────┐                                      │
│   │ Avatar resembles  │─── No ──▶ Continue Browsing          │
│   │ my appearance?    │                                      │
│   └───────────────────┘                                      │
│           │ Yes                                              │
│           ▼                                                  │
│   ┌───────────────────┐                                      │
│   │ Was I at this     │─── No ──▶ Continue Browsing          │
│   │ location recently?│                                      │
│   └───────────────────┘                                      │
│           │ Yes                                              │
│           ▼                                                  │
│   ┌───────────────────┐                                      │
│   │ Does the "seen at"│─── No ──▶ Continue Browsing          │
│   │ time match?       │                                      │
│   └───────────────────┘                                      │
│           │ Yes                                              │
│           ▼                                                  │
│   ┌───────────────────┐                                      │
│   │ Does the message  │─── No ──▶ Continue Browsing          │
│   │ context fit?      │                                      │
│   └───────────────────┘                                      │
│           │ Yes                                              │
│           ▼                                                  │
│       ┌───────┐                                              │
│       │RESPOND│                                              │
│       └───────┘                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Technical Notes

- Target avatar is stored as `target_avatar` JSONB in the `posts` table
- Optional `target_description` provides additional matching context
- The `seen_at` timestamp helps Consumers verify timing

---

### Consumer Step 4: Responding to a Post

When a Consumer believes a post is about them, they can respond to initiate contact.

#### UI Screens Involved

| Screen | Description |
|--------|-------------|
| **Post Detail View** | Full post with "Respond" button |
| **Response Confirmation** | Confirmation dialog before submitting |
| **Success Screen** | Confirmation that response was sent |

#### User Actions

1. **Tap "Respond"**: Initiate the response flow
2. **Review Profile Avatar**: Ensure their profile avatar is up-to-date
3. **Confirm Response**: Acknowledge that they believe this post is about them
4. **Submit Response**: Create the conversation and wait for Producer decision

#### Pre-Response Checklist (UI guidance)

Before responding, the Consumer should consider:
- [ ] "I believe this post describes me"
- [ ] "I was at this location around the time mentioned"
- [ ] "I'm interested in connecting with this person"

#### Data Created on Response

| Table | Fields | Description |
|-------|--------|-------------|
| `conversations` | `post_id`, `producer_id`, `consumer_id`, `status='pending'` | New conversation record |
| `notifications` | `user_id=producer_id`, `type='new_response'`, `reference_id=conversation.id` | Notify the Producer |

#### Validation & Constraints

| Rule | Enforcement |
|------|-------------|
| Cannot respond to own posts | `CHECK (producer_id != consumer_id)` |
| One response per post | `UNIQUE(post_id, consumer_id)` constraint |
| Post must be active | RLS policy checks `posts.is_active = true` |
| User must be authenticated | RLS policy checks `auth.uid()` |

#### Technical Notes

```sql
-- RLS policy ensuring Consumer can only respond to others' active posts
CREATE POLICY "conversations_insert_consumer"
  ON conversations
  FOR INSERT
  WITH CHECK (
    auth.uid() = consumer_id AND
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id
      AND posts.producer_id != auth.uid()
      AND posts.is_active = true
    )
  );
```

---

### Consumer Step 5: Awaiting Producer Decision

After responding, the Consumer waits for the Producer to accept or decline.

#### UI Screens Involved

| Screen | Description |
|--------|-------------|
| **My Responses** | List of all responses sent (pending, accepted, declined) |
| **Response Status** | Individual response with current status |
| **Notifications** | Alert when Producer makes a decision |

#### User Actions

1. **View Pending Responses**: See all responses awaiting decision
2. **Check Status**: Monitor whether responses have been reviewed
3. **Receive Notification**: Get alerted when a response is accepted
4. **Browse More Posts**: Continue browsing while waiting

#### Response States

```
┌─────────────────────────────────────────────────────────────┐
│                  RESPONSE LIFECYCLE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐                                          │
│   │   Consumer   │                                          │
│   │   Responds   │                                          │
│   └──────────────┘                                          │
│          │                                                   │
│          ▼                                                   │
│   ┌──────────────┐    Producer     ┌──────────────┐         │
│   │   PENDING    │────Accepts─────▶│    ACTIVE    │         │
│   │              │                 │              │         │
│   │  Waiting...  │                 │  Messaging   │         │
│   │              │                 │  Enabled!    │         │
│   └──────────────┘                 └──────────────┘         │
│          │                                                   │
│          │ Producer                                          │
│          │ Declines                                          │
│          ▼                                                   │
│   ┌──────────────┐                                          │
│   │   DECLINED   │                                          │
│   │              │                                          │
│   │  No contact  │                                          │
│   │  possible    │                                          │
│   └──────────────┘                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### What the Consumer Sees in Each State

| State | Visible to Consumer |
|-------|---------------------|
| **Pending** | Post details, target avatar, message (NOT Producer's selfie) |
| **Active** | Full post + Producer's selfie + messaging enabled |
| **Declined** | Brief message that response was not accepted |

#### Notifications Received

| Event | Notification Type | Content |
|-------|------------------|---------|
| Response accepted | `response_accepted` | "Your response was accepted! You can now message." |

#### Technical Notes

- Consumers cannot see the Producer's selfie until accepted
- The `producer_accepted` boolean tracks acceptance state
- Declined responses remain in the database but are hidden from active views

---

### Consumer Step 6: Conversing with Producers

Once a response is accepted, the Consumer can view the Producer's selfie and exchange messages.

#### UI Screens Involved

| Screen | Description |
|--------|-------------|
| **Conversations List** | All active conversations (as Consumer) |
| **Chat View** | Real-time messaging interface |
| **Producer Profile** | View of Producer's revealed selfie |

#### User Actions

| Action | Description |
|--------|-------------|
| **View Selfie** | Finally see who was looking for them |
| **Open Chat** | Access the messaging interface |
| **Send Message** | Compose and send messages to the Producer |
| **Read Messages** | View Producer's replies |
| **Block User** | End conversation if needed |

#### What's Revealed After Acceptance

| Before Acceptance | After Acceptance |
|-------------------|------------------|
| Target avatar only | Target avatar + Producer's selfie |
| Message text | Message text + direct messaging |
| Anonymous Producer | Full conversation access |

#### Message Data Model

```typescript
interface Message {
  id: UUID
  conversation_id: UUID
  sender_id: UUID        // Consumer or Producer
  content: string
  is_read: boolean
  created_at: Timestamp
}
```

#### Conversation Features

| Feature | Description |
|---------|-------------|
| **Real-time Messaging** | Supabase Realtime for instant delivery |
| **Read Receipts** | `is_read` field tracks message status |
| **Message History** | Full conversation history preserved |
| **Block Capability** | Either party can block at any time |

#### Privacy After Matching

Once matched:
- Consumer sees Producer's selfie
- Producer sees Consumer's profile avatar
- Both can message freely
- Either party can block to end communication

---

## Consumer Data Model

### Summary of Data Created/Modified by Consumer Actions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CONSUMER DATA INTERACTIONS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   READS                             CREATES                                  │
│   ─────                             ───────                                  │
│                                                                              │
│   ┌────────────────┐               ┌────────────────┐                       │
│   │   locations    │               │  conversations │                       │
│   │  - name        │               │  - post_id     │                       │
│   │  - coordinates │               │  - consumer_id │                       │
│   │  - post_count  │               │  - status      │                       │
│   └────────────────┘               └────────────────┘                       │
│                                                                              │
│   ┌────────────────┐               ┌────────────────┐                       │
│   │     posts      │               │    messages    │                       │
│   │  - target_avatar               │  - content     │                       │
│   │  - message     │               │  - sender_id   │                       │
│   │  - seen_at     │               └────────────────┘                       │
│   │  - selfie_url* │ (* only after accepted)                                │
│   └────────────────┘                                                        │
│                                    MODIFIES                                  │
│   ┌────────────────┐               ────────                                  │
│   │  conversations │                                                        │
│   │  (participant) │               ┌────────────────┐                       │
│   └────────────────┘               │   messages     │                       │
│                                    │  - is_read     │                       │
│   ┌────────────────┐               └────────────────┘                       │
│   │    messages    │                                                        │
│   │  (in active    │               ┌────────────────┐                       │
│   │   convos)      │               │  conversations │                       │
│   └────────────────┘               │  - status      │ (can block)           │
│                                    └────────────────┘                       │
│   ┌────────────────┐                                                        │
│   │ notifications  │               ┌────────────────┐                       │
│   │  (received)    │               │ notifications  │                       │
│   └────────────────┘               │  - is_read     │                       │
│                                    └────────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Tables Involved

| Table | Consumer Role |
|-------|--------------|
| `profiles` | Own profile (avatar, username) for matching |
| `locations` | Read for browsing the map and finding posts |
| `posts` | Read active posts; see selfie_url only after acceptance |
| `conversations` | Create by responding; update status (block) |
| `messages` | Send and receive in active conversations |
| `notifications` | Receive acceptance notifications |

### RLS Policy Summary for Consumer

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | All | Own only | Own only | Own only |
| `locations` | All | Authenticated | No | No |
| `posts` | Active only | No | No | No |
| `conversations` | Participant | As Consumer only | Participant | Participant |
| `messages` | Participant | Participant (active conv) | Participant | Sender only |
| `notifications` | Own only | Own only | Own only | Own only |

### Key Differences: Producer vs Consumer Access

| Aspect | Producer | Consumer |
|--------|----------|----------|
| **Posts** | Create, read, update, delete own | Read active posts only |
| **Selfie Access** | Always sees own | Only after acceptance |
| **Conversation Creation** | Cannot create (waits for responses) | Creates by responding |
| **Acceptance Power** | Can accept/decline responses | Waits for decision |
| **First Message** | Writes post message initially | Sends first chat message after acceptance |

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System overview and core concepts
- **USER_FLOWS.md** (this document) - Producer and Consumer journeys
- [SUPABASE.md](./SUPABASE.md) - Supabase integration details
- [DATABASE.md](./DATABASE.md) - Schema and relationship documentation
- [COMPONENTS.md](./COMPONENTS.md) - UI component patterns
- [DATA_FLOW.md](./DATA_FLOW.md) - Data flow through the application
- [README.md](./README.md) - Documentation index

---

*Last updated: December 2024*
