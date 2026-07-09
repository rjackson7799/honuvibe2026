# 1v1 Session Report — Branded Document Export (PDF + DOCX)

- **Date:** 2026-07-08
- **Status:** Design approved (brainstorm complete) — awaiting spec review before plan
- **Area:** Admin › 1v1 Sessions (private tutoring)
- **Type:** Additive feature (no schema change, no RLS change)

## Problem

The 1v1 Sessions flow generates a bilingual diagnostic report, an admin reviews/edits it,
and publishing surfaces it on the student's dashboard and emails them a link. There is
currently **no way to produce a document** of that report. Ryan wants to mail/hand Shiori a
polished, HonuVibe-branded artifact, and wants his own full copy to work from in the next
session. Today the only delivery is the web view + a link email — no attachment, no print
stylesheet, no export path anywhere in the tutoring code.

## Goal

Add download-only document export to the admin report review panel:

1. **Student copy** — the student-safe report (`student_json`), bilingual, HonuVibe-branded,
   safe to mail to Shiori. Mirrors what she already sees on her dashboard.
2. **Teacher copy** — the full report (`instructor_json`) including the instructor analysis
   and homework answer keys, clearly marked so it is never mailed to the student. For Ryan to
   use while running the next session.

Each copy is available as **PDF** and **.docx**. No auto-attach to email — buttons produce a
download; Ryan sends it himself.

A secondary goal, surfaced during design: **fix Japanese formatting** in the branded PDF
output (see "Japanese formatting fix").

## Decisions (locked during brainstorm)

| Decision | Choice |
| --- | --- |
| Formats | Both PDF and .docx |
| Delivery | Download button only — no email attachment |
| Content variants | Two: **student** (`student_json`) and **teacher** (`instructor_json`) |
| Language | Bilingual, English then Japanese stacked, matching the dashboard view |
| Branding | Reuse the syllabus PDF brand system (dark header bar, teal accent, DM Sans / Noto Sans JP) |
| Storage | None — generate on the fly and stream as an attachment (no bucket, no cleanup) |
| Auth | Admin-only, same guard as the publish route |
| Availability | Whenever the needed payload exists — status `review` or `published` |

## Scope

**In scope**
- One GET route that renders and streams the four combinations (variant × format).
- A shared bilingual "document model" so PDF and DOCX never drift on section content/order.
- A react-pdf renderer and a docx renderer over that model.
- Two download button groups on `SessionReportReviewPanel`.
- The Japanese line-breaking + font fix in the shared PDF font registration.

**Out of scope (future)**
- Letting the *student* download her own copy from her dashboard.
- Auto-attaching the document to the publish email.
- Persisting generated documents to storage / a version history.
- Japanese kinsoku (line-break) refinement beyond character-level wrapping.
- Any change to generation, the schema, RLS, or migrations.

## Architecture

Approach **A + C** from the brainstorm: one download route, two thin renderers over a single
shared model.

```
SessionReportReviewPanel (client)
  │  ▸ "Send to student"  → GET …/document?variant=student&format=pdf | docx
  │  ▸ "Teacher copy"      → GET …/document?variant=teacher&format=pdf | docx
  ▼
app/api/tutoring/[reportId]/document/route.ts   (admin-only, Node runtime)
  │  loads report (getReportForAdmin) + course/student (getTutoringCourse)
  │  picks payload by variant, validates status/payload present
  ▼
lib/tutoring/report-document-model.ts  →  buildReportModel(variant, ctx)  →  ReportDocModel
  │      (ordered, localized, variant-aware — the single source of truth for
  │       WHAT sections appear and in WHAT order)
  ├── lib/tutoring/generate-report-pdf.ts   (react-pdf → Buffer)
  └── lib/tutoring/generate-report-docx.ts  (docx Packer → Buffer)
  ▼
streamed back with Content-Type + Content-Disposition: attachment
```

### Why a shared model

PDF and DOCX must show the **same sections in the same order**, and the teacher/student
difference (extra sections, answer keys) must be decided **once**. `report-document-model.ts`
owns section ordering, inclusion rules, and bilingual section labels. Each renderer only maps
model → its own primitives; neither renderer decides content.

