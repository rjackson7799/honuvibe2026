# Course/Class Surveys — Generalization Plan v2

## Context

Generalize the survey system so any **course** can have an admin-built survey, auto-assigned to enrolled students, with an **instructor cohort summary** — reusing the per-student assignment system and mirroring the event build. AI Essentials stays legacy (untouched).

Locked decisions:
- **Per-course scope** — bind to `course_id` (no cohort↔course link exists; a re-run is a new `courses` row). One survey per course.
- **Editable until close** — students may update answers until `closes_at` (upsert); page gates on `closes_at`, not assignment `completed` status.
- **Admin view + email instructors** — summary in the admin view AND emailed to the course's instructor(s) via `course_instructors`, mirroring the event presenter email.

### Reusable pieces (verified)
- Token flow: `survey_assignments` + `validateSurveyToken` (lib/survey/actions.ts) + `assignSurvey` (lib/admin/actions.ts:249).
- `getEnrolledStudents(courseId)` (lib/courses/queries.ts:382); `getActiveCourses()`; instructors via `course_instructors`→`instructor_profiles.user_id`→`users.email`.
- Generic `survey_questions` + builder components + `reorder_survey_questions` RPC.
- Event dynamic form (EventSurveyForm), summarizer/aggregation (lib/survey/event-summary.ts), send-state pattern (lib/survey/send-presenter-summary.ts), escaping (lib/email/escape.ts).

### Review fixes folded in
1. Idempotent batch assign (pre-fetch existing assignments; insert only new students). `assignSurvey` is a plain insert that errors on the unique constraint — single-use unchanged.
2. Bind survey to the selected course in AddStudentFlow (not an independent dropdown).
3. Dedicated `course_survey_summaries` (not AI-Essentials-shaped `survey_summaries`).
4. Generic summary renderer (not `SurveySummaryPanel`).
5. Slug = `course-${courseSlug}` (URL-safe, unique).
6. Extend `validateSurveyToken` to return `surveyId`+`kind`; submit asserts slug match + `kind='course'`.

## Data model — migration `supabase/migrations/050_course_surveys.sql` (apply manually)
- ALTER `surveys`: add `course_id uuid REFERENCES courses(id) ON DELETE SET NULL`; partial unique on `course_id WHERE course_id IS NOT NULL`.
- `course_survey_responses`: survey_id FK CASCADE, `user_id` FK auth.users CASCADE, `assignment_id` FK survey_assignments SET NULL, locale, `answers jsonb`, `answer_snapshot jsonb`, submitted_at, updated_at. UNIQUE(survey_id, user_id); index user_id. RLS admin-all.
- `course_survey_settings`: survey_id PK FK CASCADE, `generate_student_profile bool DEFAULT false`, opens_at, closes_at, timestamps. RLS admin-all.
- `course_survey_summaries`: survey_id PK FK CASCADE, schema_version, `content jsonb` (summary_text, key_takeaways[], teaching_focus, instructor_notes), stats jsonb, response_count, generated_at. RLS admin-all.
- `course_survey_summary_delivery`: survey_id PK FK CASCADE, status, attempt_count, last_attempt_at, sent_at, provider_message_id, last_error, last_via, recipient_to text[], recipient_cc text[], updated_at. RLS admin-all.

## Implementation — phased
- **A — Schema + helpers**: migration 050; `getActiveSurveys()` returns `course_id,kind` + filters `kind='course'`; `validateSurveyToken` returns `surveyId`+`kind`.
- **B — Builder**: `lib/survey/course-surveys.ts`, `lib/admin/course-survey-actions.ts` (`upsertCourseSurvey`, question CRUD shared, activation guard, locking, reorder RPC), `/admin/course-surveys` list + `[courseId]` builder, `CourseSurveyBuilder` (reuse QuestionList/Editor/Options), nav item.
- **C — Assign (idempotent) + AddStudentFlow binding**: `assignCourseSurveyToEnrolled(courseId)` (insert only new; reuse tokens; email links); "Assign to all enrolled" button + status; AddStudentFlow shows only the selected course's bound survey (+ unbound legacy).
- **D — Public form + submit (editable until close)**: extract shared `components/survey/SurveyForm.tsx`; `/survey/[slug]` route (assert `kind='course'` + slug match, gate on `closes_at`); `/api/survey/[slug]/respond` (validate vs manifest, upsert on (survey_id,user_id), mark completed, after→regenerate).
- **E — Summary + instructor email + admin view**: shared `lib/survey/aggregate.ts`; `lib/survey/course-summary.ts`→`course_survey_summaries`; generic `SurveySummaryView`; `lib/survey/send-course-summary.ts` + `sendCourseSummaryEmail` (To instructors, BCC admins, escaped, truthful delivery); admin "Send to instructor(s)" button. (Scheduled cron before course start = optional follow-up.)
- **F — Verify**: type-check + build per phase; `pnpm verify`; RLS test for `course_survey_*`; end-to-end build→assign→submit→edit→summary→instructor email; confirm AI Essentials unchanged + event surveys absent from AddStudentFlow picker.

## Out of scope / risks
- AI Essentials stays legacy (no data/form migration). Student-profile generalization deferred (flag off). Scheduled instructor email deferred. No cohort-level scoping.

## Out-of-band steps
1. Apply `050_course_surveys.sql` in the Supabase dashboard before deploying code that reads it.
