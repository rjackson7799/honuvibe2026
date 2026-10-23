import sharp from 'sharp';

// Server-side screenshot normaliser for preview feedback. Every uploaded image
// is decoded and re-encoded (never stored as sent): output is always JPEG with
// all metadata (EXIF/GPS/ICC) dropped. Pure: no 'server-only' import so tests
// can load it directly (same stance as gate.ts).

export const SCREENSHOT_LIMITS = {
  fullLongEdge: 1600,
  thumbLongEdge: 240,
  jpegQuality: 82,
  jpegFallbackQuality: 60,
  limitInputPixels: 40_000_000,
  maxDimension: 8000,
  maxStoredBytes: 2_097_152,
} as const;

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const UNSUPPORTED = { ok: false, error: 'Unsupported image' } as const;

export type ProcessScreenshotResult =
  | { ok: true; full: Buffer; thumb: Buffer }
  | { ok: false; error: 'Unsupported image' };

function open(buf: Uint8Array): sharp.Sharp {
  return sharp(buf, { limitInputPixels: SCREENSHOT_LIMITS.limitInputPixels, failOn: 'error' });
}

/** Never throws: any decode failure or limit breach is `Unsupported image`. */
export async function processScreenshot(buf: Uint8Array | Buffer): Promise<ProcessScreenshotResult> {
  try {
    if (buf.byteLength === 0) return UNSUPPORTED;

    const meta = await open(buf).metadata();
    if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) return UNSUPPORTED;
    const { width, height } = meta;
    if (
      !width ||
      !height ||
      width > SCREENSHOT_LIMITS.maxDimension ||
      height > SCREENSHOT_LIMITS.maxDimension
    ) {
      return UNSUPPORTED;
    }

    // .rotate() with no args applies EXIF orientation; no withMetadata() means
    // the encoder writes none.
    const base = open(buf).rotate();
    const encode = (edge: number, quality: number) =>
      base
        .clone()
        .resize(edge, edge, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality })
        .toBuffer();

    let full = await encode(SCREENSHOT_LIMITS.fullLongEdge, SCREENSHOT_LIMITS.jpegQuality);
    if (full.length > SCREENSHOT_LIMITS.maxStoredBytes) {
      full = await encode(SCREENSHOT_LIMITS.fullLongEdge, SCREENSHOT_LIMITS.jpegFallbackQuality);
      if (full.length > SCREENSHOT_LIMITS.maxStoredBytes) return UNSUPPORTED;
    }
    const thumb = await encode(SCREENSHOT_LIMITS.thumbLongEdge, SCREENSHOT_LIMITS.jpegQuality);
    return { ok: true, full, thumb };
  } catch {
    return UNSUPPORTED;
  }
}
