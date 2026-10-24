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
.drop {
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin: 0 0 14px; padding: 6px;
  border: 1px dashed rgba(255,255,255,0.28); border-radius: 9px;
}
.drop .btn, .shot .btn {
  flex: 0 0 auto; padding: 0 12px; font-size: 14px; color: #f2efe8;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14);
}
.tip, .meta { font-size: 12px; line-height: 1.35; color: rgba(242,239,232,0.62); }
/* One line always: beside the button when it fits, else whole on the next row. */
.tip { white-space: nowrap; padding: 0 2px; }
.shot { display: flex; align-items: center; gap: 12px; margin: 0 0 14px; }
.tb {
  flex: 0 0 72px; width: 72px; height: 72px; overflow: hidden;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.14); border-radius: 8px;
}
.tb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.meta { flex: 1 1 auto; min-width: 0; }
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
@media (max-height: 640px) {
  .panel { max-height: calc(var(--hv-vh, 100dvh) - 64px); }
  .body { padding-top: 14px; }
  .page, .field, .kinds, .drop, .shot { margin-bottom: 10px; }
  label, .lbl { margin-bottom: 4px; }
  textarea.field { height: 76px; min-height: 64px; }
  .actions { padding: 10px 20px 12px; }
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
  '<div class="lbl">Screenshot (optional)</div>',
  '<div class="drop"><button type="button" class="btn attach">Attach image</button>',
  '<span class="tip"></span><input type="file" accept="image/*" tabindex="-1" hidden></div>',
  '<div class="shot" hidden><span class="tb"><img alt="Screenshot preview" width="72" height="72" hidden></span>',
  '<span class="meta"></span><button type="button" class="btn rm">Remove</button></div>',
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
  processing: 'Processing screenshot…',
  notImage: "That file isn't an image. Attach a PNG or JPG.",
  unreadable: "Couldn't read that image. Try a PNG or JPG.",
  tooLarge: 'That screenshot is too large. Try capturing a smaller area.',
  // S10(g): the text draft was written but the image draft was not.
  imgUnsaved: "Your note is saved, but the screenshot isn't — attach it again after you sign back in.",
  expiredImgUnsaved:
    "Your session has expired. Reload the page and enter the password again. Your note is saved, but the screenshot isn't — attach it again after you sign back in.",
  // S13, one line in the drop area. Phones get none.
  tipWin: 'Win+Shift+S, then Ctrl+V',
  tipMac: 'Cmd+Ctrl+Shift+4, then Cmd+V',
};

