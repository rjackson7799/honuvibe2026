# Pre-Event Surveys

## Context

We have a working but **purpose-built** survey system (the "AI Essentials" pre-course survey): hardcoded questions in `app/[locale]/survey/ai-essentials/survey-form.tsx`, typed columns in `survey_responses`, and an AI cohort summary (`lib/survey/summarize.ts` → `survey_summaries`) whose `instructor_notes` output is essentially a "help the instructor prepare" brief.

Goal: **extend the survey concept to the Events module** — after someone registers for a public event, link them to a **pre-event survey**; aggregate the answers into an AI summary; and email that summary to the **presenter** before the event so they can tailor the session to the audience.

Decisions:
1. **Admin question builder** — questions authored per event in the admin UI (not hardcoded), answers stored as JSONB.
2. **Both delivery modes** — manual "send to presenter" button AND automatic scheduled send (~24h before).
3. **Recipients: presenter + admin** — send to presenter, CC admin.

### Current-state facts
- **Events already use double opt-in.** Migration 048 (`event_rsvps`) has `confirm_token uuid UNIQUE`, `status` pending→confirmed, atomic `claim_event_seat()`. The RSVP route sends a *"confirm your seat"* email; the *"you're in"* email (`sendEventRsvpConfirmation`) fires from `app/[locale]/events/[slug]/confirm/page.tsx` (lines 57–100) on first confirmation. **This is the survey-link insertion point.**
- **Public events are code-defined** in `lib/events/public-events.ts`; admin RSVP view is `/admin/event-registrations`.
- **`surveys` + `survey_summaries` registry is reusable** (keyed by `survey_id`); the AI Essentials responses table + summarizer are not.
- **No cron infra exists.** Prod migrations are applied manually in Supabase after deploy. pnpm; commit to `main`.

## Architecture decisions (resolved)
- Reuse `surveys` registry: one row per event survey, `kind='event'`, `event_slug = PublicEvent.slug`. AI Essentials stays `kind='course'`.
- Reuse `survey_summaries` (keyed by `survey_id`); columns remapped for presenter audience (`tool_recommendations`→"Focus topics", `instructor_notes`→"Presenter prep notes").
- New JSONB response table `event_survey_responses`.
- Presenter email lives on the `surveys` row (`presenter_email`), set in the admin builder — no code deploy to change it.
- Identity link = the existing `confirm_token`.
- Scheduled send = Vercel Cron → a `CRON_SECRET`-guarded route. Send-state in a slug-keyed ledger table.

## Data model — `supabase/migrations/049_event_surveys.sql`
1. ALTER `surveys`: `kind` ('course'|'event'), `event_slug`, `presenter_email`, `intro_en`, `intro_jp`; partial unique index on `event_slug`.
2. `survey_questions` (manifest): id, survey_id FK, position, qtype (single|multi|text), prompt_en/jp, help_en/jp, options jsonb (`[{value,label_en,label_jp}]`), required, max_select. RLS admin-all + public-read for active event surveys.
3. `event_survey_responses` (answers): id, survey_id, event_slug, rsvp_id FK→event_rsvps, email, locale, answers jsonb (`{question_id: string|string[]}`), submitted_at. Partial unique `(survey_id, rsvp_id)`. RLS admin-all, no public read.
4. `event_presenter_summary_sends` (ledger): event_slug PK, presenter_summary_sent_at, sent_via, response_count_at_send, recipient_to/cc, last_email_status/error. RLS admin-all.

Stable answer keys: answers store `question_id → option.value` (never labels).

## Implementation — phased

### Phase 1 — Data model + admin question builder ✅ (built, awaiting review)
- `supabase/migrations/049_event_surveys.sql`
- `lib/survey/event-surveys.ts` — shared data access (`getEventSurvey`, `getQuestions`, `getEventSurveyWithQuestions`, `getEventSurveyStatuses`, `eventSurveySlug`).
- `lib/admin/event-survey-schema.ts` — zod schemas + input types (plain module).
- `lib/admin/event-survey-actions.ts` — `upsertEventSurvey`, `createQuestion`, `updateQuestion`, `deleteQuestion`, `reorderQuestions`.
- `app/[locale]/admin/event-surveys/page.tsx` (list) + `[eventSlug]/page.tsx` (builder).
- `components/admin/event-survey/{EventSurveyBuilder,QuestionList,QuestionEditor,OptionsEditor}.tsx`.
- `components/admin/AdminNav.tsx` — "Event Surveys" in Community group.

### Phase 2 — Public form + submission + wire into confirm flow
- `app/[locale]/events/[slug]/survey/page.tsx`, `components/events/EventSurveyForm.tsx`, `app/api/events/[slug]/survey/route.ts`.
- Modify `app/[locale]/events/[slug]/confirm/page.tsx` + `sendEventRsvpConfirmation` (+ `EventRsvpConfirmationData`) to carry an optional survey CTA. Bilingual public strings in `messages/{en,ja}.json`.

### Phase 3 — AI summary + presenter email + manual send
- `lib/survey/event-summary.ts` (`regenerateEventSurveySummary`, `getEventSummaryForSend`), `lib/survey/send-presenter-summary.ts`.
- `lib/email/recipients.ts` (`getAdminRecipients`), `lib/email/types.ts` (`PresenterSummaryEmailData`), `lib/email/send.ts` (`sendPresenterSummaryEmail`).
- `lib/events/public-rsvps-actions.ts` (`sendPresenterSummaryAction`), `lib/events/public-rsvps.ts` (`getPresenterSummarySends`).
- `app/[locale]/admin/event-registrations/page.tsx` + `components/admin/AdminEventRsvpList.tsx` — "Send summary to presenter" button + last-sent.

### Phase 4 — Scheduled send (cron)
- `app/api/cron/presenter-summaries/route.ts` (CRON_SECRET-guarded), `vercel.json` crons (hourly).

## Open risks
- Editing questions after responses exist (orphan answer keys) — warn when responses > 0; summarizer buckets unknowns as "other".
- Anonymous/token-less link sharing — resolves anonymous; per-RSVP dedupe doesn't apply.
- Graceful degradation (no 500 when survey off/empty); seat decoupling; cron double-send prevented by ledger PK.

## Verification
- Apply `049_event_surveys.sql` in Supabase; add `event_survey_responses_rls.test.ts`.
- Admin builder → create survey for `ai-prompting-jumpstart`, add questions, set presenter email, activate.
- End-to-end: register → confirm → survey CTA in email/card → submit → row in `event_survey_responses`.
- Manual send + cron send idempotency. `pnpm type-check` / `pnpm build`.

## Out-of-band steps
1. Apply `049_event_surveys.sql` manually in the Supabase dashboard.
2. Add `vercel.json` cron + set `CRON_SECRET` in Vercel env.
