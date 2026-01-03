# Feature: Tiered Check-in Matching System

## Overview

This document specifies a tiered system for connecting post authors ("producers") with their persons of interest ("consumers"). The system uses verified check-ins, declared regular spots, and unverified claims to surface relevant posts to users while respecting privacy.

## Problem Statement

The current app has a fundamental discovery problem:
1. Producer creates a post about someone they saw at a location
2. The person of interest (consumer) has no way to discover this post unless they:
   - Happen to browse that specific location's posts
   - The app somehow identifies and notifies them

Relying solely on avatar matching is unreliable because:
- People's self-perception differs from how others see them
- Avatar descriptions are subjective
- Match scores would be noisy and generate false positives/negatives

## Solution: Tiered Matching with Verified Check-ins

### Tier System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MATCHING TIERS                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TIER 1: Verified Check-in                    [HIGHEST]     │
│  ├─ User checked in at location during time window          │
│  ├─ Geofence-verified at check-in time                      │
│  ├─ Push notification: "Someone may be looking for you"     │
│  └─ Response marked as "Verified"                           │
│                                                             │
│  TIER 2: Regular Spot                         [MEDIUM]      │
│  ├─ User has this location in favorites                     │
│  ├─ Post appears in "Posts at your spots" feed              │
│  ├─ No push notification                                    │
│  └─ Must confirm "I was there" to respond                   │
│                                                             │
│  TIER 3: Unverified Claim                     [LOWEST]      │
│  ├─ User claims they were there (no verification)           │
│  ├─ Can browse and respond to any post                      │
│  └─ Response marked as "Unverified"                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Current State Analysis

### What Exists

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| Location visits table | ✅ Exists | `migrations/020_location_visits.sql` | 50m verification, 3hr window |
| Auto check-in on post creation | ✅ Exists | `useCreatePostForm.ts` | Records visits when entering location step |
| Favorite locations | ✅ Exists | `hooks/useFavoriteLocations.ts` | Full CRUD with offline support |
| Push token registration | ✅ Exists | `services/notifications.ts` | Tokens stored, no sending logic |
| Notification preferences | ✅ Exists | `hooks/useNotificationSettings.ts` | Settings stored but unused |
| Posts with time fields | ✅ Exists | `migrations/028_add_time_to_posts.sql` | `sighting_date`, `time_granularity` |

### What's Missing

| Component | Priority | Notes |
|-----------|----------|-------|
| Explicit user check-in flow | HIGH | Users need UI to check in when they ARRIVE, not just when creating posts |
| Check-in time window validation | HIGH | Prevent retroactive check-ins after seeing a post |
| Tier-based post discovery | HIGH | Surface posts to users based on their tier |
| Push notification sending | HIGH | Edge function to send via Expo |
| Verified/unverified response marking | MEDIUM | Show poster which responses are verified |
| "Posts at your spots" feed | MEDIUM | Aggregate posts from favorite locations |
| Avatar boost within tier | LOW | Use avatar match to rank within same tier |

---

## Database Schema Changes

### New Table: `user_checkins`

```sql
-- Migration: 035_user_checkins.sql

CREATE TABLE user_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  -- Time tracking
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_at TIMESTAMPTZ, -- NULL means still checked in

  -- Verification
  verified BOOLEAN NOT NULL DEFAULT false,
  verification_lat DOUBLE PRECISION,
  verification_lon DOUBLE PRECISION,
  verification_accuracy DOUBLE PRECISION,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_checkout CHECK (checked_out_at IS NULL OR checked_out_at > checked_in_at)
);

-- Indexes for efficient querying
CREATE INDEX idx_checkins_user_location ON user_checkins(user_id, location_id);
CREATE INDEX idx_checkins_location_time ON user_checkins(location_id, checked_in_at);
CREATE INDEX idx_checkins_active ON user_checkins(user_id) WHERE checked_out_at IS NULL;

-- RLS Policies
ALTER TABLE user_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own checkins"
  ON user_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins"
  ON user_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkins"
  ON user_checkins FOR UPDATE
  USING (auth.uid() = user_id);
```

### New Table: `post_responses`

