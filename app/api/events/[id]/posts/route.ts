/**
 * Event Posts API Route
 *
 * Handles fetching and creating posts associated with a specific event.
 *
 * GET: Fetch posts linked to an event via event_posts table
 * POST: Create a new post and link it to the event
 *
 * Path Parameters:
 * - id: Event ID (database UUID)
 *
 * Query Parameters (GET):
 * - page: Page number (default: 1)
 * - pageSize: Results per page (default: 20, max: 50)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================================================
// Types
// ============================================================================

interface PostWithAuthor {
  id: string
  producer_id: string
  location_id: string
  selfie_url: string
  target_avatar: Record<string, unknown>
  target_description: string | null
  message: string
  note: string | null
  seen_at: string | null
  is_active: boolean
  created_at: string
  expires_at: string
  producer?: {
    id: string
    display_name: string | null
    username: string | null
  }
  location?: {
    id: string
    name: string
    address: string | null
  }
}

interface EventPost {
  id: string
  event_id: string
  post_id: string
  created_at: string
  post: PostWithAuthor
}

interface GetPostsResponse {
  posts: PostWithAuthor[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    hasNextPage: boolean
  }
  event_id: string
}

interface CreatePostRequest {
  location_id: string
  selfie_url: string
  target_avatar: Record<string, unknown>
  target_description?: string
  message: string
  note?: string
  seen_at?: string
}

interface CreatePostResponse {
  post: PostWithAuthor
  event_post: {
    id: string
    event_id: string
    post_id: string
    created_at: string
  }
}

// ============================================================================
// GET Handler
// ============================================================================

/**
 * GET /api/events/[id]/posts
 *
 * Fetch posts associated with a specific event
 * Returns posts sorted by creation time (newest first)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const searchParams = request.nextUrl.searchParams

    // Validate event ID
    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing event ID' },
        { status: 400 }
      )
    }

    // Parse pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
    const offset = (page - 1) * pageSize

    // Create Supabase client
    const supabase = await createClient()

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('event_posts')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    // Fetch event posts with related post data, producer, and location
    const { data: eventPosts, error: postsError } = await supabase
      .from('event_posts')
      .select(`
        id,
        event_id,
        post_id,
        created_at,
        post:posts (
          id,
          producer_id,
          location_id,
          selfie_url,
          target_avatar,
          target_description,
          message,
          note,
          seen_at,
          is_active,
          created_at,
          expires_at,
          producer:profiles!posts_producer_id_fkey (
            id,
            display_name,
            username
          ),
          location:locations!posts_location_id_fkey (
            id,
            name,
            address
          )
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (postsError) {
      return NextResponse.json(
        { error: 'Failed to fetch posts', details: postsError.message },
        { status: 500 }
      )
    }

    // Extract posts from event_posts join result
    const posts: PostWithAuthor[] = (eventPosts || [])
      .map((ep: EventPost) => {
        if (!ep.post) return null
        return {
          ...ep.post,
          producer: Array.isArray(ep.post.producer) ? ep.post.producer[0] : ep.post.producer,
          location: Array.isArray(ep.post.location) ? ep.post.location[0] : ep.post.location,
        }
      })
      .filter((post): post is PostWithAuthor => post !== null && post.is_active)

    // Build response
    const response: GetPostsResponse = {
      posts,
      pagination: {
        page,
        pageSize,
        totalCount: totalCount || 0,
        hasNextPage: offset + posts.length < (totalCount || 0),
      },
      event_id: eventId,
    }

    return NextResponse.json(response)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: 'Failed to fetch event posts', details: errorMessage },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST Handler
// ============================================================================

/**
 * POST /api/events/[id]/posts
 *
 * Create a new post and link it to the event
 * Requires authentication
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params

    // Validate event ID
    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing event ID' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: CreatePostRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Validate required fields
    const { location_id, selfie_url, target_avatar, message } = body
    if (!location_id || !selfie_url || !target_avatar || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: location_id, selfie_url, target_avatar, message' },
        { status: 400 }
      )
    }

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Verify location exists
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id, name, address')
      .eq('id', location_id)
      .single()

    if (locationError || !location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Create the post
    const { data: newPost, error: postError } = await supabase
      .from('posts')
      .insert({
        producer_id: user.id,
        location_id,
        selfie_url,
        target_avatar,
        target_description: body.target_description || null,
        message,
        note: body.note || null,
        seen_at: body.seen_at || null,
        is_active: true,
      })
      .select(`
        id,
        producer_id,
        location_id,
        selfie_url,
        target_avatar,
        target_description,
        message,
        note,
        seen_at,
        is_active,
        created_at,
        expires_at
      `)
      .single()

    if (postError || !newPost) {
      return NextResponse.json(
        { error: 'Failed to create post', details: postError?.message || 'Unknown error' },
        { status: 500 }
      )
    }

    // Link post to event
    const { data: eventPost, error: linkError } = await supabase
      .from('event_posts')
      .insert({
        event_id: eventId,
        post_id: newPost.id,
      })
      .select()
      .single()

    if (linkError || !eventPost) {
      // Rollback: delete the post if linking failed
      await supabase.from('posts').delete().eq('id', newPost.id)

      return NextResponse.json(
        { error: 'Failed to link post to event', details: linkError?.message || 'Unknown error' },
        { status: 500 }
      )
    }

    // Get producer profile for response
    const { data: producer } = await supabase
      .from('profiles')
      .select('id, display_name, username')
      .eq('id', user.id)
      .single()

    // Build response
    const response: CreatePostResponse = {
      post: {
        ...newPost,
        producer: producer || { id: user.id, display_name: null, username: null },
        location: location,
      },
      event_post: eventPost,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: 'Failed to create event post', details: errorMessage },
      { status: 500 }
    )
  }
}
