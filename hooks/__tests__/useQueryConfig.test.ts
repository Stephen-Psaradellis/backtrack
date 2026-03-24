import { describe, it, expect } from 'vitest';
import { queryClient, queryKeys } from '../useQueryConfig';

describe('queryClient defaults', () => {
  const defaults = queryClient.getDefaultOptions();

  it('staleTime is 30 seconds', () => {
    expect(defaults.queries?.staleTime).toBe(30_000);
  });

  it('gcTime is 5 minutes', () => {
    expect(defaults.queries?.gcTime).toBe(300_000);
  });

  it('retry is 2 for queries, 1 for mutations', () => {
    expect(defaults.queries?.retry).toBe(2);
    expect(defaults.mutations?.retry).toBe(1);
  });

  it('refetchOnWindowFocus is disabled', () => {
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });
});

describe('queryKeys factories', () => {
  it('conversations.list builds correct array', () => {
    expect(queryKeys.conversations.list()).toEqual(['conversations', 'list']);
  });

  it('conversations.detail includes id', () => {
    expect(queryKeys.conversations.detail('abc')).toEqual(['conversations', 'detail', 'abc']);
  });

  it('messages.list includes conversationId', () => {
    expect(queryKeys.messages.list('c1')).toEqual(['messages', 'list', 'c1']);
  });

  it('posts.feed includes filters', () => {
    const filters = { category: 'food' };
    expect(queryKeys.posts.feed(filters)).toEqual(['posts', 'feed', filters]);
  });

  it('locations.nearby includes lat/lon', () => {
    expect(queryKeys.locations.nearby(40.7, -74.0)).toEqual(['locations', 'nearby', 40.7, -74.0]);
  });
});