```sql
-- Migration: 036_post_responses.sql

CREATE TYPE response_verification_tier AS ENUM ('verified_checkin', 'regular_spot', 'unverified');

CREATE TABLE post_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Verification tier
  verification_tier response_verification_tier NOT NULL,
  checkin_id UUID REFERENCES user_checkins(id), -- Only for verified_checkin tier

  -- Response content
  message TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,

  -- Prevent duplicate responses
  UNIQUE(post_id, responder_id)
);

-- Indexes
CREATE INDEX idx_responses_post ON post_responses(post_id);
CREATE INDEX idx_responses_responder ON post_responses(responder_id);

-- RLS Policies
ALTER TABLE post_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Responders can read own responses"
  ON post_responses FOR SELECT
  USING (auth.uid() = responder_id);

CREATE POLICY "Post authors can read responses to their posts"
  ON post_responses FOR SELECT
  USING (auth.uid() = (SELECT producer_id FROM posts WHERE id = post_id));

CREATE POLICY "Users can insert own responses"
  ON post_responses FOR INSERT
  WITH CHECK (auth.uid() = responder_id);
```

### Modify Existing: `conversations` table

Add verification tier tracking:

```sql
-- Migration: 037_conversation_verification.sql

ALTER TABLE conversations
ADD COLUMN verification_tier response_verification_tier;

-- Backfill existing as unverified
UPDATE conversations SET verification_tier = 'unverified' WHERE verification_tier IS NULL;
```

---

## RPC Functions

### Check In to Location

```sql
-- Function: checkin_to_location
CREATE OR REPLACE FUNCTION checkin_to_location(
  p_location_id UUID,
  p_user_lat DOUBLE PRECISION,
  p_user_lon DOUBLE PRECISION,
  p_accuracy DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_location locations%ROWTYPE;
  v_distance DOUBLE PRECISION;
  v_checkin_id UUID;
  v_verified BOOLEAN := false;
BEGIN
  -- Get location
  SELECT * INTO v_location FROM locations WHERE id = p_location_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Location not found');
  END IF;

  -- Calculate distance using PostGIS
  SELECT ST_Distance(
    ST_SetSRID(ST_MakePoint(p_user_lon, p_user_lat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(v_location.longitude, v_location.latitude), 4326)::geography
  ) INTO v_distance;

  -- Verify within 200m (generous for GPS accuracy)
  IF v_distance <= 200 THEN
    v_verified := true;
  END IF;

  -- Check out of any existing active checkins at OTHER locations
  UPDATE user_checkins
  SET checked_out_at = now()
  WHERE user_id = auth.uid()
    AND checked_out_at IS NULL
    AND location_id != p_location_id;

  -- Check if already checked in at this location
  SELECT id INTO v_checkin_id
  FROM user_checkins
  WHERE user_id = auth.uid()
    AND location_id = p_location_id
    AND checked_out_at IS NULL;

  IF v_checkin_id IS NOT NULL THEN
    -- Already checked in, return existing
    RETURN json_build_object(
      'success', true,
      'checkin_id', v_checkin_id,
      'already_checked_in', true,
      'verified', v_verified
    );
  END IF;

  -- Create new checkin
  INSERT INTO user_checkins (
    user_id,
    location_id,
    verified,
    verification_lat,
    verification_lon,
    verification_accuracy
  ) VALUES (
    auth.uid(),
    p_location_id,
    v_verified,
    p_user_lat,
    p_user_lon,
    p_accuracy
  )
  RETURNING id INTO v_checkin_id;

  RETURN json_build_object(
    'success', true,
    'checkin_id', v_checkin_id,
    'verified', v_verified,
    'distance_meters', v_distance
  );
END;
$$;
```

### Check Out from Location

```sql
CREATE OR REPLACE FUNCTION checkout_from_location(
  p_location_id UUID DEFAULT NULL -- NULL = checkout from all
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_location_id IS NULL THEN
    -- Checkout from all locations
    UPDATE user_checkins
    SET checked_out_at = now()
    WHERE user_id = auth.uid()
      AND checked_out_at IS NULL;
  ELSE
    -- Checkout from specific location
    UPDATE user_checkins
    SET checked_out_at = now()
    WHERE user_id = auth.uid()
      AND location_id = p_location_id
      AND checked_out_at IS NULL;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN json_build_object('success', true, 'checkouts', v_count);
END;
$$;
```

