# 1v1 Session Report — Branded Document Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add download-only, HonuVibe-branded **student** and **teacher** documents (PDF + .docx) to the 1v1 Sessions admin report review panel, and fix Japanese line-breaking in the shared PDF font stack.

**Architecture:** One admin-only GET route renders four combinations (variant × format) over a single shared, bilingual "document model" so PDF and DOCX never drift. The model is the security boundary (it decides what the student copy omits). Fonts are bundled locally with a remote fallback, and a CJK hyphenation callback fixes Japanese wrapping for both this feature and the existing syllabus PDF.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, `@react-pdf/renderer` (already installed, in `serverExternalPackages`), `docx` (already installed), Vitest (`app` project, jsdom), Supabase (RLS).

**Spec:** `docs/designs/2026-07-08-1v1-report-document-export.md` (rev 2).

## Global Constraints

- **Package manager:** pnpm only — never npm.
- **TypeScript strict:** no `any`. Named exports for modules.
- **No new migration, no RLS change, no `messages/*.json` change.**
- **Admin-only route:** role check (`users.role === 'admin'`) runs before any load; 401 unauth, 403 non-admin.
- **Status guard:** documents are exportable only when `session_reports.status ∈ {'review','published'}`.
- **Student copy must never contain** the top-level `instructor_analysis`, any homework `answer_key_en`, or `margin_notes`. This is enforced in the model and asserted by tests.
- **Section order (both variants), matching the dashboard:** snapshot → (instructor_analysis, teacher-only) → wins → trouble_spots → recurring_patterns → study_areas → vocabulary → grammar_points → homework → next_session → (margin_notes, teacher-only, only if non-empty).
- **Brand tokens (from `lib/syllabus/generate-pdf.ts`):** teal `#2dd4bf`, dark `#1a1f2e`. Fonts: DM Serif Display (headings, EN only), DM Sans (EN body), Noto Sans JP (all JP text, line-height 1.7).
- **Filename:** `HonuVibe-1v1-<AsciiName>-<YYYY-MM-DD>[-TEACHER].<ext>` in the ASCII `filename`; exact (possibly Japanese) name in `filename*=UTF-8''…`.
- **Verify gate:** `pnpm verify` (type-check → tests → build) must pass. `test:rls` not required (no RLS change).
- **Commit directly to `main`**, hooks must pass, no `--no-verify`. Do **not** stage unrelated working-tree files (AdminWorkbenchScenarioList, smashhaus dirs, SmashHaus.html).

---

## File Structure

**Create:**
- `lib/tutoring/report-document-model.ts` — variant-aware, bilingual, ordered model + section labels. The single source of truth for document content.
- `lib/tutoring/report-document-model.test.ts` — unit tests (security boundary + ordering).
- `lib/pdf/fonts.ts` — shared PDF font registration + local/remote font resolution + `cjkHyphenate` callback. (Replaces `lib/syllabus/fonts.ts`.)
- `lib/pdf/fonts/` — bundled `.ttf` files (Noto Sans JP + DM Sans + DM Serif Display).
- `lib/tutoring/generate-report-pdf.ts` — react-pdf renderer over the model.
- `lib/tutoring/generate-report-docx.ts` — docx renderer over the model.
- `app/api/tutoring/[reportId]/document/route.ts` — GET handler (auth, guard, render, stream).
- `__tests__/api/tutoring-document.test.ts` — route auth/validation tests.

**Modify:**
- `lib/syllabus/generate-pdf.ts` — import `registerFonts` from `@/lib/pdf/fonts`.
- `next.config.ts` — `outputFileTracingIncludes` so the bundled fonts ship with both PDF routes.
- `app/[locale]/admin/tutoring/[courseId]/reports/[reportId]/page.tsx` — pass `hasStudentJson`.
- `components/admin/SessionReportReviewPanel.tsx` — download groups, `hasStudentJson` prop, dirty tracking, handlers.

**Delete:**
- `lib/syllabus/fonts.ts` — contents move to `lib/pdf/fonts.ts`.

**Build order & dependencies:** Task 1 (model) → Task 2 (fonts) → Task 3 (PDF, needs 1+2) → Task 4 (DOCX, needs 1) → Task 5 (route + tests, needs 1+3+4) → Task 6 (page prop) → Task 7 (panel UI, needs 5+6).

---

## Task 1: Shared document model

**Files:**
- Create: `lib/tutoring/report-document-model.ts`
- Test: `lib/tutoring/report-document-model.test.ts`

**Interfaces:**
- Consumes: `GeneratedSessionReport`, `StudentReport` from `@/lib/tutoring/types`.
- Produces:
  - `type DocVariant = 'student' | 'teacher'`
  - `interface Bilingual { en: string; jp: string }`
  - `interface ReportDocHeader { studentName: string; courseTitleEn: string; sessionDate: string; topic: string | null; durationMinutes: number | null; variant: DocVariant }`
  - `type ReportSection` (discriminated union, see code)
  - `interface ReportDocModel { header: ReportDocHeader; sections: ReportSection[] }`
  - `interface BuildReportCtx { payload: StudentReport | GeneratedSessionReport; studentName: string | null; courseTitleEn: string; sessionDate: string; topic: string | null; durationMinutes: number | null; marginNotes?: string | null }`
  - `function buildReportModel(variant: DocVariant, ctx: BuildReportCtx): ReportDocModel`

- [ ] **Step 1: Write the failing test**

Create `lib/tutoring/report-document-model.test.ts`. Reuse the fixture shape from `lib/tutoring/split.test.ts` (a `makeFullReport()` returning a `GeneratedSessionReport` with `instructor_analysis` and a homework `answer_key_en`).

