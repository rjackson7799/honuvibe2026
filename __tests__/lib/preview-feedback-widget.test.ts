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
    // jsdom has no visualViewport: the fallback pins the tab to the right edge, centred.
    expect(host.getAttribute('style')).toContain('right:0 !important');
    expect(host.getAttribute('style')).toContain('top:50% !important');
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
    expect(first.win.localStorage.getItem(NAME_KEY)).toBeNull();
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
// layout grows) and translated to the middle of the visual viewport's right edge
// using visualViewport values only; translate(-100%, -50%) backs it off by its own
// width and centres it vertically on that point.
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

/**
 * The transform for a visual viewport whose right edge is at x (offsetLeft + width)
 * and whose vertical middle is at y (offsetTop + height / 2).
 */
const vvT = (x: number, y: number) =>
  `translate(calc(${x}px - env(safe-area-inset-right, 0px)), ${y}px) translate(-100%, -50%)`;

const fakeVV = (win: Win) => (win as unknown as { visualViewport: FakeVV }).visualViewport;

function setInner(win: Win, w: number, h: number) {
  Object.defineProperty(win, 'innerWidth', { configurable: true, value: w });
  Object.defineProperty(win, 'innerHeight', { configurable: true, value: h });
}

describe('renderFeedbackWidget visual viewport anchoring', () => {
  it('pins the host at the origin and translates it to the middle of the visual viewport right edge', () => {
    const { win } = load('dashboard.html', undefined, withVV({ width: 375, height: 812 }));
    expect(decl(win, 'left')).toBe('0');
    expect(decl(win, 'top')).toBe('0');
    expect(decl(win, 'right')).toBe('auto');
    expect(decl(win, 'bottom')).toBe('auto');
    expect(decl(win, 'transform')).toBe(
      'translate(calc(375px - env(safe-area-inset-right, 0px)), 406px) translate(-100%, -50%)',
    );
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
    expect(decl(a.win, 'transform')).toBe(vvT(375, 406));
  });

  it('accounts for a panned visual viewport', () => {
    const { win } = load('dashboard.html', undefined, withVV({ width: 375, height: 812, offsetLeft: 100, offsetTop: 300 }));
    expect(decl(win, 'transform')).toBe(vvT(475, 706));
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
    expect(decl(win, 'transform')).toBe(vvT(375, 406));
    const vv = fakeVV(win);
    vv.height = 420;
    vv.dispatchEvent(new win.Event('resize'));
    vv.dispatchEvent(new win.Event('resize'));
    // Not applied until the frame runs, and two events queue one frame.
    expect(decl(win, '--hv-vh')).toBe('812px');
    expect(frames).toHaveLength(1);
    frames.shift()!(0);
    expect(decl(win, '--hv-vh')).toBe('420px');
    expect(decl(win, 'transform')).toBe(vvT(375, 210));

    // Panning (vv scroll) is tracked too.
    vv.offsetTop = 400;
    vv.dispatchEvent(new win.Event('scroll'));
    expect(frames).toHaveLength(1);
    frames.shift()!(0);
    expect(decl(win, 'transform')).toBe(vvT(375, 610));
  });

  it('follows visualViewport resize without requestAnimationFrame', () => {
    const { win } = load('dashboard.html', undefined, withVV({ width: 375, height: 812 }));
    const vv = fakeVV(win);
    vv.height = 420;
    vv.dispatchEvent(new win.Event('resize'));
    expect(decl(win, '--hv-vh')).toBe('420px');
    expect(decl(win, 'transform')).toBe(vvT(375, 210));
  });

  it('desktop: the visual viewport excludes the scrollbar, so the corner is the scrollbar edge', () => {
    const { win } = load('dashboard.html', undefined, withVV({ width: 1425, height: 900 }, (w) => setInner(w, 1440, 900)));
    expect(decl(win, 'transform')).toBe(vvT(1425, 450));
  });

  it('rounds fractional visual viewport values', () => {
    const { win } = load('dashboard.html', undefined, withVV({ width: 374.6, height: 811.4, offsetLeft: 0.2, offsetTop: 0.3 }));
    expect(decl(win, 'transform')).toBe(vvT(375, 406));
    expect(decl(win, '--hv-vw')).toBe('374px');
    expect(decl(win, '--hv-vh')).toBe('811px');
  });

  it('no visualViewport: right edge, vertically centred by CSS, no size vars', () => {
    const { win } = load('dashboard.html', undefined, withVV(null));
    expect((win as unknown as { visualViewport?: unknown }).visualViewport).toBeUndefined();
    expect(decl(win, 'right')).toBe('0');
    expect(decl(win, 'top')).toBe('50%');
    expect(decl(win, 'left')).toBe('auto');
    expect(decl(win, 'bottom')).toBe('auto');
    expect(decl(win, 'transform')).toBe('translateY(-50%)');
    expect(decl(win, 'zoom')).toBe('1');
    expect(decl(win, '--hv-vw')).toBeNull();
    expect(decl(win, '--hv-vh')).toBeNull();
  });

  it('a zero-size visual viewport keeps the fallback anchoring', () => {
    const { win } = load('dashboard.html', undefined, withVV({ width: 0, height: 0 }));
    expect(decl(win, 'right')).toBe('0');
    expect(decl(win, 'top')).toBe('50%');
    expect(decl(win, 'transform')).toBe('translateY(-50%)');
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
    expect(decl(win, 'transform')).toBe(vvT(360, 350));
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

// A non-reflowing export can scale its desktop design down with an inline
// `zoom` on <html> (new Hawaii Palms export: zoom 0.2604 = 375/1440 on a phone).
// CSS zoom is inherited multiplicatively, so the host (in body) rendered at 26%
// and its visual viewport translate was scaled by the same factor. The host
// carries its own counter-zoom so its effective zoom is 1. jsdom does not
// implement `zoom`, so computed zoom is stubbed for <html> and <body>.
type Zooms = { html: string; body: string };

function withZoom(zooms: Zooms, inner?: (win: Win) => void): (win: Win) => void {
  return (win) => {
    const real = win.getComputedStyle.bind(win);
    const stub = (el: Element, pseudo?: string | null): CSSStyleDeclaration => {
      const doc = win.document;
      const z = el === doc.documentElement ? zooms.html : el === doc.body ? zooms.body : null;
      if (z === null) return real(el, pseudo);
      return { zoom: z, getPropertyValue: (p: string) => (p === 'zoom' ? z : '') } as unknown as CSSStyleDeclaration;
    };
    (win as unknown as { getComputedStyle: typeof stub }).getComputedStyle = stub;
    inner?.(win);
  };
}

const counter = (z: number) => String(1 / z);

describe('renderFeedbackWidget root CSS zoom', () => {
  it('counter-zooms the host under a zoomed <html>, keeping the visual viewport transform', () => {
    const zooms = { html: '0.2604', body: '1' };
    const { win } = load('index.html', undefined, withZoom(zooms, withVV({ width: 375, height: 812 })));
    expect(decl(win, 'zoom')).toBe(counter(0.2604));
    expect(decl(win, 'transform')).toBe(vvT(375, 406));
    expect(decl(win, '--hv-vw')).toBe('375px');
    expect(decl(win, 'left')).toBe('0');
  });

  it('uses the product of the <html> and <body> zoom', () => {
    const { win } = load('index.html', undefined, withZoom({ html: '0.5', body: '0.8' }, withVV({ width: 375, height: 812 })));
    expect(decl(win, 'zoom')).toBe(counter(0.4));
  });

  it('pins an explicit zoom:1 when the inherited zoom is 1 or unreadable', () => {
    // Always exactly one inline-important zoom, so page CSS that matches the host
    // (e.g. `body > div { zoom: .5 }`) can't shrink it either.
    for (const html of ['1', '', 'normal', '0', '-2', 'NaN']) {
      const vv = load('index.html', undefined, withZoom({ html, body: '1' }, withVV({ width: 375, height: 812 })));
      expect(decl(vv.win, 'zoom')).toBe('1');
      const plain = load('index.html', undefined, withVV({ width: 375, height: 812 }));
      expect(host(vv.win).getAttribute('style')).toBe(host(plain.win).getAttribute('style'));
    }
    // html 0.5 x body 2 is an inherited zoom of 1 too.
    const product = load('index.html', undefined, withZoom({ html: '0.5', body: '2' }, withVV({ width: 375, height: 812 })));
    expect(decl(product.win, 'zoom')).toBe('1');
    // The fallback (no visualViewport) path pins it as well.
    const fb = load('index.html', undefined, withZoom({ html: '1', body: '1' }, withVV(null)));
    const plainFb = load('index.html', undefined, withVV(null));
    expect(decl(fb.win, 'zoom')).toBe('1');
    expect(host(fb.win).getAttribute('style')).toBe(host(plainFb.win).getAttribute('style'));
  });

  it('the host zoom is inline !important, so it beats page CSS aimed at the host', () => {
    const { win } = load('index.html', undefined, withVV({ width: 375, height: 812 }));
    const attr = host(win).getAttribute('style') ?? '';
    expect(attr).toContain('zoom:1 !important');
    expect(attr.match(/(^|;)\s*zoom\s*:/g)).toHaveLength(1);
  });

  it('fallback path (no visualViewport) gets the same counter-zoom', () => {
    const { win } = load('index.html', undefined, withZoom({ html: '0.2604', body: '1' }, withVV(null)));
    expect(decl(win, 'zoom')).toBe(counter(0.2604));
    expect(decl(win, 'right')).toBe('0');
    expect(decl(win, 'top')).toBe('50%');
    expect(decl(win, 'transform')).toBe('translateY(-50%)');
    expect(decl(win, '--hv-vw')).toBeNull();
  });

  it('follows a later zoom change on <html> or <body> (style/class mutations)', async () => {
    const zooms = { html: '1', body: '1' };
    const { win } = load('index.html', undefined, withZoom(zooms, withVV({ width: 375, height: 812 })));
    expect(decl(win, 'zoom')).toBe('1');
    const html = win.document.documentElement;
    zooms.html = '0.2604';
    html.setAttribute('style', 'zoom: 0.2604');
    await Promise.resolve();
    expect(decl(win, 'zoom')).toBe(counter(0.2604));
    expect(decl(win, 'transform')).toBe(vvT(375, 406));

    zooms.body = '0.5';
    win.document.body.className = 'scaled';
    await Promise.resolve();
    expect(decl(win, 'zoom')).toBe(counter(0.2604 * 0.5));

    zooms.html = '1';
    zooms.body = '1';
    html.removeAttribute('style');
    await Promise.resolve();
    expect(decl(win, 'zoom')).toBe('1');
  });

  it('a window resize re-evaluates (stylesheet media query zoom)', () => {
    const zooms = { html: '1', body: '1' };
    const { win } = load('index.html', undefined, withZoom(zooms, withVV(null)));
    expect(decl(win, 'zoom')).toBe('1');
    zooms.html = '0.25';
    win.dispatchEvent(new win.Event('resize'));
    expect(decl(win, 'zoom')).toBe(counter(0.25));
  });

  it('zoom re-evaluation is rAF-throttled together with placement', async () => {
    const frames: FrameRequestCallback[] = [];
    const zooms = { html: '1', body: '1' };
    const { win } = load(
      'index.html',
      undefined,
      withZoom(
        zooms,
        withVV({ width: 375, height: 812 }, (w) => {
          (w as unknown as { requestAnimationFrame: (cb: FrameRequestCallback) => number }).requestAnimationFrame = (cb) =>
            frames.push(cb);
        }),
      ),
    );
    zooms.html = '0.5';
    win.document.documentElement.setAttribute('style', 'zoom: 0.5');
    await Promise.resolve();
    win.dispatchEvent(new win.Event('resize'));
    fakeVV(win).dispatchEvent(new win.Event('resize'));
    expect(decl(win, 'zoom')).toBe('1');
    expect(frames).toHaveLength(1);
    frames.shift()!(0);
    expect(decl(win, 'zoom')).toBe(counter(0.5));
  });

  it('never observes its own host (no feedback loop)', async () => {
    const frames: FrameRequestCallback[] = [];
    const zooms = { html: '0.2604', body: '1' };
    const { win } = load(
      'index.html',
      undefined,
      withZoom(
        zooms,
        withVV({ width: 375, height: 812 }, (w) => {
          (w as unknown as { requestAnimationFrame: (cb: FrameRequestCallback) => number }).requestAnimationFrame = (cb) =>
            frames.push(cb);
        }),
      ),
    );
    // Run (never drop) every queued frame: dropping one would leave placement
    // stuck "queued" and make every later check below pass vacuously.
    const drain = async () => {
      for (let i = 0; i < 10 && frames.length; i++) {
        frames.shift()!(0);
        await flush();
      }
      expect(frames).toHaveLength(0);
    };
    await flush();
    await drain();
    expect(decl(win, 'zoom')).toBe(counter(0.2604));

    // Writes to the host's own style attribute never re-trigger placement.
    host(win).setAttribute('style', host(win).getAttribute('style') + ';color:red');
    await flush();
    expect(frames).toHaveLength(0);

    // A window resize queues exactly one frame; running it rewrites the host's
    // style (dropping the color above), and that write queues nothing further.
    win.dispatchEvent(new win.Event('resize'));
    win.dispatchEvent(new win.Event('resize'));
    expect(frames).toHaveLength(1);
    frames.shift()!(0);
    expect(host(win).getAttribute('style')).not.toContain('color:red');
    await flush();
    expect(frames).toHaveLength(0);
    expect(decl(win, 'zoom')).toBe(counter(0.2604));
  });

  it('re-applies after documentElement replacement and watches the new root', async () => {
    const zooms = { html: '0.2604', body: '1' };
    const { win } = load('index.html', undefined, withZoom(zooms, withVV({ width: 375, height: 812 })));
    await flush();
    expect(decl(win, 'zoom')).toBe(counter(0.2604));
    const oldHtml = win.document.documentElement;
    const doc = new win.DOMParser().parseFromString('<html><body><main>unpacked</main></body></html>', 'text/html');
    zooms.html = '0.3';
    win.document.documentElement.replaceWith(doc.documentElement);
    await Promise.resolve();
    expect(host(win).isConnected).toBe(true);
    expect(host(win).parentElement).toBe(win.document.body);
    expect(decl(win, 'zoom')).toBe(counter(0.3));
    expect(decl(win, 'transform')).toBe(vvT(375, 406));

    // The new root is observed...
    zooms.html = '0.5';
    win.document.documentElement.setAttribute('style', 'zoom: 0.5');
    await Promise.resolve();
    expect(decl(win, 'zoom')).toBe(counter(0.5));
    // ...and the detached old one is not.
    zooms.html = '0.25';
    oldHtml.setAttribute('style', 'zoom: 0.25');
    await Promise.resolve();
    expect(decl(win, 'zoom')).toBe(counter(0.5));
  });
});

// The owner's browser window runs ~48px under the Windows taskbar, which hid the
// old bottom-right pill (and the panel's Send), and the near-black pill vanished
// on dark photo heroes. The launcher is now a cream tab on the right edge,
// vertically centred in the visible viewport.
describe('renderFeedbackWidget right-edge tab', () => {
  const css = (win: Win) => q<HTMLStyleElement>(win, 'style').textContent ?? '';
  const launcher = (win: Win) => q<HTMLButtonElement>(win, '.launch');

  it('is a real button named "Feedback" that announces and tracks its dialog', () => {
    const { win } = load('concept-a.html');
    const b = launcher(win);
    expect(b).toBe(button(win, 'Feedback'));
    expect(b.tagName).toBe('BUTTON');
    expect(b.type).toBe('button');
    expect(b.textContent?.trim()).toBe('Feedback');
    expect(b.getAttribute('aria-haspopup')).toBe('dialog');
    expect(b.getAttribute('aria-expanded')).toBe('false');
    // The icon is decorative and adds nothing to the accessible name.
    const svg = b.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('aria-hidden')).toBe('true');
    expect(svg!.getAttribute('focusable')).toBe('false');
    b.click();
    expect(b.getAttribute('aria-expanded')).toBe('true');
    button(win, 'Cancel').click();
    expect(b.getAttribute('aria-expanded')).toBe('false');
    b.click();
    messageInput(win).dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(root(win).activeElement).toBe(b);
  });

  it('keeps the draft dot on the tab', () => {
    const { win } = load('concept-a.html');
    const dot = q<HTMLElement>(win, '.dot');
    expect(launcher(win).contains(dot)).toBe(true);
    expect(dot.getAttribute('aria-hidden')).toBe('true');
  });

  it('is a high-contrast cream tab, flush right, rounded on the left only, reading bottom-to-top', () => {
    const { win } = load('concept-a.html');
    const c = css(win);
    const launch = /(^|\n)\.launch\s*\{([^}]*)\}/.exec(c);
    expect(launch).not.toBeNull();
    const body = launch![2];
    expect(body).toMatch(/background:\s*#f2efe8/);
    expect(body).toMatch(/color:\s*#0a0a0c/);
    expect(body).toMatch(/border:\s*1px solid rgba\(10,10,12,0\.35\)/);
    expect(body).toMatch(/border-right:\s*0/);
    expect(body).toMatch(/border-radius:\s*10px 0 0 10px/);
    expect(body).toMatch(/box-shadow:\s*0 6px 20px rgba\(0,0,0,0\.35\)/);
    expect(body).toMatch(/width:\s*44px/);
    const minH = /min-height:\s*(\d+)px/.exec(body);
    expect(minH).not.toBeNull();
    expect(Number(minH![1])).toBeGreaterThanOrEqual(120);
    expect(Number(minH![1])).toBeLessThanOrEqual(140);
    expect(c).toMatch(/\.launch:hover,\s*\.launch:focus-visible\s*\{[^}]*background:\s*#ffffff/);
    expect(c).toMatch(/\.launch:focus-visible\s*\{[^}]*outline:\s*2px solid #0a0a0c/);
    expect(c).toMatch(/\.tl\s*\{[^}]*writing-mode:\s*vertical-rl;[^}]*transform:\s*rotate\(180deg\)/);
    expect(c).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^}]*\.launch[^}]*transition:\s*none/);
    // The panel keeps its dark palette.
    expect(c).toMatch(/\.panel\s*\{[^}]*background:\s*rgba\(12,12,16,0\.94\)/);
  });

  it('the open panel keeps a 16px gap to the right edge inside the host box', () => {
    // translate(-100%, -50%) backs the host off by its own width, so the gap must be
    // part of the host's box (a margin on the in-flow panel), not an offset.
    const { win } = load('concept-a.html');
    expect(css(win)).toMatch(/\.panel\s*\{[^}]*margin:\s*0 16px 0 0/);
  });
});

const HINT_KEY = 'hv_pv_fb_hint_seen';

describe('renderFeedbackWidget first-visit hint', () => {
  const hint = (win: Win) => root(win).querySelector<HTMLElement>('.hint');

  function withTimers(timers: { fn: () => void; ms: number }[]) {
    return (win: Win) => {
      const fake = (fn: () => void, ms: number) => timers.push({ fn, ms });
      (win as unknown as { setTimeout: typeof fake }).setTimeout = fake;
      (win as unknown as { clearTimeout: () => void }).clearTimeout = () => {};
    };
  }

  it('shows once per browser, left of the tab, hidden from assistive tech', () => {
    const page = load('concept-a.html');
    const h = hint(page.win);
    expect(h).not.toBeNull();
    expect(h!.textContent).toBe('Leave feedback here');
    expect(h!.getAttribute('aria-hidden')).toBe('true');
    expect(q<HTMLButtonElement>(page.win, '.launch').contains(h)).toBe(false);
    expect(page.win.localStorage.getItem(HINT_KEY)).toBe('1');
    const css = q<HTMLStyleElement>(page.win, 'style').textContent ?? '';
    expect(css).toMatch(/\.hint\s*\{[^}]*position:\s*absolute;[^}]*right:\s*calc\(100% \+ \d+px\)/);
    expect(css).toMatch(/\.hint\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.hint\s*\{[^}]*font-size:\s*14px/);
    expect(css).toMatch(/\.hint\s*\{[^}]*background:\s*#0a0a0c/);

    const next = reload(page, 'index.html');
    expect(hint(next.win)).toBeNull();
  });

  it('is removed after about 5 seconds', () => {
    const timers: { fn: () => void; ms: number }[] = [];
    const { win } = load('concept-a.html', undefined, withTimers(timers));
    expect(hint(win)).not.toBeNull();
    const t = timers.find((x) => x.ms === 5000);
    expect(t).toBeDefined();
    t!.fn();
    expect(hint(win)).toBeNull();
  });

  it('is removed as soon as the panel opens', () => {
    const timers: { fn: () => void; ms: number }[] = [];
    const { win } = load('concept-a.html', undefined, withTimers(timers));
    expect(hint(win)).not.toBeNull();
    button(win, 'Feedback').click();
    expect(hint(win)).toBeNull();
    // A late timer is harmless, and closing the panel does not bring it back.
    timers.find((x) => x.ms === 5000)!.fn();
    button(win, 'Cancel').click();
    expect(hint(win)).toBeNull();
  });

  it('survives the bundle root swap and restarts its timer', async () => {
    const timers: { fn: () => void; ms: number }[] = [];
    const { win } = load('concept-a.html', undefined, withTimers(timers));
    await flush();
    const before = timers.filter((x) => x.ms === 5000).length;
    const doc = new win.DOMParser().parseFromString('<html><body><main>unpacked</main></body></html>', 'text/html');
    win.document.documentElement.replaceWith(doc.documentElement);
    await Promise.resolve();
    expect(host(win).isConnected).toBe(true);
    expect(hint(win)).not.toBeNull();
    expect(timers.filter((x) => x.ms === 5000).length).toBe(before + 1);
  });

  it('is not shown when already seen', () => {
    const { win } = load('concept-a.html', { session: {}, local: { [HINT_KEY]: '1' } });
    expect(hint(win)).toBeNull();
  });

  it('is not shown when storage cannot be read', () => {
    const { win } = load('concept-a.html', undefined, (w) => {
      vi.spyOn(w.Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
    });
    expect(hint(win)).toBeNull();
  });

  it('is not shown when storage cannot be written (it could never be marked seen)', () => {
    const { win } = load('concept-a.html', undefined, (w) => {
      vi.spyOn(w.Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    });
    expect(hint(win)).toBeNull();
  });

  it('is not shown when a resumed draft auto-opens the panel', () => {
    const { win } = load('index.html', {
      session: {
        [DRAFT_KEY]: JSON.stringify({ name: 'Kenji', page: 'concept-a.html', kind: 'bug', message: 'Note', resume: true }),
      },
      local: {},
    });
    expect(q<HTMLElement>(win, '[role="dialog"]').hidden).toBe(false);
    expect(hint(win)).toBeNull();
  });
});
