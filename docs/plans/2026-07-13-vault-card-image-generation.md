# Vault Content — AI Card Image Generation (ChatGPT / gpt-image)

> Persist the canonical copy at `docs/plans/2026-07-13-vault-card-image-generation.md` during execution
> (Ryan's convention: plans live in `docs/plans/`, not `.claude/plans/`).

## Context

Vault content cards (`/learn/vault`) currently ship **no card image** — every card falls back to a
slug-hashed pastel gradient with a faint type icon. We want admin-generated card background images,
created with **ChatGPT / OpenAI image generation**, driven by the item's title, managed per-item from
the Vault admin editor.

**Key correction to the original premise:** courses do **not** use "nanobanana." There is zero
nanobanana anywhere in the repo. The course card-image feature *already* uses OpenAI's
`gpt-image-2` model via the `openai` SDK. So this work is **porting the existing OpenAI course-image
pipeline onto Vault items** — not swapping providers. All the plumbing we need already exists:

- `openai@^6.35.0` + `sharp@^0.34.5` installed; `OPENAI_API_KEY` already configured in prod (course
  image gen is live).
- Public storage bucket **`vault-public`** already created (migration `041_vault_access_boundary.sql`,
  public read + `is_admin()` write, earmarked for "thumbnails"). Nothing writes to it yet.
- `content_items.thumbnail_url` column already exists; the public card
  ([VaultContentCard.tsx](components/vault/VaultContentCard.tsx#L69-L108)) already renders it via
  `next/image object-cover` and falls back to the gradient when null.
- Supabase public-storage host already whitelisted in [next.config.ts](next.config.ts#L98-L102).

**Net: no DB migration and no new env var.** This is a UI + one API route + a small type widening.

### Decisions locked (from user)
- **Text in image:** ALLOW tasteful conceptual labels / UI-mockup / diagram elements like the reference
  attachment (not the course pipeline's strict "no text"). Caveat recorded below.
- **Component:** GENERALIZE the existing course uploader into ONE shared component used by both
  courses and Vault (touches the working course editor → courses get re-smoked in Verify).
- **Model:** `gpt-image-2` (match the live course route exactly).

### Bilingual caveat (accepted)
A single `thumbnail_url` is shared across the EN and JA card for an item — there is no per-locale image.
Any label the model bakes in is whatever it chose (usually English, or Japanese for JP-topic items, as
the reference "Japanese Business" card shows). This is decorative art, not translated content; if a
locale-appropriate variant is wanted the admin just regenerates. No per-locale image support in scope.

## Reference implementation (clone / generalize these)
- Route to clone: [app/api/admin/courses/generate-image/route.ts](app/api/admin/courses/generate-image/route.ts) — full auth→prompt→`openai.images.generate`→`sharp` crop→upload→DB-write flow.
- Manual-upload route to clone: [app/api/admin/courses/upload-image/route.ts](app/api/admin/courses/upload-image/route.ts).
- UI to generalize: [components/admin/course-image-uploader.tsx](components/admin/course-image-uploader.tsx) (Generate / Regenerate / Upload / Remove).
- Insertion point: read-only Thumbnail block in [AdminVaultDetail.tsx:734-746](components/admin/AdminVaultDetail.tsx#L734-L746).

## Implementation

### 1. Generalize the uploader → shared `AiImageUploader`
Refactor `components/admin/course-image-uploader.tsx` into
`components/admin/ai-image-uploader.tsx` (`AiImageUploader`). Keep all existing behavior/markup; make
the coupling into props:
- `entityId: string`, `idField: string` (course sends `'courseId'`, vault sends `'itemId'`)
- `imageType: string`, `generateEndpoint: string`, `uploadEndpoint: string`
- `currentUrl`, `onUploadComplete`, `onRemove`, plus `aspectClass` + `maxSizeBytes` (defaulted).

Request bodies become `{ [idField]: entityId, imageType }` (JSON for generate; FormData for upload).
Update the two course call sites in
[AdminCourseDetail.tsx:326-361](components/admin/AdminCourseDetail.tsx#L326-L361) to the shared
component (`idField="courseId"`, course endpoints) and delete the old file.

### 2. New Vault image routes
- `app/api/admin/vault/generate-image/route.ts` — clone of the course route with these changes:
  - Same inline admin guard (401/403), same cookie-scoped `createClient()` (the `vault-public`
    admin-write RLS is identical `is_admin()` to `course-images`, which this pattern already satisfies).
  - Body: `{ itemId }` (single card image; ignore/accept `imageType`).
  - Select prompt context from `content_items`: `title_en, description_en, difficulty_level,
    content_type, tags`.
  - New `buildVaultImagePrompt()` (see §4) — allows conceptual labels.
  - Reuse the 16:9 `cropToAspect` (1536×864) — works on both the wide `/learn/vault` card and the
    16:9 learn-dashboard card via `object-cover`.
  - Upload to bucket **`vault-public`** at `${itemId}/card.jpg` (`upsert: true`), `getPublicUrl` +
    `?v=${Date.now()}`, then `update content_items.thumbnail_url`.
  - `export const maxDuration = 120;`
- `app/api/admin/vault/upload-image/route.ts` — clone of the course upload route targeting
  `vault-public` + `content_items` (`itemId`, single type, 2 MB limit).

### 3. Wire uploader into the Vault editor
Replace the read-only block at [AdminVaultDetail.tsx:734-746](components/admin/AdminVaultDetail.tsx#L734-L746):
- `isCreate` → keep "Save the content first, then manage the thumbnail."
- else → render `<AiImageUploader entityId={item.id} idField="itemId" imageType="thumbnail"
  currentUrl={item.thumbnail_url} generateEndpoint="/api/admin/vault/generate-image"
  uploadEndpoint="/api/admin/vault/upload-image" onUploadComplete={() => router.refresh()}
  onRemove={async () => { await updateVaultItem(item.id, { thumbnail_url: null }); router.refresh(); }} />`
- `useRouter` is already imported. `handleSave` stays unchanged — it omits `thumbnail_url`, so the
  route-written value is never clobbered by a later Save.

### 4. Vault prompt (`buildVaultImagePrompt`)
Adapt the course `buildImagePrompt`. Keep the HonuVibe house style (soft 3D glassmorphic, light
cream/seafoam grounds, seafoam-teal primary + coral accent, no dark/neon). Reuse `getLevelMood`.
**Change the text rule** to allow labels, e.g.:
> "You MAY include a few small, tasteful conceptual elements that reinforce the topic — a simplified
> app/UI mockup, a labeled flow diagram, or icon panels — rendered cleanly as part of the illustration.
> Keep any text minimal, legible, and topical (short labels only — no paragraphs, no gibberish, no
> watermarks). For Japanese-business topics, labels may be in Japanese."

Add a small `getTypeMotif(content_type)` hint (video→play/screen, template→document/table,
tool→dashboard/widget, workshop→session/whiteboard, prompt_pack→chat/prompt cards, article→editorial)
to push the reference look. Compose as a wide card banner with the key subject horizontally centered.

### 5. Type widening
In [lib/vault/types.ts:309](lib/vault/types.ts#L309) widen `thumbnail_url?: string` →
`thumbnail_url?: string | null` so the Remove action's `updateVaultItem(id, { thumbnail_url: null })`
type-checks. `updateVaultItem` already spreads provided fields, so runtime is unaffected.

## Files
- Add: `components/admin/ai-image-uploader.tsx`, `app/api/admin/vault/generate-image/route.ts`, `app/api/admin/vault/upload-image/route.ts`
- Modify: `components/admin/AdminCourseDetail.tsx` (use shared component), `components/admin/AdminVaultDetail.tsx` (wire uploader), `lib/vault/types.ts` (widen)
- Delete: `components/admin/course-image-uploader.tsx`
- No migration, no new env var.

## Verification
1. **Pre-req:** confirm the `vault-public` bucket exists in prod (dashboard → Storage on
   `zvfwtndbxshrtpwcwynw`). Vault is already live, so migration 041 should be applied — verify before relying on generation in prod.
2. `pnpm verify` (type-check → tests → build) green. `pnpm verify:fast` for inner loops.
3. **Vault smoke (admin):** open `/admin/vault/<existing-id>` → **Generate with AI** → image appears;
   confirm `content_items.thumbnail_url` is set; confirm the card now shows the image on `/learn/vault`
   **and** `/ja/learn/vault`. Exercise **Regenerate**, **Upload/Replace**, **Remove** (card reverts to
   gradient). Verify a Japanese-topic item produces topical labels; verify EN/JA cards render cleanly.
4. **Courses regression** (component was generalized): open `/admin/courses/<id>` and confirm
   thumbnail + hero Generate / Upload / Remove still work.
5. **Review (required, before commit):** independent adversarial pass (`requesting-code-review`) on the
   diff. **Ship:** commit direct to `main`, push, hooks green (pnpm, no branches).
