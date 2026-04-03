# Pre-Course Survey Module — AI Essentials
**Date:** 2026-04-02  
**Branch:** `feature/survey-module`  
**Status:** Complete — pending Supabase migration run + env var

---

## Context

Pre-course survey for the AI Essentials cohort (Vertice Society partnership). 13 questions, bilingual EN/JP inline, no auth required. Responses stored in Supabase, email notification via Resend, admin view for Ryan/Mizuho/Chimi.

---

## Files

| File | Status |
|------|--------|
| `supabase/migrations/021_survey_responses.sql` | ✅ done |
| `app/api/survey/submit/route.ts` | ✅ done |
| `app/survey/ai-essentials/page.tsx` | ✅ done |
| `app/[locale]/admin/surveys/page.tsx` | ✅ done |
| `components/admin/AdminSurveyList.tsx` (new) | ✅ done |
| `components/admin/AdminNav.tsx` (add Surveys link) | ✅ done |

---

## Progress

- [x] Worktree created: `.worktrees/feature/survey-module`
- [x] Plan reviewed, patterns confirmed
- [x] Migration created (`021_survey_responses.sql`)
- [x] API route created
- [x] Survey page created (TypeScript clean)
- [x] Admin page + `AdminSurveyList` component created
- [x] Admin nav updated (`ClipboardList` icon, `/admin/surveys` link)
- [ ] Run migration in Supabase dashboard
- [ ] Add `SURVEY_NOTIFICATION_EMAIL` env var (or falls back to `ADMIN_EMAIL`)

---

## Notes

- Migration number: 021 (020 = enrollment_notes, already exists)
- Supabase: use `createAdminClient()` from `lib/supabase/server.ts`
- Email: use `getResendClient()` + `getAdminEmail()` from `lib/email/client.ts`
- Env var needed: `SURVEY_NOTIFICATION_EMAIL` (fallback to `ADMIN_EMAIL`)
- Admin sidebar: `components/admin/AdminNav.tsx`, add entry with Lucide icon `ClipboardList`
- Survey route is outside `[locale]` — lives at `app/survey/ai-essentials/page.tsx`
