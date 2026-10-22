import { describe, expect, it, vi } from 'vitest';
import { readBodyCapped } from '@/lib/previews/read-body';

const enc = new TextEncoder();

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(chunks[i++]);
      else controller.close();
    },
  });
}

describe('readBodyCapped', () => {
  it('returns the text of a body under the cap', async () => {
    const r = await readBodyCapped(streamOf([enc.encode('{"a":'), enc.encode('1}')]), 100);
    expect(r).toEqual({ ok: true, text: '{"a":1}' });
  });

  it('allows a body exactly at the cap', async () => {
    const r = await readBodyCapped(streamOf([enc.encode('abcd')]), 4);
    expect(r).toEqual({ ok: true, text: 'abcd' });
  });

  it('returns too_large and cancels the source for an oversized body with no length', async () => {
    const cancel = vi.fn();
    let pulled = 0;
    const source = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++;
        controller.enqueue(new Uint8Array(1024)); // never closes
      },
      cancel,
    });
    const r = await readBodyCapped(source, 16_384);
    expect(r).toEqual({ ok: false, reason: 'too_large' });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(pulled).toBeLessThan(100); // stopped early, did not drain
  });

  it('counts multi-byte input in bytes, not UTF-16 units', async () => {
    const text = '日'.repeat(6000); // 6000 units, 18000 bytes
    const r = await readBodyCapped(streamOf([enc.encode(text)]), 16_384);
    expect(r).toEqual({ ok: false, reason: 'too_large' });
  });

  it('decodes multi-byte characters split across chunks', async () => {
    const bytes = enc.encode('日本語');
    const r = await readBodyCapped(streamOf([bytes.slice(0, 2), bytes.slice(2, 5), bytes.slice(5)]), 100);
    expect(r).toEqual({ ok: true, text: '日本語' });
  });

  it('returns read_error when the stream throws', async () => {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error('boom'));
      },
    });
    expect(await readBodyCapped(source, 100)).toEqual({ ok: false, reason: 'read_error' });
  });

  it('returns empty text for a null body', async () => {
    expect(await readBodyCapped(null, 100)).toEqual({ ok: true, text: '' });
  });
});
