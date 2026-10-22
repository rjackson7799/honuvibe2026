# Client Preview Feedback Implementation Plan

**Status:** APPROVED rev 3 by Ryan, 2026-10-22. Not built. Revs 1 and 2 were externally reviewed, and the findings were triaged into this revision (see "Review log" at the end). The reviewer's verdict on rev 2 was "close to implementation-ready, no architectural blocker". Ryan accepted the self-made decisions in rev 1.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reviewers on a password-gated client preview can leave a note (name + Bug fix / Improvement + message) from a small pop-up on every page. Ryan sees and triages the notes in admin under `/admin/studio/previews`.

**Architecture:** The existing gate route streams each preview file out of Storage. When a preview has `feedback_enabled`, the route appends a self-contained widget `<script>` to every HTML file it serves. The script draws a button and form inside a Shadow DOM and POSTs JSON to a new sibling route, `/api/preview/<slug>/feedback`. That route reuses the gate cookie as its auth and writes to a new admin-only `preview_feedback` table. Two new admin pages list the previews and their feedback, with status tracking and a "copy as markdown checklist" export.

**Tech Stack:** Next.js 16 App Router route handlers (nodejs runtime), Supabase (service-role writes, RLS admin-only reads), zod 4, vitest + jsdom, Tailwind v4 tokens.

**Spec:** this conversation (2026-10-22). Requirements as Ryan stated them:
- Small pop-up form on **each page** of a client preview.
- Fields: **message**, **name**, **type of feedback (Bug fix or Improvement)**.
- About 4 reviewers on the client side.
- All feedback is visible in the back end **per project**, so it can be turned into a fix plan.
- **No email alert. No annotations or screenshots.**
- **Only going forward.** Existing previews are not switched on. The new Hawaii Palms upload is the first user.

## Global Constraints

- Migration number **089** (`supabase/migrations/089_preview_feedback.sql`). 087 is the highest tracked migration; 088 is reserved by the approved, unbuilt B4 plan (`docs/plans/2026-10-15-b4-studio-pricing-rekey.md`). Untracked `084_auth_email_security.sql` belongs to auth hardening: **never touch, stage or replay it.** Re-check `ls supabase/migrations` at execution time and bump the number if something new landed.
- Use **pnpm**, never npm. Build and type-check need `NODE_OPTIONS=--max-old-space-size=8192`. Tests do not.
- The working tree carries a large, unrelated, uncommitted WIP (auth hardening and more). **Stage only this plan's files.** Before editing a file that already shows in `git status`, diff it. If it has foreign hunks, stage with `git add -p`.
- The widget copy is **English only** (reviewers write to Ryan in English). Admin pages are English only, matching `/admin/studio/leads`.
- Admin UI uses CSS-variable tokens only, no hardcoded colors (CLAUDE.md). The **widget** is the exception: it renders inside a client's export, where our tokens do not exist. It carries its own neutral palette inside its Shadow DOM.
- Touch targets ≥ 44×44px. Input font size ≥ 16px (prevents iOS zoom). Respect `prefers-reduced-motion`.
- No `any`. Server Components by default. `'use client'` only on the interactive feedback panel.
- **Hosted test project only, never prod**, for anything destructive: RLS tests, the Task 8 integration run, and the Task 7 upsert check all run against the throwaway project (`TEST_SUPABASE_URL`). Prod is `zvfwtndbxshrtpwcwynw`.

## Locked decisions

