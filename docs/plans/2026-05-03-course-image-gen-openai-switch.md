# Course Image Generation: Switch Gemini → OpenAI (gpt-image-1)

## Context

The admin course detail page has a "Generate with AI" / "Regenerate" button on each course image (thumbnail 16:9, hero 21:9) that currently calls Gemini's `gemini-3-pro-image-preview`. The current prompt biases toward "dark, deep backgrounds" — a holdover from the old aesthetic. We've since redesigned home and partnership cards around a lighter, glassmorphic, pastel-3D aesthetic (e.g. `public/images/partnerships/partnership-*.png`), and new course thumbnails should match.

**Goal:** Replace Gemini with OpenAI `gpt-image-1` for course image generation, using a new style prompt that produces visuals matching the partnerships card aesthetic.

## Changes

### 1. Add `openai` dependency

```
npm install openai
```

Reason: cleaner than REST for typed responses, matches what the codebase will likely use elsewhere as more AI features land. (Sharp is already installed.)

### 2. Rewrite [app/api/admin/courses/generate-image/route.ts](app/api/admin/courses/generate-image/route.ts)

Keep auth/admin checks, course fetch, Supabase Storage upload, and DB update logic as-is. Replace only the generation call and prompt builder.

**Key changes:**

- Read `process.env.OPENAI_API_KEY` instead of `GEMINI_API_KEY`.
- Use `openai.images.generate({ model: 'gpt-image-1', prompt, size: '1536x1024', quality: 'high', n: 1 })`. Response contains base64 PNG in `data[0].b64_json`.
- After receiving the 1536×1024 PNG, crop with `sharp` to:
  - Thumbnail (16:9): `1536×864`, top-cropped to keep horizon centered (`sharp(buf).extract({ left: 0, top: 80, width: 1536, height: 864 })`).
  - Hero (21:9): `1536×658`, center-cropped vertically.
- Encode to JPEG (`.jpeg({ quality: 88, mozjpeg: true })`) to stay well under the 2MB / 5MB limits, then upload as `image/jpeg` with `.jpg` extension. Storage path stays `${courseId}/${imageType}.jpg` (upsert will overwrite any prior `.png`).
- Replace `buildImagePrompt` style guidance (lines 54–61) with the new aesthetic (see below). Composition guidance still differs by `imageType`.

**New style guidance block:**

```
Visual style: soft, modern 3D-rendered illustration with a glassmorphic, premium-tech feel.
Background: light cream, off-white, or pale seafoam — never dark.
Composition: floating geometric forms (spheres, soft cubes, network nodes, layered translucent panels) representing the course topic abstractly.
Materials: matte and glassy surfaces with subtle depth, soft shadows, gentle dotted-grid accents, occasional pastel coral spheres for warmth.
Color palette: seafoam teal as primary, coral as occasional accent, pale neutral grounds. No deep navy or dark backgrounds. No neon glows.
Mood: calm, intelligent, optimistic — premium AI education brand. Avoid generic stock-photo aesthetics, neon cyberpunk, or busy compositions.
Absolutely no text, letters, numbers, or words anywhere in the image.
```

Composition by type:
- **Thumbnail:** "Centered focal subject readable at small sizes. Plenty of clean negative space. Light cream/seafoam ground."
- **Hero:** "Wider scene with visual interest at the edges and a calm open center where overlay text will sit. Cinematic horizontal flow. Light cream/seafoam ground."

`getLevelMood()` keeps existing branching but rewords for the lighter aesthetic (e.g. beginner → "open, airy, welcoming"; advanced → "richer composition with more layered geometry, still calm and uncluttered").

Set `export const maxDuration = 120;` — `gpt-image-1` at `quality: 'high'` can take 30–60s.

### 3. Add to [.env.local.example](.env.local.example)

```
# OpenAI (course image generation)
OPENAI_API_KEY=
```

(User confirmed `OPENAI_API_KEY` is already set in their local `.env.local`.)

### 4. Frontend — no changes

[components/admin/course-image-uploader.tsx](components/admin/course-image-uploader.tsx) already POSTs to `/api/admin/courses/generate-image` with the same body shape and reads `data.url`. Endpoint contract stays identical.

## Files to modify

- [app/api/admin/courses/generate-image/route.ts](app/api/admin/courses/generate-image/route.ts) — full rewrite of generation block + prompt; keep auth/storage scaffolding
- [.env.local.example](.env.local.example) — add `OPENAI_API_KEY`
- [package.json](package.json) — `openai` added via `npm install`

## Files to leave alone

- [components/admin/course-image-uploader.tsx](components/admin/course-image-uploader.tsx)
- [components/admin/AdminCourseDetail.tsx](components/admin/AdminCourseDetail.tsx)
- [app/api/admin/courses/upload-image/route.ts](app/api/admin/courses/upload-image/route.ts) (manual upload path)

## Reused utilities

- `createClient` from [lib/supabase/server.ts](lib/supabase/server.ts) — auth + storage + DB
- `sharp` (already in `package.json`) — server-side crop + JPEG encode

## Verification

1. **Env check:** `OPENAI_API_KEY` present in `.env.local`. `npm run dev` boots without errors.
2. **Type check:** `npm run typecheck` (or `tsc --noEmit`) passes.
3. **Manual happy path:**
   - Sign in as admin, open `/admin/courses/[id]` for an existing draft course (e.g. AI Mastery).
   - Click **Regenerate** on the thumbnail. Confirm: spinner shows "Generating with AI…", request completes within ~60s, new image renders in the 16:9 frame.
   - Open the resulting image directly — confirm dimensions are exactly 1536×864 (16:9) and file is JPEG under 2MB.
   - Repeat for hero — confirm 1536×658 (21:9) and under 5MB.
4. **Style check:** Generated image matches the partnerships-card aesthetic — light cream/seafoam ground, soft 3D forms, teal/coral accents, no dark backgrounds, no text artifacts.
5. **Error paths:**
   - Temporarily unset `OPENAI_API_KEY` → endpoint returns 500 with clear message.
   - Send invalid `imageType` → 400.
6. **DB check:** `courses.thumbnail_url` / `courses.hero_image_url` updated to the new public URL; `updated_at` bumped.
7. **Course-card surfaces:** Visit `/learn` and homepage featured-courses section — confirm new image displays correctly in cards.

## Out of scope

- Migration of existing course images (thumbnail/hero already populated). Admin can regenerate per-course as desired.
- Bulk regeneration tooling.
- JP-specific prompt variants — current English prompt is fine for the abstract visual style.
- A style selector / dark-mode fallback (rejected during planning — fully replacing the style).
