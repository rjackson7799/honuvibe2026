import * as cheerio from 'cheerio';
import { fetchHtmlWithCaps } from '@/lib/http/safe-fetch';
import { normalizeAuditUrl } from '@/lib/studio/audit/crawl';

// Deterministic opportunity scoring for the Prospect Finder (Studio, phase 4).
// Higher score = worse website = stronger rebuild opportunity. Heuristics-only
// in v1 — no LLM call. // v2: optional haiku one-liner per scored prospect.
//
// Calibration contract (decision D2 — the ORDERING is the product requirement,
// enforced by a dedicated test; the weights are tunable named constants):
//   no_website 95 > social-as-website 85 > worst fully-legacy scored site (the
//   additive weights sum to 80) > score_failed 40 > modern site ≈0.
// A social page IS "effectively no website" and ranks near the top; an
// unreachable site is unknown quality and must NOT outrank a solidly-bad
// scored site.
//
// The websiteUri is third-party data from Google (ultimately from the business
// owner): it is normalized FIRST (normalizeAuditUrl — scheme prepend,
// credential/port rejection), social hosts are scored WITHOUT fetching (they
// block bots anyway), and every real fetch goes through the SSRF-hardened
// fetchHtmlWithCaps. Like the audit heuristics, every check runs in its own
// try/catch — a legacy site's malformed markup degrades one signal, never the
// batch — and scoreProspectWebsite NEVER throws.

export interface ProspectScore {
  status: 'scored' | 'score_failed' | 'no_website';
  score: number; // 0-100, clamped
  breakdown: { id: string; label: string; points: number }[];
  tech: { cms: string | null; generator: string | null; socialAsWebsite: boolean };
}

// --- Fixed scores (status-level) ----------------------------------------------
export const SCORE_NO_WEBSITE = 95;
export const SCORE_SOCIAL_AS_WEBSITE = 85;
export const SCORE_FAILED = 40;

// --- Additive weights (sum = 80, keeping the worst scored site below social) ---
const W = {
  httpOnly: 18,
  noViewport: 18,
  staleCopyright: 12,
  legacyWordPress: 12,
  noMeta: 12,
  pageBuilder: 8,
} as const;

const STALE_YEARS = 2;
const LEGACY_WP_MAJOR = 5; // WordPress < 5 (pre-2018) is a legacy signal
const PAGE_BUILDER_TOKENS = ['elementor', 'divi', 'wpbakery', 'js_composer'];
const FETCH_CAPS = { maxBytes: 2 * 1024 * 1024, timeoutMs: 8_000 };

// A page ON one of these hosts is the business's website-substitute, not a
// website. Suffix matching on the parsed hostname kills lookalikes
// (myfacebook.com.evil fails; m.facebook.com matches).
const SOCIAL_DOMAINS = ['facebook.com', 'instagram.com', 'linktr.ee', 'yelp.com', 'google.com'];

function isSocialHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return SOCIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

type Signal = { id: string; label: string; points: number };

const NO_TECH = { cms: null, generator: null, socialAsWebsite: false };

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Max 20xx year appearing near a copyright marker (a "© 2019–2026 Acme" range
// reads as 2026, not a false-positive 2019). Same rule as the audit heuristics.
function detectCopyrightYear($: cheerio.CheerioAPI): number | null {
  const footer = $('footer').text() ?? '';
  const body = $('body').length ? $('body').text() : $.root().text();
  const source = `${footer}\n${body}`;
  let max: number | null = null;
  const re = /(?:©|&copy;|copyright|all rights reserved)[^\n]{0,160}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const years = m[0].match(/20\d{2}/g);
    if (years) {
      for (const y of years) {
        const n = Number(y);
        if (max === null || n > max) max = n;
      }
    }
  }
  return max;
}

function detectCms(generator: string | null, htmlLower: string): string | null {
  const gen = (generator ?? '').toLowerCase();
  if (gen.includes('wordpress') || htmlLower.includes('wp-content') || htmlLower.includes('wp-includes')) {
    return 'wordpress';
  }
  if (gen.includes('wix') || htmlLower.includes('wix.com')) return 'wix';
  if (gen.includes('squarespace') || htmlLower.includes('squarespace')) return 'squarespace';
  if (gen.includes('shopify') || htmlLower.includes('cdn.shopify')) return 'shopify';
  if (gen.includes('drupal')) return 'drupal';
  if (gen.includes('joomla')) return 'joomla';
  return null;
}

