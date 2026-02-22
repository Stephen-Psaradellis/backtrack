# Feature Ideation & Engagement Report

**Date:** 2026-02-08
**Analyst:** Product/UX Strategy Agent
**App:** Backtrack -- Location-based anonymous matchmaking for missed connections
**Stack:** React Native / Expo SDK 54 / Supabase / TypeScript
**Companion Reports:** [01-ux-audit.md](./01-ux-audit.md), [UX_IDEATION_REPORT.md](./UX_IDEATION_REPORT.md), [ARCHITECTURE_IDEATION_REPORT.md](./ARCHITECTURE_IDEATION_REPORT.md)

---

## Current Feature Landscape

### Core Mechanics
Backtrack operates on a **producer/consumer model** where users ("producers") create anonymous "missed connection" posts about people they noticed at a venue, and other users ("consumers") browse posts to see if anyone noticed them. The identity layer is fully anonymized through DiceBear 2D avatars -- no real photos appear in posts.

### Existing Feature Inventory

| Category | Features | Key Files |
|----------|----------|-----------|
| **Navigation** | 5-tab layout (Feed, MySpots, Map, Chats, Profile), stack screens (CreatePost, Ledger, PostDetail, Chat, AvatarCreator, Favorites, Legal) | `navigation/types.ts` |
| **Discovery** | Full-screen map with POI tapping, 50m radius nearby feed, location search via Google Places | `screens/HomeScreen.tsx`, `screens/FeedScreen.tsx` |
| **Post Creation** | 3-step wizard (Scene: location+time, Moment: avatar+note, Seal: photo verification+review) | `screens/CreatePostScreen.tsx` |
| **Matching** | Avatar-based match scoring (0-100), verification tiers (verified_checkin, regular_spot, unverified_claim), post responses with accept/reject | `components/PostCard.tsx`, `types/database.ts` |
| **Chat** | Real-time 1:1 messaging via Supabase Realtime, unread counts, photo sharing in chat, block/report | `screens/ChatListScreen.tsx` |
| **Gamification** | Location streaks (daily/weekly/monthly), milestone achievements (5/10/25/50/100), streak badges and cards | `components/streaks/StreakBadge.tsx`, `components/streaks/StreakCard.tsx` |
| **Social** | Regulars mode (discover fellow regulars at shared locations), visibility controls (public/mutual/hidden), regulars preview on location cards | `components/regulars/RegularsModeToggle.tsx`, `components/regulars/RegularsList.tsx` |
| **Check-ins** | GPS-verified check-in/check-out, Google Places venue discovery, location picker modal, LiveView modal showing checked-in users | `components/checkin/CheckInButton.tsx`, `components/modals/LiveViewModal.tsx` |
| **Events** | Eventbrite/Meetup integration, event cards with platform badges, post count per event, status badges (ongoing/ended) | `components/events/EventCard.tsx` |
| **Trust** | Selfie verification with content moderation (Google Vision SafeSearch), verified badges, verification prompt | `components/VerificationPrompt.tsx` |
| **Profile** | Avatar editing, display name, photo gallery, notification settings, location tracking settings, account deletion, GDPR data export | `screens/ProfileScreen.tsx` |
| **Onboarding** | Welcome screen, location permission, producer/consumer demo, completion screen | `components/onboarding/WelcomeScreen.tsx` |

### Data Model Summary
- **Profiles**: Avatar, verification status, tracking preferences
- **Locations**: Google Places integration, coordinates, place types
- **Posts**: 30-day expiry, target avatar, sighting date/time granularity, producer photo verification
- **Post Responses**: Verification tiers, accept/reject workflow
- **Conversations**: Producer/consumer roles, real-time messaging
- **Check-ins**: GPS-verified with accuracy tracking
- **Streaks**: Daily/weekly/monthly with milestones
- **Favorites**: Custom-named saved locations
- **Blocks/Reports**: Full moderation pipeline

---

## User Journey Analysis

### First-Time User Experience

**Current Flow:**
1. AuthScreen (email/password signup with terms acceptance)
2. Onboarding carousel (Welcome, LocationPermission, ProducerDemo, ConsumerDemo, Complete)
3. Dropped into Feed tab showing "No posts nearby" (user is at home)

**Critical Gaps:**
- No avatar creation prompt after signup. Users enter the app without an avatar, which breaks the matching system entirely -- they cannot be identified as a match for any post.
- The 50m feed radius means the first screen is almost always empty. The user's first impression is an empty void.
- No social login (Apple/Google) creates high signup friction.
- No explanation of what "producer" vs "consumer" means in practical terms.
- The onboarding WelcomeScreen uses HTML/Tailwind elements that do not render in React Native, indicating the onboarding may not be functional on mobile.

**Ideal First 5 Minutes:**
1. Social login (one tap)
2. Understand the concept through a brief animated story, not terminology
3. Create an avatar (mandatory before proceeding)
4. See a curated feed of popular posts near their city (not 50m)
5. Check in to their first location or save a favorite

### Core Loop Analysis

The engagement loop currently works as:

