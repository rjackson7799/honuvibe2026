// Capped request-body reader for the preview feedback route. Pure: no
// 'server-only', so tests can import it directly (same stance as gate.ts).
//
// Content-Length is client-controlled (or absent on chunked uploads), so the
// only trustworthy limit is a running byte count while reading the stream.

export type ReadBodyResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'too_large' | 'read_error' };

export type ReadBytesResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; reason: 'too_large' | 'read_error' };

/**
 * Reads `body` chunk by chunk, counting BYTES. The moment the count exceeds
 * `maxBytes` the reader is cancelled (so the source stops producing) and
 * `too_large` is returned. A throwing read yields `read_error`; a null body
 * yields empty bytes.
 */
export async function readBodyCappedBytes(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<ReadBytesResult> {
  if (!body) return { ok: true, bytes: new Uint8Array(0) };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // Cancelling is best effort; the verdict is already too_large.
        }
        return { ok: false, reason: 'too_large' };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: 'read_error' };
  }

  const all = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes: all };
}

/**
 * Text variant. Decoding happens once, at the end, so a multi-byte character
 * split across chunks is never corrupted.
 */
export async function readBodyCapped(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<ReadBodyResult> {
  const r = await readBodyCappedBytes(body, maxBytes);
  if (!r.ok) return r;
  return { ok: true, text: new TextDecoder('utf-8').decode(r.bytes) };
}
