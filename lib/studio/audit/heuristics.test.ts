import { describe, expect, it } from 'vitest';
import { computeHeuristics } from './heuristics';
import type { AuditFinding, FetchedPage } from './schemas';

const YEAR = 2026;

// A legacy WordPress page: http-only, empty title, no description/h1, thin OG,
// no schema/favicon, no viewport, jQuery 1.x, WP 4.9.8 generator, Elementor,
// stale © 2019, images without alt, no <html lang>.
const LEGACY_HTML = `<!doctype html>
<html>
<head>
  <meta name="generator" content="WordPress 4.9.8">
  <title></title>
  <script src="/wp-content/themes/old/jquery-1.12.4.min.js"></script>
</head>
<body>
  <div>Old Company</div>
  <img src="/a.jpg">
  <img src="/b.jpg">
  <footer>© 2019 Old Co. All rights reserved. Built with Elementor.</footer>
</body>
</html>`;

// A modern page: https, responsive viewport, full OG, LocalBusiness JSON-LD,
// favicon, tel + form + map + hours, jQuery 3, current © year, html lang, alt.
const MODERN_HTML = `<!doctype html>
<html lang="en">
<head>
  <title>Modern Cafe — Honolulu</title>
  <meta name="description" content="Great coffee in Honolulu.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta property="og:title" content="Modern Cafe">
  <meta property="og:image" content="https://modern.example/og.png">
  <link rel="icon" href="/favicon.ico">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Modern Cafe"}</script>
  <script src="https://cdn.example/jquery-3.6.0.min.js"></script>
</head>
<body>
  <h1>Welcome to Modern Cafe</h1>
  <img src="/hero.jpg" alt="Our cafe interior">
  <a href="tel:+18085551234">Call us</a>
  <form><label for="email">Email</label><input id="email" type="email"></form>
  <iframe src="https://www.google.com/maps/embed?pb=abc"></iframe>
  <p>Hours: Mon–Fri 7am–3pm</p>
  <footer>© 2026 Modern Cafe. All rights reserved.</footer>
</body>
</html>`;

function page(finalUrl: string, html: string): FetchedPage {
  return { url: finalUrl, finalUrl, html };
}

function byId(findings: AuditFinding[], id: string): AuditFinding | undefined {
  return findings.find((f) => f.id === id);
}

describe('computeHeuristics', () => {
  const legacy = computeHeuristics([page('http://legacy.example/', LEGACY_HTML)], YEAR);
  const modern = computeHeuristics([page('https://modern.example/', MODERN_HTML)], YEAR);

  it('scores the legacy site materially lower in every category', () => {
    for (const c of Object.keys(legacy.scores.categories) as (keyof typeof legacy.scores.categories)[]) {
      expect(legacy.scores.categories[c]).toBeLessThan(modern.scores.categories[c]);
    }
    expect(legacy.scores.overall).toBeLessThan(modern.scores.overall);
  });

  it('fires the expected findings with the right severity', () => {
    expect(byId(legacy.findings, 'security.https')?.severity).toBe('critical');
    expect(byId(legacy.findings, 'mobile.viewport')?.severity).toBe('critical');
    expect(byId(legacy.findings, 'seo.title')?.severity).toBe('warn');
    expect(byId(legacy.findings, 'freshness.copyright')?.severity).toBe('warn');
    expect(byId(legacy.findings, 'freshness.jquery')?.severity).toBe('info');

    expect(byId(modern.findings, 'security.https')?.severity).toBe('pass');
    expect(byId(modern.findings, 'mobile.viewport')?.severity).toBe('pass');
    expect(byId(modern.findings, 'seo.schema')?.severity).toBe('pass');
    expect(byId(modern.findings, 'conversion.tel')?.severity).toBe('pass');
  });

  it('computes overall as the rounded mean of category scores', () => {
    const cats = Object.values(legacy.scores.categories);
    const mean = Math.round(cats.reduce((a, b) => a + b, 0) / cats.length);
    expect(legacy.scores.overall).toBe(mean);
  });

  it('populates tech detection on the legacy site', () => {
    expect(legacy.tech.cms).toBe('wordpress');
    expect(legacy.tech.builders).toContain('elementor');
    expect(legacy.tech.jquery).toBe('1.12.4');
    expect(legacy.tech.copyrightYear).toBe(2019);
    expect(legacy.tech.generator).toMatch(/WordPress 4\.9\.8/);
    expect(legacy.tech.pagesFetched).toBe(1);
  });

  it('reads the MAX footer year (a 2019–2026 range is not stale)', () => {
    const html = MODERN_HTML.replace('© 2026 Modern Cafe.', '© 2019–2026 Modern Cafe.');
    const r = computeHeuristics([page('https://modern.example/', html)], YEAR);
    expect(r.tech.copyrightYear).toBe(2026);
    expect(byId(r.findings, 'freshness.copyright')?.severity).toBe('pass');
  });

  it('does not throw on empty/whitespace HTML', () => {
    const r = computeHeuristics([page('http://x.example/', '   ')], YEAR);
    expect(r.scores).toBeTruthy();
    expect(byId(r.findings, 'security.https')?.severity).toBe('critical');
  });

  it('treats a page with no <img> as passing the alt check (no divide-by-zero)', () => {
    const r = computeHeuristics([page('https://x.example/', '<html lang="en"><head><title>x</title><meta name="viewport" content="width=device-width"></head><body><p>hi</p></body></html>')], YEAR);
    expect(byId(r.findings, 'a11y.alt')?.severity).toBe('pass');
  });

  it('degrades quietly on malformed JSON-LD and still returns', () => {
    const html = `<html><head><title>x</title><script type="application/ld+json">{ this is : not json ]</script></head><body></body></html>`;
    expect(() => computeHeuristics([page('https://x.example/', html)], YEAR)).not.toThrow();
    const r = computeHeuristics([page('https://x.example/', html)], YEAR);
    // The malformed block is skipped, so the schema check reports "not found".
    expect(byId(r.findings, 'seo.schema')?.severity).toBe('info');
  });

  it('uses subpages for conversion signals (contact page discovered)', () => {
    const home = page('https://x.example/', '<html><head><title>x</title></head><body><a href="/contact">Contact</a></body></html>');
    const contact = page('https://x.example/contact', '<html><head><title>Contact</title></head><body><form><input id="e"><label for="e">e</label></form></body></html>');
    const r = computeHeuristics([home, contact], YEAR);
    expect(byId(r.findings, 'conversion.contact')?.severity).toBe('pass');
    expect(r.tech.pagesFetched).toBe(2);
  });
});
