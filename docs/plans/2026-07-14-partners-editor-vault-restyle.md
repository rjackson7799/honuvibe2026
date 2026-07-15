# Partners editor — cosmetic port of the Vault look

## Context

`/admin/partners/[id]` and `/admin/vault/new` are both long bilingual admin forms, but they
look like two different products. The Vault editor was rebuilt into a five-step layout
(sticky header, numbered cards, left rail with scroll-spy); Partners was never updated and
still renders plain `<h2>` sections in a flat stack, with its own field classes that don't
match Vault's.

This change makes Partners *look* like Vault. It is **styling only** — no behavior changes,
no new features, no new computed state. Same fields, same handlers, same PATCH payload,
same API routes.

Ryan's standing convention is that plans live in `docs/plans/`. Plan mode requires this
file, so on execution this content gets persisted to
`docs/plans/2026-07-14-partners-editor-vault-restyle.md` before work starts.

## Locked decisions

| Decision | Choice |
|---|---|
| Extent | Full stepped port — sticky header + left rail + numbered cards + Vault field styling |
| Portal access | Step 5, inside the editor's scroll container |
| Rail meter | **Dropped.** Counting fields is new logic, not styling |
| Sharing | Move the three zero-logic files to a shared folder; re-point Vault's imports |
| Save button | Moves into the sticky header (same handler). Export CSV + Deactivate stay at the bottom |

## Non-goals (explicitly out)

- No "Landing page ready" / required-fields meter, and no `lib/partners/editor-progress.ts`.
- No changes to `VaultEditorHeader` or `VaultEditorNav` — their props and behavior are untouched.
- No JP translate assist on Partners (Vault's pattern would fit; it is a separate feature).
- No create flow — Partners stays edit-only, no `/admin/partners/new`.
- No changes to `/api/admin/partners/*`, the PATCH payload, or any DB/migration.

## Phase 1 — Extract the generics (pure move)

Three files have zero Vault-specific logic and are what actually produce the look. Move them
**byte-identical** from `components/admin/vault-editor/` to `components/admin/editor-shell/`:

- `section-card.tsx` — numbered card shell
- `field-classes.ts` — `inputClass` / `labelClass` / `selectClass` / `textareaClass` / `hintClass`
- `use-scroll-spy.ts` — IntersectionObserver spy + `scrollTo`

Then re-point imports in the 7 Vault files that consume them (`./section-card` →
`@/components/admin/editor-shell/section-card`, etc.):

`core-info-section.tsx`, `content-media-section.tsx`, `classification-section.tsx`,
`tags-section.tsx`, `relations-publish-section.tsx`, `downloads-panel.tsx`, `vault-editor.tsx`

No component API changes. Type-check proves the move is complete.

## Phase 2 — Build `components/admin/partner-editor/`

`AdminPartnerForm.tsx` is replaced by a folder mirroring Vault's structure. **All state and
handlers move across verbatim** — `patch`, `toggleCourse`, `moveCourse`, `handleSave`,
`handleDeactivate`, and the `saving` / `saveMessage` / `saveError` state machine are lifted
unchanged. Only markup and classes change.

- **`partner-editor.tsx`** — owns state (as `AdminPartnerForm` does today), renders header +
  rail + the five cards. Grid copied from `vault-editor.tsx:444`:
  `lg:grid-cols-[232px_minmax(0,1fr)]`, content column `max-w-[880px] space-y-5`.
  Note the existing warning there: arbitrary grid tracks are space-separated, `_` never `,`.
- **`partner-editor-header.tsx`** — sticky bar, styled to match `vault-editor-header.tsx`
  (`sticky top-0 z-20 ... bg-bg-primary/95 backdrop-blur`). Two rows, to keep the height at
  Vault's ~104px:
  - Row 1: `← All partners` (left) · `View landing ↗` + `Enrollments (n)` (right)
  - Row 2: serif name + mono slug + `StatusBadge` (left) · save message + `Save` (right)
- **`partner-editor-nav.tsx`** — the rail. Replicates the numbered-pill styling of
  `vault-editor-nav.tsx:42-74` (teal fill = active, `aria-current`), **without** the
  required-fields meter box. Vault's nav file is not touched.
- **Five section files**, each wrapping existing markup in `<SectionCard>`:

  | # | id | File | Content |
  |---|---|---|---|
  | 1 | `identity` | `identity-section.tsx` | slug, revenue share, name/tagline/description EN+JP |
  | 2 | `branding` | `branding-section.tsx` | logo URL, website URL, colors, contact email |
  | 3 | `visibility` | `visibility-section.tsx` | Active + Public toggles |
  | 4 | `featured-courses` | `featured-courses-section.tsx` | ordered list + `<details>` picker |
  | 5 | `portal-access` | — | `PartnerAdminManager`, see below |

  Local `inputClass` / `textareaClass` (`AdminPartnerForm.tsx:419-422`) are **deleted** —
  fields adopt the shell's classes, gaining `rounded-lg`, `bg-bg-tertiary` and the teal focus
  ring. The `Field` / `Grid` / `Toggle` / `ColorInput` helpers move into the section files
  restyled; their props and behavior are unchanged.

- **`PartnerAdminManager.tsx`** — outer `<section>` (line 93) and its `<h2>` + description
  block are replaced by `<SectionCard id="portal-access" number={5} title="Portal access">`,
  with the description as the first child. Its state, `grant`, `revoke`, and fetch calls are
  untouched. It is only imported by the partners page, so this is safe.

- **Bottom bar** — keeps `Export CSV` + `Deactivate` only (Save has moved up).

## Phase 3 — Page + cleanup

- `app/[locale]/admin/partners/[id]/page.tsx` — all queries and mapping stay as-is. Renders a
  single `<PartnerEditor ... initialAdmins={initialAdmins} />` instead of
  `<AdminPartnerForm>` + `<PartnerAdminManager>` siblings, so step 5 lives in the same scroll
  container the rail spies on. Wrapper becomes `max-w-[1200px]` to match Vault.
- Delete `components/admin/AdminPartnerForm.tsx`.
- `components/admin/StatusBadge.tsx` — add `inactive: mutedPill` + `inactive: 'Inactive'`.
  Purely additive presentation. (Without it the fallback still renders a gray "INACTIVE"
  pill, so this is a polish nicety, not a blocker.)

## Risks

- **Sticky offset.** The rail's `top-[104px]` is measured against Vault's two-row header. The
  Partners header must stay two rows or the rail will misalign — verify in browser and adjust
  the offset if the action row wraps at narrow widths.
- **Touching Vault.** Phase 1 edits a shipped, working editor. It is import paths only and
  type-check catches an incomplete move, but Vault still gets re-smoked (below).

## Verification

Per `CLAUDE.md`, before any commit:

1. `pnpm verify` (type-check → tests → build). Build needs
   `NODE_OPTIONS=--max-old-space-size=8192` or it OOMs at exit 134.
2. Type-check is the real gate on Phase 1 — an unmoved import fails the build.
3. Browser smoke, EN and `/ja`:
   - `/admin/vault/new` and `/admin/vault/[id]` — **regression check** for the file move:
     cards render, rail highlights on scroll, required-fields meter still works, save/publish
     unaffected.
   - `/admin/partners/[id]` — rail tracks all five sections including Portal access; Save in
     the header persists and shows the message; Export CSV + Deactivate still work; course
     add/remove/reorder unchanged; light + dark.
4. No RLS/migration changes, so `pnpm test:rls` is not required.
5. Independent adversarial review (`requesting-code-review`) before commit — the review should
   confirm no behavior drifted, since this is a styling-only change.
