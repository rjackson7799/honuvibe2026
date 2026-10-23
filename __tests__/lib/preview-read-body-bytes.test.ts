// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readBodyCappedBytes } from '@/lib/previews/read-body';

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(c) {
      if (i < chunks.length) c.enqueue(chunks[i++]);
      else c.close();
    },
  });
}

describe('readBodyCappedBytes', () => {
  it('returns the exact bytes under the cap', async () => {
    const r = await readBodyCappedBytes(streamOf([new Uint8Array([1, 2]), new Uint8Array([3, 4, 255])]), 10);
    expect(r).toEqual({ ok: true, bytes: new Uint8Array([1, 2, 3, 4, 255]) });
  });
  it('allows exactly the cap', async () => {
    const r = await readBodyCappedBytes(streamOf([new Uint8Array(4)]), 4);
    expect(r.ok).toBe(true);
  });
  it('too_large for a stream with no length going over the cap', async () => {
    let pulled = 0;
    const src = new ReadableStream<Uint8Array>({
      pull(c) {
        pulled++;
        c.enqueue(new Uint8Array(1000));
      },
    });
    const r = await readBodyCappedBytes(src, 2500);
    expect(r).toEqual({ ok: false, reason: 'too_large' });
    expect(pulled).toBeLessThan(10);
  });
  it('read_error for a throwing stream', async () => {
    const src = new ReadableStream<Uint8Array>({
      pull() {
        throw new Error('boom');
      },
    });
    expect(await readBodyCappedBytes(src, 100)).toEqual({ ok: false, reason: 'read_error' });
  });
  it('null body is empty', async () => {
    expect(await readBodyCappedBytes(null, 100)).toEqual({ ok: true, bytes: new Uint8Array(0) });
  });
});
