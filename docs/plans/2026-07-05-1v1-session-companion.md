# 1v1 Session Companion — LMS Integration Plan (Shiori Pilot)

> Status: **Approved by Ryan 2026-07-05.** Execute in a fresh session per `docs/dev-workflow.md`
> (use `docs/plans/_EXECUTION_TEMPLATE.md` as the execution prompt).

## Context

HonuVibe is adding premium 1v1 tutoring, piloting with Shiori (ESL). Ryan records each session, transcribes it externally (ElevenLabs app → text), and wants: paste transcript → Claude generates a structured diagnostic report (wins, trouble spots with quote→correction→JP explanation, vocab, grammar points, homework, next-session focus) → Ryan reviews/edits → publishes → Shiori sees it in her dashboard + gets a bilingual email. A longitudinal per-student pattern profile accumulates trouble-spot categories across sessions and feeds each new report's "recurring patterns" section. This productizes 1v1 as a future paid subscription tier; Shiori is test case #1.

**Decisions made with Ryan:**
- Engagement = **private `courses` row** (`course_type='1v1'`, `is_private=true`, `is_published=true`, `max_enrollment=1`) — inherits enrollment, dashboard, CourseHub, AddStudentFlow onboarding, and the course-survey diagnostic questionnaire with **zero survey code changes**.
- Full core loop in scope (onboarding → transcript → report → review → publish → student view + email).
- Ad-hoc admin flow (session record created at transcript upload; no pre-scheduling).
- Raw transcripts kept in a **private storage bucket** (vault-private pattern), never in Postgres, never client-readable.
- Model: **`claude-opus-4-8`** (no temperature/top_p — 400s on Opus 4.8; no `thinking` — incompatible with forced tool_choice).

**Key reuse (verified):** ESL generate→review→publish pipeline (`app/api/esl/generate/route.ts` — 202 + `after()` background task + service-role writes), tool_use + Zod structured output (`lib/esl/generator.ts:230-276`), private-boundary RLS pattern (`supabase/migrations/041_vault_access_boundary.sql`), CourseHub tabs (`components/learn/CourseHub.tsx`), email pattern (`sendCourseSurveyInvite` in `lib/email/send.ts`).

**Critical design point:** Postgres RLS is row-level, not column-level, so instructor-only content (homework answer keys, candid analysis) **cannot** live on a student-readable row. One Claude generation is deterministically split into `student_json` (on `session_reports`, student-readable when published) and `instructor_json` (on `session_report_private`, admin-only RLS, no student policy) — same boundary pattern as migration 041's `vault_article_bodies`.

---

## 1. Migration `supabase/migrations/052_tutoring_1v1.sql`

- **Widen course_type**: drop + re-add `courses_course_type_check` as `('cohort','self-study','1v1')` (currently at `001_phase2_schema.sql:52`). Also add `'1v1'` to `CourseType` in `lib/courses/types.ts:27`.
- **`session_reports`** (student-safe parent): `id, course_id FK, student_id FK users, session_date date, topic, duration_minutes, status ('generating'|'review'|'published'|'failed'), student_json jsonb, published_at, patterns_applied_at, created_by, created_at, updated_at`. Indexes on `(course_id, session_date DESC)` and `(student_id, status)`. Deliberately NOT unique on (course, student, date) — two sessions/day possible.
- **`session_report_private`** (instructor-only child, PK=report_id FK cascade): `transcript_ref` (bucket path), `margin_notes`, `instructor_json`, `generation_error`, `model_id`, `reviewed_by/at`, `updated_at`.
- **`student_patterns`** (longitudinal accumulator): `course_id, student_id, category, label_en, label_jp, occurrence_count, last_seen_on, examples jsonb` (last 3 `{quote, correction, session_date}`), `UNIQUE(course_id, student_id, category)`.
- **RLS**: `session_reports` — student SELECT where `status='published' AND student_id=auth.uid()`; admin ALL via `public.is_admin()`. `session_report_private` and `student_patterns` — admin-only, **no student policy** (structural boundary).
- **Storage**: bucket `tutoring-private` (`public=false`), admin-only INSERT/UPDATE/DELETE policies, **no SELECT policy** — reads only via service-role signed URLs. Path convention `{course_id}/{report_id}/transcript.txt`.
- Prod: apply manually in Supabase dashboard SQL editor (`zvfwtndbxshrtpwcwynw`) before deploy.

## 2. Report schema — `lib/tutoring/schemas.ts`

