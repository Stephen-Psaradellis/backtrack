/**
 * E2E Testing Data Seed Script
 *
 * This script creates comprehensive mock data in Supabase for E2E testing.
 * It covers all features of Backtrack including:
 * - Test users with profiles
 * - Locations (various venue types)
 * - Posts with different avatar configurations
 * - Conversations and messages
 * - Favorite locations
 * - Location visits and streaks
 * - Events and attendance
 *
 * Run with: npx ts-node scripts/seed-e2e-data.ts
 */

import { createClient } from '@supabase/supabase-js';

// Use environment variables or fallback to the values from .env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hyidfsfvqlsimefixfhc.supabase.co';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '***REMOVED***';

const supabase = createClient(supabaseUrl, supabaseSecretKey);

// Test user account (from CLAUDE.md)
const TEST_USER_EMAIL = 's.n.psaradellis@gmail.com';
const TEST_USER_PASSWORD = 'Test1234!';

// Generate UUIDs for test data
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Avatar configurations for testing
const avatarConfigs = {
  maleWithBeard: {
    skinColor: 'Light',
    hairColor: 'Brown',
    topType: 'ShortHairShortFlat',
    facialHairType: 'BeardMedium',
    facialHairColor: 'Brown',
    eyeType: 'Default',
    eyebrowType: 'Default',
    mouthType: 'Smile',
    clotheType: 'Hoodie',
    clotheColor: 'Blue01',
    accessoriesType: 'Blank'
  },
  femaleWithGlasses: {
    skinColor: 'Pale',
    hairColor: 'Black',
    topType: 'LongHairStraight',
    facialHairType: 'Blank',
    facialHairColor: 'Blank',
    eyeType: 'Happy',
    eyebrowType: 'UpDown',
    mouthType: 'Smile',
    clotheType: 'ShirtCrewNeck',
    clotheColor: 'Red',
    accessoriesType: 'Prescription02'
  },
  casualMale: {
    skinColor: 'Tanned',
    hairColor: 'Blonde',
    topType: 'ShortHairShortCurly',
    facialHairType: 'Blank',
    facialHairColor: 'Blank',
    eyeType: 'Default',
    eyebrowType: 'Default',
    mouthType: 'Default',
    clotheType: 'BlazerShirt',
    clotheColor: 'Gray01',
    accessoriesType: 'Blank'
  },
  athleticFemale: {
    skinColor: 'Brown',
    hairColor: 'Black',
    topType: 'LongHairBun',
    facialHairType: 'Blank',
    facialHairColor: 'Blank',
    eyeType: 'Wink',
    eyebrowType: 'RaisedExcited',
    mouthType: 'Smile',
    clotheType: 'Overall',
    clotheColor: 'Pink',
    accessoriesType: 'Blank'
  }
};

// Test locations in different areas
const testLocations = [
  {
    google_place_id: 'test_coffee_shop_1',
    name: 'Starbucks - Downtown',
    address: '123 Main Street, New York, NY 10001',
    latitude: 40.7128,
    longitude: -74.0060,
    place_types: ['cafe', 'food', 'establishment'],
    post_count: 0
  },
  {
    google_place_id: 'test_gym_1',
    name: 'Planet Fitness',
    address: '456 Fitness Ave, New York, NY 10002',
    latitude: 40.7589,
    longitude: -73.9851,
    place_types: ['gym', 'health', 'establishment'],
    post_count: 0
  },
  {
    google_place_id: 'test_bookstore_1',
    name: 'Barnes & Noble',
    address: '789 Book Lane, New York, NY 10003',
    latitude: 40.7282,
    longitude: -73.7949,
    place_types: ['book_store', 'store', 'establishment'],
    post_count: 0
  },
  {
    google_place_id: 'test_bar_1',
    name: 'The Local Pub',
    address: '321 Bar Street, New York, NY 10004',
    latitude: 40.7484,
    longitude: -73.9857,
    place_types: ['bar', 'night_club', 'establishment'],
    post_count: 0
  },
  {
    google_place_id: 'test_park_1',
    name: 'Central Park',
    address: 'Central Park, New York, NY 10024',
    latitude: 40.7829,
    longitude: -73.9654,
    place_types: ['park', 'tourist_attraction', 'establishment'],
    post_count: 0
  }
];

// Seed functions
async function getOrCreateTestUser() {
  console.log('Getting or creating test user...');

  // Try to sign in first
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD
  });

  if (signInData?.user) {
    console.log('Test user exists:', signInData.user.id);
    return signInData.user;
  }

  // Create user if doesn't exist
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD
  });

  if (signUpError) {
    console.error('Error creating test user:', signUpError);
    return null;
  }

  console.log('Created test user:', signUpData.user?.id);
  return signUpData.user;
}

