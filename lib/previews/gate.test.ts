import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  cookieNameFor,
  signGate,
  verifyGate,
  passwordMatches,
  contentTypeFor,
  escapeHtml,
  renderPasswordPage,
  renderMessagePage,
  htmlPageHeaders,
  safeImageDataUri,
  PREVIEW_COOKIE_PREFIX,
} from './gate';

// 1x1 transparent PNG.
const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const SECRET = 'test-secret-0123456789abcdef0123456789abcdef';

describe('preview gate helpers', () => {
  beforeEach(() => {
    process.env.PREVIEW_GATE_SECRET = SECRET;
  });
  afterEach(() => {
    process.env.PREVIEW_GATE_SECRET = SECRET;
  });

  describe('cookieNameFor', () => {
    it('prefixes the slug', () => {
      expect(cookieNameFor('acme-abc12345')).toBe(`${PREVIEW_COOKIE_PREFIX}acme-abc12345`);
    });
  });

  describe('signGate / verifyGate', () => {
    it('round-trips a signed cookie', () => {
      const token = signGate('acme-abc12345', 'hunter2');
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(verifyGate('acme-abc12345', 'hunter2', token)).toBe(true);
    });

    it('round-trips a null password (public rows)', () => {
      const token = signGate('acme-abc12345', null);
      expect(verifyGate('acme-abc12345', null, token)).toBe(true);
    });

    it('rejects a token minted for a different slug', () => {
      const token = signGate('acme-abc12345', 'hunter2');
      expect(verifyGate('other-abc12345', 'hunter2', token)).toBe(false);
    });

    it('rejects a token minted for a different password (rotation revokes)', () => {
      const token = signGate('acme-abc12345', 'hunter2');
      expect(verifyGate('acme-abc12345', 'new-password', token)).toBe(false);
    });

    it('rejects tampered and truncated hex without throwing', () => {
      const token = signGate('acme-abc12345', 'hunter2');
      expect(verifyGate('acme-abc12345', 'hunter2', token.slice(0, -2) + '00')).toBe(false);
      expect(verifyGate('acme-abc12345', 'hunter2', token.slice(0, 32))).toBe(false);
      expect(verifyGate('acme-abc12345', 'hunter2', 'not-hex-at-all')).toBe(false);
      expect(verifyGate('acme-abc12345', 'hunter2', '')).toBe(false);
    });

    it('throws when PREVIEW_GATE_SECRET is unset', () => {
      delete process.env.PREVIEW_GATE_SECRET;
      expect(() => signGate('acme-abc12345', 'hunter2')).toThrow(/PREVIEW_GATE_SECRET/);
      expect(() => verifyGate('acme-abc12345', 'hunter2', 'deadbeef')).toThrow(/PREVIEW_GATE_SECRET/);
    });
  });

  describe('passwordMatches', () => {
    it('is true for an exact match', () => {
      expect(passwordMatches('correct horse', 'correct horse')).toBe(true);
    });
    it('is false for a mismatch', () => {
      expect(passwordMatches('correct horse', 'wrong horse')).toBe(false);
    });
    it('handles unicode', () => {
      expect(passwordMatches('パスワード🔒', 'パスワード🔒')).toBe(true);
      expect(passwordMatches('パスワード🔒', 'パスワード')).toBe(false);
    });
  });

  describe('contentTypeFor', () => {
    it('maps known extensions', () => {
      expect(contentTypeFor('index.html')).toBe('text/html; charset=utf-8');
      expect(contentTypeFor('style.css')).toBe('text/css; charset=utf-8');
      expect(contentTypeFor('app.js')).toBe('text/javascript; charset=utf-8');
      expect(contentTypeFor('mod.mjs')).toBe('text/javascript; charset=utf-8');
      expect(contentTypeFor('data.json')).toBe('application/json; charset=utf-8');
      expect(contentTypeFor('hero.PNG')).toBe('image/png');
      expect(contentTypeFor('photo.jpg')).toBe('image/jpeg');
      expect(contentTypeFor('photo.jpeg')).toBe('image/jpeg');
      expect(contentTypeFor('icon.svg')).toBe('image/svg+xml');
      expect(contentTypeFor('pic.webp')).toBe('image/webp');
      expect(contentTypeFor('pic.avif')).toBe('image/avif');
      expect(contentTypeFor('font.woff2')).toBe('font/woff2');
      expect(contentTypeFor('clip.mp4')).toBe('video/mp4');
      expect(contentTypeFor('doc.pdf')).toBe('application/pdf');
    });
    it('falls back to octet-stream for unknown or extensionless names', () => {
      expect(contentTypeFor('archive.zip')).toBe('application/octet-stream');
      expect(contentTypeFor('LICENSE')).toBe('application/octet-stream');
    });
  });

  describe('escapeHtml', () => {
    it('escapes all five significant characters', () => {
      expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
    });
    it('neutralizes a script payload', () => {
      expect(escapeHtml('<script>alert(1)</script>')).toBe(
        '&lt;script&gt;alert(1)&lt;/script&gt;',
      );
    });
  });

  describe('renderPasswordPage', () => {
    it('contains the noindex meta and posts to the slug route', () => {
      const html = renderPasswordPage({ slug: 'acme-abc12345' });
      expect(html).toContain('<meta name="robots" content="noindex,nofollow">');
      expect(html).toContain('action="/api/preview/acme-abc12345"');
      expect(html).toContain('name="password"');
      expect(html).toContain('type="password"');
      // 16px input keeps iOS from zooming (house mobile rule).
      expect(html).toContain('font-size: 16px');
    });

    it('escapes a hostile title and error', () => {
      const html = renderPasswordPage({
        slug: 'acme-abc12345',
        title: '<script>alert("t")</script>',
        error: '<img src=x onerror=alert(1)>',
      });
      expect(html).not.toContain('<script>alert("t")</script>');
      expect(html).toContain('&lt;script&gt;alert(&quot;t&quot;)&lt;/script&gt;');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('escapes a hostile slug in the form action', () => {
      const html = renderPasswordPage({ slug: 'a"><script>' });
      expect(html).not.toContain('"><script>');
      expect(html).toContain('&quot;&gt;&lt;script&gt;');
    });
  });

  describe('safeImageDataUri', () => {
    it('accepts the raster types we allow', () => {
      expect(safeImageDataUri(PNG_1PX)).toBe(PNG_1PX);
      expect(safeImageDataUri('data:image/jpeg;base64,AAAA')).toBe('data:image/jpeg;base64,AAAA');
      expect(safeImageDataUri('data:image/webp;base64,AAAA')).toBe('data:image/webp;base64,AAAA');
    });

    it('rejects SVG even though it is an image type', () => {
      // SVG can carry script; there is no reason to accept it for a decoration.
      expect(safeImageDataUri('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBeNull();
    });

    it('rejects remote URLs, script URIs and junk', () => {
      expect(safeImageDataUri('https://evil.example/logo.png')).toBeNull();
      expect(safeImageDataUri('javascript:alert(1)')).toBeNull();
      expect(safeImageDataUri('data:text/html;base64,PGI+')).toBeNull();
      expect(safeImageDataUri('data:image/png,notbase64')).toBeNull();
      expect(safeImageDataUri('')).toBeNull();
      expect(safeImageDataUri(null)).toBeNull();
      expect(safeImageDataUri(undefined)).toBeNull();
    });

    it('rejects a payload carrying a quote break-out attempt', () => {
      expect(safeImageDataUri('data:image/png;base64,AAA" onerror="alert(1)')).toBeNull();
    });

    it('rejects a payload carrying a CSS url() break-out attempt', () => {
      expect(safeImageDataUri('data:image/jpeg;base64,AAA") ; x:url(')).toBeNull();
    });
  });

  describe('renderPasswordPage with a logo', () => {
    it('renders the logo when one is supplied', () => {
      const html = renderPasswordPage({ slug: 'acme-abc12345', logoDataUri: PNG_1PX });
      expect(html).toContain(`<img class="logo" src="${PNG_1PX}" alt="">`);
    });

    it('omits the logo entirely when there is none', () => {
      const html = renderPasswordPage({ slug: 'acme-abc12345' });
      expect(html).not.toContain('<img');
    });

    it('drops a hostile logo value rather than emitting it', () => {
      const html = renderPasswordPage({
        slug: 'acme-abc12345',
        logoDataUri: 'x" onerror="alert(1)',
      });
      expect(html).not.toContain('onerror');
      expect(html).not.toContain('<img');
    });
  });

  describe('renderPasswordPage with a background image', () => {
    const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAg=';

    it('paints the background as an inline data URI (CSP allows img-src data: only)', () => {
      const html = renderPasswordPage({ slug: 'acme-abc12345', bgDataUri: JPG });
      expect(html).toContain(`background-image: url("${JPG}")`);
      // The overlay must be present so text stays readable over any photo.
      expect(html).toContain('class="backdrop"');
    });

    it('omits the backdrop element entirely when there is no background', () => {
      const html = renderPasswordPage({ slug: 'acme-abc12345' });
      expect(html).not.toContain('class="backdrop"');
      expect(html).not.toContain('background-image');
    });

    it('drops a hostile background value rather than emitting it', () => {
      const html = renderPasswordPage({
        slug: 'acme-abc12345',
        bgDataUri: 'x");} body{background:url(javascript:alert(1)',
      });
      expect(html).not.toContain('javascript:');
      expect(html).not.toContain('class="backdrop"');
    });

    it('renders logo and background together', () => {
      const html = renderPasswordPage({ slug: 'acme-abc12345', logoDataUri: PNG_1PX, bgDataUri: JPG });
      expect(html).toContain('<img class="logo"');
      expect(html).toContain('class="backdrop"');
    });
  });

  describe('htmlPageHeaders', () => {
    it('allows data: images only — never a remote host', () => {
      const csp = String((htmlPageHeaders() as Record<string, string>)['Content-Security-Policy']);
      expect(csp).toContain('img-src data:');
      expect(csp).toContain("default-src 'none'");
      expect(csp).not.toMatch(/img-src[^;]*https?:/);
      expect(csp).not.toMatch(/img-src[^;]*\*/);
    });
  });

  describe('renderMessagePage', () => {
    it('escapes its inputs', () => {
      const html = renderMessagePage('<b>Gone</b>', '<i>expired</i>');
      expect(html).toContain('<meta name="robots" content="noindex,nofollow">');
      expect(html).not.toContain('<b>Gone</b>');
      expect(html).toContain('&lt;b&gt;Gone&lt;/b&gt;');
      expect(html).toContain('&lt;i&gt;expired&lt;/i&gt;');
    });
  });
});
