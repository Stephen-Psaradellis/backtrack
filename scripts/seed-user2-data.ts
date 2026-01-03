/**
 * Second User Test Data Seed Script
 *
 * Creates a second test user and sets up user-to-user test scenarios:
 * - Second test user with profile and avatar
 * - Posts from User 2 that match User 1's avatar (for matching tests)
 * - Conversations between User 1 and User 2
 * - Messages for testing chat functionality
 * - Notifications for testing notification flows
 *
 * Run with: npx ts-node scripts/seed-user2-data.ts
 */

import { createClient } from '@supabase/supabase-js';

// Use environment variables or fallback values
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hyidfsfvqlsimefixfhc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test user accounts
const TEST_USER_1 = {
  email: 's.n.psaradellis@gmail.com',
  password: 'Test1234!',
  displayName: 'Test User'
};

const TEST_USER_2 = {
  email: 'spsaradellis@gmail.com',
  password: 'Test1234!',
  displayName: 'Sarah Test'
};

// Avatar configurations
const avatarConfigs = {
  // User 1's own avatar (what they look like)
  user1Avatar: {
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
  // User 2's own avatar (what they look like)
  user2Avatar: {
    skinColor: 'Light',
    hairColor: 'Brown',
    topType: 'LongHairStraight',
    facialHairType: 'Blank',
    facialHairColor: 'Blank',
    eyeType: 'Happy',
    eyebrowType: 'Default',
    mouthType: 'Smile',
    clotheType: 'ShirtCrewNeck',
    clotheColor: 'Red',
    accessoriesType: 'Prescription02'
  },
  // Target avatar that matches User 1 (for User 2's posts)
  targetMatchingUser1: {
    skinColor: 'Tanned',
    hairColor: 'Blonde',
    topType: 'ShortHairShortCurly',
    facialHairType: 'Blank',
    facialHairColor: 'Blank',
    eyeType: 'Default',
    eyebrowType: 'Default',
    mouthType: 'Smile',
    clotheType: 'BlazerShirt',
    clotheColor: 'Gray01',
    accessoriesType: 'Blank'
  },
  // Target avatar that matches User 2 (for User 1's posts)
  targetMatchingUser2: {
    skinColor: 'Light',
    hairColor: 'Brown',
    topType: 'LongHairStraight',
    facialHairType: 'Blank',
    facialHairColor: 'Blank',
    eyeType: 'Happy',
    eyebrowType: 'Default',
    mouthType: 'Smile',
    clotheType: 'ShirtCrewNeck',
    clotheColor: 'Red',
    accessoriesType: 'Prescription02'
  }
};

async function getOrCreateUser(email: string, password: string, displayName: string) {
  console.log(`Getting or creating user: ${email}...`);

  // Try to find existing user by email
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  if (existingUser) {
    console.log(`User exists: ${existingUser.id}`);
    return existingUser;
  }

  // Create new user
  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email for testing
    user_metadata: { display_name: displayName }
  });

  if (error) {
    console.error(`Error creating user ${email}:`, error);
    return null;
  }

  console.log(`Created user: ${newUser.user.id}`);
  return newUser.user;
}

async function updateUserProfile(userId: string, displayName: string, ownAvatar: any, avatarConfig: any) {
  console.log(`Updating profile for user: ${userId}...`);

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      display_name: displayName,
      own_avatar: ownAvatar,
      avatar_config: avatarConfig,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error updating profile:', error);
    return false;
  }

  console.log('Profile updated successfully');
  return true;
}

async function getLocations() {
  const { data, error } = await supabase
    .from('locations')
    .select('id, name')
    .limit(5);

  if (error) {
    console.error('Error fetching locations:', error);
    return [];
  }

  return data || [];
}

async function createPostsForUser2(user2Id: string, locationIds: string[]) {
  console.log('Creating posts for User 2 that match User 1...');

  if (locationIds.length === 0) {
    console.log('No locations found, skipping posts');
    return [];
  }

  const posts = [
    {
      producer_id: user2Id,
      location_id: locationIds[0],
      selfie_url: 'https://example.com/user2_selfie1.jpg',
      target_avatar: avatarConfigs.targetMatchingUser1,
      message: 'Hey! I saw you at the coffee shop yesterday morning. You were wearing a gray blazer and had curly blonde hair. I wanted to say hi but you left before I could!',
      is_active: true
    },
    {
      producer_id: user2Id,
      location_id: locationIds[1] || locationIds[0],
      selfie_url: 'https://example.com/user2_selfie2.jpg',
      target_avatar: avatarConfigs.targetMatchingUser1,
      message: 'We were both at the gym this morning. You were on the treadmill next to me. Would love to be workout buddies!',
      is_active: true
    }
  ];

  const postIds: string[] = [];

  for (const post of posts) {
    const { data, error } = await supabase
      .from('posts')
      .insert(post)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating post:', error);
    } else {
      console.log(`Created post: ${data.id}`);
      postIds.push(data.id);
    }
  }

  return postIds;
}

async function createConversation(postId: string, producerId: string, consumerId: string, status: string = 'active') {
  console.log('Creating conversation...');

  // Check if conversation already exists
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('post_id', postId)
    .eq('consumer_id', consumerId)
    .single();

  if (existing) {
    console.log(`Conversation already exists: ${existing.id}`);
    return existing.id;
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      post_id: postId,
      producer_id: producerId,
      consumer_id: consumerId,
      status: status,
      producer_accepted: status === 'active'
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    return null;
  }

  console.log(`Created conversation: ${data.id}`);
  return data.id;
}

