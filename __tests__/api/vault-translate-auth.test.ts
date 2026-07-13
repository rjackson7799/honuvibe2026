import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getUserMock, usersSelectMock, translateMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  usersSelectMock: vi.fn(),
  translateMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: usersSelectMock() }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

vi.mock('@/lib/vault/translate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/vault/translate')>();
  return { ...actual, translateVaultContentToJp: translateMock };
});

import { POST } from '@/app/api/admin/vault/translate/route';
import { AuthoringError } from '@/lib/workbench/authoring';

function req(body: unknown): Request {
  return new Request('http://localhost/api/admin/vault/translate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const validBody = {
  title_en: 'Getting Started with Cursor IDE',
  description_en: 'A hands-on intro.',
  body_en: null,
};

describe('POST /api/admin/vault/translate — auth + validation gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    usersSelectMock.mockReturnValue({ role: 'admin' });
  });

  it('returns 401 when unauthenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await POST(req(validBody) as never);
    expect(res.status).toBe(401);
    expect(translateMock).not.toHaveBeenCalled();
  });

  it('returns 403 for a non-admin user', async () => {
    usersSelectMock.mockReturnValue({ role: 'student' });
    const res = await POST(req(validBody) as never);
    expect(res.status).toBe(403);
    expect(translateMock).not.toHaveBeenCalled();
  });

  it('returns 400 for an all-null body', async () => {
    const res = await POST(
      req({ title_en: null, description_en: null, body_en: null }) as never,
    );
    expect(res.status).toBe(400);
    expect(translateMock).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON', async () => {
    const bad = new Request('http://localhost/api/admin/vault/translate', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(bad as never);
    expect(res.status).toBe(400);
  });

  it('returns the translation for an admin caller', async () => {
    translateMock.mockResolvedValue({
      title_jp: 'Cursor IDEの始め方',
      description_jp: '実践的な入門です。',
      body_jp: null,
    });
    const res = await POST(req(validBody) as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ title_jp: 'Cursor IDEの始め方' });
    expect(translateMock).toHaveBeenCalledWith(
      expect.objectContaining({ title_en: validBody.title_en }),
    );
  });

  it('maps AuthoringError to a 502 with the error code', async () => {
    translateMock.mockRejectedValue(
      new AuthoringError('PARSE_ERROR', 'bad json'),
    );
    const res = await POST(req(validBody) as never);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: 'Translate assist failed (PARSE_ERROR)',
    });
  });

  it('maps unknown errors to a 500', async () => {
    translateMock.mockRejectedValue(new Error('boom'));
    const res = await POST(req(validBody) as never);
    expect(res.status).toBe(500);
  });
});
