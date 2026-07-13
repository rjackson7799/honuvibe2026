import * as cheerio from 'cheerio';
import type {
  AuditCategory,
  AuditFinding,
  AuditScores,
  AuditSeverity,
  AuditTech,
  FetchedPage,
  HeuristicResult,
} from './schemas';

// Deterministic "outdated site" heuristics. Code computes EVERY number; the
// Claude narrative later receives findings/scores/tech as read-only data and is
// told never to alter or invent them. Homepage (pages[0]) drives most checks;
// same-host subpages augment the conversion + freshness signals.
//
// The whole module is pure (no `new Date()` — currentYear is passed in) so the
// heuristics test is deterministic. Every individual check is wrapped in its own
// try/catch: legacy WordPress sites (the exact target class) routinely ship
// malformed JSON-LD and junk hrefs, and one unguarded throw would propagate to
// runAudit's outer catch and mark the whole audit `failed`, destroying the
// partial-persist guarantee. A throwing check degrades to a skipped info finding.

// --- Tunable weights (points deducted per failed check) -----------------------
const W = {
  securityHttpOnly: 70,
  securityMixedEach: 25,
  securityMixedMax: 50,
  seoNoTitle: 25,
  seoNoDescription: 20,
  seoNoH1: 15,
  seoNoOg: 15,
  seoNoSchema: 15,
  seoNoFavicon: 5,
  seoNoindex: 20,
  mobileNoViewport: 60,
  mobileFixedViewport: 25,
  conversionNoTel: 20,
  conversionNoContact: 25,
  conversionNoMap: 10,
  conversionNoHours: 10,
  freshnessStaleCopyright: 25,
  freshnessLegacyWp: 15,
  freshnessOldJquery: 10,
  freshnessPageBuilder: 10,
  a11yLowAlt: 25,
  a11yNoLang: 15,
  a11yUnlabeledInputs: 15,
} as const;

const FRESHNESS_STALE_YEARS = 2;
const ALT_COVERAGE_FLOOR = 0.6;
const EVIDENCE_MAX = 200;
const OLD_JQUERY_MAJOR = 3; // jQuery < 3 is a legacy signal
const LEGACY_WP_MAJOR = 5; // WordPress < 5 (pre-2018) is a legacy signal
const PAGE_BUILDER_TOKENS = ['elementor', 'divi', 'wpbakery', 'js_composer'];

type Doc = { page: FetchedPage; $: cheerio.CheerioAPI; text: string };

// A finding plus the points it costs its category. `deduction: 0` for passing
// or skipped checks. Mapped to AuditFinding (deduction dropped) at the end.
type Check = {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;
  evidence: string;
  deduction: number;
};

function cap(s: string): string {
  const clean = s.replace(/\s+/g, ' ').trim();
  return clean.length > EVIDENCE_MAX ? `${clean.slice(0, EVIDENCE_MAX)}…` : clean;
}

// Build the structural cheerio handle plus a sanitized visible-text string
// (script/style/comments/hidden nodes stripped) — the only page-derived text
// that ever becomes `evidence` (and thus reaches the narrative prompt).
function loadDoc(page: FetchedPage): Doc {
  const $ = cheerio.load(page.html);
  const $t = cheerio.load(page.html);
  $t('script, style, noscript, template, [hidden]').remove();
  $t('*')
    .contents()
    .each((_i, el) => {
      if (el.type === 'comment') $t(el).remove();
    });
  const text = $t('body').length ? $t('body').text() : $t.root().text();
  return { page, $, text };
}

function parseUrlSafe(u: string): URL | null {
  try {
    return new URL(u);
  } catch {
    return null;
  }
}

