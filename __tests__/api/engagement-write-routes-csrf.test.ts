import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// The cookie-authenticated WRITE routes reject a cross-site request BEFORE any
// authorization or DB work. Sec-Fetch-Site is defence in depth on top of
// SameSite=Lax: reject only when the header is present AND cross-site; an
// absent header (Safari < 16.4) passes through to the normal auth path.

const { authorizeMock } = vi.hoisted(() => ({ authorizeMock: vi.fn() }));

vi.mock('@/lib/studio/engagement/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/studio/engagement/session')>();
  return { ...actual, authorizeSession: authorizeMock };
});
vi.mock('@/lib/community/rate-limit', () => ({ tryConsume: () => true }));
vi.mock('@/lib/studio/engagement/brief', () => ({ runBrief: vi.fn() }));
vi.mock('@/lib/studio/engagement/notify', () => ({ notifySubmission: vi.fn() }));
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: vi.fn() };
});

import { POST as answerPost } from '@/app/api/engagement/[id]/answer/route';
import { POST as submitPost } from '@/app/api/engagement/[id]/submit/route';

const ID = '3f2a1c9e-0b7d-4e6a-9c1f-2d8b7a6e5f40';

function req(path: string, headers: Record<string, string>, body: unknown): NextRequest {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const params = Promise.resolve({ id: ID });

beforeEach(() => {
  authorizeMock.mockReset();
  // Whatever the request, the (mocked) session layer says no — the point of
  // these tests is WHETHER it is consulted, not what it answers.
  authorizeMock.mockResolvedValue({ ok: false, status: 403 });
});

describe('POST /api/engagement/[id]/answer', () => {
  it('rejects a cross-site request before consulting the session', async () => {
    const res = await answerPost(req(`/api/engagement/${ID}/answer`, { 'sec-fetch-site': 'cross-site' }, { question_id: 'about', answer: 'x', questions_version: 1 }), { params });
    expect(res.status).toBe(403);
    expect(authorizeMock).not.toHaveBeenCalled();
  });

  it.each(['same-origin', 'same-site', 'none'])('lets a %s request through to the session check', async (site) => {
    const res = await answerPost(req(`/api/engagement/${ID}/answer`, { 'sec-fetch-site': site }, { question_id: 'about', answer: 'x', questions_version: 1 }), { params });
    expect(res.status).toBe(403); // the mocked session says no — but it WAS asked
    expect(authorizeMock).toHaveBeenCalledWith(ID);
  });

  it('lets a request WITHOUT the header through (older Safari)', async () => {
    await answerPost(req(`/api/engagement/${ID}/answer`, {}, { question_id: 'about', answer: 'x', questions_version: 1 }), { params });
    expect(authorizeMock).toHaveBeenCalledWith(ID);
  });
});

describe('POST /api/engagement/[id]/submit', () => {
  it('rejects a cross-site request before consulting the session', async () => {
    const res = await submitPost(req(`/api/engagement/${ID}/submit`, { 'sec-fetch-site': 'cross-site' }, { company_url: '' }), { params });
    expect(res.status).toBe(403);
    expect(authorizeMock).not.toHaveBeenCalled();
  });

  it('lets a same-origin request through to the session check', async () => {
    const res = await submitPost(req(`/api/engagement/${ID}/submit`, { 'sec-fetch-site': 'same-origin' }, { company_url: '' }), { params });
    expect(res.status).toBe(403);
    expect(authorizeMock).toHaveBeenCalledWith(ID);
  });

  it('answers the honeypot with a silent fake success and never touches the session', async () => {
    const res = await submitPost(req(`/api/engagement/${ID}/submit`, { 'sec-fetch-site': 'same-origin' }, { company_url: 'https://spam.example' }), { params });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, applied: true });
    expect(authorizeMock).not.toHaveBeenCalled();
  });
});