async function seedLocations() {
  console.log('Seeding locations...');

  const locationIds: string[] = [];

  for (const location of testLocations) {
    // Check if location already exists
    const { data: existing } = await supabase
      .from('locations')
      .select('id')
      .eq('google_place_id', location.google_place_id)
      .single();

    if (existing) {
      console.log(`Location already exists: ${location.name}`);
      locationIds.push(existing.id);
      continue;
    }

    const { data, error } = await supabase
      .from('locations')
      .insert(location)
      .select('id')
      .single();

    if (error) {
      console.error(`Error creating location ${location.name}:`, error);
    } else {
      console.log(`Created location: ${location.name}`);
      locationIds.push(data.id);
    }
  }

  return locationIds;
}

async function seedProfiles() {
  console.log('Seeding additional test profiles...');

  // Get all auth users to create profiles for
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .limit(10);

  console.log('Existing profiles:', profiles?.length || 0);

  // Update test user profile with avatar
  const testUser = await getOrCreateTestUser();
  if (testUser) {
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: 'Test User',
        own_avatar: avatarConfigs.casualMale,
        avatar_config: avatarConfigs.casualMale
      })
      .eq('id', testUser.id);

    if (error) {
      console.error('Error updating test user profile:', error);
    } else {
      console.log('Updated test user profile with avatar');
    }
  }

  return profiles;
}

async function seedPosts(locationIds: string[], userId: string) {
  console.log('Seeding test posts...');

  const testPosts = [
    {
      location_id: locationIds[0], // Coffee shop
      selfie_url: 'https://example.com/selfie1.jpg',
      target_avatar: avatarConfigs.femaleWithGlasses,
      message: 'You were reading a really interesting book at the coffee shop. I wanted to ask what it was!',
      sighting_date: new Date().toISOString(),
      time_granularity: 'morning'
    },
    {
      location_id: locationIds[1], // Gym
      selfie_url: 'https://example.com/selfie2.jpg',
      target_avatar: avatarConfigs.athleticFemale,
      message: 'We were working out at the same time. You have amazing dedication!',
      sighting_date: new Date().toISOString(),
      time_granularity: 'afternoon'
    },
    {
      location_id: locationIds[2], // Bookstore
      selfie_url: 'https://example.com/selfie3.jpg',
      target_avatar: avatarConfigs.maleWithBeard,
      message: 'You recommended a great sci-fi book to me. Thank you!',
      sighting_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'evening'
    },
    {
      location_id: locationIds[3], // Bar
      selfie_url: 'https://example.com/selfie4.jpg',
      target_avatar: avatarConfigs.casualMale,
      message: 'We had a great conversation about music. Would love to continue!',
      sighting_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'evening'
    },
    {
      location_id: locationIds[4], // Park
      selfie_url: 'https://example.com/selfie5.jpg',
      target_avatar: avatarConfigs.femaleWithGlasses,
      message: 'Your dog is adorable! We should set up a playdate sometime.',
      sighting_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'morning'
    }
  ];

  const postIds: string[] = [];

  for (const post of testPosts) {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        ...post,
        producer_id: userId,
        is_active: true
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating post:', error);
    } else {
      console.log(`Created post at location ${post.location_id}`);
      postIds.push(data.id);
    }
  }

  return postIds;
}

async function seedFavoriteLocations(userId: string) {
  console.log('Seeding favorite locations...');

  const favorites = [
    {
      user_id: userId,
      custom_name: 'My Favorite Coffee Spot',
      place_name: 'Starbucks - Downtown',
      latitude: 40.7128,
      longitude: -74.0060
    },
    {
      user_id: userId,
      custom_name: 'Workout Place',
      place_name: 'Planet Fitness',
      latitude: 40.7589,
      longitude: -73.9851
    }
  ];

  for (const fav of favorites) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('favorite_locations')
      .select('id')
      .eq('user_id', userId)
      .eq('custom_name', fav.custom_name)
      .single();

    if (existing) {
      console.log(`Favorite already exists: ${fav.custom_name}`);
      continue;
    }

    const { error } = await supabase
      .from('favorite_locations')
      .insert(fav);

    if (error) {
      console.error(`Error creating favorite ${fav.custom_name}:`, error);
    } else {
      console.log(`Created favorite: ${fav.custom_name}`);
    }
  }
}

async function seedLocationVisits(userId: string, locationIds: string[]) {
  console.log('Seeding location visits...');

  // Create visits over the past week to build streaks
  for (let i = 0; i < 7; i++) {
    const visitDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);

    for (const locationId of locationIds.slice(0, 2)) { // Visit first 2 locations daily
      const { error } = await supabase
        .from('location_visits')
        .insert({
          user_id: userId,
          location_id: locationId,
          visited_at: visitDate.toISOString(),
          latitude: 40.7128 + (Math.random() * 0.01),
          longitude: -74.0060 + (Math.random() * 0.01)
        });

      if (error && !error.message.includes('duplicate')) {
        console.error('Error creating visit:', error);
      }
    }
  }

  console.log('Created location visits for streak testing');
}

