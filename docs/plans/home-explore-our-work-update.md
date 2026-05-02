# Home — Explore Our Work: Add Images + Swap MamaTree → Harper's Circle

## Context

The home page "Explore Our Work" section currently renders three project cards (KwameBrathwaite.com, MamaTree Market, HonuHub Scheduler) with hardcoded pastel background colors instead of real imagery. Two changes are needed:

1. Replace the flat color blocks with actual project images.
2. Swap **MamaTree Market** for **Harper's Circle** — a family-care app for the relatives of aging parents. Per Ryan: "Warmth flows toward the people you care for. Logistics stays among the family. The relationship stops being something you coordinate over."

Discovery note: the `/explore` page does **not** reference MamaTree. It has its own two-project list (Kwame, HCI Medical) in [components/marketing/explore/featured-projects.tsx:24-43](components/marketing/explore/featured-projects.tsx#L24-L43). So this change is home-only. See "Optional follow-up" at the bottom for adding Harper's Circle to `/explore` as a third featured project.

## Where to upload the images

The project's actual image convention is `public/projects/<project-key>/` (used by `/explore`). Existing folders:

- `public/projects/kwame-brathwaite/` → `KB_1.jpg`, `KB_2.jpg`, `KB_3.jpg`
- `public/projects/hci-medical/` → `HCI_1.jpg`, `HCI_2.jpg`, `HCI_3.jpg`

**Upload to:**
- `public/projects/harpers-circle/HC_1.jpg` (new folder, new file)
- `public/projects/honuhub-scheduler/HHS_1.jpg` (new folder, new file)
- KwameBrathwaite already has `public/projects/kwame-brathwaite/KB_1.jpg` — reuse it.

Naming follows the existing `<INITIALS>_1.jpg` pattern so future `/explore`-style multi-image carousels can drop in `_2.jpg`, `_3.jpg` without churn.

**Image specs** (card slot is `h-40` ≈ 160px tall, ~360px wide on desktop, full width on mobile):
- Aspect ratio: ~16:9 or 3:2; cards crop with `object-cover`
- Recommended export: 1200×675 WebP or JPG, < 150KB each

## Files to modify

### 1. [components/marketing/home/exploration.tsx](components/marketing/home/exploration.tsx)

- Add `import Image from 'next/image'`.
- Replace the `projectColors` const (line 10) with a `projectImages` array of `{ src, alt }`:
  - `{ src: '/projects/kwame-brathwaite/KB_1.jpg', alt: 'KwameBrathwaite.com homepage' }`
  - `{ src: '/projects/harpers-circle/HC_1.jpg', alt: 'Harper\'s Circle app interface' }`
  - `{ src: '/projects/honuhub-scheduler/HHS_1.jpg', alt: 'HonuHub Scheduler interface' }`
- Update `projectTags` (lines 12–16) — change index 1 to `['Next.js', 'Supabase', 'Claude AI']` (Harper's Circle).
- Replace the colored `<div>` block (lines 54–66) with `next/image`:
  ```tsx
  <div className="relative h-40 overflow-hidden">
    <Image
      src={project.image.src}
      alt={project.image.alt}
      fill
      sizes="(min-width: 768px) 33vw, 100vw"
      className="object-cover"
    />
    <div
      className="absolute inset-0 opacity-40"
      style={{ background: 'linear-gradient(160deg, transparent 60%, rgba(26,43,51,0.15))' }}
      aria-hidden
    />
  </div>
  ```
- Keep the gradient overlay for legibility/depth.

### 2. [messages/en.json](messages/en.json) (lines 2263–2264)

```diff
-      "project_2_title": "MamaTree Market",
-      "project_2_desc": "Local farmers market e-commerce with AI product descriptions.",
+      "project_2_title": "Harper's Circle",
+      "project_2_desc": "One app for the family caring for aging parents — warmth out, logistics in.",
```

### 3. [messages/ja.json](messages/ja.json) (lines 2263–2264)

```diff
-      "project_2_title": "MamaTree Market",
-      "project_2_desc": "AIによる商品説明文を活用したローカルファーマーズマーケットのEC。",
+      "project_2_title": "Harper's Circle",
+      "project_2_desc": "高齢の親を介護する家族のための一つのアプリ。温かさは届け、調整は家族の中で完結する。",
```

(JP copy is a draft — flag for human review per project i18n rules.)

### 4. [__tests__/marketing/home/home-sections.test.tsx](__tests__/marketing/home/home-sections.test.tsx) (line 161)

```diff
-    expect(screen.getByText('MamaTree Market')).toBeInTheDocument();
+    expect(screen.getByText("Harper's Circle")).toBeInTheDocument();
```

## Verification

1. `npm run dev` → load `/` and `/ja`, confirm all three cards render with images, no layout shift, gradient overlay still visible over each image, hover lift still works.
2. Confirm the Harper's Circle card shows the new title/desc + new tags in both EN and JP.
3. `npm test -- home-sections` → confirm the updated assertion passes.
4. `npm run build` → no type errors, next/image resolves the local paths.
5. Lighthouse on `/` mobile → LCP should stay < 2.5s. The exploration section is below the fold, so leave images lazy (no `priority`).

## Optional follow-up (not in this pass)

Adding **Harper's Circle** as a third featured project on `/explore` would require:
- A new `key: 'harpers-circle'` entry in [components/marketing/explore/featured-projects.tsx](components/marketing/explore/featured-projects.tsx) PROJECTS array.
- Carousel images: `HC_1.jpg`, `HC_2.jpg`, `HC_3.jpg` in `public/projects/harpers-circle/`.
- New translation block under `explore.featured_projects.harpers-circle` in both message files.

Confirm with Ryan whether to bundle this now or as a separate task.
