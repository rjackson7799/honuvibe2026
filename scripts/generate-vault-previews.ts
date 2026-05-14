/**
 * Generate temporary abstract concept images for the Vertice landing's
 * "Vault preview" section (6 cards). These are placeholders until the
 * section is wired to real Vault content from Supabase.
 *
 * Run: pnpm tsx scripts/generate-vault-previews.ts
 *
 * Writes WebP files to public/images/vault-preview/{slug}.webp (committed to git;
 * not gitignored, since they ship to production until real content lands).
 */

import fs from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import sharp from 'sharp';

// Auto-load .env.local (matches scripts/seed-glossary.mjs pattern; no dotenv dep).
(function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
})();

type Entry = {
  slug: string;
  subject: string;
};

const ENTRIES: Entry[] = [
  {
    slug: 'business-email-templates',
    subject:
      'Floating envelope and letter forms, layered translucent document panels with subtle line-art lettering hints (no readable text), gentle stacked-paper motifs.',
  },
  {
    slug: 'claude-prompts-50',
    subject:
      'Floating speech-bubble forms in varied sizes, geometric chat-interface panels, soft cursor-blink accents. Abstract — no readable text inside the bubbles.',
  },
  {
    slug: 'research-automation',
    subject:
      'Connected network nodes with flowing curved lines between them, abstracted magnifying-glass form, layered translucent panels suggesting data flow.',
  },
  {
    slug: 'chatgpt-walkthrough',
    subject:
      'Floating circular play-button shape, layered video-frame rectangles, soft directional curves suggesting motion, geometric cursor accent.',
  },
  {
    slug: 'meeting-summary-prompts',
    subject:
      'Floating notepad and document forms with abstracted bullet-list lines (no readable text), calendar grid motifs, gentle audio-wave curves.',
  },
  {
    slug: 'ai-delegation-guide',
    subject:
      'Two abstract geometric figures passing a glowing translucent sphere between them, soft flow lines connecting them, suggesting handoff and trust.',
  },
];

const OUTPUT_DIR = 'public/images/vault-preview';

function buildPrompt(entry: Entry): string {
  return [
    `Create a wide horizontal background image for an online-course concept card about:`,
    entry.subject,
    ``,
    `Visual style: soft, modern 3D-rendered illustration with a glassmorphic, premium-tech feel. Light cream, off-white, or pale seafoam ground — never dark, never neon.`,
    ``,
    `Composition: subject elements floating in the center area with calm, clean negative space at the edges. Wide horizontal flow. Matte and glassy surfaces with subtle depth and soft shadows. Gentle dotted-grid texture accents. Occasional pastel coral or pale-gold sphere for warmth.`,
    ``,
    `Color palette: seafoam teal as primary, coral and pale gold as occasional warm accents, pale neutral grounds. No deep navy, no dark backgrounds, no neon glows, no cyberpunk.`,
    ``,
    `Mood: calm, intelligent, optimistic, premium AI-education brand. Editorial tech-publication quality.`,
    ``,
    `Absolutely no text, letters, numbers, or words anywhere in the image. No logos. No human faces.`,
  ].join('\n');
}

async function cropToWide(pngBuffer: Buffer): Promise<Buffer> {
  // gpt-image-2 returns 1536x1024 (3:2). Crop to ~2.4:1 (1536x640) to match
  // the 140px-tall card art frame in vertice.css.
  const targetHeight = 640;
  const top = Math.floor((1024 - targetHeight) / 2);
  return sharp(pngBuffer)
    .extract({ left: 0, top, width: 1536, height: targetHeight })
    .webp({ quality: 86 })
    .toBuffer();
}

async function generateOne(client: OpenAI, entry: Entry): Promise<void> {
  process.stdout.write(`[${entry.slug}] generating with gpt-image-2 (60s+)...\n`);

  const result = await client.images.generate({
    model: 'gpt-image-2',
    prompt: buildPrompt(entry),
    size: '1536x1024',
    quality: 'high',
    n: 1,
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(`[${entry.slug}] no image returned`);
  }

  const cropped = await cropToWide(Buffer.from(b64, 'base64'));

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `${entry.slug}.webp`);
  fs.writeFileSync(outPath, cropped);

  const kb = Math.round(cropped.length / 1024);
  process.stdout.write(`[${entry.slug}] wrote ${outPath} (${kb} KB)\n`);
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Add it to .env.local and re-run.');
  }

  const client = new OpenAI({ apiKey });

  for (const entry of ENTRIES) {
    try {
      await generateOne(client, entry);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[${entry.slug}] FAILED: ${message}\n`);
    }
  }

  process.stdout.write(`\nDone. Files in ${OUTPUT_DIR}/\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
