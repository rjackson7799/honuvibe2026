import { Font } from '@react-pdf/renderer';
import fs from 'fs';
import path from 'path';

// CJK ranges as \u escapes (ASCII-only source, encoding-safe): CJK punctuation,
// hiragana, katakana, full/half-width forms, common CJK unified ideographs.
const R = '\\u3000-\\u303f\\u3040-\\u309f\\u30a0-\\u30ff\\uff00-\\uffef\\u4e00-\\u9faf';
const CJK = new RegExp(`[${R}]`);
const CJK_SPLIT = new RegExp(`[${R}]|[^${R}]+`, 'g');

/**
 * react-pdf hyphenation callback. react-pdf's line-breaker assumes spaces
 * between words; Japanese has none, so a whole JP run is treated as one
 * unbreakable word and overflows. This inserts a break opportunity between each
 * CJK character while leaving Latin runs whole (so English word-breaking is
 * unchanged). Exported for unit testing.
 */
export function cjkHyphenate(word: string): string[] {
  if (!CJK.test(word)) return [word];
  return word.match(CJK_SPLIT) ?? [word];
}

const FONT_DIR = path.join(process.cwd(), 'lib/pdf/fonts');

// Prefer the bundled local .ttf (deterministic, no render-time network fetch);
// fall back to the Google CDN URL if the file wasn't traced into the bundle.
function src(file: string, remote: string): string {
  try {
    const local = path.join(FONT_DIR, file);
    if (fs.existsSync(local)) return local;
  } catch {
    // fs not available / traced — fall through to remote.
  }
  return remote;
}

let fontsRegistered = false;

export function registerFonts(): void {
  if (fontsRegistered) return;

  Font.register({
    family: 'DM Serif Display',
    src: src('DMSerifDisplay-Regular.ttf', 'https://fonts.gstatic.com/s/dmserifdisplay/v17/-nFnOHM81r4j6k0gjAW3mujVU2B2K_c.ttf'),
    fontWeight: 400,
  });

  Font.register({
    family: 'DM Sans',
    fonts: [
      { src: src('DMSans-Regular.ttf', 'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAopxhTg.ttf'), fontWeight: 400 },
      // Italic is required: react-pdf resolves fontStyle strictly, so any style
      // using fontStyle: 'italic' (e.g. report quotes) throws
      // "Could not resolve font" if no italic source is registered.
      { src: src('DMSans-Italic.ttf', 'https://fonts.gstatic.com/s/dmsans/v17/rP2rp2ywxg089UriCZaSExd86J3t9jz86Mvy4qCRAL19DksVat-JDW3z.ttf'), fontWeight: 400, fontStyle: 'italic' },
      { src: src('DMSans-SemiBold.ttf', 'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAfJthTg.ttf'), fontWeight: 600 },
      { src: src('DMSans-Bold.ttf', 'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwARZthTg.ttf'), fontWeight: 700 },
    ],
  });

  Font.register({
    family: 'Noto Sans JP',
    fonts: [
      { src: src('NotoSansJP-Regular.ttf', 'https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf'), fontWeight: 400 },
      { src: src('NotoSansJP-Bold.ttf', 'https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFPYk75s.ttf'), fontWeight: 700 },
    ],
  });

  Font.registerHyphenationCallback(cjkHyphenate);

  fontsRegistered = true;
}
