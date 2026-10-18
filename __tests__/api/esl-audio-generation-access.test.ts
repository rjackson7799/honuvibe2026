// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), after: vi.fn(), generate: vi.fn() }));
vi.mock('next/server', async (original) => ({ ...await original<typeof import('next/server')>(), after: mocks.after }));
vi.mock('@/lib/esl/tts', () => ({ generateAllAudioForLesson: mocks.generate }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'teacher' } } }) },
  rpc: mocks.rpc,
  from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: table === 'users'
    ? { role: 'instructor' } : table === 'esl_lessons' ? { id: 'lesson', course_id: 'course', week_id: 'week' }
    : null }) }) }) }),
}) }));
import { POST } from '@/app/api/esl/audio/generate/route';
beforeEach(() => vi.clearAllMocks());
const request = () => new NextRequest('http://localhost/api/esl/audio/generate', { method: 'POST', body: JSON.stringify({ eslLessonId: 'lesson' }) });
describe('audio generation requires course management, not lesson read access', () => {
  it.each([{ data: false, error: null }, { data: null, error: { message: 'unavailable' } }])('denies purchasers and unavailable authorization before scheduling TTS', async result => {
    mocks.rpc.mockResolvedValue(result);
    expect((await POST(request())).status).toBe(403);
    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('preserves assigned instructor generation', async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    expect((await POST(request())).status).toBe(202);
    expect(mocks.rpc).toHaveBeenCalledWith('can_manage_course', { p_course: 'course' });
    expect(mocks.after).toHaveBeenCalledOnce();
    await mocks.after.mock.calls[0][0]();
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ id: 'lesson' }), 'course', 'week', 'nova');
  });
});