```ts
import { describe, expect, test } from 'vitest';
import type { GeneratedSessionReport } from './types';
import { buildReportModel, type BuildReportCtx } from './report-document-model';
import { splitReport } from './split';

function makeFullReport(): GeneratedSessionReport {
  return {
    snapshot: { summary_en: 'Great session.', summary_jp: '良いセッションでした。' },
    wins: [{ win_en: 'Clear intros', win_jp: '明確な自己紹介', quote: 'Hello, I am Shiori.' }],
    trouble_spots: [{
      id: 'trouble_0', quote: 'I went to store', correction: 'I went to the store.',
      explanation_en: 'Needs an article.', explanation_jp: '冠詞が必要です。',
      pattern_category: 'articles', pattern_label_en: 'Articles', pattern_label_jp: '冠詞',
    }],
    recurring_patterns: [{ category: 'articles', note_en: 'Dropping "the".', note_jp: '「the」脱落。', trend: 'persistent' }],
    study_areas: [{ area_en: 'Articles', area_jp: '冠詞', why_en: 'Frequent.', why_jp: '頻出。' }],
    vocabulary: [{ id: 'vocab_0', term_en: 'inventory', term_jp: '在庫', reading_en: '/ˈɪnvəntɔːri/', example_en: 'We checked the inventory.', example_jp: '在庫を確認しました。' }],
    grammar_points: [{ id: 'grammar_0', title_en: 'Definite article', title_jp: '定冠詞', pattern: 'the + noun', explanation_en: 'Specific noun.', explanation_jp: '特定の名詞。', examples: [{ sentence_en: 'the store', sentence_jp: 'その店' }] }],
    homework: [{ id: 'hw_0', task_en: 'Fill in a/an/the.', task_jp: 'a/an/the を入れましょう。', answer_key_en: '1. the  2. a  3. an' }],
    next_session_focus: { focus_en: 'Articles in speech.', focus_jp: '会話での冠詞。' },
    instructor_analysis: 'Push on article production, not recognition.',
  };
}

const baseCtx = (payload: BuildReportCtx['payload'], marginNotes?: string | null): BuildReportCtx => ({
  payload, studentName: 'Shiori', courseTitleEn: 'Private Tutoring',
  sessionDate: '2026-07-08', topic: 'Articles', durationMinutes: 60, marginNotes,
});

describe('buildReportModel', () => {
  test('student model omits instructor_analysis, answer keys, and margin notes', () => {
    const { student_json } = splitReport(makeFullReport());
    const model = buildReportModel('student', baseCtx(student_json, 'private teacher note'));
    const serialized = JSON.stringify(model);
    expect(serialized).not.toContain('Push on article production');
    expect(serialized).not.toContain('1. the  2. a  3. an');
    expect(serialized).not.toContain('private teacher note');
    expect(model.sections.some((s) => s.type === 'instructor_analysis')).toBe(false);
    expect(model.sections.some((s) => s.type === 'margin_notes')).toBe(false);
    const hw = model.sections.find((s) => s.type === 'homework');
    expect(hw && hw.type === 'homework' && hw.items.every((i) => i.answerKey === undefined)).toBe(true);
  });

  test('teacher model includes instructor analysis, answer keys, and margin notes', () => {
    const model = buildReportModel('teacher', baseCtx(makeFullReport(), 'private teacher note'));
    const serialized = JSON.stringify(model);
    expect(serialized).toContain('Push on article production');
    expect(serialized).toContain('1. the  2. a  3. an');
    expect(serialized).toContain('private teacher note');
    expect(model.sections.some((s) => s.type === 'instructor_analysis')).toBe(true);
    expect(model.sections.some((s) => s.type === 'margin_notes')).toBe(true);
  });

  test('teacher model omits margin_notes section when notes are empty/whitespace', () => {
    const model = buildReportModel('teacher', baseCtx(makeFullReport(), '   '));
    expect(model.sections.some((s) => s.type === 'margin_notes')).toBe(false);
  });

  test('section order matches the dashboard order', () => {
    const model = buildReportModel('teacher', baseCtx(makeFullReport(), 'note'));
    expect(model.sections.map((s) => s.type)).toEqual([
      'snapshot', 'instructor_analysis', 'wins', 'trouble_spots', 'recurring_patterns',
      'study_areas', 'vocabulary', 'grammar_points', 'homework', 'next_session', 'margin_notes',
    ]);
  });

  test('header carries variant and meta', () => {
    const { student_json } = splitReport(makeFullReport());
    const model = buildReportModel('student', baseCtx(student_json));
    expect(model.header.variant).toBe('student');
    expect(model.header.studentName).toBe('Shiori');
    expect(model.header.sessionDate).toBe('2026-07-08');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run -- report-document-model`
Expected: FAIL — `buildReportModel` / module not found.

- [ ] **Step 3: Write the model**

Create `lib/tutoring/report-document-model.ts`:

