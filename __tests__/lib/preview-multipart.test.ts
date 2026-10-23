// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseMultipart } from '@/lib/previews/multipart';

async function encode(fd: FormData) {
  const req = new Request('http://x.test/', { method: 'POST', body: fd });
  return {
    bytes: new Uint8Array(await req.arrayBuffer()),
    contentType: req.headers.get('content-type') as string,
  };
}
const png = () => new File([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], 'a.png', { type: 'image/png' });

describe('parseMultipart', () => {
  it('payload + image', async () => {
    const fd = new FormData();
    fd.append('payload', '{"a":1}');
    fd.append('image', png());
    const { bytes, contentType } = await encode(fd);
    const r = await parseMultipart(bytes, contentType);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload).toBe('{"a":1}');
    expect(r.image?.type).toBe('image/png');
    expect(r.image?.size).toBe(7);
    expect(Array.from(r.image!.bytes)).toEqual([137, 80, 78, 71, 1, 2, 3]);
  });
  it('payload only', async () => {
    const fd = new FormData();
    fd.append('payload', 'hi');
    const { bytes, contentType } = await encode(fd);
    expect(await parseMultipart(bytes, contentType)).toEqual({ ok: true, payload: 'hi', image: null });
  });

  const reject = async (fd: FormData) => {
    const { bytes, contentType } = await encode(fd);
    const r = await parseMultipart(bytes, contentType);
    expect(r.ok).toBe(false);
  };
  it('rejects duplicate payload', async () => {
    const fd = new FormData();
    fd.append('payload', 'a');
    fd.append('payload', 'b');
    await reject(fd);
  });
  it('rejects duplicate image', async () => {
    const fd = new FormData();
    fd.append('payload', 'a');
    fd.append('image', png());
    fd.append('image', png());
    await reject(fd);
  });
  it('rejects payload sent as a file', async () => {
    const fd = new FormData();
    fd.append('payload', new File(['{}'], 'p.json', { type: 'application/json' }));
    await reject(fd);
  });
  it('rejects image sent as a string', async () => {
    const fd = new FormData();
    fd.append('payload', 'a');
    fd.append('image', 'notafile');
    await reject(fd);
  });
  it('rejects an empty image', async () => {
    const fd = new FormData();
    fd.append('payload', 'a');
    fd.append('image', new File([], 'e.png', { type: 'image/png' }));
    await reject(fd);
  });
  it('rejects a missing payload', async () => {
    const fd = new FormData();
    fd.append('image', png());
    await reject(fd);
  });
  it('rejects unknown extra fields', async () => {
    const fd = new FormData();
    fd.append('payload', 'a');
    fd.append('extra', 'x');
    await reject(fd);
  });
  it('rejects a broken boundary / garbage body without throwing', async () => {
    const body = new TextEncoder().encode(
      '--abc\r\nContent-Disposition: form-data; name="payload"\r\n\r\nhi\r\n--abc--',
    );
    expect((await parseMultipart(body, 'multipart/form-data; boundary=WRONG')).ok).toBe(false);
    expect((await parseMultipart(new Uint8Array([1, 2, 3]), 'multipart/form-data; boundary=abc')).ok).toBe(false);
    expect((await parseMultipart(body, 'multipart/form-data')).ok).toBe(false);
    expect((await parseMultipart(body, 'application/json')).ok).toBe(false);
    expect((await parseMultipart(new Uint8Array(0), 'multipart/form-data; boundary=abc')).ok).toBe(false);
  });
});
