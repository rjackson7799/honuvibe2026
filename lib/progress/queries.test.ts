import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getLessonsCompletedThisWeek, getResumePoint } from './queries';

const USER = 'user-1';

type Row = Record<string, unknown>;
type Call = [string, ...unknown[]];
type Query = { table: string; calls: Call[] };

/**
 * A tiny in-memory stand-in for PostgREST: eq/in/gte/order are applied for real
 * against fixture rows, so these tests exercise the filters the code actually
 * sends (is_unlocked, item_type, status) rather than echoing back a hand-shaped
 * mock result.
 */
function buildClient(tables: Record<string, Row[]>, errors: Record<string, string> = {}) {
  const queries: Query[] = [];

  const resolve = (q: Query) => {
    const error = errors[q.table];
    if (error) return { data: null, error: { message: error }, count: null };

    const rows = tables[q.table];
    if (!rows) throw new Error(`unmocked table: ${q.table}`);

    let out = [...rows];
    for (const [method, key, value] of q.calls) {
      if (method === 'eq') out = out.filter((r) => r[key as string] === value);
      else if (method === 'in') out = out.filter((r) => (value as unknown[]).includes(r[key as string]));
      else if (method === 'gte') {
        // Compare chronologically, not lexicographically: timestamptz >= is a
        // time comparison, and '…:00Z' vs '…:00.000Z' would otherwise pass on an
        // ASCII coincidence rather than on being the same instant.
        out = out.filter((r) => {
          const a = Date.parse(String(r[key as string]));
          const b = Date.parse(String(value));
          return Number.isNaN(a) || Number.isNaN(b)
            ? String(r[key as string]) >= String(value)
            : a >= b;
        });
      }
    }

    // Later .order() calls are secondary keys; applying them in reverse with a
    // stable sort reproduces PostgREST's multi-key ordering.
    const orders = q.calls.filter(([m]) => m === 'order');
    for (const [, key, opts] of [...orders].reverse()) {
      const ascending = (opts as { ascending?: boolean } | undefined)?.ascending ?? true;
      out = [...out].sort((a, b) => {
        const av = a[key as string] as string | number;
        const bv = b[key as string] as string | number;
        if (av === bv) return 0;
        return (av < bv ? -1 : 1) * (ascending ? 1 : -1);
      });
    }

    const select = q.calls.find(([m]) => m === 'select');
    const head = (select?.[2] as { head?: boolean } | undefined)?.head === true;
    if (head) return { data: null, error: null, count: out.length };

    return { data: out, error: null, count: out.length };
  };

  const client = {
    from: vi.fn((table: string) => {
      const q: Query = { table, calls: [] };
      queries.push(q);

      const builder: Record<string, unknown> = {
        then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve(onFulfilled(resolve(q))),
      };
      for (const method of ['select', 'eq', 'in', 'gte', 'order', 'limit']) {
        builder[method] = (...args: unknown[]) => {
          q.calls.push([method, ...args]);
          return builder;
        };
      }
      return builder;
    }),
  };

  return { client, queries };
}

function useTables(tables: Record<string, Row[]>, errors: Record<string, string> = {}) {
  const { client, queries } = buildClient(tables, errors);
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);
  return queries;
}

// --- fixture builders -------------------------------------------------------

const course = (id: string, slug = `${id}-slug`) => ({
  id,
  slug,
  title_en: `Course ${id}`,
  title_jp: null,
});

const enrollment = (course_id: string, status: string, enrolled_at: string) => ({
  id: `enr-${course_id}`,
  user_id: USER,
  course_id,
  status,
  enrolled_at,
});

const week = (id: string, course_id: string, week_number: number, is_unlocked = true) => ({
  id,
  course_id,
  week_number,
  is_unlocked,
});

const session = (
  id: string,
  week_id: string,
  session_number: number | null,
  is_bonus = false,
) => ({
  id,
  week_id,
  session_number,
  is_bonus,
  title_en: `Session ${id}`,
  title_jp: null,
  duration_minutes: 45,
});

