import { FEEDBACK_KIND_LABEL, FEEDBACK_KINDS, FEEDBACK_LIMITS } from './feedback';

// Self-mounting feedback widget injected before </body> of opted-in client
// previews. The output is inlined into third-party HTML exports, so:
// - everything embedded goes through jsonForScript (every "<" escaped, ASCII only),
//   which keeps "</script" and "<!--" out of the script body entirely;
// - the source below is plain ES2019 (no ?. / ?? / class fields / backticks) -
//   it is a string, never transpiled;
// - the UI lives in an open shadow root so the export's CSS can't reach it.
// No 'server-only' here: unit tests evaluate the output in jsdom.

function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/[^\x00-\x7e]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

// Inline !important styles on the host: the page's own CSS can target the host
// element (it sits in the light DOM), and only inline-important reliably wins.
const HOST_COMMON = [
  'position:fixed',
  'z-index:2147483647',
  'display:block',
  'width:auto',
  'height:auto',
  'margin:0',
  'padding:0',
  'border:0',
  'visibility:visible',
  'opacity:1',
  'pointer-events:auto',
];
const important = (decls: string[]) => decls.map((d) => d + ' !important').join(';');

// Fallback (no visualViewport): the right edge of the fixed containing block,
// vertically centred.
const HOST_STYLE = important([
  ...HOST_COMMON,
  'right:0',
  'top:50%',
  'left:auto',
  'bottom:auto',
  'transform:translateY(-50%)',
]);

// With visualViewport: pinned at the containing block's origin; the script
// appends the transform (to the middle of the visual viewport's right edge) and
// the size vars.
const HOST_STYLE_VV = important([...HOST_COMMON, 'left:0', 'top:0', 'right:auto', 'bottom:auto']);

