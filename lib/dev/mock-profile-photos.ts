/**
 * Mock profile photos for development testing
 */
export const devMockProfilePhotos = [
  {
    id: 'dev-photo-001',
    user_id: 'dev-user-123',
    storage_path: 'profile-photos/dev-user-123/photo-001.jpg',
    moderation_status: 'approved',
    is_primary: true,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-photo-002',
    user_id: 'dev-user-123',
    storage_path: 'profile-photos/dev-user-123/photo-002.jpg',
    moderation_status: 'approved',
    is_primary: false,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
]
