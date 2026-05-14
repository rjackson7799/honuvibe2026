/**
 * Generate creator-thumbnail-style course covers using an instructor's profile
 * photo as a reference, via OpenAI gpt-image-1.
 *
 * Run: pnpm tsx scripts/generate-instructor-thumbnails.ts
 *
 * Writes drafts to public/images/courses/_drafts/{slug}.webp (gitignored).
 * Promote a chosen draft to a real course by uploading it through the admin
 * UI's "Upload image" button on /admin/courses/[id].
 */

import fs from 'node:fs';
import path from 'node:path';
import OpenAI, { toFile } from 'openai';
import sharp from 'sharp';

type Entry = {
  slug: string;
  instructorPhoto: string;
  title: string;
  vibe: string;
};

const ENTRIES: Entry[] = [
  {
    slug: 'ai-essentials-ryan',
    instructorPhoto: 'public/images/partners/instructors/ryan.webp',
    title: 'AI Essentials',
    vibe: 'confident, focused, slight smile — gesturing toward the camera',
  },
  {
    slug: 'ai-for-ops-chimi',
    instructorPhoto: 'public/images/partners/instructors/chimi.webp',
    title: 'AI for Daily Ops',
    vibe: 'warm, encouraging, hands-on energy',
  },
];

const OUTPUT_DIR = 'public/images/courses/_drafts';

function buildPrompt(entry: Entry): string {
  return [
    `A widescreen 16:9 online-course cover image featuring the person from the reference photo.`,
    ``,
    `Subject placement: instructor on the RIGHT third of the frame, shoulders-up, facing the camera, ${entry.vibe}. Preserve the person's face, hair, skin tone, and general appearance from the reference. Studio lighting, crisp focus, slight rim light from the left.`,
    ``,
    `Left two-thirds: clean negative space for overlay text (no text rendered in the image itself). Soft seafoam-teal gradient background with subtle floating geometric forms (matte spheres, translucent panels, gentle dotted-grid texture) — premium AI-education feel, not cyberpunk, not neon.`,
    ``,
    `Accent details: occasional warm coral/pale-gold highlight on background forms. No yellow YouTube blocks. No exaggerated cartoon expression. No arrows, no shouting captions, no emojis.`,
    ``,
    `Mood: confident, modern, calm-but-energetic. Suggests "professional creator who actually uses these tools." Quality reference: editorial tech-publication cover, not a clickbait thumbnail.`,
    ``,
    `Absolutely no text, letters, numbers, or words anywhere in the image.`,
  ].join('\n');
}

async function cropTo16x9(pngBuffer: Buffer): Promise<Buffer> {
  // gpt-image-1 returns 1536x1024 (3:2). Crop to 16:9 → 1536x864 (center-crop vertically).
  const targetHeight = 864;
  const top = Math.floor((1024 - targetHeight) / 2);
  return sharp(pngBuffer)
    .extract({ left: 0, top, width: 1536, height: targetHeight })
    .webp({ quality: 88 })
    .toBuffer();
}

async function generateOne(client: OpenAI, entry: Entry): Promise<void> {
  const absPhoto = path.resolve(entry.instructorPhoto);
  if (!fs.existsSync(absPhoto)) {
    throw new Error(`Instructor photo not found: ${absPhoto}`);
  }

  const photoBuffer = fs.readFileSync(absPhoto);
  const photoFile = await toFile(photoBuffer, path.basename(absPhoto), {
    type: 'image/webp',
  });

  process.stdout.write(`[${entry.slug}] generating with gpt-image-1 (60s+)...\n`);

  const result = await client.images.edit({
    model: 'gpt-image-2',
    image: photoFile,
    prompt: buildPrompt(entry),
    size: '1536x1024',
    quality: 'high',
    n: 1,
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(`[${entry.slug}] no image returned`);
  }

  const cropped = await cropTo16x9(Buffer.from(b64, 'base64'));

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

  process.stdout.write(`\nDone. Review drafts in ${OUTPUT_DIR}/\n`);
  process.stdout.write(
    `Re-run to get new variants. Promote a chosen draft by uploading it via\n` +
      `the admin "Upload image" button on /admin/courses/[id].\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
