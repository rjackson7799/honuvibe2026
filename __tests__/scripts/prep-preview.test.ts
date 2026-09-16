import { describe, it, expect } from 'vitest';
// The script is plain ESM (allowJs) so the pure helpers import without running main().
import { prepHtml, renderBoard } from '../../scripts/prep-preview.mjs';

const BUNDLE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bundled Page</title>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXX"></script>
  <script>window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date());</script>
  <link rel="stylesheet" href="./style.css">
</head>
<body><img src="images/hero.jpg"><a href="/about">x</a></body>
</html>`;

describe('prepHtml', () => {
  it('rewrites the Bundled Page title and injects the robots meta', () => {
    const { html } = prepHtml(BUNDLE, 'Acme — Site concept');
    expect(html).toContain('<title>Acme — Site concept</title>');
    expect(html).not.toContain('Bundled Page');
    expect(html).toContain('<meta name="robots" content="noindex,nofollow">');
  });

  it('is idempotent — a second pass adds nothing', () => {
    const once = prepHtml(BUNDLE, 'Acme').html;
    const twice = prepHtml(once, 'Acme').html;
    expect(twice).toBe(once);
    expect(twice.match(/name="robots"/g)).toHaveLength(1);
  });

  it('strips analytics loaders and inline gtag config', () => {
    const { html, stripped } = prepHtml(BUNDLE, 'Acme');
    expect(stripped).toBe(2);
    expect(html).not.toContain('googletagmanager');
    expect(html).not.toContain('gtag(');
  });

  it('reports root-absolute references but leaves relative ones alone', () => {
    const { absolute } = prepHtml(BUNDLE, 'Acme');
    expect(absolute).toEqual(['href="/about"']);
  });

  it('escapes a hostile title', () => {
    const { html } = prepHtml(BUNDLE, '<script>alert(1)</script>');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('adds a title when the export has none', () => {
    const { html } = prepHtml('<html><head><meta charset="utf-8"></head><body></body></html>', 'Acme');
    expect(html).toContain('<title>Acme</title>');
  });
});

describe('renderBoard', () => {
  const manifest = {
    client: 'Acme <Co>',
    accent: '#c9a24a',
    intro: 'Two concepts.',
    pages: [
      { file: 'site.html', kind: 'Site concept', name: 'The site', description: 'Home & more', cta: 'Open' },
      { file: 'admin.html', kind: 'Admin concept', name: 'Admin', description: 'Dashboard', cta: 'Open' },
    ],
    notes: ['Placeholder "photos"'],
    footer: 'Studio',
  };

  it('links every page relatively and escapes all copy', () => {
    const html = renderBoard(manifest, { hasLogo: false, hasBg: false, fontCss: '' });
    expect(html).toContain('href="site.html"');
    expect(html).toContain('href="admin.html"');
    expect(html).toContain('Acme &lt;Co&gt;');
    expect(html).toContain('Home &amp; more');
    expect(html).toContain('Placeholder &quot;photos&quot;');
    expect(html).toContain('<meta name="robots" content="noindex,nofollow">');
    expect(html).toContain('<title>Acme &lt;Co&gt; — Preview</title>');
  });

  it('uses the logo and background only when they exist in the export', () => {
    const plain = renderBoard(manifest, { hasLogo: false, hasBg: false, fontCss: '' });
    expect(plain).toContain('<h1 class="client">');
    expect(plain).not.toContain('logo.png');
    expect(plain).not.toContain('bg.jpg');

    const branded = renderBoard(manifest, { hasLogo: true, hasBg: true, fontCss: '' });
    expect(branded).toContain('src="logo.png"');
    expect(branded).not.toContain('<h1 class="client">');
    expect(branded).toContain('url("bg.jpg")');
  });

  it('rejects an accent or font family that could break out of <style>', () => {
    // The board is a streamed export served with NO CSP, so these are validated, not escaped.
    const evil = '</style><script>alert(1)</script>';
    const o = { hasLogo: false, hasBg: false, fontCss: '' };
    expect(() => renderBoard({ ...manifest, accent: evil }, o)).toThrow(/accent/);
    expect(() => renderBoard({ ...manifest, accent: 'red' }, o)).toThrow(/accent/);
    expect(() => renderBoard({ ...manifest, fonts: [{ family: evil, file: 'x.woff2', role: 'display' }] }, o)).toThrow(/family/);
    const ok = renderBoard({ ...manifest, fonts: [{ family: 'Zen Antique', file: 'x.woff2', role: 'display' }] }, o);
    expect(ok).toContain('"Zen Antique", Georgia');
  });

  it('never references a remote host — the preview must not phone home', () => {
    const html = renderBoard(manifest, { hasLogo: true, hasBg: true, fontCss: '' });
    expect(html).not.toMatch(/https?:\/\//);
  });
});
