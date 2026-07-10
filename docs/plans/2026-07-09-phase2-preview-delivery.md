# Phase 2 — Preview Delivery (dual mode) + Reusable Skill

> Unit 2 of 4 from the approved master plan
> `docs/plans/2026-07-08-studio-lead-engine-master.md`. Self-contained: this doc
> is everything the execution session needs. Phase 1 (writable leads + workspace)
> shipped 2026-07-08 (`2f143e5`); migration 056 is applied to prod.

## Context

Ryan's preview flow today: export an HTML mockup from claude.ai/design → drop it
under `public/previews/<Client>-preview-<10hex>/` → send the unguessable link.
That works (Hawaii Palms, RUNS) but is **not** password protected — just obscurity
plus a `X-Robots-Tag: noindex` header. This phase (1) codifies that quick mode into
a reusable skill, and (2) adds an optional **real password gate**: exports uploaded
to a private Supabase Storage bucket, served through a streaming gate route behind
an HMAC cookie. The lead workspace shipped in Phase 1 already has the
`preview_url` / `preview_password` fields where either mode's link lands — no
admin UI changes in this phase.

## Decisions defaulted for Ryan's review (say the word and I'll re-plan)

1. **Skill-only management — no admin panel for `client_previews`.** Rows are
   created by the upload script (service-role, from the skill); the Phase 1 lead
   workspace is the only admin surface. A management panel is a later add if this
   gets annoying.
2. **Both modes ship in the skill; the net-new code is gated-only.** Quick mode
   is codified as instructions (no code change needed — the noindex header already
   exists in `next.config.ts`).
3. **Committed upload script** at `scripts/upload-preview.mjs` (invoked by the
   skill). Uploads go direct to Storage with the service-role key — never through
   a route (request-body caps; exports are 7–8 MB).
4. **The gate cookie HMAC covers slug + password**, so changing a preview's
   password (or `PREVIEW_GATE_SECRET`) invalidates already-issued cookies — and
   because every gate response is `Cache-Control: private, no-store`, revocation
   is immediate (no stale cached assets; re-download cost accepted for mockups).
5. **The password/404/410 pages are self-contained HTML strings with inline
   hardcoded colors** — a deliberate, sanctioned exception to the "CSS variables
   only" rule: these are raw API responses with no access to the app's stylesheet.
   Keep them tiny, dark-neutral, and `noindex`.

## Ground truth (verified 2026-07-09)

- Highest migration is `056_studio_lead_workspace.sql` → this phase is **057**
  (re-check dir at build time; numbering has collided before at 022/025).
- The middleware matcher (`middleware.ts:254`) **excludes `/api`**, so a gate
  route under `app/api/preview/…` bypasses next-intl/auth middleware entirely —
  anonymous clients can reach it. No middleware change needed.
- `next.config.ts:74-85` already sets `X-Robots-Tag: noindex, nofollow` on
  `/previews/:path*` — quick mode's header protection. Do not touch.
- Existing quick previews on disk: `public/previews/HawaiiPalms-landing-preview-74506e6434/`,
  `public/previews/RUNS-app-preview-4a82a2458d/` — regression-check they still serve.
- Rate limiting: `lib/community/rate-limit.ts` exports
  `tryConsume(key: string, limit: number, windowMs: number): boolean` (in-memory,
  per-instance — acceptable, same as community).
- Crypto pattern to copy: `lib/discover/session.ts` (`createHmac`/`createHash` +
  `timingSafeEqual` from `node:crypto`, hex buffers, length check before compare).
- Storage: private-bucket creation + admin-only `storage.objects` policies pattern
  in `supabase/migrations/047_discovery_engine.sql:232-260`. Service-role download
  returns a `Blob` (`app/api/tutoring/generate/route.ts:34`); stream it via
  `new Response(blob.stream())` — **Vercel caps buffered route responses at
  ~4.5 MB and exports run 7–8 MB, so streaming is mandatory.**
- `@supabase/supabase-js` is a direct dependency; `scripts/` already holds `.mjs`
  utilities (`seed-glossary.mjs`); `node --env-file=…` is house style
  (`package.json` `test:rls`).
