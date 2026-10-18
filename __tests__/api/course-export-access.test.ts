// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ access: vi.fn(), adminCourse: vi.fn(), publicCourse: vi.fn(), adminClient: vi.fn(), pdf: vi.fn(), notes: vi.fn(), presentation: vi.fn() }));
vi.mock('@/lib/tutoring/auth', () => ({ getTutoringAccess: mocks.access }));
vi.mock('@/lib/courses/queries', () => ({ getAdminCourseById: mocks.adminCourse, getCourseWithCurriculum: mocks.publicCourse }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: mocks.adminClient,
  createClient: async () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { slug: 'unlisted' } }) }) }) }) }),
}));
vi.mock('@/lib/syllabus/generate-pdf', () => ({ generateSyllabusPdf: mocks.pdf }));
vi.mock('@/lib/teaching-materials/generate-notes', () => ({ generateTeacherNotes: mocks.notes }));
vi.mock('@/lib/teaching-materials/generate-presentation', () => ({ generatePresentation: mocks.presentation }));
import { GET as syllabus } from '@/app/api/courses/[courseId]/syllabus/route';
import { GET as notes } from '@/app/api/courses/[courseId]/sessions/[sessionId]/notes/route';
import { GET as presentation } from '@/app/api/courses/[courseId]/sessions/[sessionId]/presentation/route';

const params = Promise.resolve({ courseId: 'course', sessionId: 'session' });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });
  mocks.adminCourse.mockResolvedValue({ id: 'course', slug: 'unlisted', is_published: false, weeks: [], bonusSessions: [] });
  mocks.pdf.mockResolvedValue(Buffer.from('test PDF'));
});
describe('course export access', () => {
  it.each([['notes', notes], ['presentation', presentation]] as const)('preserves assigned teacher Japanese %s exports', async (_name, route) => {
    mocks.access.mockResolvedValue({ ok: true, access: { role: 'instructor' } });
    mocks.adminCourse.mockResolvedValue({ id: 'course', title_en: 'English', title_jp: '日本語', weeks: [{ sessions: [{ id: 'session', session_number: 1, title_en: 'Session', title_jp: '授業' }], resources: [] }] });
    mocks.notes.mockResolvedValue(Buffer.from('document'));
    mocks.presentation.mockResolvedValue(Buffer.from('document'));
    const result = await route(new NextRequest('http://localhost/export?locale=ja'), { params });
    expect(result.status).toBe(200);
    expect(result.headers.get('cache-control')).toBe('private, no-store');
    const generator = _name === 'notes' ? mocks.notes : mocks.presentation;
    expect(generator).toHaveBeenCalledWith(expect.objectContaining({ courseName: '日本語', sessionTitle: '授業', locale: 'ja' }));
  });
  it.each([['notes',notes], ['presentation',presentation]] as const)('rejects unrelated instructors before loading %s', async (_name, route) => {
    const result = await route(new NextRequest('http://localhost/export'), { params });
    expect(result.status).toBe(403); expect(mocks.access).toHaveBeenCalledWith('course');
    expect(mocks.adminCourse).not.toHaveBeenCalled();
    expect(mocks.notes).not.toHaveBeenCalled(); expect(mocks.presentation).not.toHaveBeenCalled();
  });
  it('requires scoped staff access for a draft syllabus preview', async () => {
    const result = await syllabus(new NextRequest('http://localhost/syllabus?preview=true'), { params });
    expect(result.status).toBe(403); expect(mocks.adminCourse).not.toHaveBeenCalled();
  });
  it('serves a staff draft preview privately without publishing it to storage', async () => {
    mocks.access.mockResolvedValue({ ok: true, access: { role: 'admin' } });
    const result = await syllabus(new NextRequest('http://localhost/syllabus?preview=true'), { params });
    expect(result.status).toBe(200); expect(result.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.pdf).toHaveBeenCalled(); expect(mocks.adminClient).not.toHaveBeenCalled();
  });
  it('preserves public cached syllabi through the safe curriculum query', async () => {
    mocks.publicCourse.mockResolvedValue({ slug: 'unlisted', is_published: true, syllabus_url_en: 'https://public.test/syllabus.pdf' });
    const result = await syllabus(new NextRequest('http://localhost/syllabus'), { params });
    expect(result.status).toBe(307); expect(result.headers.get('location')).toBe('https://public.test/syllabus.pdf');
    expect(mocks.publicCourse).toHaveBeenCalledWith('unlisted'); expect(mocks.adminCourse).not.toHaveBeenCalled();
  });
});