## Data sources

No new tables or columns. Everything already exists:

- **Student variant** reads `session_reports.student_json` (type `StudentReport`).
- **Teacher variant** reads `session_report_private.instructor_json` (type
  `GeneratedSessionReport` — the full superset: student sections **plus** top-level
  `instructor_analysis` and each `homework[].answer_key_en`). Admin-only RLS already protects
  this row; the route is admin-only.
- **Header/meta** (student name, course title, session date, topic, duration, locale) come
  from `getReportForAdmin(reportId)` + `getTutoringCourse(report.course_id)`
  (`lib/tutoring/queries.ts`). `getReportForAdmin` also returns `private.margin_notes`, used
  only by the teacher variant.

`splitReport()` (`lib/tutoring/split.ts`) already guarantees `student_json` cannot carry the
instructor-only fields, so the student document is structurally safe — we render whatever is
in `student_json` with no manual redaction.

## The download route

`app/api/tutoring/[reportId]/document/route.ts`

- **Method:** `GET`. Query params:
  - `variant` = `student` | `teacher` (required; reject others with 400)
  - `format` = `pdf` | `docx` (required; reject others with 400)
- **Runtime:** `export const runtime = 'nodejs'` and `export const maxDuration = 60`.
  (`@react-pdf/renderer` is a Node-only server-external package; 60s is ample — the syllabus
  route is far heavier and uses 300.)
- **Auth:** identical to the publish route — `createClient()` → `auth.getUser()` → look up
  `users.role`; anything but `admin` → 403; unauthenticated → 401.
- **Load + guard:**
  - `getReportForAdmin(reportId)`; 404 if missing.
  - Student variant requires `student_json`; teacher variant requires
    `private.instructor_json`. Missing payload (status `generating`/`failed`) → 409 with a
    clear message.
