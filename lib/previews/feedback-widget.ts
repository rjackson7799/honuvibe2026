import { FEEDBACK_KIND_LABEL, FEEDBACK_KINDS, FEEDBACK_LIMITS } from './feedback';

// Self-mounting feedback widget injected before </body> of opted-in client
// previews. The output is inlined into third-party HTML exports, so:
// - everything embedded goes through jsonForScript (every "<" escaped, ASCII only),
//   which keeps "</script" and "<!--" out of the script body entirely;
// - the source below is plain ES2019 (no ?. / ?? / class fields / backticks) —
//   it is a string, never transpiled;
// - the UI lives in an open shadow root so the export's CSS can't reach it.
// No 'server-only' here: unit tests evaluate the output in jsdom.

function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

// Inline !important styles on the host: the page's own CSS can target the host
// element (it sits in the light DOM), and only inline-important reliably wins.
const HOST_STYLE = [
  'position:fixed',
  'z-index:2147483647',
  'right:calc(16px + env(safe-area-inset-right, 0px))',
  'bottom:calc(16px + env(safe-area-inset-bottom, 0px))',
  'left:auto',
  'top:auto',
  'display:block',
  'width:auto',
  'height:auto',
  'margin:0',
  'padding:0',
  'border:0',
  'transform:none',
]
  .map((d) => d + ' !important')
  .join(';');

// Neutral "tool chrome" palette, shared with the gate page (gate.ts PAGE_STYLE).
const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
.w {
  color: #f2efe8;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
.launch {
  display: inline-flex; align-items: center; gap: 8px;
  min-height: 44px; padding: 0 18px;
  font: inherit; font-weight: 600; color: #f2efe8;
  background: rgba(12,12,16,0.88);
  border: 1px solid rgba(255,255,255,0.14); border-radius: 999px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.45);
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease;
}
.launch:hover { background: rgba(24,24,30,0.96); border-color: rgba(255,255,255,0.3); }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #f2efe8; }
.panel {
  display: flex; flex-direction: column;
  width: 340px;
  max-height: calc(100vh - 32px);
  max-height: calc(100dvh - 32px);
  background: rgba(12,12,16,0.94);
  border: 1px solid rgba(255,255,255,0.10); border-radius: 14px;
  box-shadow: 0 30px 80px rgba(0,0,0,0.55);
  backdrop-filter: blur(18px) saturate(120%);
  -webkit-backdrop-filter: blur(18px) saturate(120%);
  overflow: hidden;
}
@media (max-width: 479px) { .panel { width: calc(100vw - 32px); } }
form, fieldset { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; min-width: 0; margin: 0; padding: 0; border: 0; }
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
.launch:focus-visible, .btn:focus-visible, .field:focus-visible, .kind input:focus-visible {
  outline: 2px solid #f2efe8; outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .launch, .field, .kind, .btn { transition: none; }
}
`.trim();

// Static skeleton only — every dynamic value is set via textContent / value.
const MARKUP = [
  '<div class="w">',
  '<button type="button" class="launch" aria-haspopup="dialog" aria-expanded="false">',
  '<span class="dot" aria-hidden="true" hidden></span>Feedback</button>',
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
  sending: 'Sending…',
  sent: 'Thanks — your note was sent.',
  expiredSaved:
    'Your session has expired. Reload the page and enter the password again. Your note is saved and will be here when you come back.',
  expiredUnsaved:
    'Your session has expired. Copy your note somewhere safe, then reload the page and enter the password again.',
  rateLimited: 'Too many notes in a short time. Try again in about ',
  failed: "Couldn't send. Please try again.",
  incomplete: 'Add your name, pick a type and write a note.',
};

const SOURCE = String.raw`
var w = window, d = document;
if (w.__hvPreviewFeedback) return;
w.__hvPreviewFeedback = true;
var framed = true;
try { framed = w.top !== w; } catch (e) { framed = true; }
if (framed) return;

var DRAFT_KEY = 'hv_pv_fb_draft:' + C.slug, NAME_KEY = 'hv_pv_feedback_name';
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
function saveDraft() {
  try {
    w.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ name: fName.value, page: draftPage, kind: kindVal(), message: fMsg.value }));
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

function openPanel() {
  if (!sending) say('');
  panel.hidden = false;
  launch.hidden = true;
  launch.setAttribute('aria-expanded', 'true');
  refresh();
  (fName.value ? fMsg : fName).focus();
}
function closePanel() {
  panel.hidden = true;
  launch.hidden = false;
  launch.setAttribute('aria-expanded', 'false');
  launch.focus();
}
launch.addEventListener('click', openPanel);
$('.cancel').addEventListener('click', closePanel);
root.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); closePanel(); }
});

function finish(res) {
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
  var req;
  try {
    req = w.fetch(C.endpoint, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: body
    });
  } catch (err) { req = Promise.reject(err); }
  Promise.resolve(req).then(finish, function () { finish(null); });
});

function ensureMounted() {
  if (host.isConnected) return;
  var parent = d.body || d.documentElement;
  if (parent) parent.appendChild(host);
}
ensureMounted();
d.addEventListener('DOMContentLoaded', ensureMounted);
w.addEventListener('load', ensureMounted);
if (w.MutationObserver) new MutationObserver(ensureMounted).observe(d, { childList: true, subtree: true });
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
  ] as const;
  const decl = 'var ' + consts.map(([n, v]) => n + ' = ' + jsonForScript(v)).join(',\n  ') + ';';
  return '<script>(function(){\n' + decl + '\n' + SOURCE.trim() + '\n})();</script>';
}
