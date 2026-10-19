import { beforeEach, describe, expect, it, vi } from 'vitest';

const { writes, revalidateTagMock, auth } = vi.hoisted(() => ({
  writes: [] as { table: string; op: string; payload: unknown }[],
  revalidateTagMock: vi.fn(),
  auth: { role: 'admin' },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: revalidateTagMock,
  unstable_cache: (fn: () => unknown) => fn,
}));

function client() {
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } } }) },
    from(table: string) {
      const chain: Record<string, (...args: unknown[]) => unknown> = {};
      const ok = { data: { role: auth.role, id: 'new-id', slug: 'new-slug' }, error: null };
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.is = () => chain;
      chain.order = () => chain;
      chain.limit = () => chain;
      chain.single = async () => ok;
      chain.maybeSingle = async () => ok;
      chain.update = (payload: unknown) => {
        writes.push({ table, op: 'update', payload });
        return chain;
      };
      chain.insert = (payload: unknown) => {
        writes.push({ table, op: 'insert', payload });
        return chain;
      };
      chain.upsert = async () => ({ error: null });
      (chain as unknown as PromiseLike<unknown>).then = ((resolve: (v: unknown) => unknown) =>
        resolve({ data: null, error: null })) as PromiseLike<unknown>['then'];
      return chain;
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => client(),
  createAdminClient: () => client(),
}));

import { createVaultItem, updateVaultItem, unpublishVaultItem } from '@/lib/vault/actions';
import {
  invalidateSyllabusCache,
  publishCourse,
  unpublishCourse,
  updateCourse,
} from '@/lib/courses/actions';

beforeEach(() => {
  writes.length = 0;
  revalidateTagMock.mockClear();
  auth.role = 'admin';
});

const contentUpdate = () =>
  writes.find((w) => w.table === 'content_items' && w.op === 'update')?.payload as Record<string, unknown>;

describe('Vault item track (079)', () => {
  it('saves a valid track and clears with null', async () => {
    await updateVaultItem('i1', { track: 'research_insights' });
    expect(contentUpdate().track).toBe('research_insights');

    writes.length = 0;
    await updateVaultItem('i1', { track: null });
    expect(contentUpdate().track).toBeNull();
  });

  it('leaves track untouched when the update does not mention it', async () => {
    await updateVaultItem('i1', { title_en: 'x' });
    expect(contentUpdate()).not.toHaveProperty('track');
  });

  it('rejects an unknown track before writing', async () => {
    await expect(
      updateVaultItem('i1', { track: 'bogus' as never }),
    ).rejects.toThrow(/Invalid track/);
    expect(writes.filter((w) => w.table === 'content_items')).toHaveLength(0);
  });

  it('creates with track null by default', async () => {
    await createVaultItem({ title_en: 'New', content_type: 'video' });
    const insert = writes.find((w) => w.table === 'content_items' && w.op === 'insert')
      ?.payload as Record<string, unknown>;
    expect(insert.track).toBeNull();
  });

  it('revalidates the public catalog tag on save and unpublish', async () => {
    await updateVaultItem('i1', { track: 'ai_essentials' });
    await unpublishVaultItem('i1');
    expect(revalidateTagMock).toHaveBeenCalledWith('vault-catalog', { expire: 0 });
    expect(revalidateTagMock).toHaveBeenCalledTimes(2);
  });
});

describe('Course track + vault_included (079)', () => {
  const courseUpdate = () =>
    writes.find((w) => w.table === 'courses' && w.op === 'update' && 'updated_at' in (w.payload as object))
      ?.payload as Record<string, unknown>;

  it('saves a track, and "" from the select clears it', async () => {
    await updateCourse('c1', { track: 'build_with_ai' });
    expect(courseUpdate().track).toBe('build_with_ai');

    writes.length = 0;
    await updateCourse('c1', { track: '' });
    expect(courseUpdate().track).toBeNull();
  });

  it('rejects an unknown track', async () => {
    await expect(updateCourse('c1', { track: 'bogus' })).rejects.toThrow(/Invalid track/);
  });

  it('accepts a boolean vault_included and rejects anything else', async () => {
    await updateCourse('c1', { vault_included: true });
    expect(courseUpdate().vault_included).toBe(true);
    await expect(updateCourse('c1', { vault_included: 'yes' })).rejects.toThrow(/vault_included/);
  });
});

describe('Course actions are admin-only (B3 D3.2)', () => {
  it('updateCourse rejects a non-admin', async () => {
    auth.role = 'instructor';
    await expect(updateCourse('c1', { vault_included: true })).rejects.toThrow('Not authorized');
    expect(writes.filter((w) => w.table === 'courses')).toHaveLength(0);
  });

  it('publishCourse, unpublishCourse and invalidateSyllabusCache reject a non-admin', async () => {
    auth.role = 'instructor';
    await expect(publishCourse('c1')).rejects.toThrow('Not authorized');
    await expect(unpublishCourse('c1')).rejects.toThrow('Not authorized');
    await expect(invalidateSyllabusCache('c1')).rejects.toThrow('Not authorized');
    expect(writes.filter((w) => w.table === 'courses')).toHaveLength(0);
  });
});
