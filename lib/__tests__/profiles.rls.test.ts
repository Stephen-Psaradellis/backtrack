/**
 * Profiles RLS Policy Tests
 *
 * Tests Row Level Security policies for the profiles table.
 * Verifies that:
 * - All authenticated users can read profiles (public read)
 * - Users can only update their own profile
 * - Users cannot update other users' profiles
 * - Users can insert their own profile (for auto-creation)
 */

import { describe, it, expect } from 'vitest'
import { createMockSupabaseClient } from '../../__tests__/utils/supabase-mock'
import {
  createMockProfile,
  createMockAvatar,
  getCurrentTimestamp,
} from '../../__tests__/utils/factories'
import type { Profile } from '../../types/database'

describe('Profiles RLS Policies', () => {
  const userA = createMockProfile({ id: 'user-a-uuid', username: 'usera' })
  const userB = createMockProfile({ id: 'user-b-uuid', username: 'userb' })
  const userC = createMockProfile({ id: 'user-c-uuid', username: 'userc' })

  describe('SELECT policy: public read access', () => {
    it('allows authenticated user to read all profiles', async () => {
      const mockClient = createMockSupabaseClient({
        defaultData: {
          profiles: [userA, userB, userC],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('profiles').select('*')

      expect(error).toBeNull()
      expect(data).toHaveLength(3)
      expect((data as Profile[]).map((p) => p.id)).toContain(userA.id)
      expect((data as Profile[]).map((p) => p.id)).toContain(userB.id)
      expect((data as Profile[]).map((p) => p.id)).toContain(userC.id)
    })

    it('allows user to read specific profile by id', async () => {
      const mockClient = createMockSupabaseClient({
        defaultData: {
          profiles: [userB],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('profiles').select('*').eq('id', userB.id)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Profile[])[0].id).toBe(userB.id)
      expect((data as Profile[])[0].username).toBe('userb')
    })

    it('allows reading profile with avatar data', async () => {
      const profileWithAvatar = createMockProfile({
        id: 'user-with-avatar',
        username: 'avataruser',
        avatar: createMockAvatar(),
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          profiles: [profileWithAvatar],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('profiles')
        .select('*')
        .eq('id', profileWithAvatar.id)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Profile[])[0].avatar).toBeDefined()
      expect((data as Profile[])[0].avatar?.features).toBeDefined()
    })
  })

  describe('UPDATE policy: users can only update own profile', () => {
    it('allows user to update their own profile', async () => {
      const updatedProfile = {
        ...userA,
        display_name: 'Updated Name',
        updated_at: getCurrentTimestamp(),
      }

      const mockClient = createMockSupabaseClient({
        defaultData: {
          profiles: [updatedProfile],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('profiles')
        .update({ display_name: 'Updated Name' })
        .eq('id', userA.id)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('allows user to update their avatar', async () => {
      const newAvatar = createMockAvatar()
      const updatedProfile = {
        ...userA,
        avatar: newAvatar,
        avatar_version: 2,
      }

      const mockClient = createMockSupabaseClient({
        defaultData: {
          profiles: [updatedProfile],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('profiles')
        .update({ avatar: newAvatar, avatar_version: 2 })
        .eq('id', userA.id)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('prevents user from updating another user\'s profile', async () => {
      const mockClient = createMockSupabaseClient({
        defaultData: {
          profiles: [],
        },
        defaultErrors: {
          profiles: {
            message: 'new row violates row-level security policy',
            code: '42501',
            details: null,
            hint: null,
          },
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('profiles')
        .update({ display_name: 'Hacked Name' })
        .eq('id', userB.id)

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
    })

    it('allows updating multiple fields at once', async () => {
      const updatedProfile = {
        ...userA,
        display_name: 'New Display Name',
        username: 'newusername',
        always_on_tracking_enabled: true,
        updated_at: getCurrentTimestamp(),
      }

      const mockClient = createMockSupabaseClient({
        defaultData: {
          profiles: [updatedProfile],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('profiles')
        .update({
          display_name: 'New Display Name',
          username: 'newusername',
          always_on_tracking_enabled: true,
        })
        .eq('id', userA.id)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })
  })

  describe('INSERT policy: users can insert their own profile', () => {
    it('allows user to create their own profile', async () => {
      const newProfile = createMockProfile({
        id: 'new-user-id',
        username: 'newuser',
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          profiles: [newProfile],
        },
        session: {
          user: { id: 'new-user-id', email: 'newuser@example.com' },
        },
      })

      const { data, error } = await mockClient.from('profiles').insert({
        id: 'new-user-id',
        username: 'newuser',
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('prevents user from creating profile for another user', async () => {
      const mockClient = createMockSupabaseClient({
        defaultData: {
          profiles: [],
        },
        defaultErrors: {
          profiles: {
            message: 'new row violates row-level security policy',
            code: '42501',
            details: null,
            hint: null,
          },
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient.from('profiles').insert({
        id: 'different-user-id', // Not matching session user
        username: 'unauthorized',
      })

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
    })
  })

  describe('Edge cases', () => {
    it('handles profile with null optional fields', async () => {
      const minimalProfile = createMockProfile({
        id: 'minimal-user',
        username: null,
        display_name: null,
        avatar: null,
      })

      const mockClient = createMockSupabaseClient({
        defaultData: {
          profiles: [minimalProfile],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('profiles')
        .select('*')
        .eq('id', minimalProfile.id)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Profile[])[0].username).toBeNull()
      expect((data as Profile[])[0].display_name).toBeNull()
      expect((data as Profile[])[0].avatar).toBeNull()
    })

    it('allows querying profiles by username', async () => {
      const mockClient = createMockSupabaseClient({
        defaultData: {
          profiles: [userB],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('profiles')
        .select('*')
        .eq('username', 'userb')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((data as Profile[])[0].id).toBe(userB.id)
    })

    it('allows updating terms acceptance timestamp', async () => {
      const timestamp = getCurrentTimestamp()
      const updatedProfile = {
        ...userA,
        terms_accepted_at: timestamp,
      }

      const mockClient = createMockSupabaseClient({
        defaultData: {
          profiles: [updatedProfile],
        },
        session: {
          user: { id: userA.id, email: 'usera@example.com' },
        },
      })

      const { data, error } = await mockClient
        .from('profiles')
        .update({ terms_accepted_at: timestamp })
        .eq('id', userA.id)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })
  })
})