```
Visit venue -> Check in -> See/create posts -> Match -> Chat -> [Meet?]
```

**What keeps users coming back:**
- **Streaks**: Daily/weekly/monthly visit tracking creates habit loops for returning to the same venues
- **Regulars**: Social proof of familiar faces at favorite spots
- **Notifications**: Match and message notifications pull users back (push notifications are set up)
- **LiveView**: Seeing who is currently at a location creates FOMO and urgency

**What does NOT create return visits:**
- No notification when someone posts about a venue the user frequents (passive discovery only)
- No "someone might be looking for you" nudge when the user is near a location with active posts
- No weekly digest or summary to re-engage lapsed users
- Streaks have no social visibility or competitive element -- they only show on the user's own profile
- Posts expire after 30 days but there is no reminder to check if anyone responded

### Drop-off Risk Points

| Stage | Risk | Cause | Mitigation Needed |
|-------|------|-------|-------------------|
| **Signup** | High | Email-only auth, no social login | Add Apple/Google sign-in |
| **First session** | Critical | Empty feed at home, no guidance, no avatar | City-wide discovery mode, forced avatar, tutorial |
| **Day 2-3** | High | No reason to return if no match occurred | Proximity alerts, weekly digest, streak nudges |
| **Week 2** | Medium | Feature discovery is poor; streaks/regulars/events hidden | Progressive feature revelation, achievement system |
| **Month 1** | Medium | Content gets stale, same venues | Expand radius, trending venues, seasonal events |
| **Post-match** | Low-Medium | Chat goes cold after initial excitement | Conversation prompts, icebreakers, shared experiences |

---

## New Feature Proposals

### High Impact Features

---

#### F-01: Proximity Alerts ("Someone might be looking for you")

**Description:** When a user is within range of a location that has active posts matching their avatar profile, send a silent push notification: "Someone at [Venue] might have noticed you. Check it out?" This transforms the app from pull-based (user must open and browse) to push-based (app reaches out when relevant).

**User Story:** As a user who visits The Blue Note regularly, I want to be notified when someone posts a missed connection at that venue so I can see if it is about me, without having to manually check every day.

**Expected Impact:** 3-5x increase in post response rate. Converts passive lurkers into active responders. Creates the "serendipity" feeling that is the app's core emotional promise.

**Acceptance Criteria:**
- Proximity alert triggers when user is within 500m of a location with posts from the last 7 days
- Alert includes venue name and number of active posts (not post content, to maintain mystery)
- User can mute alerts per venue or globally
- Maximum 3 alerts per day to prevent fatigue
- Requires background location permission (already tracked via `backgroundLocation.ts`)
- Alert tapping opens the Ledger screen for that location

**Implementation Complexity:** Medium. Background location tracking already exists (`services/backgroundLocation.ts`). Requires a server-side matching job that compares user location against active post locations and triggers push notifications via existing notification infrastructure.

---

#### F-02: City-Wide Discovery Mode ("Explore Beyond 50m")

**Description:** Replace the rigid 50m feed radius with a tiered discovery system: Nearby (50m), Neighborhood (500m), District (2km), City (25km). Each tier shows progressively less detail -- city-wide posts show only the venue name and avatar, while nearby posts show the full note. This ensures the feed is never empty and gives users a reason to visit new venues.

**User Story:** As a new user at home, I want to browse missed connections across my city so I can understand the app's value before I visit a venue, rather than seeing an empty screen.

**Expected Impact:** Eliminates the critical "empty feed" problem for new users. Expected to reduce Day 1 churn by 40-60%. Creates a discovery funnel that motivates users to visit venues where posts exist.

**Acceptance Criteria:**
- Feed shows posts in concentric tiers with distance indicators
- City-wide posts show venue name, avatar thumbnail, and truncated first line only
- Full post detail requires being within 500m OR being a Regular at that location
- Tier selector UI at top of feed (chips or segmented control)
- Default to "City" for new users with zero check-ins, "Nearby" for active users
- Performance: load max 50 posts per tier, paginated

**Implementation Complexity:** Medium. Requires modifying `useNearbyPosts` hook to accept variable radius. PostCard already supports compact mode. New RPC function `get_posts_in_radius` with configurable radius parameter. Feed screen needs tier selector UI.

---

#### F-03: "It's a Match" Ceremony

**Description:** When a consumer responds to a post and the producer accepts, trigger a full-screen animated celebration moment (similar to dating apps). Show both avatars, the venue, the original post note, and a CTA to start chatting. This transforms a database state change into an emotional peak moment.

**User Story:** As a producer who posted about someone I saw at a coffee shop, I want to feel excitement and validation when that person responds, not just see a new chat appear in my list.

**Expected Impact:** Significantly increases emotional attachment to the app. Match ceremonies in dating apps are the #1 driver of screenshot sharing and word-of-mouth growth. Expected 2-3x increase in conversation initiation after match.