const completion = (course_id: string, item_id: string, completed_at: string, item_type = 'session') => ({
  user_id: USER,
  course_id,
  item_type,
  item_id,
  completed_at,
});

const open = (course_id: string, session_id: string, opened_at: string) => ({
  user_id: USER,
  course_id,
  session_id,
  opened_at,
});

/** One course, one unlocked week, two sessions. */
function simpleCourse(id: string) {
  return {
    course: course(id),
    weeks: [week(`${id}-w1`, id, 1)],
    sessions: [session(`${id}-s1`, `${id}-w1`, 1), session(`${id}-s2`, `${id}-w1`, 2)],
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getResumePoint', () => {
  it('returns none when the user has no enrolments', async () => {
    useTables({ enrollments: [] });
    await expect(getResumePoint(USER)).resolves.toEqual({ kind: 'none' });
  });

  it('never selects a refunded or cancelled enrolment', async () => {
    const a = simpleCourse('course-a');
    useTables({
      enrollments: [
        enrollment('course-a', 'refunded', '2026-07-01T00:00:00Z'),
        enrollment('course-b', 'cancelled', '2026-07-02T00:00:00Z'),
      ],
      courses: [a.course],
      course_session_opens: [],
      course_item_completions: [],
      course_weeks: a.weeks,
      course_sessions: a.sessions,
    });

    await expect(getResumePoint(USER)).resolves.toEqual({ kind: 'none' });
  });

  it('starts a fresh enrolment at lesson 1 of N', async () => {
    const a = simpleCourse('course-a');
    useTables({
      enrollments: [enrollment('course-a', 'active', '2026-07-01T00:00:00Z')],
      courses: [a.course],
      course_session_opens: [],
      course_item_completions: [],
      course_weeks: a.weeks,
      course_sessions: a.sessions,
    });

    const result = await getResumePoint(USER);
    expect(result).toMatchObject({
      kind: 'resume',
      course: { id: 'course-a' },
      session: { id: 'course-a-s1' },
      index: 1,
      total: 2,
    });
  });

  it('prefers the most recently opened course over the most recently progressed', async () => {
    const a = simpleCourse('course-a');
    const b = simpleCourse('course-b');
    useTables({
      enrollments: [
        enrollment('course-a', 'active', '2026-07-01T00:00:00Z'),
        enrollment('course-b', 'active', '2026-07-02T00:00:00Z'),
      ],
      courses: [a.course, b.course],
      // Opened A most recently; but progressed in B most recently.
      course_session_opens: [open('course-a', 'course-a-s1', '2026-07-10T00:00:00Z')],
      course_item_completions: [completion('course-b', 'course-b-s1', '2026-07-11T00:00:00Z')],
      course_weeks: [...a.weeks, ...b.weeks],
      course_sessions: [...a.sessions, ...b.sessions],
    });

    await expect(getResumePoint(USER)).resolves.toMatchObject({
      kind: 'resume',
      course: { id: 'course-a' },
    });
  });

  it('falls back to the most recently progressed course when nothing was opened', async () => {
    const a = simpleCourse('course-a');
    const b = simpleCourse('course-b');
    useTables({
      enrollments: [
        // B is the newer enrolment, but A has the newer progress.
        enrollment('course-a', 'active', '2026-07-01T00:00:00Z'),
        enrollment('course-b', 'active', '2026-07-05T00:00:00Z'),
      ],
      courses: [a.course, b.course],
      course_session_opens: [],
      course_item_completions: [completion('course-a', 'course-a-s1', '2026-07-11T00:00:00Z')],
      course_weeks: [...a.weeks, ...b.weeks],
      course_sessions: [...a.sessions, ...b.sessions],
    });

    await expect(getResumePoint(USER)).resolves.toMatchObject({
      kind: 'resume',
      course: { id: 'course-a' },
      session: { id: 'course-a-s2' },
      index: 2,
    });
  });

  it('falls back to the newest enrolment when there is no activity at all', async () => {
    const a = simpleCourse('course-a');
    const b = simpleCourse('course-b');
    useTables({
      enrollments: [
        enrollment('course-a', 'active', '2026-07-01T00:00:00Z'),
        enrollment('course-b', 'active', '2026-07-05T00:00:00Z'),
      ],
      courses: [a.course, b.course],
      course_session_opens: [],
      course_item_completions: [],
      course_weeks: [...a.weeks, ...b.weeks],
      course_sessions: [...a.sessions, ...b.sessions],
    });

    await expect(getResumePoint(USER)).resolves.toMatchObject({
      kind: 'resume',
      course: { id: 'course-b' },
    });
  });

  it('prefers an active enrolment over a completed one at the same tier', async () => {
    const a = simpleCourse('course-a');
    const b = simpleCourse('course-b');
    useTables({
      enrollments: [
        enrollment('course-a', 'completed', '2026-07-05T00:00:00Z'),
        enrollment('course-b', 'active', '2026-07-01T00:00:00Z'),
      ],
      courses: [a.course, b.course],
      course_session_opens: [],
      course_item_completions: [],
      course_weeks: [...a.weeks, ...b.weeks],
      course_sessions: [...a.sessions, ...b.sessions],
    });

    // A is the newer enrolment, but B is active — active wins.
    await expect(getResumePoint(USER)).resolves.toMatchObject({
      kind: 'resume',
      course: { id: 'course-b' },
    });
  });

  it('skips sessions in locked weeks and counts only unlocked ones', async () => {
    useTables({
      enrollments: [enrollment('course-a', 'active', '2026-07-01T00:00:00Z')],
      courses: [course('course-a')],
      course_session_opens: [],
      course_item_completions: [],
      course_weeks: [
        week('w1', 'course-a', 1, true),
        week('w2', 'course-a', 2, false), // locked
      ],
      course_sessions: [
        session('s1', 'w1', 1),
        session('s2', 'w2', 1), // locked week — never rendered, must not be a target
      ],
    });

    // total is 1, not 2: "Lesson n of N" must match what the student can see.
    await expect(getResumePoint(USER)).resolves.toMatchObject({
      kind: 'resume',
      session: { id: 's1' },
      index: 1,
      total: 1,
    });
  });

  it('ignores bonus sessions', async () => {
    useTables({
      enrollments: [enrollment('course-a', 'active', '2026-07-01T00:00:00Z')],
      courses: [course('course-a')],
      course_session_opens: [],
      course_item_completions: [],
      course_weeks: [week('w1', 'course-a', 1)],
      course_sessions: [
        session('bonus', 'w1', null, true),
        session('s1', 'w1', 1),
      ],
    });

    await expect(getResumePoint(USER)).resolves.toMatchObject({
      kind: 'resume',
      session: { id: 's1' },
      total: 1,
    });
  });

  it('falls through a course with no sessions to one that has them', async () => {
    const b = simpleCourse('course-b');
    useTables({
      enrollments: [
        enrollment('course-a', 'active', '2026-07-05T00:00:00Z'), // newest, but empty
        enrollment('course-b', 'active', '2026-07-01T00:00:00Z'),
      ],
      courses: [course('course-a'), b.course],
      course_session_opens: [],
      course_item_completions: [],
      course_weeks: [...b.weeks],
      course_sessions: [...b.sessions],
    });

    await expect(getResumePoint(USER)).resolves.toMatchObject({
      kind: 'resume',
      course: { id: 'course-b' },
    });
  });

  it('orders by week_number, then session_number, then id', async () => {
    useTables({
      enrollments: [enrollment('course-a', 'active', '2026-07-01T00:00:00Z')],
      courses: [course('course-a')],
      course_session_opens: [],
      course_item_completions: [],
      // Deliberately inserted out of order.
      course_weeks: [week('w2', 'course-a', 2), week('w1', 'course-a', 1)],
      course_sessions: [
        session('z-w2-s1', 'w2', 1),
        session('b-w1-s2', 'w1', 2),
        session('m-w1-s1', 'w1', 1),
        session('a-w1-s1', 'w1', 1), // same week+number as above; id breaks the tie
      ],
    });

    const result = await getResumePoint(USER);
    expect(result).toMatchObject({
      kind: 'resume',
      session: { id: 'a-w1-s1' },
      index: 1,
      total: 4,
    });
  });

  it('walks to the first incomplete session, not the first session', async () => {
    useTables({
      enrollments: [enrollment('course-a', 'active', '2026-07-01T00:00:00Z')],
      courses: [course('course-a')],
      course_session_opens: [],
      course_item_completions: [
        completion('course-a', 's1', '2026-07-10T00:00:00Z'),
        completion('course-a', 's2', '2026-07-11T00:00:00Z'),
      ],
      course_weeks: [week('w1', 'course-a', 1)],
      course_sessions: [session('s1', 'w1', 1), session('s2', 'w1', 2), session('s3', 'w1', 3)],
    });

    await expect(getResumePoint(USER)).resolves.toMatchObject({
      kind: 'resume',
      session: { id: 's3' },
      index: 3,
      total: 3,
    });
  });

  it('reports a finished course as completed, never as resume', async () => {
    useTables({
      enrollments: [enrollment('course-a', 'completed', '2026-07-01T00:00:00Z')],
      courses: [course('course-a')],
      course_session_opens: [],
      course_item_completions: [completion('course-a', 's1', '2026-07-10T00:00:00Z')],
      course_weeks: [week('w1', 'course-a', 1)],
      course_sessions: [session('s1', 'w1', 1)],
    });

    await expect(getResumePoint(USER)).resolves.toEqual({
      kind: 'completed',
      course: course('course-a'),
    });
  });

  it('reports an active course with every unlocked session done as caught_up, not completed', async () => {
    useTables({
      enrollments: [enrollment('course-a', 'active', '2026-07-01T00:00:00Z')],
      courses: [course('course-a')],
      course_session_opens: [],
      course_item_completions: [completion('course-a', 's1', '2026-07-10T00:00:00Z')],
      course_weeks: [
        week('w1', 'course-a', 1, true),
        week('w2', 'course-a', 2, false), // still locked — the student is not finished
      ],
      course_sessions: [session('s1', 'w1', 1), session('s2', 'w2', 1)],
    });

    await expect(getResumePoint(USER)).resolves.toEqual({
      kind: 'caught_up',
      course: course('course-a'),
    });
  });

  it('prefers a resumable course over a completed one', async () => {
    const b = simpleCourse('course-b');
    useTables({
      enrollments: [
        enrollment('course-a', 'completed', '2026-07-05T00:00:00Z'),
        enrollment('course-b', 'active', '2026-07-01T00:00:00Z'),
      ],
      courses: [course('course-a'), b.course],
      course_session_opens: [],
      course_item_completions: [completion('course-a', 'a-s1', '2026-07-10T00:00:00Z')],
      course_weeks: [week('wa', 'course-a', 1), ...b.weeks],
      course_sessions: [session('a-s1', 'wa', 1), ...b.sessions],
    });

    await expect(getResumePoint(USER)).resolves.toMatchObject({
      kind: 'resume',
      course: { id: 'course-b' },
    });
  });

  // Every read in the resume path must surface its failure: silently returning
  // `none` would tell a student with courses to "start your first course".
  it.each([
    ['enrollments', 'connection reset'],
    ['course_session_opens', 'opens unavailable'],
    ['courses', 'courses unavailable'],
    ['course_weeks', 'weeks unavailable'],
    ['course_sessions', 'sessions unavailable'],
  ])('throws when the %s read fails rather than degrading to none', async (table, message) => {
    const a = simpleCourse('course-a');
    useTables(
      {
        enrollments: [enrollment('course-a', 'active', '2026-07-01T00:00:00Z')],
        courses: [a.course],
        course_session_opens: [],
        course_item_completions: [],
        course_weeks: a.weeks,
        course_sessions: a.sessions,
      },
      { [table]: message },
    );

    await expect(getResumePoint(USER)).rejects.toThrow(message);
  });

  it('throws when the completions read fails', async () => {
    const a = simpleCourse('course-a');
    useTables(
      {
        enrollments: [enrollment('course-a', 'active', '2026-07-01T00:00:00Z')],
        courses: [a.course],
        course_session_opens: [],
        course_weeks: a.weeks,
        course_sessions: a.sessions,
      },
      { course_item_completions: 'completions unavailable' },
    );

    await expect(getResumePoint(USER)).rejects.toThrow('completions unavailable');
  });

  it('throws when an enrolled course cannot be read at all', async () => {
    // courses_public_read hides unpublished rows, so an enrolled student can hold
    // an enrolment whose course reads back as missing. That is an anomaly, not an
    // empty dashboard — it must not degrade into "start your first course".
    useTables({
      enrollments: [enrollment('course-a', 'active', '2026-07-01T00:00:00Z')],
      courses: [], // hidden by RLS
      course_session_opens: [],
      course_item_completions: [],
      course_weeks: [],
      course_sessions: [],
    });

    await expect(getResumePoint(USER)).rejects.toThrow('could not be resolved');
  });
});

