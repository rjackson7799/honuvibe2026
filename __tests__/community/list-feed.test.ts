import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listFeed } from '@/lib/community/queries';

type Row = { id: string; created_at: string };

// Minimal chainable thenable that mimics the Supabase query builder: every
// builder method returns the builder, and awaiting it resolves { data, error }.
function thenable(result: { data: unknown; error: unknown }, methods: string[]) {
  const builder: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => resolve(result),
  };
  for (const m of methods) builder[m] = () => builder;
  return builder;
}

function makeSupabase(opts: {
  posts: Row[];
  likes?: { post_id: string }[];
  likeError?: unknown;
}): SupabaseClient {
  return {
    from(table: string) {
      if (table === 'community_posts') {
        return thenable({ data: opts.posts, error: null }, [
          'select',
          'eq',
          'is',
          'lt',
          'order',
          'limit',
        ]);
      }
      if (table === 'community_post_likes') {
        return thenable(
          { data: opts.likes ?? [], error: opts.likeError ?? null },
          ['select', 'eq', 'in'],
        );
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;
}

describe('listFeed liked_by_me hydration', () => {
  it('marks liked posts for the given user and leaves others false', async () => {
    const supabase = makeSupabase({
      posts: [
        { id: 'p1', created_at: '2026-01-02T00:00:00Z' },
        { id: 'p2', created_at: '2026-01-01T00:00:00Z' },
      ],
      likes: [{ post_id: 'p1' }],
    });
    const { posts } = await listFeed(supabase, { partnerId: null, userId: 'u1' });
    expect(posts.find((p) => p.id === 'p1')?.liked_by_me).toBe(true);
    expect(posts.find((p) => p.id === 'p2')?.liked_by_me).toBe(false);
  });

  it('leaves liked_by_me undefined when userId is absent', async () => {
    const supabase = makeSupabase({
      posts: [{ id: 'p1', created_at: '2026-01-02T00:00:00Z' }],
    });
    const { posts } = await listFeed(supabase, { partnerId: null });
    expect(posts[0].liked_by_me).toBeUndefined();
  });

  it('throws when the likes lookup errors', async () => {
    const supabase = makeSupabase({
      posts: [{ id: 'p1', created_at: '2026-01-02T00:00:00Z' }],
      likeError: new Error('likes boom'),
    });
    await expect(
      listFeed(supabase, { partnerId: null, userId: 'u1' }),
    ).rejects.toThrow('likes boom');
  });
});
