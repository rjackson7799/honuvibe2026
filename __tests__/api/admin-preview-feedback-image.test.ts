import { beforeEach, describe, expect, it, vi } from 'vitest';

const FULL = '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg';
const THUMB = '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.thumb.jpg';

const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  role: 'admin' as string | null,
  imagePath: undefined as string | null | undefined,
  signError: null as unknown,
  adminCreated: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: h.role ? { role: h.role } : null }) }),
      }),
    }),
  }),
  createAdminClient: () => {
    h.adminCreated();
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: h.imagePath === undefined ? null : { image_path: h.imagePath },
              error: null,
            }),
          }),
        }),
      }),
      storage: {
        from: (bucket: string) => ({
          createSignedUrl: async (path: string, ttl: number) => {
            h.createSignedUrl(bucket, path, ttl);
            return h.signError
              ? { data: null, error: h.signError }
              : { data: { signedUrl: `https://signed.example/${path}?token=t` }, error: null };
          },
        }),
      },
    };
  },
}));

import { GET } from '@/app/api/admin/preview-feedback/[id]/image/route';

const ID = '33333333-3333-4333-8333-333333333333';

function call(id: string, query = '') {
  return GET(new Request(`http://localhost/api/admin/preview-feedback/${id}/image${query}`) as never, {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  h.user = { id: 'u1' };
  h.role = 'admin';
  h.imagePath = FULL;
  h.signError = null;
  h.adminCreated.mockClear();
  h.createSignedUrl.mockClear();
});

describe('GET /api/admin/preview-feedback/[id]/image', () => {
  it('non-admin gets 404 and the service-role client is never created or used', async () => {
    h.role = 'user';
    const res = await call(ID, '?v=full');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(h.adminCreated).not.toHaveBeenCalled();
    expect(h.createSignedUrl).not.toHaveBeenCalled();
  });

  it('anonymous gets 404 and the signer is never called', async () => {
    h.user = null;
    const res = await call(ID);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(h.adminCreated).not.toHaveBeenCalled();
    expect(h.createSignedUrl).not.toHaveBeenCalled();
  });

  it('a bad uuid gets 404 without signing', async () => {
    const res = await call('not-a-uuid');
    expect(res.status).toBe(404);
    expect(h.createSignedUrl).not.toHaveBeenCalled();
  });

  it('an unknown variant gets 404', async () => {
    const res = await call(ID, '?v=huge');
    expect(res.status).toBe(404);
    expect(h.createSignedUrl).not.toHaveBeenCalled();
  });

  it('a row with no image gets 404', async () => {
    h.imagePath = null;
    const res = await call(ID, '?v=thumb');
    expect(res.status).toBe(404);
    expect(h.createSignedUrl).not.toHaveBeenCalled();
  });

  it('a missing row gets 404', async () => {
    h.imagePath = undefined;
    const res = await call(ID);
    expect(res.status).toBe(404);
  });

  it('a sign error (missing object) gets 404 Screenshot unavailable', async () => {
    h.signError = { message: 'Object not found' };
    const res = await call(ID, '?v=full');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Screenshot unavailable' });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('admin full: 302 to a 5-minute signed URL, no-store', async () => {
    const res = await call(ID, '?v=full');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`https://signed.example/${FULL}?token=t`);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(h.createSignedUrl).toHaveBeenCalledWith('preview-feedback-images', FULL, 300);
  });

  it('admin thumb: signs the .thumb.jpg path', async () => {
    const res = await call(ID, '?v=thumb');
    expect(res.status).toBe(302);
    expect(h.createSignedUrl).toHaveBeenCalledWith('preview-feedback-images', THUMB, 300);
  });

  it('defaults to the full variant', async () => {
    await call(ID);
    expect(h.createSignedUrl).toHaveBeenCalledWith('preview-feedback-images', FULL, 300);
  });
});
