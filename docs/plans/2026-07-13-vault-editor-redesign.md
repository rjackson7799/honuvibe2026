# Vault Content Editor Redesign — sticky header, 5-step scroll nav, tag pills, EN→JP translate

> On approval, copy this file to `docs/plans/2026-07-13-vault-editor-redesign.md` (project convention) before executing.

## Context

The admin Vault "New Content" form ([components/admin/AdminVaultDetail.tsx](components/admin/AdminVaultDetail.tsx), 1,278 lines) is a single flat scrolling form with checkbox tag lists, no orientation aids, and no way to get EN content into Japanese without typing it by hand. Ryan supplied a concept mockup: sticky header with **Save draft / Create Content** actions, a left **"SETUP · 5 STEPS"** scroll navigator with a required-fields progress meter, the form grouped into 5 numbered cards, tags as teal pill toggles, and **Translate to JP** buttons.

Decisions confirmed with Ryan:
- **Translate** = fill JP form fields for human review (workbench pattern — never writes DB directly). Scope: title + description, plus article body when `content_type === 'article'`.
- **Save draft** = save (as draft) and stay in the editor; **Create Content** = save and go to the edit view. Both keep `is_published: false`; publish remains the separate validated step.
- **Scroll navigator**, not a true wizard — one scrolling form, nav highlights section in view.
- Redesign serves **edit mode too** (same component); edit-only sections fold into the 5 steps.

**No DB migration needed** — all columns exist (`title_jp`/`description_jp` on `content_items`, `body_jp` via `vault_article_bodies`). "Machine translated" indicators are session-local UI state only.

## What exists to reuse

