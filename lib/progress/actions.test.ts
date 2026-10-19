import { beforeEach, describe, expect, it, vi } from 'vitest';

const { revalidatePathMock, checkVaultAccessMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  checkVaultAccessMock: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));
vi.mock('@/lib/vault/access', () => ({ checkVaultAccess: checkVaultAccessMock }));

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { recordSessionOpen, toggleAssignmentComplete, toggleSessionComplete } from './actions';

const USER = 'user-1';
const SESSION = 'session-1';
const WEEK = 'week-1';
const COURSE = 'course-1';

type Row = Record<string, unknown>;
type Call = [string, ...unknown[]];
type Query = { table: string; calls: Call[] };

type Options = {
  user?: string | null;
  /** Rows per table; a missing table throws, mirroring an unmocked read. */
  tables?: Record<string, Row[]>;
  upsertError?: string;
};

/**
 * Same in-memory PostgREST stand-in as queries.test.ts, plus auth and upsert.
 * requireAuth is module-private and unexported, so auth is driven the only way
 * it can be: through the mocked client's auth.getUser().
 */
function useClient({ user = USER, tables = {}, upsertError }: Options = {}) {
  const upserts: { row: Row; options: unknown }[] = [];
  const inserts: { table: string; row: Row }[] = [];

  const resolve = (q: Query) => {
    const upsert = q.calls.find(([m]) => m === 'upsert');
    if (upsert) {
      upserts.push({ row: upsert[1] as Row, options: upsert[2] });
      return { data: null, error: upsertError ? { message: upsertError } : null };
    }
    const insert = q.calls.find(([m]) => m === 'insert');
    if (insert) {
      inserts.push({ table: q.table, row: insert[1] as Row });
      return { data: null, error: null };
    }

    const rows = tables[q.table];
    if (!rows) throw new Error(`unmocked table: ${q.table}`);

    let out = [...rows];
    for (const [method, key, value] of q.calls) {
      if (method === 'eq') out = out.filter((r) => r[key as string] === value);
      else if (method === 'in') out = out.filter((r) => (value as unknown[]).includes(r[key as string]));
    }

    const single = q.calls.some(([m]) => m === 'maybeSingle');
    return { data: single ? (out[0] ?? null) : out, error: null };
  };

  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: user ? { id: user } : null } })),
    },
    from: vi.fn((table: string) => {
      const q: Query = { table, calls: [] };
      const builder: Record<string, unknown> = {
        then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve(onFulfilled(resolve(q))),
      };
      for (const method of ['select', 'eq', 'in', 'upsert', 'insert', 'maybeSingle']) {
        builder[method] = (...args: unknown[]) => {
          q.calls.push([method, ...args]);
          return builder;
        };
      }
      return builder;
    }),
  };

  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);
  return { upserts, inserts };
}

/**
 * Service-role stand-in for syncEnrollmentCompletion: one week, one session,
 * one completion — and NO enrollment row (a Vault reader). Records updates so
 * a test can prove nothing was written to enrollments.
 */
