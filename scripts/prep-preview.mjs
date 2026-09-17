/**
 * Prepare a client-preview export directory from a manifest, in one command:
 *
 *   node scripts/prep-preview.mjs <manifest.json> <out-dir>
 *
 * What it does (idempotent — safe to re-run after editing the manifest):
 *   1. Copies each page's `source` HTML to `<out-dir>/<file>`, rewriting
 *      `<title>` (Claude Design exports all ship "Bundled Page"), injecting
 *      `<meta name="robots" content="noindex,nofollow">`, and stripping any
 *      analytics snippets (GA / gtag / Plausible / Segment / Hotjar) so the
 *      preview never phones home.
 *   2. Warns about root-absolute asset references (`src="/…"`, `href="/…"`,
 *      `url(/…)`) — the gate serves from a nested URL, so those would 404.
 *   3. Copies the optional branding files to the fixed names the gate's password
 *      page looks for: `logo.png` (≤ 256 KB) and `bg.jpg` (≤ 600 KB).
 *   4. Writes `<out-dir>/index.html` — the "preview board" the client lands on
 *      after the password: branded header, one panel per page, notes, footer.
 *
 * Then upload with `node --env-file=.env.local scripts/upload-preview.mjs <out-dir> <slug>`
 * and upsert the client_previews
 * row (see the studio-client-preview skill). The manifest itself stays OUTSIDE
 * the out-dir on purpose: it carries local source paths, and the upload script
 * pushes every file in the out-dir.
 *
 * Manifest shape (all copy is verbatim — write it for the client, in their
 * language; add a second-language line if the client is Japanese):
 * {
 *   "client": "Okada Kazuchika",                 // heading when there is no logo; <title> prefix
 *   "tabTitle": "Okada Kazuchika — Preview",     // optional; default "<client> — Preview"
 *   "lang": "en",                                // <html lang>
 *   "accent": "#c9a24a",                         // one brand color for labels + hover
 *   "logo": "C:/path/logo.png",                  // optional → logo.png (login card + board header)
 *   "background": "C:/path/bg.jpg",              // optional → bg.jpg (login backdrop + board header)
 *   "fonts": [                                   // optional; inlined into the board as data URIs
 *     { "family": "Zen Antique", "file": "C:/path/ZenAntique-latin.woff2", "role": "display" },
 *     { "family": "Zen Kaku Gothic New", "file": "C:/path/ZenKaku-500.woff2", "weight": 500, "role": "body" }
 *   ],
 *   "intro": "Two directions for your review.",  // one or two sentences under the header
 *   "introSecondary": "ご確認ください。",         // optional second-language line
 *   "links": {                                   // optional: rename hardcoded cross-page links.
 *     "Okada Appearances.dc.html": "appearances.html"   // Claude Design links sibling pages as
 *   },                                           //   "<Project> <Page>.dc.html" — export EVERY linked page
 *   "pages": [
 *     {
 *       "file": "site.html",                     // name inside the export (bare file name)
 *       "source": "C:/Users/…/Home.html",        // where the export lives locally
 *       "title": "Okada Kazuchika — Site concept", // browser tab title for that page
 *       "kind": "Site concept",                  // small label on the board panel
 *       "name": "The public site",               // panel heading
 *       "description": "Hero, appearances, gallery…", // one or two sentences
 *       "cta": "Open the site",                  // link text
 *       "board": true                            // false = upload + prep it, but no panel on the board
 *     }
 *   ],
 *   "notes": ["Placeholder photos…"],            // optional caveats shown to the client
 *   "footer": "HonuVibe Studio · Honolulu · Tokyo" // optional
 * }
 */

import { readFile, writeFile, mkdir, stat, copyFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOGO_MAX = 256 * 1024;
const BG_MAX = 600 * 1024;
const ROBOTS_META = '<meta name="robots" content="noindex,nofollow">';
const FILE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/; // mirrors the entry_file CHECK in migration 057
// The two manifest values that land inside <style> (not HTML text) are validated
// rather than escaped: the board is a streamed export, served with NO CSP, so a
// value carrying `</style><script>` would run. A hex color and a plain family
// name are all the board ever needs.
const ACCENT_RE = /^#[0-9a-fA-F]{3,8}$/;
const FONT_FAMILY_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,60}$/;