const SOURCE = String.raw`
var w = window, d = document;
if (w.__hvPreviewFeedback) return;
w.__hvPreviewFeedback = true;
var framed = true;
try { framed = w.top !== w; } catch (e) { framed = true; }
if (framed) return;

var DRAFT_KEY = 'hv_pv_fb_draft:' + C.slug, NAME_KEY = 'hv_pv_feedback_name', TIMEOUT_MS = 20000;
var IMG_KEY = 'hv_pv_fb_draft_img:' + C.slug, JPEG = 'data:image/jpeg;base64,';
// S2: long edge 1600, JPEG q0.82, once more at q0.6 over 1.5 MB (1572864 bytes).
// S10(f): an image draft is restored only under 2.2 MB of data URL.
var EDGE = 1600, MAX_BYTES = 1572864, IMG_DRAFT_MAX = 2306867;
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
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
var dropEl = $('.drop'), attachBtn = $('.attach'), tipEl = $('.tip'), fileIn = $('input[type="file"]');
var shotEl = $('.shot'), thumb = $('.tb img'), metaEl = $('.meta'), rmBtn = $('.rm'), sendBtn = $('.send');
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
// Screenshot state (S2/S10). attachGen bumps on every selection (paste, drop,
// pick) and on Remove; a compression that settles for an older generation is
// dropped. image = { blob, src, own } (own: src is an object URL to revoke).
// sid = the note's submissionId (S7): made when a draft starts, kept in the
// draft, reused by every retry, cleared by a 201.
var sid = null, attachGen = 0, processing = false, image = null, imgSaved = false, notice = '';
function newId() {
  var c = w.crypto, h = '', i, u;
  if (c && typeof c.randomUUID === 'function') {
    try { u = String(c.randomUUID()).toLowerCase(); if (UUID_RE.test(u)) return u; } catch (e) {}
  }
  // RFC 4122 v4 from Math.random: version nibble 4, variant 8/9/a/b.
  for (i = 0; i < 32; i++) h += Math.floor(Math.random() * 16).toString(16);
  h = h.slice(0, 12) + '4' + h.slice(13, 16) + '89ab'.charAt(Math.floor(Math.random() * 4)) + h.slice(17);
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
}
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
  dot.hidden = !fMsg.value && !image;
}
function say(t) { statusEl.textContent = t; }
function ssDel(k) { try { w.sessionStorage.removeItem(k); } catch (e) {} }
// S10(a): a draft exists while the message is non-empty or an image is
// attached. It owns the page it started on and the submissionId.
function startDraft() {
  if (draftPage === null) draftPage = currentPage();
  if (!sid) sid = newId();
}
// resume = auto-open the panel on the next load (set only at a 401, so the
// reviewer sees the note on the page they re-enter the password on).
function saveDraft(resume) {
  var o = { id: sid, name: fName.value, page: draftPage, kind: kindVal(), message: fMsg.value, hasImage: !!image };
  if (resume) o.resume = true;
  try {
    w.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(o));
    draftSaved = true;
  } catch (e) { draftSaved = false; }
}
function dropDraft() {
  draftPage = null;
  draftSaved = false;
  sid = null;
  ssDel(DRAFT_KEY);
  ssDel(IMG_KEY);
}
function onInput() {
  if (sending) return;
  if (fMsg.value || image) { startDraft(); saveDraft(); }
  else if (!processing) dropDraft();
  refresh();
}
form.addEventListener('input', onInput);
form.addEventListener('change', onInput);

function mkSrc(blob) {
  try { return w.URL.createObjectURL(blob); } catch (e) { return ''; }
}
function clearImage() {
  if (image && image.own) { try { w.URL.revokeObjectURL(image.src); } catch (e) {} }
  image = null;
}
function render() {
  var has = !!image;
  shotEl.hidden = !processing && !has;
  dropEl.hidden = processing || has;
  if (has && image.src) { thumb.setAttribute('src', image.src); thumb.hidden = false; }
  else { thumb.removeAttribute('src'); thumb.hidden = true; }
  var n = has ? image.blob.size : 0;
  metaEl.textContent = processing ? M.processing
    : has ? (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB') : '';
  sendBtn.disabled = processing;
  sendBtn.textContent = processing ? M.processing : 'Send';
  refresh();
}
// S10(b): the old image key goes FIRST, so a failed write can never leave the
// previous screenshot to be restored with this note. The new one is written as
// a data URL once read; imgSaved records whether that write landed (S10g).
function storeImage(gen) {
  var img = image, R = w.FileReader, r;
  ssDel(IMG_KEY);
  imgSaved = false;
  if (!R) return;
  r = new R();
  r.onload = function () {
    var u = String(r.result || '');
    if (gen !== attachGen || image !== img || u.indexOf(JPEG) !== 0 || u.length >= IMG_DRAFT_MAX) return;
    try {
      w.sessionStorage.setItem(IMG_KEY, JSON.stringify({ id: sid, dataUrl: u }));
      imgSaved = true;
    } catch (e) {}
  };
  try { r.readAsDataURL(img.blob); } catch (e) {}
}
// S10(f): only an image saved under this draft's id, as a JPEG data URL under 2.2 MB.
function restoreImage() {
  try {
    var io = JSON.parse(w.sessionStorage.getItem(IMG_KEY));
    var u = io && io.id === sid && typeof io.dataUrl === 'string' ? io.dataUrl : '';
    if (u.indexOf(JPEG) !== 0 || u.length >= IMG_DRAFT_MAX) return null;
    var s = w.atob(u.slice(JPEG.length)), a = new Uint8Array(s.length), i;
    for (i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    if (!a.length) return null;
    var b = new w.Blob([a], { type: 'image/jpeg' }), src = mkSrc(b);
    return { blob: b, src: src || u, own: !!src };
  } catch (e) { return null; }
}

// S2 compression. Tests (jsdom has no canvas) swap it through
// window.__hvPfbCompress, looked up at call time; production never sets it.
// Resolves to a JPEG Blob or rejects with an Error whose hvMsg is user-facing.
function userErr(m) { var e = new Error(m); e.hvMsg = m; return e; }
function decode(file) {
  function viaImg() {
    return new Promise(function (res, rej) {
      var U = w.URL, url = U.createObjectURL(file), img = d.createElement('img');
      function free() { try { U.revokeObjectURL(url); } catch (e) {} }
      img.onload = function () { res({ src: img, w: img.naturalWidth, h: img.naturalHeight, free: free }); };
      img.onerror = function () { free(); rej(userErr(M.unreadable)); };
      img.src = url;
    });
  }
  if (!w.createImageBitmap) return viaImg();
  return w.createImageBitmap(file).then(function (bm) {
    return { src: bm, w: bm.width, h: bm.height, free: function () { if (bm.close) bm.close(); } };
  }, viaImg);
}
function jpegOf(c, q) {
  return new Promise(function (res, rej) {
    c.toBlob(function (b) { if (b && b.size) res(b); else rej(userErr(M.unreadable)); }, 'image/jpeg', q);
  });
}
function compress(file) {
  return decode(file).then(function (im) {
    var c = d.createElement('canvas'), g, k;
    try {
      if (!(im.w > 0 && im.h > 0)) throw userErr(M.unreadable);
      k = Math.min(1, EDGE / Math.max(im.w, im.h));
      c.width = Math.max(1, Math.round(im.w * k));
      c.height = Math.max(1, Math.round(im.h * k));
      g = c.getContext('2d');
      // JPEG has no alpha: transparent areas become white, not black.
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      g.imageSmoothingQuality = 'high';
      g.drawImage(im.src, 0, 0, c.width, c.height);
    } finally { im.free(); }
    return jpegOf(c, 0.82).then(function (b) {
      return b.size <= MAX_BYTES ? b : jpegOf(c, 0.6).then(function (b2) {
        if (b2.size <= MAX_BYTES) return b2;
        throw userErr(M.tooLarge);
      });
    });
  });
}
// Every source (paste, drop, file pick) comes through here; nothing is taken
// while sending. Send stays locked while processing.
function pick(f) {
  if (sending || !f) return;
  if (!/^image\//.test(String(f.type || ''))) { say(M.notImage); return; }
  var gen = ++attachGen, fn = w.__hvPfbCompress || compress, p;
  processing = true;
  startDraft();
  say('');
  render();
  if (root.activeElement === attachBtn) rmBtn.focus();
  try { p = Promise.resolve(fn(f)); } catch (e) { p = Promise.reject(e); }
  p.then(function (b) { settled(gen, b, null); }, function (e) { settled(gen, null, e || 1); });
}
function settled(gen, blob, err) {
  if (gen !== attachGen) return;
  processing = false;
  if (!err && blob && blob.size) {
    clearImage();
    var src = mkSrc(blob);
    image = { blob: blob, src: src, own: !!src };
    storeImage(gen);
    saveDraft();
  } else {
    say(err && err.hvMsg ? err.hvMsg : M.unreadable);
    if (!fMsg.value && !image) dropDraft();
  }
  render();
}
function firstImage(dt) {
  var i, it, f, list = dt && dt.items;
  if (list) {
    for (i = 0; i < list.length; i++) {
      it = list[i];
      if (it && it.kind === 'file' && /^image\//.test(it.type || '')) { f = it.getAsFile(); if (f) return f; }
    }
  }
  list = dt && dt.files;
  if (list) for (i = 0; i < list.length; i++) if (/^image\//.test(list[i].type || '')) return list[i];
  return null;
}
function hasFiles(dt) {
  var t = dt && dt.types, i;
  if (t) for (i = 0; i < t.length; i++) if (t[i] === 'Files') return true;
  return false;
}
attachBtn.addEventListener('click', function () { if (!sending) fileIn.click(); });
fileIn.addEventListener('change', function () {
  var f = fileIn.files && fileIn.files[0];
  try { fileIn.value = ''; } catch (e) {}
  pick(f);
});
rmBtn.addEventListener('click', function () {
  if (sending) return;
  attachGen++;
  processing = false;
  clearImage();
  imgSaved = false;
  ssDel(IMG_KEY);
  if (fMsg.value) saveDraft(); else dropDraft();
  say('');
  render();
  attachBtn.focus();
});
// Text pastes keep their default; only an image item is taken. Like keys,
// pastes and drops inside the panel never reach the export's own handlers.
root.addEventListener('paste', function (e) {
  isolate(e);
  if (panel.hidden) return;
  var f = firstImage(e.clipboardData);
  if (!f) return;
  e.preventDefault();
  pick(f);
});
panel.addEventListener('dragover', function (e) {
  isolate(e);
  if (!hasFiles(e.dataTransfer)) return;
  e.preventDefault();
  try { e.dataTransfer.dropEffect = 'copy'; } catch (x) {}
});
// A file drop is always swallowed (even mid-send) so the browser never
// navigates away to the dropped file.
panel.addEventListener('drop', function (e) {
  isolate(e);
  var dt = e.dataTransfer, f;
  if (!hasFiles(dt)) return;
  e.preventDefault();
  if (sending) return;
  f = firstImage(dt);
  if (f) pick(f); else say(M.notImage);
});
// S13: the snip-to-clipboard shortcut, desktop only (an iPad reports a Mac UA
// with touch points).
var nav = w.navigator || {}, ua = String(nav.userAgent || ''), touch = Number(nav.maxTouchPoints) || 0;
tipEl.textContent = /Android|iPhone|iPad|iPod|Mobile/.test(ua) ? ''
  : /Windows/.test(ua) ? M.tipWin : /Macintosh/.test(ua) && touch <= 1 ? M.tipMac : '';
tipEl.hidden = !tipEl.textContent;

var savedName = '', draft = null;
try { savedName = w.localStorage.getItem(NAME_KEY) || ''; } catch (e) {}
try {
  var raw = w.sessionStorage.getItem(DRAFT_KEY);
  if (raw !== null) {
    var o = null;
    try { o = JSON.parse(raw); } catch (e) {}
    if (o && typeof o === 'object' && typeof o.message === 'string' && (o.message || o.hasImage === true)) draft = o;
    else w.sessionStorage.removeItem(DRAFT_KEY);
  }
} catch (e) {}
if (draft) {
  fName.value = (typeof draft.name === 'string' && draft.name ? draft.name : savedName).slice(0, L.name);
  fMsg.value = draft.message.slice(0, L.message);
  if (typeof draft.kind === 'string') setKind(draft.kind);
  draftPage = typeof draft.page === 'string' && draft.page ? draft.page.slice(0, L.page) : currentPage();
  // An old-shape draft (no id) gets a fresh one.
  sid = typeof draft.id === 'string' && UUID_RE.test(draft.id.toLowerCase()) ? draft.id.toLowerCase() : newId();
  if (draft.hasImage === true) {
    image = restoreImage();
    if (image) imgSaved = true;
    else notice = M.imgUnsaved;
  }
  draftSaved = true;
} else {
  fName.value = savedName.slice(0, L.name);
}
if (!image) ssDel(IMG_KEY);
if (draft && !fMsg.value && !image) { dropDraft(); draft = null; notice = ''; }
render();

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
  // notice: a screenshot lost on reload (S10g), shown once.
  if (!sending) { say(notice); notice = ''; }
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
    attachGen++;
    clearImage();
    imgSaved = false;
    dropDraft();
    say(M.sent);
  } else if (s === 401) {
    if (draftSaved) saveDraft(true);
    say(!draftSaved ? M.expiredUnsaved : image && !imgSaved ? M.expiredImgUnsaved : M.expiredSaved);
  } else if (s === 429) {
    var h = res.headers && res.headers.get ? res.headers.get('Retry-After') : null;
    var secs = h === null || h === '' ? NaN : Number(h);
    var n = secs >= 0 ? Math.max(1, Math.ceil(secs / 60)) : 10;
    say(M.rateLimited + n + (n === 1 ? ' minute.' : ' minutes.'));
  } else {
    say(M.failed);
  }
  render();
  // Disabling the fieldset blurred Send; put focus back so Esc keeps working,
  // unless the reviewer has since moved focus somewhere else on the page.
  var a = d.activeElement;
  if (!panel.hidden && (!a || a === d.body || a === host)) fMsg.focus();
}
form.addEventListener('submit', function (e) {
  e.preventDefault();
  if (sending || processing) return;
  var name = fName.value.trim(), kind = kindVal(), message = fMsg.value;
  if (!name || !kind || !message.trim()) { say(M.incomplete); return; }
  startDraft();
  var body = JSON.stringify({
    name: name, kind: kind, message: message, page: draftPage || currentPage(),
    viewportW: w.innerWidth, viewportH: w.innerHeight, submissionId: sid
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
  // S3: with an image, exactly two multipart fields; the browser sets the
  // boundary, so no Content-Type here.
  var init = { method: 'POST', credentials: 'same-origin', body: body };
  if (image) {
    var fd = new w.FormData();
    fd.append('payload', body);
    fd.append('image', image.blob, 'screenshot.jpg');
    init.body = fd;
  } else {
    init.headers = { 'Content-Type': 'application/json' };
  }
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
  // Rewritten so a fresh id / a dropped image is reflected in storage.
  if (draft) saveDraft();
  showHint();
}
`;

// Full-line comments stay in this file but are not shipped inline on every page.
// Safe because SOURCE has no multi-line string literals (it can't: no backticks).
const SHIPPED_SOURCE = SOURCE.trim()
  .split('\n')
  .filter((line) => !/^\s*\/\//.test(line))
  .join('\n');

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
  return '<script>(function(){\n' + decl + '\n' + SHIPPED_SOURCE + '\n})();</script>';
}