/**
 * Score one prospect's website. `website` is the (possibly null) websiteUri
 * from Places; `currentYear` is passed in (never `new Date()` here) so the
 * scorer is pure and its tests deterministic. Resolves — never rejects — with
 * one of: no_website (fixed 95, no fetch), scored 85 for a social page (no
 * fetch), score_failed (fixed 40: invalid/unreachable/unexpected error), or
 * scored with the additive legacy signals (clamped 0-100).
 */
export async function scoreProspectWebsite(
  website: string | null,
  currentYear: number,
): Promise<ProspectScore> {
  try {
    if (website === null || website.trim() === '') {
      return {
        status: 'no_website',
        score: SCORE_NO_WEBSITE,
        breakdown: [{ id: 'no_website', label: 'No website at all', points: SCORE_NO_WEBSITE }],
        tech: { ...NO_TECH },
      };
    }

    // Normalize FIRST — handles scheme-less, uppercase, and trailing-dot input
    // from Places before any host classification or fetch.
    const norm = normalizeAuditUrl(website);
    if (!norm.ok) {
      return failedScore();
    }

    // Social detection on the PARSED hostname of the normalized URL; skip the
    // fetch entirely (social pages block bots).
    const host = new URL(norm.url).hostname;
    if (isSocialHost(host)) {
      return {
        status: 'scored',
        score: SCORE_SOCIAL_AS_WEBSITE,
        breakdown: [
          { id: 'social_as_website', label: 'Social page as website', points: SCORE_SOCIAL_AS_WEBSITE },
        ],
        tech: { cms: null, generator: null, socialAsWebsite: true },
      };
    }

    const fetched = await fetchHtmlWithCaps(norm.url, FETCH_CAPS);
    if (!fetched) {
      return failedScore();
    }

    const $ = cheerio.load(fetched.html);
    const htmlLower = fetched.html.toLowerCase();
    const signals: Signal[] = [];

    // Each check fault-isolated: a throwing check degrades to a missing signal.
    try {
      if (new URL(fetched.finalUrl).protocol === 'http:') {
        signals.push({ id: 'http_only', label: 'Not served over HTTPS', points: W.httpOnly });
      }
    } catch {
      // unparseable final URL — skip the signal
    }

    try {
      if (!$('meta[name="viewport"]').attr('content')) {
        signals.push({ id: 'no_viewport', label: 'Not mobile-friendly', points: W.noViewport });
      }
    } catch {
      // skip
    }

    try {
      const year = detectCopyrightYear($);
      if (year !== null && currentYear - year >= STALE_YEARS) {
        signals.push({
          id: 'stale_copyright',
          label: `Stale copyright (${year})`,
          points: W.staleCopyright,
        });
      }
    } catch {
      // skip
    }

    let generator: string | null = null;
    try {
      generator = $('meta[name="generator"]').attr('content')?.trim() || null;
      const wp = (generator ?? '').match(/WordPress\s*([\d.]+)/i);
      if (wp) {
        const major = Number(wp[1].split('.')[0]);
        if (Number.isFinite(major) && major < LEGACY_WP_MAJOR) {
          signals.push({
            id: 'legacy_wordpress',
            label: `Legacy WordPress (${wp[1]})`,
            points: W.legacyWordPress,
          });
        }
      }
    } catch {
      // skip
    }

    try {
      const desc = $('meta[name="description"]').attr('content')?.trim();
      const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
      if (!desc && !ogTitle) {
        signals.push({ id: 'no_meta', label: 'No SEO meta tags', points: W.noMeta });
      }
    } catch {
      // skip
    }

    try {
      const builders = PAGE_BUILDER_TOKENS.filter((t) => htmlLower.includes(t));
      if (builders.length > 0) {
        signals.push({
          id: 'page_builder',
          label: `Page-builder markup (${builders.join(', ')})`,
          points: W.pageBuilder,
        });
      }
    } catch {
      // skip
    }

    let cms: string | null = null;
    try {
      cms = detectCms(generator, htmlLower);
    } catch {
      // skip
    }

    return {
      status: 'scored',
      score: clamp(signals.reduce((sum, s) => sum + s.points, 0)),
      breakdown: signals,
      tech: { cms, generator, socialAsWebsite: false },
    };
  } catch (err) {
    // Never throws — any unexpected error resolves to score_failed.
    console.error('[studio/prospects] scoring error:', err);
    return failedScore();
  }
}

function failedScore(): ProspectScore {
  return {
    status: 'score_failed',
    score: SCORE_FAILED,
    breakdown: [
      { id: 'unreachable', label: 'Website unreachable or invalid', points: SCORE_FAILED },
    ],
    tech: { ...NO_TECH },
  };
}
