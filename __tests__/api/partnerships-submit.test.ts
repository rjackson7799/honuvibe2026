import { describe, it, expect, vi, beforeEach } from 'vitest';

const { insertMock, fromMock, sendConfirmationMock, sendAdminNotifyMock } =
  vi.hoisted(() => ({
    insertMock: vi.fn(),
    fromMock: vi.fn(),
    sendConfirmationMock: vi.fn(),
    sendAdminNotifyMock: vi.fn(),
  }));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

vi.mock('@/lib/email/send', () => ({
  sendPartnershipInquiryConfirmation: sendConfirmationMock,
  sendPartnershipInquiryAdminNotification: sendAdminNotifyMock,
}));

import { POST } from '@/app/api/partnerships/submit/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/partnerships/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  full_name: 'Aiko Tanaka',
  email: 'aiko@example.com',
  organization: 'Vertice Society',
  website: 'https://example.com',
  org_type: 'professional_network',
  community_description: 'Tokyo-based professionals interested in AI.',
  program_description: 'A 5-week bilingual cohort for our members.',
  audience_size: '10_25',
  language: 'bilingual',
  timeline: '1_3_months',
  referral_source: 'referral',
  source_locale: 'en',
};

describe('POST /api/partnerships/submit', () => {
  beforeEach(() => {
    insertMock.mockReset().mockResolvedValue({ error: null });
    fromMock.mockReset().mockImplementation(() => ({ insert: insertMock }));
    sendConfirmationMock.mockReset().mockResolvedValue(undefined);
    sendAdminNotifyMock.mockReset().mockResolvedValue(undefined);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
  });

  it('accepts a valid payload, inserts a row, and queues both emails', async () => {
    const res = await POST(makeRequest(validPayload) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean };
    expect(json.success).toBe(true);

    expect(fromMock).toHaveBeenCalledWith('partnership_inquiries');
    expect(insertMock).toHaveBeenCalledTimes(1);
    const inserted = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.organization).toBe('Vertice Society');
    expect(inserted.org_type).toBe('professional_network');
    expect(inserted.source_locale).toBe('en');

    // Emails are fire-and-forget; allow microtasks to run.
    await Promise.resolve();
    expect(sendConfirmationMock).toHaveBeenCalledTimes(1);
    expect(sendAdminNotifyMock).toHaveBeenCalledTimes(1);

    const emailData = sendConfirmationMock.mock.calls[0][0];
    expect(emailData.fullName).toBe('Aiko Tanaka');
    expect(emailData.orgTypeLabel).toBe('Professional Network');
    expect(emailData.timelineLabel).toBe('1–3 months');
  });

  it('rejects an invalid email with 400 + Zod issues', async () => {
    const res = await POST(
      makeRequest({ ...validPayload, email: 'not-an-email' }) as never,
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string; issues: unknown };
    expect(json.error).toBe('Invalid input');
    expect(json.issues).toBeTruthy();
    expect(insertMock).not.toHaveBeenCalled();
    expect(sendConfirmationMock).not.toHaveBeenCalled();
  });

  it('rejects when a required field is missing', async () => {
    const { organization: _omit, ...withoutOrganization } = validPayload;
    void _omit;
    const res = await POST(makeRequest(withoutOrganization) as never);
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('uses Japanese labels when source_locale is ja', async () => {
    const res = await POST(
      makeRequest({ ...validPayload, source_locale: 'ja' }) as never,
    );
    expect(res.status).toBe(200);
    await Promise.resolve();
    const emailData = sendAdminNotifyMock.mock.calls[0][0];
    expect(emailData.locale).toBe('ja');
    expect(emailData.orgTypeLabel).toBe('プロフェッショナルネットワーク');
  });

  it('coerces an empty website string to null', async () => {
    const res = await POST(
      makeRequest({ ...validPayload, website: '' }) as never,
    );
    expect(res.status).toBe(200);
    const inserted = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.website).toBeNull();
  });
});