```ts
import type { GeneratedSessionReport, StudentReport } from './types';

export type DocVariant = 'student' | 'teacher';

export interface Bilingual {
  en: string;
  jp: string;
}

export interface ReportDocHeader {
  studentName: string;
  courseTitleEn: string;
  sessionDate: string; // 'YYYY-MM-DD'
  topic: string | null;
  durationMinutes: number | null;
  variant: DocVariant;
}

export type ReportSection =
  | { type: 'snapshot'; labelEn: string; labelJp: string; body: Bilingual }
  | { type: 'instructor_analysis'; labelEn: string; labelJp: string; text: string }
  | { type: 'wins'; labelEn: string; labelJp: string; items: Array<{ text: Bilingual; quote?: string }> }
  | { type: 'trouble_spots'; labelEn: string; labelJp: string; items: Array<{ quote: string; correction: string; explanation: Bilingual; patternLabel: Bilingual }> }
  | { type: 'recurring_patterns'; labelEn: string; labelJp: string; items: Array<{ note: Bilingual; trend: string }> }
  | { type: 'study_areas'; labelEn: string; labelJp: string; items: Array<{ area: Bilingual; why: Bilingual }> }
  | { type: 'vocabulary'; labelEn: string; labelJp: string; items: Array<{ term: Bilingual; reading?: string; example: Bilingual }> }
  | { type: 'grammar_points'; labelEn: string; labelJp: string; items: Array<{ title: Bilingual; pattern: string; explanation: Bilingual; examples: Bilingual[] }> }
  | { type: 'homework'; labelEn: string; labelJp: string; items: Array<{ task: Bilingual; answerKey?: string }> }
  | { type: 'next_session'; labelEn: string; labelJp: string; body: Bilingual }
  | { type: 'margin_notes'; labelEn: string; labelJp: string; text: string };

export interface ReportDocModel {
  header: ReportDocHeader;
  sections: ReportSection[];
}

export interface BuildReportCtx {
  payload: StudentReport | GeneratedSessionReport;
  studentName: string | null;
  courseTitleEn: string;
  sessionDate: string;
  topic: string | null;
  durationMinutes: number | null;
  marginNotes?: string | null;
}

// Bilingual section labels — the document's own copy (deliberately NOT in messages/*.json).
const L = {
  snapshot: { labelEn: 'Session snapshot', labelJp: 'セッションの概要' },
  instructor_analysis: { labelEn: 'Instructor analysis (teacher only)', labelJp: '講師メモ（講師専用）' },
  wins: { labelEn: 'What went well', labelJp: '良かった点' },
  trouble_spots: { labelEn: 'Things to work on', labelJp: '改善点' },
  recurring_patterns: { labelEn: 'Patterns over time', labelJp: '傾向の推移' },
  study_areas: { labelEn: 'Focus for practice', labelJp: '練習の重点' },
  vocabulary: { labelEn: 'Vocabulary', labelJp: '語彙' },
  grammar_points: { labelEn: 'Grammar points', labelJp: '文法ポイント' },
  homework: { labelEn: 'Homework', labelJp: '宿題' },
  next_session: { labelEn: 'Next session', labelJp: '次回のセッション' },
  margin_notes: { labelEn: 'Margin notes (teacher only)', labelJp: '欄外メモ（講師専用）' },
} as const;

export function buildReportModel(variant: DocVariant, ctx: BuildReportCtx): ReportDocModel {
  const p = ctx.payload;
  const isTeacher = variant === 'teacher';
  const sections: ReportSection[] = [];

  sections.push({ type: 'snapshot', ...L.snapshot, body: { en: p.snapshot.summary_en, jp: p.snapshot.summary_jp } });

  if (isTeacher && 'instructor_analysis' in p && p.instructor_analysis) {
    sections.push({ type: 'instructor_analysis', ...L.instructor_analysis, text: p.instructor_analysis });
  }

  sections.push({
    type: 'wins', ...L.wins,
    items: p.wins.map((w) => ({ text: { en: w.win_en, jp: w.win_jp }, quote: w.quote })),
  });

  sections.push({
    type: 'trouble_spots', ...L.trouble_spots,
    items: p.trouble_spots.map((t) => ({
      quote: t.quote, correction: t.correction,
      explanation: { en: t.explanation_en, jp: t.explanation_jp },
      patternLabel: { en: t.pattern_label_en, jp: t.pattern_label_jp },
    })),
  });

  sections.push({
    type: 'recurring_patterns', ...L.recurring_patterns,
    items: p.recurring_patterns.map((r) => ({ note: { en: r.note_en, jp: r.note_jp }, trend: r.trend })),
  });

  sections.push({
    type: 'study_areas', ...L.study_areas,
    items: p.study_areas.map((s) => ({ area: { en: s.area_en, jp: s.area_jp }, why: { en: s.why_en, jp: s.why_jp } })),
  });

  sections.push({
    type: 'vocabulary', ...L.vocabulary,
    items: p.vocabulary.map((v) => ({ term: { en: v.term_en, jp: v.term_jp }, reading: v.reading_en, example: { en: v.example_en, jp: v.example_jp } })),
  });

  sections.push({
    type: 'grammar_points', ...L.grammar_points,
    items: p.grammar_points.map((g) => ({
      title: { en: g.title_en, jp: g.title_jp }, pattern: g.pattern,
      explanation: { en: g.explanation_en, jp: g.explanation_jp },
      examples: g.examples.map((e) => ({ en: e.sentence_en, jp: e.sentence_jp })),
    })),
  });

  sections.push({
    type: 'homework', ...L.homework,
    items: p.homework.map((h) => ({
      task: { en: h.task_en, jp: h.task_jp },
      answerKey: isTeacher && 'answer_key_en' in h ? h.answer_key_en : undefined,
    })),
  });

  sections.push({ type: 'next_session', ...L.next_session, body: { en: p.next_session_focus.focus_en, jp: p.next_session_focus.focus_jp } });

  if (isTeacher && ctx.marginNotes && ctx.marginNotes.trim()) {
    sections.push({ type: 'margin_notes', ...L.margin_notes, text: ctx.marginNotes });
  }

  return {
    header: {
      studentName: ctx.studentName ?? 'Student',
      courseTitleEn: ctx.courseTitleEn,
      sessionDate: ctx.sessionDate,
      topic: ctx.topic,
      durationMinutes: ctx.durationMinutes,
      variant,
    },
    sections,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run -- report-document-model`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tutoring/report-document-model.ts lib/tutoring/report-document-model.test.ts
git commit -m "feat(tutoring): report document model (student/teacher, bilingual)"
```

---

## Task 2: Shared PDF fonts — local bundling + CJK hyphenation

**Files:**
- Create: `lib/pdf/fonts.ts`, `lib/pdf/fonts/` (six `.ttf` files: DM Serif Display, DM Sans ×3, Noto Sans JP ×2)
- Test: `lib/pdf/fonts.test.ts`
- Modify: `lib/syllabus/generate-pdf.ts` (import path), `next.config.ts` (file tracing)
- Delete: `lib/syllabus/fonts.ts`

**Interfaces:**
- Consumes: `@react-pdf/renderer`'s `Font`.
- Produces:
  - `function cjkHyphenate(word: string): string[]` (exported, pure, testable)
  - `function registerFonts(): void` (idempotent; registers DM Serif Display, DM Sans, Noto Sans JP, and the hyphenation callback)

- [ ] **Step 1: Download the font files**

The four TTFs are the exact static instances currently referenced in `lib/syllabus/fonts.ts`. Download them into the repo:

```bash
mkdir -p lib/pdf/fonts
curl -sL "https://fonts.gstatic.com/s/dmserifdisplay/v17/-nFnOHM81r4j6k0gjAW3mujVU2B2K_c.ttf" -o lib/pdf/fonts/DMSerifDisplay-Regular.ttf
curl -sL "https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAopxhTg.ttf" -o lib/pdf/fonts/DMSans-Regular.ttf
curl -sL "https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAfJthTg.ttf" -o lib/pdf/fonts/DMSans-SemiBold.ttf
curl -sL "https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwARZthTg.ttf" -o lib/pdf/fonts/DMSans-Bold.ttf
curl -sL "https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf" -o lib/pdf/fonts/NotoSansJP-Regular.ttf
curl -sL "https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFPYk75s.ttf" -o lib/pdf/fonts/NotoSansJP-Bold.ttf
ls -la lib/pdf/fonts/
```

Expected: six `.ttf` files, each non-trivial size (Noto Sans JP files are multiple MB).

- [ ] **Step 2: Write the failing test for the hyphenation logic**

Create `lib/pdf/fonts.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { cjkHyphenate } from './fonts';