- Global skills live at `C:\Users\HCI\.claude\skills\` (beside
  `client-landing-page`, `studio-client-engagement`) with `name` +
  `description: "Use when…"` frontmatter. The skill is **not part of the repo
  commit** — it's a deliverable on disk.
- supabase-js cannot do an atomic `count = count + 1` — the access counter needs
  a tiny SQL function called via `.rpc()` (in the migration).

## Changes

### 1. Migration `supabase/migrations/057_client_previews.sql`

```sql
BEGIN;

-- One row per delivered preview. `mode='public'` rows exist only if we later
-- want quick previews registered too; the gate route serves them without a
-- password. Gated rows require one.
CREATE TABLE IF NOT EXISTS client_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{8,80}$'),
  title text,
  mode text NOT NULL DEFAULT 'gated' CHECK (mode IN ('public','gated')),
  -- Plaintext by design: low-stakes mockups, admin must re-send it to the
  -- client. One-function swap to a hash later (passwordMatches in gate.ts).
  password text,
  storage_prefix text NOT NULL,          -- object prefix inside the bucket (= slug)
  -- Basename only (no slashes): the redirect + access-count logic assume a
  -- depth-1 entry. Nested entries (dist/index.html) are out of scope.
  entry_file text NOT NULL DEFAULT 'index.html'
    CHECK (entry_file ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$'),
  expires_at timestamptz,
  access_count int NOT NULL DEFAULT 0,
  last_accessed_at timestamptz,
  CONSTRAINT client_previews_gated_needs_password
    CHECK (mode <> 'gated' OR password IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_client_previews_lead ON client_previews(lead_id);

ALTER TABLE client_previews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_previews_admin_all" ON client_previews;
CREATE POLICY "client_previews_admin_all" ON client_previews
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
-- No anon/member policy: the gate route reads via service role only.

-- Atomic access-count bump for the gate route (supabase-js can't increment).
-- Hardened per the 048/049 RPC pattern: empty search_path + fully qualified
-- refs, REVOKE ALL then explicit GRANT to service_role (the only caller).
CREATE OR REPLACE FUNCTION public.bump_preview_access(p_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.client_previews
  SET access_count = access_count + 1, last_accessed_at = now()
  WHERE slug = p_slug;
$$;
REVOKE ALL ON FUNCTION public.bump_preview_access(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_preview_access(text) TO service_role;

-- Private bucket. No SELECT policy = no client reads; service role streams.
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-previews', 'client-previews', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "client_previews_admin_write" ON storage.objects;
CREATE POLICY "client_previews_admin_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'client-previews' AND public.is_admin());
DROP POLICY IF EXISTS "client_previews_admin_update" ON storage.objects;
CREATE POLICY "client_previews_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'client-previews' AND public.is_admin())
  WITH CHECK (bucket_id = 'client-previews' AND public.is_admin());
DROP POLICY IF EXISTS "client_previews_admin_delete" ON storage.objects;
CREATE POLICY "client_previews_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'client-previews' AND public.is_admin());

COMMIT;
```

Header comment per house style (see 047/056), including the PROD NOTE about
manual application on `zvfwtndbxshrtpwcwynw`.

### 2. Gate helpers — new `lib/previews/gate.ts` (+ unit tests)

Pure, testable helpers; the only importer is the gate route. Copy the crypto
idioms from `lib/discover/session.ts`. Do NOT add `'use server'` or
`server-only` (vitest imports it directly).

```ts
import { createHmac, createHash, timingSafeEqual } from 'crypto';

export const PREVIEW_COOKIE_PREFIX = 'hv_pv_';
export function cookieNameFor(slug: string): string;        // `hv_pv_${slug}`

// HMAC-SHA256(`${slug}\n${password ?? ''}`) with PREVIEW_GATE_SECRET, hex.
// Including the password means rotating it revokes outstanding cookies.
export function signGate(slug: string, password: string | null): string;
export function verifyGate(slug: string, password: string | null, cookieValue: string): boolean; // timing-safe

// sha256 both sides then timingSafeEqual (no length leak on plaintext compare).
export function passwordMatches(input: string, stored: string): boolean;

export function contentTypeFor(filename: string): string;
// extension map: html, css, js/mjs, json, png, jpg/jpeg, gif, svg, webp, avif,
// ico, woff, woff2, ttf, otf, mp4, webm, txt, map, pdf → default application/octet-stream

export function escapeHtml(value: string): string;
// & < > " ' → entities. EVERY dynamic value interpolated into the pages below
// (title, error, message, slug) goes through this — title is admin-set DB data.

// Self-contained HTML (inline CSS, <meta name="robots" content="noindex,nofollow">,
// dark-neutral). Form posts to /api/preview/<slug> with a single `password` field
// (input font-size ≥16px per house mobile rule).
export function renderPasswordPage(opts: { slug: string; title?: string | null; error?: string }): string;
export function renderMessagePage(title: string, message: string): string;   // 404/410 bodies

// Shared response headers for the generated (non-streamed) HTML pages ONLY —
// never applied to streamed exports, whose inline scripts/styles a CSP would break:
//   Content-Type: text/html; charset=utf-8
//   Cache-Control: no-store
//   X-Robots-Tag: noindex, nofollow
//   Referrer-Policy: no-referrer
//   Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'
export function htmlPageHeaders(): HeadersInit;
```

All sign/verify functions throw if `PREVIEW_GATE_SECRET` is unset — the route
checks presence first and 503s, so a throw is a programming error, not a user path.

**Tests — new `lib/previews/gate.test.ts`** (vitest, house style beside the
module; set `process.env.PREVIEW_GATE_SECRET` in `beforeEach`):
sign/verify roundtrip; verify rejects wrong slug, wrong password, tampered/truncated
hex, and unset-secret throw; `passwordMatches` true/false incl. unicode;
`contentTypeFor` known extensions + fallback; `escapeHtml` covers `& < > " '`;
password page contains noindex meta, posts to `/api/preview/<slug>`, and
**escapes a hostile title/error** (`<script>` arrives entity-encoded); message
page escapes its inputs likewise.

### 3. Gate route — new `app/api/preview/[slug]/[[...path]]/route.ts`

Anonymous, service-role, streaming. `params: Promise<{ slug: string; path?: string[] }>`.
`export const runtime = 'nodejs'` (house precedent: the PDF routes; guards the
`node:crypto` dependency against a future accidental edge conversion).
Constants: `BUCKET = 'client-previews'`, `SLUG_RE = /^[a-z0-9-]{8,80}$/`.
Every response carries `X-Robots-Tag: noindex, nofollow`; every *generated* HTML
response (password/404/410 pages) uses `htmlPageHeaders()`.

**Env handling:** `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` unset →
503 JSON `{error:'Preview gate unavailable'}` **before** `createAdminClient()`
(it uses non-null assertions and would throw a raw 500). `PREVIEW_GATE_SECRET` is
required **only for gated flows** — check it *after* loading the row, so
`mode='public'` rows keep serving even without the secret.

**GET:**
1. `SLUG_RE` fail → 404 `renderMessagePage`. Supabase env unset → 503 JSON.
2. Load row by slug via `createAdminClient()` (`maybeSingle`); miss → 404 page.
   `expires_at` in the past → 410 page ("This preview has expired.").
3. **No path segments → 303 redirect to `/api/preview/<slug>/<entry_file>`.**
   (The document must live at a depth-1 URL so the export's *relative* asset
   references — `./style.css`, `images/hero.jpg` — resolve back into the
   catch-all. Never serve HTML from the bare slug URL.)
4. Path guard (segments arrive percent-decoded from Next, so this also covers
   `%2e%2e`/`%5c`): reject with 404 any segment that is empty, contains `..`,
   `\`, or a NUL (`\0`). With every segment clean, `join('/')` cannot escape
   `storage_prefix` — note this invariant in a comment.
5. `mode === 'gated'`: `PREVIEW_GATE_SECRET` unset → 503 JSON. Then read cookie
   `cookieNameFor(slug)`; missing or `!verifyGate(slug, row.password, value)` →
   **401 with `renderPasswordPage`**. `mode === 'public'` skips this step.
6. Download `storage_prefix + '/' + path.join('/')` from the bucket; miss → 404
   page. Respond `new Response(blob.stream())` with `contentTypeFor(filename)`
   and `Cache-Control: private, no-store` — **all** gate-served objects,
   HTML and assets alike, so revoking a cookie (password change) is immediate.
   The re-download cost per visit is acceptable for low-traffic mockups.
7. When the request is exactly the entry file (`path.length === 1 && path[0] === row.entry_file`),
   `await admin.rpc('bump_preview_access', { p_slug: slug })` before returning
   (best-effort: ignore its error, never fail the stream for it).

**HEAD** (explicit export — without one, Next auto-serves HEAD *through GET*,
which would download the blob and falsely bump `access_count`):
run GET steps 1–5 (slug, env, row, expiry, path guard, auth), then return the
status/headers **without** touching Storage and **without** the bump — 200 with
`contentTypeFor(filename)` + noindex for an authorized path, or the same
401/404/410/503 statuses as GET (empty bodies). The `curl -I` verification
exercises this handler.

**POST** (password submit; any path, but the form targets `/api/preview/<slug>`):
1. Same slug/env/row/expiry checks; row missing **or `mode !== 'gated'`** → 404;
   `PREVIEW_GATE_SECRET` unset → 503 JSON (POST is always a gated flow).
2. Rate limit: ip = first entry of `x-forwarded-for` (fallback `'unknown'`);
   `tryConsume(\`preview:${slug}:${ip}\`, 10, 60_000)` false → **429** password
   page with "Too many attempts — try again in a minute."
3. `request.formData()` (catch → null); `password` field must be a string and
   `passwordMatches(password, row.password)` — else **401** password page with
   "Incorrect password."
4. Success → 303 to `/api/preview/<slug>/<entry_file>` and set cookie:
   name `cookieNameFor(slug)`, value `signGate(slug, row.password)`,
   `httpOnly`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`,
   `path: \`/api/preview/${slug}\``, `maxAge: 30 * 24 * 60 * 60`.

No `maxDuration` needed (streaming starts immediately).

**Route tests — new `__tests__/api/preview-gate.test.ts`** (house API-route test
style — mirror the module mocking in `__tests__/api/partnerships-submit.test.ts`;
mock `@/lib/supabase/server` so `createAdminClient` returns a stub with
`.from().select()…maybeSingle()`, `.storage.from().download()`, and `.rpc()` spies).
Cases: Supabase env unset → 503; unknown slug → 404; expired row → 410; bare-slug
GET → 303 to entry; gated GET without cookie → 401 HTML containing the form;
gated GET with valid cookie → 200 streaming + `no-store` + noindex;
`mode='public'` row with `PREVIEW_GATE_SECRET` **unset** → 200 (no 503);
POST wrong password → 401; POST 11th attempt in a minute → 429; POST success →
303 with cookie asserting `httpOnly`/`sameSite=lax`/`path=/api/preview/<slug>`;
traversal segment (`..`) → 404; storage download miss → 404; asset GET does
**not** call `rpc('bump_preview_access')`, entry GET does; HEAD on entry → 200
with headers, **no** `download()` call, **no** rpc call.

### 4. RLS test — new `supabase/tests/client_previews_rls.test.ts`

Mirror the structure/fixtures of `supabase/tests/notifications_rls.test.ts`
(read it + `supabase/tests/helpers/clients.ts` first). Assertions:
- anon client: SELECT on `client_previews` returns zero rows/permission error;
  INSERT rejected.
- authed non-admin member: SELECT returns zero rows; INSERT rejected.
- **admin: can SELECT / INSERT / UPDATE / DELETE** (the policy promises
  admin-all — assert the positive, not just the denials).
- service role: can INSERT (fixture setup) — proving the gate route's read path.
- anon `rpc('bump_preview_access', …)` is rejected (EXECUTE revoked);
  **service-role `rpc('bump_preview_access', …)` succeeds and increments
  `access_count`** (proves the explicit GRANT — a REVOKE-only migration would
  pass every denial test and still break the route).

### 5. Upload script — new `scripts/upload-preview.mjs`

```
Usage: node --env-file=.env.local scripts/upload-preview.mjs <export-dir> <slug> [--entry index.html]
```

- Fails fast with a clear message if `NEXT_PUBLIC_SUPABASE_URL` or
  `SUPABASE_SERVICE_ROLE_KEY` is missing (reminding about `--env-file=.env.local`).
- Validates `slug` against `^[a-z0-9-]{8,80}$` and that `<export-dir>/<entry>` exists.
- Recursively walks `<export-dir>` (`fs/promises` `readdir` with
  `{ recursive: true, withFileTypes: true }`): upload **regular files only** —
  skip directories, skip symlinks (`isSymbolicLink()`), and abort with an error
  if any computed relative path contains `..` or `\` after normalizing separators
  to POSIX (`/`) for the object key.
- Uploads each file to `client-previews/<slug>/<relative-posix-path>` via
  `createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` →
  `.storage.from('client-previews').upload(path, buffer, { contentType, upsert: true })`.
  Content-type map duplicated locally (plain `.mjs`; it cannot import the TS helper).
- Does **not** insert the `client_previews` row (the skill does that via SQL/psql
  or the executor does it manually) — the script's one job is files. Prints an
  upload summary + the object count + the entry URL shape
  `https://honuvibe.ai/api/preview/<slug>` when done; exits non-zero on any failure.

### 6. Reusable skill — new `C:\Users\HCI\.claude\skills\studio-client-preview\SKILL.md`

Frontmatter matching the neighbors:

```yaml
name: studio-client-preview
description: "Use when delivering a client preview of a design mockup or HTML export for HonuVibe Studio — choosing quick (unguessable URL) vs password-gated delivery, uploading gated previews to Supabase Storage, and producing the send-to-client message."
```

Body encodes the full operating procedure:
1. **Prep the export:** verify/inject `<meta name="robots" content="noindex,nofollow">`
   in every `.html`; strip any analytics snippets; confirm asset references are
   *relative* (no leading `/`); confirm the entry file name.
2. **Choose mode.**
   - *Quick:* copy to `public/previews/<Client>-preview-<10hex>/` (10 hex chars via
     `openssl rand -hex 5` or equivalent), commit, deploy. Noindex header comes from
     `next.config.ts`. No DB row.
   - *Gated:* generate slug `<client>-<10hex>` + a memorable 3-word password; run
     `node --env-file=.env.local scripts/upload-preview.mjs <dir> <slug>`; insert the
     `client_previews` row via the SQL template embedded in the skill — an
     **upsert** (`INSERT … ON CONFLICT (slug) DO UPDATE SET title, password,
     entry_file, expires_at, lead_id`) so a re-run of the whole procedure (script
     upserts files, SQL upserts the row) is idempotent rather than colliding on
     the unique slug; URL is `https://honuvibe.ai/api/preview/<slug>`.
3. **Wire the lead:** set `preview_url` (+ `preview_password` for gated) on the
   lead in the Phase 1 workspace (`/admin/studio/leads/<id>`), so the outreach
   generator picks them up.
4. **Send template:** short client-facing message with link + password + expiry
   note, EN with an optional JA variant.

Also add one cross-reference line in
`C:\Users\HCI\.claude\skills\studio-client-engagement\SKILL.md` pointing preview
delivery at this skill (its current guidance delegates to `client-landing-page`,
which prescribes a heavier full-site lockdown). Neither skill file is part of the
repo commit — note both paths in the completion report. Heads-up for the
executor: these paths are outside the repo working directory, so a sandboxed
session may need filesystem approval to write them — expected, not an error.

### Out of scope (later phases / later polish)

`lead_audits` + audit panel (Phase 3), `prospects` (Phase 4), an admin
`client_previews` management panel, a preview picker in the lead form, surfacing
`access_count` on the lead card ("client viewed 3×" — flywheel item 3), emailing
the link via Resend, hashing the password. Do not build any of these.

## Env vars

`PREVIEW_GATE_SECRET` — new; 32+ random bytes (`openssl rand -hex 32`). Add to
`.env.local` and Vercel (all environments). Route 503s without it, per convention.

## Suggested commit message

```
feat(studio): password-gated client previews — storage gate route + skill (phase 2)
```

## Verification

- [x] `pnpm verify` clean (type-check → tests → build) — 59 test files pass, build compiled clean, `/api/preview/[slug]/[[...path]]` builds as a dynamic fn. (Needed a `.next` clean: a stale incremental type-check cache reported a phantom `createClient` error from the pre-refactor tutoring doc route; cache-free `tsc` and the clean rebuild are both green.)
- [x] `pnpm test:rls` clean incl. new `client_previews_rls.test.ts` — 94 tests / 10 files pass (8 in client_previews, incl. the service-role RPC increment). Temp-renamed dup 022/025 for the reset, then restored (not committed).
- [x] New unit tests `lib/previews/gate.test.ts` (18) + route tests `__tests__/api/preview-gate.test.ts` (19) pass inside the `app` project
- [x] Applied 057 locally (`supabase db reset` → "Applying migration 057…"); uploaded the real Hawaii Palms export (8.15 MB entry `Overview.html`, 9 objects) via `scripts/upload-preview.mjs` to the local bucket; inserted a gated row
- [x] `GET /api/preview/<slug>` → 303 → password form with noindex meta (verified via curl). Browser check of mobile 375px / zero console errors deferred to Ryan.
- [x] Wrong password → 401 form with "Incorrect password."; 11th wrong attempt within a minute → 429 (live sequence: 10×401 then 429)
- [x] Right password → 303 → entry streamed 200 (8.15 MB) and a sibling asset (`hero_bg.png`, image/png) streamed 200 — relative paths resolve; the same cookie served entry + asset + HEAD across requests. Browser visual render deferred to Ryan.
- [x] `curl -I …/Overview.html` shows `X-Robots-Tag: noindex, nofollow` **and does not bump `access_count`** (HEAD authed verified live; unauthed HEAD noindex covered by unit test — the explicit HEAD handler does no storage download)
- [x] Entry GETs bump `access_count` / `last_accessed_at`; asset GETs and HEADs do not (live: `access_count=1` after 1 entry GET + 1 asset GET + 1 HEAD)
- [x] Unknown slug → 404 (live); past `expires_at` → 410 (live); `PREVIEW_GATE_SECRET` unset → 503 on gated GET **and** POST (unit tests); Supabase env unset → 503 JSON, not a thrown 500 (unit test)
- [x] `mode='public'` row streams with no password prompt — including with `PREVIEW_GATE_SECRET` unset (unit test)
- [x] Path traversal `GET …/../secrets.txt` → 404 with no storage read (live + unit test; encoded `%2e%2e` decodes to `..` and is caught by the same guard)
- [x] Changing the row's password invalidates a previously-issued cookie (live: old cookie → 401 after password change; HMAC binds slug+password)
- [x] Regression: `curl -I /previews/HawaiiPalms-landing-preview-74506e6434/Overview.html` still serves 200 with the noindex header (quick mode untouched). `middleware.ts` + `next.config.ts` are untouched by the diff, so main site + `/ja` are unchanged by construction and every route compiled in the clean build; live `/ja` browser smoke deferred to Ryan.
- [x] Skill file exists at `C:\Users\HCI\.claude\skills\studio-client-preview\SKILL.md`; `studio-client-engagement` cross-reference added
- [x] Stage only intentional repo files (skill files are outside the repo; SmashHaus + other working-tree files stay unstaged)

> Post-review addition (beyond the plan, flagged for Ryan): the automated security
> review flagged that the per-IP rate-limit key trusts a spoofable `x-forwarded-for`.
> Kept the plan's per-IP bucket (codebase convention) and *added* a per-slug global
> backstop `tryConsume('preview:slug:<slug>', 100, 1h)` so total wrong attempts
> against one preview are bounded regardless of source IP. Revert if you prefer
> strict plan fidelity — it's additive and doesn't change the per-IP behavior.

## Out-of-band after ship

- Apply `057_client_previews.sql` in the Supabase dashboard SQL editor on project
  `zvfwtndbxshrtpwcwynw` AFTER deploy (Vercel does not run migrations — the gate
  route 404s/errors on every preview until applied).
- Add `PREVIEW_GATE_SECRET` to Vercel env (all environments) before relying on a
  gated link in the wild.
