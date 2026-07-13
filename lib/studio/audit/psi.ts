import type { AuditPsi } from './schemas';

// PageSpeed Insights v5. Optional: unset PAGESPEED_API_KEY ⇒ null and the audit
// proceeds heuristics-only. The call targets googleapis.com (a safe host) — the
// audited URL is a query param Google fetches server-side, so there is no SSRF
// surface on our side. fetchPsi NEVER throws: any failure (missing key, non-2xx,
// abort, malformed/unexpected JSON) resolves to null so PSI can never fail an
// audit. fetchPsiWithRetry gives it one extra shot before giving up.

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const PSI_TIMEOUT_MS = 20_000;

// Minimal shape of the fields we read; the real response is much larger.
interface PsiResponse {
  lighthouseResult?: {
    categories?: Record<string, { score?: number | null } | undefined>;
    audits?: Record<string, { numericValue?: number } | undefined>;
  };
}

function toScore(cat: { score?: number | null } | undefined): number | null {
  return typeof cat?.score === 'number' ? Math.round(cat.score * 100) : null;
}

export async function fetchPsi(url: string): Promise<AuditPsi | null> {
  const key = process.env.PAGESPEED_API_KEY;
  if (!key) return null;

  const params = new URLSearchParams();
  params.set('url', url);
  params.set('strategy', 'mobile');
  params.append('category', 'performance');
  params.append('category', 'accessibility');
  params.append('category', 'best-practices');
  params.append('category', 'seo');
  params.set('key', key);

  let res: Response;
  try {
    res = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, {
      signal: AbortSignal.timeout(PSI_TIMEOUT_MS),
    });
  } catch {
    return null; // network error / abort
  }
  if (!res.ok) return null;

  let data: PsiResponse;
  try {
    data = (await res.json()) as PsiResponse;
  } catch {
    return null;
  }

  try {
    const cats = data.lighthouseResult?.categories;
    if (!cats) return null; // structurally-unexpected payload
    const audits = data.lighthouseResult?.audits ?? {};
    const metric = (k: string): number | null => {
      const v = audits[k]?.numericValue;
      return typeof v === 'number' ? v : null;
    };
    return {
      strategy: 'mobile',
      categories: {
        performance: toScore(cats['performance']),
        accessibility: toScore(cats['accessibility']),
        // PSI's key is hyphenated; our stored/typed key is underscore.
        best_practices: toScore(cats['best-practices']),
        seo: toScore(cats['seo']),
      },
      metrics: {
        largest_contentful_paint: metric('largest-contentful-paint'),
        cumulative_layout_shift: metric('cumulative-layout-shift'),
        total_blocking_time: metric('total-blocking-time'),
      },
    };
  } catch {
    return null;
  }
}

export async function fetchPsiWithRetry(url: string, attempts = 2): Promise<AuditPsi | null> {
  for (let i = 0; i < attempts; i++) {
    const r = await fetchPsi(url);
    if (r) return r;
  }
  return null;
}
