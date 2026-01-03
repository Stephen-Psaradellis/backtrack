/**
 * E2E Testing Data Seed Script
 * Run with: node scripts/seed-e2e-data.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hyidfsfvqlsimefixfhc.supabase.co';
const supabaseSecretKey = '***REMOVED***';

const supabase = createClient(supabaseUrl, supabaseSecretKey);

const TEST_USER_EMAIL = 's.n.psaradellis@gmail.com';
const TEST_USER_PASSWORD = 'Test1234!';

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

async function getOrCreateTestUser() {
  console.log('Getting or creating test user...');

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD
  });

  if (signInData?.user) {
    console.log('Test user exists:', signInData.user.id);
    return signInData.user;
  }

  console.log('Sign in error:', signInError?.message);
  return null;
}

async function seedLocations() {
  console.log('Seeding locations...');

  const locationIds = [];

  for (const location of testLocations) {
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
      console.error(`Error creating location ${location.name}:`, error.message);
    } else {
      console.log(`Created location: ${location.name}`);
      locationIds.push(data.id);
    }
  }

  return locationIds;
}

async function seedPosts(locationIds, userId) {
  console.log('Seeding test posts...');

  const testPosts = [
    {
      location_id: locationIds[0],
      selfie_url: 'https://example.com/selfie1.jpg',
      target_avatar: avatarConfigs.femaleWithGlasses,
      message: 'You were reading a really interesting book at the coffee shop. I wanted to ask what it was!',
      sighting_date: new Date().toISOString(),
      time_granularity: 'morning'
    },
    {
      location_id: locationIds[1],
      selfie_url: 'https://example.com/selfie2.jpg',
      target_avatar: avatarConfigs.athleticFemale,
      message: 'We were working out at the same time. You have amazing dedication!',
      sighting_date: new Date().toISOString(),
      time_granularity: 'afternoon'
    },
    {
      location_id: locationIds[2],
      selfie_url: 'https://example.com/selfie3.jpg',
      target_avatar: avatarConfigs.maleWithBeard,
      message: 'You recommended a great sci-fi book to me. Thank you!',
      sighting_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'evening'
    },
    {
      location_id: locationIds[3],
      selfie_url: 'https://example.com/selfie4.jpg',
      target_avatar: avatarConfigs.casualMale,
      message: 'We had a great conversation about music. Would love to continue!',
      sighting_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'evening'
    },
    {
      location_id: locationIds[4],
      selfie_url: 'https://example.com/selfie5.jpg',
      target_avatar: avatarConfigs.femaleWithGlasses,
      message: 'Your dog is adorable! We should set up a playdate sometime.',
      sighting_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      time_granularity: 'morning'
    }
  ];

  const postIds = [];

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
      console.error('Error creating post:', error.message);
    } else {
      console.log(`Created post at location`);
      postIds.push(data.id);
    }
  }

  return postIds;
}

async function seedFavoriteLocations(userId) {
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
      console.error(`Error creating favorite ${fav.custom_name}:`, error.message);
    } else {
      console.log(`Created favorite: ${fav.custom_name}`);
    }
  }
}

async function updateProfileWithAvatar(userId) {
  console.log('Updating profile with avatar...');

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: 'Test User',
      own_avatar: avatarConfigs.casualMale,
      avatar_config: avatarConfigs.casualMale
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile:', error.message);
  } else {
    console.log('Updated profile with avatar');
  }
}

async function seedNotificationPreferences(userId) {
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
    console.error('Error creating notification preferences:', error.message);
  } else {
    console.log('Created notification preferences');
  }
}

async function seedTermsAcceptance(userId) {
  console.log('Seeding terms acceptance...');

  const { error } = await supabase
    .from('terms_accepted')
    .upsert({
      user_id: userId,
      terms_version: '1.0',
      accepted_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error creating terms acceptance:', error.message);
  } else {
    console.log('Created terms acceptance');
  }
}

async function main() {
  console.log('=== Starting E2E Data Seeding ===\n');

  try {
    const testUser = await getOrCreateTestUser();
    if (!testUser) {
      console.error('Failed to get test user');
      return;
    }

    const locationIds = await seedLocations();
    await updateProfileWithAvatar(testUser.id);
    const postIds = await seedPosts(locationIds, testUser.id);
    await seedFavoriteLocations(testUser.id);
    await seedNotificationPreferences(testUser.id);
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