**Acceptance Criteria:**
- Full-screen modal with confetti/particle animation
- Shows both avatars side by side with a heart or connection icon
- Displays venue name and the original note
- "Say Hello" CTA button leads to chat
- Haptic feedback (success pattern) on trigger
- Can be dismissed by tapping outside or pressing back
- Sound effect (optional, respects device mute)
- Animation duration: 3-4 seconds auto-dismiss to chat

**Implementation Complexity:** Low-Medium. Pure frontend feature. Requires a new MatchCelebrationModal component, Lottie or Reanimated animation, and a trigger in the post response acceptance flow. No backend changes needed.

---

#### F-04: Smart Icebreakers in Chat

**Description:** When a new conversation starts, auto-generate 3 contextual icebreaker suggestions based on the shared venue, time of sighting, and post content. Examples: "What were you drinking at [Venue] last Thursday?" or "I was the one by the window -- what brought you to [Venue]?" Users can tap to send or write their own.

**User Story:** As someone who matched with a missed connection, I want help starting the conversation because the anonymous context makes it awkward to know what to say first.

**Expected Impact:** 40-60% increase in first message rate after match. Reduces the "staring at empty chat" paralysis that kills many matches before they start.

**Acceptance Criteria:**
- 3 icebreaker chips appear above the message input when conversation has zero messages
- Icebreakers are contextual (reference venue name, day of week, time of day)
- Tapping a chip auto-sends the message
- Chips disappear after first message is sent by either party
- Icebreakers never reference personal details or physical descriptions
- At least 20 template variations to avoid repetitiveness

**Implementation Complexity:** Low. Frontend-only feature. Template engine with venue/time interpolation. Modify ChatScreen to show icebreaker chips when message count is zero.

---

#### F-05: Venue Buzz Score & Trending Venues

**Description:** Calculate a real-time "buzz score" for each venue based on: number of active check-ins, posts in the last 48 hours, response rate, and regulars count. Display this as a heat indicator on the map and a "Trending" section in the feed. Venues with high buzz scores get a flame or sparkle indicator.

**User Story:** As a user deciding where to go tonight, I want to see which venues have the most active Backtrack community so I can maximize my chances of making a connection.

**Expected Impact:** Creates a network effect where popular venues become more popular. Drives real-world behavior (choosing venues). Expected to increase check-in frequency by 20-30% as users seek out high-buzz locations.

**Acceptance Criteria:**
- Buzz score calculated from: active check-ins (40%), posts last 48h (30%), regulars count (20%), response rate (10%)
- Map markers change color/size based on buzz score (cold=blue, warm=orange, hot=red)
- "Trending Now" horizontal scroll section at top of Feed screen
- Buzz score updates every 5 minutes
- Shows "X people here now" count for venues with active check-ins
- Trending section shows top 5 venues within 25km

**Implementation Complexity:** Medium-High. Requires new server-side scoring function, map marker customization, and a new trending venues endpoint. The individual data points all exist already (check-ins, posts, regulars) -- the work is aggregation and presentation.

---

### Engagement & Retention Features

---

#### E-01: Streak Leaderboard ("Top Regulars")

**Description:** Add an anonymous leaderboard showing the top streak holders at each venue. Display only avatars and streak counts (no names or identifying info). Users see their own rank highlighted. Creates healthy competition and social proof without compromising anonymity.

**User Story:** As someone with a 15-day streak at my favorite coffee shop, I want to see how I rank against other regulars so I feel motivated to maintain my streak.

**Expected Impact:** Streaks currently have zero social visibility. Adding a leaderboard adds competitive motivation, expected to increase streak maintenance by 30-40%.

**Acceptance Criteria:**
- Leaderboard accessible from location detail and StreakCard
- Shows top 10 streak holders (avatar + streak count + streak type)
- Current user's position highlighted even if outside top 10
- Anonymous -- only avatar and streak, no display name
- Separate tabs for daily/weekly/monthly streaks
- Updates in real-time when someone checks in

**Implementation Complexity:** Low-Medium. Requires a new RPC function to fetch top streakers per location and a LeaderboardModal component. Streak data already exists in the database.

---

#### E-02: Achievement Badges & Trophies

**Description:** Expand the milestone system into a full achievement system with visual badges displayed on profiles and in chat. Categories: Explorer (visit X unique venues), Social (start X conversations), Streak Master (maintain X-day streak), Matchmaker (get X matches), Community (get X responses to posts).

**User Story:** As an active user, I want to earn and display achievements that show my engagement level so other users can see I am an active, trustworthy member of the community.

**Expected Impact:** Achievement systems in social apps typically increase DAU by 15-25%. Badges serve as trust signals (like verification but earned through behavior) and create long-term goals beyond individual interactions.

**Acceptance Criteria:**
- 15-20 badges across 5 categories (Explorer, Social, Streak, Matchmaker, Community)
- Bronze/Silver/Gold tiers per achievement
- Badge display on profile (top 3 featured badges)
- Badge icon shown next to avatar in chat list
- Push notification on achievement unlock
- Achievement detail modal showing progress toward next tier
- "New badge" celebration animation (reuse match ceremony framework)

