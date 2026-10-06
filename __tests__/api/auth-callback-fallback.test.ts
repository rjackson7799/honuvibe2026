import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }));
vi.mock('@/lib/email/send', () => ({ sendStudentOnboardingEmail: vi.fn() }));

import { GET } from '@/app/api/auth/callback/route';

/**
 * Implicit-flow magic links reach /api/auth/callback with no ?code (the tokens
 * ride in the #hash, which the server never sees). The fallback hop to /signin
 * must keep a safe ?redirect so AuthForm can land the visitor back on the
 * join page or portal they started from.
 */
describe('GET /api/auth/callback without a code', () => {
  it('forwards a safe redirect to /signin', async () => {
    const res = await GET(new Request('http://localhost/api/auth/callback?redirect=%2Fjoin%2FABCD2345'));
    expect(res.headers.get('location')).toBe('http://localhost/signin?redirect=%2Fjoin%2FABCD2345');
  });

  it('drops an unsafe redirect', async () => {
    const res = await GET(new Request('http://localhost/api/auth/callback?redirect=https%3A%2F%2Fevil.example'));
    expect(res.headers.get('location')).toBe('http://localhost/signin');
  });

  it('goes to bare /signin with no redirect', async () => {
    const res = await GET(new Request('http://localhost/api/auth/callback'));
    expect(res.headers.get('location')).toBe('http://localhost/signin');
  });
});
