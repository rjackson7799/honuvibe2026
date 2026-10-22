import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderFeedbackWidget } from '@/lib/previews/feedback-widget';

// jsdom ships without bundled types and @types/jsdom is not a dependency, so
// load it through createRequire and describe only the surface these tests use.
type Win = Window & typeof globalThis;
type JSDOMInstance = { window: Win };
type JSDOMCtor = new (
  html: string,
  opts: { url: string; runScripts: 'outside-only' },
) => JSDOMInstance;
const nodeRequire = createRequire(import.meta.url);
const { JSDOM } = nodeRequire('jsdom') as { JSDOM: JSDOMCtor };

const SLUG = 'okada-5a5c1a2742';
const BASE = `http://localhost/api/preview/${SLUG}/`;
const DRAFT_KEY = `hv_pv_fb_draft:${SLUG}`;
const NAME_KEY = 'hv_pv_feedback_name';

type FetchInit = { method: string; credentials: string; headers: Record<string, string>; body: string };
type FetchMock = ReturnType<typeof vi.fn<(url: string, init: FetchInit) => Promise<Response>>>;
type Page = { dom: JSDOMInstance; win: Win; fetch: FetchMock };
type Snapshot = { session: Record<string, string>; local: Record<string, string> };

const open: JSDOMInstance[] = [];
afterEach(() => {
  while (open.length) open.pop()!.window.close();
});

function scriptBody(html: string): string {
  const m = /^<script>([\s\S]*)<\/script>$/.exec(html);
  if (!m) throw new Error('renderFeedbackWidget must return exactly one <script>…</script>');
  return m[1];
}

const BODY = scriptBody(renderFeedbackWidget({ slug: SLUG }));

function storageEntries(s: Storage): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i)!;
    out[k] = s.getItem(k)!;
  }
  return out;
}

/** One fresh page load: a new JSDOM, optional carried-over storage, a stubbed fetch, then the widget. */
function load(file: string, carry?: Snapshot, beforeEval?: (win: Win) => void): Page {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: BASE + file,
    runScripts: 'outside-only',
  });
  open.push(dom);
  const win = dom.window;
  if (carry) {
    for (const [k, v] of Object.entries(carry.session)) win.sessionStorage.setItem(k, v);
    for (const [k, v] of Object.entries(carry.local)) win.localStorage.setItem(k, v);
  }
  const fetch: FetchMock = vi.fn<(url: string, init: FetchInit) => Promise<Response>>();
  (win as unknown as { fetch: FetchMock }).fetch = fetch;
  beforeEval?.(win);
  win.eval(BODY);
  return { dom, win, fetch };
}

/** A real reload: snapshot storage, close the old window, never touch its document again. */
function reload(page: Page, file: string): Page {
  const carry: Snapshot = {
    session: storageEntries(page.win.sessionStorage),
    local: storageEntries(page.win.localStorage),
  };
  const idx = open.indexOf(page.dom);
  if (idx >= 0) open.splice(idx, 1);
  page.dom.window.close();
  return load(file, carry);
}

function hosts(win: Win): Element[] {
  return Array.from(win.document.querySelectorAll('#hv-preview-feedback'));
}

function root(win: Win): ShadowRoot {
  const h = win.document.getElementById('hv-preview-feedback');
  if (!h || !h.shadowRoot) throw new Error('widget host / open shadow root missing');
  return h.shadowRoot;
}

function q<T extends Element>(win: Win, sel: string): T {
  const el = root(win).querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
}

const nameInput = (w: Win) => q<HTMLInputElement>(w, 'input[autocomplete="name"]');
const messageInput = (w: Win) => q<HTMLTextAreaElement>(w, 'textarea');
const radio = (w: Win, kind: 'bug' | 'improvement') => q<HTMLInputElement>(w, `input[type="radio"][value="${kind}"]`);
const status = (w: Win) => q<HTMLElement>(w, '[aria-live="polite"]').textContent ?? '';
const pageLine = (w: Win) => q<HTMLElement>(w, '.page').textContent ?? '';

