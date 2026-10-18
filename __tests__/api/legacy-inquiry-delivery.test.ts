// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ admin: vi.fn(), confirmation: vi.fn() }));
vi.mock('@/lib/email/send', () => ({
  sendHonuHubContactConfirmation: mocks.confirmation,
  sendHonuHubContactAdminNotification: mocks.admin,
  sendExplorationInquiryConfirmation: mocks.confirmation,
  sendExplorationInquiryAdminNotification: mocks.admin,
}));
import { POST as honuhub } from '@/app/api/honuhub/contact/route';
import { POST as exploration } from '@/app/api/exploration/inquiry/route';
const valid = { name: 'Visitor', email: 'visitor@example.com', message: 'Hello', source_locale: 'ja' };
const request = (body: unknown) => new NextRequest('http://localhost/api/inquiry', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => {
  mocks.admin.mockReset().mockResolvedValue(undefined);
  mocks.confirmation.mockReset().mockResolvedValue(undefined);
});
describe.each([['HonuHub', honuhub], ['Exploration', exploration]] as const)('%s inquiries', (_name, post) => {
  it.each([{ name: {} }, { email: [] }, { email: 'invalid@' }, { message: 'x'.repeat(5001) }])('rejects invalid input %j', async (patch) => {
    expect((await post(request({ ...valid, ...patch }))).status).toBe(400);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('uses the explicit locale and confirms only after admin delivery', async () => {
    expect((await post(request(valid))).status).toBe(200);
    expect(mocks.admin).toHaveBeenCalledWith(expect.objectContaining({ locale: 'ja' }));
    expect(mocks.admin.mock.invocationCallOrder[0]).toBeLessThan(mocks.confirmation.mock.invocationCallOrder[0]);
  });
  it('returns a retryable failure without sending a false confirmation', async () => {
    mocks.admin.mockRejectedValue(new Error('Unavailable'));
    expect((await post(request(valid))).status).toBe(503);
    expect(mocks.confirmation).not.toHaveBeenCalled();
  });
});
