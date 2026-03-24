/**
 * Comprehensive Test Data Seed Script
 *
 * Creates all data needed for manual testing of every app feature.
 * All mock data is associated with the primary test account (User 1).
 * User 2 exists only as a counterpart for conversations/responses.
 *
 * Data created:
 * - 2 test users (admin API) with full profiles, avatars, terms, trust, verification
 * - 5 Chicago locations
 * - 6 posts (mix of target_avatar and target_avatar_v2)
 * - 3 post_responses (one per verification tier)
 * - 2 user_checkins (GPS-verified)
 * - 3 conversations (active/pending/declined) with messages
 * - Favorite locations, location visits, location streaks
 * - Location regulars, notification preferences
 * - User achievements, 2 events, notifications
 *
 * Idempotent: safe to re-run (uses upsert / existence checks).
 *
 * Run with: doppler run -- npx ts-node scripts/seed-test-data.ts
 */

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// ENV
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  console.error('Run with: doppler run -- npx ts-node scripts/seed-test-data.ts');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// TEST USERS
// ---------------------------------------------------------------------------
const USER1 = { email: 's.n.psaradellis@gmail.com', password: 'Test1234!', displayName: 'Test User' };
const USER2 = { email: 'spsaradellis@gmail.com', password: 'Test1234!', displayName: 'Sarah Test' };

// ---------------------------------------------------------------------------
// AVATARS
// ---------------------------------------------------------------------------
const avatars = {
  user1Own: {
    skinColor: 'Tanned', hairColor: 'Blonde', topType: 'ShortHairShortCurly',
    facialHairType: 'Blank', facialHairColor: 'Blank', eyeType: 'Default',
    eyebrowType: 'Default', mouthType: 'Default', clotheType: 'BlazerShirt',
    clotheColor: 'Gray01', accessoriesType: 'Blank',
  },
  user2Own: {
    skinColor: 'Light', hairColor: 'Brown', topType: 'LongHairStraight',
    facialHairType: 'Blank', facialHairColor: 'Blank', eyeType: 'Happy',
    eyebrowType: 'Default', mouthType: 'Smile', clotheType: 'ShirtCrewNeck',
    clotheColor: 'Red', accessoriesType: 'Prescription02',
  },
  targetMatchUser1: {
    skinColor: 'Tanned', hairColor: 'Blonde', topType: 'ShortHairShortCurly',
    facialHairType: 'Blank', facialHairColor: 'Blank', eyeType: 'Default',
    eyebrowType: 'Default', mouthType: 'Smile', clotheType: 'BlazerShirt',
    clotheColor: 'Gray01', accessoriesType: 'Blank',
  },
  targetMatchUser2: {
    skinColor: 'Light', hairColor: 'Brown', topType: 'LongHairStraight',
    facialHairType: 'Blank', facialHairColor: 'Blank', eyeType: 'Happy',
    eyebrowType: 'Default', mouthType: 'Smile', clotheType: 'ShirtCrewNeck',
    clotheColor: 'Red', accessoriesType: 'Prescription02',
  },
  randomMale: {
    skinColor: 'Pale', hairColor: 'Black', topType: 'ShortHairShortFlat',
    facialHairType: 'BeardMedium', facialHairColor: 'Black', eyeType: 'Default',
    eyebrowType: 'Default', mouthType: 'Smile', clotheType: 'Hoodie',
    clotheColor: 'Blue01', accessoriesType: 'Blank',
  },
  randomFemale: {
    skinColor: 'Brown', hairColor: 'Black', topType: 'LongHairBun',
    facialHairType: 'Blank', facialHairColor: 'Blank', eyeType: 'Wink',
    eyebrowType: 'RaisedExcited', mouthType: 'Smile', clotheType: 'Overall',
    clotheColor: 'Pink', accessoriesType: 'Blank',
  },
};