### Get Posts for User (Tiered)

```sql
CREATE OR REPLACE FUNCTION get_posts_for_user(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  location_id UUID,
  location_name TEXT,
  producer_id UUID,
  message TEXT,
  target_rpm_avatar JSONB,
  sighting_date TIMESTAMPTZ,
  time_granularity TEXT,
  created_at TIMESTAMPTZ,
  matching_tier response_verification_tier,
  user_was_there BOOLEAN,
  checkin_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_checkins_expanded AS (
    -- Get all user checkins with time ranges
    SELECT
      uc.id as checkin_id,
      uc.location_id,
      uc.checked_in_at,
      COALESCE(uc.checked_out_at, uc.checked_in_at + INTERVAL '4 hours') as checked_out_at,
      uc.verified
    FROM user_checkins uc
    WHERE uc.user_id = auth.uid()
  ),
  user_favorites AS (
    -- Get user's favorite locations
    SELECT fl.location_id
    FROM favorite_locations fl
    WHERE fl.user_id = auth.uid()
  ),
  scored_posts AS (
    SELECT
      p.id as post_id,
      p.location_id,
      l.name as location_name,
      p.producer_id,
      p.message,
      p.target_rpm_avatar,
      p.sighting_date,
      p.time_granularity,
      p.created_at,
      -- Determine tier
      CASE
        -- Tier 1: Verified checkin overlapping with sighting time
        WHEN EXISTS (
          SELECT 1 FROM user_checkins_expanded uce
          WHERE uce.location_id = p.location_id
            AND uce.verified = true
            AND uce.checked_in_at <= COALESCE(p.sighting_date, p.created_at) + INTERVAL '2 hours'
            AND uce.checked_out_at >= COALESCE(p.sighting_date, p.created_at) - INTERVAL '2 hours'
        ) THEN 'verified_checkin'::response_verification_tier
        -- Tier 2: Regular spot (favorite location)
        WHEN EXISTS (
          SELECT 1 FROM user_favorites uf
          WHERE uf.location_id = p.location_id
        ) THEN 'regular_spot'::response_verification_tier
        -- Tier 3: Unverified (all other posts)
        ELSE 'unverified'::response_verification_tier
      END as matching_tier,
      -- Did user check in here ever?
      EXISTS (
        SELECT 1 FROM user_checkins_expanded uce
        WHERE uce.location_id = p.location_id
      ) as user_was_there,
      -- Get the matching checkin ID if verified
      (
        SELECT uce.checkin_id FROM user_checkins_expanded uce
        WHERE uce.location_id = p.location_id
          AND uce.verified = true
          AND uce.checked_in_at <= COALESCE(p.sighting_date, p.created_at) + INTERVAL '2 hours'
          AND uce.checked_out_at >= COALESCE(p.sighting_date, p.created_at) - INTERVAL '2 hours'
        LIMIT 1
      ) as checkin_id
    FROM posts p
    JOIN locations l ON l.id = p.location_id
    WHERE p.is_active = true
      AND p.producer_id != auth.uid() -- Don't show own posts
      AND NOT EXISTS ( -- Not already responded to
        SELECT 1 FROM post_responses pr
        WHERE pr.post_id = p.id AND pr.responder_id = auth.uid()
      )
      AND NOT EXISTS ( -- Not already in conversation
        SELECT 1 FROM conversations c
        WHERE c.post_id = p.id AND c.consumer_id = auth.uid()
      )
  )
  SELECT * FROM scored_posts
  ORDER BY
    -- Tier 1 first, then Tier 2, then Tier 3
    CASE matching_tier
      WHEN 'verified_checkin' THEN 1
      WHEN 'regular_spot' THEN 2
      ELSE 3
    END,
    -- Within tier, sort by recency
    created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
```

### Respond to Post