describe('cjkHyphenate', () => {
  test('leaves a plain English word intact', () => {
    expect(cjkHyphenate('inventory')).toEqual(['inventory']);
  });

  test('splits a run of Japanese into individual characters', () => {
    expect(cjkHyphenate('在庫')).toEqual(['在', '庫']);
  });

  test('splits CJK per-char but keeps embedded Latin runs whole', () => {
    // 'AIを使う' → 'AI' stays together, each kana/kanji is its own break point.
    expect(cjkHyphenate('AIを使う')).toEqual(['AI', 'を', '使', 'う']);
  });

  test('empty string returns a single empty token', () => {
    expect(cjkHyphenate('')).toEqual(['']);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test:run -- fonts`
Expected: FAIL — module/`cjkHyphenate` not found.

- [ ] **Step 4: Write `lib/pdf/fonts.ts`**

```ts
import { Font } from '@react-pdf/renderer';
import fs from 'fs';
import path from 'path';

// CJK ranges as \u escapes (ASCII-only source, encoding-safe): CJK punctuation,
// hiragana, katakana, full/half-width forms, common CJK unified ideographs.
const R = '\\u3000-\\u303f\\u3040-\\u309f\\u30a0-\\u30ff\\uff00-\\uffef\\u4e00-\\u9faf';
const CJK = new RegExp(`[${R}]`);
const CJK_SPLIT = new RegExp(`[${R}]|[^${R}]+`, 'g');

/**
 * react-pdf hyphenation callback. react-pdf's line-breaker assumes spaces
 * between words; Japanese has none, so a whole JP run is treated as one
 * unbreakable word and overflows. This inserts a break opportunity between each
 * CJK character while leaving Latin runs whole (so English word-breaking is
 * unchanged). Exported for unit testing.
 */
export function cjkHyphenate(word: string): string[] {
  if (!CJK.test(word)) return [word];
  return word.match(CJK_SPLIT) ?? [word];
}

const FONT_DIR = path.join(process.cwd(), 'lib/pdf/fonts');

// Prefer the bundled local .ttf (deterministic, no render-time network fetch);
// fall back to the Google CDN URL if the file wasn't traced into the bundle.
function src(file: string, remote: string): string {
  try {
    const local = path.join(FONT_DIR, file);
    if (fs.existsSync(local)) return local;
  } catch {
    // fs not available / traced — fall through to remote.
  }
  return remote;
}

let fontsRegistered = false;

export function registerFonts(): void {
  if (fontsRegistered) return;

  Font.register({
    family: 'DM Serif Display',
    src: src('DMSerifDisplay-Regular.ttf', 'https://fonts.gstatic.com/s/dmserifdisplay/v17/-nFnOHM81r4j6k0gjAW3mujVU2B2K_c.ttf'),
    fontWeight: 400,
  });

  Font.register({
    family: 'DM Sans',
    fonts: [
      { src: src('DMSans-Regular.ttf', 'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAopxhTg.ttf'), fontWeight: 400 },
      { src: src('DMSans-SemiBold.ttf', 'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAfJthTg.ttf'), fontWeight: 600 },
      { src: src('DMSans-Bold.ttf', 'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwARZthTg.ttf'), fontWeight: 700 },
    ],
  });

  Font.register({
    family: 'Noto Sans JP',
    fonts: [
      { src: src('NotoSansJP-Regular.ttf', 'https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf'), fontWeight: 400 },
      { src: src('NotoSansJP-Bold.ttf', 'https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFPYk75s.ttf'), fontWeight: 700 },
    ],
  });

  Font.registerHyphenationCallback(cjkHyphenate);

  fontsRegistered = true;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test:run -- fonts`
Expected: PASS (4 tests).

- [ ] **Step 6: Repoint the syllabus generator and delete the old font module**

In `lib/syllabus/generate-pdf.ts`, change line 3 from:

```ts
import { registerFonts } from './fonts';
```

to:

```ts
import { registerFonts } from '@/lib/pdf/fonts';
```

Then delete the old file:

```bash
git rm lib/syllabus/fonts.ts
```

- [ ] **Step 7: Add font file tracing to `next.config.ts`**

So Vercel includes the `.ttf` files in the serverless bundle for both PDF routes. Add this key to the `nextConfig` object (e.g. right after `serverExternalPackages`):

```ts
  outputFileTracingIncludes: {
    'app/api/tutoring/[reportId]/document/route': ['./lib/pdf/fonts/**'],
    'app/api/courses/[courseId]/syllabus/route': ['./lib/pdf/fonts/**'],
  },
```

- [ ] **Step 8: Verify build + syllabus still compiles**

Run: `pnpm verify:fast`
Expected: type-check + tests pass (the syllabus generator now imports from the new path).

- [ ] **Step 9: Commit**

```bash
git add lib/pdf/fonts.ts lib/pdf/fonts.test.ts lib/pdf/fonts/ lib/syllabus/generate-pdf.ts next.config.ts
git commit -m "feat(pdf): shared font module with local bundling + CJK hyphenation"
```

---

## Task 3: PDF renderer

**Files:**
- Create: `lib/tutoring/generate-report-pdf.ts`

**Interfaces:**
- Consumes: `ReportDocModel`, `ReportSection`, `Bilingual` from `./report-document-model`; `registerFonts` from `@/lib/pdf/fonts`.
- Produces: `function generateReportPdf(model: ReportDocModel): Promise<Buffer>`

> No automated test — react-pdf output is verified by the build + manual PDF review in Task 5/spec (unit-testing byte output would require a node env and live font fetch). The *content* decisions are already covered by Task 1's model tests.

- [ ] **Step 1: Write `lib/tutoring/generate-report-pdf.ts`**

```ts
import React from 'react';
import { renderToBuffer, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { registerFonts } from '@/lib/pdf/fonts';
import type { Bilingual, ReportDocModel, ReportSection } from './report-document-model';

const TEAL = '#2dd4bf';
const DARK_BG = '#1a1f2e';
const AMBER = '#b45309';
const AMBER_BG = '#fef3c7';
const TEXT = '#334155';
const MUTED = '#94a3b8';
const SECONDARY = '#64748b';
const BORDER = '#e2e8f0';
const WHITE = '#ffffff';

const s = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 64, paddingHorizontal: 48, fontFamily: 'DM Sans', fontSize: 10, color: TEXT, backgroundColor: WHITE },
  headerBar: { backgroundColor: DARK_BG, marginHorizontal: -48, marginTop: -48, paddingHorizontal: 48, paddingVertical: 24, marginBottom: 16 },
  brandName: { fontFamily: 'DM Sans', fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 },
  brandAccent: { color: TEAL },
  docLabel: { fontFamily: 'DM Sans', fontSize: 8, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  metaLine: { fontSize: 9, color: MUTED, marginTop: 2 },
  teacherBand: { backgroundColor: AMBER_BG, marginHorizontal: -48, paddingHorizontal: 48, paddingVertical: 6, marginBottom: 12 },
  teacherBandText: { fontSize: 9, fontWeight: 700, color: AMBER },
  sectionTitle: { fontFamily: 'DM Serif Display', fontSize: 13, color: DARK_BG, marginTop: 16, marginBottom: 6, paddingBottom: 3, borderBottom: `1px solid ${BORDER}` },
  en: { fontFamily: 'DM Sans', fontSize: 10, lineHeight: 1.5, color: TEXT, marginBottom: 2 },
  jp: { fontFamily: 'Noto Sans JP', fontSize: 10, lineHeight: 1.7, color: SECONDARY, marginBottom: 4 },
  mono: { fontFamily: 'DM Sans', fontSize: 9, color: SECONDARY, marginBottom: 2 },
  item: { marginBottom: 6, paddingLeft: 8, borderLeft: `1px solid ${BORDER}` },
  quote: { fontSize: 9, fontStyle: 'italic', color: SECONDARY, marginBottom: 2 },
  tag: { fontSize: 8, color: TEAL, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  answerKey: { fontSize: 9, color: AMBER, marginTop: 2 },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', borderTop: `1px solid ${BORDER}`, paddingTop: 8 },
  footerText: { fontSize: 7, color: MUTED },
});

const h = React.createElement;

function bilingual(b: Bilingual, key: string): React.ReactNode {
  return h(View, { key },
    h(Text, { style: s.en }, b.en),
    h(Text, { style: s.jp }, b.jp),
  );
}

function renderSection(sec: ReportSection, i: number): React.ReactNode {
  const title = h(Text, { style: s.sectionTitle }, `${sec.labelEn} · ${sec.labelJp}`);
  switch (sec.type) {
    case 'snapshot':
    case 'next_session':
      return h(View, { key: i, wrap: false }, title, bilingual(sec.body, `${i}-b`));
    case 'instructor_analysis':
    case 'margin_notes':
      return h(View, { key: i }, title, h(Text, { style: s.en }, sec.text));
    case 'wins':
      return h(View, { key: i }, title, ...sec.items.map((it, j) =>
        h(View, { key: j, style: s.item },
          bilingual(it.text, `${i}-${j}-t`),
          it.quote ? h(Text, { style: s.quote }, `“${it.quote}”`) : null,
        )));
    case 'trouble_spots':
      return h(View, { key: i }, title, ...sec.items.map((it, j) =>
        h(View, { key: j, style: s.item },
          h(Text, { style: s.tag }, `${it.patternLabel.en} · ${it.patternLabel.jp}`),
          h(Text, { style: s.quote }, `You said: “${it.quote}”`),
          h(Text, { style: s.en }, `Try: ${it.correction}`),
          bilingual(it.explanation, `${i}-${j}-e`),
        )));
    case 'recurring_patterns':
      return h(View, { key: i }, title, ...sec.items.map((it, j) =>
        h(View, { key: j, style: s.item },
          h(Text, { style: s.tag }, it.trend),
          bilingual(it.note, `${i}-${j}-n`),
        )));
    case 'study_areas':
      return h(View, { key: i }, title, ...sec.items.map((it, j) =>
        h(View, { key: j, style: s.item },
          bilingual(it.area, `${i}-${j}-a`),
          bilingual(it.why, `${i}-${j}-w`),
        )));
    case 'vocabulary':
      return h(View, { key: i }, title, ...sec.items.map((it, j) =>
        h(View, { key: j, style: s.item },
          h(Text, { style: s.en }, `${it.term.en}${it.reading ? `  ${it.reading}` : ''} — ${it.term.jp}`),
          bilingual(it.example, `${i}-${j}-x`),
        )));
    case 'grammar_points':
      return h(View, { key: i }, title, ...sec.items.map((it, j) =>
        h(View, { key: j, style: s.item },
          h(Text, { style: s.en }, `${it.title.en} — ${it.title.jp}`),
          h(Text, { style: s.mono }, it.pattern),
          bilingual(it.explanation, `${i}-${j}-e`),
          ...it.examples.map((ex, k) => bilingual(ex, `${i}-${j}-ex-${k}`)),
        )));
    case 'homework':
      return h(View, { key: i }, title, ...sec.items.map((it, j) =>
        h(View, { key: j, style: s.item },
          bilingual(it.task, `${i}-${j}-t`),
          it.answerKey ? h(Text, { style: s.answerKey }, `Answer key: ${it.answerKey}`) : null,
        )));
    default:
      return null;
  }
}

export async function generateReportPdf(model: ReportDocModel): Promise<Buffer> {
  registerFonts();
  const { header } = model;
  const isTeacher = header.variant === 'teacher';
  const metaParts = [
    header.studentName,
    header.sessionDate,
    header.topic,
    header.durationMinutes ? `${header.durationMinutes} min` : null,
  ].filter(Boolean).join('  ·  ');

  const doc = h(Document, { title: `1v1 Session Report — ${header.studentName}`, author: 'HonuVibe.AI' },
    h(Page, { size: 'A4', style: s.page, wrap: true },
      h(View, { style: s.headerBar, fixed: true },
        h(Text, { style: s.brandName }, 'HonuVibe', h(Text, { style: s.brandAccent }, '.AI')),
        h(Text, { style: s.docLabel }, '1v1 Session Report'),
        h(Text, { style: s.metaLine }, metaParts),
      ),
      isTeacher
        ? h(View, { style: s.teacherBand },
            h(Text, { style: s.teacherBandText }, 'TEACHER COPY — contains answer keys & instructor notes · not for student'))
        : null,
      ...model.sections.map((sec, i) => renderSection(sec, i)),
      h(View, { style: s.footer, fixed: true },
        h(Text, { style: s.footerText }, 'HonuVibe.AI — Private Tutoring'),
        h(Text, { style: s.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` }),
      ),
    ),
  );

  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm verify:fast`
Expected: PASS (no type errors; existing tests still green).

- [ ] **Step 3: Commit**

```bash
git add lib/tutoring/generate-report-pdf.ts
git commit -m "feat(tutoring): branded PDF renderer for session reports"
```

---

## Task 4: DOCX renderer

**Files:**
- Create: `lib/tutoring/generate-report-docx.ts`

**Interfaces:**
- Consumes: `ReportDocModel`, `ReportSection`, `Bilingual` from `./report-document-model`; `docx`.
- Produces: `function generateReportDocx(model: ReportDocModel): Promise<Buffer>`

- [ ] **Step 1: Write `lib/tutoring/generate-report-docx.ts`**

```ts
import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } from 'docx';
import type { Bilingual, ReportDocModel, ReportSection } from './report-document-model';

const JP_FONT = 'Yu Gothic'; // present in Word on Windows/Mac; Word substitutes a JP face otherwise
const EN_FONT = 'Calibri';
const TEAL = '2DD4BF';
const AMBER = 'B45309';

function en(text: string, opts: { bold?: boolean; italics?: boolean; color?: string } = {}): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, font: EN_FONT, ...opts })] });
}

function jp(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, font: JP_FONT })], spacing: { after: 80 } });
}

function bilingual(b: Bilingual): Paragraph[] {
  return [en(b.en), jp(b.jp)];
}

function sectionHeading(sec: ReportSection): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' } },
    children: [
      new TextRun({ text: sec.labelEn, font: EN_FONT, bold: true }),
      new TextRun({ text: `  ·  ${sec.labelJp}`, font: JP_FONT, bold: true }),
    ],
  });
}

function renderSection(sec: ReportSection): Paragraph[] {
  const head = sectionHeading(sec);
  switch (sec.type) {
    case 'snapshot':
    case 'next_session':
      return [head, ...bilingual(sec.body)];
    case 'instructor_analysis':
    case 'margin_notes':
      return [head, en(sec.text)];
    case 'wins':
      return [head, ...sec.items.flatMap((it) => [
        ...bilingual(it.text),
        ...(it.quote ? [en(`“${it.quote}”`, { italics: true })] : []),
      ])];
    case 'trouble_spots':
      return [head, ...sec.items.flatMap((it) => [
        en(`${it.patternLabel.en} · ${it.patternLabel.jp}`, { color: TEAL, bold: true }),
        en(`You said: “${it.quote}”`, { italics: true }),
        en(`Try: ${it.correction}`),
        ...bilingual(it.explanation),
      ])];
    case 'recurring_patterns':
      return [head, ...sec.items.flatMap((it) => [en(it.trend, { color: TEAL }), ...bilingual(it.note)])];
    case 'study_areas':
      return [head, ...sec.items.flatMap((it) => [...bilingual(it.area), ...bilingual(it.why)])];
    case 'vocabulary':
      return [head, ...sec.items.flatMap((it) => [
        en(`${it.term.en}${it.reading ? `  ${it.reading}` : ''} — ${it.term.jp}`, { bold: true }),
        ...bilingual(it.example),
      ])];
    case 'grammar_points':
      return [head, ...sec.items.flatMap((it) => [
        en(`${it.title.en} — ${it.title.jp}`, { bold: true }),
        en(it.pattern),
        ...bilingual(it.explanation),
        ...it.examples.flatMap((ex) => bilingual(ex)),
      ])];
    case 'homework':
      return [head, ...sec.items.flatMap((it) => [
        ...bilingual(it.task),
        ...(it.answerKey ? [en(`Answer key: ${it.answerKey}`, { color: AMBER })] : []),
      ])];
    default:
      return [head];
  }
}

export async function generateReportDocx(model: ReportDocModel): Promise<Buffer> {
  const { header } = model;
  const metaParts = [
    header.studentName, header.sessionDate, header.topic,
    header.durationMinutes ? `${header.durationMinutes} min` : null,
  ].filter(Boolean).join('  ·  ');

  const intro: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: 'HonuVibe.AI', font: EN_FONT, bold: true, size: 32, color: '1A1F2E' })] }),
    new Paragraph({ children: [new TextRun({ text: '1v1 Session Report', font: EN_FONT, size: 20, color: '64748B' })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: metaParts, font: EN_FONT, size: 18, color: '94A3B8' })], spacing: { after: 160 } }),
  ];

  if (header.variant === 'teacher') {
    intro.push(new Paragraph({
      children: [new TextRun({ text: 'TEACHER COPY — contains answer keys & instructor notes · not for student', font: EN_FONT, bold: true, color: AMBER })],
      spacing: { after: 160 },
    }));
  }

  const doc = new Document({
    creator: 'HonuVibe.AI',
    title: `1v1 Session Report — ${header.studentName}`,
    sections: [{ children: [...intro, ...model.sections.flatMap(renderSection)] }],
  });

  return Packer.toBuffer(doc);
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm verify:fast`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/tutoring/generate-report-docx.ts
git commit -m "feat(tutoring): branded .docx renderer for session reports"
```

---

## Task 5: Download route + tests

**Files:**
- Create: `app/api/tutoring/[reportId]/document/route.ts`
- Test: `__tests__/api/tutoring-document.test.ts`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`; `getReportForAdmin`, `getTutoringCourse` from `@/lib/tutoring/queries`; `buildReportModel`; `generateReportPdf`; `generateReportDocx`.
- Produces: `GET(request, { params })` returning a file stream or JSON error; `export const runtime = 'nodejs'`; `export const maxDuration = 60`.

- [ ] **Step 1: Write the failing route tests**

Create `__tests__/api/tutoring-document.test.ts`. Mock Supabase and both renderers (so tests are fast and never fetch fonts):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getUserMock, fromMock, roleSingleMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
  roleSingleMock: vi.fn(),
}));
const { getReportForAdminMock, getTutoringCourseMock } = vi.hoisted(() => ({
  getReportForAdminMock: vi.fn(),
  getTutoringCourseMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));
vi.mock('@/lib/tutoring/queries', () => ({
  getReportForAdmin: getReportForAdminMock,
  getTutoringCourse: getTutoringCourseMock,
}));
vi.mock('@/lib/tutoring/generate-report-pdf', () => ({
  generateReportPdf: vi.fn(async () => Buffer.from('%PDF-stub')),
}));
vi.mock('@/lib/tutoring/generate-report-docx', () => ({
  generateReportDocx: vi.fn(async () => Buffer.from('PK-stub')),
}));

import { GET } from '@/app/api/tutoring/[reportId]/document/route';

function req(query: string): Request {
  return new Request(`http://localhost/api/tutoring/r1/document${query}`);
}
const ctx = { params: Promise.resolve({ reportId: 'r1' }) };

function asAdmin() {
  getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
  roleSingleMock.mockResolvedValue({ data: { role: 'admin' } });
  fromMock.mockReturnValue({ select: () => ({ eq: () => ({ single: roleSingleMock }) }) });
}

const fullReport = {
  status: 'review',
  session_date: '2026-07-08',
  topic: 'Articles',
  duration_minutes: 60,
  course_id: 'c1',
  student_id: 's1',
  student_json: { snapshot: { summary_en: 'x', summary_jp: 'x' }, wins: [], trouble_spots: [], recurring_patterns: [], study_areas: [], vocabulary: [], grammar_points: [], homework: [], next_session_focus: { focus_en: 'x', focus_jp: 'x' } },
  private: { instructor_json: { snapshot: { summary_en: 'x', summary_jp: 'x' }, wins: [], trouble_spots: [], recurring_patterns: [], study_areas: [], vocabulary: [], grammar_points: [], homework: [], next_session_focus: { focus_en: 'x', focus_jp: 'x' }, instructor_analysis: 'secret' }, margin_notes: null },
};

describe('GET /api/tutoring/[reportId]/document', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTutoringCourseMock.mockResolvedValue({ title_en: 'Private Tutoring', student: { full_name: 'Shiori' } });
  });

  it('rejects an invalid variant with 400', async () => {
    asAdmin();
    const res = await GET(req('?variant=nope&format=pdf') as never, ctx as never);
    expect(res.status).toBe(400);
  });

  it('rejects an invalid format with 400', async () => {
    asAdmin();
    const res = await GET(req('?variant=student&format=xls') as never, ctx as never);
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await GET(req('?variant=student&format=pdf') as never, ctx as never);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-admin', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    roleSingleMock.mockResolvedValue({ data: { role: 'student' } });
    fromMock.mockReturnValue({ select: () => ({ eq: () => ({ single: roleSingleMock }) }) });
    const res = await GET(req('?variant=student&format=pdf') as never, ctx as never);
    expect(res.status).toBe(403);
  });

  it('returns 409 when status is not review/published', async () => {
    asAdmin();
    getReportForAdminMock.mockResolvedValue({ ...fullReport, status: 'generating' });
    const res = await GET(req('?variant=teacher&format=pdf') as never, ctx as never);
    expect(res.status).toBe(409);
  });

  it('returns a PDF attachment on the happy path', async () => {
    asAdmin();
    getReportForAdminMock.mockResolvedValue(fullReport);
    const res = await GET(req('?variant=student&format=pdf') as never, ctx as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run -- tutoring-document`
Expected: FAIL — route module not found.

- [ ] **Step 3: Write the route**

Create `app/api/tutoring/[reportId]/document/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getReportForAdmin, getTutoringCourse } from '@/lib/tutoring/queries';
import { buildReportModel, type DocVariant } from '@/lib/tutoring/report-document-model';
import { generateReportPdf } from '@/lib/tutoring/generate-report-pdf';
import { generateReportDocx } from '@/lib/tutoring/generate-report-docx';
import type { GeneratedSessionReport, StudentReport } from '@/lib/tutoring/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const PDF_TYPE = 'application/pdf';
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function asciiSlug(name: string): string {
  const cleaned = name.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'student';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
    const url = new URL(request.url);
    const variant = url.searchParams.get('variant');
    const format = url.searchParams.get('format');

    if (variant !== 'student' && variant !== 'teacher') {
      return NextResponse.json({ error: 'Invalid variant.' }, { status: 400 });
    }
    if (format !== 'pdf' && format !== 'docx') {
      return NextResponse.json({ error: 'Invalid format.' }, { status: 400 });
    }

    // Auth: role check first for a clean 403 before any load.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const report = await getReportForAdmin(reportId);
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    // Explicit status guard BEFORE payload presence, so a stale payload on a
    // failed/generating row can never be exported.
    if (report.status !== 'review' && report.status !== 'published') {
      const why = report.status === 'generating'
        ? 'This report is still generating.'
        : report.status === 'failed'
          ? 'This report failed to generate.'
          : `This report cannot be exported (status "${report.status}").`;
      return NextResponse.json({ error: why }, { status: 409 });
    }

    const payload: StudentReport | GeneratedSessionReport | null =
      variant === 'student' ? report.student_json : report.private?.instructor_json ?? null;
    if (!payload) {
      return NextResponse.json({ error: 'This report has no content to export.' }, { status: 409 });
    }

    const course = await getTutoringCourse(report.course_id);
    const studentName = course?.student?.full_name ?? null;

    const model = buildReportModel(variant as DocVariant, {
      payload,
      studentName,
      courseTitleEn: course?.title_en ?? 'Private Tutoring',
      sessionDate: report.session_date,
      topic: report.topic,
      durationMinutes: report.duration_minutes,
      marginNotes: variant === 'teacher' ? report.private?.margin_notes ?? null : null,
    });

    const buffer = format === 'pdf' ? await generateReportPdf(model) : await generateReportDocx(model);

    const suffix = variant === 'teacher' ? '-TEACHER' : '';
    const base = `HonuVibe-1v1-${asciiSlug(studentName ?? 'student')}-${report.session_date}${suffix}`;
    const exactBase = `HonuVibe-1v1-${(studentName ?? 'student')}-${report.session_date}${suffix}`;
    const ext = format;
    const asciiName = `${base}.${ext}`;
    const utf8Name = encodeURIComponent(`${exactBase}.${ext}`);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': format === 'pdf' ? PDF_TYPE : DOCX_TYPE,
        'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[Tutoring Document] Error:', error);
    return NextResponse.json({ error: 'Failed to generate document.' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run -- tutoring-document`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/api/tutoring/[reportId]/document/route.ts" __tests__/api/tutoring-document.test.ts
git commit -m "feat(tutoring): download route for report documents (student/teacher, pdf/docx)"
```

---

## Task 6: Pass `hasStudentJson` from the page

**Files:**
- Modify: `app/[locale]/admin/tutoring/[courseId]/reports/[reportId]/page.tsx`

**Interfaces:**
- Produces: a new `hasStudentJson: boolean` prop on the `SessionReportReviewPanel` `report` object (consumed in Task 7).

- [ ] **Step 1: Add the prop**

In `app/[locale]/admin/tutoring/[courseId]/reports/[reportId]/page.tsx`, inside the `report={{ … }}` object passed to `<SessionReportReviewPanel>`, add one line (alongside `instructorJson`):

```tsx
          hasStudentJson: !!report.student_json,
```

(`getReportForAdmin` already selects `student_json` in `REPORT_COLUMNS`, so `report.student_json` is populated.)

- [ ] **Step 2: Type-check**

Run: `pnpm verify:fast`
Expected: type error in `SessionReportReviewPanel` (prop not yet in `ReportProp`) — that's fine; Task 7 adds it. If you prefer a green checkpoint, do Steps 1 of Task 7 before type-checking. Otherwise proceed to Task 7 and commit them together.

> **Note:** Task 6 and Task 7 both touch the panel's prop contract. Commit them together at the end of Task 7 (there is no independently-green checkpoint between adding the prop on the page and consuming it in the panel).

---

## Task 7: Panel UI — download groups + dirty guard

**Files:**
- Modify: `components/admin/SessionReportReviewPanel.tsx`

**Interfaces:**
- Consumes: the `GET …/document` route; the `hasStudentJson` prop from Task 6.

- [ ] **Step 1: Add `hasStudentJson` to the prop type**

In the `ReportProp` type (around line 17), add:

```ts
  hasStudentJson: boolean;
```

- [ ] **Step 2: Add dirty tracking**

Add a `dirty` state and mark it on edits. Just below the existing `useState` declarations (after line 148), add:

```ts
  const [dirty, setDirty] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
```

Change the `patch` helper (line 150-151) to set dirty:

```ts
  const patch = (u: (r: GeneratedSessionReport) => GeneratedSessionReport) => {
    setData((prev) => (prev ? u(prev) : prev));
    setDirty(true);
  };
```

Mark the four metadata inputs dirty. Replace the three `Field` onChange props in the metadata grid (lines 459-461) and the margin-notes `Area` (line 728) so each also flips `dirty`:

```tsx
              <Field label="Session date" value={sessionDate} onChange={(v) => { setSessionDate(v); setDirty(true); }} type="date" />
              <Field label="Topic" value={topic} onChange={(v) => { setTopic(v); setDirty(true); }} />
              <Field label="Duration (min)" value={duration} onChange={(v) => { setDuration(v); setDirty(true); }} type="number" />
```

```tsx
                <Area label="Margin notes (private)" value={marginNotes} onChange={(v) => { setMarginNotes(v); setDirty(true); }} rows={2} />
```

In `handleSave`, clear dirty on success — add `setDirty(false);` right after `flash(true, 'Saved.');` (line 171):

```ts
        flash(true, 'Saved.');
        setDirty(false);
```

- [ ] **Step 3: Add the download handler**

Add this function inside the component (e.g. after `handleViewWorksheet`, around line 282):

```ts
  async function handleDownload(variant: 'student' | 'teacher', format: 'pdf' | 'docx') {
    const tag = `${variant}-${format}`;
    setDownloading(tag);
    setMsg(null);
    try {
      const res = await fetch(`/api/tutoring/${report.id}/document?variant=${variant}&format=${format}`);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        flash(false, j.error ?? 'Download failed.');
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') ?? '';
      const m = /filename="([^"]+)"/.exec(cd);
      const name = m?.[1] ?? `HonuVibe-1v1-${variant}.${format}`;
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      flash(false, 'Network error.');
    } finally {
      setDownloading(null);
    }
  }
```

- [ ] **Step 4: Add the download UI**

Render a download card inside the `{data && ( … )}` block, right after the metadata/view-toggle bar (after the closing `</div>` of that bar, before the `view === 'preview'` conditional — around line 483). Only shown when the report is exportable:

```tsx
          {(isReview || isPublished) && (
            <div className="rounded-xl border border-border-default bg-bg-secondary p-4">
              <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                <DownloadGroup
                  label="Send to student"
                  disabled={!report.hasStudentJson || dirty}
                  downloading={downloading}
                  onDownload={(f) => handleDownload('student', f)}
                  variant="student"
                />
                <DownloadGroup
                  label="Teacher copy (next session)"
                  disabled={!data || dirty}
                  downloading={downloading}
                  onDownload={(f) => handleDownload('teacher', f)}
                  variant="teacher"
                />
              </div>
              {dirty && (
                <p className="mt-2 text-[12px] text-amber-600">Save changes before downloading.</p>
              )}
            </div>
          )}
```

- [ ] **Step 5: Add the `DownloadGroup` presentational component**

Add near the other small helpers at the top of the file (e.g. after `AddButton`, around line 120):

```tsx
function DownloadGroup({
  label, disabled, downloading, onDownload, variant,
}: {
  label: string;
  disabled: boolean;
  downloading: string | null;
  onDownload: (format: 'pdf' | 'docx') => void;
  variant: 'student' | 'teacher';
}) {
  const btn = (format: 'pdf' | 'docx', text: string) => {
    const tag = `${variant}-${format}`;
    return (
      <button
        type="button"
        onClick={() => onDownload(format)}
        disabled={disabled || downloading === tag}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] text-fg-secondary hover:border-accent-teal hover:text-accent-teal disabled:opacity-50"
      >
        {downloading === tag ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {text}
      </button>
    );
  };
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-medium text-fg-tertiary">{label}</p>
      <div className="flex items-center gap-2">
        {btn('pdf', 'PDF')}
        {btn('docx', 'Word')}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Import the `Download` icon**

In the lucide-react import (line 5), add `Download`:

```ts
import { Loader2, Trash2, Plus, ExternalLink, Eye, PencilLine, Images, X, Download } from 'lucide-react';
```

- [ ] **Step 7: Type-check + tests + build (full gate)**

Run: `pnpm verify`
Expected: PASS — type-check clean (page prop + panel prop now match), all tests green, build succeeds.

- [ ] **Step 8: Commit (Tasks 6 + 7 together)**

```bash
git add "app/[locale]/admin/tutoring/[courseId]/reports/[reportId]/page.tsx" components/admin/SessionReportReviewPanel.tsx
git commit -m "feat(tutoring): download buttons on report panel (student/teacher, dirty-guarded)"
```

---

## Final verification (before ship)

- [ ] **Automated gate:** `pnpm verify` green (type-check → tests → build). `test:rls` not required (no RLS change).
- [ ] **Manual — download all four combinations** from a real `review`-status report (`/admin/tutoring/{id}/reports/{reportId}`):
  - Branding present (dark header bar, teal accent, footer + page numbers).
  - **Japanese wraps correctly** — no column overflow, no clipped text, no tofu (□) boxes.
  - **Student PDF & Word:** no instructor analysis, no homework answer keys.
  - **Teacher PDF & Word:** TEACHER COPY band present; instructor analysis + answer keys shown; margin notes appear only if present.
  - Filenames follow `HonuVibe-1v1-<Name>-<date>[-TEACHER].<ext>`; PDF opens in a viewer, `.docx` opens in Word.
- [ ] **Dirty guard:** edit any field without saving → all four buttons disable + "Save changes before downloading" hint; Save → re-enable and the download reflects the edit.
- [ ] **Disabled states:** on a `generating`/`failed` report the buttons are disabled/absent.
- [ ] **Syllabus regression:** download an existing course syllabus PDF (EN and JP) via `/api/courses/{id}/syllabus?locale=en|ja&preview=true` — EN unchanged at the visual/text level, JP now wraps properly (bonus from the shared font change). Visual check, not a byte diff.
- [ ] **Ship:** stage only the intentional files, commit to `main`, push. Do **not** stage the unrelated working-tree files (AdminWorkbench, smashhaus, SmashHaus.html).

## Notes / risks

- **Font tracing:** the `outputFileTracingIncludes` entry is what makes the bundled `.ttf`s ship to Vercel. If a deploy ever renders tofu/blank JP in prod, confirm the fonts were traced; the `src()` fallback to the Google CDN keeps rendering working (just network-dependent) even if tracing misses.
- **No prod migration / no manual Supabase step** — this feature adds no schema. Standard deploy only.
- **`docx` Yu Gothic:** Word substitutes an available JP face if Yu Gothic is absent on the reader's machine; JP still renders (docx does not embed fonts).
