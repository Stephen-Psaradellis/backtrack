/**
 * Supabase Mock Client
 *
 * Reusable mock Supabase client for testing.
 * Provides chainable query builder and configurable return data.
 */

import type { PostgrestError } from '@supabase/supabase-js'

// ============================================================================
// TYPES
// ============================================================================

export interface MockSupabaseOptions {
  /** Default data to return for queries (keyed by table name) */
  defaultData?: Record<string, unknown[]>
  /** Default error to return for queries (keyed by table name) */
  defaultErrors?: Record<string, PostgrestError>
  /** Data to return for specific RPC calls */
  rpcData?: Record<string, unknown>
  /** Errors to return for specific RPC calls */
  rpcErrors?: Record<string, PostgrestError>
  /** Mock user session */
  session?: {
    user: {
      id: string
      email?: string
    }
  } | null
}

export interface MockQueryBuilder {
  select: (columns?: string) => MockQueryBuilder
  insert: (data: unknown) => MockQueryBuilder
  update: (data: unknown) => MockQueryBuilder
  delete: () => MockQueryBuilder
  eq: (column: string, value: unknown) => MockQueryBuilder
  neq: (column: string, value: unknown) => MockQueryBuilder
  gt: (column: string, value: unknown) => MockQueryBuilder
  gte: (column: string, value: unknown) => MockQueryBuilder
  lt: (column: string, value: unknown) => MockQueryBuilder
  lte: (column: string, value: unknown) => MockQueryBuilder
  like: (column: string, value: string) => MockQueryBuilder
  ilike: (column: string, value: string) => MockQueryBuilder
  is: (column: string, value: unknown) => MockQueryBuilder
  in: (column: string, values: unknown[]) => MockQueryBuilder
  contains: (column: string, value: unknown) => MockQueryBuilder
  containedBy: (column: string, value: unknown) => MockQueryBuilder
  rangeGt: (column: string, value: unknown) => MockQueryBuilder
  rangeGte: (column: string, value: unknown) => MockQueryBuilder
  rangeLt: (column: string, value: unknown) => MockQueryBuilder
  rangeLte: (column: string, value: unknown) => MockQueryBuilder
  rangeAdjacent: (column: string, value: unknown) => MockQueryBuilder
  overlaps: (column: string, value: unknown) => MockQueryBuilder
  textSearch: (column: string, query: string) => MockQueryBuilder
  match: (query: Record<string, unknown>) => MockQueryBuilder
  not: (column: string, operator: string, value: unknown) => MockQueryBuilder
  or: (filters: string) => MockQueryBuilder
  filter: (column: string, operator: string, value: unknown) => MockQueryBuilder
  order: (column: string, options?: { ascending?: boolean }) => MockQueryBuilder
  limit: (count: number) => MockQueryBuilder
  range: (from: number, to: number) => MockQueryBuilder
  single: () => Promise<{ data: unknown | null; error: PostgrestError | null }>
  maybeSingle: () => Promise<{ data: unknown | null; error: PostgrestError | null }>
}

export interface MockSupabaseClient {
  from: (table: string) => MockQueryBuilder
  rpc: (
    name: string,
    params?: Record<string, unknown>
  ) => Promise<{ data: unknown | null; error: PostgrestError | null }>
  auth: {
    getSession: () => Promise<{
      data: { session: unknown | null }
      error: PostgrestError | null
    }>
    getUser: () => Promise<{ data: { user: unknown | null }; error: PostgrestError | null }>
    signInWithPassword: (credentials: {
      email: string
      password: string
    }) => Promise<{ data: { session: unknown | null }; error: PostgrestError | null }>
    signUp: (credentials: {
      email: string
      password: string
    }) => Promise<{ data: { session: unknown | null }; error: PostgrestError | null }>
    signOut: () => Promise<{ error: PostgrestError | null }>
    resetPasswordForEmail: (email: string) => Promise<{ error: PostgrestError | null }>
    updateUser: (attributes: {
      password?: string
    }) => Promise<{ data: { user: unknown | null }; error: PostgrestError | null }>
    onAuthStateChange: (
      callback: (event: string, session: unknown) => void
    ) => { data: { subscription: { unsubscribe: () => void } } }
  }
  channel: (name: string) => MockRealtimeChannel
  storage: {
    from: (bucket: string) => MockStorageBucket
  }
}

