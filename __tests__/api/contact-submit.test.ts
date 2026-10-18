// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/email/send', () => ({
  sendContactAdminNotification: vi.fn().mockResolvedValue(undefined),
  sendContactConfirmation: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from '@/app/api/contact/submit/route';
import { sendContactAdminNotification, sendContactConfirmation } from '@/lib/email/send';

const valid = { name: 'Visitor', email: 'visitor@example.com', message: 'Please tell me about your courses.' };
const request = (body: unknown) => new NextRequest('http://localhost/api/contact/submit', {
  method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
});

beforeEach(() => vi.clearAllMocks());

describe('contact submission', () => {
  it('honors the selected locale without relying on a Referer header', async () => {
    const response = await POST(request({ ...valid, source_locale: 'ja' }));
    expect(response.status).toBe(200);
    expect(sendContactAdminNotification).toHaveBeenCalledWith(expect.objectContaining({ locale: 'ja' }));
    expect(sendContactConfirmation).toHaveBeenCalledOnce();
  });

  it('does not report success or send confirmation when admin delivery fails', async () => {
    vi.mocked(sendContactAdminNotification).mockRejectedValueOnce(new Error('Provider unavailable'));
    const response = await POST(request(valid));
    expect(response.status).toBe(503);
    expect(sendContactConfirmation).not.toHaveBeenCalled();
  });

  it('waits for admin delivery before acknowledging the message', async () => {
    let finish!: () => void;
    vi.mocked(sendContactAdminNotification).mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
    let completed = false;
    const result = POST(request(valid)).then((response) => { completed = true; return response; });
    await vi.waitFor(() => expect(sendContactAdminNotification).toHaveBeenCalledOnce());
    expect(completed).toBe(false);
    expect(sendContactConfirmation).not.toHaveBeenCalled();
    finish();
    expect((await result).status).toBe(200);
  });

  it.each([
    null,
    { ...valid, email: 123 },
    { ...valid, email: 'invalid@' },
    { ...valid, name: '  ' },
    { ...valid, message: 'x'.repeat(2001) },
  ])('returns a client error for malformed input: %j', async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(sendContactAdminNotification).not.toHaveBeenCalled();
  });

  it('returns a client error for malformed JSON', async () => {
    const malformed = new NextRequest('http://localhost/api/contact/submit', { method: 'POST', body: '{' });
    expect((await POST(malformed)).status).toBe(400);
  });
});
