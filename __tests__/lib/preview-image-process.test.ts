// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processScreenshot } from '@/lib/previews/image-process';

const dir = path.join(__dirname, '..', 'fixtures', 'screenshots');
const load = (n: string) => fs.readFileSync(path.join(dir, n));

async function expectValid(name: string) {
  const r = await processScreenshot(load(name));
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error('unreachable');
  const full = await sharp(r.full).metadata();
  const thumb = await sharp(r.thumb).metadata();
  expect(full.format).toBe('jpeg');
  expect(thumb.format).toBe('jpeg');
  expect(Math.max(full.width!, full.height!)).toBeLessThanOrEqual(1600);
  expect(Math.max(thumb.width!, thumb.height!)).toBeLessThanOrEqual(240);
  expect(full.exif).toBeUndefined();
  expect(thumb.exif).toBeUndefined();
  return { full, thumb, r };
}

describe('processScreenshot valid inputs', () => {
  it('PNG -> JPEG', async () => {
    const { full } = await expectValid('normal.png');
    expect(full.width).toBe(1200);
  });
  it('JPEG -> JPEG', async () => {
    await expectValid('normal.jpg');
  });
  it('WebP is accepted', async () => {
    await expectValid('normal.webp');
  });
  it('downscales the retina screenshot to 1600 and stays small', async () => {
    const { full, r } = await expectValid('retina-4mb.png');
    expect(full.width).toBe(1600);
    expect(r.full.length).toBeLessThanOrEqual(400 * 1024);
  });
  it('EXIF orientation 6 comes out upright with no EXIF', async () => {
    const input = await sharp(load('orientation6.jpg')).metadata();
    expect([input.width, input.height]).toEqual([400, 200]);
    expect(input.orientation).toBe(6);
    const { full, thumb } = await expectValid('orientation6.jpg');
    expect([full.width, full.height]).toEqual([200, 400]);
    expect(thumb.height!).toBeGreaterThan(thumb.width!);
  });
  it('strips GPS metadata', async () => {
    const input = await sharp(load('gps.jpg')).metadata();
    expect(input.exif).toBeDefined();
    const { r } = await expectValid('gps.jpg');
    expect(r.full.includes(Buffer.from('Exif'))).toBe(false);
    expect(r.thumb.includes(Buffer.from('Exif'))).toBe(false);
  });
});

describe('processScreenshot invalid inputs', () => {
  const cases: [string, () => Buffer][] = [
    ['FF D8 FF + random bytes', () => load('jpeg-sig-random.jpg')],
    ['truncated PNG', () => load('truncated.png')],
    ['HTML named .jpg', () => load('not-image.jpg')],
    ['GIF', () => load('normal.gif')],
    ['8001x10 (dimension limit)', () => load('wide-8001x10.png')],
    ['over the pixel limit', () => load('huge-7000x7000.png')],
    ['zero bytes', () => Buffer.alloc(0)],
  ];
  for (const [label, get] of cases) {
    it(`rejects ${label} without throwing`, async () => {
      await expect(processScreenshot(get())).resolves.toEqual({ ok: false, error: 'Unsupported image' });
    });
  }
  it('accepts a plain Uint8Array', async () => {
    const r = await processScreenshot(new Uint8Array(load('normal.jpg')));
    expect(r.ok).toBe(true);
  });
});