```sql
CREATE OR REPLACE FUNCTION respond_to_post(
  p_post_id UUID,
  p_message TEXT DEFAULT NULL,
  p_claimed_checkin_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post posts%ROWTYPE;
  v_tier response_verification_tier;
  v_checkin user_checkins%ROWTYPE;
  v_response_id UUID;
  v_conversation_id UUID;
BEGIN
  -- Get post
  SELECT * INTO v_post FROM posts WHERE id = p_post_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Post not found');
  END IF;

  -- Can't respond to own post
  IF v_post.producer_id = auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Cannot respond to own post');
  END IF;

  -- Determine verification tier
  IF p_claimed_checkin_id IS NOT NULL THEN
    -- Verify the checkin belongs to user and matches location/time
    SELECT * INTO v_checkin
    FROM user_checkins
    WHERE id = p_claimed_checkin_id
      AND user_id = auth.uid();

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Invalid checkin');
    END IF;

    IF v_checkin.location_id != v_post.location_id THEN
      RETURN json_build_object('success', false, 'error', 'Checkin location does not match post');
    END IF;

    IF v_checkin.verified THEN
      v_tier := 'verified_checkin';
    ELSE
      v_tier := 'unverified';
    END IF;
  ELSE
    -- Check if user has this as a favorite location
    IF EXISTS (
      SELECT 1 FROM favorite_locations
      WHERE user_id = auth.uid() AND location_id = v_post.location_id
    ) THEN
      v_tier := 'regular_spot';
    ELSE
      v_tier := 'unverified';
    END IF;
  END IF;

  -- Create response
  INSERT INTO post_responses (
    post_id,
    responder_id,
    verification_tier,
    checkin_id,
    message
  ) VALUES (
    p_post_id,
    auth.uid(),
    v_tier,
    p_claimed_checkin_id,
    p_message
  )
  RETURNING id INTO v_response_id;

  -- Create conversation
  INSERT INTO conversations (
    post_id,
    producer_id,
    consumer_id,
    verification_tier,
    status
  ) VALUES (
    p_post_id,
    v_post.producer_id,
    auth.uid(),
    v_tier,
    'pending'
  )
  RETURNING id INTO v_conversation_id;

  RETURN json_build_object(
    'success', true,
    'response_id', v_response_id,
    'conversation_id', v_conversation_id,
    'verification_tier', v_tier
  );
END;
$$;
```

---

## Edge Function: Send Notifications

```typescript
// supabase/functions/send-match-notification/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface NotificationPayload {
  user_id: string
  title: string
  body: string
  data?: Record<string, unknown>
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const payload: NotificationPayload = await req.json()

  // Get user's push tokens
  const { data: tokens, error: tokenError } = await supabase
    .from('expo_push_tokens')
    .select('token')
    .eq('user_id', payload.user_id)

  if (tokenError || !tokens?.length) {
    return new Response(
      JSON.stringify({ success: false, error: 'No push tokens found' }),
      { status: 404 }
    )
  }

  // Check user's notification preferences
  const { data: prefs } = await supabase
    .rpc('get_notification_preferences', { p_user_id: payload.user_id })

  if (!prefs?.match_notifications) {
    return new Response(
      JSON.stringify({ success: false, error: 'User has disabled match notifications' }),
      { status: 200 }
    )
  }

  // Send to Expo
  const messages = tokens.map(({ token }) => ({
    to: token,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data,
  }))

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  })

  const result = await response.json()

  return new Response(
    JSON.stringify({ success: true, result }),
    { status: 200 }
  )
})
```

---

## React Native Implementation

### New Hook: `useCheckin`