- **Render:** build the model, call the matching renderer, get a `Buffer`.
- **Response headers:**
  - PDF → `Content-Type: application/pdf`
  - DOCX → `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `Content-Disposition: attachment; filename="<ascii>"; filename*=UTF-8''<pct-encoded>`
    (dual form because the student's name may be Japanese — the ASCII `filename` is a
    transliterated/sanitized fallback, `filename*` carries the exact UTF-8 name).
  - `Cache-Control: no-store`.
- **Filename pattern:**
  - Student: `HonuVibe-1v1-<StudentSlug>-<YYYY-MM-DD>.<ext>`
  - Teacher: `HonuVibe-1v1-<StudentSlug>-<YYYY-MM-DD>-TEACHER.<ext>`
  - `<StudentSlug>` = ASCII-sanitized student name (fallback `student` if empty/non-ASCII);
    `<YYYY-MM-DD>` = `session_date`.
- **Errors:** wrap in try/catch, log with a `[Tutoring Document]` prefix, return 500 with a
  generic message (mirrors the publish route's shape).

## Shared document model — `lib/tutoring/report-document-model.ts`

Exports `buildReportModel(variant, ctx): ReportDocModel`.

- `ctx` carries: the chosen payload (`StudentReport | GeneratedSessionReport`), header fields
  (student name, course title, session date, topic, duration), and (teacher only)
  `margin_notes`.
- `ReportDocModel = { header: ReportHeader; sections: ReportSection[] }`.
- `ReportSection` is a discriminated union (by `type`) whose payload is a **direct slice of the
  existing report types** — no field remapping, so the model stays thin and type-safe.
- Each section carries a bilingual label (`labelEn` / `labelJp`) defined as constants here (the
  document's own labels — deliberately **not** in `messages/*.json`, which mirror site UI, not
  documents).

**Section order (both variants), matching the dashboard:**

1. `snapshot` — session summary (`snapshot.summary_en/_jp`)
2. `instructor_analysis` — **teacher only**, placed right after the snapshot, labeled
   "Instructor analysis · 講師メモ (teacher only)"
3. `wins` — What went well
4. `trouble_spots` — Things to work on (verbatim quote → correction → explanation + pattern label)
5. `recurring_patterns` — Patterns over time (with trend)
6. `study_areas` — Focus for practice
7. `vocabulary` — term / reading / example (EN + JP)
8. `grammar_points` — title / pattern / explanation / examples
9. `homework` — tasks; **teacher only:** `answer_key_en` rendered under each task
10. `next_session_focus` — Next session
11. `margin_notes` — **teacher only**, at the end, only if non-empty

Variant differences are entirely expressed by (a) including/excluding sections 2 and 11, and
(b) the `homework` section emitting answer keys when `variant === 'teacher'`. Everything else is
identical, guaranteeing the student copy is a strict subset of the teacher copy.

## PDF renderer — `lib/tutoring/generate-report-pdf.ts`

- Uses `@react-pdf/renderer` (`renderToBuffer`) with the brand system copied from
  `lib/syllabus/generate-pdf.ts`: dark header bar (`#1a1f2e`), teal accent (`#2dd4bf`), A4,
  fixed header + footer with page numbers, "HonuVibe.AI — Private Tutoring" footer org line.
- **Header bar** shows: "HonuVibe.AI", a "1v1 Session Report" label, the session date, and a
  meta row (student, topic, duration).
- **Teacher band:** when `variant === 'teacher'`, a distinct colored band under the header reads
  **"TEACHER COPY — contains answer keys & instructor notes · not for student"**, so it can
  never be confused with the student copy at a glance.
- **Bilingual rendering:** every section renders the English line(s) then the Japanese line(s).
  Japanese text nodes use the `Noto Sans JP` family and JP line-height 1.7 (see fix below).
  English uses DM Sans; section headings use DM Serif Display (EN labels only — Japanese labels
  never flow through the serif face).

## DOCX renderer — `lib/tutoring/generate-report-docx.ts`

- Uses the already-installed `docx` library (`Document`, `Paragraph`, `TextRun`,
  `Packer.toBuffer`).
- A branded title block (HonuVibe.AI, "1v1 Session Report", meta line), heading styles per
  section, bilingual paragraphs (EN run then JP run).
- Japanese `TextRun`s set `font` to a JP-friendly face (Yu Gothic, widely present in Word on
  Windows/Mac; Noto Sans JP as the named fallback). DOCX does not embed fonts — Word substitutes
  from the reader's system — so JP renders correctly without the react-pdf machinery. This is
  why the "bad Japanese formatting" complaint is PDF-specific.
- Teacher copy prepends the same "TEACHER COPY …" warning paragraph (bold) and includes the
  instructor-only sections + answer keys.

## Japanese formatting fix

The current syllabus PDF (and any naive copy of it) mis-formats Japanese for two reasons, both
fixed here in the **shared** PDF font registration:

1. **No CJK line breaking.** react-pdf's line-breaker assumes spaces between words. Japanese has
   none, so a whole Japanese run is treated as one unbreakable "word" that overflows the column
   or clips. **Fix:** register a hyphenation callback that splits each CJK character into its own
   break opportunity while leaving Latin runs whole:

   ```ts
   const CJK = /[　-〿぀-ゟ゠-ヿ＀-￯一-龯]/;
   Font.registerHyphenationCallback((word) => {
     if (!CJK.test(word)) return [word];            // English/ASCII untouched
     return word.match(/[　-〿぀-ゟ゠-ヿ＀-￯一-龯]|[^　-〿぀-ゟ゠-ヿ＀-￯一-龯]+/g) ?? [word];
   });
   ```

   Latin-only tokens return `[word]` unchanged, so **English output is unaffected** — verified as
   part of testing.

2. **Tofu (□) from a non-CJK font.** DM Serif Display and DM Sans have no Japanese glyphs; any
   Japanese rendered in them shows missing boxes. **Fix (renderer discipline):** every text node
   that can contain Japanese uses `Noto Sans JP`. In this report the Japanese is always its own
   line, so it is explicitly Noto Sans JP; we never route Japanese through the serif heading face.

**Shared-code touch + regression guard.** The hyphenation callback belongs in the shared PDF
font module so both the syllabus and the new report benefit. To avoid an odd cross-import
(`lib/tutoring/*` importing `lib/syllabus/*`), extract the font registration to
`lib/pdf/fonts.ts` and have `lib/syllabus/generate-pdf.ts` import from the new location (its
only change). Because the callback is a no-op for Latin tokens, the syllabus **English** output
must be byte-for-similar unchanged; we confirm this in testing, and confirm the syllabus
**Japanese** output improves as a bonus.

Optional robustness (recommended, low-risk): bundle the Noto Sans JP `.ttf` locally under the
repo instead of fetching from `fonts.gstatic.com` at render time, so a slow/failed CDN fetch
during a serverless render cannot corrupt output. Falls back to the current remote URLs if we
choose to defer this.

## UI — `components/admin/SessionReportReviewPanel.tsx`

Add a "Download" area to the existing action row, as **two labelled groups** so student vs
teacher is unmistakable:

- **Send to student** — buttons: `PDF` · `Word (.docx)`
- **Teacher copy (next session)** — buttons: `PDF` · `Word (.docx)`

Behavior:
- Each button fetches `…/document?variant=…&format=…`, receives the blob, and triggers a
  browser download via an object URL (so we can show a **per-button loading state** during the
  1–2s render — nicer than a bare link that gives no feedback). The download filename is read
  from the response's `Content-Disposition` header (the route is the single source of the
  naming convention); the client falls back to a locally-constructed name if the header is
  absent.
- Buttons are **disabled** when the required payload is absent (student group needs
  `student_json`; teacher group needs `private.instructor_json`) — i.e., while status is
  `generating`/`failed`. The panel already loads the report with its private child, so this
  state is known client-side without an extra request.
- Labels follow the panel's existing English admin idiom (the admin surface is English-only);
  no `messages/*.json` additions.

## Files

**Create**
- `app/api/tutoring/[reportId]/document/route.ts` — GET handler (auth, load, guard, render, stream)
- `lib/tutoring/report-document-model.ts` — shared ordered/localized/variant-aware model + labels
- `lib/tutoring/generate-report-pdf.ts` — react-pdf renderer
- `lib/tutoring/generate-report-docx.ts` — docx renderer
- `lib/pdf/fonts.ts` — shared PDF font registration + CJK hyphenation callback (moved from
  `lib/syllabus/fonts.ts`)

**Modify**
- `lib/syllabus/generate-pdf.ts` — import `registerFonts` from `lib/pdf/fonts.ts` (only change)
- `components/admin/SessionReportReviewPanel.tsx` — two download button groups + fetch/download handlers

**Delete**
- `lib/syllabus/fonts.ts` — contents moved to `lib/pdf/fonts.ts` (or leave a thin re-export if
  simpler; decide during implementation)

No migration. No RLS change. No `messages/*.json` change.

## Error handling

- Bad `variant`/`format` → 400.
- Not authenticated → 401; not admin → 403.
- Report not found → 404.
- Needed payload missing for the requested variant → 409 with a message naming the reason
  (e.g., "This report is still generating.").
- Render failure → 500, logged `[Tutoring Document]`.
- Client: on a non-OK response, surface a small inline error on the panel and clear the loading
  state; never leave a spinner stuck.

## Testing / verification

- **Gate:** `pnpm verify` (type-check → tests → build). No RLS/migration change, so `test:rls`
  is not required.
- **Manual (real `review`-status report):** download all four combinations and confirm:
  - Branding present (header bar, teal accent, footer, page numbers).
  - **Japanese wraps correctly** — no column overflow, no clipped text, no tofu boxes.
  - Student copy has **no** instructor analysis and **no** homework answer keys.
  - Teacher copy shows the TEACHER COPY band, the instructor analysis, and answer keys under
    homework; margin notes appear only if present.
  - Filenames match the pattern and open cleanly (PDF in a viewer, .docx in Word).
- **Regression:** download an existing course **syllabus** PDF in EN and JP — EN unchanged, JP
  now wraps properly (bonus fix). Confirms the shared font change is safe.
- **Disabled states:** on a `generating`/`failed` report, the relevant buttons are disabled.

## Open questions

None — all design decisions resolved during brainstorm.
