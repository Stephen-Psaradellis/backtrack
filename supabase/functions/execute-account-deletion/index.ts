/**
 * Supabase Edge Function: execute-account-deletion
 *
 * Runs via pg_cron daily at 3:30 AM UTC.
 * Processes scheduled account deletions that have passed their grace period.
 *
 * For each pending deletion:
 * 1. Calls delete_user_account() RPC to remove all user data
 * 2. Calls supabase.auth.admin.deleteUser() to remove auth.users record
 * 3. Updates scheduled_account_deletions with execution timestamp
 *
 * Uses service role key since this is a cron job (no user JWT).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface PendingDeletion {
  id: string
  user_id: string
  scheduled_for: string
  reason: string | null
}

Deno.serve(async (req) => {
  // Only allow POST (from pg_cron or manual trigger)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verify authorization - must be service role or contain valid secret
  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')

  if (cronSecret) {
    const providedSecret = req.headers.get('x-cron-secret')
    if (providedSecret !== cronSecret && authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const results: { userId: string; success: boolean; error?: string }[] = []

  try {
    // Find all pending deletions past their scheduled time
    const { data: pendingDeletions, error: queryError } = await supabase
      .from('scheduled_account_deletions')
      .select('id, user_id, scheduled_for, reason')
      .lt('scheduled_for', new Date().toISOString())
      .is('executed_at', null)
      .is('cancelled_at', null)

    if (queryError) {
      console.error('Failed to query pending deletions:', queryError.message)
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!pendingDeletions || pendingDeletions.length === 0) {
      console.log('No pending deletions to process')
      return new Response(JSON.stringify({ processed: 0, results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`Processing ${pendingDeletions.length} pending deletion(s)`)

    for (const deletion of pendingDeletions as PendingDeletion[]) {
      const { id: deletionId, user_id: userId } = deletion

      try {
        // Step 1: Delete all user data via RPC
        // The function uses SECURITY DEFINER and accepts service_role
        const { error: rpcError } = await supabase.rpc('delete_user_account', {
          target_user_id: userId,
        })

        if (rpcError) {
          console.error(`Failed to delete data for user ${userId}:`, rpcError.message)
          results.push({ userId, success: false, error: `Data deletion failed: ${rpcError.message}` })
          continue
        }

        // Step 2: Delete auth.users record
        const { error: authError } = await supabase.auth.admin.deleteUser(userId)

        if (authError) {
          console.error(`Failed to delete auth record for user ${userId}:`, authError.message)
          // Data is deleted but auth record remains - mark partial completion
          await supabase
            .from('scheduled_account_deletions')
            .update({ executed_at: new Date().toISOString() })
            .eq('id', deletionId)

          results.push({ userId, success: false, error: `Auth deletion failed: ${authError.message}` })
          continue
        }

        // Step 3: Mark deletion as fully executed with auth deletion timestamp
        await supabase
          .from('scheduled_account_deletions')
          .update({
            executed_at: new Date().toISOString(),
            auth_deleted_at: new Date().toISOString(),
          })
          .eq('id', deletionId)

        console.log(`Successfully deleted user ${userId}`)
        results.push({ userId, success: true })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error(`Error processing deletion for user ${userId}:`, errorMessage)
        results.push({ userId, success: false, error: errorMessage })
        // Continue with next deletion
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('Fatal error in execute-account-deletion:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const succeeded = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length
  console.log(`Completed: ${succeeded} succeeded, ${failed} failed`)

  return new Response(
    JSON.stringify({ processed: results.length, succeeded, failed, results }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
