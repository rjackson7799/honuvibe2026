import { createRequire } from 'node:module';
import { parse } from 'acorn';
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

type FetchInit = {
  method: string;
  credentials: string;
  headers: Record<string, string>;
  body: string;
  signal?: AbortSignal;
};
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
    // M7: page-wide visibility / opacity / pointer-events rules can't hide the host.
    expect(host.getAttribute('style')).toContain('visibility:visible !important');
    expect(host.getAttribute('style')).toContain('opacity:1 !important');
    expect(host.getAttribute('style')).toContain('pointer-events:auto !important');
    expect(host.parentElement).toBe(page.win.document.body);
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
    button(win, 'Send').focus();
    button(win, 'Send').click();
    await flush();
    // Disabling the fieldset blurs Send; focus returns to the message so Esc keeps working.
    expect(root(win).activeElement).toBe(messageInput(win));
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
    expect(JSON.parse(first.win.sessionStorage.getItem(DRAFT_KEY)!)).toMatchObject({ resume: true });

    // M1: the reload after re-entering the password auto-opens the panel once,
    // so the note is visible on the entry page before the reviewer navigates away.
    const second = reload(first, 'index.html');
    expect(hosts(second.win)).toHaveLength(1);
    expect(hosts(second.win)[0].isConnected).toBe(true);
    expect(q<HTMLElement>(second.win, '[role="dialog"]').hidden).toBe(false);
    expect(button(second.win, 'Feedback').hidden).toBe(true);
    expect(root(second.win).activeElement).toBe(messageInput(second.win));
    expect(nameInput(second.win).value).toBe('Kenji');
    expect(radio(second.win, 'bug').checked).toBe(true);
    expect(messageInput(second.win).value).toBe('Footer links overlap on my phone.');
    expect(pageLine(second.win)).toBe('Page: concept-a.html');
    expect(q<HTMLElement>(second.win, '.dot').hidden).toBe(false);
    const rewritten = JSON.parse(second.win.sessionStorage.getItem(DRAFT_KEY)!) as Record<string, unknown>;
    expect(rewritten).not.toHaveProperty('resume');
    expect(rewritten).toMatchObject({ name: 'Kenji', kind: 'bug', page: 'concept-a.html' });

    // Only once: a further reload restores the draft behind a closed panel.
    const third = reload(second, 'index.html');
    expect(q<HTMLElement>(third.win, '[role="dialog"]').hidden).toBe(true);
    expect(messageInput(third.win).value).toBe('Footer links overlap on my phone.');
    expect(q<HTMLElement>(third.win, '.dot').hidden).toBe(false);

    third.fetch.mockReturnValueOnce(respond(201));
    button(third.win, 'Feedback').click();
    expect(root(third.win).activeElement).toBe(messageInput(third.win));
    button(third.win, 'Send').click();
    await flush();
    const body = sentBody(third);
    expect(body.page).toBe('concept-a.html');
    expect(body.name).toBe('Kenji');
    expect(third.win.sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(q<HTMLElement>(third.win, '.dot').hidden).toBe(true);
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
    // Esc can't close the panel mid-send, so the outcome is never shown to a closed panel.
    messageInput(win).dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    expect(q<HTMLElement>(win, '[role="dialog"]').hidden).toBe(false);
    // A programmatic write to a disabled control still changes its DOM value
    // (a real user can't type into it), so the guarantee under test is the
    // stored draft: the widget ignores input events while sending.
    type(win, messageInput(win), 'Edited mid-send');
    expect(messageInput(win).value).toBe('Edited mid-send');
    expect(win.sessionStorage.getItem(DRAFT_KEY)).toBe(draftBefore);

    resolve(new Response(null, { status: 500 }));
    await flush();
    for (const c of controls) expect(c.matches(':disabled')).toBe(false);
    expect(win.sessionStorage.getItem(DRAFT_KEY)).toBe(draftBefore);
    expect(status(win)).toBe("Couldn't send. Please try again.");
    expect(root(win).activeElement).toBe(messageInput(win));

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

  it('a send that never answers times out after 20s', async () => {
    const timers: { fn: () => void; ms: number }[] = [];
    const page = load('concept-a.html', undefined, (win) => {
      const fake = (fn: () => void, ms: number) => timers.push({ fn, ms });
      (win as unknown as { setTimeout: typeof fake }).setTimeout = fake;
      (win as unknown as { clearTimeout: () => void }).clearTimeout = () => {};
    });
    const { win } = page;
    page.fetch.mockReturnValueOnce(new Promise<Response>(() => {}));
    fill(win, 'Aiko', 'bug', 'Hanging request');
    const draftBefore = win.sessionStorage.getItem(DRAFT_KEY);
    button(win, 'Send').click();
    await flush();
    const signal = page.fetch.mock.calls[0][1].signal;
    expect(signal).toBeDefined();
    expect(messageInput(win).matches(':disabled')).toBe(true);
    const timeout = timers.find((t) => t.ms === 20000);
    expect(timeout).toBeDefined();
    timeout!.fn();
    await flush();
    expect(signal!.aborted).toBe(true);
    expect(status(win)).toBe("Couldn't send. Please try again.");
    expect(messageInput(win).matches(':disabled')).toBe(false);
    expect(win.sessionStorage.getItem(DRAFT_KEY)).toBe(draftBefore);
  });

  it('keystrokes in the panel never reach the page', () => {
    const { win } = load('concept-a.html');
    button(win, 'Feedback').click();
    const seen: string[] = [];
    for (const t of ['keydown', 'keyup', 'keypress'] as const) {
      win.document.addEventListener(t, (e) => seen.push(`document:${t}:${e.key}`));
      win.addEventListener(t, (e) => seen.push(`window:${t}:${e.key}`));
    }
    for (const t of ['keydown', 'keypress', 'keyup']) {
      messageInput(win).dispatchEvent(new win.KeyboardEvent(t, { key: '/', bubbles: true, composed: true }));
    }
    nameInput(win).dispatchEvent(new win.KeyboardEvent('keydown', { key: 'a', bubbles: true, composed: true }));
    expect(seen).toEqual([]);
    messageInput(win).dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    expect(q<HTMLElement>(win, '[role="dialog"]').hidden).toBe(true);
    expect(seen).toEqual([]);
    // Keys outside the widget still reach the page.
    win.document.body.dispatchEvent(new win.KeyboardEvent('keydown', { key: '/', bubbles: true }));
    expect(seen).toEqual(['document:keydown:/', 'window:keydown:/']);
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
    expect(css).toMatch(
      /\.panel\s*\{[^}]*max-height:\s*calc\(100dvh - 32px - env\(safe-area-inset-top, 0px\) - env\(safe-area-inset-bottom, 0px\)\)/,
    );
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
    // A real ES2019 parse: rejects ?., ??, class fields, and anything newer.
    expect(() => parse(BODY, { ecmaVersion: 2019 })).not.toThrow();
    expect(() => parse('a?.b', { ecmaVersion: 2019 })).toThrow();
    expect(BODY.toLowerCase()).not.toContain('</script');
    expect(BODY).not.toContain('<!--');
  });
});

