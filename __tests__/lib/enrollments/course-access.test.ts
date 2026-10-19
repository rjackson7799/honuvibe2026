import { beforeEach, describe, expect, it, vi } from 'vitest';

const { db, checkVaultAccessMock } = vi.hoisted(() => ({
  db: { enrollments: [] as Record<string, unknown>[] },
  checkVaultAccessMock: vi.fn(),
}));

/** Chainable PostgREST stand-in: eq/in filter the seeded rows, maybeSingle takes the first. */
function from(table: string) {
  const filters: [string, string, unknown][] = [];
  const rows = () =>
    ((db as Record<string, Record<string, unknown>[]>)[table] ?? []).filter((r) =>
      filters.every(([op, key, value]) =>
        op === 'eq' ? r[key] === value : (value as unknown[]).includes(r[key]),
      ),
    );
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: (key: string, value: unknown) => {
      filters.push(['eq', key, value]);
      return builder;
    },
    in: (key: string, value: unknown[]) => {
      filters.push(['in', key, value]);
      return builder;
    },
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
  };
  return builder;
}

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from }) }));
vi.mock('@/lib/vault/access', () => ({ checkVaultAccess: checkVaultAccessMock }));

import { hasCourseAccess } from '@/lib/enrollments/queries';

const USER = 'u1';
const INCLUDED = { id: 'c-inc', is_published: true, vault_included: true };
const NOT_INCLUDED = { id: 'c-not', is_published: true, vault_included: false };

const vault = (source: string | null, hasAccess = source !== null) => ({
  hasAccess,
  source,
  subscriptionStatus: null,
  activeCourseName: null,
  sponsor: null,
});

beforeEach(() => {
  db.enrollments = [];
  checkVaultAccessMock.mockReset();
});

describe('hasCourseAccess', () => {
  it('enrolled user → source enrollment, checkVaultAccess not called', async () => {
    db.enrollments = [{ id: 'e1', user_id: USER, course_id: INCLUDED.id, status: 'active' }];
    const access = await hasCourseAccess(USER, INCLUDED);
    expect(access).toMatchObject({ hasAccess: true, source: 'enrollment' });
    expect(access.enrollment?.id).toBe('e1');
    expect(checkVaultAccessMock).not.toHaveBeenCalled();
  });

  it('a completed enrollment still counts', async () => {
    db.enrollments = [{ id: 'e1', user_id: USER, course_id: NOT_INCLUDED.id, status: 'completed' }];
    expect((await hasCourseAccess(USER, NOT_INCLUDED)).source).toBe('enrollment');
  });

  it('a refunded enrollment on a non-included course gives nothing', async () => {
    db.enrollments = [{ id: 'e1', user_id: USER, course_id: NOT_INCLUDED.id, status: 'refunded' }];
    expect(await hasCourseAccess(USER, NOT_INCLUDED)).toEqual({ hasAccess: false, source: null, enrollment: null });
  });

  it('vault subscriber on included published course → source vault', async () => {
    checkVaultAccessMock.mockResolvedValue(vault('subscription'));
    expect(await hasCourseAccess(USER, INCLUDED)).toEqual({ hasAccess: true, source: 'vault', enrollment: null });
    expect(checkVaultAccessMock).toHaveBeenCalledWith(USER);
  });

  it.each(['cohort', 'seat'])('Vault via %s counts', async (source) => {
    checkVaultAccessMock.mockResolvedValue(vault(source));
    expect((await hasCourseAccess(USER, INCLUDED)).source).toBe('vault');
  });

  it('vault subscriber on non-included course → no access, checkVaultAccess not called', async () => {
    checkVaultAccessMock.mockResolvedValue(vault('subscription'));
    expect((await hasCourseAccess(USER, NOT_INCLUDED)).hasAccess).toBe(false);
    expect(checkVaultAccessMock).not.toHaveBeenCalled();
  });

  it('vault subscriber on included unpublished course → no access', async () => {
    checkVaultAccessMock.mockResolvedValue(vault('subscription'));
    const access = await hasCourseAccess(USER, { ...INCLUDED, is_published: false });
    expect(access.hasAccess).toBe(false);
    expect(checkVaultAccessMock).not.toHaveBeenCalled();
  });

  it('legacy enrollee in another course is denied an included course', async () => {
    // checkVaultAccess's legacy step 4 grants "Vault" to any course buyer; SQL
    // has_vault_access() does not, so course access must not trust it (D4).
    db.enrollments = [{ id: 'e9', user_id: USER, course_id: 'some-other-course', status: 'active' }];
    checkVaultAccessMock.mockResolvedValue(vault('enrollment'));
    expect(await hasCourseAccess(USER, INCLUDED)).toEqual({ hasAccess: false, source: null, enrollment: null });
  });

  it('vault_included undefined → treated as false', async () => {
    checkVaultAccessMock.mockResolvedValue(vault('subscription'));
    const access = await hasCourseAccess(USER, { id: 'c-x', is_published: true });
    expect(access.hasAccess).toBe(false);
    expect(checkVaultAccessMock).not.toHaveBeenCalled();
  });

  it('vault_included null → treated as false', async () => {
    checkVaultAccessMock.mockResolvedValue(vault('subscription'));
    expect((await hasCourseAccess(USER, { id: 'c-x', is_published: true, vault_included: null })).hasAccess).toBe(false);
  });

  it('no Vault, no enrollment → no access', async () => {
    checkVaultAccessMock.mockResolvedValue(vault(null));
    expect((await hasCourseAccess(USER, INCLUDED)).hasAccess).toBe(false);
  });
});