function fail(message) {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fileExists(path) {
  const s = await stat(path).catch(() => null);
  return Boolean(s && s.isFile());
}

// --- 1 + 2: page prep ------------------------------------------------------

const ANALYTICS_PATTERNS = [
  // Google Analytics / gtag / GTM loader + inline config.
  /<script[^>]*src=["'][^"']*(googletagmanager\.com|google-analytics\.com)[^"']*["'][^>]*>\s*<\/script>/gi,
  /<script[^>]*>[^<]*(gtag\(|ga\(|GoogleAnalyticsObject|dataLayer\.push)[^<]*<\/script>/gi,
  // Plausible, Segment, Hotjar, Fathom, Clarity.
  /<script[^>]*src=["'][^"']*(plausible\.io|segment\.com|hotjar\.com|usefathom\.com|clarity\.ms)[^"']*["'][^>]*>\s*<\/script>/gi,
  /<script[^>]*>[^<]*(hj\(|analytics\.load\(|clarity\()[^<]*<\/script>/gi,
];

export function prepHtml(html, title, links = {}) {
  let out = html;

  // Cross-page links: Claude Design hardcodes "./<Project> <Page>.dc.html" (the
  // space arrives as %20). Rewrite every form of each name so the sub pages can
  // live under clean names in the export.
  for (const [from, to] of Object.entries(links)) {
    for (const needle of new Set([from, encodeURI(from), encodeURIComponent(from), from.replace(/ /g, '%20')])) {
      out = out.split(needle).join(to);
    }
  }

  // <title>: replace the first one, or add one if the export has none.
  if (/<title>[^<]*<\/title>/i.test(out)) {
    out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  } else {
    out = out.replace(/<head([^>]*)>/i, `<head$1>\n<title>${escapeHtml(title)}</title>`);
  }

  // robots meta, once.
  if (!/<meta\s+name=["']robots["']/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>\n${ROBOTS_META}`);
  }

  let stripped = 0;
  for (const re of ANALYTICS_PATTERNS) {
    out = out.replace(re, () => {
      stripped += 1;
      return '';
    });
  }

  // Root-absolute asset references break under /api/preview/<slug>/… — warn only
  // (a Claude Design bundle never has them; a hand-built export might).
  const absolute = out.match(/(?:src|href)=["']\/(?!\/)[^"']*["']|url\(\s*["']?\/(?!\/)[^)"']*/gi) ?? [];

  return { html: out, stripped, absolute };
}

/**
 * Page links in `html` that this export does not ship — each one 404s for the
 * client. Covers both an unrenamed Claude Design sibling ("Okada Gallery.dc.html")
 * and a renamed one whose target was never exported ("gallery.html" in `links`
 * but absent from `pages`).
 *
 * Anchored on the href attribute — a bundle's quotes are backslash-escaped inside
 * its JS string — so doctypes, mime types and stray base64 in a 12 MB export
 * cannot masquerade as page links.
 */
export function danglingLinks(html, shipped) {
  const names = [...html.matchAll(/href=\\?["']\.?\/?([A-Za-z0-9 _%-]+\.(?:dc\.)?html)/gi)].map(
    (m) => decodeURIComponent(m[1]),
  );
  return [...new Set(names)].filter((name) => !shipped.has(name));
}

// --- 4: preview board ------------------------------------------------------

async function fontFaceCss(fonts) {
  const blocks = [];
  for (const f of fonts) {
    if (!f.family || !f.file) throw new Error(`fonts[] entries need "family" and "file" (got ${JSON.stringify(f)}).`);
    if (!FONT_FAMILY_RE.test(f.family)) throw new Error(`fonts[].family "${f.family}" must be a plain name (letters, digits, spaces, - _).`);
    if (!(await fileExists(f.file))) throw new Error(`Font file not found: ${f.file}`);
    const b64 = (await readFile(f.file)).toString('base64');
    const ext = f.file.toLowerCase().split('.').pop();
    const format = ext === 'woff2' ? 'woff2' : ext === 'woff' ? 'woff' : ext === 'otf' ? 'opentype' : 'truetype';
    const mime = ext === 'woff2' ? 'font/woff2' : ext === 'woff' ? 'font/woff' : ext === 'otf' ? 'font/otf' : 'font/ttf';
    blocks.push(
      `@font-face { font-family: "${f.family}"; font-weight: ${f.weight ?? 400}; font-style: normal; font-display: swap; src: url("data:${mime};base64,${b64}") format("${format}"); }`,
    );
  }
  return blocks.join('\n');
}

function fontStack(first, rest) {
  return [first, ...rest]
    .filter(Boolean)
    .map((f) => (f.includes('"') || !f.includes(' ') ? f : `"${f}"`))
    .join(', ');
}

export function renderBoard(m, opts) {
  const lang = m.lang ?? 'en';
  const accent = m.accent ?? '#c9a24a';
  if (!ACCENT_RE.test(accent)) throw new Error(`accent "${accent}" must be a hex color like #c9a24a.`);
  const tabTitle = m.tabTitle ?? `${m.client} — Preview`;
  const displayFont = m.fonts?.find((f) => f.role === 'display')?.family;
  const bodyFont = m.fonts?.find((f) => f.role === 'body')?.family;
  for (const fam of [displayFont, bodyFont]) {
    if (fam && !FONT_FAMILY_RE.test(fam)) throw new Error(`fonts[].family "${fam}" must be a plain name (letters, digits, spaces, - _).`);
  }
  const displayStack = fontStack(displayFont, ['Georgia', '"Hiragino Mincho ProN"', '"Yu Mincho"', 'serif']);
  const bodyStack = fontStack(bodyFont, [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    '"Hiragino Sans"',
    '"Yu Gothic"',
    'Roboto',
    'sans-serif',
  ]);

  const header = opts.hasLogo
    ? `<img class="logo" src="logo.png" alt="${escapeHtml(m.client)}">`
    : `<h1 class="client">${escapeHtml(m.client)}</h1>`;

  const panels = m.pages
    .filter((p) => p.board !== false)
    .map(
      (p) => `
      <a class="panel" href="${escapeHtml(p.file)}" target="_blank" rel="noopener">
        <span class="kind">${escapeHtml(p.kind ?? '')}</span>
        <span class="name">${escapeHtml(p.name ?? p.title)}</span>
        <span class="desc">${escapeHtml(p.description ?? '')}</span>
        <span class="cta">${escapeHtml(p.cta ?? 'Open')}</span>
      </a>`,
    )
    .join('\n');

  const notes = m.notes?.length
    ? `<section class="notes" aria-label="Notes">
        <ul>${m.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>
      </section>`
    : '';

  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${ROBOTS_META}
<title>${escapeHtml(tabTitle)}</title>
<style>
${opts.fontCss}
:root { color-scheme: dark; --accent: ${accent}; --ink: #f2efe8; --ink-2: rgba(242,239,232,0.64); --ink-3: rgba(242,239,232,0.38); --bg: #0a0a0c; }
* { box-sizing: border-box; }
html { background: var(--bg); }
body {
  margin: 0; min-height: 100vh; color: var(--ink); background: var(--bg);
  font-family: ${bodyStack}; font-size: 16px; line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
.scene {
  position: relative; padding: clamp(40px, 9vh, 96px) 24px clamp(48px, 8vh, 80px);
  ${opts.hasBg ? 'background: url("bg.jpg") center 30% / cover no-repeat;' : ''}
}
.scene::before {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(10,10,12,0.30) 0%, rgba(10,10,12,0.62) 55%, var(--bg) 100%);
}
.wrap { position: relative; max-width: 1040px; margin: 0 auto; }
.logo { display: block; width: min(520px, 82vw); height: auto; }
.client { margin: 0; font-family: ${displayStack}; font-weight: 400; font-size: clamp(40px, 7vw, 76px); line-height: 0.95; letter-spacing: -0.01em; }
.intro { max-width: 60ch; margin: 32px 0 0; font-size: clamp(17px, 2vw, 20px); color: var(--ink); }
.intro-2 { max-width: 60ch; margin: 8px 0 0; font-size: 15px; line-height: 1.8; color: var(--ink-2); }
main { max-width: 1040px; margin: 0 auto; padding: 8px 24px 40px; }
.panels { display: grid; grid-template-columns: 1fr; gap: 0; border-top: 1px solid rgba(242,239,232,0.14); }
.panel {
  display: grid; grid-template-columns: 1fr; gap: 6px; align-items: start;
  padding: 34px 0 36px; color: inherit; text-decoration: none;
  border-bottom: 1px solid rgba(242,239,232,0.14); position: relative;
}
.panel .kind { font-size: 13px; color: var(--accent); }
.panel .name { font-family: ${displayStack}; font-weight: 400; font-size: clamp(30px, 4.6vw, 46px); line-height: 1.05; }
.panel .desc { max-width: 62ch; color: var(--ink-2); font-size: 16px; }
.panel .cta { margin-top: 10px; font-size: 15px; color: var(--ink); text-decoration: underline; text-underline-offset: 5px; text-decoration-color: var(--accent); }
.panel:hover .name, .panel:focus-visible .name { color: var(--accent); }
.panel:focus-visible { outline: 2px solid var(--accent); outline-offset: 6px; }
@media (min-width: 760px) {
  .panel { grid-template-columns: 180px 1fr; column-gap: 32px; }
  .panel .kind { padding-top: 12px; }
  .panel .name, .panel .desc, .panel .cta { grid-column: 2; }
}
.notes { margin: 40px 0 0; padding: 22px 24px; border: 1px solid rgba(242,239,232,0.14); border-radius: 10px; color: var(--ink-2); font-size: 15px; }
.notes ul { margin: 0; padding-left: 18px; }
.notes li + li { margin-top: 6px; }
footer { max-width: 1040px; margin: 0 auto; padding: 24px 24px 48px; color: var(--ink-3); font-size: 13px; display: flex; flex-wrap: wrap; gap: 8px 24px; justify-content: space-between; }
@media (prefers-reduced-motion: no-preference) { .panel .name { transition: color 160ms ease; } }
</style>
</head>
<body>
<header class="scene">
  <div class="wrap">
    ${header}
    ${m.intro ? `<p class="intro">${escapeHtml(m.intro)}</p>` : ''}
    ${m.introSecondary ? `<p class="intro-2">${escapeHtml(m.introSecondary)}</p>` : ''}
  </div>
</header>
<main>
  <nav class="panels" aria-label="Concepts">${panels}
  </nav>
  ${notes}
</main>
<footer>
  <span>Private preview — please don't share this link.</span>
  ${m.footer ? `<span>${escapeHtml(m.footer)}</span>` : ''}
</footer>
</body>
</html>
`;
}

// --- main ------------------------------------------------------------------

async function main() {
  const [manifestPath, outDirArg] = process.argv.slice(2);
  if (!manifestPath || !outDirArg) {
    fail('Usage: node scripts/prep-preview.mjs <manifest.json> <out-dir>');
  }
  const outDir = resolve(outDirArg);
  const manifestAbs = resolve(manifestPath);
  if (manifestAbs.startsWith(outDir + '\\') || manifestAbs.startsWith(outDir + '/')) {
    fail('Keep the manifest OUTSIDE the out-dir — everything in the out-dir gets uploaded.');
  }

  let m;
  try {
    m = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (err) {
    fail(`Could not read manifest: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!m.client) fail('manifest.client is required.');
  if (!Array.isArray(m.pages) || m.pages.length === 0) fail('manifest.pages must have at least one page.');

  await mkdir(outDir, { recursive: true });

  // Pages.
  for (const p of m.pages) {
    if (!p.file || !FILE_RE.test(p.file)) fail(`pages[].file "${p.file}" must be a bare file name like site.html.`);
    if (p.file === 'index.html') fail('pages[].file cannot be index.html — that name is the board.');
    if (!p.source || !(await fileExists(p.source))) fail(`pages[].source not found: ${p.source}`);
    const raw = await readFile(p.source, 'utf8');
    const { html, stripped, absolute } = prepHtml(raw, p.title ?? `${m.client} — ${p.name ?? basename(p.file)}`, m.links ?? {});
    await writeFile(join(outDir, p.file), html, 'utf8');
    const mb = (Buffer.byteLength(html) / (1024 * 1024)).toFixed(2);
    console.log(`  ✓ ${p.file}  (${mb} MB${stripped ? `, stripped ${stripped} analytics tag(s)` : ''})`);
    if (absolute.length) {
      console.log(`    ! ${absolute.length} root-absolute asset reference(s) — these will 404 under the gate:`);
      for (const a of absolute.slice(0, 8)) console.log(`      ${a}`);
    }
  }

  // Branding files.
  let hasLogo = false;
  let hasBg = false;
  if (m.logo) {
    if (!(await fileExists(m.logo))) fail(`logo not found: ${m.logo}`);
    const size = (await stat(m.logo)).size;
    if (!m.logo.toLowerCase().endsWith('.png')) fail('logo must be a .png (the gate looks for logo.png).');
    if (size > LOGO_MAX) fail(`logo is ${(size / 1024).toFixed(0)} KB; the gate ignores logos over ${LOGO_MAX / 1024} KB.`);
    await copyFile(m.logo, join(outDir, 'logo.png'));
    hasLogo = true;
    console.log(`  ✓ logo.png  (${(size / 1024).toFixed(0)} KB)`);
  }
  if (m.background) {
    if (!(await fileExists(m.background))) fail(`background not found: ${m.background}`);
    const size = (await stat(m.background)).size;
    if (!/\.jpe?g$/i.test(m.background)) fail('background must be a .jpg (the gate looks for bg.jpg).');
    if (size > BG_MAX) fail(`background is ${(size / 1024).toFixed(0)} KB; the gate ignores backgrounds over ${BG_MAX / 1024} KB.`);
    await copyFile(m.background, join(outDir, 'bg.jpg'));
    hasBg = true;
    console.log(`  ✓ bg.jpg  (${(size / 1024).toFixed(0)} KB)`);
  }

  // Board.
  const fontCss = await fontFaceCss(m.fonts ?? []);
  const board = renderBoard(m, { hasLogo, hasBg, fontCss });
  await writeFile(join(outDir, 'index.html'), board, 'utf8');
  const onBoard = m.pages.filter((p) => p.board !== false).length;
  console.log(`  ✓ index.html  (board: ${onBoard} panel(s), ${m.pages.length - onBoard} sub page(s) linked only from the concepts)`);

  // Any page link that is not shipped will 404 for the client — say so loudly
  // rather than let them find it. This covers BOTH an unrenamed Claude Design
  // sibling ("Okada Gallery.dc.html") and a renamed one whose target was never
  // exported ("gallery.html" in `links` but absent from `pages`).
  const shipped = new Set([...m.pages.map((p) => p.file), 'index.html']);
  for (const p of m.pages) {
    const html = await readFile(join(outDir, p.file), 'utf8');
    const dangling = danglingLinks(html, shipped);
    if (dangling.length) {
      console.log(`    ! ${p.file} links to ${dangling.length} page(s) not in this export — they will 404:`);
      for (const d of dangling) console.log(`      ${d}`);
    }
  }

  console.log(`\nPrepared ${outDir}`);
  console.log('Next: node --env-file=.env.local scripts/upload-preview.mjs <out-dir> <slug>\n');
}

// Run only when executed directly — the unit tests import prepHtml/renderBoard.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
}