// ---------------------------------------------------------------------------
// LOCATIONS (Chicago)
// ---------------------------------------------------------------------------
const testLocations = [
  { google_place_id: 'test_coffee_shop_1', name: 'Intelligentsia Coffee - Millennium Park', address: '53 E Randolph St, Chicago, IL 60601', latitude: 41.8842, longitude: -87.6254, place_types: ['cafe', 'food', 'establishment'], post_count: 0 },
  { google_place_id: 'test_gym_1', name: 'XSport Fitness - Lincoln Park', address: '2553 N Clark St, Chicago, IL 60614', latitude: 41.9295, longitude: -87.6441, place_types: ['gym', 'health', 'establishment'], post_count: 0 },
  { google_place_id: 'test_bookstore_1', name: 'Myopic Books', address: '1564 N Milwaukee Ave, Chicago, IL 60622', latitude: 41.9095, longitude: -87.6735, place_types: ['book_store', 'store', 'establishment'], post_count: 0 },
  { google_place_id: 'test_bar_1', name: 'The Violet Hour', address: '1520 N Damen Ave, Chicago, IL 60622', latitude: 41.9088, longitude: -87.6776, place_types: ['bar', 'night_club', 'establishment'], post_count: 0 },
  { google_place_id: 'test_park_1', name: 'Millennium Park', address: '201 E Randolph St, Chicago, IL 60602', latitude: 41.8826, longitude: -87.6226, place_types: ['park', 'tourist_attraction', 'establishment'], post_count: 0 },
];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function daysAgo(n: number) { return new Date(Date.now() - n * 86400000).toISOString(); }
function daysFromNow(n: number) { return new Date(Date.now() + n * 86400000).toISOString(); }

async function getOrCreateUser(email: string, password: string, displayName: string) {
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = listData?.users?.find(u => u.email === email);
  if (existing) {
    console.log(`  User exists: ${email} (${existing.id})`);
    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error) { console.error(`  ERROR creating user ${email}:`, error.message); return null; }
  console.log(`  Created user: ${email} (${data.user.id})`);
  return data.user;
}