`PATTERN_CATEGORIES` enum slug list (articles, prepositions, verb_tense, subject_verb_agreement, plurals_countability, word_order, word_choice, pronunciation, listening_comprehension, register_politeness, question_formation, connectors_transitions, katakana_english, other).

`generatedSessionReportSchema` (Zod, bilingual `_en`/`_jp` per ESL convention):
- `snapshot {summary_en/jp}` · `wins[] {win_en/jp, quote?}` (min 1)
- `trouble_spots[] {id, quote (verbatim), correction, explanation_en/jp, pattern_category (enum), pattern_label_en/jp}` (min 1)
- `recurring_patterns[] {category, note_en/jp, trend: improving|persistent|new}`
- `study_areas[] {area_en/jp, why_en/jp}` · `vocabulary[] {id, term_en/jp, reading_en?, example_en/jp}`
- `grammar_points[] {id, title_en/jp, pattern, explanation_en/jp, examples[1-3]}`
- `homework[] {id, task_en/jp, answer_key_en ← INSTRUCTOR-ONLY}` (min 1)
- `next_session_focus {focus_en/jp}` · `instructor_analysis ← INSTRUCTOR-ONLY`

Parallel hand-written Anthropic tool `input_schema` (`submit_session_report`) exactly like `ESL_CONTENT_TOOL` (`lib/esl/generator.ts:63-177`).

`splitReport()` in `lib/tutoring/split.ts` (pure, unit-tested): `instructor_json` = full; `student_json` = full minus `instructor_analysis` and `homework[].answer_key_en`, typed so `StudentReport` structurally cannot contain instructor-only keys. Re-derived on every admin save so the variants can't drift.

## 3. File-by-file build

**`lib/tutoring/`** (each clones its `lib/esl/` counterpart):
- `types.ts`, `schemas.ts` (above), `split.ts`
- `prompt.ts` — system prompt (ESL diagnostician for Japanese-L1 adult learner; quote verbatim; encouraging student tone; candid instructor_analysis; cap lists ≤8 trouble spots / ≤10 vocab) + `buildSessionReportPrompt(context)` injecting prior patterns
- `generator.ts` — `generateSessionReport(context)`: raw fetch to api.anthropic.com, `model: 'claude-opus-4-8'`, `max_tokens: 16384`, forced tool_choice, Zod parse; throw descriptive error on `stop_reason === 'max_tokens'`
- `queries.ts` — `getPublishedReportsForStudent(courseId, userId)` (user-scoped client, RLS filters), admin queries (reports per course, patterns per student)
- `actions.ts` — `'use server'`, local `requireAdmin()` (clone `lib/admin/course-survey-actions.ts`): `updateSessionReport` (Zod-validate, re-split), `deleteSessionReport`; `revalidatePath` both locales
- `patterns.ts` — deterministic upsert (§4)

**API routes** (`app/api/tutoring/`, cloning `app/api/esl/*` + vault download):
- `generate/route.ts` — POST → admin/instructor check → insert report row (`generating`) + private stub → upload transcript to bucket (service role) → **202** → `after()`: load top ~10 `student_patterns`, generate, split, write both JSONs, status `review`; catch → `failed` + `generation_error`. `export const maxDuration = 300` (Opus can take minutes). Guard pasted input ≤300K chars.
- `status/route.ts` — GET `?reportIds=` for admin polling
- `[reportId]/publish/route.ts` — `review→published`, stamp `published_at/reviewed_by`; run pattern upsert; send email; revalidate student course-hub path both locales
- `[reportId]/transcript/route.ts` — admin-only signed URL (3600s) to re-read the raw transcript

**Admin UI:**
- `components/admin/AdminNav.tsx` — add `{href: '/admin/tutoring', label: '1v1 Sessions', icon: UserRound}` to the Learning group
- `app/[locale]/admin/tutoring/page.tsx` — list `course_type='1v1'` courses (student, report count, last session)
- `app/[locale]/admin/tutoring/[courseId]/page.tsx` + `components/admin/TutoringCourseDashboard.tsx` — reports table (StatusBadge), "New session report" form (date/topic/duration/transcript textarea/margin notes → POST → poll), patterns sidebar
- `.../reports/[reportId]/page.tsx` + `components/admin/SessionReportReviewPanel.tsx` (clone ESLAdminDashboard/review patterns) — section-by-section edit of full report, student-view preview toggle (renders splitReport output), Regenerate (only `review`/`failed`; **blocked once published** — unpublish first), Publish. Admin strings hardcoded EN per convention.

