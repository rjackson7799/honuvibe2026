import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getTutoringAccessForReportMock } = vi.hoisted(() => ({
  getTutoringAccessForReportMock: vi.fn(),
}));
const { applyPatternsForReportMock } = vi.hoisted(() => ({
  applyPatternsForReportMock: vi.fn(async () => {}),
}));
const { sendSessionReportReadyEmailMock } = vi.hoisted(() => ({
  sendSessionReportReadyEmailMock: vi.fn(async () => true),
}));
const { revalidatePathMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
}));
const {
  sessionReportsSelectMock,
  sessionReportsUpdateMock,
  sessionReportPrivateSelectMock,
  sessionReportPrivateUpdateMock,
  coursesSelectMock,
  usersSelectMock,
} = vi.hoisted(() => ({
  sessionReportsSelectMock: vi.fn(),
  sessionReportsUpdateMock: vi.fn(),
  sessionReportPrivateSelectMock: vi.fn(),
  sessionReportPrivateUpdateMock: vi.fn(),
  coursesSelectMock: vi.fn(),
  usersSelectMock: vi.fn(),
}));

vi.mock('@/lib/tutoring/auth', () => ({
  getTutoringAccessForReport: getTutoringAccessForReportMock,
}));
vi.mock('@/lib/tutoring/patterns', () => ({
  applyPatternsForReport: applyPatternsForReportMock,
}));
vi.mock('@/lib/email/send', () => ({
  sendSessionReportReadyEmail: sendSessionReportReadyEmailMock,
}));
vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}));

interface AdminState {
  report?: {
    id: string;
    course_id: string;
    student_id: string;
    session_date: string;
    status: string;
  } | null;
  flipped?: { id: string } | null;
  privateJson?: { instructor_json: unknown } | null;
  course?: { slug: string | null; title_en: string; title_jp: string | null } | null;
  student?: { email: string | null; full_name: string | null; locale_preference: string | null } | null;
}
// Mutable per-test fixture read by the admin-client table dispatch below.
let adminState: AdminState = {};

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'session_reports') {
        return {
          select: (...args: unknown[]) => {
            sessionReportsSelectMock(...args);
            return { eq: () => ({ maybeSingle: async () => ({ data: adminState.report ?? null }) }) };
          },
          update: (...args: unknown[]) => {
            sessionReportsUpdateMock(...args);
            return {
              eq: () => ({
                eq: () => ({
                  select: () => ({
                    maybeSingle: async () => ({ data: adminState.flipped ?? null }),
                  }),
                }),
              }),
            };
          },
        };
      }
      if (table === 'session_report_private') {
        return {
          select: (...args: unknown[]) => {
            sessionReportPrivateSelectMock(...args);
            return { eq: () => ({ maybeSingle: async () => ({ data: adminState.privateJson ?? null }) }) };
          },
          update: (...args: unknown[]) => {
            sessionReportPrivateUpdateMock(...args);
            return { eq: async () => ({ data: null, error: null }) };
          },
        };
      }
      if (table === 'courses') {
        return {
          select: (...args: unknown[]) => {
            coursesSelectMock(...args);
            return { eq: () => ({ maybeSingle: async () => ({ data: adminState.course ?? null }) }) };
          },
        };
      }
      if (table === 'users') {
        return {
          select: (...args: unknown[]) => {
            usersSelectMock(...args);
            return { eq: () => ({ maybeSingle: async () => ({ data: adminState.student ?? null }) }) };
          },
        };
      }
      throw new Error(`Unexpected admin-client table: ${table}`);
    },
  }),
}));

import { POST } from '@/app/api/tutoring/[reportId]/publish/route';

