import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getTutoringAccessForReportMock } = vi.hoisted(() => ({
  getTutoringAccessForReportMock: vi.fn(),
}));
const { getReportForAdminMock, getTutoringCourseMock } = vi.hoisted(() => ({
  getReportForAdminMock: vi.fn(),
  getTutoringCourseMock: vi.fn(),
}));

vi.mock('@/lib/tutoring/auth', () => ({
  getTutoringAccessForReport: getTutoringAccessForReportMock,
}));
vi.mock('@/lib/tutoring/queries', () => ({
  getReportForAdmin: getReportForAdminMock,
  getTutoringCourse: getTutoringCourseMock,
}));
vi.mock('@/lib/tutoring/generate-report-pdf', () => ({
  generateReportPdf: vi.fn(async () => Buffer.from('%PDF-stub')),
}));
vi.mock('@/lib/tutoring/generate-report-docx', () => ({
  generateReportDocx: vi.fn(async () => Buffer.from('PK-stub')),
}));

import { GET } from '@/app/api/tutoring/[reportId]/document/route';

function req(query: string): Request {
  return new Request(`http://localhost/api/tutoring/r1/document${query}`);
}
const ctx = { params: Promise.resolve({ reportId: 'r1' }) };

function asAdmin() {
  getTutoringAccessForReportMock.mockResolvedValue({
    ok: true,
    access: { role: 'admin', userId: 'u1', instructorProfileId: null, courseId: 'c1' },
  });
}
function asAssignedInstructor() {
  getTutoringAccessForReportMock.mockResolvedValue({
    ok: true,
    access: { role: 'instructor', userId: 'teacher-1', instructorProfileId: 'profile-1', courseId: 'c1' },
  });
}
function asUnauthenticated() {
  getTutoringAccessForReportMock.mockResolvedValue({
    ok: false,
    status: 401,
    error: 'Not authenticated',
  });
}
function asStudent() {
  getTutoringAccessForReportMock.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });
}
function asUnassignedInstructor() {
  getTutoringAccessForReportMock.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });
}

const fullReport = {
  status: 'review',
  session_date: '2026-07-08',
  topic: 'Articles',
  duration_minutes: 60,
  course_id: 'c1',
  student_id: 's1',
  student_json: { snapshot: { summary_en: 'x', summary_jp: 'x' }, wins: [], trouble_spots: [], recurring_patterns: [], study_areas: [], vocabulary: [], grammar_points: [], homework: [], next_session_focus: { focus_en: 'x', focus_jp: 'x' } },
  private: { instructor_json: { snapshot: { summary_en: 'x', summary_jp: 'x' }, wins: [], trouble_spots: [], recurring_patterns: [], study_areas: [], vocabulary: [], grammar_points: [], homework: [], next_session_focus: { focus_en: 'x', focus_jp: 'x' }, instructor_analysis: 'secret' }, margin_notes: null },
};

describe('GET /api/tutoring/[reportId]/document', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTutoringCourseMock.mockResolvedValue({ title_en: 'Private Tutoring', student: { full_name: 'Shiori' } });
  });

  it('rejects an invalid variant with 400', async () => {
    asAdmin();
    const res = await GET(req('?variant=nope&format=pdf') as never, ctx as never);
    expect(res.status).toBe(400);
  });

  it('rejects an invalid format with 400', async () => {
    asAdmin();
    const res = await GET(req('?variant=student&format=xls') as never, ctx as never);
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    asUnauthenticated();
    const res = await GET(req('?variant=student&format=pdf') as never, ctx as never);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a student', async () => {
    asStudent();
    const res = await GET(req('?variant=student&format=pdf') as never, ctx as never);
    expect(res.status).toBe(403);
  });

  it('returns 403 for an unassigned instructor', async () => {
    asUnassignedInstructor();
    const res = await GET(req('?variant=student&format=pdf') as never, ctx as never);
    expect(res.status).toBe(403);
  });

  it('returns 409 when status is not review/published', async () => {
    asAdmin();
    getReportForAdminMock.mockResolvedValue({ ...fullReport, status: 'generating' });
    const res = await GET(req('?variant=teacher&format=pdf') as never, ctx as never);
    expect(res.status).toBe(409);
  });

  it('returns a PDF attachment on the happy path for an admin', async () => {
    asAdmin();
    getReportForAdminMock.mockResolvedValue(fullReport);
    const res = await GET(req('?variant=student&format=pdf') as never, ctx as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
  });

  it('returns a PDF attachment on the happy path for an assigned instructor', async () => {
    asAssignedInstructor();
    getReportForAdminMock.mockResolvedValue(fullReport);
    const res = await GET(req('?variant=student&format=pdf') as never, ctx as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
  });
});