**Implementation Complexity:** Medium. Requires new `user_achievements` table, server-side progress tracking triggers, badge asset creation, and UI components for display. Can be rolled out incrementally by category.

---

#### E-03: Weekly Recap & Digest

**Description:** Every Sunday evening, send users a personalized push notification with a weekly summary: venues visited, streaks maintained, posts seen, matches made, and a "nudge" -- a venue suggestion where they have not been but that has high activity. The digest re-engages lapsed users and reinforces habit loops.

**User Story:** As a user who has not opened the app in 3 days, I want a friendly reminder of my activity and what I might be missing so I am motivated to check back in.

**Expected Impact:** Weekly digests in social apps recover 10-20% of lapsing users. Combined with streak-at-risk notifications, expected to maintain 7-day retention above 40%.

**Acceptance Criteria:**
- Push notification every Sunday at 6 PM local time
- Notification preview: "Your week: X venues, Y streak days, Z new posts near you"
- Tapping opens an in-app Weekly Recap screen with animated stats
- Includes "Streak at risk" warning if streak will break without a visit
- Includes "Hot venue" suggestion based on proximity and buzz score
- Users can disable weekly digest in notification settings
- No digest if user had zero activity that week (avoid reminding inactive users they are inactive)

**Implementation Complexity:** Medium. Requires server-side scheduled job (Supabase Edge Function or cron), user timezone tracking, and a new WeeklyRecapScreen. Push notification infrastructure already exists.

---

#### E-04: "Ghost Mode" Time-Limited Visibility

**Description:** Allow users to activate "Ghost Mode" for 1-4 hours, which hides their check-in from LiveView and regulars lists but still allows them to browse and create posts. This gives users control over when they are visible, reducing anxiety about being "watched" at venues.

**User Story:** As someone who values privacy, I sometimes want to visit a venue and browse Backtrack without appearing in the LiveView or regulars list, especially if I am meeting a friend and do not want to seem available.

**Expected Impact:** Reduces privacy-related churn. Users who feel "surveilled" by always-on visibility are more likely to disable the feature entirely. Ghost Mode provides a middle ground, expected to increase regulars mode opt-in by 15-20%.

**Acceptance Criteria:**
- Activatable from check-in confirmation or profile quick settings
- Duration options: 1h, 2h, 4h, or "until I check out"
- Ghost Mode icon (semi-transparent avatar outline) shown on user's own check-in status
- User's check-in still counts for streaks and post eligibility
- User is hidden from LiveView and regulars list while active
- Auto-expires after selected duration
- Cannot be used to retroactively hide after being seen (only applies going forward)

**Implementation Complexity:** Low-Medium. Requires a `ghost_mode_until` timestamp on `user_checkins` table and filtering logic in LiveView and regulars queries.

---

### Trust & Safety Improvements

---

#### T-01: Graduated Trust System

**Description:** Replace the binary verified/unverified system with a 5-tier trust score that increases with consistent positive behavior: (1) New User, (2) Verified Identity, (3) Active Member (10+ check-ins, 0 reports), (4) Trusted Regular (30+ check-ins, verified, streak holder), (5) Community Pillar (100+ check-ins, multiple venue regulars, zero blocks). Higher tiers unlock features: photo sharing unlocks at tier 2, regulars visibility at tier 3, priority matching at tier 4.

**User Story:** As a user who has been active and well-behaved for months, I want my trustworthiness to be reflected in my profile so other users feel safer interacting with me, and I want recognition for my positive contributions.

**Expected Impact:** Graduated trust creates a progression system separate from gamification. Expected to reduce report rates by 25-30% as bad actors are naturally limited to tier 1-2, and to increase photo sharing confidence by 40%.

**Acceptance Criteria:**
- 5 tiers with clear criteria displayed in profile
- Trust tier badge visible on profile and in chat list (replaces simple verified badge)
- Feature gating: photo sharing requires tier 2+, regulars mode requires tier 3+
- Tier downgrades if user receives validated reports (2+ confirmed reports drops 1 tier)
- Progress indicator showing how close user is to next tier
- Tier-specific badge colors (gray, blue, green, gold, purple)
- Migration path: existing verified users start at tier 2, unverified at tier 1

**Implementation Complexity:** Medium-High. Requires new `user_trust_score` table, server-side tier calculation logic, feature gating middleware, and UI updates across VerifiedBadge, ChatList, PostCard, and Profile.

---

#### T-02: AI-Powered Post Content Screening

**Description:** Before publishing a post, run the note text through a content screening layer that flags potentially inappropriate, identifying, or harassing content. Block posts that contain: phone numbers, social media handles, physical descriptions that are too specific (race, body comments), derogatory language, or personally identifiable information. Show a friendly editor with inline suggestions for revision.

**User Story:** As a user creating a post, I want to be guided away from writing something that could be harmful or that reveals too much identifying information, so the community stays safe and anonymous.

**Expected Impact:** Proactive moderation catches issues before they reach other users. Expected to reduce report volume by 50-60% and maintain the anonymous, respectful tone of the platform.