// A non-responsive export can force the LAYOUT viewport wider/taller than the
// screen (measured on the real export: settles at 568x1230 vs a 375x812 visual
// viewport, via a transient 669x1447, without any visualViewport event). Fixed
// right/bottom anchors to the layout viewport, so with visualViewport the host is
// pinned at the containing block's origin (left/top 0, which never moves as the
// layout grows) and translated to the visual viewport's bottom-right corner using
// visualViewport values only; translate(-100%, -100%) backs it off by its own size.
type FakeVV = EventTarget & { width: number; height: number; offsetLeft: number; offsetTop: number; scale: number };

function withVV(
  vv: { width: number; height: number; offsetLeft?: number; offsetTop?: number } | null,
  extra?: (win: Win) => void,
): (win: Win) => void {
  return (win) => {
    if (vv) {
      const v = new win.EventTarget() as FakeVV;
      Object.assign(v, { offsetLeft: 0, offsetTop: 0, scale: 1 }, vv);
      Object.defineProperty(win, 'visualViewport', { configurable: true, value: v });
    }
    extra?.(win);
  };
}

function host(win: Win): HTMLElement {
  const h = win.document.getElementById('hv-preview-feedback');
  if (!h) throw new Error('widget host missing');
  return h;
}

/** One declaration from the host's style attribute (all are !important). */
function decl(win: Win, prop: string): string | null {
  const attr = host(win).getAttribute('style') ?? '';
  const parts = attr.split(';').map((x) => x.trim()).filter(Boolean);
  const hits = parts.filter((x) => x.slice(0, x.indexOf(':')).trim() === prop);
  if (hits.length > 1) throw new Error(`duplicate ${prop} declarations`);
  if (!hits.length) return null;
  const v = hits[0].slice(hits[0].indexOf(':') + 1).trim();
  if (!v.endsWith('!important')) throw new Error(`${prop} is not !important`);
  return v.slice(0, -'!important'.length).trim();
}