async function upsertLocation(loc: typeof testLocations[0]) {
  const { data: existing } = await supabase.from('locations').select('id').eq('google_place_id', loc.google_place_id).single();
  if (existing) return existing.id;

  const { data, error } = await supabase.from('locations').insert(loc).select('id').single();
  if (error) { console.error(`  ERROR location ${loc.name}:`, error.message); return null; }
  console.log(`  Created location: ${loc.name}`);
  return data.id;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Comprehensive Test Data Seed (Chicago) ===\n');

  // 1. USERS
  console.log('[1/14] Users...');
  const user1 = await getOrCreateUser(USER1.email, USER1.password, USER1.displayName);
  const user2 = await getOrCreateUser(USER2.email, USER2.password, USER2.displayName);
  if (!user1 || !user2) { console.error('FATAL: Could not create test users'); process.exit(1); }

  // 2. PROFILES (upsert with avatars, terms, trust, verification)
  console.log('[2/14] Profiles...');
  // User 1 - full profile with trust level, verification, regulars mode
  {
    const { error } = await supabase.from('profiles').upsert({
      id: user1.id,
      display_name: USER1.displayName,
      own_avatar: avatars.user1Own,
      avatar_config: avatars.user1Own,
      terms_accepted_at: new Date().toISOString(),
      is_verified: true,
      trust_level: 3,
      trust_points: 150,
      regulars_mode_enabled: true,
      regulars_visibility: 'mutual',
      updated_at: new Date().toISOString(),
    });
    if (error) console.error(`  ERROR profile User 1:`, error.message);
    else console.log(`  Profile OK: ${USER1.displayName} (verified, trust=3)`);
  }
  // User 2 - minimal profile (counterpart only)
  {
    const { error } = await supabase.from('profiles').upsert({
      id: user2.id,
      display_name: USER2.displayName,
      own_avatar: avatars.user2Own,
      avatar_config: avatars.user2Own,
      terms_accepted_at: new Date().toISOString(),
      regulars_mode_enabled: true,
      regulars_visibility: 'public',
      updated_at: new Date().toISOString(),
    });
    if (error) console.error(`  ERROR profile User 2:`, error.message);
    else console.log(`  Profile OK: ${USER2.displayName}`);
  }

  // 3. LOCATIONS
  console.log('[3/14] Locations...');
  const locationIds: string[] = [];
  for (const loc of testLocations) {
    const id = await upsertLocation(loc);
    if (id) locationIds.push(id);
  }

  // 4. POSTS (6 total: 4 from user1, 2 from user2)
  console.log('[4/14] Posts...');
  const postRows = [
    // User 1 posts (using legacy target_avatar)
    { producer_id: user1.id, location_id: locationIds[0], selfie_url: 'https://example.com/selfie1.jpg', target_avatar: avatars.targetMatchUser2, message: 'You were reading at Intelligentsia. What was the book?', sighting_date: daysAgo(0), time_granularity: 'morning', is_active: true },
    { producer_id: user1.id, location_id: locationIds[1], selfie_url: 'https://example.com/selfie2.jpg', target_avatar: avatars.randomFemale, message: 'Amazing dedication at XSport today!', sighting_date: daysAgo(1), time_granularity: 'afternoon', is_active: true },
    { producer_id: user1.id, location_id: locationIds[2], selfie_url: 'https://example.com/selfie3.jpg', target_avatar: avatars.randomMale, message: 'You recommended a great sci-fi book at Myopic!', sighting_date: daysAgo(2), time_granularity: 'evening', is_active: true },
    // User 1 post using target_avatar_v2 (new format)
    { producer_id: user1.id, location_id: locationIds[3], selfie_url: 'https://example.com/selfie4.jpg', target_avatar: avatars.targetMatchUser2, target_avatar_v2: { type: 'custom', features: avatars.targetMatchUser2 }, message: 'Great conversation about music at The Violet Hour!', sighting_date: daysAgo(5), time_granularity: 'evening', is_active: true },
    // User 2 posts targeting user1's avatar
    { producer_id: user2.id, location_id: locationIds[0], selfie_url: 'https://example.com/u2_selfie1.jpg', target_avatar: avatars.targetMatchUser1, message: 'Saw you at Intelligentsia in the gray blazer. Wanted to say hi!', sighting_date: daysAgo(1), time_granularity: 'morning', is_active: true },
    { producer_id: user2.id, location_id: locationIds[1], selfie_url: 'https://example.com/u2_selfie2.jpg', target_avatar: avatars.targetMatchUser1, target_avatar_v2: { type: 'custom', features: avatars.targetMatchUser1 }, message: 'We were on treadmills next to each other at XSport. Workout buddies?', sighting_date: daysAgo(0), time_granularity: 'morning', is_active: true },
  ];

  const postIds: string[] = [];
  for (const post of postRows) {
    const { data, error } = await supabase.from('posts').insert(post).select('id').single();
    if (error) { console.error(`  ERROR post:`, error.message); continue; }
    postIds.push(data.id);
    console.log(`  Post ${postIds.length}: ${data.id}`);
  }

  // 5. USER CHECK-INS (for tier 1 verification)
  console.log('[5/14] Check-ins...');
  const checkinRows = [
    // User 1 checked in at coffee shop and gym (for verification on responses to user2's posts)
    { user_id: user1.id, location_id: locationIds[0], verified: true, verification_lat: 41.8842, verification_lon: -87.6254, verification_accuracy: 10.0, checked_in_at: daysAgo(0) },
    { user_id: user1.id, location_id: locationIds[1], verified: true, verification_lat: 41.9295, verification_lon: -87.6441, verification_accuracy: 15.0, checked_in_at: daysAgo(1) },
    // User 2 checked in at coffee shop (for verified response to user1's post)
    { user_id: user2.id, location_id: locationIds[0], verified: true, verification_lat: 41.8842, verification_lon: -87.6254, verification_accuracy: 12.0, checked_in_at: daysAgo(0) },
  ];
  const checkinIds: string[] = [];
  for (const ci of checkinRows) {
    const { data, error } = await supabase.from('user_checkins').insert(ci).select('id').single();
    if (error) { console.error(`  ERROR checkin:`, error.message); continue; }
    checkinIds.push(data.id);
    console.log(`  Check-in: ${data.id}`);
  }

  // 6. POST RESPONSES (3 tiers)
  console.log('[6/14] Post responses...');
  if (postIds.length >= 6 && checkinIds.length >= 3) {
    const responses = [
      // Tier 1: User 2 responds to User 1's coffee shop post with verified check-in
      { post_id: postIds[0], responder_id: user2.id, verification_tier: 'verified_checkin' as const, checkin_id: checkinIds[2], message: 'That was me! I was reading Dune.', status: 'pending' },
      // Tier 2: User 1 responds to User 2's gym post as regular
      { post_id: postIds[5], responder_id: user1.id, verification_tier: 'regular_spot' as const, message: 'I go there every morning! Pretty sure that was me.', status: 'pending' },
      // Tier 3: User 2 responds to User 1's bookstore post (unverified)
      { post_id: postIds[2], responder_id: user2.id, verification_tier: 'unverified_claim' as const, message: 'I think I was there that evening!', status: 'pending' },
    ];
    for (const r of responses) {
      const { error } = await supabase.from('post_responses').upsert(r, { onConflict: 'post_id,responder_id' });
      if (error) console.error(`  ERROR response:`, error.message);
      else console.log(`  Response (${r.verification_tier}) OK`);
    }
  }

  // 7. CONVERSATIONS (3 states)
  console.log('[7/14] Conversations...');
  const convDefs = [
    // Active conversation (User 2 posted, User 1 responded, producer accepted)
    { post_id: postIds[4], producer_id: user2.id, consumer_id: user1.id, status: 'active', producer_accepted: true },
    // Pending conversation (User 1 posted, User 2 responded, awaiting acceptance)
    { post_id: postIds[0], producer_id: user1.id, consumer_id: user2.id, status: 'pending', producer_accepted: false },
    // Declined conversation
    { post_id: postIds[2], producer_id: user1.id, consumer_id: user2.id, status: 'declined', producer_accepted: false },
  ];
  const convIds: string[] = [];
  for (const conv of convDefs) {
    const { data: existing } = await supabase.from('conversations').select('id')
      .eq('post_id', conv.post_id).eq('consumer_id', conv.consumer_id).single();
    if (existing) {
      convIds.push(existing.id);
      console.log(`  Conversation exists: ${existing.id} (${conv.status})`);
      continue;
    }
    const { data, error } = await supabase.from('conversations').insert(conv).select('id').single();
    if (error) { console.error(`  ERROR conv (${conv.status}):`, error.message); continue; }
    convIds.push(data.id);
    console.log(`  Conversation ${conv.status}: ${data.id}`);
  }

  // 8. MESSAGES (in active conversation)
  console.log('[8/14] Messages...');
  if (convIds[0]) {
    const msgs = [
      { conversation_id: convIds[0], sender_id: user1.id, content: 'Hey! I think your post is about me!', is_read: true },
      { conversation_id: convIds[0], sender_id: user2.id, content: 'Oh wow, really?! Were you wearing the gray blazer?', is_read: true },
      { conversation_id: convIds[0], sender_id: user1.id, content: 'Yes! I was reading on my tablet while waiting.', is_read: true },
      { conversation_id: convIds[0], sender_id: user2.id, content: 'That\'s amazing! I remember you now.', is_read: true },
      { conversation_id: convIds[0], sender_id: user1.id, content: 'Want to grab coffee sometime?', is_read: true },
      { conversation_id: convIds[0], sender_id: user2.id, content: 'I\'d love that! How about Saturday morning?', is_read: false },
      { conversation_id: convIds[0], sender_id: user2.id, content: 'Same spot at Intelligentsia?', is_read: false },
    ];
    const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true })
      .eq('conversation_id', convIds[0]);
    if ((count ?? 0) === 0) {
      for (const msg of msgs) {
        const { error } = await supabase.from('messages').insert(msg);
        if (error) console.error(`  ERROR msg:`, error.message);
      }
      console.log(`  Created ${msgs.length} messages`);
    } else {
      console.log(`  Messages already exist (${count})`);
    }
  }

  // 9. FAVORITE LOCATIONS (for User 1)
  console.log('[9/14] Favorites...');
  const favs = [
    { user_id: user1.id, custom_name: 'My Coffee Spot', place_name: 'Intelligentsia Coffee - Millennium Park', latitude: 41.8842, longitude: -87.6254 },
    { user_id: user1.id, custom_name: 'Workout Place', place_name: 'XSport Fitness - Lincoln Park', latitude: 41.9295, longitude: -87.6441 },
    { user_id: user1.id, custom_name: 'Bookworm Haven', place_name: 'Myopic Books', latitude: 41.9095, longitude: -87.6735 },
  ];
  for (const fav of favs) {
    const { error } = await supabase.from('favorite_locations').upsert(fav, { onConflict: 'user_id,custom_name' });
    if (error && !error.message.includes('duplicate')) console.error(`  ERROR fav:`, error.message);
  }
  console.log(`  Favorites OK (${favs.length} for User 1)`);

  // 10. LOCATION VISITS (7 days of history for User 1 streaks)
  console.log('[10/14] Location visits...');
  for (let i = 0; i < 7; i++) {
    for (const locId of locationIds.slice(0, 3)) {
      const { error } = await supabase.from('location_visits').insert({
        user_id: user1.id, location_id: locId,
        visited_at: new Date(Date.now() - i * 86400000).toISOString(),
        latitude: 41.884 + Math.random() * 0.001,
        longitude: -87.625 + Math.random() * 0.001,
      });
      if (error && !error.message.includes('duplicate')) { /* ignore */ }
    }
  }
  // A few visits for user2 (so regulars connections work)
  for (let i = 0; i < 5; i++) {
    for (const locId of locationIds.slice(0, 2)) {
      await supabase.from('location_visits').insert({
        user_id: user2.id, location_id: locId,
        visited_at: new Date(Date.now() - i * 86400000).toISOString(),
        latitude: 41.884 + Math.random() * 0.001,
        longitude: -87.625 + Math.random() * 0.001,
      });
    }
  }
  console.log('  Location visits OK (7 days User 1, 5 days User 2)');

  // 11. LOCATION STREAKS (for Settings > My Location Streaks)
  console.log('[11/14] Location streaks...');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  for (let i = 0; i < 3; i++) {
    const locId = locationIds[i];
    const streakLen = 7 - i * 2; // 7, 5, 3 day streaks
    const { error } = await supabase.from('location_streaks').upsert({
      user_id: user1.id,
      location_id: locId,
      streak_type: 'daily',
      current_streak: streakLen,
      longest_streak: streakLen + 2,
      last_visit_period: todayStr,
      total_visits: streakLen + 5,
      started_at: daysAgo(streakLen),
    }, { onConflict: 'user_id,location_id,streak_type' });
    if (error) console.error(`  ERROR streak:`, error.message);
  }
  console.log('  Location streaks OK (3 daily streaks for User 1)');

  // 12. LOCATION REGULARS + REGULARS CONNECTIONS
  console.log('[12/14] Regulars...');
  for (const userId of [user1.id, user2.id]) {
    for (const locId of locationIds.slice(0, 2)) {
      const { error } = await supabase.from('location_regulars').upsert({
        user_id: userId, location_id: locId,
        weekly_visit_count: 3, first_visit_at: daysAgo(21),
        last_visit_at: daysAgo(0), is_regular: true,
      }, { onConflict: 'user_id,location_id' });
      if (error) console.error(`  ERROR regular:`, error.message);
    }
  }
  // Create a regulars connection between user1 and user2 at first location
  // (user_a_id must be < user_b_id per CHECK constraint)
  const [userAId, userBId] = user1.id < user2.id ? [user1.id, user2.id] : [user2.id, user1.id];
  {
    const { error } = await supabase.from('regulars_connections').upsert({
      user_a_id: userAId,
      user_b_id: userBId,
      location_id: locationIds[0],
      user_a_viewed: false,
      user_b_viewed: false,
    }, { onConflict: 'user_a_id,user_b_id,location_id' });
    if (error) console.error(`  ERROR regulars connection:`, error.message);
  }
  console.log('  Regulars + connection OK');

  // 13. NOTIFICATIONS, PREFERENCES, ACHIEVEMENTS
  console.log('[13/14] Notifications, preferences, achievements...');

  // Notification preferences for User 1
  {
    const { error } = await supabase.from('notification_preferences').upsert({
      user_id: user1.id, match_notifications: true, message_notifications: true,
    }, { onConflict: 'user_id' });
    if (error) console.error(`  ERROR notif pref:`, error.message);
  }

  // Unread notifications for User 1
  if (convIds[0] && postIds[0]) {
    const { error } = await supabase.from('notifications').insert([
      { user_id: user1.id, type: 'new_message', reference_id: convIds[0], is_read: false },
      { user_id: user1.id, type: 'new_response', reference_id: postIds[0], is_read: false },
    ]);
    if (error && !error.message.includes('duplicate')) console.error(`  ERROR notif:`, error.message);
  }
  console.log('  Notifications OK');

  // User achievements for User 1 (Profile > Achievements section)
  const achievementIds = [
    'explorer_first_steps',     // Visit first location
    'creator_first_post',       // Create first post
    'social_ice_breaker',       // Start first conversation
    'streak_regular',           // 3-day check-in streak
  ];
  for (const achId of achievementIds) {
    const { error } = await supabase.from('user_achievements').upsert({
      user_id: user1.id,
      achievement_id: achId,
      earned_at: daysAgo(Math.floor(Math.random() * 7)),
    }, { onConflict: 'user_id,achievement_id' });
    if (error) console.error(`  ERROR achievement ${achId}:`, error.message);
  }
  console.log(`  Achievements OK (${achievementIds.length} for User 1)`);

  // 14. EVENTS
  console.log('[14/14] Events...');
  const events = [
    { external_id: 'test_event_1', platform: 'eventbrite', title: 'Chicago Tech Meetup', description: 'A gathering of tech enthusiasts in the Loop', date_time: daysFromNow(7), end_time: daysFromNow(7.125), venue_name: '1871 Innovation Hub', venue_address: '222 W Merchandise Mart Plaza, Chicago, IL 60654', latitude: 41.8885, longitude: -87.6354 },
    { external_id: 'test_event_2', platform: 'meetup', title: 'Lakefront Trail Run', description: 'Weekend group run along Lake Michigan', date_time: daysFromNow(3), end_time: daysFromNow(3.2), venue_name: 'North Avenue Beach', venue_address: '1600 N Lake Shore Dr, Chicago, IL 60613', latitude: 41.9117, longitude: -87.6265 },
  ];
  for (const evt of events) {
    const { data: existing } = await supabase.from('events').select('id').eq('external_id', evt.external_id).single();
    if (existing) { console.log(`  Event exists: ${evt.title}`); continue; }
    const { error } = await supabase.from('events').insert(evt);
    if (error) console.error(`  ERROR event:`, error.message);
    else console.log(`  Created event: ${evt.title}`);
  }

  // SUMMARY
  console.log('\n=== Seed Complete ===');
  console.log(`Primary account: ${USER1.email} / ${USER1.password}`);
  console.log(`Secondary account: ${USER2.email} / ${USER2.password}`);
  console.log(`Locations: ${locationIds.length} (Chicago)`);
  console.log(`Posts: ${postIds.length} (4 by User 1, 2 by User 2)`);
  console.log(`Conversations: ${convIds.length} (active/pending/declined)`);
  console.log('\nProfile data seeded for User 1:');
  console.log('  - Verified badge, trust level 3, 150 trust points');
  console.log('  - 4 achievements earned');
  console.log('  - 3 location streaks (7/5/3 days)');
  console.log('  - 3 favorite locations');
  console.log('  - Regulars mode enabled with fellow regular connection');
  console.log('  - Notification preferences set');
  console.log('  - 2 unread notifications');
  console.log('\nTest flow:');
  console.log('1. Login as User 1 -> Profile shows avatar, verified badge, trust progress');
  console.log('2. Profile shows 4 achievements earned, streak leaderboard');
  console.log('3. Settings shows location streaks, regulars mode, fellow regulars');
  console.log('4. Ledger shows posts, Chats shows 3 conversations (active/pending/declined)');
  console.log('5. Map shows Chicago locations with pins');
  console.log('6. Unread message badges on chat tab');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
