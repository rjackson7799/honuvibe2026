// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), sign: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'teacher' } } }) },
  rpc: mocks.rpc,
  from: (table: string) => ({ select: () => ({ eq: () => table === 'esl_audio'
    ? Promise.resolve({ data: [{ id: 'audio', storage_path: 'course/week/audio.mp3', public_url: 'https://old-public.test/audio' }] })
    : { single: async () => ({ data: table === 'users' ? { role: 'instructor' } : { id: 'lesson', course_id: 'course' } }) },
  }) }),
  storage: { from: () => ({ createSignedUrls: mocks.sign }) },
}) }));
import { GET } from '@/app/api/admin/esl/[lessonId]/route';
const request = () => GET(new NextRequest('http://localhost/api/admin/esl/lesson'), { params: Promise.resolve({ lessonId: 'lesson' }) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.sign.mockResolvedValue({ data: [{ path: 'course/week/audio.mp3', signedUrl: 'https://signed.test/audio' }], error: null });
});
describe('admin ESL preview shares private playback authorization', () => {
  it('preserves assigned teacher preview with signed playback', async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const body = await response.text();
    expect(body).toContain('https://signed.test/audio');
    expect(body).not.toContain('old-public.test');
    expect(mocks.rpc).toHaveBeenCalledWith('can_manage_course', { p_course: 'course' });
    expect(mocks.sign).toHaveBeenCalledWith(['course/week/audio.mp3'], 3600);
  });
  it('denies an unassigned purchaser before signing audio', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    expect((await request()).status).toBe(403);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it('does not fall back to public URLs on a storage failure', async () => {
    mocks.sign.mockResolvedValue({ data: null, error: { message: 'denied' } });
    const response = await request();
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('old-public.test');
  });
});
