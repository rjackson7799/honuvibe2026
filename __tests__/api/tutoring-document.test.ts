import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getUserMock, fromMock, roleSingleMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
  roleSingleMock: vi.fn(),
}));
const { getReportForAdminMock, getTutoringCourseMock } = vi.hoisted(() => ({
  getReportForAdminMock: vi.fn(),
  getTutoringCourseMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
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
  getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
  roleSingleMock.mockResolvedValue({ data: { role: 'admin' } });
  fromMock.mockReturnValue({ select: () => ({ eq: () => ({ single: roleSingleMock }) }) });
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
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await GET(req('?variant=student&format=pdf') as never, ctx as never);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-admin', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    roleSingleMock.mockResolvedValue({ data: { role: 'student' } });
    fromMock.mockReturnValue({ select: () => ({ eq: () => ({ single: roleSingleMock }) }) });
    const res = await GET(req('?variant=student&format=pdf') as never, ctx as never);
    expect(res.status).toBe(403);
  });

  it('returns 409 when status is not review/published', async () => {
    asAdmin();
    getReportForAdminMock.mockResolvedValue({ ...fullReport, status: 'generating' });
    const res = await GET(req('?variant=teacher&format=pdf') as never, ctx as never);
    expect(res.status).toBe(409);
  });

  it('returns a PDF attachment on the happy path', async () => {
    asAdmin();
    getReportForAdminMock.mockResolvedValue(fullReport);
    const res = await GET(req('?variant=student&format=pdf') as never, ctx as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
  });
});