describe('getLessonsCompletedThisWeek', () => {
  const now = new Date('2026-07-15T20:00:00Z'); // Wed, week starts Mon 2026-07-13 10:00Z

  it('counts session completions inside the Hawaii week', async () => {
    useTables({
      course_item_completions: [
        completion('course-a', 's1', '2026-07-13T10:00:00Z'), // exactly the boundary
        completion('course-a', 's2', '2026-07-15T02:00:00Z'),
      ],
    });

    await expect(getLessonsCompletedThisWeek(USER, now)).resolves.toBe(2);
  });

  it('excludes completions from before the Hawaii week boundary', async () => {
    useTables({
      course_item_completions: [
        completion('course-a', 's1', '2026-07-13T09:59:00Z'), // Sun 23:59 HST — last week
        completion('course-a', 's2', '2026-07-14T00:00:00Z'),
      ],
    });

    await expect(getLessonsCompletedThisWeek(USER, now)).resolves.toBe(1);
  });

  it('does not count completed assignments as lessons', async () => {
    useTables({
      course_item_completions: [
        completion('course-a', 's1', '2026-07-14T00:00:00Z'),
        completion('course-a', 'a1', '2026-07-14T00:00:00Z', 'assignment'),
        completion('course-a', 'a2', '2026-07-14T00:00:00Z', 'assignment'),
      ],
    });

    await expect(getLessonsCompletedThisWeek(USER, now)).resolves.toBe(1);
  });

  it('counts only the requesting user', async () => {
    useTables({
      course_item_completions: [
        completion('course-a', 's1', '2026-07-14T00:00:00Z'),
        { ...completion('course-a', 's2', '2026-07-14T00:00:00Z'), user_id: 'someone-else' },
      ],
    });

    await expect(getLessonsCompletedThisWeek(USER, now)).resolves.toBe(1);
  });

  it('throws instead of reporting a fabricated zero', async () => {
    useTables({ course_item_completions: [] }, { course_item_completions: 'read failed' });
    // This number lives in the hero. A silent 0 is the vanity zero the redesign
    // exists to remove, and the student cannot tell it from having done nothing.
    await expect(getLessonsCompletedThisWeek(USER, now)).rejects.toThrow('read failed');
  });
});