function button(win: Win, label: string): HTMLButtonElement {
  const b = Array.from(root(win).querySelectorAll('button')).find((x) => x.textContent?.trim() === label);
  if (!b) throw new Error(`missing button ${label}`);
  return b;
}

function type(win: Win, el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  el.value = value;
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
}

function fill(win: Win, name: string, kind: 'bug' | 'improvement', message: string) {
  button(win, 'Feedback').click();
  type(win, nameInput(win), name);
  radio(win, kind).click();
  type(win, messageInput(win), message);
}

function respond(status: number, headers: Record<string, string> = {}): Promise<Response> {
  return Promise.resolve(new Response(null, { status, headers }));
}

async function flush() {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
}

function sentBody(page: Page, call = 0): Record<string, unknown> {
  return JSON.parse(page.fetch.mock.calls[call][1].body) as Record<string, unknown>;
}

describe('renderFeedbackWidget', () => {
  it('mounts one host', () => {
    const page = load('concept-a.html');
    expect(hosts(page.win)).toHaveLength(1);
    page.win.eval(BODY);
    expect(hosts(page.win)).toHaveLength(1);
    const host = hosts(page.win)[0] as HTMLElement;
    expect(host.shadowRoot).not.toBeNull();
    expect(host.getAttribute('style')).toContain('2147483647');
    expect(host.getAttribute('style')).toContain('safe-area-inset-bottom');
  });

  it('remounts after documentElement is replaced', async () => {
    const { win } = load('concept-a.html');
    // The real bundle unpacks after load. Let DOMContentLoaded/load fire first so
    // only the MutationObserver can be what remounts the host.
    await flush();
    expect(win.document.readyState).toBe('complete');
    const doc = new win.DOMParser().parseFromString('<html><body><main>unpacked</main></body></html>', 'text/html');
    win.document.documentElement.replaceWith(doc.documentElement);
    expect(win.document.getElementById('hv-preview-feedback')).toBeNull();
    await Promise.resolve();
    const h = win.document.getElementById('hv-preview-feedback');
    expect(h).not.toBeNull();
    expect(h!.isConnected).toBe(true);
    expect(win.document.querySelector('main')?.textContent).toBe('unpacked');
  });

  it('does not mount inside an iframe', () => {
    // window.top is non-configurable in jsdom, so run the script in a real child frame.
    const dom = new JSDOM('<!doctype html><html><body><iframe></iframe></body></html>', {
      url: BASE + 'concept-a.html',
      runScripts: 'outside-only',
    });
    open.push(dom);
    const child = dom.window.document.querySelector('iframe')!.contentWindow as Win;
    expect(child.top).not.toBe(child);
    child.eval(BODY);
    expect(child.document.getElementById('hv-preview-feedback')).toBeNull();
    expect(dom.window.document.getElementById('hv-preview-feedback')).toBeNull();
  });

  it('opens a labelled dialog with the expected fields', () => {
    const { win } = load('concept-a.html');
    const dialog = q<HTMLElement>(win, '[role="dialog"]');
    expect(dialog.getAttribute('aria-label')).toBe('Send feedback');
    expect(dialog.hidden).toBe(true);
    button(win, 'Feedback').click();
    expect(dialog.hidden).toBe(false);
    expect(root(win).activeElement).toBe(nameInput(win));
    expect(nameInput(win).maxLength).toBe(80);
    expect(messageInput(win).maxLength).toBe(4000);
    expect(messageInput(win).rows).toBe(5);
    expect(radio(win, 'bug').checked).toBe(false);
    expect(radio(win, 'improvement').checked).toBe(false);
    expect(root(win).textContent).toContain('Bug fix');
    expect(root(win).textContent).toContain('Improvement');
    expect(pageLine(win)).toBe('Page: concept-a.html');
    dialog.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dialog.hidden).toBe(true);
    expect(root(win).activeElement).toBe(button(win, 'Feedback'));
  });

  it('posts the expected JSON', async () => {
    const page = load('concept-a.html');
    const { win } = page;
    page.fetch.mockReturnValueOnce(respond(201));
    fill(win, 'Aiko', 'bug', 'The hero image is cropped.');
    button(win, 'Send').click();
    await flush();
    expect(page.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = page.fetch.mock.calls[0];
    expect(url).toBe(`/api/preview/${SLUG}/feedback`);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(init.headers['Content-Type']).toBe('application/json');
    const body = sentBody(page);
    expect(Object.keys(body).sort()).toEqual(['kind', 'message', 'name', 'page', 'viewportH', 'viewportW']);
    expect(body).toMatchObject({ name: 'Aiko', kind: 'bug', message: 'The hero image is cropped.', page: 'concept-a.html' });
    expect(typeof body.viewportW).toBe('number');
    expect(status(win)).toBe('Thanks \u2014 your note was sent.');
  });

  it('saves the page captured when the draft started', async () => {
    const page = load('concept-a.html');
    const { win } = page;
    page.fetch.mockReturnValueOnce(respond(201));
    fill(win, 'Aiko', 'improvement', 'Pricing table needs a yearly toggle.');
    win.location.hash = '#pricing';
    win.history.replaceState(null, '', 'index.html');
    type(win, messageInput(win), 'Pricing table needs a yearly toggle!');
    expect(pageLine(win)).toBe('Page: concept-a.html');
    button(win, 'Send').click();
    await flush();
    expect(sentBody(page).page).toBe('concept-a.html');
  });

  it('uses the current page with its hash when no draft started yet, and (entry) for the bare root', () => {
    const page = load('concept-a.html');
    page.win.location.hash = '#pricing';
    button(page.win, 'Feedback').click();
    expect(pageLine(page.win)).toBe('Page: concept-a.html#pricing');
    const entry = load('');
    button(entry.win, 'Feedback').click();
    expect(pageLine(entry.win)).toBe('Page: (entry)');
    entry.win.history.replaceState(null, '', `/api/preview/${SLUG}`);
    button(entry.win, 'Cancel').click();
    button(entry.win, 'Feedback').click();
    expect(pageLine(entry.win)).toBe('Page: (entry)');
  });

  it('draft survives a 401 and a reload, then sends with its original page', async () => {
    const first = load('concept-a.html');
    expect(first.win.localStorage.length).toBe(0);
    first.fetch.mockReturnValueOnce(respond(401));
    fill(first.win, 'Kenji', 'bug', 'Footer links overlap on my phone.');
    button(first.win, 'Send').click();
    await flush();
    expect(status(first.win)).toContain('Your note is saved');
    expect(first.win.sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();

    const second = reload(first, 'index.html');
    expect(hosts(second.win)).toHaveLength(1);
    expect(hosts(second.win)[0].isConnected).toBe(true);
    expect(nameInput(second.win).value).toBe('Kenji');
    expect(radio(second.win, 'bug').checked).toBe(true);
    expect(messageInput(second.win).value).toBe('Footer links overlap on my phone.');
    expect(pageLine(second.win)).toBe('Page: concept-a.html');
    expect(q<HTMLElement>(second.win, '.dot').hidden).toBe(false);

    second.fetch.mockReturnValueOnce(respond(201));
    button(second.win, 'Feedback').click();
    expect(root(second.win).activeElement).toBe(messageInput(second.win));
    button(second.win, 'Send').click();
    await flush();
    const body = sentBody(second);
    expect(body.page).toBe('concept-a.html');
    expect(body.name).toBe('Kenji');
    expect(second.win.sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(q<HTMLElement>(second.win, '.dot').hidden).toBe(true);
  });

  it('a stored draft name wins over the remembered name; malformed drafts are discarded', () => {
    const restored = load('concept-a.html', {
      session: { [DRAFT_KEY]: JSON.stringify({ name: 'Draft Name', page: 'a.html', kind: 'improvement', message: 'hi' }) },
      local: { [NAME_KEY]: 'Saved Name' },
    });
    expect(nameInput(restored.win).value).toBe('Draft Name');
    expect(radio(restored.win, 'improvement').checked).toBe(true);
    expect(pageLine(restored.win)).toBe('Page: a.html');

    const broken = load('concept-a.html', { session: { [DRAFT_KEY]: '{not json' }, local: { [NAME_KEY]: 'Saved Name' } });
    expect(nameInput(broken.win).value).toBe('Saved Name');
    expect(messageInput(broken.win).value).toBe('');
    expect(broken.win.sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('401 with blocked storage tells the reviewer to copy their note', async () => {
    const page = load('concept-a.html', undefined, (win) => {
      vi.spyOn(win.Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    });
    page.fetch.mockReturnValueOnce(respond(401));
    fill(page.win, 'Aiko', 'bug', 'Blocked storage note.');
    button(page.win, 'Send').click();
    await flush();
    expect(status(page.win)).toContain('Copy your note somewhere safe');
    expect(status(page.win)).not.toContain('Your note is saved');
  });

  it('the form is locked while sending', async () => {
    const page = load('concept-a.html');
    const { win } = page;
    let resolve!: (r: Response) => void;
    page.fetch.mockReturnValueOnce(new Promise<Response>((r) => (resolve = r)));
    fill(win, 'Aiko', 'bug', 'Original note.');
    const draftBefore = win.sessionStorage.getItem(DRAFT_KEY);
    button(win, 'Send').click();
    await flush();

    const controls = [
      nameInput(win),
      radio(win, 'bug'),
      radio(win, 'improvement'),
      messageInput(win),
      button(win, 'Send'),
      button(win, 'Cancel'),
    ];
    for (const c of controls) expect(c.matches(':disabled')).toBe(true);
    type(win, messageInput(win), 'Edited mid-send');
    expect(win.sessionStorage.getItem(DRAFT_KEY)).toBe(draftBefore);

    resolve(new Response(null, { status: 500 }));
    await flush();
    for (const c of controls) expect(c.matches(':disabled')).toBe(false);
    expect(win.sessionStorage.getItem(DRAFT_KEY)).toBe(draftBefore);
    expect(status(win)).toBe("Couldn't send. Please try again.");

    // Same again, resolving with 201.
    type(win, messageInput(win), 'Original note.');
    let resolve2!: (r: Response) => void;
    page.fetch.mockReturnValueOnce(new Promise<Response>((r) => (resolve2 = r)));
    button(win, 'Send').click();
    await flush();
    for (const c of controls) expect(c.matches(':disabled')).toBe(true);
    resolve2(new Response(null, { status: 201 }));
    await flush();
    for (const c of controls) expect(c.matches(':disabled')).toBe(false);
    expect(messageInput(win).value).toBe('');
    expect(radio(win, 'bug').checked).toBe(false);
    expect(nameInput(win).value).toBe('Aiko');
    expect(win.sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('a network error keeps the draft and re-enables the form', async () => {
    const page = load('concept-a.html');
    page.fetch.mockReturnValueOnce(Promise.reject(new TypeError('Failed to fetch')));
    fill(page.win, 'Aiko', 'bug', 'Offline note.');
    button(page.win, 'Send').click();
    await flush();
    expect(status(page.win)).toBe("Couldn't send. Please try again.");
    expect(page.win.sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();
    expect(messageInput(page.win).matches(':disabled')).toBe(false);
  });

  it('emptying the message drops the draft', () => {
    const { win } = load('concept-a.html');
    fill(win, 'Aiko', 'bug', 'Something');
    expect(JSON.parse(win.sessionStorage.getItem(DRAFT_KEY)!)).toEqual({
      name: 'Aiko',
      page: 'concept-a.html',
      kind: 'bug',
      message: 'Something',
    });
    expect(q<HTMLElement>(win, '.dot').hidden).toBe(false);
    type(win, messageInput(win), '');
    expect(win.sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(q<HTMLElement>(win, '.dot').hidden).toBe(true);
    // Name-only edits with an empty message do not create a draft.
    type(win, nameInput(win), 'Aiko T');
    expect(win.sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('Cancel closes the panel without touching the draft', () => {
    const { win } = load('concept-a.html');
    fill(win, 'Aiko', 'bug', 'Keep me');
    const before = win.sessionStorage.getItem(DRAFT_KEY);
    button(win, 'Cancel').click();
    expect(q<HTMLElement>(win, '[role="dialog"]').hidden).toBe(true);
    expect(win.sessionStorage.getItem(DRAFT_KEY)).toBe(before);
  });

  it('429 shows the retry time from Retry-After', async () => {
    const page = load('concept-a.html');
    page.fetch.mockReturnValueOnce(respond(429, { 'Retry-After': '600' }));
    fill(page.win, 'Aiko', 'bug', 'Rate limited');
    button(page.win, 'Send').click();
    await flush();
    expect(status(page.win)).toBe('Too many notes in a short time. Try again in about 10 minutes.');
    expect(page.win.sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();

    const noHeader = load('concept-a.html');
    noHeader.fetch.mockReturnValueOnce(respond(429));
    fill(noHeader.win, 'Aiko', 'bug', 'Rate limited');
    button(noHeader.win, 'Send').click();
    await flush();
    expect(status(noHeader.win)).toContain('about 10 minutes');
  });

  it('remembers the name in localStorage', async () => {
    const page = load('concept-a.html');
    page.fetch.mockReturnValueOnce(respond(201));
    fill(page.win, 'Aiko Tanaka', 'improvement', 'Nice');
    button(page.win, 'Send').click();
    await flush();
    expect(page.win.localStorage.getItem(NAME_KEY)).toBe('Aiko Tanaka');

    const next = reload(page, 'index.html');
    expect(nameInput(next.win).value).toBe('Aiko Tanaka');
    expect(messageInput(next.win).value).toBe('');
  });

  it('inputs are at least 16px', () => {
    const { win } = load('concept-a.html');
    const css = q<HTMLStyleElement>(win, 'style').textContent ?? '';
    expect(css).toMatch(/input,\s*textarea\s*\{[^}]*font-size:\s*16px/);
  });

  it('panel is height-bounded and scrolls', () => {
    const { win } = load('concept-a.html');
    const css = q<HTMLStyleElement>(win, 'style').textContent ?? '';
    expect(css).toMatch(/\.panel\s*\{[^}]*max-height:\s*calc\(100vh - 32px\);[^}]*max-height:\s*calc\(100dvh - 32px\)/);
    expect(css).toMatch(/\.body\s*\{[^}]*overflow-y:\s*auto/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/width:\s*calc\(100vw - 32px\)/);
  });

  it('escapes < in the embedded config', () => {
    const html = renderFeedbackWidget({ slug: 'a<b</script><!--x' });
    expect(html.startsWith('<script>')).toBe(true);
    expect(html.endsWith('</script>')).toBe(true);
    const body = scriptBody(html);
    expect(body).toContain('a\\u003cb\\u003c/script>\\u003c!--x');
    expect(body.toLowerCase()).not.toContain('</script');
    expect(body).not.toContain('<!--');
    expect(html.toLowerCase().split('</script').length).toBe(2);
  });

  it('emits ASCII-only, ES2019-safe source', () => {
    expect(/^[\x00-\x7f]*$/.test(BODY)).toBe(true);
    expect(BODY).not.toMatch(/\?\.[^\d]/);
    expect(BODY).not.toContain('??');
    expect(BODY.toLowerCase()).not.toContain('</script');
    expect(BODY).not.toContain('<!--');
  });
});