**Acceptance Criteria:**
- Client-side pre-screening before submission (fast, regex-based for obvious patterns)
- Server-side deep screening via Supabase Edge Function (NLP-based)
- Blocked patterns: phone numbers, @handles, URLs, slurs, explicit body descriptions
- Inline warnings with suggested revisions (not just rejection)
- Hard blocks for clearly violating content (slurs, threats)
- Soft warnings for borderline content ("This description might be too specific. Consider generalizing.")
- Appeal button for false positives that routes to manual review

**Implementation Complexity:** Medium. Client-side regex scanning is straightforward. Server-side NLP can leverage the existing `moderate-image` Edge Function pattern. Requires a new `moderate-text` function.

---

#### T-03: Conversation Safety Features

**Description:** Add safety guardrails to chat: (a) First-message review delay -- new conversations have a 2-minute delay before messages appear, allowing the system to screen the first message; (b) "Are you comfortable?" check-in prompt after 10 messages, asking if both users want to continue; (c) Quick-exit button that blocks and reports in one tap with pre-filled reason; (d) "Share location" blocker that detects and warns against sharing real addresses or location pins.

**User Story:** As a user in a new conversation with a stranger, I want the app to look out for my safety and give me easy ways to disengage if I feel uncomfortable.

**Expected Impact:** Safety features directly impact trust and retention, especially for female users who are disproportionately affected by harassment. Expected to increase female user retention by 20-30%.

**Acceptance Criteria:**
- First message screening via existing rate limiting infrastructure
- "Feeling comfortable?" prompt after 10 messages, dismissible
- One-tap "Exit & Report" button in chat header (block + report + pre-filled)
- Address/location pattern detection in outgoing messages with warning modal
- All safety features can be disabled in settings by power users
- Safety tips shown on first chat open (one-time education)

**Implementation Complexity:** Low-Medium. Most features are frontend UI additions. Message screening can piggyback on the existing rate limiting system (`supabase/migrations/20260207000001_chat_message_rate_limiting.sql`).

---

### Discovery & Matching Improvements

---

#### D-01: "Walk by Radar" -- Passive Missed Connection Detection

**Description:** When two users with matching check-in overlaps at the same venue (same time window) never interacted, surface a subtle notification 24 hours later: "You and someone else were both at [Venue] yesterday evening. Create a post?" This proactively identifies potential missed connections that neither party thought to post about.

**User Story:** As a user who visited a cafe yesterday but did not think to post, I want the app to remind me that other Backtrack users were there too, so I can create a post if I noticed someone.

**Expected Impact:** Dramatically increases post creation rate by removing the "I should have posted" regret barrier. Expected to increase new post volume by 30-50%.

**Acceptance Criteria:**
- Triggered when 2+ Backtrack users have overlapping check-ins at the same venue within a 2-hour window
- Notification sent 24 hours after the overlap (not real-time, to maintain mystery)
- Notification does NOT reveal who the other person was
- "Create a Post" CTA in notification pre-fills the venue and approximate time
- Maximum 1 radar notification per day per user
- Requires both users to have active Regulars mode or verified check-in
- Opt-out available in notification settings

**Implementation Complexity:** Medium. Requires a server-side scheduled job that scans for check-in overlaps. The check-in data, notification system, and post creation flow all exist -- this connects them.

---

#### D-02: Avatar Similarity Matching Improvements

**Description:** Enhance the current avatar match scoring with a "Does this look like you?" interactive confirmation flow. When a consumer views a post, instead of showing a static match percentage, show a side-by-side comparison of their avatar and the post's target avatar with toggleable features (hair, face shape, accessories). Let users self-assess and adjust their avatar to improve future matching.

**User Story:** As a consumer browsing posts, I want a clear visual comparison between my avatar and the post's description so I can honestly assess if the post might be about me, and improve my avatar accuracy.

**Expected Impact:** Improves match quality by encouraging accurate avatars. Reduces false positive responses that waste both parties' time. Expected to increase true match rate by 20%.

**Acceptance Criteria:**
- Side-by-side avatar comparison view on PostDetail screen
- Feature-by-feature highlighting (hair color match, face shape match, etc.)
- "Update my avatar" shortcut from comparison view
- Match confidence shown as descriptive text, not just percentage
- Does not reveal which specific features matched/mismatched (prevents gaming)
- Comparison only available to users with a configured avatar

**Implementation Complexity:** Medium. Requires avatar feature extraction logic (parsing DiceBear config properties) and a new ComparisonView component. No backend changes.

---

#### D-03: Time-Aware Post Discovery

**Description:** Add a "Time Machine" filter to the feed and map that lets users see posts from specific time windows: "Last night," "This morning," "This weekend," "Last week." Posts are already tagged with `sighting_date` and `time_granularity` -- this surfaces that data as a first-class filter instead of buried in PostCard metadata.

**User Story:** As a user who went out last Saturday night, I want to filter posts to see only those from Saturday evening so I can find relevant missed connections without scrolling through a week of posts.

**Expected Impact:** Dramatically improves content relevance. Users currently see a chronological soup of posts with no time filtering. Expected to increase post engagement (tap-through) by 35%.