async function seedNotificationPreferences(userId: string) {
  console.log('Seeding notification preferences...');

  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      match_notifications: true,
      message_notifications: true,
      spark_notifications: true
    });

  if (error) {
    console.error('Error creating notification preferences:', error);
  } else {
    console.log('Created notification preferences');
  }
}

async function seedConversations(postIds: string[], userId: string) {
  console.log('Seeding conversations...');

  // We need another user to create conversations
  // For now, we'll check if there are other users we can use
  const { data: otherProfiles } = await supabase
    .from('profiles')
    .select('id')
    .neq('id', userId)
    .limit(1);

  if (!otherProfiles || otherProfiles.length === 0) {
    console.log('No other users found for creating conversations');
    return [];
  }

  const otherUserId = otherProfiles[0].id;
  const conversationIds: string[] = [];

  // Create a conversation on the first post
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .insert({
      post_id: postIds[0],
      producer_id: userId,
      consumer_id: otherUserId,
      status: 'active',
      producer_accepted: true
    })
    .select('id')
    .single();

  if (convError) {
    if (!convError.message.includes('duplicate')) {
      console.error('Error creating conversation:', convError);
    }
    return conversationIds;
  }

  console.log('Created conversation:', conv.id);
  conversationIds.push(conv.id);

  // Add some messages
  const messages = [
    { sender_id: otherUserId, content: 'Hey! I think you might be describing me!' },
    { sender_id: userId, content: 'Oh wow, really? That would be amazing!' },
    { sender_id: otherUserId, content: 'Yes, I was definitely there at that time.' },
    { sender_id: userId, content: 'Great! Would you like to meet for coffee sometime?' }
  ];

  for (const msg of messages) {
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conv.id,
        sender_id: msg.sender_id,
        content: msg.content,
        is_read: true
      });

    if (error) {
      console.error('Error creating message:', error);
    }
  }

  console.log('Created test messages in conversation');

  return conversationIds;
}

async function seedEvents() {
  console.log('Seeding events...');

  const events = [
    {
      external_id: 'test_event_1',
      platform: 'eventbrite',
      title: 'Tech Meetup NYC',
      description: 'A gathering of tech enthusiasts in NYC',
      start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
      venue_name: 'Tech Hub NYC',
      venue_address: '100 Tech Street, New York, NY 10001',
      latitude: 40.7500,
      longitude: -73.9900
    },
    {
      external_id: 'test_event_2',
      platform: 'meetup',
      title: 'Hiking Group Meetup',
      description: 'Weekend hiking adventure',
      start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(),
      venue_name: 'Central Park',
      venue_address: 'Central Park, New York, NY 10024',
      latitude: 40.7829,
      longitude: -73.9654
    }
  ];

  for (const event of events) {
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('external_id', event.external_id)
      .single();

    if (existing) {
      console.log(`Event already exists: ${event.title}`);
      continue;
    }

    const { error } = await supabase
      .from('events')
      .insert(event);

    if (error) {
      console.error(`Error creating event ${event.title}:`, error);
    } else {
      console.log(`Created event: ${event.title}`);
    }
  }
}

async function seedTermsAcceptance(userId: string) {
  console.log('Seeding terms acceptance...');

  const { error } = await supabase
    .from('terms_accepted')
    .upsert({
      user_id: userId,
      terms_version: '1.0',
      accepted_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error creating terms acceptance:', error);
  } else {
    console.log('Created terms acceptance');
  }
}

// Main seeding function
async function main() {
  console.log('=== Starting E2E Data Seeding ===\n');

  try {
    // Get or create test user
    const testUser = await getOrCreateTestUser();
    if (!testUser) {
      console.error('Failed to get test user');
      return;
    }

    // Seed locations
    const locationIds = await seedLocations();

    // Seed profiles
    await seedProfiles();

    // Seed posts
    const postIds = await seedPosts(locationIds, testUser.id);

    // Seed favorite locations
    await seedFavoriteLocations(testUser.id);

    // Seed location visits for streaks
    await seedLocationVisits(testUser.id, locationIds);

    // Seed notification preferences
    await seedNotificationPreferences(testUser.id);

    // Seed conversations and messages
    await seedConversations(postIds, testUser.id);

    // Seed events
    await seedEvents();

    // Seed terms acceptance
    await seedTermsAcceptance(testUser.id);

    console.log('\n=== E2E Data Seeding Complete ===');
    console.log(`Test user: ${TEST_USER_EMAIL}`);
    console.log(`Password: ${TEST_USER_PASSWORD}`);
    console.log(`Created ${locationIds.length} locations`);
    console.log(`Created ${postIds.length} posts`);

  } catch (error) {
    console.error('Seeding failed:', error);
  }
}

main();