// --- Tech detection (not scored; feeds the panel + narrative) -----------------
function detectTech(home: Doc, pages: FetchedPage[], copyrightYear: number | null): AuditTech {
  const $ = home.$;
  const html = home.page.html.toLowerCase();
  const generator = $('meta[name="generator"]').attr('content')?.trim() || null;

  let cms: string | null = null;
  const gen = (generator ?? '').toLowerCase();
  if (gen.includes('wordpress') || html.includes('wp-content') || html.includes('wp-includes')) {
    cms = 'wordpress';
  } else if (gen.includes('wix') || html.includes('wix.com')) cms = 'wix';
  else if (gen.includes('squarespace') || html.includes('squarespace')) cms = 'squarespace';
  else if (gen.includes('shopify') || html.includes('cdn.shopify')) cms = 'shopify';
  else if (gen.includes('drupal')) cms = 'drupal';
  else if (gen.includes('joomla')) cms = 'joomla';

  const builders = PAGE_BUILDER_TOKENS.filter((t) => html.includes(t));

  let jquery: string | null = null;
  $('script[src]').each((_i, el) => {
    if (jquery) return;
    const src = $(el).attr('src') ?? '';
    const m = src.match(/jquery[^"']*?(\d+\.\d+(?:\.\d+)?)/i);
    if (m) jquery = m[1];
  });

  return {
    generator,
    cms,
    builders,
    jquery,
    copyrightYear,
    pagesFetched: pages.length,
    finalUrl: home.page.finalUrl,
  };
}

// Extract the max 20xx year appearing near a copyright marker (so a
// "© 2019–2026 Acme" range reads as 2026, not a false-positive 2019).
function detectCopyrightYear(docs: Doc[]): number | null {
  let max: number | null = null;
  for (const doc of docs) {
    const footer = doc.$('footer').text() ?? '';
    const windows: string[] = [];
    const source = `${footer}\n${doc.text}`;
    const re = /(?:©|&copy;|copyright|all rights reserved)[^\n]{0,160}/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) windows.push(m[0]);
    for (const w of windows) {
      const years = w.match(/20\d{2}/g);
      if (years) {
        for (const y of years) {
          const n = Number(y);
          if (max === null || n > max) max = n;
        }
      }
    }
  }
  return max;
}

// Run a check body, degrading a thrown check to a skipped info finding (never a
// function-level throw). This is the fault-isolation backstop.
function safeCheck(id: string, category: AuditCategory, body: () => Check | Check[]): Check[] {
  try {
    const r = body();
    return Array.isArray(r) ? r : [r];
  } catch {
    return [
      {
        id: `${id}.skipped`,
        category,
        severity: 'info',
        title: 'Check could not be evaluated',
        evidence: 'This page could not be analyzed for this signal.',
        deduction: 0,
      },
    ];
  }
}

function pass(id: string, category: AuditCategory, title: string, evidence = ''): Check {
  return { id, category, severity: 'pass', title, evidence: cap(evidence), deduction: 0 };
}

function fail(
  id: string,
  category: AuditCategory,
  severity: AuditSeverity,
  title: string,
  evidence: string,
  deduction: number,
): Check {
  return { id, category, severity, title, evidence: cap(evidence), deduction };
}

export function computeHeuristics(
  pages: FetchedPage[],
  currentYear: number,
): HeuristicResult {
  const docs = pages.map(loadDoc);
  const home = docs[0];
  const $ = home.$;
  const finalUrl = home.page.finalUrl;
  const checks: Check[] = [];

  // ---- security -------------------------------------------------------------
  const homeUrl = parseUrlSafe(finalUrl);
  const isHttps = homeUrl?.protocol === 'https:';
  checks.push(
    ...safeCheck('security.https', 'security', () =>
      isHttps
        ? pass('security.https', 'security', 'Served over HTTPS', finalUrl)
        : fail(
            'security.https',
            'security',
            'critical',
            'Site is served over HTTP, not HTTPS',
            finalUrl,
            W.securityHttpOnly,
          ),
    ),
  );
  checks.push(
    ...safeCheck('security.mixed', 'security', () => {
      if (!isHttps) return pass('security.mixed', 'security', 'Mixed content not applicable (HTTP site)');
      const insecure: string[] = [];
      $('script[src^="http://"], img[src^="http://"]').each((_i, el) => {
        const src = $(el).attr('src');
        if (src) insecure.push(src);
      });
      $('link[rel="stylesheet"][href^="http://"]').each((_i, el) => {
        const href = $(el).attr('href');
        if (href) insecure.push(href);
      });
      if (insecure.length === 0) {
        return pass('security.mixed', 'security', 'No mixed (http) content on an https page');
      }
      const deduction = Math.min(W.securityMixedEach * insecure.length, W.securityMixedMax);
      return fail(
        'security.mixed',
        'security',
        'warn',
        `${insecure.length} insecure (http) resource${insecure.length > 1 ? 's' : ''} on an https page`,
        insecure.slice(0, 3).join(', '),
        deduction,
      );
    }),
  );

  // ---- seo ------------------------------------------------------------------
  checks.push(
    ...safeCheck('seo.title', 'seo', () => {
      const title = $('title').first().text().trim();
      return title
        ? pass('seo.title', 'seo', 'Has a <title>', title)
        : fail('seo.title', 'seo', 'warn', 'Missing <title> tag', 'No <title> element with text', W.seoNoTitle);
    }),
  );
  checks.push(
    ...safeCheck('seo.description', 'seo', () => {
      const desc = $('meta[name="description"]').attr('content')?.trim();
      return desc
        ? pass('seo.description', 'seo', 'Has a meta description', desc)
        : fail('seo.description', 'seo', 'warn', 'Missing meta description', 'No meta[name=description]', W.seoNoDescription);
    }),
  );
  checks.push(
    ...safeCheck('seo.h1', 'seo', () => {
      const h1 = $('h1').first().text().trim();
      return $('h1').length > 0
        ? pass('seo.h1', 'seo', 'Has an <h1>', h1)
        : fail('seo.h1', 'seo', 'warn', 'No <h1> heading', 'Page has no <h1>', W.seoNoH1);
    }),
  );
  checks.push(
    ...safeCheck('seo.og', 'seo', () => {
      const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
      const ogImage = $('meta[property="og:image"]').attr('content')?.trim();
      return ogTitle && ogImage
        ? pass('seo.og', 'seo', 'Has Open Graph tags', `og:title + og:image present`)
        : fail(
            'seo.og',
            'seo',
            'info',
            'Incomplete Open Graph tags',
            `og:title ${ogTitle ? 'ok' : 'missing'}, og:image ${ogImage ? 'ok' : 'missing'}`,
            W.seoNoOg,
          );
    }),
  );
  checks.push(
    ...safeCheck('seo.schema', 'seo', () => {
      let found = false;
      $('script[type="application/ld+json"]').each((_i, el) => {
        if (found) return;
        const raw = $(el).contents().text();
        try {
          const parsed = JSON.parse(raw);
          const nodes = Array.isArray(parsed) ? parsed : parsed['@graph'] ?? [parsed];
          for (const node of Array.isArray(nodes) ? nodes : [nodes]) {
            const t = node?.['@type'];
            const types = Array.isArray(t) ? t : [t];
            if (types.some((x: unknown) => typeof x === 'string' && /LocalBusiness|Organization/i.test(x))) {
              found = true;
            }
          }
        } catch {
          // Malformed JSON-LD on a legacy site — skip this block, keep scanning.
        }
      });
      return found
        ? pass('seo.schema', 'seo', 'Has LocalBusiness/Organization schema')
        : fail('seo.schema', 'seo', 'info', 'No LocalBusiness/Organization schema.org data', 'No matching JSON-LD', W.seoNoSchema);
    }),
  );
  checks.push(
    ...safeCheck('seo.favicon', 'seo', () => {
      const hasIcon = $('link[rel~="icon"]').length > 0;
      return hasIcon
        ? pass('seo.favicon', 'seo', 'Has a favicon')
        : fail('seo.favicon', 'seo', 'info', 'No favicon', 'No link[rel~=icon]', W.seoNoFavicon);
    }),
  );
  checks.push(
    ...safeCheck('seo.noindex', 'seo', () => {
      const robots = $('meta[name="robots"]').attr('content')?.toLowerCase() ?? '';
      return robots.includes('noindex')
        ? fail('seo.noindex', 'seo', 'warn', 'Page is set to noindex', robots, W.seoNoindex)
        : pass('seo.noindex', 'seo', 'Page is indexable');
    }),
  );

  // ---- mobile ---------------------------------------------------------------
  checks.push(
    ...safeCheck('mobile.viewport', 'mobile', () => {
      const vp = $('meta[name="viewport"]').attr('content')?.toLowerCase();
      if (!vp) {
        return fail('mobile.viewport', 'mobile', 'critical', 'No mobile viewport meta tag', 'No meta[name=viewport]', W.mobileNoViewport);
      }
      if (vp.includes('device-width')) {
        return pass('mobile.viewport', 'mobile', 'Responsive viewport', vp);
      }
      if (/width\s*=\s*\d+/.test(vp)) {
        return fail('mobile.viewport', 'mobile', 'warn', 'Fixed-width (non-responsive) viewport', vp, W.mobileFixedViewport);
      }
      return pass('mobile.viewport', 'mobile', 'Viewport present', vp);
    }),
  );

  // ---- conversion (homepage + subpages) -------------------------------------
  checks.push(
    ...safeCheck('conversion.tel', 'conversion', () => {
      const hasTel = docs.some((d) => d.$('a[href^="tel:"]').length > 0);
      return hasTel
        ? pass('conversion.tel', 'conversion', 'Has a click-to-call link')
        : fail('conversion.tel', 'conversion', 'warn', 'No click-to-call (tel:) link', 'No tel: link on any fetched page', W.conversionNoTel);
    }),
  );
  checks.push(
    ...safeCheck('conversion.contact', 'conversion', () => {
      const hasForm = docs.some((d) => d.$('form').length > 0);
      const hasContactPage = pages.some((p) => {
        const u = parseUrlSafe(p.finalUrl);
        return u ? /\/contact/i.test(u.pathname) : false;
      });
      return hasForm || hasContactPage
        ? pass('conversion.contact', 'conversion', 'Has a contact form or contact page')
        : fail('conversion.contact', 'conversion', 'warn', 'No contact form or contact page found', 'No <form> and no /contact page discovered', W.conversionNoContact);
    }),
  );
  checks.push(
    ...safeCheck('conversion.map', 'conversion', () => {
      const hasMap = docs.some((d) => d.$('iframe[src*="google.com/maps"], iframe[src*="maps.google"], iframe[src*="/maps/embed"]').length > 0);
      return hasMap
        ? pass('conversion.map', 'conversion', 'Has an embedded map')
        : fail('conversion.map', 'conversion', 'info', 'No embedded map', 'No Google Maps iframe found', W.conversionNoMap);
    }),
  );
  checks.push(
    ...safeCheck('conversion.hours', 'conversion', () => {
      const hasHours = docs.some(
        (d) => /\bhours?\b/i.test(d.text) || /\b(mon|tue|wed|thu|fri|sat|sun)(day)?\b/i.test(d.text),
      );
      return hasHours
        ? pass('conversion.hours', 'conversion', 'Shows business hours')
        : fail('conversion.hours', 'conversion', 'info', 'No business hours found', 'No hours/day text on any fetched page', W.conversionNoHours);
    }),
  );

  // ---- freshness ------------------------------------------------------------
  const copyrightYear = detectCopyrightYear(docs);
  checks.push(
    ...safeCheck('freshness.copyright', 'freshness', () => {
      if (copyrightYear === null) {
        return fail('freshness.copyright', 'freshness', 'info', 'No copyright year found', 'No 20xx year near a copyright marker', 0);
      }
      const stale = currentYear - copyrightYear >= FRESHNESS_STALE_YEARS;
      return stale
        ? fail('freshness.copyright', 'freshness', 'warn', `Copyright year is stale (${copyrightYear})`, `Footer year ${copyrightYear} vs ${currentYear}`, W.freshnessStaleCopyright)
        : pass('freshness.copyright', 'freshness', `Copyright year current (${copyrightYear})`);
    }),
  );
  checks.push(
    ...safeCheck('freshness.wordpress', 'freshness', () => {
      const gen = $('meta[name="generator"]').attr('content') ?? '';
      const wp = gen.match(/WordPress\s*([\d.]+)/i);
      if (wp) {
        const major = Number(wp[1].split('.')[0]);
        if (Number.isFinite(major) && major < LEGACY_WP_MAJOR) {
          return fail('freshness.wordpress', 'freshness', 'warn', `Legacy WordPress (${wp[1]})`, gen, W.freshnessLegacyWp);
        }
      }
      return pass('freshness.wordpress', 'freshness', 'No legacy WordPress signal');
    }),
  );
  checks.push(
    ...safeCheck('freshness.jquery', 'freshness', () => {
      let old: string | null = null;
      $('script[src]').each((_i, el) => {
        if (old) return;
        const src = $(el).attr('src') ?? '';
        const m = src.match(/jquery[^"']*?(\d+)\.(\d+)(?:\.(\d+))?/i);
        if (m && Number(m[1]) < OLD_JQUERY_MAJOR) old = `${m[1]}.${m[2]}${m[3] ? `.${m[3]}` : ''}`;
      });
      return old
        ? fail('freshness.jquery', 'freshness', 'info', `Legacy jQuery (${old})`, `jQuery ${old} < ${OLD_JQUERY_MAJOR}`, W.freshnessOldJquery)
        : pass('freshness.jquery', 'freshness', 'No legacy jQuery signal');
    }),
  );
  checks.push(
    ...safeCheck('freshness.pagebuilder', 'freshness', () => {
      const html = home.page.html.toLowerCase();
      const found = PAGE_BUILDER_TOKENS.filter((t) => html.includes(t));
      return found.length > 0
        ? fail('freshness.pagebuilder', 'freshness', 'info', `Page-builder markup (${found.join(', ')})`, found.join(', '), W.freshnessPageBuilder)
        : pass('freshness.pagebuilder', 'freshness', 'No dated page-builder signal');
    }),
  );

  // ---- accessibility (light — PSI is authoritative when present) ------------
  checks.push(
    ...safeCheck('a11y.alt', 'accessibility', () => {
      const imgs = $('img');
      const total = imgs.length;
      if (total === 0) return pass('a11y.alt', 'accessibility', 'No images to caption');
      let withAlt = 0;
      imgs.each((_i, el) => {
        if (typeof $(el).attr('alt') === 'string') withAlt += 1;
      });
      const coverage = withAlt / total;
      return coverage < ALT_COVERAGE_FLOOR
        ? fail('a11y.alt', 'accessibility', 'warn', 'Low image alt-text coverage', `${withAlt}/${total} images have alt`, W.a11yLowAlt)
        : pass('a11y.alt', 'accessibility', 'Good image alt coverage', `${withAlt}/${total}`);
    }),
  );
  checks.push(
    ...safeCheck('a11y.lang', 'accessibility', () => {
      const lang = $('html').attr('lang')?.trim();
      return lang
        ? pass('a11y.lang', 'accessibility', 'Has <html lang>', lang)
        : fail('a11y.lang', 'accessibility', 'info', 'Missing <html lang>', 'No lang attribute on <html>', W.a11yNoLang);
    }),
  );
  checks.push(
    ...safeCheck('a11y.labels', 'accessibility', () => {
      const fields = $('input, textarea, select').filter((_i, el) => {
        const type = ($(el).attr('type') ?? '').toLowerCase();
        return !['hidden', 'submit', 'button', 'reset', 'image'].includes(type);
      });
      if (fields.length === 0) return pass('a11y.labels', 'accessibility', 'No form fields to label');
      let unlabeled = 0;
      fields.each((_i, el) => {
        const $el = $(el);
        const id = $el.attr('id');
        const hasFor = id ? $(`label[for="${id.replace(/"/g, '\\"')}"]`).length > 0 : false;
        const wrapped = $el.closest('label').length > 0;
        const aria = !!($el.attr('aria-label') || $el.attr('aria-labelledby') || $el.attr('title'));
        if (!hasFor && !wrapped && !aria) unlabeled += 1;
      });
      return unlabeled > 0
        ? fail('a11y.labels', 'accessibility', 'info', 'Form fields without labels', `${unlabeled} unlabeled field${unlabeled > 1 ? 's' : ''}`, W.a11yUnlabeledInputs)
        : pass('a11y.labels', 'accessibility', 'All form fields labeled');
    }),
  );

  // ---- aggregate ------------------------------------------------------------
  const categories: Record<AuditCategory, number> = {
    security: 100,
    seo: 100,
    mobile: 100,
    conversion: 100,
    freshness: 100,
    accessibility: 100,
  };
  for (const c of checks) {
    categories[c.category] = categories[c.category] - c.deduction;
  }
  (Object.keys(categories) as AuditCategory[]).forEach((k) => {
    categories[k] = Math.max(0, Math.min(100, Math.round(categories[k])));
  });
  const values = Object.values(categories);
  const overall = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  const findings: AuditFinding[] = checks.map((c) => ({
    id: c.id,
    category: c.category,
    severity: c.severity,
    title: c.title,
    evidence: c.evidence,
  }));

  const tech = detectTech(home, pages, copyrightYear);

  return { scores: { overall, categories }, findings, tech };
}
