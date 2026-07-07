'use client';

// Downscale an image File in the browser before upload, so a multipart POST of
// several worksheet photos stays well under Vercel's ~4.5 MB function body limit
// (which would otherwise 413 the request before the route or sharp ever run).
// Draws the image to a canvas at a capped long-edge and re-encodes as JPEG.
// EXIF orientation is baked into the pixels (`imageOrientation: 'from-image'`)
// so a phone photo taken sideways lands upright.

export const MAX_IMAGE_EDGE = 1568; // Anthropic's optimal vision long-edge
const JPEG_QUALITY = 0.82;

export async function downscaleImage(
  file: File,
  maxEdge: number = MAX_IMAGE_EDGE,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob) throw new Error('Failed to encode image');
    return blob;
  } finally {
    bitmap.close();
  }
}
