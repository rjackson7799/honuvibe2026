import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchPlaces, PlacesError } from './places';

function okJson(payload: unknown) {
  return { ok: true, status: 200, json: async () => payload };
}

function rawPlace(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    displayName: { text: `Biz ${id}` },
    formattedAddress: `${id} Main St`,
    websiteUri: `https://${id}.example/`,
    nationalPhoneNumber: '555-0100',
    rating: 4.5,
    userRatingCount: 12,
    ...overrides,
  };
}

function fetchMock() {
  return fetch as unknown as ReturnType<typeof vi.fn>;
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  process.env.GOOGLE_PLACES_API_KEY = 'test-key';
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GOOGLE_PLACES_API_KEY;
});

describe('searchPlaces', () => {
  it('throws NO_KEY with no request when the key is unset', async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    await expect(searchPlaces('plumber in Honolulu')).rejects.toMatchObject({ code: 'NO_KEY' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends the api key, field mask, and includePureServiceAreaBusinesses', async () => {
    fetchMock().mockResolvedValue(okJson({ places: [rawPlace('a')] }));
    await searchPlaces('plumber in Honolulu');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock().mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://places.googleapis.com/v1/places:searchText');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Goog-Api-Key']).toBe('test-key');
    expect(headers['X-Goog-FieldMask']).toBe(
      'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,nextPageToken',
    );
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      textQuery: 'plumber in Honolulu',
      pageSize: 20,
      includePureServiceAreaBusinesses: true,
    });
  });

  it('maps a single page, nulling absent optional fields', async () => {
    fetchMock().mockResolvedValue(
      okJson({
        places: [
          rawPlace('a'),
          {
            id: 'b',
            displayName: { text: 'Bare Biz' },
            // no website/phone/address/rating — the no-website prospect class
          },
        ],
      }),
    );
    const results = await searchPlaces('q');
    expect(results).toEqual([
      {
        placeId: 'a',
        name: 'Biz a',
        website: 'https://a.example/',
        phone: '555-0100',
        address: 'a Main St',
        rating: 4.5,
        reviewCount: 12,
      },
      {
        placeId: 'b',
        name: 'Bare Biz',
        website: null,
        phone: null,
        address: null,
        rating: null,
        reviewCount: null,
      },
    ]);
  });

  it('skips a result missing id or displayName.text; the rest of the page survives', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock().mockResolvedValue(
      okJson({
        places: [
          rawPlace('a'),
          { displayName: { text: 'No Id Biz' } }, // missing id
          { id: 'c' }, // missing displayName.text
          rawPlace('d'),
        ],
      }),
    );
    const results = await searchPlaces('q');
    expect(results.map((r) => r.placeId)).toEqual(['a', 'd']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('skipped 2'));
    warn.mockRestore();
  });

  it('follows pagination but stops at the 3-page hard cap even when a 4th token is offered', async () => {
    fetchMock()
      .mockResolvedValueOnce(okJson({ places: [rawPlace('a')], nextPageToken: 't1' }))
      .mockResolvedValueOnce(okJson({ places: [rawPlace('b')], nextPageToken: 't2' }))
      .mockResolvedValueOnce(okJson({ places: [rawPlace('c')], nextPageToken: 't3' }));
    const results = await searchPlaces('q');

    expect(fetch).toHaveBeenCalledTimes(3); // the billing guard
    expect(results.map((r) => r.placeId)).toEqual(['a', 'b', 'c']);
    // follow-up pages carry the token, params otherwise identical
    const secondBody = JSON.parse((fetchMock().mock.calls[1][1] as RequestInit).body as string);
    expect(secondBody).toEqual({
      textQuery: 'q',
      pageSize: 20,
      includePureServiceAreaBusinesses: true,
      pageToken: 't1',
    });
  });

  it('stops early when no nextPageToken is returned', async () => {
    fetchMock()
      .mockResolvedValueOnce(okJson({ places: [rawPlace('a')], nextPageToken: 't1' }))
      .mockResolvedValueOnce(okJson({ places: [rawPlace('b')] }));
    const results = await searchPlaces('q');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
  });

  it('dedups by placeId across pages', async () => {
    fetchMock()
      .mockResolvedValueOnce(okJson({ places: [rawPlace('a'), rawPlace('b')], nextPageToken: 't1' }))
      .mockResolvedValueOnce(okJson({ places: [rawPlace('b'), rawPlace('c')] }));
    const results = await searchPlaces('q');
    expect(results.map((r) => r.placeId)).toEqual(['a', 'b', 'c']);
  });

  it('throws API_ERROR with the status on a non-2xx response', async () => {
    fetchMock().mockResolvedValue({ ok: false, status: 403, text: async () => 'denied' });
    const err = await searchPlaces('q').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PlacesError);
    expect((err as PlacesError).code).toBe('API_ERROR');
    expect((err as PlacesError).message).toContain('403');
  });

  it('throws TIMEOUT on an abort', async () => {
    fetchMock().mockRejectedValue(new DOMException('aborted', 'TimeoutError'));
    await expect(searchPlaces('q')).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('throws API_ERROR (not a raw SyntaxError) on a 2xx response with malformed JSON', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    });
    await expect(searchPlaces('q')).rejects.toMatchObject({ code: 'API_ERROR' });
    errSpy.mockRestore();
  });
});