| # | Decision | Why |
|---|----------|-----|
| D1 | The widget is **injected at serve time** by the gate route, not baked into exports. | Exports are 3–9 MB single-line bundles that are painful to patch. Injection means zero per-export work. Turning a preview off removes the widget on the next request. |
| D2 | **Opt-in per preview** through `client_previews.feedback_enabled boolean NOT NULL DEFAULT false`. | "Only going forward": existing previews stay byte-identical. New previews get it through the skill's create path (Task 7), and admin can flip it per preview (Task 6). |
| D3 | **Gated previews only.** The feedback route 404s for `mode='public'` rows. | The gate cookie is the reviewer's auth. A public row has no cookie, so anyone with the URL could post. No public rows are in use. |
| D4 | The endpoint is a **static sibling route** `app/api/preview/[slug]/feedback/route.ts`. | It must live under `/api/preview/<slug>/` or the browser won't send the gate cookie (cookie `path` is `/api/preview/<slug>`, `route.ts:392`). A static segment wins over the `[[...path]]` catch-all. The cost is that an extension-less export file literally named `feedback` at the preview root would be shadowed, which no export does. A `_feedback` folder is NOT an option: App Router treats `_`-prefixed folders as private. |
| D5 | The widget **re-mounts itself** when its node is removed. | Verified on the current Hawaii Palms dashboard bundle: the bundler's unpack script calls `document.documentElement.replaceWith(doc.documentElement)`, so anything injected into the outer shell's DOM is discarded. The injected script still runs, because the window survives the root swap. It watches `document` with a MutationObserver and re-appends its host whenever `!host.isConnected`. This covers **root replacement only**, not `document.open()`/`write()` (see Risks). |
| D6 | **Shadow DOM** host, all styles inside it. | The export's CSS must not restyle the form, and the form's CSS must not leak into the mockup. |
| D7 | The script is **injected before the last `</body>`** found in the final 4096 bytes. If none is found, it is appended at the end. Streaming is preserved: only a 4 KB tail is held back. | Measured: the bundle's only literal `</body>` is the outer one, 242 bytes from the end. The inner template escapes it as `<\u002Fbody>`. A script after `</html>` still parses into `<body>` per the HTML spec, so the fallback is safe. |
| D8 | **Page attribution: preview pages are top-level pages.** The widget skips mounting inside iframes (`window.top !== window`, or access throws). Content framed *inside* a served file (the bundler's internal `about:blank#<uuid>` page frames) is attributed to the served file that contains it. | Verified: the Hawaii Palms chooser `index.html` has zero iframes and links to `concept-a.html` / `concept-b.html` / `dashboard.html` with plain `<a href>`, so every concept opens as a top-level page with its own URL. Supporting parent-to-child page hand-off would solve a case no current export has. |
| D9 | Statuses: `new → planned → done / wont_do`. Kinds: `bug`, `improvement` (UI labels "Bug fix" / "Improvement"). | As agreed in conversation. |
| D10 | **Two-stage rate limiting** with the in-memory `tryConsume` (`lib/community/rate-limit.ts:7`). **Pre-auth**, before any DB read: per IP `preview-fb-pre:<ip>`, 60 / 10 min. **Post-auth**, consumed only after a valid cookie and a valid payload: per slug+IP `preview-fb:<slug>:<ip>`, 20 / 10 min, and per slug `preview-fb:slug:<slug>`, 100 / 60 min. A 429 carries `Retry-After` equal to the tripped bucket's window. | Rev 1 spent the per-slug allowance before checking the cookie, so a stranger who knew the URL could use up the reviewers' allowance without the password. Now only authenticated, valid notes count against it. 20 per 10 min fits 4 reviewers on one office IP. The limiter is **per instance**, so these are per-warm-instance bounds, not deployment-wide guarantees. The cookie is the real gate (see Risks). |
| D11 | Admin reads go through the same client `getStudioLeads` uses (`lib/admin/queries.ts:285`). Admin writes use the house pattern: inline `requireAdmin()` + zod + service-role client + `revalidatePath` (`lib/studio/lead-actions.ts:28-56`). | Consistency with the Studio admin surfaces. |
| D12 | Not linked to Studio leads. | The Hawaii Palms preview has `lead_id` NULL: no lead exists (`docs/plans/2026-09-10-hawaii-palms-homepage-preview.md:141`). Feedback hangs off the preview, which always exists. |
| D13 | **Unsent drafts survive a reload.** The widget keeps one draft per preview in `sessionStorage['hv_pv_fb_draft:<slug>']` = `{ name, page, kind, message }`, written on every input into any field and cleared only on a 201. The name is in the draft because `localStorage` only learns it after a first successful send, so a first-time reviewer would otherwise lose it. The widget records whether the last draft write succeeded, and never tells the reviewer a note is saved when it wasn't. The draft's `page` is **captured when the draft starts** (the first keystroke into an empty message, including `location.hash` at that moment) and is what gets submitted, wherever the reviewer is when they press Send. Emptying the message deletes the draft, so the next note re-captures the page. | After an expired cookie or a password rotation, the reviewer must reload and re-enter the password. The gate then redirects to the **entry** page (`route.ts:387`), not the page they were on. An in-memory draft is lost on reload, and a draft keyed to the current page wouldn't restore on the entry page. Keyed per preview and carrying its own page, the note restores anywhere in the preview and is still attributed to the page it was written about. `sessionStorage` is per tab and dies with it, so no stale drafts linger on a shared machine. |

## Reusable pieces (verified)

- Gate route: `app/api/preview/[slug]/[[...path]]/route.ts`. Row load `loadContext` (`:201-221`) selects explicit columns. The serve path is `GET` (`:287-319`). Cookie check `verifyGate(slug, row.password, cookie)` (`:274-278`). Rate-limit idiom (`:360-363`). After a password POST it redirects to `entry_file` (`:387`).
- Gate helpers: `lib/previews/gate.ts`. `cookieNameFor`, `verifyGate`, `contentTypeFor` (`html` → `text/html; charset=utf-8`), `escapeHtml`.
- Route test harness with Supabase mocks: `__tests__/api/preview-gate.test.ts:1-88`. Copy its `vi.hoisted` mock shape for the new route test.
- RLS test pattern: `supabase/tests/client_previews_rls.test.ts`. The `test:rls` suite reads `TEST_SUPABASE_URL` / `TEST_SUPABASE_ANON_KEY` / `TEST_SUPABASE_SERVICE_KEY` (`supabase/tests/helpers/clients.ts:3-5`) and runs against the hosted throwaway project (memory `project_rls_tests_hosted_project`). **Do not copy** its read assertions as-is: `expect(data ?? []).toEqual([])` passes on an error too (see Task 1).
- Fixture users, including `honuvibe_admin`, with password `fixture-pass-<id>`: `supabase/tests/helpers/fixtures.ts:14,53`.
- Grants hardening: `supabase/migrations/076_business_upgrade_plans.sql:688-706`. New public tables auto-grant ALL to anon/authenticated.
- Admin nav groups: `components/admin/AdminNav.tsx:79-89` (Studio group).
- Admin page shell: `app/[locale]/admin/studio/leads/page.tsx`.
- PostgREST `max_rows = 1000` (`supabase/config.toml:18`). Any unbounded select silently truncates there.
- Preview row creation: the global skill `~/.claude/skills/studio-client-preview/SKILL.md`, SQL upsert at `:120-126`, the REST `merge-duplicates` alternative at `:127-128`, and the byte-count verification row at `:142`. `scripts/upload-preview.mjs` uploads files only.

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/089_preview_feedback.sql` (new) | Column + table + RLS + grants |
| `supabase/tests/helpers/clients.ts` (modify) | Refuse to run against prod |
| `lib/previews/feedback.ts` (new) | Pure: kinds/statuses/limits, `parseFeedbackInput`, `groupFeedbackByPage`, `filterFeedback`, `escapeMarkdown`, `toMarkdownChecklist` |
| `lib/previews/read-body.ts` (new) | `readBodyCapped`: byte-capped request body read |
| `lib/previews/inject.ts` (new) | Pure: `injectBeforeBodyClose`, `withInjectedSnippet` (stream transform) |
| `lib/previews/feedback-widget.ts` (new) | `renderFeedbackWidget({ slug })` → `<script>…</script>` string |
| `app/api/preview/[slug]/[[...path]]/route.ts` (modify) | Select `feedback_enabled`. Inject the widget into HTML when enabled. |
| `app/api/preview/[slug]/feedback/route.ts` (new) | POST: pre-auth throttle, auth via gate cookie, capped read, validate, post-auth limits, insert |
| `lib/previews/admin-queries.ts` (new) | `getPreviewSummaries`, `getPreviewWithFeedback` |
| `lib/previews/admin-actions.ts` (new) | `setFeedbackStatus`, `setPreviewFeedbackEnabled` |
| `app/[locale]/admin/studio/previews/page.tsx` + `[id]/page.tsx` (new) | Admin list + detail |
| `components/admin/AdminPreviewsList.tsx` (new) | List rendering |
| `components/admin/AdminPreviewFeedback.tsx` (new, client) | Filters, grouping, status select, enable toggle, copy-markdown |
| `components/admin/AdminNav.tsx` (modify) | "Client Previews" entry |

## Review Focus

The five failure modes most likely to bite a real reviewer that the spec never mentions, each pinned by a test in the owning task:

1. **The bundle swaps the page root after load**, so the button vanishes on exactly the pages that matter. The widget must reappear. *Pinned:* Task 3, `remounts after documentElement is replaced`; Task 8, real bundle through the real route.
2. **The session expires mid-note.** The reviewer must get a clear "reload and re-enter the password" message, and the note must still be there after they do, attributed to the page it was written on. *Pinned:* Task 3, `draft survives a 401 and a reload, then sends with its original page`; Task 8, step 4 (real password rotation).
3. **Four reviewers on one office IP, plus strangers hitting the URL.** Normal use (10–15 notes in a burst) must not hit a 429, and unauthenticated traffic must not use up the reviewers' allowance. *Pinned:* Task 4, `allows 20 authenticated posts per slug+IP per 10 minutes, 429s the 21st` and `invalid-cookie floods do not consume the reviewer allowance`.
4. **A reviewer on a phone (375px) with the on-screen keyboard open.** The panel must fit, scroll internally, and keep Send and Cancel reachable. Inputs must be ≥16px so iOS doesn't zoom. *Pinned:* Task 3, `panel is height-bounded and scrolls` and `inputs are at least 16px`; Task 8, 375px pass; Ship step 4, a real-phone keyboard check.
5. **Wrong page attribution.** A note written on `concept-a.html` must be saved as `concept-a.html`, not as the chooser and not as wherever the reviewer was when they finally pressed Send. *Pinned:* Task 3, `saves the page captured when the draft started`; Task 8, step 5, which checks stored `page` values.

---

### Task 1: Migration 089

**Files:**
- Create: `supabase/migrations/089_preview_feedback.sql`
- Modify: `supabase/tests/helpers/clients.ts` (prod guard)
- Test: `supabase/tests/preview_feedback_rls.test.ts`

**Interfaces:**
- Produces: `client_previews.feedback_enabled boolean NOT NULL DEFAULT false`.
- Produces: table `preview_feedback` with columns:
  - `id uuid PK default gen_random_uuid()`
  - `created_at`, `updated_at timestamptz NOT NULL default now()`
  - `preview_id uuid NOT NULL REFERENCES client_previews(id) ON DELETE CASCADE`
  - `page text NOT NULL CHECK (char_length(page) BETWEEN 1 AND 300)`
  - `reviewer_name text NOT NULL CHECK (char_length(btrim(reviewer_name)) BETWEEN 1 AND 80)`
  - `kind text NOT NULL CHECK (kind IN ('bug','improvement'))`
  - `message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 4000)`
  - `viewport_w int`, `viewport_h int`, each `CHECK (… BETWEEN 0 AND 20000)`, nullable
  - `user_agent text CHECK (char_length(user_agent) <= 500)`, nullable
  - `status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','planned','done','wont_do'))`
  - Index `(preview_id, created_at DESC)`, plus `(preview_id, status)` for the admin counts.