export interface MockRealtimeChannel {
  on: (
    event: string,
    filter: Record<string, unknown> | ((payload: unknown) => void),
    callback?: (payload: unknown) => void
  ) => MockRealtimeChannel
  subscribe: (callback?: (status: string) => void) => MockRealtimeChannel
  unsubscribe: () => Promise<void>
  send: (payload: { type: string; event: string; payload: unknown }) => void
}

export interface MockStorageBucket {
  upload: (
    path: string,
    file: unknown,
    options?: Record<string, unknown>
  ) => Promise<{ data: { path: string } | null; error: PostgrestError | null }>
  download: (path: string) => Promise<{ data: Blob | null; error: PostgrestError | null }>
  remove: (paths: string[]) => Promise<{ data: unknown | null; error: PostgrestError | null }>
  getPublicUrl: (path: string) => { data: { publicUrl: string } }
  createSignedUrl: (
    path: string,
    expiresIn: number
  ) => Promise<{ data: { signedUrl: string } | null; error: PostgrestError | null }>
}

// ============================================================================
// MOCK QUERY BUILDER
// ============================================================================

class MockQueryBuilderImpl implements MockQueryBuilder {
  private table: string
  private data: unknown[] | null
  private error: PostgrestError | null
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select'

  constructor(table: string, data: unknown[] | null, error: PostgrestError | null) {
    this.table = table
    this.data = data
    this.error = error
  }

  select(columns?: string): MockQueryBuilder {
    this.operation = 'select'
    return this
  }

  insert(data: unknown): MockQueryBuilder {
    this.operation = 'insert'
    return this
  }

  update(data: unknown): MockQueryBuilder {
    this.operation = 'update'
    return this
  }

  delete(): MockQueryBuilder {
    this.operation = 'delete'
    return this
  }

  // Filter methods (chainable)
  eq(column: string, value: unknown): MockQueryBuilder {
    return this
  }

  neq(column: string, value: unknown): MockQueryBuilder {
    return this
  }

  gt(column: string, value: unknown): MockQueryBuilder {
    return this
  }

  gte(column: string, value: unknown): MockQueryBuilder {
    return this
  }

  lt(column: string, value: unknown): MockQueryBuilder {
    return this
  }

  lte(column: string, value: unknown): MockQueryBuilder {
    return this
  }

  like(column: string, value: string): MockQueryBuilder {
    return this
  }

  ilike(column: string, value: string): MockQueryBuilder {
    return this
  }

  is(column: string, value: unknown): MockQueryBuilder {
    return this
  }

  in(column: string, values: unknown[]): MockQueryBuilder {
    return this
  }

  contains(column: string, value: unknown): MockQueryBuilder {
    return this
  }

  containedBy(column: string, value: unknown): MockQueryBuilder {
    return this
  }

  rangeGt(column: string, value: unknown): MockQueryBuilder {
    return this
  }

  rangeGte(column: string, value: unknown): MockQueryBuilder {
    return this
  }

  rangeLt(column: string, value: unknown): MockQueryBuilder {
    return this
  }

  rangeLte(column: string, value: unknown): MockQueryBuilder {
    return this
  }

  rangeAdjacent(column: string, value: unknown): MockQueryBuilder {
    return this
  }

  overlaps(column: string, value: unknown): MockQueryBuilder {
    return this
  }

  textSearch(column: string, query: string): MockQueryBuilder {
    return this
  }

  match(query: Record<string, unknown>): MockQueryBuilder {
    return this
  }

  not(column: string, operator: string, value: unknown): MockQueryBuilder {
    return this
  }

  or(filters: string): MockQueryBuilder {
    return this
  }

  filter(column: string, operator: string, value: unknown): MockQueryBuilder {
    return this
  }

  order(column: string, options?: { ascending?: boolean }): MockQueryBuilder {
    return this
  }

  limit(count: number): MockQueryBuilder {
    return this
  }

  range(from: number, to: number): MockQueryBuilder {
    return this
  }

  async single(): Promise<{ data: unknown | null; error: PostgrestError | null }> {
    if (this.error) {
      return { data: null, error: this.error }
    }

    const singleData = this.data && this.data.length > 0 ? this.data[0] : null
    return { data: singleData, error: null }
  }

  async maybeSingle(): Promise<{ data: unknown | null; error: PostgrestError | null }> {
    if (this.error) {
      return { data: null, error: this.error }
    }

    const singleData = this.data && this.data.length > 0 ? this.data[0] : null
    return { data: singleData, error: null }
  }