**Acceptance Criteria:**
- Time filter chips above the feed: "Now," "Today," "Last night," "This weekend," "This week," "Custom"
- Custom date/time picker for specific ranges
- Filter persists within session, resets on app restart
- Applies to both Feed and Ledger (per-location) views
- Empty state changes to time-specific: "No posts from last night. Were you somewhere fun?"
- Works with existing `sighting_date` and `time_granularity` fields

**Implementation Complexity:** Low. Pure frontend filtering on data that already exists. Modify `useNearbyPosts` to accept date range parameters. Add filter chip UI to FeedScreen.

---

### Social & Community Features

---

#### S-01: Venue Stories ("What Happened Here")

**Description:** Allow checked-in users to post ephemeral "stories" -- short text snippets visible to everyone at the venue for 4 hours. Stories create ambient awareness of the venue's vibe without the weight of a missed connection post. Examples: "Live jazz starting at 9," "Great cocktail specials tonight," "Super crowded, come early."

**User Story:** As a user checked in at a bar, I want to share what is happening here right now so other Backtrack users can decide whether to come, creating a real-time community atmosphere.

**Expected Impact:** Creates content for users who are not looking for a romantic/social connection but still want to engage. Increases check-in value and drives foot traffic. Expected to increase daily check-ins by 25%.

**Acceptance Criteria:**
- 140-character text-only stories (no photos to maintain anonymity)
- Visible to all users viewing the venue's Ledger
- Auto-expires after 4 hours
- Maximum 3 stories per user per venue per day
- Stories shown in a horizontal scroll above the post list
- Only available to users currently checked in at the venue
- Report button on each story
- Story count shown on map markers as a secondary indicator

**Implementation Complexity:** Medium. New `venue_stories` table, creation UI (simple text input modal), display component (horizontal ScrollView), and expiry cleanup job.

---

#### S-02: Group Hangout Coordination

**Description:** Allow a user to create a "Hangout" at a venue -- an open invitation for regulars to join. Shows a time, venue, and optional theme ("Trivia night crew," "Post-work drinks"). Other regulars at the venue can express interest (anonymous RSVP). When 3+ people RSVP, the hangout becomes "confirmed" and participants can see each other's avatars.

**User Story:** As a regular at a bar, I want to coordinate casual group hangouts with other regulars so we can build community beyond 1:1 missed connections.

**Expected Impact:** Evolves the app from purely romantic/attraction-based to include platonic social connection. Expands the addressable market significantly. Expected to increase weekly active users by 20%.

**Acceptance Criteria:**
- Create hangout: venue (from favorites or current check-in), date/time, optional theme (30 char)
- RSVP options: "Interested" (anonymous) or "Going" (avatar visible after threshold)
- Minimum threshold: 3 RSVPs to "confirm" the hangout
- Confirmed hangouts show participant avatars and count
- Hangout appears on venue's Ledger page and in a new "Hangouts" tab
- Only available to users who are regulars at the venue (tier 3+ or regular status)
- Auto-cancels if fewer than 3 RSVPs 2 hours before start time
- Post-hangout prompt: "How was it? Create a post about someone you met"

**Implementation Complexity:** High. New `hangouts` table, RSVP system, threshold logic, new UI screens (create, list, detail), and notification pipeline for RSVP updates.

---

#### S-03: Anonymous Reactions on Posts

**Description:** Allow users to react to posts without creating a full response. Reactions: "That was me!" (signals a match without commitment), "Great description!" (positive feedback for the poster), "I saw them too!" (corroboration). Reactions are anonymous and shown as aggregate counts.

**User Story:** As a user browsing posts, I want lightweight ways to interact beyond the high-commitment "respond" action, so I can engage casually even if I am not sure the post is about me.

**Expected Impact:** Significantly lowers the engagement threshold. Currently the only actions on a post are "respond" (high commitment) or do nothing. Reactions fill the engagement gap. Expected to increase post interaction rate by 60-80%.

**Acceptance Criteria:**
- 3 reaction types with distinct emojis and labels
- "That was me!" reaction triggers a special flow asking if user wants to respond
- Reaction counts shown on PostCard (aggregate, not per-user)
- Users can see their own reactions but not who else reacted
- Maximum 1 reaction per user per post
- Reactions do not create conversations
- Producer gets a notification summary: "Your post at [Venue] got 3 reactions"

**Implementation Complexity:** Low-Medium. New `post_reactions` table, UI additions to PostCard (reaction bar), and notification aggregation. Simple frontend and backend work.

---

## Quick Wins (Low effort, high impact)

These features can each be implemented in 1-3 days and deliver immediate user-facing value.