```typescript
// hooks/useCheckin.ts

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import * as Location from 'expo-location';

interface CheckinResult {
  success: boolean;
  checkin_id?: string;
  verified?: boolean;
  distance_meters?: number;
  error?: string;
}

interface ActiveCheckin {
  id: string;
  location_id: string;
  location_name: string;
  checked_in_at: string;
  verified: boolean;
}

export function useCheckin() {
  const [activeCheckin, setActiveCheckin] = useState<ActiveCheckin | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const checkIn = useCallback(async (locationId: string): Promise<CheckinResult> => {
    setIsCheckingIn(true);

    try {
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, error: 'Location permission required' };
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Call RPC function
      const { data, error } = await supabase.rpc('checkin_to_location', {
        p_location_id: locationId,
        p_user_lat: location.coords.latitude,
        p_user_lon: location.coords.longitude,
        p_accuracy: location.coords.accuracy,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.success) {
        // Fetch location name for display
        const { data: loc } = await supabase
          .from('locations')
          .select('name')
          .eq('id', locationId)
          .single();

        setActiveCheckin({
          id: data.checkin_id,
          location_id: locationId,
          location_name: loc?.name || 'Unknown',
          checked_in_at: new Date().toISOString(),
          verified: data.verified,
        });
      }

      return data;
    } catch (err) {
      return { success: false, error: 'Failed to check in' };
    } finally {
      setIsCheckingIn(false);
    }
  }, []);

  const checkOut = useCallback(async (locationId?: string) => {
    const { data, error } = await supabase.rpc('checkout_from_location', {
      p_location_id: locationId || null,
    });

    if (!error && data.success) {
      setActiveCheckin(null);
    }

    return data;
  }, []);

  const getActiveCheckin = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_checkins')
      .select(`
        id,
        location_id,
        checked_in_at,
        verified,
        locations (name)
      `)
      .is('checked_out_at', null)
      .order('checked_in_at', { ascending: false })
      .limit(1)
      .single();

    if (data && !error) {
      setActiveCheckin({
        id: data.id,
        location_id: data.location_id,
        location_name: data.locations?.name || 'Unknown',
        checked_in_at: data.checked_in_at,
        verified: data.verified,
      });
    }

    return data;
  }, []);

  return {
    activeCheckin,
    isCheckingIn,
    checkIn,
    checkOut,
    getActiveCheckin,
  };
}
```

### New Hook: `useTieredPosts`

```typescript
// hooks/useTieredPosts.ts

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

type VerificationTier = 'verified_checkin' | 'regular_spot' | 'unverified';

interface TieredPost {
  post_id: string;
  location_id: string;
  location_name: string;
  producer_id: string;
  message: string;
  target_rpm_avatar: object;
  sighting_date: string | null;
  time_granularity: string | null;
  created_at: string;
  matching_tier: VerificationTier;
  user_was_there: boolean;
  checkin_id: string | null;
}

interface TieredPostsResult {
  verified: TieredPost[];
  regularSpots: TieredPost[];
  other: TieredPost[];
}

export function useTieredPosts() {
  const [posts, setPosts] = useState<TieredPostsResult>({
    verified: [],
    regularSpots: [],
    other: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .rpc('get_posts_for_user', { p_limit: 100 });

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    // Group by tier
    const grouped: TieredPostsResult = {
      verified: [],
      regularSpots: [],
      other: [],
    };

    for (const post of data || []) {
      switch (post.matching_tier) {
        case 'verified_checkin':
          grouped.verified.push(post);
          break;
        case 'regular_spot':
          grouped.regularSpots.push(post);
          break;
        default:
          grouped.other.push(post);
      }
    }

    setPosts(grouped);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    isLoading,
    error,
    refresh: fetchPosts,
  };
}
```

### UI Component: Check-in Button

```typescript
// components/CheckinButton.tsx

import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCheckin } from '@/hooks/useCheckin';

interface Props {
  locationId: string;
  locationName: string;
}

export function CheckinButton({ locationId, locationName }: Props) {
  const { activeCheckin, isCheckingIn, checkIn, checkOut } = useCheckin();

  const isCheckedInHere = activeCheckin?.location_id === locationId;

  const handlePress = async () => {
    if (isCheckedInHere) {
      await checkOut(locationId);
    } else {
      await checkIn(locationId);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isCheckingIn}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: isCheckedInHere ? '#10B981' : '#3B82F6',
      }}
    >
      {isCheckingIn ? (
        <ActivityIndicator color="white" />
      ) : (
        <>
          <Ionicons
            name={isCheckedInHere ? 'checkmark-circle' : 'location'}
            size={20}
            color="white"
          />
          <Text style={{ color: 'white', marginLeft: 8, fontWeight: '600' }}>
            {isCheckedInHere ? 'Checked In' : 'Check In'}
          </Text>
          {isCheckedInHere && activeCheckin?.verified && (
            <View style={{
              marginLeft: 8,
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            }}>
              <Text style={{ color: 'white', fontSize: 10 }}>VERIFIED</Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}
```