  // Return data for non-single queries
  then(
    resolve: (value: { data: unknown[] | null; error: PostgrestError | null }) => void,
    reject?: (reason: unknown) => void
  ): Promise<{ data: unknown[] | null; error: PostgrestError | null }> {
    return Promise.resolve({ data: this.data, error: this.error }).then(resolve, reject)
  }
}

// ============================================================================
// MOCK REALTIME CHANNEL
// ============================================================================

class MockRealtimeChannelImpl implements MockRealtimeChannel {
  private handlers: Map<string, ((payload: unknown) => void)[]> = new Map()

  on(
    event: string,
    filter: Record<string, unknown> | ((payload: unknown) => void),
    callback?: (payload: unknown) => void
  ): MockRealtimeChannel {
    const handler = typeof filter === 'function' ? filter : callback
    if (handler) {
      if (!this.handlers.has(event)) {
        this.handlers.set(event, [])
      }
      this.handlers.get(event)!.push(handler)
    }
    return this
  }

  subscribe(callback?: (status: string) => void): MockRealtimeChannel {
    if (callback) {
      setTimeout(() => callback('SUBSCRIBED'), 0)
    }
    return this
  }

  async unsubscribe(): Promise<void> {
    this.handlers.clear()
  }

  send(payload: { type: string; event: string; payload: unknown }): void {
    const handlers = this.handlers.get(payload.event)
    if (handlers) {
      handlers.forEach((handler) => handler(payload.payload))
    }
  }
}

// ============================================================================
// MOCK STORAGE BUCKET
// ============================================================================

class MockStorageBucketImpl implements MockStorageBucket {
  constructor(private bucket: string) {}

  async upload(
    path: string,
    file: unknown,
    options?: Record<string, unknown>
  ): Promise<{ data: { path: string } | null; error: PostgrestError | null }> {
    return { data: { path }, error: null }
  }

  async download(path: string): Promise<{ data: Blob | null; error: PostgrestError | null }> {
    return { data: new Blob(), error: null }
  }

  async remove(
    paths: string[]
  ): Promise<{ data: unknown | null; error: PostgrestError | null }> {
    return { data: { paths }, error: null }
  }

  getPublicUrl(path: string): { data: { publicUrl: string } } {
    return { data: { publicUrl: `https://example.com/${this.bucket}/${path}` } }
  }

  async createSignedUrl(
    path: string,
    expiresIn: number
  ): Promise<{ data: { signedUrl: string } | null; error: PostgrestError | null }> {
    return {
      data: { signedUrl: `https://example.com/${this.bucket}/${path}?token=signed` },
      error: null,
    }
  }
}

// ============================================================================
// CREATE MOCK SUPABASE CLIENT
// ============================================================================

/**
 * Create a mock Supabase client for testing
 *
 * @param options - Configuration options
 * @returns Mock Supabase client
 */
export function createMockSupabaseClient(options: MockSupabaseOptions = {}): MockSupabaseClient {
  const { defaultData = {}, defaultErrors = {}, rpcData = {}, rpcErrors = {}, session = null } =
    options

  return {
    from(table: string): MockQueryBuilder {
      const data = defaultData[table] || null
      const error = defaultErrors[table] || null
      return new MockQueryBuilderImpl(table, data as unknown[], error)
    },

    async rpc(
      name: string,
      params?: Record<string, unknown>
    ): Promise<{ data: unknown | null; error: PostgrestError | null }> {
      if (rpcErrors[name]) {
        return { data: null, error: rpcErrors[name] }
      }
      return { data: rpcData[name] || null, error: null }
    },

    auth: {
      async getSession() {
        return { data: { session }, error: null }
      },

      async getUser() {
        return { data: { user: session?.user || null }, error: null }
      },

      async signInWithPassword(credentials: { email: string; password: string }) {
        return { data: { session }, error: null }
      },

      async signUp(credentials: { email: string; password: string }) {
        return { data: { session }, error: null }
      },

      async signOut() {
        return { error: null }
      },

      async resetPasswordForEmail(email: string) {
        return { error: null }
      },

      async updateUser(attributes: { password?: string }) {
        return { data: { user: session?.user || null }, error: null }
      },

      onAuthStateChange(callback: (event: string, session: unknown) => void) {
        return {
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        }
      },
    },

    channel(name: string): MockRealtimeChannel {
      return new MockRealtimeChannelImpl()
    },

    storage: {
      from(bucket: string): MockStorageBucket {
        return new MockStorageBucketImpl(bucket)
      },
    },
  }
}