/** The transform for a visual viewport whose bottom-right corner is at (x, y). */
const vvT = (x: number, y: number) =>
  `translate(calc(${x}px - 16px - env(safe-area-inset-right, 0px)), calc(${y}px - 16px - env(safe-area-inset-bottom, 0px))) translate(-100%, -100%)`;

const fakeVV = (win: Win) => (win as unknown as { visualViewport: FakeVV }).visualViewport;

function setInner(win: Win, w: number, h: number) {
  Object.defineProperty(win, 'innerWidth', { configurable: true, value: w });
  Object.defineProperty(win, 'innerHeight', { configurable: true, value: h });
}

describe('renderFeedbackWidget visual viewport anchoring', () => {
  it('pins the host at the origin and translates it to the visual viewport corner', () => {
    const { win } = load('dashboard.html', undefined, withVV({ width: 375, height: 812 }));
    expect(decl(win, 'left')).toBe('0');
    expect(decl(win, 'top')).toBe('0');
    expect(decl(win, 'right')).toBe('auto');
    expect(decl(win, 'bottom')).toBe('auto');
    expect(decl(win, 'transform')).toBe(vvT(375, 812));
    expect(decl(win, '--hv-vw')).toBe('375px');
    expect(decl(win, '--hv-vh')).toBe('812px');
    expect(decl(win, 'position')).toBe('fixed');
    expect(decl(win, 'z-index')).toBe('2147483647');
    expect(decl(win, 'visibility')).toBe('visible');
  });

  it('uses visualViewport values only, never the (transient) layout viewport size', () => {
    // On the real export innerWidth/innerHeight read 375x812, then 669x1447, then
    // settle at 568x1230 with no visualViewport event in between.
    const a = load('dashboard.html', undefined, withVV({ width: 375, height: 812 }, (w) => setInner(w, 669, 1447)));
    const b = load('dashboard.html', undefined, withVV({ width: 375, height: 812 }, (w) => setInner(w, 375, 812)));
    expect(a.win.document.getElementById('hv-preview-feedback')!.getAttribute('style')).toBe(
      b.win.document.getElementById('hv-preview-feedback')!.getAttribute('style'),
    );
    expect(decl(a.win, 'transform')).toBe(vvT(375, 812));
  });

  it('accounts for a panned visual viewport', () => {
    const { win } = load('dashboard.html', undefined, withVV({ width: 375, height: 812, offsetLeft: 100, offsetTop: 300 }));
    expect(decl(win, 'transform')).toBe(vvT(475, 1112));
  });

  it('follows visualViewport resize (keyboard up), rAF-throttled', () => {
    const frames: FrameRequestCallback[] = [];
    const { win } = load(
      'dashboard.html',
      undefined,
      withVV({ width: 375, height: 812 }, (w) => {
        (w as unknown as { requestAnimationFrame: (cb: FrameRequestCallback) => number }).requestAnimationFrame = (cb) =>
          frames.push(cb);
      }),
    );
    expect(decl(win, 'transform')).toBe(vvT(375, 812));
    const vv = fakeVV(win);
    vv.height = 420;
    vv.dispatchEvent(new win.Event('resize'));
    vv.dispatchEvent(new win.Event('resize'));
    // Not applied until the frame runs, and two events queue one frame.
    expect(decl(win, '--hv-vh')).toBe('812px');
    expect(frames).toHaveLength(1);
    frames.shift()!(0);
    expect(decl(win, '--hv-vh')).toBe('420px');
    expect(decl(win, 'transform')).toBe(vvT(375, 420));

    // Panning (vv scroll) is tracked too.
    vv.offsetTop = 400;
    vv.dispatchEvent(new win.Event('scroll'));
    expect(frames).toHaveLength(1);
    frames.shift()!(0);
    expect(decl(win, 'transform')).toBe(vvT(375, 820));
  });

  it('follows visualViewport resize without requestAnimationFrame', () => {
    const { win } = load('dashboard.html', undefined, withVV({ width: 375, height: 812 }));
    const vv = fakeVV(win);
    vv.height = 420;
    vv.dispatchEvent(new win.Event('resize'));
    expect(decl(win, '--hv-vh')).toBe('420px');
    expect(decl(win, 'transform')).toBe(vvT(375, 420));
  });

  it('desktop: the visual viewport excludes the scrollbar, so the corner is the scrollbar edge', () => {
    const { win } = load('dashboard.html', undefined, withVV({ width: 1425, height: 900 }, (w) => setInner(w, 1440, 900)));
    expect(decl(win, 'transform')).toBe(vvT(1425, 900));
  });

  it('rounds fractional visual viewport values', () => {
    const { win } = load('dashboard.html', undefined, withVV({ width: 374.6, height: 811.4, offsetLeft: 0.2, offsetTop: 0.3 }));
    expect(decl(win, 'transform')).toBe(vvT(375, 812));
    expect(decl(win, '--hv-vw')).toBe('374px');
    expect(decl(win, '--hv-vh')).toBe('811px');
  });

  it('no visualViewport: the original right/bottom anchoring, no transform, no size vars', () => {
    const { win } = load('dashboard.html', undefined, withVV(null));
    expect((win as unknown as { visualViewport?: unknown }).visualViewport).toBeUndefined();
    expect(decl(win, 'right')).toBe('calc(16px + env(safe-area-inset-right, 0px))');
    expect(decl(win, 'bottom')).toBe('calc(16px + env(safe-area-inset-bottom, 0px))');
    expect(decl(win, 'left')).toBe('auto');
    expect(decl(win, 'top')).toBe('auto');
    expect(decl(win, 'transform')).toBe('none');
    expect(decl(win, '--hv-vw')).toBeNull();
    expect(decl(win, '--hv-vh')).toBeNull();
  });

  it('a zero-size visual viewport keeps the fallback anchoring', () => {
    const { win } = load('dashboard.html', undefined, withVV({ width: 0, height: 0 }));
    expect(decl(win, 'right')).toBe('calc(16px + env(safe-area-inset-right, 0px))');
    expect(decl(win, 'transform')).toBe('none');
  });

  it('re-applies after documentElement replacement', async () => {
    const { win } = load('dashboard.html', undefined, withVV({ width: 375, height: 812 }));
    await flush();
    // The viewport changes without an event (e.g. while the host was detached).
    const vv = fakeVV(win);
    vv.width = 360;
    vv.height = 700;
    const doc = new win.DOMParser().parseFromString('<html><body><main>unpacked</main></body></html>', 'text/html');
    win.document.documentElement.replaceWith(doc.documentElement);
    await Promise.resolve();
    expect(host(win).isConnected).toBe(true);
    expect(decl(win, 'transform')).toBe(vvT(360, 700));
    expect(decl(win, '--hv-vw')).toBe('360px');
    expect(decl(win, '--hv-vh')).toBe('700px');
  });

  it('carries no scrollbar probe', () => {
    const { win } = load('dashboard.html', undefined, withVV({ width: 375, height: 812 }));
    expect(root(win).querySelector('.sb')).toBeNull();
    expect(BODY).not.toContain('innerWidth - ');
  });

  it('panel size follows the visible viewport vars, with the old values as fallback', () => {
    const { win } = load('dashboard.html');
    const css = q<HTMLStyleElement>(win, 'style').textContent ?? '';
    expect(css).toMatch(
      /\.panel\s*\{[^}]*max-height:\s*calc\(var\(--hv-vh, 100dvh\) - 32px - env\(safe-area-inset-top, 0px\) - env\(safe-area-inset-bottom, 0px\)\)/,
    );
    expect(css).toMatch(/\.panel\s*\{[^}]*width:\s*340px;[^}]*width:\s*min\(340px, calc\(var\(--hv-vw, 100vw\) - 32px\)\)/);
    expect(css).toMatch(/@media \(max-width: 479px\) \{[^}]*width:\s*calc\(var\(--hv-vw, 100vw\) - 32px\)/);
  });

  it('the fieldset generates no box, so the body (not the actions row) absorbs a short panel', () => {
    // Measured in Chromium at a 420px-tall visual viewport: as a flex container the
    // fieldset's anonymous content box did not shrink, pushing Send below the clipped
    // panel. display:contents makes .body/.status/.actions direct flex items of the form;
    // fieldset[disabled] still disables every control (that is DOM-based).
    const { win } = load('dashboard.html');
    const css = q<HTMLStyleElement>(win, 'style').textContent ?? '';
    expect(css).toMatch(/(^|\n)fieldset\s*\{\s*display:\s*contents;\s*\}/);
    expect(css).toMatch(/(^|\n)form\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*min-height:\s*0/);
  });
});
