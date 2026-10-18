// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ sign: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  from: (table: string) => ({ select: () => ({ eq: () => table === 'esl_lessons'
    ? { maybeSingle: async () => ({ data: { id: 'lesson' } }) }
    : Promise.resolve({ data: [{ id: 'audio', storage_path: 'course/week/audio.mp3', public_url: 'https://old-public.test/audio' }] }),
  }) }),
  storage: { from: () => ({ createSignedUrls: mocks.sign }) },
}) }));
import { getESLLessonForWeek } from '@/lib/esl/queries';
beforeEach(() => vi.clearAllMocks());
describe('private ESL playback', () => {
  it('replaces obsolete public URLs with a short-lived authorized URL', async () => {
    mocks.sign.mockResolvedValue({ data: [{ path: 'course/week/audio.mp3', signedUrl: 'https://signed.test/audio?token=test' }], error: null });
    const lesson = await getESLLessonForWeek('week');
    expect(lesson?.audio[0].public_url).toBe('https://signed.test/audio?token=test');
    expect(mocks.sign).toHaveBeenCalledWith(['course/week/audio.mp3'], 3600);
    expect(JSON.stringify(lesson)).not.toContain('old-public.test');
  });
  it.each([{ data: null, error: { message: 'denied' } }, { data: [], error: null }])('fails closed if signing fails or omits a file', async result => {
    mocks.sign.mockResolvedValue(result);
    await expect(getESLLessonForWeek('week')).rejects.toThrow('Could not authorize lesson audio');
  });
});