async function createMessages(conversationId: string, user1Id: string, user2Id: string) {
  console.log('Creating messages...');

  const messages = [
    { sender_id: user1Id, content: 'Hey! I think that post might be about me! I was definitely at the coffee shop yesterday.', is_read: true },
    { sender_id: user2Id, content: 'Oh wow, really?! Were you wearing the gray blazer?', is_read: true },
    { sender_id: user1Id, content: 'Yes! I was reading a book on my tablet while waiting for my order.', is_read: true },
    { sender_id: user2Id, content: "That's amazing! I remember you now. Would you like to grab coffee sometime?", is_read: false },
  ];

  for (const msg of messages) {
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: msg.sender_id,
        content: msg.content,
        is_read: msg.is_read
      });

    if (error) {
      console.error('Error creating message:', error);
    }
  }

  console.log('Created test messages');
}

async function createNotifications(userId: string, conversationId: string) {
  console.log('Creating notifications...');

  const notifications = [
    {
      user_id: userId,
      type: 'new_message',
      reference_id: conversationId,
      is_read: false
    }
  ];

  for (const notif of notifications) {
    const { error } = await supabase
      .from('notifications')
      .insert(notif);

    if (error && !error.message.includes('duplicate')) {
      console.error('Error creating notification:', error);
    }
  }

  console.log('Created notifications');
}

async function createFavoriteLocationsForUser2(user2Id: string) {
  console.log('Creating favorite locations for User 2...');

  const favorites = [
    {
      user_id: user2Id,
      custom_name: 'Morning Coffee Spot',
      place_name: 'Starbucks - Downtown',
      latitude: 40.7128,
      longitude: -74.0060
    },
    {
      user_id: user2Id,
      custom_name: 'My Gym',
      place_name: 'Planet Fitness',
      latitude: 40.7589,
      longitude: -73.9851
    }
  ];

  for (const fav of favorites) {
    const { error } = await supabase
      .from('favorite_locations')
      .upsert(fav, { onConflict: 'user_id,custom_name' });

    if (error) {
      console.error('Error creating favorite:', error);
    } else {
      console.log(`Created favorite: ${fav.custom_name}`);
    }
  }
}

async function createNotificationPreferences(userId: string) {
  console.log('Creating notification preferences...');

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

async function main() {
  console.log('=== Setting up User-to-User Test Scenarios ===\n');

  try {
    // Get or create both test users
    const user1 = await getOrCreateUser(TEST_USER_1.email, TEST_USER_1.password, TEST_USER_1.displayName);
    const user2 = await getOrCreateUser(TEST_USER_2.email, TEST_USER_2.password, TEST_USER_2.displayName);

    if (!user1 || !user2) {
      console.error('Failed to get/create test users');
      return;
    }

    console.log(`\nUser 1 ID: ${user1.id}`);
    console.log(`User 2 ID: ${user2.id}\n`);

    // Update profiles with avatars
    await updateUserProfile(user1.id, TEST_USER_1.displayName, avatarConfigs.user1Avatar, avatarConfigs.user1Avatar);
    await updateUserProfile(user2.id, TEST_USER_2.displayName, avatarConfigs.user2Avatar, avatarConfigs.user2Avatar);

    // Get existing locations
    const locations = await getLocations();
    const locationIds = locations.map(l => l.id);
    console.log(`Found ${locationIds.length} locations`);

    // Create posts from User 2 that match User 1's avatar
    const user2Posts = await createPostsForUser2(user2.id, locationIds);

    // Create favorite locations for User 2
    await createFavoriteLocationsForUser2(user2.id);

    // Create notification preferences for User 2
    await createNotificationPreferences(user2.id);

    // Create a conversation where User 1 responds to User 2's post
    if (user2Posts.length > 0) {
      const conversationId = await createConversation(user2Posts[0], user2.id, user1.id, 'active');

      if (conversationId) {
        // Add messages to the conversation
        await createMessages(conversationId, user1.id, user2.id);

        // Create notification for User 1 about new message
        await createNotifications(user1.id, conversationId);
      }
    }

    console.log('\n=== User-to-User Test Setup Complete ===');
    console.log('\n--- Test Accounts ---');
    console.log(`User 1: ${TEST_USER_1.email} / ${TEST_USER_1.password}`);
    console.log(`User 2: ${TEST_USER_2.email} / ${TEST_USER_2.password}`);
    console.log('\n--- Test Scenarios Created ---');
    console.log('1. User 2 has posts that match User 1\'s avatar');
    console.log('2. Active conversation between User 1 and User 2');
    console.log('3. Messages in conversation (some unread)');
    console.log('4. Notification for User 1 about new message');
    console.log('\n--- Testing Flow ---');
    console.log('1. Login as User 1, go to Ledger, find User 2\'s post');
    console.log('2. User 1 should match with the post\'s target avatar');
    console.log('3. Go to Chats to see the conversation with User 2');
    console.log('4. Send/receive messages between users');
    console.log('5. Login as User 2 to see the conversation from their side');

  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

main();