// Neutral "tool chrome" palette, shared with the gate page (gate.ts PAGE_STYLE).
const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
.w {
  position: relative;
  color: #f2efe8;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
.launch {
  position: relative;
  display: flex; flex-direction: column-reverse; align-items: center; justify-content: center; gap: 8px;
  width: 44px; min-height: 132px; margin: 0; padding: 14px 0;
  font: inherit; font-size: 14px; font-weight: 700; line-height: 1; letter-spacing: 0.02em;
  color: #0a0a0c;
  background: #f2efe8;
  border: 1px solid rgba(10,10,12,0.35); border-right: 0;
  border-radius: 10px 0 0 10px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.35);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 150ms ease;
}
.launch:hover, .launch:focus-visible { background: #ffffff; }
.launch:focus-visible { outline: 2px solid #0a0a0c; outline-offset: -6px; }
.ic { flex: 0 0 auto; display: block; width: 18px; height: 18px; }
.tl { writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; }
.dot {
  position: absolute; top: 9px; left: 50%; margin-left: -4px;
  width: 8px; height: 8px; border-radius: 50%; background: #c2410c;
}
.hint {
  position: absolute; right: calc(100% + 12px); top: 50%;
  transform: translateY(-50%);
  margin: 0; padding: 8px 12px;
  font-size: 14px; font-weight: 600; line-height: 1.3; white-space: nowrap;
  color: #f2efe8; background: #0a0a0c;
  border: 1px solid rgba(242,239,232,0.22); border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.35);
  pointer-events: none;
  animation: hv-hint-in 250ms ease-out;
}
.hint::after {
  content: ""; position: absolute; top: 50%; right: -6px; margin-top: -6px;
  width: 0; height: 0;
  border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-left: 6px solid #0a0a0c;
}
@keyframes hv-hint-in {
  from { opacity: 0; transform: translate(6px, -50%); }
  to { opacity: 1; transform: translate(0, -50%); }
}
.panel {
  display: flex; flex-direction: column;
  margin: 0 16px 0 0;
  width: 340px;
  width: min(340px, calc(var(--hv-vw, 100vw) - 32px));
  max-height: calc(100vh - 32px);
  max-height: calc(100dvh - 32px);
  max-height: calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  max-height: calc(var(--hv-vh, 100dvh) - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  background: rgba(12,12,16,0.94);
  border: 1px solid rgba(255,255,255,0.10); border-radius: 14px;
  box-shadow: 0 30px 80px rgba(0,0,0,0.55);
  backdrop-filter: blur(18px) saturate(120%);
  -webkit-backdrop-filter: blur(18px) saturate(120%);
  overflow: hidden;
}
@media (max-width: 479px) { .panel { width: calc(100vw - 32px); width: calc(var(--hv-vw, 100vw) - 32px); } }
form { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; min-width: 0; margin: 0; padding: 0; border: 0; }
fieldset { display: contents; }
.body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 20px 20px 8px; }
h2 { margin: 0 0 4px; font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
.page { margin: 0 0 16px; font-size: 12px; color: rgba(242,239,232,0.62); word-break: break-all; }
label, .lbl { display: block; margin: 0 0 6px; font-size: 13px; color: rgba(242,239,232,0.62); }
input, textarea { font-size: 16px; font-family: inherit; }
.field {
  display: block; width: 100%; margin: 0 0 14px; padding: 11px 12px;
  color: #f2efe8; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.14); border-radius: 9px; outline: none;
  transition: border-color 150ms ease, background 150ms ease;
}
textarea.field { resize: vertical; min-height: 120px; }
.field:focus { border-color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.08); }
.kinds { display: flex; gap: 8px; margin: 0 0 14px; }
.kind {
  flex: 1 1 0; display: flex; align-items: center; gap: 8px; margin: 0;
  min-height: 44px; padding: 0 12px; font-size: 14px; color: #f2efe8;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.14); border-radius: 9px; cursor: pointer;
  transition: border-color 150ms ease;
}
.kind:has(input:checked) { border-color: rgba(255,255,255,0.55); }
.kind input { width: 18px; height: 18px; margin: 0; accent-color: #f2efe8; }
.status { margin: 0; padding: 0 20px; font-size: 13px; color: #f2efe8; }
.status:not(:empty) { padding-top: 10px; }
.actions { display: flex; gap: 8px; flex: 0 0 auto; padding: 12px 20px 16px; }
.btn {
  flex: 1 1 0; min-height: 44px; padding: 0 14px;
  font: inherit; font-size: 15px; font-weight: 600; border-radius: 9px; cursor: pointer;
  transition: background 150ms ease;
}
.send { color: #0a0a0c; background: #f2efe8; border: 0; }
.send:hover { background: #ffffff; }
.cancel { color: #f2efe8; background: transparent; border: 1px solid rgba(255,255,255,0.14); }
.btn:disabled, .field:disabled, .kind input:disabled { opacity: 0.55; cursor: default; }
.btn:focus-visible, .field:focus-visible, .kind input:focus-visible {
  outline: 2px solid #f2efe8; outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .launch, .field, .kind, .btn, .hint { transition: none; animation: none; }
}
`.trim();

// Static skeleton only - every dynamic value is set via textContent / value.
const MARKUP = [
  '<div class="w">',
  // Column-reversed: the icon sits at the bottom, where the bottom-to-top label starts.
  '<button type="button" class="launch" aria-haspopup="dialog" aria-expanded="false">',
  '<svg class="ic" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">',
  '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="currentColor"',
  ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
  '<span class="tl">Feedback</span>',
  '<span class="dot" aria-hidden="true" hidden></span></button>',
  '<div class="panel" role="dialog" aria-label="Send feedback" hidden>',
  '<form><fieldset><div class="body">',
  '<h2>Send feedback</h2><p class="page"></p>',
  '<label for="hv-name">Name</label>',
  '<input id="hv-name" class="field" type="text" name="name" autocomplete="name" required>',
  '<div class="lbl" id="hv-kind">Type</div>',
  '<div class="kinds" role="radiogroup" aria-labelledby="hv-kind" aria-required="true"></div>',
  '<label for="hv-msg">Message</label>',
  '<textarea id="hv-msg" class="field" name="message" rows="5" required></textarea>',
  '</div><p class="status" aria-live="polite"></p>',
  '<div class="actions"><button type="button" class="btn cancel">Cancel</button>',
  '<button type="submit" class="btn send">Send</button></div>',
  '</fieldset></form></div></div>',
].join('');

const MSG = {
  sending: 'Sending\u2026',
  sent: 'Thanks \u2014 your note was sent.',
  expiredSaved:
    'Your session has expired. Reload the page and enter the password again. Your note is saved and will be here when you come back.',
  expiredUnsaved:
    'Your session has expired. Copy your note somewhere safe, then reload the page and enter the password again.',
  rateLimited: 'Too many notes in a short time. Try again in about ',
  failed: "Couldn't send. Please try again.",
  incomplete: 'Add your name, pick a type and write a note.',
  hint: 'Leave feedback here',
};

const SOURCE = String.raw`
var w = window, d = document;
if (w.__hvPreviewFeedback) return;
w.__hvPreviewFeedback = true;
var framed = true;
try { framed = w.top !== w; } catch (e) { framed = true; }
if (framed) return;

var DRAFT_KEY = 'hv_pv_fb_draft:' + C.slug, NAME_KEY = 'hv_pv_feedback_name', TIMEOUT_MS = 20000;
var PREFIX = '/api/preview/' + C.slug + '/';
var host = d.createElement('div');
host.id = 'hv-preview-feedback';
host.setAttribute('style', HOST_STYLE);
var root = host.attachShadow({ mode: 'open' });
var style = d.createElement('style');
style.textContent = CSS;
root.appendChild(style);
var shell = d.createElement('div');
shell.innerHTML = MARKUP;
root.appendChild(shell.firstChild);
function $(s) { return root.querySelector(s); }
var launch = $('.launch'), dot = $('.dot'), panel = $('.panel'), form = $('form'), fs = $('fieldset');
var fName = $('#hv-name'), fMsg = $('#hv-msg'), pageEl = $('.page'), statusEl = $('.status');
fName.maxLength = L.name;
fMsg.maxLength = L.message;
K.forEach(function (k) {
  var lab = d.createElement('label'), r = d.createElement('input'), t = d.createElement('span');
  lab.className = 'kind';
  r.type = 'radio'; r.name = 'kind'; r.value = k[0]; r.required = true;
  t.textContent = k[1];
  lab.appendChild(r); lab.appendChild(t);
  $('.kinds').appendChild(lab);
});
var radios = root.querySelectorAll('input[type="radio"]');
function kindVal() {
  for (var i = 0; i < radios.length; i++) if (radios[i].checked) return radios[i].value;
  return '';
}
function setKind(v) {
  for (var i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === v;
}

var draftPage = null, draftSaved = false, sending = false;
function currentPage() {
  var p = location.pathname || '';
  if (p.indexOf(PREFIX) === 0) p = p.slice(PREFIX.length);
  else if (p === PREFIX.slice(0, -1)) p = '';
  try { p = decodeURIComponent(p); } catch (e) {}
  if (location.hash) p += location.hash;
  p = p.replace(/[\u0000-\u001f\u007f]/g, '');
  return (p || '(entry)').slice(0, L.page);
}
function refresh() {
  pageEl.textContent = 'Page: ' + (draftPage || currentPage());
  dot.hidden = !fMsg.value;
}
function say(t) { statusEl.textContent = t; }
// resume = auto-open the panel on the next load (set only at a 401, so the
// reviewer sees the note on the page they re-enter the password on).
function saveDraft(resume) {
  var o = { name: fName.value, page: draftPage, kind: kindVal(), message: fMsg.value };
  if (resume) o.resume = true;
  try {
    w.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(o));
    draftSaved = true;
  } catch (e) { draftSaved = false; }
}
function dropDraft() {
  draftPage = null;
  draftSaved = false;
  try { w.sessionStorage.removeItem(DRAFT_KEY); } catch (e) {}
}
function onInput() {
  if (sending) return;
  if (!fMsg.value) dropDraft();
  else {
    if (draftPage === null) draftPage = currentPage();
    saveDraft();
  }
  refresh();
}
form.addEventListener('input', onInput);
form.addEventListener('change', onInput);

var savedName = '', draft = null;
try { savedName = w.localStorage.getItem(NAME_KEY) || ''; } catch (e) {}
try {
  var raw = w.sessionStorage.getItem(DRAFT_KEY);
  if (raw !== null) {
    var o = null;
    try { o = JSON.parse(raw); } catch (e) {}
    if (o && typeof o === 'object' && typeof o.message === 'string' && o.message) draft = o;
    else w.sessionStorage.removeItem(DRAFT_KEY);
  }
} catch (e) {}
if (draft) {
  fName.value = (typeof draft.name === 'string' && draft.name ? draft.name : savedName).slice(0, L.name);
  fMsg.value = draft.message.slice(0, L.message);
  if (typeof draft.kind === 'string') setKind(draft.kind);
  draftPage = typeof draft.page === 'string' && draft.page ? draft.page.slice(0, L.page) : currentPage();
  draftSaved = true;
} else {
  fName.value = savedName.slice(0, L.name);
}
refresh();

// One-time hint left of the tab. Marked seen BEFORE it is shown, so a browser
// whose storage throws (and could never remember it) never gets it at all.
var HINT_KEY = 'hv_pv_fb_hint_seen', HINT_MS = 5000, hintEl = null, hintTimer = 0;
var wrap = $('.w');
function dropHint() {
  if (hintTimer) { w.clearTimeout(hintTimer); hintTimer = 0; }
  if (hintEl && hintEl.parentNode) hintEl.parentNode.removeChild(hintEl);
  hintEl = null;
}
function armHint() {
  if (hintTimer) w.clearTimeout(hintTimer);
  hintTimer = w.setTimeout(dropHint, HINT_MS);
}
function showHint() {
  var seen = true;
  try {
    seen = w.localStorage.getItem(HINT_KEY) === '1';
    if (!seen) w.localStorage.setItem(HINT_KEY, '1');
  } catch (e) { seen = true; }
  if (seen) return;
  hintEl = d.createElement('div');
  hintEl.className = 'hint';
  hintEl.setAttribute('aria-hidden', 'true');
  hintEl.textContent = M.hint;
  wrap.appendChild(hintEl);
  armHint();
}

function openPanel() {
  dropHint();
  if (!sending) say('');
  panel.hidden = false;
  launch.hidden = true;
  launch.setAttribute('aria-expanded', 'true');
  refresh();
  (fName.value ? fMsg : fName).focus();
}
// Closing is blocked mid-send so the outcome always lands in an open panel.
function closePanel() {
  if (sending) return;
  panel.hidden = true;
  launch.hidden = false;
  launch.setAttribute('aria-expanded', 'false');
  launch.focus();
}
launch.addEventListener('click', openPanel);
$('.cancel').addEventListener('click', closePanel);
// Key events are composed: without this they would bubble out to the export's
// own window/document handlers (shortcut keys, Esc-closes-menu) with the target
// retargeted to the host. Capture-phase page listeners can't be blocked from here.
function isolate(e) { e.stopPropagation(); }
root.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); closePanel(); }
  isolate(e);
});
root.addEventListener('keyup', isolate);
root.addEventListener('keypress', isolate);

var pending = null;
function finish(token, res) {
  if (pending !== token) return;
  pending = null;
  w.clearTimeout(token.timer);
  sending = false;
  fs.disabled = false;
  var s = res ? res.status : 0;
  if (s === 201) {
    try { w.localStorage.setItem(NAME_KEY, fName.value.trim()); } catch (e) {}
    fMsg.value = '';
    setKind('');
    dropDraft();
    say(M.sent);
  } else if (s === 401) {
    if (draftSaved) saveDraft(true);
    say(draftSaved ? M.expiredSaved : M.expiredUnsaved);
  } else if (s === 429) {
    var h = res.headers && res.headers.get ? res.headers.get('Retry-After') : null;
    var secs = h === null || h === '' ? NaN : Number(h);
    var n = secs >= 0 ? Math.max(1, Math.ceil(secs / 60)) : 10;
    say(M.rateLimited + n + (n === 1 ? ' minute.' : ' minutes.'));
  } else {
    say(M.failed);
  }
  refresh();
  // Disabling the fieldset blurred Send; put focus back so Esc keeps working,
  // unless the reviewer has since moved focus somewhere else on the page.
  var a = d.activeElement;
  if (!panel.hidden && (!a || a === d.body || a === host)) fMsg.focus();
}
form.addEventListener('submit', function (e) {
  e.preventDefault();
  if (sending) return;
  var name = fName.value.trim(), kind = kindVal(), message = fMsg.value;
  if (!name || !kind || !message.trim()) { say(M.incomplete); return; }
  var body = JSON.stringify({
    name: name, kind: kind, message: message, page: draftPage || currentPage(),
    viewportW: w.innerWidth, viewportH: w.innerHeight
  });
  sending = true;
  fs.disabled = true;
  say(M.sending);
  var ctrl = w.AbortController ? new w.AbortController() : null;
  var token = { timer: 0 };
  pending = token;
  token.timer = w.setTimeout(function () {
    if (ctrl) ctrl.abort();
    finish(token, null);
  }, TIMEOUT_MS);
  var init = {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, body: body
  };
  if (ctrl) init.signal = ctrl.signal;
  var req;
  try { req = w.fetch(C.endpoint, init); } catch (err) { req = Promise.reject(err); }
  Promise.resolve(req).then(
    function (res) { finish(token, res); },
    function () { finish(token, null); }
  );
});

// Fixed right/top:50% anchors to the LAYOUT viewport. A non-responsive export can
// stretch that far past the screen (real export: 375x812 visible, layout settling
// at 568x1230 via a transient 669x1447, with no visualViewport event), and the
// iOS keyboard shrinks only the VISUAL viewport. So, with visualViewport, the host
// sits at the containing block's origin (left/top 0: the layout viewport's
// top-left, which does not move as the layout grows) and is translated to the
// middle of the visual viewport's right edge, then backed off by its own width
// and centred on that point (translate(-100%, -50%)). Only visualViewport values
// are used - they are in layout-viewport coordinates and fire resize/scroll
// whenever they change - so nothing is inferred from innerWidth/clientWidth, and
// desktop scrollbars are already excluded from vv.width. The right safe-area
// inset stays in CSS (calc + env), and the open panel's 16px right gap is its own
// margin, so it is part of the host box that -100% backs off.
//
// CSS zoom on <html>/<body> is inherited multiplicatively. A non-reflowing export
// can scale its desktop design to the phone with an inline zoom on <html> (real
// export: 0.2604 = 375/1440), which shrank the launcher to 26% and scaled the
// translate by the same factor. The host takes a counter-zoom (1/z) so its
// effective zoom is 1: the translate stays in true CSS px and the 16px inputs
// really are 16px (iOS focus-zoom). At z = 1 the host still pins zoom:1.
var vv = w.visualViewport, placeQueued = false, base = HOST_STYLE;
function px(n) { return n + 'px'; }
function zoomOf(el) {
  if (!el || !w.getComputedStyle) return 1;
  var z = NaN;
  try {
    var cs = w.getComputedStyle(el);
    if (cs) z = parseFloat(cs.zoom || (cs.getPropertyValue ? cs.getPropertyValue('zoom') : ''));
  } catch (e) {}
  return isFinite(z) && z > 0 ? z : 1;
}
function placeNow() {
  placeQueued = false;
  if (vv) {
    var vw = Number(vv.width) || 0, vh = Number(vv.height) || 0;
    if (vw > 0 && vh > 0) {
      var x = Math.round((Number(vv.offsetLeft) || 0) + vw);
      var y = Math.round((Number(vv.offsetTop) || 0) + vh / 2);
      base = HOST_STYLE_VV +
        ';transform:translate(calc(' + px(x) + ' - env(safe-area-inset-right, 0px)), ' +
        px(y) + ') translate(-100%, -50%) !important' +
        ';--hv-vw:' + px(Math.floor(vw)) + ' !important;--hv-vh:' + px(Math.floor(vh)) + ' !important';
    }
  }
  // Always exactly one inline-important zoom (1 when nothing is inherited), so
  // page CSS that matches the host itself (body > div { zoom: .5 }) can't win.
  var z = zoomOf(d.documentElement) * zoomOf(d.body);
  var s = base + ';zoom:' + (Math.abs(z - 1) > 1e-6 ? String(1 / z) : '1') + ' !important';
  // The whole attribute is written rather than round-tripped through the CSSOM.
  if (host.getAttribute('style') !== s) host.setAttribute('style', s);
}
function place() {
  if (placeQueued) return;
  if (w.requestAnimationFrame) { placeQueued = true; w.requestAnimationFrame(placeNow); }
  else placeNow();
}
if (vv && vv.addEventListener) {
  vv.addEventListener('resize', place);
  vv.addEventListener('scroll', place);
}
w.addEventListener('resize', place);
w.addEventListener('load', place);

// The export can set its zoom after load (inline style or a class on html/body).
// Only html/body attributes are observed - never the host or the subtree - so
// writing the host's style can't loop. Re-attached after the root swap.
var zoomObs = w.MutationObserver ? new MutationObserver(place) : null, obsHtml = null, obsBody = null;
function watchZoom() {
  if (!zoomObs) return;
  var h = d.documentElement, b = d.body;
  if (h === obsHtml && b === obsBody) return;
  zoomObs.disconnect();
  obsHtml = h;
  obsBody = b;
  var opts = { attributes: true, attributeFilter: ['style', 'class'] };
  if (h) zoomObs.observe(h, opts);
  if (b) zoomObs.observe(b, opts);
}

function ensureMounted() {
  watchZoom();
  if (host.isConnected) return;
  var parent = d.body || d.documentElement;
  if (parent) {
    parent.appendChild(host);
    placeNow();
    // A bundle that swaps the root keeps the reviewer on a loader for a while;
    // give the hint its full time once the page is back.
    if (hintEl) armHint();
  }
}
ensureMounted();
d.addEventListener('DOMContentLoaded', ensureMounted);
w.addEventListener('load', ensureMounted);
if (w.MutationObserver) new MutationObserver(ensureMounted).observe(d, { childList: true, subtree: true });

// Auto-open once after a 401 reload, then rewrite the draft without the flag.
// After mounting, so the focus in openPanel lands. No hint over an open panel.
if (draft && draft.resume === true) {
  saveDraft();
  openPanel();
} else {
  showHint();
}
`;

/**
 * Returns one inline `<script>` that mounts the preview feedback widget.
 * `slug` is embedded only through escaped JSON, never concatenated into code.
 */
export function renderFeedbackWidget(opts: { slug: string }): string {
  const consts = [
    ['C', { slug: opts.slug, endpoint: '/api/preview/' + opts.slug + '/feedback' }],
    ['L', { name: FEEDBACK_LIMITS.name, message: FEEDBACK_LIMITS.message, page: FEEDBACK_LIMITS.page }],
    ['K', FEEDBACK_KINDS.map((k) => [k, FEEDBACK_KIND_LABEL[k]])],
    ['M', MSG],
    ['CSS', CSS],
    ['MARKUP', MARKUP],
    ['HOST_STYLE', HOST_STYLE],
    ['HOST_STYLE_VV', HOST_STYLE_VV],
  ] as const;
  const decl = 'var ' + consts.map(([n, v]) => n + ' = ' + jsonForScript(v)).join(',\n  ') + ';';
  return '<script>(function(){\n' + decl + '\n' + SOURCE.trim() + '\n})();</script>';
}