**Student surface:**
- `components/learn/CourseHub.tsx` — conditional "1v1 Reports" tab when `course_type==='1v1'`; initialize `activeTab` from `?tab=` searchParam (email deep-link)
- `app/[locale]/learn/dashboard/[course-slug]/page.tsx` — fetch published reports when 1v1 + enrolled
- `components/learn/SessionReportsTab.tsx` + `SessionReportView.tsx` — report list → expanded view (snapshot, wins, trouble spots quote→correction→JP explanation, recurring patterns, study areas, vocab, grammar, homework sans answer keys, next focus); locale-aware `_en`/`_jp` selection
- `messages/en.json` / `ja.json` — new `tutoring` namespace

**Email:** `sendSessionReportReadyEmail` in `lib/email/send.ts` + `SessionReportReadyData` in types.ts — short bilingual notify (branch on `users.locale_preference`), `escapeHtml` everything, CTA → `/learn/dashboard/{slug}?tab=reports`. Re-send manual-only (button), never automatic on edit.

**No changes:** survey system (bind diagnostic via `/admin/course-surveys`), AddStudentFlow, enrollments.

## 4. Pattern loop (deterministic TS — Claude never writes `student_patterns`)

- **Read (generation):** prompt includes prior patterns as lines like `articles (Articles / 冠詞): seen 4 times, last 2026-06-21. Example: "I went to store" → "I went to the store"`; Claude marks `trend` and reuses category slugs.
- **Write (publish):** only if `patterns_applied_at IS NULL` — dedupe report's trouble spots by category, upsert each: `occurrence_count += 1` (one per category per session so five article mistakes ≠ 5 counts), `last_seen_on = session_date`, `examples` keep last 3. Then stamp `patterns_applied_at`. Post-publish edits never re-apply (accepted limitation).

## 5. Build order + verification

| Phase | Work | Gate |
|---|---|---|
| 1. Schema | Migration 052, CourseType edit, new RLS test `supabase/tests/session_reports_rls.test.ts` (student reads own published only; cannot read review/failed/others'/private/patterns) | `pnpm test:rls` (temp-rename dup migrations 022/025 first, restore after) + `pnpm verify` |
| 2. Core lib | `lib/tutoring/*` + unit tests (splitReport strips instructor keys; schema round-trip fixture) | `pnpm verify` |
| 3. API routes | generate/status/publish/transcript | `pnpm verify`; dev-server: real transcript → `generating→review`, inspect both JSONs; bad API key → `failed` + error |
| 4. Admin UI | Nav + tutoring pages + review panel | `pnpm verify`; browser: create → review → edit → publish |
| 5. Student + email | CourseHub tab, SessionReportsTab, messages, email | `pnpm verify`; browser smoke EN **and** `/ja` as test student; non-enrolled sees nothing; email deep-link works |
| 6. Pattern loop + pilot ops | patterns.ts wired into publish; two fixture reports → confirm counts feed a third generation. Ops: create Shiori's course (`1v1`, private, published, max 1), enroll her, bind diagnostic survey | Apply 052 in prod dashboard **before** deploy |

Ship per workflow: adversarial code review before commit, commit to main, push.

## 6. Risks / edge cases

- **Tokens:** 60–90 min transcript ≈ 10–25K tokens (trivial vs 1M input). Ceiling is output — 16384 max_tokens; prompt caps list lengths; generator throws explicit error on truncation.
- **Vercel duration:** `maxDuration = 300` on generate route (confirm plan allows).
- **Failure UX:** `failed` status + persisted error + Regenerate button; failed rows never student-visible (RLS requires `published`).
- **Edit after publish:** allowed, student sees immediately; pattern counts not recomputed (guard column); email re-send manual.
- **JP:** field-level `_en`/`_jp` everywhere student-facing; UI chrome via next-intl; dates via `Intl.DateTimeFormat(locale)`.
- **Privacy:** transcript never in Postgres or client-readable; instructor content structurally unreachable (separate table, no policy) — enforced by RLS tests, not just app code.
- **Side flag (separate follow-up, not this build):** `lib/esl/generator.ts:244` still calls `claude-sonnet-4-20250514`, past its June 15 2026 retirement — ESL generation is likely broken in prod today. One-line fix to `claude-sonnet-4-6`.

## Future (explicitly out of scope now)

Stripe subscription/packages for 1v1 time, multi-teacher marketplace (would add a thin `tutoring_engagements` table then), pre-scheduled sessions on her dashboard schedule, audio/pronunciation pipeline, Apply-It Workbench seeding, domain variants (AI coaching lens = prompt swap on the same engine).
