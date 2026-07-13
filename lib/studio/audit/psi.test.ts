import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPsi, fetchPsiWithRetry } from './psi';

function okJson(payload: unknown) {
  return { ok: true, status: 200, json: async () => payload };
}

const HAPPY = {
  lighthouseResult: {
    categories: {
      performance: { score: 0.42 },
      accessibility: { score: 0.9 },
      'best-practices': { score: 0.8 },
      seo: { score: 1 },
    },
    audits: {
      'largest-contentful-paint': { numericValue: 3400 },
      'cumulative-layout-shift': { numericValue: 0.05 },
      'total-blocking-time': { numericValue: 210 },
    },
  },
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  process.env.PAGESPEED_API_KEY = 'test-key';
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.PAGESPEED_API_KEY;
});

describe('fetchPsi', () => {
  it('returns null with no request when the key is unset', async () => {
    delete process.env.PAGESPEED_API_KEY;
    expect(await fetchPsi('https://x.example/')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('parses the four categories (bracket-access best-practices)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(okJson(HAPPY));
    const r = await fetchPsi('https://x.example/');
    expect(r).not.toBeNull();
    expect(r!.strategy).toBe('mobile');
    expect(r!.categories).toEqual({
      performance: 42,
      accessibility: 90,
      best_practices: 80,
      seo: 100,
    });
    expect(r!.metrics?.cumulative_layout_shift).toBe(0.05);
  });

  it('returns null on a non-2xx response', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 });
    expect(await fetchPsi('https://x.example/')).toBeNull();
  });

  it('returns null (never throws) on an abort/network error', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new DOMException('aborted', 'TimeoutError'));
    await expect(fetchPsi('https://x.example/')).resolves.toBeNull();
  });

  it('returns null on structurally-unexpected JSON (no lighthouseResult)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(okJson({ hello: 'world' }));
    await expect(fetchPsi('https://x.example/')).resolves.toBeNull();
  });

  it('returns null when json parsing throws', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('bad json');
      },
    });
    await expect(fetchPsi('https://x.example/')).resolves.toBeNull();
  });

  it('scores a null category as null', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      okJson({ lighthouseResult: { categories: { performance: { score: null }, seo: { score: 0.5 } } } }),
    );
    const r = await fetchPsi('https://x.example/');
    expect(r!.categories.performance).toBeNull();
    expect(r!.categories.seo).toBe(50);
    expect(r!.categories.best_practices).toBeNull(); // missing key
  });
});

describe('fetchPsiWithRetry', () => {
  it('retries once and succeeds on the second attempt', async () => {
    const mock = fetch as unknown as ReturnType<typeof vi.fn>;
    mock.mockResolvedValueOnce({ ok: false, status: 500 }).mockResolvedValueOnce(okJson(HAPPY));
    const r = await fetchPsiWithRetry('https://x.example/');
    expect(r).not.toBeNull();
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('returns null after both attempts fail', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 });
    const r = await fetchPsiWithRetry('https://x.example/');
    expect(r).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
