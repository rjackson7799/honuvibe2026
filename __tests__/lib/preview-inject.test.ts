import { describe, expect, it } from 'vitest';
import {
  INJECT_TAIL_BYTES,
  injectBeforeBodyClose,
  withInjectedSnippet,
} from '@/lib/previews/inject';

const enc = new TextEncoder();
const dec = new TextDecoder();
const SNIPPET = '<script>/*fb*/</script>';

function chunked(bytes: Uint8Array, size: number): ReadableStream<Uint8Array> {
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.slice(offset, offset + size));
      offset += size;
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function concat(...arrs: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrs) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}

describe('injectBeforeBodyClose', () => {
  it('inserts before the last </body> when two exist', () => {
    const out = dec.decode(
      injectBeforeBodyClose(enc.encode('<body>a</body>b<!-- </body> --></body></html>'), enc.encode('[S]')),
    );
    expect(out).toBe('<body>a</body>b<!-- </body> -->[S]</body></html>');
  });

  it('matches </BODY> case-insensitively', () => {
    const out = dec.decode(injectBeforeBodyClose(enc.encode('x</BODY></HTML>'), enc.encode('[S]')));
    expect(out).toBe('x[S]</BODY></HTML>');
  });

  it('appends when there is no </body>', () => {
    const out = dec.decode(injectBeforeBodyClose(enc.encode('<p>hi</p>'), enc.encode('[S]')));
    expect(out).toBe('<p>hi</p>[S]');
  });
});

describe('withInjectedSnippet', () => {
  const html = '<html><body><p>日本語</p></body></html>';
  const expected = '<html><body><p>日本語</p>' + SNIPPET + '</body></html>';

  it('handles input shorter than the held tail', async () => {
    const out = await collect(withInjectedSnippet(chunked(enc.encode(html), 1024), SNIPPET));
    expect(dec.decode(out)).toBe(expected);
  });

  it('handles </body> split across two chunks', async () => {
    const bytes = enc.encode(html);
    const split = html.indexOf('</body>') + 3; // inside the tag (ASCII, so byte offset is safe after the 日本語)
    const byteSplit = enc.encode(html.slice(0, split)).length;
    const source = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes.slice(0, byteSplit));
        c.enqueue(bytes.slice(byteSplit));
        c.close();
      },
    });
    expect(dec.decode(await collect(withInjectedSnippet(source, SNIPPET)))).toBe(expected);
  });

  it('handles 1-byte chunks', async () => {
    const out = await collect(withInjectedSnippet(chunked(enc.encode(html), 1), SNIPPET));
    expect(dec.decode(out)).toBe(expected);
  });

  it('appends the snippet when the stream has no </body>', async () => {
    const out = await collect(withInjectedSnippet(chunked(enc.encode('<p>日</p>'), 3), SNIPPET));
    expect(dec.decode(out)).toBe('<p>日</p>' + SNIPPET);
  });

  it('handles an empty stream', async () => {
    const out = await collect(withInjectedSnippet(chunked(new Uint8Array(0), 8), SNIPPET));
    expect(dec.decode(out)).toBe(SNIPPET);
  });

  it('round-trips a 9 MB multi-byte input byte-exact apart from the snippet', async () => {
    const head = enc.encode('<html><body>');
    const unit = enc.encode('日本語 <div>x</div>\n');
    const target = 9 * 1024 * 1024;
    const reps = Math.ceil(target / unit.length);
    const middle = new Uint8Array(reps * unit.length);
    for (let i = 0; i < reps; i++) middle.set(unit, i * unit.length);
    const tailBytes = enc.encode('</body></html>');
    const input = concat(head, middle, tailBytes);
    expect(input.length).toBeGreaterThan(target);
    expect(INJECT_TAIL_BYTES).toBe(4096);

    // 64 KB chunks that deliberately do not align with the 4-byte-ish UTF-8 units
    const out = await collect(withInjectedSnippet(chunked(input, 65_537), SNIPPET));
    const expectedBytes = concat(head, middle, enc.encode(SNIPPET), tailBytes);
    expect(out.length).toBe(expectedBytes.length);
    expect(Buffer.compare(Buffer.from(out), Buffer.from(expectedBytes))).toBe(0);
  });
});
