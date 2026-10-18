// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), send: vi.fn(), update: vi.fn(), provider: true }));
vi.mock('@/lib/discover/session', () => ({ authorizeSession: mocks.auth }));
vi.mock('@/lib/discover/otp', () => ({
  newVerificationCode: () => '123456',
  hashVerificationCode: (lead: string, code: string) => `hash:${lead}:${code}`,
}));
vi.mock('@/lib/email/client', () => ({
  getResendClient: () => mocks.provider ? { emails: { send: mocks.send } } : null,
  getFromAddress: () => 'test@example.com',
}));
import { POST as verify } from '@/app/api/discover/verify/[sessionId]/route';
import { POST as send } from '@/app/api/discover/verify/[sessionId]/send/route';
import { NextRequest } from 'next/server';

const params = { params: Promise.resolve({ sessionId: 'session' }) };
const request = (body: unknown = {}) => new NextRequest('http://localhost/api/discover/verify/session', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => {
  mocks.provider = true;
  mocks.rpc.mockReset().mockResolvedValue({ data: true, error: null });
  mocks.send.mockReset().mockResolvedValue({ error: null });
  mocks.update.mockReset().mockReturnValue({ eq: async () => ({ error: null }) });
  mocks.auth.mockReset().mockResolvedValue({
    ok: true, session: { lead_id: 'lead' }, supabase: {
      rpc: mocks.rpc,
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { email: 'stored@example.com' }, error: null }) }) }),
        update: mocks.update,
      }),
    },
  });
});
it('rejects an arbitrary six-digit code when the database rejects its hash', async () => {
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  expect((await verify(request({ code: '000000' }), params)).status).toBe(400);
  expect(mocks.rpc).toHaveBeenCalledWith('verify_discovery_email_otp', { p_lead_id: 'lead', p_code_hash: 'hash:lead:000000' });
  expect(mocks.update).not.toHaveBeenCalled();
});
it('returns success only for a verified code', async () => {
  expect((await verify(request({ code: '123456' }), params)).status).toBe(200);
});
it('requires session authorization on both routes', async () => {
  mocks.auth.mockResolvedValue({ ok: false, status: 403 });
  expect((await verify(request({ code: '123456' }), params)).status).toBe(403);
  expect((await send(request(), params)).status).toBe(403);
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
});
it('sends only to the lead email stored for the authorized session', async () => {
  mocks.rpc.mockResolvedValue({ data: 'otp-id', error: null });
  expect((await send(request({ email: 'attacker@example.com' }), params)).status).toBe(200);
  expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'stored@example.com', text: expect.stringContaining('123456') }));
});
it('does not email when issuance is rate limited', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  expect((await send(request(), params)).status).toBe(429);
  expect(mocks.send).not.toHaveBeenCalled();
});
it('reports provider failure and invalidates the reserved code', async () => {
  mocks.rpc.mockResolvedValue({ data: 'otp-id', error: null });
  mocks.send.mockResolvedValue({ error: { message: 'unavailable' } });
  expect((await send(request(), params)).status).toBe(503);
  expect(mocks.update).toHaveBeenCalledWith({ consumed_at: expect.any(String) });
});
it('fails closed when no email provider is configured', async () => {
  mocks.provider = false;
  expect((await send(request(), params)).status).toBe(503);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