| # | Feature | Effort | Impact | Description |
|---|---------|--------|--------|-------------|
| QW-01 | **Icebreaker chips in chat** | 1 day | High | Pre-written contextual openers shown in empty chats. Frontend only. |
| QW-02 | **Time filter chips on feed** | 1 day | High | Filter posts by "Today," "Last night," "This weekend." Frontend only with existing data. |
| QW-03 | **Streak-at-risk push notification** | 0.5 day | Medium | "Your 12-day streak at [Venue] ends tomorrow!" Scheduled notification when streak is about to break. |
| QW-04 | **Post reaction buttons** | 2 days | High | "That was me!" / "Great description!" / "I saw them too!" lightweight reactions on posts. |
| QW-05 | **Empty feed action cards** | 0.5 day | High | Replace "No posts nearby" with actionable cards: "Check in," "Browse map," "Create a post." |
| QW-06 | **"Someone posted near you" notification** | 1 day | High | Push notification when a new post is created at a venue where user is a regular. |
| QW-07 | **Avatar creation enforcement** | 0.5 day | Critical | Block main app access until avatar is created. Fullscreen prompt after onboarding. |
| QW-08 | **Chat typing indicator** | 1 day | Medium | Show "..." when the other person is typing. Uses Supabase Realtime presence. |
| QW-09 | **"Share to story" after post creation** | 0.5 day | Medium | After creating a post, offer to share a redacted screenshot to Instagram Stories with app watermark. |
| QW-10 | **Swipe to check out** | 0.5 day | Low | Swipe gesture on check-in status bar to quickly check out. Saves taps. |

---

## Moonshot Ideas (High effort, transformative)

These features would require 2-8 weeks of development but could fundamentally change the app's market position.

---

### M-01: Voice Notes in Posts ("Hear My Vibe")

**Description:** Allow producers to record a 10-second voice note that plays when viewing the post detail. The voice is pitch-shifted by a configurable amount (chosen during recording) to maintain anonymity while conveying personality, tone, and emotion. This transforms static text posts into rich, personality-filled content.

**Why Transformative:** Text is the lowest-fidelity medium for conveying attraction and personality. Voice notes add warmth, humor, and authenticity without revealing identity (thanks to pitch shifting). This would be a differentiator no competitor in the missed connections space has.

**Estimated Effort:** 3-4 weeks (audio recording, pitch shifting library, Supabase Storage, playback UI, moderation pipeline).

---

### M-02: AR Venue Overlay ("See the Posts Around You")

**Description:** Using the device camera and GPS, overlay active posts as floating avatar bubbles positioned at the approximate spot in the venue where the sighting occurred. Users point their phone around the venue and see avatars floating in 3D space with notes appearing on tap.

**Why Transformative:** Turns post browsing into an immersive, physical experience. Creates viral "wow" moments. Would make Backtrack the first missed connections app with an AR layer.

**Estimated Effort:** 6-8 weeks (ARKit/ARCore integration via expo-three or ViroReact, spatial anchoring, AR avatar rendering, performance optimization).

---

### M-03: Cross-Venue Social Graph ("Your Constellation")

**Description:** Build a visual "constellation" view showing the user's social graph across venues: which regulars they share multiple venues with, which venues cluster together geographically, and which "orbits" (people they keep crossing paths with but never connected with) exist. Visualized as an animated node graph.

**Why Transformative:** Surfaces hidden social patterns that users cannot see themselves. "You and this person have been at the same 3 venues in the last month but never talked" is a powerful narrative. Creates a uniquely Backtrack view of social serendipity.

**Estimated Effort:** 4-5 weeks (graph data computation, D3/Victory visualization, animation, privacy-preserving data aggregation).

---

### M-04: Venue Partnership Program ("Backtrack Nights")

**Description:** Partner with venues to host "Backtrack Nights" -- curated events where the venue promotes Backtrack and the app highlights the venue. Features: QR code check-in posters, venue-branded avatar accessories, special event posts, and post-event "Who did you notice?" prompts. Creates a B2B revenue stream through venue partnerships.

**Why Transformative:** Solves the chicken-and-egg problem of needing users at venues to have content. Venue partnerships bring users to specific locations, and events create concentrated post activity. Revenue model beyond subscriptions.

**Estimated Effort:** 4-6 weeks (QR check-in flow, venue dashboard, event creation tools, partnership agreements, branded avatar accessories).

---

## Actionable Tasks