function useAdminClient() {
  const updates: { table: string; payload: unknown }[] = [];
  const results: Record<string, unknown> = {
    course_weeks: { data: [{ id: WEEK }], error: null },
    course_sessions: { count: 1, error: null },
    course_item_completions: { count: 1, error: null },
    enrollments: { data: null, error: null },
  };
  const admin = {
    from: vi.fn((table: string) => {
      const builder: Record<string, unknown> = {
        then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve(onFulfilled(results[table])),
      };
      for (const method of ['select', 'eq', 'in', 'maybeSingle']) builder[method] = () => builder;
      builder.update = (payload: unknown) => {
        updates.push({ table, payload });
        return builder;
      };
      return builder;
    }),
  };
  (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(admin);
  return { updates };
}

/** A session that resolves cleanly to COURSE, with the user enrolled. */
function enrolledTables(status = 'active') {
  return {
    course_sessions: [{ id: SESSION, week_id: WEEK }],
    course_weeks: [{ id: WEEK, course_id: COURSE }],
    course_catalog: [{ id: COURSE, slug: 'course-slug', is_published: true, vault_included: false }],
    enrollments: [{ id: 'enr-1', user_id: USER, course_id: COURSE, status }],
    course_item_completions: [],
  };
}

const ASSIGNMENT = 'assignment-1';

/** A published, Vault-included course with an assignment and NO enrollment. */
function vaultReaderTables() {
  return {
    ...enrolledTables(),
    course_assignments: [{ id: ASSIGNMENT, week_id: WEEK }],
    course_catalog: [{ id: COURSE, slug: 'course-slug', is_published: true, vault_included: true }],
    enrollments: [],
  };
}

const vaultResult = (source: string | null) => ({
  hasAccess: source !== null,
  source,
  subscriptionStatus: null,
  activeCourseName: null,
  sponsor: null,
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe('Vault readers of an included course (B3)', () => {
  it('toggleSessionComplete succeeds for a Vault reader of an included course', async () => {
    checkVaultAccessMock.mockResolvedValue(vaultResult('subscription'));
    const { inserts } = useClient({ tables: vaultReaderTables() });
    const { updates } = useAdminClient();

    await expect(toggleSessionComplete(SESSION)).resolves.toEqual({ completed: true });

    expect(inserts).toEqual([
      {
        table: 'course_item_completions',
        row: { user_id: USER, course_id: COURSE, item_type: 'session', item_id: SESSION },
      },
    ]);
    // syncEnrollmentCompletion found no enrollment row: a no-op, not a throw.
    expect(updates).toEqual([]);
  });

  it('toggleSessionComplete rejects without access', async () => {
    checkVaultAccessMock.mockResolvedValue(vaultResult(null));
    useClient({ tables: vaultReaderTables() });
    await expect(toggleSessionComplete(SESSION)).rejects.toThrow('No access to this course');
  });

  it('toggleAssignmentComplete succeeds for a Vault reader of an included course', async () => {
    checkVaultAccessMock.mockResolvedValue(vaultResult('seat'));
    const { inserts } = useClient({ tables: vaultReaderTables() });
    await expect(toggleAssignmentComplete(ASSIGNMENT)).resolves.toEqual({ completed: true });
    expect(inserts[0].row).toMatchObject({ item_type: 'assignment', item_id: ASSIGNMENT });
  });

  it('toggleAssignmentComplete rejects without access', async () => {
    checkVaultAccessMock.mockResolvedValue(vaultResult(null));
    useClient({ tables: vaultReaderTables() });
    await expect(toggleAssignmentComplete(ASSIGNMENT)).rejects.toThrow('No access to this course');
  });

  it('recordSessionOpen succeeds for a Vault reader of an included course', async () => {
    checkVaultAccessMock.mockResolvedValue(vaultResult('cohort'));
    const { upserts } = useClient({ tables: vaultReaderTables() });
    await expect(recordSessionOpen(SESSION)).resolves.toBeUndefined();
    expect(upserts).toHaveLength(1);
  });

  it('recordSessionOpen rejects without access', async () => {
    checkVaultAccessMock.mockResolvedValue(vaultResult(null));
    useClient({ tables: vaultReaderTables() });
    await expect(recordSessionOpen(SESSION)).rejects.toThrow('No access to this course');
  });

  it('a legacy buyer of another course is not a Vault reader', async () => {
    checkVaultAccessMock.mockResolvedValue(vaultResult('enrollment'));
    useClient({ tables: vaultReaderTables() });
    await expect(toggleSessionComplete(SESSION)).rejects.toThrow('No access to this course');
  });

  it('a Vault member on a NON-included course is rejected without a Vault lookup', async () => {
    checkVaultAccessMock.mockResolvedValue(vaultResult('subscription'));
    useClient({ tables: { ...enrolledTables(), enrollments: [] } });
    await expect(recordSessionOpen(SESSION)).rejects.toThrow('No access to this course');
    expect(checkVaultAccessMock).not.toHaveBeenCalled();
  });

  it('a refunded buyer is still rejected', async () => {
    useClient({ tables: enrolledTables('refunded') });
    await expect(toggleSessionComplete(SESSION)).rejects.toThrow('No access to this course');
  });
});

describe('recordSessionOpen', () => {
  it('records an open for an enrolled user', async () => {
    const { upserts } = useClient({ tables: enrolledTables() });

    await expect(recordSessionOpen(SESSION)).resolves.toBeUndefined();

    expect(upserts).toHaveLength(1);
    expect(upserts[0].row).toMatchObject({
      user_id: USER,
      course_id: COURSE,
      session_id: SESSION,
    });
    // opened_at must be sent explicitly: the column DEFAULT does not fire on the
    // conflict-update path, so re-opening would keep the original timestamp.
    expect(upserts[0].row.opened_at).toEqual(expect.any(String));
    expect(upserts[0].options).toEqual({ onConflict: 'user_id,session_id' });
  });

  it('resolves the course server-side rather than trusting the caller', async () => {
    const { upserts } = useClient({ tables: enrolledTables() });

    // The action's only argument is the session id — there is no parameter
    // through which a client could supply a course_id or user_id.
    expect(recordSessionOpen).toHaveLength(1);

    await recordSessionOpen(SESSION);
    expect(upserts[0].row.course_id).toBe(COURSE);
    expect(upserts[0].row.user_id).toBe(USER);
  });

  it('rejects an unauthenticated caller', async () => {
    useClient({ user: null, tables: enrolledTables() });
    await expect(recordSessionOpen(SESSION)).rejects.toThrow('Not authenticated');
  });

  it('rejects an unknown session', async () => {
    useClient({ tables: { ...enrolledTables(), course_sessions: [] } });
    await expect(recordSessionOpen('does-not-exist')).rejects.toThrow('Course item not found');
  });

  it('rejects a user with no enrolment in the session’s course', async () => {
    useClient({ tables: { ...enrolledTables(), enrollments: [] } });
    await expect(recordSessionOpen(SESSION)).rejects.toThrow('No access to this course');
  });

  it.each(['refunded', 'cancelled'])('rejects a %s enrolment', async (status) => {
    useClient({ tables: enrolledTables(status) });
    await expect(recordSessionOpen(SESSION)).rejects.toThrow('No access to this course');
  });

  it('accepts a completed enrolment — finishing a course does not revoke access', async () => {
    const { upserts } = useClient({ tables: enrolledTables('completed') });
    await expect(recordSessionOpen(SESSION)).resolves.toBeUndefined();
    expect(upserts).toHaveLength(1);
  });

  it('does not record an open for another user’s enrolment', async () => {
    useClient({
      tables: {
        ...enrolledTables(),
        enrollments: [{ id: 'enr-2', user_id: 'someone-else', course_id: COURSE, status: 'active' }],
      },
    });
    await expect(recordSessionOpen(SESSION)).rejects.toThrow('No access to this course');
  });

  it('surfaces a write failure', async () => {
    useClient({ tables: enrolledTables(), upsertError: 'permission denied' });
    await expect(recordSessionOpen(SESSION)).rejects.toThrow('permission denied');
  });

  it('does not revalidate — an open is not a progress change', async () => {
    useClient({ tables: enrolledTables() });
    await recordSessionOpen(SESSION);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