function req(body: Record<string, unknown> = {}): Request {
  return new Request('http://localhost/api/tutoring/r1/publish', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({ reportId: 'r1' }) };

describe('POST /api/tutoring/[reportId]/publish — access gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminState = {};
  });

  it('returns 401 when unauthenticated', async () => {
    getTutoringAccessForReportMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Not authenticated',
    });
    const res = await POST(req() as never, ctx as never);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Not authenticated' });
  });

  it('returns 403 for a student (or an unassigned instructor)', async () => {
    getTutoringAccessForReportMock.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });
    const res = await POST(req() as never, ctx as never);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  it('returns 404 for a missing report', async () => {
    getTutoringAccessForReportMock.mockResolvedValue({
      ok: false,
      status: 404,
      error: 'Report not found',
    });
    const res = await POST(req() as never, ctx as never);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Report not found' });
  });

  it('lets an assigned instructor publish: status flip + reviewed_by stamped with the caller userId', async () => {
    getTutoringAccessForReportMock.mockResolvedValue({
      ok: true,
      access: {
        role: 'instructor',
        userId: 'teacher-1',
        instructorProfileId: 'profile-1',
        courseId: 'course-1',
      },
    });
    adminState = {
      report: {
        id: 'r1',
        course_id: 'course-1',
        student_id: 'student-1',
        session_date: '2026-07-08',
        status: 'review',
      },
      flipped: { id: 'r1' },
      privateJson: { instructor_json: { trouble_spots: [] } },
      course: { slug: 'course-slug', title_en: 'Private Tutoring', title_jp: null },
      student: { email: 'student@example.com', full_name: 'Shiori', locale_preference: 'en' },
    };

    const res = await POST(req() as never, ctx as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; emailed: boolean };
    expect(json).toEqual({ ok: true, emailed: true });

    // Status flip is atomic on ('id', reportId) + ('status', 'review').
    expect(sessionReportsUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'published' }),
    );
    // reviewed_by stamps the GATE's resolved caller id, not a hardcoded admin.
    expect(sessionReportPrivateUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ reviewed_by: 'teacher-1' }),
    );
    expect(applyPatternsForReportMock).toHaveBeenCalledTimes(1);
    expect(sendSessionReportReadyEmailMock).toHaveBeenCalledTimes(1);

    // New instructor-portal revalidation paths (+ /ja) added alongside admin's.
    expect(revalidatePathMock).toHaveBeenCalledWith('/instructor/tutoring/course-1');
    expect(revalidatePathMock).toHaveBeenCalledWith('/instructor/tutoring/course-1/reports/r1');
    expect(revalidatePathMock).toHaveBeenCalledWith('/ja/instructor/tutoring/course-1');
    expect(revalidatePathMock).toHaveBeenCalledWith('/ja/instructor/tutoring/course-1/reports/r1');
  });

  it('still lets an admin publish (unchanged behavior)', async () => {
    getTutoringAccessForReportMock.mockResolvedValue({
      ok: true,
      access: { role: 'admin', userId: 'admin-1', instructorProfileId: null, courseId: 'course-1' },
    });
    adminState = {
      report: {
        id: 'r1',
        course_id: 'course-1',
        student_id: 'student-1',
        session_date: '2026-07-08',
        status: 'review',
      },
      flipped: { id: 'r1' },
      privateJson: { instructor_json: { trouble_spots: [] } },
      course: { slug: 'course-slug', title_en: 'Private Tutoring', title_jp: null },
      student: { email: 'student@example.com', full_name: 'Shiori', locale_preference: 'en' },
    };

    const res = await POST(req() as never, ctx as never);
    expect(res.status).toBe(200);
    expect(sessionReportPrivateUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ reviewed_by: 'admin-1' }),
    );
  });

  it('returns 409 when the report is not in review status', async () => {
    getTutoringAccessForReportMock.mockResolvedValue({
      ok: true,
      access: { role: 'admin', userId: 'admin-1', instructorProfileId: null, courseId: 'course-1' },
    });
    adminState = {
      report: {
        id: 'r1',
        course_id: 'course-1',
        student_id: 'student-1',
        session_date: '2026-07-08',
        status: 'generating',
      },
    };
    const res = await POST(req() as never, ctx as never);
    expect(res.status).toBe(409);
  });
});