| ID | Feature/Task | Priority | Effort | User Story | Acceptance Criteria |
|----|-------------|----------|--------|------------|---------------------|
| T-001 | **Avatar creation enforcement** | P0 - Critical | 0.5 day | As a new user, I must create an avatar before accessing the main app so the matching system works | Fullscreen overlay after onboarding; cannot be dismissed; avatar saved to profile before proceeding |
| T-002 | **Empty feed action cards** | P0 - Critical | 0.5 day | As a user seeing no nearby posts, I want actionable next steps instead of a dead end | Replace empty state with 3 cards: "Browse the map," "Check in here," "Create a post" with navigation CTAs |
| T-003 | **City-wide discovery mode** | P0 - Critical | 3 days | As a new user at home, I want to browse city-wide posts so the app feels alive | Tiered feed radius (50m/500m/2km/25km); detail level decreases with distance; default to city for new users |
| T-004 | **Post reaction buttons** | P1 - High | 2 days | As a browser, I want lightweight interaction beyond full responses | 3 reaction types on PostCard; aggregate counts; "That was me!" triggers response flow |
| T-005 | **Icebreaker chips in chat** | P1 - High | 1 day | As a new match, I want conversation starters to break the ice | 3 contextual chips above input; venue/time interpolation; disappear after first message |
| T-006 | **Time filter on feed** | P1 - High | 1 day | As a weekend goer, I want to filter posts by when the sighting happened | Filter chips: Now, Today, Last night, This weekend, This week; applies to Feed and Ledger |
| T-007 | **"It's a Match" ceremony** | P1 - High | 2 days | As a matched user, I want a celebratory moment that builds excitement | Full-screen modal; dual avatars; confetti animation; haptic feedback; "Say Hello" CTA |
| T-008 | **Proximity alerts** | P1 - High | 3 days | As a user near a venue with posts, I want to be notified of potential matches | Push notification within 500m of venue with active posts; max 3/day; mute per venue |
| T-009 | **Streak-at-risk notification** | P1 - High | 0.5 day | As a streak holder, I want to be warned before my streak breaks | Push notification 4 hours before daily streak window closes; includes venue name |
| T-010 | **"Someone posted near you" notification** | P1 - High | 1 day | As a regular, I want to know when new posts appear at my venues | Push notification to regulars when new post at their venue; max 1/day per venue |
| T-011 | **Chat typing indicator** | P2 - Medium | 1 day | As a chatter, I want to see when the other person is typing | "..." indicator using Supabase Realtime presence; debounced; timeout after 5s |
| T-012 | **Ghost Mode** | P2 - Medium | 2 days | As a privacy-conscious user, I want to hide my check-in from LiveView temporarily | 1h/2h/4h/session duration; still counts for streaks; icon indicator on own status |
| T-013 | **Walk-by radar notifications** | P2 - Medium | 3 days | As a user, I want to know when I crossed paths with other users at a venue | 24h delayed notification on check-in overlap; "Create a Post" CTA; max 1/day |
| T-014 | **Venue buzz score** | P2 - Medium | 4 days | As a venue chooser, I want to see which locations are most active on Backtrack | Composite score (check-ins, posts, regulars, responses); map heat markers; trending section |
| T-015 | **Streak leaderboard** | P2 - Medium | 2 days | As a streak holder, I want to see my rank among regulars | Top 10 per venue; avatar + streak count; own rank highlighted; daily/weekly/monthly tabs |
| T-016 | **Weekly recap digest** | P2 - Medium | 3 days | As a returning user, I want a summary of my week and what I missed | Sunday 6PM push; in-app recap screen; animated stats; streak warning; venue suggestion |
| T-017 | **Achievement badges** | P2 - Medium | 5 days | As an active user, I want earned badges that show my engagement level | 15-20 badges; bronze/silver/gold tiers; profile display; celebration on unlock |
| T-018 | **AI post content screening** | P2 - Medium | 3 days | As a poster, I want guidance if my content might be inappropriate | Client-side regex + server-side NLP; inline warnings; hard blocks for violations; appeal flow |
| T-019 | **Venue stories** | P2 - Medium | 4 days | As a checked-in user, I want to share what is happening at this venue right now | 140-char text; 4h expiry; horizontal scroll display; 3/day limit; check-in required |
| T-020 | **Avatar comparison view** | P2 - Medium | 3 days | As a consumer, I want a clear visual comparison to assess if a post is about me | Side-by-side view on PostDetail; feature highlighting; "Update avatar" shortcut |
| T-021 | **Conversation safety features** | P3 - Lower | 2 days | As a user in a new chat, I want safety guardrails and easy exit | "Feeling comfortable?" prompt; one-tap exit+report; address detection warning |
| T-022 | **Graduated trust system** | P3 - Lower | 5 days | As a long-term user, I want my trustworthiness reflected in a visible tier | 5 tiers; feature gating per tier; progress indicator; tier badge on profile/chat |
| T-023 | **Group hangout coordination** | P3 - Lower | 8 days | As a regular, I want to organize casual meetups with fellow regulars | Create hangout; RSVP system; 3-person threshold; regulars-only; auto-cancel logic |
| T-024 | **Voice notes in posts** | P3 - Moonshot | 15 days | As a poster, I want to convey my personality through a short voice clip | 10s recording; pitch shifting; playback in post detail; moderation; storage pipeline |
| T-025 | **AR venue overlay** | P3 - Moonshot | 30 days | As a venue visitor, I want to see floating post avatars in AR around me | Camera overlay; GPS-anchored avatars; tap-to-view; ARKit/ARCore integration |

---

**Priority Key:**
- **P0**: Must ship before next public release. Addresses critical user experience failures.
- **P1**: Ship within 2 weeks. High-impact features that drive engagement and retention.
- **P2**: Ship within 4-6 weeks. Meaningful improvements that deepen the experience.
- **P3**: Backlog. Lower priority or moonshot ideas for future consideration.

**Effort estimates assume a single experienced React Native/Supabase developer.**
