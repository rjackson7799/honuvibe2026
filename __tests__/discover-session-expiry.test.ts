// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ single: vi.fn(), cookie: 'session:secret' }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: mocks.cookie }) }) }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) }) }),
}));
import { authorizeSession, hashSecret } from '@/lib/discover/session';

beforeEach(() => {
  vi.stubEnv('DISCOVERY_ENABLED', 'true');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'mock-only');
  mocks.cookie = 'session:secret';
});

describe('Discovery session expiry', () => {
  it.each([null, 'invalid', '2000-01-01T00:00:00Z'])('rejects expiry %s even with the correct secret', async (expires_at) => {
    mocks.single.mockResolvedValue({ data: { session_secret_hash: hashSecret('secret'), expires_at }, error: null });
    expect(await authorizeSession('session')).toEqual({ ok: false, status: 403 });
  });
  it('accepts an unexpired session with its correct cookie', async () => {
    mocks.single.mockResolvedValue({ data: { session_secret_hash: hashSecret('secret'), expires_at: '2099-01-01T00:00:00Z' }, error: null });
    expect(await authorizeSession('session')).toMatchObject({ ok: true });
  });
  it('rejects the wrong secret and a different session cookie', async () => {
    mocks.single.mockResolvedValue({ data: { session_secret_hash: hashSecret('different'), expires_at: '2099-01-01T00:00:00Z' }, error: null });
    expect(await authorizeSession('session')).toEqual({ ok: false, status: 403 });
    mocks.cookie = 'other:secret';
    expect(await authorizeSession('session')).toEqual({ ok: false, status: 403 });
  });
});
