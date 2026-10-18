import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('server-only', () => ({}));
const db = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: db.create }));
vi.mock('@/app/fonts', () => ({ inter: { variable: '' }, fraunces: { variable: '' } }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('not-found'); } }));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
import { POST } from '@/app/api/discover/start/route';
import { authorizeSession } from '@/lib/discover/session';
import DiscoverLayout from '@/app/app-site/discover/layout';

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe('Discovery excluded from launch', () => {
  it.each([undefined, 'false', '1'])('fails closed unless explicitly enabled (%s)', async value => {
    vi.stubEnv('DISCOVERY_ENABLED', value);
    const response = await POST(new NextRequest('http://localhost/api/discover/start', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(503);
    expect(await authorizeSession('existing-session')).toEqual({ ok: false, status: 503 });
    expect(db.create).not.toHaveBeenCalled();
    expect(() => DiscoverLayout({ children: null })).toThrow('not-found');
  });
  it('retains the layout for an explicitly enabled development deployment', () => {
    vi.stubEnv('DISCOVERY_ENABLED', 'true');
    expect(() => DiscoverLayout({ children: null })).not.toThrow();
  });
});