- [ ] **Step 1: Prod guard.** In `supabase/tests/helpers/clients.ts`, throw at module load if `TEST_SUPABASE_URL` contains `zvfwtndbxshrtpwcwynw`. The message is `Refusing to run RLS tests against production`. The existing `client_previews_rls.test.ts` deletes **every** preview row in `beforeEach` (`:30`), so a mis-set env would wipe prod previews. This guard protects every suite.
- [ ] **Step 2: Write the failing RLS test.** Seed a gated `client_previews` row and two feedback rows with the service client. Every read assertion must check `error` explicitly, never `data ?? []`. Cases:
  1. **anon SELECT** → `error.code === '42501'` (permission denied, because the grant is revoked)
  2. **anon INSERT** → `error.code === '42501'`
  3. **member (`honuvibe_free`) SELECT** → `error === null` and `data` is exactly `[]` (the grant exists; RLS filters)
  4. **member INSERT** → an error (RLS violation)
  5. **member UPDATE and DELETE** → no error and zero rows affected. Then re-read both seeded rows **with the service client** and assert `status` and the row count are unchanged.
  6. **admin (`honuvibe_admin`)** can SELECT both rows, UPDATE `status` (re-read via service shows it), and DELETE (re-read via service shows it gone)
  7. `kind = 'praise'`, `status = 'closed'` and a whitespace-only `message` are each rejected (service client, `error.code === '23514'`)
  8. deleting the parent preview cascades (service count goes to 0)
  9. `feedback_enabled` defaults to `false` on a new preview row
