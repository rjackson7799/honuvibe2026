// Parses an ALREADY-CAPPED multipart body (see readBodyCappedBytes). It never
// touches a request stream, so an oversized upload cannot be buffered here.
// Pure: no 'server-only'.

export type MultipartResult =
  | {
      ok: true;
      payload: string;
      image: { bytes: Uint8Array; type: string; size: number } | null;
    }
  | { ok: false; error: string };

const BAD = (error: string) => ({ ok: false, error }) as const;

/**
 * Accepts exactly one string `payload` field and at most one non-empty file
 * `image` field. Duplicates, wrongly typed fields and unknown fields are
 * rejected. Never throws.
 */
export async function parseMultipart(bytes: Uint8Array, contentType: string): Promise<MultipartResult> {
  if (!/^multipart\/form-data\s*;/i.test(contentType) || !/boundary=/i.test(contentType)) {
    return BAD('Invalid form data');
  }
  let form: FormData;
  try {
    form = await new Response(bytes as BodyInit, { headers: { 'content-type': contentType } }).formData();
  } catch {
    return BAD('Invalid form data');
  }

  try {
    let payload: string | null = null;
    let image: File | null = null;
    for (const [key, value] of form.entries()) {
      if (key === 'payload') {
        if (payload !== null || typeof value !== 'string') return BAD('Invalid form data');
        payload = value;
      } else if (key === 'image') {
        if (image !== null || typeof value === 'string') return BAD('Invalid form data');
        image = value;
      } else {
        return BAD('Invalid form data');
      }
    }
    if (payload === null) return BAD('Invalid form data');
    if (!image) return { ok: true, payload, image: null };
    const imageBytes = new Uint8Array(await image.arrayBuffer());
    if (imageBytes.byteLength === 0) return BAD('Invalid form data');
    return { ok: true, payload, image: { bytes: imageBytes, type: image.type, size: imageBytes.byteLength } };
  } catch {
    return BAD('Invalid form data');
  }
}
