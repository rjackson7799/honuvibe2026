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
  PREVIEW_COOKIE_PREFIX,
} from './gate';

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