| Piece | Where |
|---|---|
| EN→JP translate route pattern (zod in, JSON out, no DB write) | [app/api/admin/workbench/translate/route.ts](app/api/admin/workbench/translate/route.ts) |
| Fetch → parse → one corrective retry → zod validate loop | `runAuthoringCall` in [lib/workbench/authoring.ts:218](lib/workbench/authoring.ts#L218) (currently module-private) |
| Model config (claude-sonnet-4-6, `ANTHROPIC_API_KEY`, translate temp 0.2) | [lib/workbench/models.ts](lib/workbench/models.ts) `AUTHORING_MODEL` |
| JP tone system prompt (です/ます, keep AI/API terms, JSON only) | [lib/courses/translator.ts:74-89](lib/courses/translator.ts#L74-L89) |
| Client translate-button pattern (`translating`, `machineFilled` set, confirm-before-overwrite) | [components/admin/AdminWorkbenchScenarioForm.tsx:257-305](components/admin/AdminWorkbenchScenarioForm.tsx#L257-L305) |
| Stepper visual language | [components/admin/wizard/WizardProgress.tsx](components/admin/wizard/WizardProgress.tsx) |
| Save/publish server actions (contracts unchanged) | [lib/vault/actions.ts](lib/vault/actions.ts) — `createVaultItem` (114), `updateVaultItem` (174), `publishVaultItem` gate (215) |
| Inline admin auth guard for API routes | copy from workbench translate route (getUser + `users.role === 'admin'`) |

## Implementation

### 1. Translate backend

**Modify [lib/workbench/authoring.ts](lib/workbench/authoring.ts):** add `export` to `runAuthoringCall`; add optional `maxTokens?` / `timeoutMs?` to its opts, threaded into `callAuthoringModel` (defaults = current `AUTHORING_MODEL` values; no behavior change for workbench callers).

**New `lib/vault/translate.ts`:**
- `vaultTranslateInputSchema` — `{ title_en, description_en, body_en }`, each `string|null`, `.refine` at least one non-null. One shape handles both buttons (no second route).
- `vaultTranslationResultSchema` — `{ title_jp, description_jp (max 500), body_jp }`, nullable mirroring input.
- `buildVaultTranslatePrompt(input)` — tone rules copied from the course translator, plus: description ≤ 500 chars; body must preserve Markdown structure exactly (code blocks untranslated); null in → null out.
- `translateVaultContentToJp(input)` → `runAuthoringCall(..., { contextLabel: 'Vault translate assist', temperature: 0.2, maxTokens: input.body_en ? 16000 : 2000, timeoutMs: input.body_en ? 100_000 : 60_000 })`.

**New `app/api/admin/vault/translate/route.ts`:** verbatim structure of the workbench translate route — inline admin guard, `safeParse` → 400, `AuthoringError` → 502 with code, `export const maxDuration = 120`.

### 2. Progress meter

**New `lib/vault/editor-progress.ts`** — pure `getRequiredChecks({ contentType, titleEn, slug, url, bodyEn, toolWidgetKey })` returning `{ key, label, done }[]`, grounded in the publish gate:

| content type | checks |
|---|---|
| video / workshop | Title (EN), Slug, Content URL → 3 |
| article | Title (EN), Slug, Body (EN) → 3 |
| tool | Title (EN), Slug, Widget key → 3 |
| template / prompt_pack | Title (EN), Slug → 2 (attachments only exist after save) |

Nav renders `Required fields · {done} of {total} complete` + thin teal bar. **Informational only** — the save gate stays exactly today's `canSave` (`title_en && (!urlRequired || url)`).

### 3. Component decomposition — new `components/admin/vault-editor/`

Delete `AdminVaultDetail.tsx`; replace with an orchestrator + section files. **Keep the ~40 per-field `useState` hooks as-is in the orchestrator** (no reducer rewrite — `handleSave` and initializers move verbatim; sections get typed value/setter props). Exception: the 7 self-contained download-form hooks move into `downloads-panel.tsx`.

| File | Contents |
|---|---|
| `vault-editor.tsx` | `'use client'` orchestrator: all state, save/publish/delete/translate handlers, `machineFilled: Set<'title_jp'\|'description_jp'\|'body_jp'>`, scroll-spy wiring. Same props as `AdminVaultDetailProps`. |
| `vault-editor-header.tsx` | Sticky top bar. Create: Back · "New Content" · "Draft — not saved" · `[Save draft]` `[Create Content]`. Edit: Back · title · StatusBadge · `[Save changes]` · Publish/Unpublish. Save message/error inline. Delete moves to a step-5 danger zone. |
| `vault-editor-nav.tsx` | Left sticky panel: `SETUP · 5 STEPS` overline, numbered items (teal fill = active, check = complete), progress meter. Hidden below `lg:`. |
| `section-card.tsx` | Shared card shell: numbered badge + title + optional right `meta` slot (e.g., "4 selected", translate button); `scroll-mt-24`, id + ref for scroll spy. |
| `core-info-section.tsx` | Step 1: slug (auto-from-title on blur, unchanged), title EN/JP, descriptions with counters. **Translate to JP** button in meta slot; gold "machine translated" tag on JP labels when in `machineFilled`. |
| `content-media-section.tsx` | Step 2: **Content Type select moves here** (it drives this card — deliberate UX change, flag in commit). Conditional article MDEditor block (dynamic `ssr:false` import + CSS move here) with **Translate body to JP** button; workshop details; tool widget; then url/embed/YouTube preview/duration/author/date/AiImageUploader (edit) or "save first" note (create). |
| `classification-section.tsx` | Step 3: difficulty, language, access tier, featured. |
| `tags-section.tsx` | Step 4: pill toggles, all 5 categories incl. Industry; meta = "N selected". |
| `relations-publish-section.tsx` | Step 5: series + order, related course, VaultRelatedPicker, admin notes, partner select + inline save (edit), freshness (edit), downloads panel (edit), publish checklist + Publish/Unpublish mirror, bordered danger zone with Delete. Create shows the "save first" notes. Prompt-pack editor stays in step 2 (prompts are that type's content). |
| `downloads-panel.tsx` | Self-contained upload/list/delete; props `itemId`, `downloads`. |
| `use-scroll-spy.ts` | Hook (below). |

**Modify [app/[locale]/admin/vault/[id]/page.tsx:6](app/[locale]/admin/vault/[id]/page.tsx#L6):** import swap only (`AdminVaultDetail` → `VaultEditor`). It's the sole consumer; data loading unchanged.

### 4. Layout & scroll spy

Page shell inside `AdminLayout` (main scrolls with window, so `sticky` works):

```
max-w-[1200px]                          ← was 880px
  sticky header (top-0 z-20, bg-bg-primary/95 backdrop-blur, border-b)
  lg:grid lg:grid-cols-[232px,minmax(0,1fr)] lg:gap-8 items-start
    nav: hidden lg:block lg:sticky lg:top-[76px]
    form column: space-y-5 max-w-[880px]   ← field widths unchanged
```

Scroll spy: IntersectionObserver over the 5 always-mounted cards, `rootMargin: '-40% 0px -55% 0px'`; nav click → `scrollIntoView({ behavior: 'smooth' })` with `scroll-mt-24` clearing the header; bottom-of-page counts as step 5; brief pinned-active override after click to avoid flicker. Watch MDEditor toolbar z-index vs the sticky header.

### 5. Tag pills

Replace checkbox labels with `<button type="button" aria-pressed>`:
- Unselected: `rounded-full border border-border-default bg-bg-tertiary px-3 py-1.5 text-[13px] text-fg-secondary hover:border-border-hover`
- Selected: teal border/bg/text via tokens + `<Check size={13}/>`. Keep `tag.name_en (name_jp)` labels and `handleTagToggle` untouched. (`ui/tag.tsx` is a static display chip — not reusable here.)

### 6. Translate wiring (client)

Two handlers in `vault-editor.tsx`, both POST `/api/admin/vault/translate` (pattern from AdminWorkbenchScenarioForm):
- **Core** (step 1): needs `titleEn`; confirm if JP title/description non-empty; sends `{ title_en, description_en|null, body_en: null }`; on success fills fields + adds to `machineFilled`.
- **Body** (step 2, article only): needs `bodyEn`; confirm if `bodyJp` non-empty; sends body only.
- Shared `translating` state disables both; errors in a coral banner; editing a JP field removes it from `machineFilled` (human-reviewed). Nothing persists until normal save — satisfies the "no machine translation without human review" rule.

### 7. Save-button semantics

- **Create — Save draft:** `createVaultItem` → `router.replace('/admin/vault/${id}')` — stays "in place", editor remounts in edit mode, image/downloads unlock, no dead `/new` history entry.
- **Create — Create Content:** same `createVaultItem` → `router.push(...)` (today's behavior), arriving at the canonical edit URL ready to publish.
- **Edit:** single **Save changes** (current `updateVaultItem` + refresh + inline "Saved"). Both create buttons share today's `canSave`.

## Tests (vitest, mirror existing suites)

- `__tests__/vault/translate.test.ts` — mirror `__tests__/workbench/authoring.test.ts` (stub fetch): prompt rules (です/ます, markdown preservation, 500-char cap, null passthrough), schema accept/reject, temp 0.2, maxTokens 16000/2000 split, parse-retry, CONFIG/PROVIDER/SCHEMA errors.
- `__tests__/api/vault-translate-auth.test.ts` — 401/403/400 (style of `tutoring-publish-auth.test.ts`).
- `__tests__/lib/vault/editor-progress.test.ts` — table-driven per content type.
- `__tests__/components/admin/vault-tags-section.test.tsx` — pill toggle, `aria-pressed`, count.

## Execution order (each step leaves `pnpm verify:fast` green)

1. `authoring.ts` export + opts → `lib/vault/translate.ts` + tests.
2. Translate API route + auth tests.
3. `editor-progress.ts` + tests.
4. Scaffold shell: `section-card`, header, nav, `use-scroll-spy`.
5. **Mechanical extraction** (moved, not rewritten): state → `vault-editor.tsx`, JSX → section files; swap page import; delete old file.
6. Tag pills + card meta counts.
7. Translate buttons + `machineFilled` UX.
8. Save draft / Create Content split + header polish.
9. Full gate + review + smoke.

## Edge cases

- Content-type switch mid-edit reshapes step 2 + meter denominator — pure-function recompute; observer set stable (cards always mounted).
- MDEditor dynamic import/CSS moves with the article block; verify `data-color-mode` rendering and toolbar z-index.
- Translate double-click guarded; overwrite confirm scoped to the fields that call fills; very long article bodies may hit PARSE/PROVIDER 502 — surfaced in the banner, documented as manual-translate fallback.
- Partner inline save + main save both write `partner_id` — preserved.
- Tool JSON validation, workshop datetime UTC conversion, slug-on-blur, delete confirm, publish gate — unchanged.
- Mobile `< lg`: nav hidden, sticky header stays, cards full width.
- `ANTHROPIC_API_KEY` already used project-wide but missing from `.env.local.example` — add it there.

## Verification

1. `pnpm verify` (type-check → tests → build); new suites green. No migration, so no `test:rls` needed.
2. Manual EN smoke on `/en/admin/vault/new`: meter fills 0→3; type switch updates checks; Save draft → URL replaces to `/admin/vault/{id}` with image/downloads unlocked; Create Content → pushes to edit; translate core + body fill JP with gold tags and confirm-on-overwrite; tag pills + count; scroll spy 1→5 + click-to-scroll; publish gate per type; downloads; prompt pack; delete via danger zone.
3. Manual `/ja/admin/vault/...` smoke: locale-prefixed routing + back links + replace/push paths behave.
4. Visual: sticky header vs MDEditor toolbars, 1200px layout at 1280/1024/768.
5. Adversarial code review (`requesting-code-review` sub-agent) before commit, per workflow.