- [ ] **Step 3:** Run `pnpm test:rls -- preview_feedback`. Expected: FAIL (relation does not exist).
- [ ] **Step 4: Write the migration.** Header in the 057 style: purpose, "apply BEFORE pushing the code" (see Ship), verification queries, and a pointer to the **Recovery** section of this plan **instead of** a bare `DROP` rollback. Body in `BEGIN; … COMMIT;`:
  - `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, both indexes
  - `ENABLE ROW LEVEL SECURITY`
  - policy `preview_feedback_admin_all FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())`
  - no anon or member policy (the feedback route writes with the service role)
  - `REVOKE ALL ON public.preview_feedback FROM anon;`
  - `REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.preview_feedback FROM authenticated;`
- [ ] **Step 5:** Apply it to the hosted test project's SQL editor. Run the grants query from Ship step 1 there. Expected: no `anon` rows, and no TRUNCATE / REFERENCES / TRIGGER for `authenticated`. Then run `pnpm test:rls -- preview_feedback` and `pnpm test:rls -- client_previews`. Expected: PASS, both.
- [ ] **Step 6: Commit** (local only, not pushed; see Ship): `feat(previews): preview_feedback table + feedback_enabled (migration 089)`.

### Task 2: Pure helpers (validation, grouping, markdown, body read, stream injection)

**Files:**
- Create: `lib/previews/feedback.ts`, `lib/previews/read-body.ts`, `lib/previews/inject.ts`
- Test: `__tests__/lib/preview-feedback.test.ts`, `__tests__/lib/preview-read-body.test.ts`, `__tests__/lib/preview-inject.test.ts`

**Interfaces (Produces):**

```ts
// lib/previews/feedback.ts — no 'use server' / 'server-only' (tests and the widget renderer import it, like gate.ts)
export const FEEDBACK_KINDS = ['bug', 'improvement'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const FEEDBACK_KIND_LABEL: Record<FeedbackKind, string> = { bug: 'Bug fix', improvement: 'Improvement' };
export const FEEDBACK_STATUSES = ['new', 'planned', 'done', 'wont_do'] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = { new: 'New', planned: 'Planned', done: 'Done', wont_do: "Won't do" };
export const FEEDBACK_LIMITS = { name: 80, message: 4000, page: 300, userAgent: 500, bodyBytes: 16_384 } as const;

export type FeedbackInput = { name: string; kind: FeedbackKind; message: string; page: string; viewportW: number | null; viewportH: number | null };
export function parseFeedbackInput(raw: unknown): { ok: true; value: FeedbackInput } | { ok: false; error: string };

export type PreviewFeedbackItem = { id: string; createdAt: string; page: string; reviewerName: string; kind: FeedbackKind; message: string; viewportW: number | null; viewportH: number | null; userAgent: string | null; status: FeedbackStatus };
export type FeedbackFilter = { kind: FeedbackKind | 'all'; status: FeedbackStatus | 'open' | 'all' }; // 'open' = new + planned
export function filterFeedback(items: PreviewFeedbackItem[], f: FeedbackFilter): PreviewFeedbackItem[];
export function groupFeedbackByPage(items: PreviewFeedbackItem[]): { page: string; items: PreviewFeedbackItem[] }[];
export function shortFeedbackId(id: string): string; // first 8 hex chars of the uuid
export function escapeMarkdown(text: string): string;
export function toMarkdownChecklist(previewTitle: string, items: PreviewFeedbackItem[]): string;

// lib/previews/read-body.ts
export function readBodyCapped(body: ReadableStream<Uint8Array> | null, maxBytes: number): Promise<{ ok: true; text: string } | { ok: false; reason: 'too_large' | 'read_error' }>;

// lib/previews/inject.ts
export const INJECT_TAIL_BYTES = 4096;
export function injectBeforeBodyClose(tail: Uint8Array, snippet: Uint8Array): Uint8Array;
export function withInjectedSnippet(source: ReadableStream<Uint8Array>, snippet: string): ReadableStream<Uint8Array>;
```

Rules the tests pin:
- `parseFeedbackInput` trims `name` and `message`, and rejects them if empty after trimming or longer than the limit. It **rejects** over-length input rather than truncating it (the widget enforces `maxlength`, so over-length means a bypassed client).
- `kind` must be in `FEEDBACK_KINDS`.
- `page` is trimmed and must be 1–300 chars with no control characters (`/[\u0000-\u001f\u007f]/`).
- `viewportW` / `viewportH` must be integers 0–20000, or else `null`. A bad value does not reject the whole note.
- Input keys are `{ name, kind, message, page, viewportW, viewportH }`. Unknown keys are ignored.
- `groupFeedbackByPage`: groups are ordered by each group's newest item (newest first). Items inside a group are oldest first, so a page's notes read in order.
- `escapeMarkdown` backslash-escapes `` \ ` * _ [ ] < > # | `` so reviewer-typed text can't create formatting, links, headings or HTML.
- `toMarkdownChecklist` output, exactly:

  ```
  # <previewTitle> — feedback

  ## <page>
  - [ ] **Bug fix** — <message> — _<name>, YYYY-MM-DD_ · `a1b2c3d4` (Planned)
  ```

  - `<page>`, `<message>` and `<name>` pass through `escapeMarkdown`. `previewTitle` is admin-set and is not escaped.
  - The id is `shortFeedbackId`, so an exported task maps back to its row. The admin detail page shows the same short id on each item.
  - The `(Status)` suffix appears only when the status is not `new`.
  - `done` items render `- [x]`.
  - Continuation lines of a multi-line message are indented two spaces.
  - Dates are UTC `YYYY-MM-DD`.
- `readBodyCapped` reads the stream chunk by chunk and keeps a running **byte** count. It cancels the reader and returns `too_large` the moment the count exceeds `maxBytes`. A thrown read returns `read_error`. A `null` body returns `{ ok: true, text: '' }`. It decodes once at the end with `TextDecoder('utf-8')`.
- `injectBeforeBodyClose`: finds the **last** case-insensitive `</body` byte sequence in `tail` and inserts `snippet` before it. If there is none, it returns `tail + snippet`.
- `withInjectedSnippet`: passes bytes through, holding back only the trailing `INJECT_TAIL_BYTES`. On flush it emits `injectBeforeBodyClose(heldTail, utf8(snippet))`. Output must be **byte-identical** to the input apart from the inserted snippet.

- [ ] **Step 1: Write failing tests.** `preview-feedback.test.ts`:
  - valid input round-trips trimmed
  - empty / whitespace name → error
  - 4001-char message → error
  - `kind: 'praise'` → error
  - page with `\n` → error
  - `viewportW: 'wide'` → `null`, still ok
  - `filterFeedback` `'open'` returns new + planned only
  - group ordering as above
  - `toMarkdownChecklist` exact string for a 3-item fixture: two pages, one `done`, one multi-line message
  - `escapes reviewer text`: a name `*Ann*`, a message `[link](x) <b>#1</b>`, and a page `a_b.html` all render literally

  `preview-read-body.test.ts`:
  - a body under the cap returns its text
  - an oversized body **with no Content-Length** returns `too_large` and the source is cancelled (assert the stream's `cancel` was called, i.e. reading stopped early)
  - multi-byte input is counted in bytes: 6000 × `日` (18 000 bytes, 6000 UTF-16 units) is `too_large` at a 16 384 cap
  - an erroring stream returns `read_error`
  - a `null` body returns `''`

  `preview-inject.test.ts`:
  - snippet lands before the last `</body>` when two exist
  - matches `</BODY>`
  - no `</body>` → appended
  - a `</body>` split across two chunks
  - 1-byte chunks
  - input shorter than 4096 bytes
  - a 9 MB input with multi-byte UTF-8 (`日本語`) round-trips byte-exact apart from the snippet
- [ ] **Step 2:** Run `pnpm vitest run --project app __tests__/lib/preview-feedback.test.ts __tests__/lib/preview-read-body.test.ts __tests__/lib/preview-inject.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement the three modules. Do the injection byte search on `Uint8Array` directly; never decode to a string, so UTF-8 split across chunk boundaries can't corrupt anything. `withInjectedSnippet` is a `TransformStream` that keeps a rolling `Uint8Array` buffer.
- [ ] **Step 4:** Re-run. Expected: PASS.
- [ ] **Step 5: Commit** `feat(previews): feedback validation, markdown export, capped body read + stream injection`.

### Task 3: The widget script

**Files:**
- Create: `lib/previews/feedback-widget.ts`
- Test: `__tests__/lib/preview-feedback-widget.test.ts` (jsdom; the `app` project already runs jsdom)

**Interfaces:**
- Consumes: `FEEDBACK_LIMITS`, `FEEDBACK_KIND_LABEL` (Task 2). Their values are inlined into the script string at render time.
- Produces: `renderFeedbackWidget(opts: { slug: string }): string`. It returns one `<script>(function(){…})();</script>` with no external fetches. The config is embedded as `JSON.stringify({ slug, endpoint: '/api/preview/' + slug + '/feedback' })` with every `<` escaped as `\u003c`.

**Behavior (vanilla ES2019, no framework, ~300 lines including CSS):**
- Guards: return immediately if `window.__hvPreviewFeedback` is set (then set it). Also return if `window.top !== window`, and treat a thrown cross-origin access as framed (D8).
- Host `div#hv-preview-feedback` with an open shadow root, `position: fixed`, `z-index: 2147483647`, offset 16px from the right and bottom **plus** `env(safe-area-inset-right/bottom, 0px)`. `ensureMounted()` appends the host to `document.body ?? document.documentElement` when `!host.isConnected`. Call it:
  - immediately
  - on `DOMContentLoaded` and `load`
  - from a `MutationObserver` on `document` (`{ childList: true, subtree: true }`; the callback is only the O(1) `isConnected` check)
- Launcher: a pill button labelled **"Feedback"**, min 44px tall. When a draft exists it shows a small dot so the reviewer knows a note is waiting.
- Panel: `role="dialog"`, `aria-label="Send feedback"`, 340px wide. Below 480px viewport it is `calc(100vw - 32px)` wide. **Height-bounded:** `max-height: calc(100dvh - 32px)` with a `100vh` fallback, and the form body scrolls internally (`overflow-y: auto`) while the Send/Cancel row stays pinned at the panel's bottom, so the buttons stay reachable with the phone keyboard open. Contents:
  - Heading **"Send feedback"**.
  - A muted line **"Page: <page>"**. This is the draft's captured page when a draft exists, otherwise the current page.
  - **Name** (`maxlength` 80, `autocomplete="name"`). Prefilled from `localStorage['hv_pv_feedback_name']` and written back on successful send; both wrapped in try/catch.
  - **Type**: a radiogroup **"Bug fix" / "Improvement"**, required, no default.
  - **Message**: textarea, `maxlength` 4000, required, 5 rows.
  - Buttons **"Send"** and **"Cancel"**.
  - All inputs `font-size: 16px`.
- Current page value: `location.pathname` with the `/api/preview/<slug>/` prefix stripped, then `decodeURIComponent` in try/catch. Append `location.hash` when non-empty. Empty → `'(entry)'`. Cap at 300 chars.
- **Draft persistence (D13):** while the message is non-empty, every `input` into Name, Type or Message writes `sessionStorage['hv_pv_fb_draft:<slug>'] = JSON.stringify({ name, page, kind, message })` inside try/catch. A `draftSaved` flag records whether that last write succeeded. `page` is captured when the message goes from empty to non-empty, and kept after that. Emptying the message removes the key. When the widget initialises, a stored draft is restored into the form, its name taking precedence over the `localStorage` name. Malformed JSON is discarded. Cancel and Esc close the panel without touching the draft. A 201 clears it. Hash changes after the draft started do not change its page.
- Submit: `fetch(endpoint, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, kind, message, page: draftPage ?? currentPage, viewportW: innerWidth, viewportH: innerHeight }) })`. **While the request is pending, the whole form is disabled** (a `<fieldset disabled>` around every field and button). Nothing can be edited mid-send, so a 201 can never wipe text typed after the submit. Every non-201 outcome re-enables the form. Outcomes:
  - **201:** show "Thanks — your note was sent.", clear the message, type and stored draft, keep the name (and write it to `localStorage`).
  - **401, draft saved:** show "Your session has expired. Reload the page and enter the password again. Your note is saved and will be here when you come back." Keep the draft.
  - **401, draft not saved** (`draftSaved` is false, e.g. storage blocked): show "Your session has expired. Copy your note somewhere safe, then reload the page and enter the password again."
  - **429:** show "Too many notes in a short time. Try again in about N minutes." N = `ceil(Retry-After / 60)`, falling back to 10 when the header is missing. Keep the draft.
  - **Anything else, or a network error:** show "Couldn't send. Please try again." Keep the draft.
  - Messages go in an `aria-live="polite"` region.
- Keyboard: Esc closes the panel and returns focus to the launcher. Opening focuses Name (or Message, if Name is prefilled).
- `@media (prefers-reduced-motion: reduce)` removes the transitions. Neutral dark palette (the `gate.ts` PAGE_STYLE values) so it reads as "tool chrome", not as part of the client's design.

- [ ] **Step 1: Write failing tests.** Each **page load is a fresh `JSDOM` instance** (`new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/api/preview/<slug>/concept-a.html', runScripts: 'outside-only' })`). Evaluate the script with `dom.window.eval(body)` after stripping the tags, and stub `fetch` on that window. To **simulate a reload**, copy the old window's `sessionStorage` and `localStorage` entries into a new `JSDOM` at the new URL, close the old window (`dom.window.close()`), and evaluate there. Do not reuse the old document: its MutationObserver would still be attached and could remount the old host, which a real reload never does. Tests:
  - `mounts one host` (a second evaluation in the same window does not add another)
  - `remounts after documentElement is replaced`: build a new `<html><body>` with DOMParser, call `document.documentElement.replaceWith(...)`, await a microtask, and expect `#hv-preview-feedback` to be connected again
  - `does not mount inside an iframe`: stub `window.top` to a different object
  - `posts the expected JSON`: fill the fields, submit, assert the fetch URL, method, body keys, and `page === 'concept-a.html'`
  - `saves the page captured when the draft started`: start typing on `concept-a.html`, change `location.hash` to `#pricing`, `replaceState` to `index.html`, submit, and expect `page === 'concept-a.html'`
  - `draft survives a 401 and a reload, then sends with its original page`: a **first-time reviewer** (empty `localStorage`) types a name and a note on `concept-a.html`. Fetch returns 401 and the "Your note is saved" message shows. Simulate a reload on `index.html` (where the gate's post-password redirect lands). Expect **exactly one** connected `#hv-preview-feedback` host, and the form restored with the name, type, message and "Page: concept-a.html". Fetch returns 201. Expect the body's `page === 'concept-a.html'`, the name in the body, and the `sessionStorage` key removed.
  - `401 with blocked storage tells the reviewer to copy their note`: make `sessionStorage.setItem` throw, type, get a 401, and expect the "Copy your note somewhere safe" message, not "Your note is saved"
  - `the form is locked while sending`: fetch returns a deferred promise. While it is pending, expect every input, the textarea and both buttons to be disabled, and an attempted edit (setting the value and dispatching `input`) not to change the stored draft. Resolve with 500 and expect the form re-enabled with the draft intact. Repeat with 201 and expect the message cleared.
  - `emptying the message drops the draft`
  - `429 shows the retry time from Retry-After` (`Retry-After: 600` → "about 10 minutes")
  - `remembers the name in localStorage`
  - `inputs are at least 16px` and `panel is height-bounded and scrolls`: assert the shadow stylesheet text sets `font-size: 16px` on `input, textarea`, a `max-height` using `100dvh` on the panel, and `overflow-y: auto` on the form body
  - `escapes < in the embedded config`
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Commit** `feat(previews): self-mounting feedback widget with reload-safe drafts`.

### Task 4: Feedback POST route

**Files:**
- Create: `app/api/preview/[slug]/feedback/route.ts`
- Test: `__tests__/api/preview-feedback-route.test.ts`

**Interfaces:**
- Consumes: `parseFeedbackInput`, `FEEDBACK_LIMITS` (Task 2); `readBodyCapped` (Task 2); `cookieNameFor`, `verifyGate` (`lib/previews/gate.ts`); `tryConsume`; `createAdminClient`.
- Produces: `POST(request: NextRequest, ctx: { params: Promise<{ slug: string }> }): Promise<Response>`. `export const runtime = 'nodejs'`. Every response is JSON with `Cache-Control: private, no-store` and `X-Robots-Tag: noindex, nofollow`.

**Order of checks.** Each step returns immediately on failure. The body is `{ error: string }`, except for the 201. The body is **not read** until the cookie has been verified, so unauthenticated requests never get buffered.

| Step | Condition | Response |
|------|-----------|----------|
| 1 | slug fails `^[a-z0-9-]{8,80}$` | 404 |
| 2 | Supabase env missing | 503 |
| 3 | `Origin` header present and its host ≠ the request host | 403 |
| 4 | `Content-Type` not `application/json` | 415 |
| 5 | **pre-auth** per-IP `preview-fb-pre:<ip>`, 60 / 10 min | 429, `Retry-After: 600` |
| 6 | `Content-Length` header present and > 16 384 (early reject only; step 11 enforces) | 413 |
| 7 | row (`id, mode, password, expires_at, feedback_enabled`) missing, `mode !== 'gated'`, or `!feedback_enabled` | 404 |
| 8 | expired | 410 |
| 9 | `PREVIEW_GATE_SECRET` missing | 503 |
| 10 | gate cookie missing or `!verifyGate` | 401 |
| 11 | `readBodyCapped(request.body, 16_384)`: `too_large` → 413; `read_error` → 400 | 413 / 400 |
| 12 | invalid JSON or `parseFeedbackInput` fails | 400 with the parser's error |
| 13 | **post-auth** slug+IP `preview-fb:<slug>:<ip>`, 20 / 10 min, then slug `preview-fb:slug:<slug>`, 100 / 60 min | 429, `Retry-After: 600` or `3600` |
| 14 | insert via service role (`user_agent` = request header, truncated to 500); insert error | 500 `{ error: 'Could not save feedback' }` |
| 15 | success | 201 `{ ok: true }` |

- [ ] **Step 1: Write failing tests.** Copy the `vi.hoisted` Supabase mock from `preview-gate.test.ts`, adding an `insert` mock. Give each test a unique slug **and** a unique `x-forwarded-for`, so the in-memory buckets don't bleed between tests. One test per row of the table, plus:
  - `allows 20 authenticated posts per slug+IP per 10 minutes, 429s the 21st with Retry-After 600`
  - `invalid-cookie floods do not consume the reviewer allowance`: send 150 posts with a bad cookie from rotating IPs (all 401), then a valid post from a fresh IP → 201
  - `does not read the DB when pre-auth limited`
  - `does not read the body before the cookie is verified`: a bad-cookie request whose body stream throws still returns 401, not 400
  - `rejects an oversized body sent without Content-Length` → 413
  - `a cookie signed for another slug is rejected`
  - `a cookie signed with the old password is rejected after rotation`
  - `inserts the trimmed values and preview_id`
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it. Then run `NODE_OPTIONS=--max-old-space-size=8192 pnpm build`. Expected: PASS, and the build accepts the static `feedback` sibling of `[[...path]]`. **If the build rejects it**, fall back to dispatching `path = ['feedback']` inside the catch-all's `POST` (behavior and tests unchanged) and note it in the execution record.
- [ ] **Step 5: Commit** `feat(previews): feedback POST route behind the gate cookie`.

### Task 5: Inject the widget in the gate route

**Files:**
- Modify: `app/api/preview/[slug]/[[...path]]/route.ts`. Add `feedback_enabled` to `PreviewRow` and to the `loadContext` select (`:211`). Thread `feedbackEnabled` and `slug` through `Resolved` into `GET`.
- Test: `__tests__/api/preview-gate.test.ts` (extend; add `feedback_enabled: false` to `gatedRow`'s defaults).

**Interfaces:**
- Consumes: `withInjectedSnippet` (Task 2), `renderFeedbackWidget` (Task 3).
- In `GET`, when `row.mode === 'gated' && row.feedback_enabled && contentTypeFor(filename).startsWith('text/html')`, the body is `withInjectedSnippet(blob.stream(), renderFeedbackWidget({ slug }))`. Otherwise it is `blob.stream()` unchanged. `HEAD`, `POST`, the password page and the message pages are untouched.

- [ ] **Step 1: Write failing tests:**
  - `injects the widget into HTML when feedback is enabled` (body contains `hv-preview-feedback` exactly once, before `</body>`)
  - `does not inject into non-HTML` (`hero.png`)
  - `serves HTML byte-identical when feedback is disabled`
  - `does not inject into the 401 password page`
- [ ] **Step 2:** Run it. Expected: the new tests FAIL and the existing tests still PASS.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the whole `preview-gate.test.ts`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(previews): inject feedback widget into opted-in previews`.

### Task 6: Admin pages

**Files:**
- Create: `lib/previews/admin-queries.ts`, `lib/previews/admin-actions.ts`
- Create: `app/[locale]/admin/studio/previews/page.tsx`, `app/[locale]/admin/studio/previews/[id]/page.tsx`
- Create: `components/admin/AdminPreviewsList.tsx`, `components/admin/AdminPreviewFeedback.tsx` (`'use client'`)
- Modify: `components/admin/AdminNav.tsx`. Add `{ href: '/admin/studio/previews', label: 'Client Previews', icon: MonitorSmartphone }` after Engagements.
- Test: `__tests__/lib/preview-admin-queries.test.ts`, `__tests__/lib/preview-admin-actions.test.ts`, `__tests__/admin/admin-preview-feedback.test.tsx`

**Interfaces (Produces):**

```ts
export type AdminPreviewSummary = { id: string; slug: string; title: string | null; mode: 'public' | 'gated'; createdAt: string; expiresAt: string | null; accessCount: number; lastAccessedAt: string | null; feedbackEnabled: boolean; counts: { total: number; new: number; open: number } };
export async function getPreviewSummaries(): Promise<AdminPreviewSummary[]>;          // newest first
export async function getPreviewWithFeedback(id: string): Promise<{ preview: AdminPreviewSummary; items: PreviewFeedbackItem[] } | null>;
// 'use server'
export async function setFeedbackStatus(id: string, status: FeedbackStatus): Promise<void>;          // also sets updated_at
export async function setPreviewFeedbackEnabled(previewId: string, enabled: boolean): Promise<void>;
```

**Query rules** (PostgREST truncates at `max_rows = 1000` with no error):
- **Counts never come from fetched rows.** For each preview, `counts` comes from three `select('id', { count: 'exact', head: true })` queries on `preview_feedback`, run in parallel: all rows, `status = 'new'`, and `status in ('new','planned')`. That is 3 queries per preview, and there are tens of previews, not thousands.
- `getPreviewSummaries` selects previews with `.order('created_at', { ascending: false }).range(0, 199)`. Past 200, the list page says "Showing the newest 200 previews."
- `getPreviewWithFeedback` pages through the preview's feedback with `.order('created_at').order('id').range(from, from + 499)` until a page returns fewer than 500 rows. It returns every row.
- Queries select **explicit columns** and never return `password`.

Both actions call `requireAdmin()` and zod-validate (`uuid`, enum). Each runs its update with `.select('id')` and **throws when zero rows come back**: `Feedback not found` / `Preview not found`. A write to a nonexistent id must fail loudly, not look like a success. Then they revalidate `/admin/studio/previews` and `/admin/studio/previews/<id>`.

UI:
- **List page:** title ("Client Previews" heading, "Client previews and the feedback reviewers leave on them." subline), then one row per preview showing:
  - title (falling back to slug)
  - a `Live` / `Expired` chip (from `expiresAt`)
  - visits and last visit
  - `Feedback on` / `Feedback off`
  - counts `N new · M open` (hidden when total is 0)
  - the whole row links to the detail page
- **Detail page:** a back link, then the title, slug and expiry. Below that:
  - The **feedback enabled** toggle. Like the status select, it updates optimistically. If the action throws, the toggle reverts and an inline error says "Couldn't save. Try again."
  - The filters: kind (All / Bug fix / Improvement) and status (Open [default] / All / New / Planned / Done / Won't do).
  - **"Copy as markdown"**, which copies `toMarkdownChecklist(title, filtered items)` and shows "Copied" for 2s. If the clipboard write rejects, it selects the text in a read-only textarea instead.
  - Items grouped with `groupFeedbackByPage`. Each item shows a kind tag, the name, the date, the short id, the message (`whitespace-pre-wrap`, plain React text, **never** `dangerouslySetInnerHTML`), a muted viewport and user-agent line, and a status `<select>` that updates optimistically. If the action throws, the select reverts and the item shows "Couldn't save. Try again."
  - Two different empty states. If the preview has no feedback at all: "No feedback yet." If it has feedback but the filters hide all of it: "No feedback matches these filters.", plus a "Show all" button that resets both filters.

- [ ] **Step 1: Write failing tests:**
  - queries: `counts come from head counts, not rows` (mock returns `count: 1500` for total; the summary shows 1500); `getPreviewWithFeedback pages past 1000` (mock serves pages of 500, 500 and 120 → 1120 items, with the `range` arguments asserted); `never selects password`
  - actions: a non-admin throws `Not authorized`; a bad status throws; a valid call updates the right row; **an update that matches zero rows throws `Feedback not found` / `Preview not found`** (mock the Supabase clients the way existing `lib/studio` action tests do: `grep -rln "requireAdmin\|Not authorized" __tests__` to find one)
  - component:
    - default filter hides `done` items; switching to `All` shows them
    - items are grouped under their page heading
    - "Copy as markdown" writes the expected string (with short ids) to a stubbed `navigator.clipboard`
    - a reviewer message containing `<script>` renders as text
    - `a failed status change reverts and shows an error`: the mocked action rejects; the select returns to its previous value and "Couldn't save. Try again." is visible
    - `a failed toggle reverts and shows an error`: same, for the feedback-enabled toggle
    - `no feedback` shows "No feedback yet."; `all filtered out` shows "No feedback matches these filters.", and "Show all" brings the items back
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run them, then `pnpm verify:fast`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): Studio previews list + feedback triage`.

### Task 7: Turn it on for new previews (skill, outside the repo)

**Files:**
- Modify: `~/.claude/skills/studio-client-preview/SKILL.md` (global skill, not committed)

- [ ] **Step 1: SQL path (`:120-126`).** Add `feedback_enabled` to the INSERT column list with value `true`. Do **not** add it to `ON CONFLICT … DO UPDATE SET`. A new slug gets `true`; re-uploading an existing slug leaves the admin toggle as it was.
- [ ] **Step 2: REST path (`:127-128`).** `merge-duplicates` overwrites every column sent, so the REST alternative must split create from update. First `GET /rest/v1/client_previews?slug=eq.<slug>&select=id`. If no row exists, POST with `feedback_enabled: true`. If a row exists, PATCH without `feedback_enabled`. Say this in the skill in one short paragraph.
- [ ] **Step 3: Verification table (`:142`).** Replace "byte count equals the local file" with two rows:
  - feedback **off**: byte count equals the local file
  - feedback **on**: the served file contains `hv-preview-feedback` exactly once, and its byte count equals the local file plus the snippet's byte length

  Add a step: load each page, confirm the Feedback button shows, send one test note, confirm it appears in `/admin/studio/previews`, then mark it Won't do.
- [ ] **Step 4: One-time upsert check** on the hosted **test** project's SQL editor. Run the new INSERT … ON CONFLICT twice for a slug whose row has `feedback_enabled = false`, then twice for one set to `true`. Expected: both keep their value. Delete the two rows afterwards.

### Task 8: Verify

- [ ] **Step 1:** Run `NODE_OPTIONS=--max-old-space-size=8192 pnpm verify`. Expected: green. Also run `pnpm test:rls -- preview_feedback client_previews`. Expected: green.
- [ ] **Step 2: Local server on the test project.** In the shell that starts `pnpm dev`, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from the `TEST_SUPABASE_*` values, and `PREVIEW_GATE_SECRET` to a random local value. Values already in `process.env` take precedence over `.env.local`. Assert the URL is not prod before starting.

  **Assemble a dedicated export directory** in the scratchpad, `smoke-export/`, holding exactly the files to serve: the current real Hawaii Palms `index.html` and `dashboard.html`, plus `logo.png`. As of 2026-10-22 those are `C:/work/hawaiipalms/out/index.html`, `C:/work/hawaiipalms/out/dashboard.html` and `C:/work/hawaiipalms/logo.png`. If Ryan's new export has arrived by execution time, use its files instead. **Do not upload `C:/work/hawaiipalms` itself:** the uploader is recursive, and that folder also holds the raw bundle, `manifest.json` and the nested `out/`. Upload `smoke-export/` with `scripts/upload-preview.mjs` under the same env, then insert a gated row `hv-fb-smoke-<random>` with `feedback_enabled = true` and a throwaway password. Every byte comparison below is against the files in `smoke-export/`.
- [ ] **Step 3: HTTP checks with curl against `localhost:3000`**, through the real gate route and production helpers:
  - GET without a cookie → 401 password page
  - POST the password → 303 + `hv_pv_` cookie
  - GET `dashboard.html` with the cookie → 200, the marker appears exactly once, and the size equals `smoke-export/dashboard.html` plus the snippet's byte length
  - POST feedback with a forged cookie → 401
  - POST feedback with the real cookie, body `{ name: 'Probe', kind: 'bug', message: 'SMOKE-1 http probe', page: 'http-probe' }` → 201
- [ ] **Step 4: Browser pass**, at 1440px and 375px, through the same local server. Give every note a distinct message so each stored row can be matched exactly:
  - Enter the password.
  - Open `dashboard.html`, wait for the bundle to unpack, and confirm the Feedback button is visible bottom-right. Send `SMOKE-2 dashboard` (name `Ann`, Bug fix).
  - Open `index.html` and send `SMOKE-3 chooser` (name `Ben`, Improvement).
  - **Rotation drill**, as a first-time reviewer: clear the site's `localStorage` first. Start `SMOKE-4 rotated` on `dashboard.html` (name `Cy`, Bug fix), then change the row's password with the service client and press Send. Expect the "Your note is saved" session message. Reload, enter the new password (you land on `index.html`), open the panel, and confirm the name, type, message and "Page: dashboard.html" are all restored. Send it.
  - Confirm the console is clean.
- [ ] **Step 5: Stored data.** Query the test project. Expect **4 rows**, matched by message:

  | Message | page | reviewer_name | kind |
  |---------|------|---------------|------|
  | `SMOKE-1 http probe` | `http-probe` | Probe | bug |
  | `SMOKE-2 dashboard` | `dashboard.html` | Ann | bug |
  | `SMOKE-3 chooser` | `index.html` | Ben | improvement |
  | `SMOKE-4 rotated` | `dashboard.html` | Cy | bug |

- [ ] **Step 6: Admin pass on the same local server.** Sign in as the `honuvibe_admin` fixture (email from `fixtures.ts`, password `fixture-pass-<id>`). Check:
  - `/admin/studio/previews` shows the smoke preview with `4 new`
  - on the detail page, items are grouped by page, a status change survives a reload, and "Copy as markdown" produces the checklist with short ids
  - turning feedback **off** makes the next `GET dashboard.html` byte-identical to `smoke-export/dashboard.html`
  - desktop and 375px, both themes
- [ ] **Step 7: Cleanup.** Delete the smoke row (its feedback cascades) and its Storage prefix on the test project.
- [ ] **Step 8: Independent adversarial review** (`requesting-code-review`) over the diff, told to try to break the injection, the cookie auth, the rate-limit ordering, the draft restore and the remount. Triage the findings with `receiving-code-review`.

## Ship (order matters)

1. **Apply 089 to prod before pushing** (dashboard SQL editor, `zvfwtndbxshrtpwcwynw`). It is purely additive: the old code ignores the new column and table. The **new** code selects `feedback_enabled` in `loadContext`. If the column is missing, that select errors and **every preview 404s**, so the order is not optional. Then verify by querying prod:
   - `select count(*) filter (where feedback_enabled) as enabled, count(*) as total from client_previews;` → `enabled = 0`
   - `select count(*) from preview_feedback;` → `0`
   - `select grantee, privilege_type from information_schema.role_table_grants where table_name = 'preview_feedback' and grantee in ('anon','authenticated');` → no `anon` rows; no TRUNCATE / REFERENCES / TRIGGER for `authenticated`
2. Commit (only this plan's files, per Global Constraints), push, and wait for the Vercel deploy to be Ready. Confirm an existing preview still serves its entry page (200 with its cookie, or 401 without), which proves the new `loadContext` select works against prod.
3. Ryan's new Hawaii Palms export is uploaded through the updated skill (new slug, `feedback_enabled = true`).
4. Prod smoke on the new preview:
   - every page shows the button (desktop and phone)
   - **on a real phone**, open the panel and focus Message with the keyboard up; Send and Cancel are still reachable
   - a forged-cookie POST → 401
   - one real test note lands in `/admin/studio/previews` and is then marked Won't do
5. Only then send the link and password to the 4 reviewers.

## Recovery

Use the lightest level that fixes the problem. **Never drop schema while code that reads it is live.**

1. **Widget misbehaving on one preview:** switch it off with the admin toggle, or `update client_previews set feedback_enabled = false where slug = '<slug>';`. The next request serves the files byte-identical, and collected feedback is kept.
2. **Bug in the gate or feedback route:** roll back the application only, either by reverting the commits and pushing or with Vercel's instant rollback to the previous deployment. **Leave 089 in place.** The pre-feature code never references the column or the table, so it runs unchanged against the new schema.
3. **Removing the feature for good:** only after code that does not reference `feedback_enabled` is deployed and confirmed serving. First export every preview's feedback (Copy as markdown from each detail page, or a CSV of `select * from preview_feedback`). Then `DROP TABLE preview_feedback;` and `ALTER TABLE client_previews DROP COLUMN feedback_enabled;`.

## Out of scope

- Email or Slack alerts, screenshots, click-to-pin annotations (Ryan, 2026-10-22).
- Turning feedback on for existing previews (possible later with the admin toggle).
- Replies to reviewers, reviewer accounts, and editing or deleting a note from the widget.
- Linking feedback to Studio leads or engagements.
- JA/KO/ES widget copy.
- Attributing notes to a page shown inside an iframe of another preview page (D8; no current export does this).
- Returning the reviewer to their original page after re-entering the password. The gate still redirects to the entry page, and D13's draft carries the attribution instead.

## Risks

- **The in-memory rate limiter is per instance** (house convention, `lib/community/rate-limit.ts:1-2`). Every limit in D10 bounds one warm instance, not the deployment, and a cold start resets it. It is abuse damping, not a guarantee. The real gates are the cookie and the per-request body cap. The pre-auth bucket keys on `x-forwarded-for`, so a request that rotates that header can keep forcing one row read per request. That matches the existing gate's unauthenticated GET, which reads the row on every hit.
- **A legitimate reviewer sharing an IP with a flooder** can be pre-auth limited for up to 10 minutes. With 4 known reviewers on a private link, this is accepted.
- **The widget inherits the export's page context** (same origin, same window). A future export that sets a global `window.__hvPreviewFeedback` or monkey-patches `fetch` could interfere. That is unlikely, and the failure mode is a visible "Couldn't send".
- **The plaintext password model is unchanged.** Anyone with the password can post feedback, which is the intended audience.
- **D5 covers root replacement only.** If a future Claude Design export format replaces the whole document with `document.open()` / `document.write()`, the observer goes with the old document and the button will not appear. The page itself still works; the failure is no button, never a broken page. The D7 append fallback still places the script, but it cannot survive a full document replacement. **Repeat the Task 8 real-bundle run whenever the export format changes.**

## Review log

**Rev 3 (2026-10-22), after an external review of rev 2.** Verdict: "close to implementation-ready; no remaining architectural blocker". All seven points were checked and accepted:
- **Wrong upload directory:** verified that `dashboard.html` exists only under `C:/work/hawaiipalms/out/`, beside a raw bundle and `manifest.json` that a recursive upload would also send. Task 8 now assembles a dedicated `smoke-export/` directory and compares against it.
- **Row count off by one:** verified that the HTTP probe plus the three browser notes make 4 rows. Task 8 now expects 4, each identified by a distinct message.
- **First-time reviewer loses their name; false "saved" promise:** the draft now carries the name, and the 401 copy depends on whether the draft write succeeded (D13, Task 3).
- **A 201 could erase edits made while sending:** the whole form is now locked while a request is pending, and a deferred-fetch test covers it.
- **The simulated reload kept the old observer:** each page load in the widget tests is now a fresh JSDOM window, and the reload test asserts exactly one connected host.
- **Admin failure paths untested; zero-row updates looked like success:** both actions now throw on a zero-row update, and the status select and toggle revert with a visible error. All of it is tested.
- **Misleading empty state:** "No feedback yet." vs "No feedback matches these filters." with a reset.

**Rev 2 (2026-10-22), after an external review of rev 1.** The reviewer's verdict was "revise before implementation". Each finding was checked against the code before it was accepted.

Accepted and folded in:
- **Lost drafts after a 401** (P1) → D13 plus the full reload test in Task 3. One refinement on the suggestion: the draft is keyed by **preview**, not by preview+page, because the gate redirects to the entry page after a password POST (`route.ts:387`), so a page-keyed draft would never be found.
- **Unauthenticated requests spending the reviewer allowance** (P1) → two-stage limits (D10), `Retry-After`-based copy, the flood test, and the per-instance limitation written into Risks.
- **Page attribution** (P2) → D8 now states the supported behavior, which was verified (the chooser has no iframes). Page is captured when the draft starts, and its stored value is tested.
- **Unbounded body read** (P2) → `readBodyCapped` with byte counting. The body is now read only after the cookie is verified.
- **RLS tests passing for the wrong reason** (P2) → explicit error-code assertions, service-client re-reads after forbidden writes, a prod guard in `helpers/clients.ts`.
- **Skill contradictions** (P2) → Task 7 splits SQL/REST create vs update and replaces the byte-equality check for enabled previews.
- **Verification that could bypass the real code** (P2) → Task 8 now runs the real bundle through the real route on a local server backed by the test project, including the rotation drill and the admin pass, before anything reaches prod.
- **Destructive rollback** (P2) → the Recovery section.
- Also accepted: panel height bound and real-phone keyboard check; head-count queries and paging for `max_rows`; Markdown escaping and short ids in the export; narrowing the `document.write` claim; an `enabled = 0` ship query.

Declined or adjusted:
- **"Let the parent identify the active concept" for framed pages:** declined. No export frames another preview page, and D8 documents the boundary.
- **"Direct privilege assertions" inside the RLS suite:** adjusted. PostgREST can't read `information_schema`, so the suite asserts the behavior (`42501` for anon), and the grants query runs in the SQL editor on the test project (Task 1) and on prod (Ship).
- **Keep the scratch file screenshot as an extra rendering check:** dropped. Task 8 step 4 renders the same bundle through the real route at both widths, so it would only repeat that check.
