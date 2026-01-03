/**
 * Clean up redundant user metadata to reduce JWT/session size
 *
 * Run with: doppler run -- node scripts/clean-user-metadata.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function cleanMetadata() {
  console.log('Cleaning up user metadata...\n');

  // Get all users
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error listing users:', error.message);
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const user of data.users) {
    const meta = user.user_metadata || {};

    // Check if cleanup is needed (has redundant fields)
    const hasRedundant = 'email' in meta ||
                         'sub' in meta ||
                         'email_verified' in meta ||
                         'phone_verified' in meta;

    if (hasRedundant) {
      // Keep only display_name
      const newMeta = meta.display_name ? { display_name: meta.display_name } : {};

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { user_metadata: newMeta }
      );

      if (updateError) {
        console.error('Error updating', user.email + ':', updateError.message);
      } else {
        console.log('Updated:', user.email);
        console.log('  Old:', JSON.stringify(meta));
        console.log('  New:', JSON.stringify(newMeta));
        console.log('');
        updated++;
      }
    } else {
      skipped++;
    }
  }

  console.log('Done!');
  console.log('  Updated:', updated);
  console.log('  Skipped:', skipped);
}

cleanMetadata().catch(console.error);