### UI Component: Verification Badge

```typescript
// components/VerificationBadge.tsx

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Tier = 'verified_checkin' | 'regular_spot' | 'unverified';

interface Props {
  tier: Tier;
  compact?: boolean;
}

const TIER_CONFIG = {
  verified_checkin: {
    label: 'Verified',
    icon: 'checkmark-shield',
    color: '#10B981',
    bgColor: '#D1FAE5',
  },
  regular_spot: {
    label: 'Regular',
    icon: 'heart',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  unverified: {
    label: 'Unverified',
    icon: 'help-circle',
    color: '#6B7280',
    bgColor: '#F3F4F6',
  },
};

export function VerificationBadge({ tier, compact = false }: Props) {
  const config = TIER_CONFIG[tier];

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: config.bgColor,
      paddingHorizontal: compact ? 6 : 8,
      paddingVertical: compact ? 2 : 4,
      borderRadius: 4,
    }}>
      <Ionicons name={config.icon as any} size={compact ? 12 : 14} color={config.color} />
      {!compact && (
        <Text style={{ marginLeft: 4, color: config.color, fontSize: 12, fontWeight: '500' }}>
          {config.label}
        </Text>
      )}
    </View>
  );
}
```

---

## Implementation Order

### Phase 1: Database Foundation
1. Create migration `035_user_checkins.sql`
2. Create migration `036_post_responses.sql`
3. Create migration `037_conversation_verification.sql`
4. Add RPC functions for checkin/checkout

### Phase 2: Check-in Flow
1. Implement `useCheckin` hook
2. Create `CheckinButton` component
3. Add check-in UI to location detail screen
4. Add check-in prompt when app detects user at a known location (optional)

### Phase 3: Tiered Discovery
1. Implement `get_posts_for_user` RPC function
2. Create `useTieredPosts` hook
3. Update Ledger screen to show tiered posts
4. Add `VerificationBadge` component to post cards

### Phase 4: Response Flow
1. Implement `respond_to_post` RPC function
2. Update conversation creation to include verification tier
3. Show verification badges in conversation list
4. Update conversation detail to show verification status

### Phase 5: Notifications
1. Create `send-match-notification` Edge Function
2. Add database trigger to call Edge Function on new post
3. Send notifications to Tier 1 users (verified check-ins)
4. Add "Posts at your spots" notification digest for Tier 2 (optional)

---

## Testing Scenarios

### Check-in Verification
- [ ] User can check in when within 200m of location (verified)
- [ ] User cannot check in when far from location (unverified)
- [ ] Checking in at new location checks out from previous
- [ ] Check-in persists across app restarts

### Tiered Matching
- [ ] Posts at verified check-in locations appear in Tier 1
- [ ] Posts at favorite locations appear in Tier 2
- [ ] Other posts appear in Tier 3
- [ ] Time overlap is correctly calculated

### Response Flow
- [ ] Responding with verified check-in shows "Verified" badge
- [ ] Responding from favorite spot shows "Regular" badge
- [ ] Responding without verification shows "Unverified" badge
- [ ] Post author can see verification tier on each response

### Anti-Gaming
- [ ] Cannot check in retroactively after seeing post
- [ ] Cannot claim someone else's check-in
- [ ] Check-in time window prevents exploitation

---

## Privacy Considerations

1. **Location data**: Verification coordinates stored only at check-in time, not continuously tracked
2. **Check-in visibility**: Other users cannot see who else is checked in
3. **Tier visibility**: Only post author sees responder's verification tier
4. **Data retention**: Consider auto-expiring check-ins after 30 days

---

## Future Enhancements

1. **Avatar boost within tier**: Use avatar matching to rank posts within the same tier
2. **Check-in streaks**: Gamification for regular visitors
3. **Smart notifications**: "You were at 3 of your regular spots today - any missed connections?"
4. **Auto check-in**: Optional background location to auto-check-in at favorite spots
5. **Group check-ins**: Check in with friends for social proof
