// Streaming injection of a snippet before the last </body> of an HTML response.
// Pure and byte-oriented on purpose: the search runs on Uint8Array and the
// document is never decoded to a string, so UTF-8 sequences split across chunk
// boundaries cannot be corrupted. Not 'server-only' so tests can import it.

export const INJECT_TAIL_BYTES = 4096;

// ASCII bytes of "</body", matched case-insensitively.
const NEEDLE = [0x3c, 0x2f, 0x62, 0x6f, 0x64, 0x79];

function lower(b: number): number {
  return b >= 0x41 && b <= 0x5a ? b + 0x20 : b;
}

/** Index of the LAST case-insensitive `</body` in `bytes`, or -1. */
function lastBodyClose(bytes: Uint8Array): number {
  for (let i = bytes.length - NEEDLE.length; i >= 0; i--) {
    let match = true;
    for (let j = 0; j < NEEDLE.length; j++) {
      if (lower(bytes[i + j]) !== NEEDLE[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/** Inserts `snippet` before the last `</body` in `tail`; appends if there is none. */
export function injectBeforeBodyClose(tail: Uint8Array, snippet: Uint8Array): Uint8Array {
  const at = lastBodyClose(tail);
  if (at === -1) return concat(tail, snippet);
  const out = new Uint8Array(tail.length + snippet.length);
  out.set(tail.subarray(0, at), 0);
  out.set(snippet, at);
  out.set(tail.subarray(at), at + snippet.length);
  return out;
}

/**
 * Passes `source` through byte-for-byte, holding back only the trailing
 * INJECT_TAIL_BYTES. On flush the held tail goes through injectBeforeBodyClose.
 * Output equals the input apart from the inserted snippet.
 */
export function withInjectedSnippet(
  source: ReadableStream<Uint8Array>,
  snippet: string,
): ReadableStream<Uint8Array> {
  const snippetBytes = new TextEncoder().encode(snippet);
  let held: Uint8Array = new Uint8Array(0);

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const buf = held.length === 0 ? chunk : concat(held, chunk);
      if (buf.length > INJECT_TAIL_BYTES) {
        const cut = buf.length - INJECT_TAIL_BYTES;
        controller.enqueue(buf.slice(0, cut));
        held = buf.slice(cut);
      } else {
        held = buf.slice();
      }
    },
    flush(controller) {
      controller.enqueue(injectBeforeBodyClose(held, snippetBytes));
    },
  });

  return source.pipeThrough(transform);
}
