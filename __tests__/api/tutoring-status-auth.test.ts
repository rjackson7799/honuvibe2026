import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getUserMock, userRoleMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  userRoleMock: vi.fn(),
}));
const { privateInMock } = vi.hoisted(() => ({
  // Captures the exact report-id subset passed to session_report_private's
  // .in('report_id', ids) — the leak-regression assertion this file exists for.
  privateInMock: vi.fn(),
}));

interface AdminState {
  instructorProfile?: { id: string } | null;
  courseLinks?: { course_id: string }[];
  reports?: { id: string; status: string; course_id: string }[];
  privateRows?: { report_id: string; generation_error: string | null }[];
}
// Mutable per-test fixture read by the admin-client table dispatch below.
let adminState: AdminState = {};

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === 'users') {
        return { select: () => ({ eq: () => ({ single: userRoleMock }) }) };
      }
      throw new Error(`Unexpected user-client table: ${table}`);
    },
  }),
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'instructor_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: adminState.instructorProfile ?? null }),
            }),
          }),
        };
      }
      if (table === 'course_instructors') {
        return {
          select: () => ({
            eq: async () => ({ data: adminState.courseLinks ?? [] }),
          }),
        };
      }
      if (table === 'session_reports') {
        return {
          select: () => ({
            in: async (_col: string, ids: string[]) => ({
              data: (adminState.reports ?? []).filter((r) => ids.includes(r.id)),
            }),
          }),
        };
      }
      if (table === 'session_report_private') {
        return {
          select: () => ({
            in: async (_col: string, ids: string[]) => {
              privateInMock(ids);
              return {
                data: (adminState.privateRows ?? []).filter((p) => ids.includes(p.report_id)),
              };
            },
          }),
        };
      }
      throw new Error(`Unexpected admin-client table: ${table}`);
    },
  }),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/tutoring/status/route';

function req(reportIds: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/tutoring/status?reportIds=${encodeURIComponent(reportIds)}`,
  );
}

function asRole(role: string) {
  getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
  userRoleMock.mockResolvedValue({ data: { role } });
}

type StatusResponse = {
  reports: { id: string; status: string; generation_error: string | null }[];
};

describe('GET /api/tutoring/status — instructor scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminState = {};
  });

  it('returns 401 when unauthenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await GET(req('r1'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Not authenticated' });
  });

  it('returns 403 for a student', async () => {
    asRole('student');
    const res = await GET(req('r1'));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  it('returns every requested report unfiltered for an admin, across courses', async () => {
    asRole('admin');
    adminState = {
      reports: [
        { id: 'r-a', status: 'review', course_id: 'course-a' },
        { id: 'r-b', status: 'failed', course_id: 'course-b' },
      ],
      privateRows: [
        { report_id: 'r-a', generation_error: null },
        { report_id: 'r-b', generation_error: 'boom' },
      ],
    };
    const res = await GET(req('r-a,r-b'));
    expect(res.status).toBe(200);
    const json = (await res.json()) as StatusResponse;
    expect(json.reports).toHaveLength(2);
    expect(json.reports).toContainEqual({ id: 'r-a', status: 'review', generation_error: null });
    expect(json.reports).toContainEqual({ id: 'r-b', status: 'failed', generation_error: 'boom' });
    // Admin path is unfiltered: private errors fetched for the full request set.
    expect(privateInMock).toHaveBeenCalledWith(['r-a', 'r-b']);
  });

  it('scopes an instructor to their own courses and never queries private rows for the rest', async () => {
    asRole('instructor');
    adminState = {
      instructorProfile: { id: 'profile-1' },
      courseLinks: [{ course_id: 'course-a' }],
      reports: [
        { id: 'r-a', status: 'generating', course_id: 'course-a' },
        { id: 'r-b', status: 'failed', course_id: 'course-b' },
      ],
      privateRows: [
        { report_id: 'r-a', generation_error: null },
        { report_id: 'r-b', generation_error: 'someone else\'s secret error' },
      ],
    };
    const res = await GET(req('r-a,r-b'));
    expect(res.status).toBe(200);
    const json = (await res.json()) as StatusResponse;
    // Only the course-A report comes back; the course-B id is absent entirely.
    expect(json.reports).toEqual([
      { id: 'r-a', status: 'generating', generation_error: null },
    ]);
    expect(JSON.stringify(json)).not.toContain('r-b');
    expect(JSON.stringify(json)).not.toContain('secret');
    // Leak regression: the private-error query must only ever see the allowed
    // subset — never the unassigned course-B report id.
    expect(privateInMock).toHaveBeenCalledTimes(1);
    expect(privateInMock).toHaveBeenCalledWith(['r-a']);
  });

  it('returns an empty reports array for an instructor with no instructor_profiles row', async () => {
    asRole('instructor');
    adminState = {
      instructorProfile: null,
      reports: [{ id: 'r-a', status: 'review', course_id: 'course-a' }],
      privateRows: [{ report_id: 'r-a', generation_error: null }],
    };
    const res = await GET(req('r-a'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reports: [] });
    // Short-circuits before any report/private lookup.
    expect(privateInMock).not.toHaveBeenCalled();
  });

  it('returns an empty reports array when an instructor requests only unassigned reports', async () => {
    asRole('instructor');
    adminState = {
      instructorProfile: { id: 'profile-1' },
      courseLinks: [{ course_id: 'course-a' }],
      reports: [{ id: 'r-b', status: 'failed', course_id: 'course-b' }],
      privateRows: [{ report_id: 'r-b', generation_error: 'secret' }],
    };
    const res = await GET(req('r-b'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reports: [] });
    expect(privateInMock).not.toHaveBeenCalled();
  });
});
