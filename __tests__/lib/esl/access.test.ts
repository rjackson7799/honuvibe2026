import { beforeEach, describe, expect, it, vi } from 'vitest';

const { db, checkVaultAccessMock } = vi.hoisted(() => ({
  db: {
    canManage: false,
    course_catalog: [] as Record<string, unknown>[],
    enrollments: [] as Record<string, unknown>[],
    esl_purchases: [] as Record<string, unknown>[],
  },
  checkVaultAccessMock: vi.fn(),
}));

function from(table: string) {
  const filters: [string, string, unknown][] = [];
  const rows = () =>
    ((db as unknown as Record<string, Record<string, unknown>[]>)[table] ?? []).filter((r) =>
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
    single: async () => ({ data: rows()[0] ?? null, error: null }),
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
  };
  return builder;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from,
    rpc: async () => ({ data: db.canManage, error: null }),
  }),
}));
vi.mock('@/lib/vault/access', () => ({ checkVaultAccess: checkVaultAccessMock }));

import { checkESLAccess } from '@/lib/esl/access';

const USER = 'u1';
const COURSE = 'c1';

function seedCourse(over: Record<string, unknown> = {}) {
  db.course_catalog = [
    {
      id: COURSE,
      esl_enabled: true,
      esl_included: true,
      is_published: true,
      vault_included: true,
      ...over,
    },
  ];
}

const vaultMember = () =>
  checkVaultAccessMock.mockResolvedValue({
    hasAccess: true,
    source: 'subscription',
    subscriptionStatus: 'active',
    activeCourseName: null,
    sponsor: null,
  });

beforeEach(() => {
  db.canManage = false;
  db.course_catalog = [];
  db.enrollments = [];
  db.esl_purchases = [];
  checkVaultAccessMock.mockReset();
});

describe('checkESLAccess — Vault branch (B3 D2)', () => {
  it('vault member gets ESL on included course with esl_included → source vault', async () => {
    seedCourse();
    vaultMember();
    expect(await checkESLAccess(USER, COURSE)).toEqual({ hasAccess: true, source: 'vault' });
  });

  it('vault member, esl_included false → no access', async () => {
    seedCourse({ esl_included: false });
    vaultMember();
    expect(await checkESLAccess(USER, COURSE)).toEqual({ hasAccess: false, source: null });
  });

  it('vault member, course not vault_included → no access', async () => {
    seedCourse({ vault_included: false });
    vaultMember();
    expect(await checkESLAccess(USER, COURSE)).toEqual({ hasAccess: false, source: null });
    expect(checkVaultAccessMock).not.toHaveBeenCalled();
  });

  it('vault member, included course unpublished → no access', async () => {
    seedCourse({ is_published: false });
    vaultMember();
    expect((await checkESLAccess(USER, COURSE)).hasAccess).toBe(false);
  });

  it('a legacy course buyer elsewhere is not a Vault member for ESL', async () => {
    seedCourse();
    checkVaultAccessMock.mockResolvedValue({
      hasAccess: true,
      source: 'enrollment',
      subscriptionStatus: null,
      activeCourseName: 'Other',
      sponsor: null,
    });
    expect((await checkESLAccess(USER, COURSE)).hasAccess).toBe(false);
  });

  it('an enrollment still wins first, as source included', async () => {
    seedCourse();
    db.enrollments = [{ id: 'e1', user_id: USER, course_id: COURSE, status: 'active' }];
    expect(await checkESLAccess(USER, COURSE)).toEqual({ hasAccess: true, source: 'included' });
    expect(checkVaultAccessMock).not.toHaveBeenCalled();
  });

  it('an add-on purchase still works without Vault', async () => {
    seedCourse({ esl_included: false });
    db.esl_purchases = [{ id: 'p1', user_id: USER, course_id: COURSE }];
    expect(await checkESLAccess(USER, COURSE)).toEqual({ hasAccess: true, source: 'purchased' });
  });
});
