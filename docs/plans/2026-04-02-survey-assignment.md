# Survey Assignment for Admin Student Creation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link survey responses to specific students via a token-based assignment system, enabling admins to optionally assign a survey during student creation, include a survey link in the welcome email, and track completion status per student.

**Architecture:** Three DB changes (`surveys` table, `survey_assignments` table, two new nullable columns on `survey_responses`). New `lib/survey/actions.ts` validates tokens server-side. The admin wizard (`AddStudentFlow`) gains a survey dropdown; after saving it calls `assignSurvey()` to get a token and passes the survey URL to the welcome email. The survey page splits into a thin server wrapper (reads `searchParams`) and an existing-style client form (receives `token` prop, pre-fills name, guards completed state). The submit route optionally links the response to an assignment row.

**Tech Stack:** Supabase Postgres (service role for token ops), Next.js 14 App Router (server actions, RSC `searchParams`), TypeScript strict, Tailwind CSS, Resend email.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/022_surveys.sql` | Create | All DB schema changes |
| `lib/survey/actions.ts` | Create | `validateSurveyToken` server action |
| `lib/admin/types.ts` | Modify | Add `survey_status` to `StudentListItem` |
| `lib/admin/queries.ts` | Modify | Add `ActiveSurvey`, `getActiveSurveys()`, update `getStudentList()` |
| `lib/admin/actions.ts` | Modify | Add `assignSurvey()` |
| `lib/email/types.ts` | Modify | Add `courseTitle?`, `surveyUrl?` to `StudentWelcomeEmailData` |
| `lib/email/send.ts` | Modify | Rewrite `sendStudentWelcomeEmail()` with full personalized template |
| `lib/students/actions.ts` | Modify | Add `surveyUrl?` param to `sendStudentWelcomeEmailAction()` |
| `app/[locale]/admin/students/new/page.tsx` | Modify | Fetch and pass `activeSurveys` to `AddStudentFlow` |
| `components/admin/AddStudentFlow.tsx` | Modify | Survey dropdown, `assignSurvey` call, done screen update |
| `components/admin/AdminStudentList.tsx` | Modify | Add Survey status column |
| `app/[locale]/survey/ai-essentials/survey-form.tsx` | Create | Existing page content + token prop + completion guard |
| `app/[locale]/survey/ai-essentials/page.tsx` | Modify | Thin server wrapper that reads `searchParams.token` |
| `app/api/survey/submit/route.ts` | Modify | Accept `assignmentId`, link response, mark assignment complete |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/022_surveys.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/022_surveys.sql

-- 1. Survey registry
CREATE TABLE surveys (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT UNIQUE NOT NULL,
  title_en   TEXT NOT NULL,
  title_jp   TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the existing AI Essentials survey
INSERT INTO surveys (slug, title_en, title_jp)
VALUES (
  'ai-essentials',
  'AI Essentials Pre-Course Survey',
  'AIエッセンシャル 受講前アンケート'
);

-- 2. Per-student survey assignments
CREATE TABLE survey_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  survey_id    UUID NOT NULL REFERENCES surveys(id),
  token        UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'completed')),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, survey_id)
);

-- Index for fast token lookups (used on every survey page load with a token)
CREATE INDEX survey_assignments_token_idx ON survey_assignments(token);

-- 3. Link survey_responses to users and assignments (backward-compatible)
ALTER TABLE survey_responses
  ADD COLUMN user_id       UUID REFERENCES auth.users(id),
  ADD COLUMN assignment_id UUID REFERENCES survey_assignments(id);
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```

Expected output: migration applied successfully. Verify in Supabase dashboard that `surveys`, `survey_assignments` tables exist and `survey_responses` has `user_id` and `assignment_id` columns.

- [ ] **Step 3: Verify seed data**

In Supabase dashboard → Table Editor → `surveys`. Confirm one row with slug `ai-essentials`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/022_surveys.sql
git commit -m "feat: add surveys registry, survey_assignments, and link survey_responses to users"
```

---

## Task 2: Survey Server Action — validateSurveyToken

**Files:**
- Create: `lib/survey/actions.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/survey/actions.ts
'use server';

import { createClient } from '@supabase/supabase-js';

export type SurveyTokenResult = {
  userId: string;
  assignmentId: string;
  userName: string;
  surveySlug: string;
  status: 'pending' | 'completed';
} | null;

export async function validateSurveyToken(token: string): Promise<SurveyTokenResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('survey_assignments')
    .select(`
      id,
      status,
      user_id,
      survey:surveys(slug),
      user:users(full_name)
    `)
    .eq('token', token)
    .single();

  if (error || !data) return null;

  const survey = data.survey as { slug: string } | null;
  const user = data.user as { full_name: string | null } | null;

  return {
    userId: data.user_id,
    assignmentId: data.id,
    userName: user?.full_name ?? '',
    surveySlug: survey?.slug ?? '',
    status: data.status as 'pending' | 'completed',
  };
}
```

- [ ] **Step 2: Manual smoke test**

In Supabase dashboard, insert a test row into `survey_assignments` (pick any valid `user_id` and `survey_id`). Copy the generated `token` UUID. In `app/api/survey/test/route.ts` (temp file), call `validateSurveyToken(token)` and confirm it returns the expected shape. Delete the test file and the test row when done.

- [ ] **Step 3: Commit**

```bash
git add lib/survey/actions.ts
git commit -m "feat: add validateSurveyToken server action"
```

---

## Task 3: Admin Types — StudentListItem + ActiveSurvey

**Files:**
- Modify: `lib/admin/types.ts`
- Modify: `lib/admin/queries.ts`

- [ ] **Step 1: Add `survey_status` to `StudentListItem` in `lib/admin/types.ts`**

Find the existing `StudentListItem` interface (line 61) and replace it:

```typescript
export interface StudentListItem {
  id: string;
  email: string | null;
  full_name: string | null;
  enrolled_courses: string[];
  subscription_status: string;
  subscription_tier: string;
  survey_status: 'pending' | 'completed' | null;
  created_at: string;
}
```

- [ ] **Step 2: Add `ActiveSurvey` interface and `getActiveSurveys()` to `lib/admin/queries.ts`**

At the end of `lib/admin/queries.ts`, after the existing `getActiveCourses` function, add:

```typescript
export interface ActiveSurvey {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string;
}

export async function getActiveSurveys(): Promise<ActiveSurvey[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('surveys')
    .select('id, slug, title_en, title_jp')
    .eq('is_active', true)
    .order('title_en', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 3: Update `getStudentList()` in `lib/admin/queries.ts` to include survey status**

Replace the existing `getStudentList()` function body with:

```typescript
export async function getStudentList(): Promise<StudentListItem[]> {
  const supabase = await createClient();

  const { data: students, error } = await supabase
    .from('users')
    .select('id, email, full_name, subscription_status, subscription_tier, created_at')
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const studentIds = (students ?? []).map((s) => s.id);

  // Fetch enrollments
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('user_id, course:courses(title_en)')
    .in('user_id', studentIds)
    .eq('status', 'active');

  const enrollmentMap = new Map<string, string[]>();
  for (const e of enrollments ?? []) {
    const course = e.course as unknown as { title_en: string } | null;
    const courseTitle = course?.title_en ?? '';
    const existing = enrollmentMap.get(e.user_id) ?? [];
    existing.push(courseTitle);
    enrollmentMap.set(e.user_id, existing);
  }

  // Fetch survey assignments (most recent per student)
  const { data: surveyAssignments } = await supabase
    .from('survey_assignments')
    .select('user_id, status')
    .in('user_id', studentIds)
    .order('assigned_at', { ascending: false });

  const surveyStatusMap = new Map<string, 'pending' | 'completed'>();
  for (const sa of surveyAssignments ?? []) {
    if (!surveyStatusMap.has(sa.user_id)) {
      surveyStatusMap.set(sa.user_id, sa.status as 'pending' | 'completed');
    }
  }

  return (students ?? []).map((s) => ({
    id: s.id,
    email: s.email,
    full_name: s.full_name,
    enrolled_courses: enrollmentMap.get(s.id) ?? [],
    subscription_status: s.subscription_status ?? 'none',
    subscription_tier: s.subscription_tier ?? 'free',
    survey_status: surveyStatusMap.get(s.id) ?? null,
    created_at: s.created_at,
  }));
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type mismatches before proceeding.

- [ ] **Step 5: Commit**

```bash
git add lib/admin/types.ts lib/admin/queries.ts
git commit -m "feat: add ActiveSurvey type, getActiveSurveys query, survey_status to student list"
```

---

## Task 4: Admin Action — assignSurvey

**Files:**
- Modify: `lib/admin/actions.ts`

- [ ] **Step 1: Add import for `createAdminClient` at the top of `lib/admin/actions.ts`**

The existing import line is:
```typescript
import { createClient, createAdminClient } from '@/lib/supabase/server';
```

It already imports `createAdminClient` — confirm it's there (line 3). If missing, add it.

- [ ] **Step 2: Add `assignSurvey` to `lib/admin/actions.ts`**

After the `manualEnroll` function, add:

```typescript
export async function assignSurvey(
  userId: string,
  surveyId: string,
): Promise<{ token: string; slug: string }> {
  await requireAdmin();

  // Use service role to bypass RLS on new survey_assignments table
  const adminClient = createAdminClient();

  const { data: survey, error: surveyError } = await adminClient
    .from('surveys')
    .select('slug')
    .eq('id', surveyId)
    .single();

  if (surveyError || !survey) throw new Error('Survey not found');

  const { data: assignment, error } = await adminClient
    .from('survey_assignments')
    .insert({ user_id: userId, survey_id: surveyId })
    .select('token')
    .single();

  if (error) throw new Error(`Failed to create survey assignment: ${error.message}`);

  return { token: assignment.token as string, slug: survey.slug };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/admin/actions.ts
git commit -m "feat: add assignSurvey admin action"
```

---

## Task 5: Email Types — Add courseTitle and surveyUrl

**Files:**
- Modify: `lib/email/types.ts`

- [ ] **Step 1: Update `StudentWelcomeEmailData` interface**

Find `StudentWelcomeEmailData` (line 76) and replace it:

```typescript
export interface StudentWelcomeEmailData {
  locale: Locale;
  fullName: string;
  email: string;
  actionLink: string;
  type: 'new' | 'existing';
  courseTitle?: string;
  surveyUrl?: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/email/types.ts
git commit -m "feat: add courseTitle and surveyUrl to StudentWelcomeEmailData"
```

---

## Task 6: Rewrite Student Welcome Email Template

**Files:**
- Modify: `lib/email/send.ts`

- [ ] **Step 1: Replace `sendStudentWelcomeEmail` function**

Find the function at line 715 of `lib/email/send.ts` and replace the entire function body:

```typescript
export async function sendStudentWelcomeEmail(data: StudentWelcomeEmailData): Promise<void> {
  const { locale, fullName, email, actionLink, type, courseTitle, surveyUrl } = data;
  const isJP = locale === 'ja';
  const isNew = type === 'new';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';

  const body = [
    heading(
      isJP
        ? `${fullName} さん、ようこそ！`
        : `Hi ${fullName},`,
    ),
    paragraph(
      isJP
        ? 'HonuVibe.AIへようこそ！一緒に学べることをとても楽しみにしています。'
        : "Welcome to HonuVibe.AI! We're excited to have you join us.",
    ),

    // Course block (only if enrolled)
    ...(courseTitle
      ? [
          divider(),
          detailsTable([
            {
              label: isJP ? 'ご登録コース' : 'Your Class',
              value: courseTitle,
            },
          ]),
        ]
      : []),

    divider(),

    // Login instructions
    heading(
      isJP ? 'はじめ方' : 'Getting Started',
    ),
    paragraph(
      isJP
        ? isNew
          ? 'アカウントの準備ができました。下のボタンからパスワードを設定して、学習ダッシュボードにアクセスしてください。'
          : 'アカウントにログインして、コース教材にアクセスしてください。'
        : isNew
          ? 'Your account is ready. Click below to set your password and access your student dashboard.'
          : 'Your account is ready. Click below to access your student dashboard.',
    ),
    ctaButton({
      href: actionLink,
      label: isJP
        ? isNew ? 'パスワードを設定する' : 'ダッシュボードへ'
        : isNew ? 'Set Your Password' : 'Go to Dashboard',
    }),
    ...(isNew
      ? [
          paragraph(
            isJP
              ? 'このリンクは24時間有効です。期限が切れた場合は、ログインページの「パスワードをお忘れですか？」からリセットできます。'
              : 'This link expires in 24 hours. If it expires, use "Forgot Password" on the login page to get a new one.',
          ),
        ]
      : []),

    // Survey block (only if assigned)
    ...(surveyUrl
      ? [
          divider(),
          heading(
            isJP ? '授業の前に' : 'Before Your First Class',
          ),
          paragraph(
            isJP
              ? 'あなたのことをもっとよく知ることで、より充実した学習体験を提供できます。アンケートにご協力をお願いします。'
              : "We'd love to learn a bit about you so we can make this experience as valuable as possible.",
          ),
          ctaButton({
            href: surveyUrl,
            label: isJP ? '受講前アンケートに答える' : 'Complete Your Pre-Course Survey',
          }),
        ]
      : []),

    divider(),

    paragraph(
      isJP
        ? `ご質問は <a href="mailto:help@honuvibe.com" style="color:#5eaaa8;text-decoration:none;">help@honuvibe.com</a> までお気軽にどうぞ。`
        : `Questions? Email us at <a href="mailto:help@honuvibe.com" style="color:#5eaaa8;text-decoration:none;">help@honuvibe.com</a> — we're happy to help.`,
    ),
    paragraph(
      isJP
        ? 'またクラスでお会いしましょう、<br>HonuVibe.AI チームより'
        : 'See you in class,<br>The HonuVibe.AI Team',
    ),
  ].join('');

  await sendEmail({
    to: email,
    subject: isJP
      ? `【HonuVibe.AI】ようこそ、${fullName} さん！`
      : `Welcome to HonuVibe.AI, ${fullName} — you're in!`,
    html: baseLayout({
      locale,
      preheader: isJP ? 'HonuVibe.AIへようこそ！' : "Welcome to HonuVibe.AI — you're in!",
      body,
    }),
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/email/send.ts
git commit -m "feat: rewrite student welcome email with personalized course and survey sections"
```

---

## Task 7: Update sendStudentWelcomeEmailAction

**Files:**
- Modify: `lib/students/actions.ts`

- [ ] **Step 1: Add `surveyUrl?` parameter to `sendStudentWelcomeEmailAction`**

Replace the function signature and its call to `sendStudentWelcomeEmail`. Find the function at line 87 and update it:

```typescript
export async function sendStudentWelcomeEmailAction(
  email: string,
  fullName: string,
  type: 'new' | 'existing',
  locale: Locale,
  courseTitle?: string,
  surveyUrl?: string,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';
  const adminClient = createAdminClient();

  try {
    const linkType = type === 'new' ? 'recovery' : 'magiclink';
    const redirectTo =
      type === 'new'
        ? `${siteUrl}/api/auth/callback?redirect=/learn/auth/reset`
        : `${siteUrl}/api/auth/callback?redirect=/learn/dashboard`;

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: linkType,
        email,
        options: { redirectTo },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[Student Email] Failed to generate link:', linkError?.message);
      return { success: false, error: linkError?.message ?? 'Failed to generate login link' };
    }

    let emailSent = false;
    try {
      await sendStudentWelcomeEmail({
        locale,
        fullName,
        email,
        actionLink: linkData.properties.action_link,
        type,
        courseTitle,
        surveyUrl,
      });
      emailSent = true;
    } catch (emailErr) {
      console.error('[Student Email] Failed to send welcome email:', emailErr);
    }

    await sendStudentWelcomeAdminNotification({
      fullName,
      email,
      type,
      courseTitle,
      notes,
      emailSent,
    });

    return emailSent
      ? { success: true }
      : { success: false, error: 'Failed to send welcome email' };
  } catch (err) {
    console.error('[Student Email] Unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send welcome email',
    };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/students/actions.ts
git commit -m "feat: add surveyUrl param to sendStudentWelcomeEmailAction"
```

---

## Task 8: AddStudent Page — Pass activeSurveys

**Files:**
- Modify: `app/[locale]/admin/students/new/page.tsx`

- [ ] **Step 1: Update the page to fetch and pass surveys**

Replace the full file content:

```typescript
import { setRequestLocale } from 'next-intl/server';
import { getActiveCourses, getActiveSurveys } from '@/lib/admin/queries';
import { AddStudentFlow } from '@/components/admin/AddStudentFlow';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Add Student — Admin',
};

export default async function AddStudentPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [activeCourses, activeSurveys] = await Promise.all([
    getActiveCourses(),
    getActiveSurveys(),
  ]);

  return (
    <div className="space-y-6 max-w-[1100px]">
      <AddStudentFlow activeCourses={activeCourses} activeSurveys={activeSurveys} />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: error that `AddStudentFlow` doesn't accept `activeSurveys` yet — this is expected and will be fixed in Task 9.

- [ ] **Step 3: Commit after Task 9 (do not commit yet)**

---

## Task 9: AddStudentFlow — Survey Dropdown and Assignment

**Files:**
- Modify: `components/admin/AddStudentFlow.tsx`

- [ ] **Step 1: Update imports and Props type**

Replace the import block and Props type at the top of the file:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, UserPlus, CheckCircle, Mail, MailX, RefreshCw, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { searchUserByEmail } from '@/lib/instructors/actions';
import { createNewUserAndStudent, sendStudentWelcomeEmailAction } from '@/lib/students/actions';
import { manualEnroll, assignSurvey } from '@/lib/admin/actions';
import type { ActiveCourse, ActiveSurvey } from '@/lib/admin/queries';

type FoundUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
};

type Props = {
  activeCourses: ActiveCourse[];
  activeSurveys: ActiveSurvey[];
};
```

- [ ] **Step 2: Add survey state variables**

In the component body, after the existing `// Step 2: Enroll` state block, add:

```typescript
  // Survey assignment
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [surveyAssigned, setSurveyAssigned] = useState(false);
```

Also update the Props destructuring at the top of the component:

```typescript
export function AddStudentFlow({ activeCourses, activeSurveys }: Props) {
```

- [ ] **Step 3: Update `handleSendWelcomeEmail` to accept and pass surveyUrl**

Replace the existing `handleSendWelcomeEmail` function:

```typescript
  async function handleSendWelcomeEmail(userId: string, courseId: string, surveyUrl?: string) {
    setSendingEmail(true);
    const selectedCourse = activeCourses.find((c) => c.id === courseId);
    try {
      const result = await sendStudentWelcomeEmailAction(
        email.trim().toLowerCase(),
        fullName.trim(),
        mode === 'create' ? 'new' : 'existing',
        emailLocale,
        selectedCourse?.title_en,
        surveyUrl,
        notes.trim() || undefined,
      );
      setEmailStatus(result.success ? 'sent' : 'failed');
      if (!result.success) setEmailError(result.error ?? 'Unknown error');
    } catch (err) {
      setEmailStatus('failed');
      setEmailError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSendingEmail(false);
    }
  }
```

- [ ] **Step 4: Update `handleSave` to call `assignSurvey` and pass surveyUrl**

Replace the existing `handleSave` function:

```typescript
  async function handleSave() {
    if (mode === 'create' && !fullName.trim()) {
      setSaveError('Full name is required.');
      return;
    }
    setSaving(true);
    setSaveError('');

    try {
      let userId: string;

      if (mode === 'create') {
        const result = await createNewUserAndStudent(
          email.trim().toLowerCase(),
          fullName.trim(),
        );
        userId = result.userId;
      } else {
        if (!foundUser) return;
        userId = foundUser.id;
      }

      // Enroll in course if one was selected
      if (selectedCourseId) {
        await manualEnroll(userId, selectedCourseId, notes.trim() || undefined, true);
      }

      // Assign survey if one was selected, build survey URL for welcome email
      let surveyUrl: string | undefined;
      if (selectedSurveyId) {
        // NEXT_PUBLIC_ vars are inlined at build time — requires NEXT_PUBLIC_SITE_URL in .env.local
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';
        const { token, slug } = await assignSurvey(userId, selectedSurveyId);
        surveyUrl = `${siteUrl}/survey/${slug}?token=${token}`;
        setSurveyAssigned(true);
      }

      setAddedUserId(userId);
      setStep('done');

      if (sendWelcome) {
        setEmailStatus('pending');
        void handleSendWelcomeEmail(userId, selectedCourseId, surveyUrl);
      } else {
        setEmailStatus('skipped');
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to add student');
    } finally {
      setSaving(false);
    }
  }
```

- [ ] **Step 5: Add survey dropdown to Step 2 JSX**

In the Step 2 JSX block (inside `{step === 'enroll' && ...}`), after the existing course dropdown `<div>`, add the survey dropdown:

```tsx
            <div>
              <label className="block text-xs text-fg-tertiary mb-1">
                Survey <span className="text-fg-tertiary">(optional)</span>
              </label>
              <select
                value={selectedSurveyId}
                onChange={(e) => setSelectedSurveyId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
              >
                <option value="">— No survey —</option>
                {activeSurveys.map((survey) => (
                  <option key={survey.id} value={survey.id}>
                    {survey.title_en}
                  </option>
                ))}
              </select>
            </div>
```

- [ ] **Step 6: Update Step 3 Done screen to show survey assignment status**

In the Step 3 JSX block (inside `{step === 'done' && ...}`), after the existing course enrollment confirmation line, add:

```tsx
          {surveyAssigned && (
            <p className="text-sm text-fg-secondary flex items-center justify-center gap-1.5">
              <ClipboardList size={14} className="text-accent-teal" />
              Survey assigned — link included in email
            </p>
          )}
```

Also update the "Add Another" button's reset handler to clear survey state:

```tsx
              onClick={() => {
                setStep('search');
                setEmail('');
                setFullName('');
                setFoundUser(null);
                setMode(null);
                setSelectedCourseId('');
                setSelectedSurveyId('');
                setSurveyAssigned(false);
                setNotes('');
                setSendWelcome(true);
                setEmailLocale('en');
                setAddedUserId('');
                setEmailStatus('pending');
                setEmailError('');
              }}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit Tasks 8 and 9 together**

```bash
git add app/[locale]/admin/students/new/page.tsx components/admin/AddStudentFlow.tsx
git commit -m "feat: add survey assignment dropdown to AddStudentFlow wizard"
```

---

## Task 10: AdminStudentList — Survey Status Column

**Files:**
- Modify: `components/admin/AdminStudentList.tsx`

- [ ] **Step 1: Add Survey column to the columns array**

In `AdminStudentList.tsx`, add a new column after the `courses` column:

```typescript
    {
      key: 'survey',
      header: 'Survey',
      render: (student: StudentListItem) => {
        if (student.survey_status === 'completed') {
          return (
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-accent-teal/15 text-accent-teal">
              Completed
            </span>
          );
        }
        if (student.survey_status === 'pending') {
          return (
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-amber-400/15 text-amber-400">
              Pending
            </span>
          );
        }
        return <span className="text-fg-tertiary text-xs">—</span>;
      },
    },
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/AdminStudentList.tsx
git commit -m "feat: add survey status column to admin student list"
```

---

## Task 11: Survey Page — Extract Client Component + Token Handling

**Files:**
- Create: `app/[locale]/survey/ai-essentials/survey-form.tsx`
- Modify: `app/[locale]/survey/ai-essentials/page.tsx`

- [ ] **Step 1: Create `survey-form.tsx`**

This is the existing `page.tsx` content with three changes:
1. Remove `'use client'` (it stays on the component but file is renamed)
2. Export the component as `SurveyForm` instead of default export
3. Accept `token?: string` prop and add token validation logic

Create `app/[locale]/survey/ai-essentials/survey-form.tsx` with the full existing form code. At the top, keep `'use client'` and add the token prop:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { validateSurveyToken } from '@/lib/survey/actions';
// ... (all existing option array constants and sub-components stay exactly as-is)
```

Change the component signature from the default export to a named export with token prop. Find the component definition (currently `export default function SurveyPage()` — the name may differ) and update it to:

```typescript
export function SurveyForm({ token }: { token?: string }) {
  // Existing state...
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // NEW: token-based assignment state
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  // NEW: validate token on mount
  useEffect(() => {
    if (!token) return;
    validateSurveyToken(token).then((result) => {
      if (!result) return; // invalid token — render form in anonymous mode
      if (result.status === 'completed') {
        setAlreadyCompleted(true);
        return;
      }
      // Valid pending assignment — pre-fill name and store assignmentId
      setAssignmentId(result.assignmentId);
      setForm((prev) => ({ ...prev, name: result.userName }));
    });
  }, [token]);

  // NEW: already-completed guard (render before the main form)
  if (alreadyCompleted) {
    return (
      <div className="min-h-screen bg-[#f9f9f7] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-4xl">✓</div>
          <h1 className="font-serif text-2xl text-fg-primary">Survey Complete</h1>
          <p className="text-fg-secondary">
            You've already completed this survey — thank you! We look forward to seeing you in class.
          </p>
          <p className="text-sm text-fg-tertiary">
            Questions? Email{' '}
            <a href="mailto:help@honuvibe.com" className="text-accent-teal hover:underline">
              help@honuvibe.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ... rest of existing component JSX (unchanged)
```

Also update the `handleSubmit` function to include `assignmentId` in the payload. Find the existing fetch call inside `handleSubmit` and update the body:

```typescript
      body: JSON.stringify({
        ...form,
        ...(assignmentId ? { assignmentId } : {}),
      }),
```

- [ ] **Step 2: Rewrite `page.tsx` as a thin server wrapper**

Replace the entire contents of `app/[locale]/survey/ai-essentials/page.tsx`:

```typescript
import { SurveyForm } from './survey-form';

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function SurveyPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return <SurveyForm token={token} />;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Manual test — anonymous mode**

Start dev server (`npm run dev`). Visit `/survey/ai-essentials` with no token. Confirm form renders and submits normally.

- [ ] **Step 5: Manual test — token mode**

Insert a test row into `survey_assignments` in Supabase dashboard. Visit `/survey/ai-essentials?token=<uuid>`. Confirm:
- Name field is pre-filled with user's `full_name`
- Form is otherwise normal

Submit the form — verify in next task.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/survey/ai-essentials/survey-form.tsx" "app/[locale]/survey/ai-essentials/page.tsx"
git commit -m "feat: add token-based survey assignment handling — pre-fill name, guard completed state"
```

---

## Task 12: Survey Submit Route — Link Response to Assignment

**Files:**
- Modify: `app/api/survey/submit/route.ts`

- [ ] **Step 1: Update the Supabase insert and add assignment completion**

Replace the entire `POST` handler function body's DB section. Find the Supabase insert block (around line 48) and replace it:

```typescript
    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const assignmentId: string | null =
        typeof data.assignmentId === 'string' ? data.assignmentId : null;

      const { error: dbError } = await supabase.from('survey_responses').insert({
        course_slug: 'ai-essentials',
        name: data.name,
        professional_background: data.professional_background,
        role_description: data.role_description,
        ai_knowledge_level: data.ai_knowledge_level,
        ai_tools_used: data.ai_tools_used,
        ai_usage_frequency: data.ai_usage_frequency,
        learning_reasons: data.learning_reasons,
        ai_help_with: data.ai_help_with,
        success_definition: data.success_definition,
        current_feeling: data.current_feeling,
        specific_interests: data.specific_interests ?? null,
        has_laptop: data.has_laptop,
        used_zoom_before: data.used_zoom_before,
        // Link to user and assignment if present
        ...(assignmentId
          ? {
              assignment_id: assignmentId,
            }
          : {}),
      });

      if (dbError) {
        console.error('[Survey] DB insert failed:', dbError.message);
        return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
      }

      // Mark assignment as completed (fire-and-forget)
      if (assignmentId) {
        void supabase
          .from('survey_assignments')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', assignmentId);
      }
    }
```

Note: `user_id` is not set directly in the insert — it will be derived from the `assignment_id` via the FK relationship. If you need `user_id` in `survey_responses` for direct queries, add it to the insert by also fetching it from the assignment:

```typescript
      // Optionally: look up user_id from assignment to store directly on response
      let userId: string | null = null;
      if (assignmentId) {
        const { data: assignment } = await supabase
          .from('survey_assignments')
          .select('user_id')
          .eq('id', assignmentId)
          .single();
        userId = assignment?.user_id ?? null;
      }

      const { error: dbError } = await supabase.from('survey_responses').insert({
        // ...all fields as above...
        ...(assignmentId ? { assignment_id: assignmentId } : {}),
        ...(userId ? { user_id: userId } : {}),
      });
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: End-to-end manual test**

1. Create a new student via `/admin/students/new`, assign the AI Essentials survey
2. Check `survey_assignments` in Supabase — confirm row with `status = 'pending'` and a token UUID
3. Check welcome email in Resend dashboard — confirm survey CTA button present with correct URL
4. Open the survey URL with the token — confirm name is pre-filled
5. Submit the survey
6. Check `survey_responses` — confirm new row has `user_id` and `assignment_id` set
7. Check `survey_assignments` — confirm `status = 'completed'` and `completed_at` is set
8. Open the survey URL again — confirm "Survey Complete" screen renders
9. Check `/admin/students` — confirm Survey column shows "Completed" badge for the student

- [ ] **Step 4: Commit**

```bash
git add "app/api/survey/submit/route.ts"
git commit -m "feat: link survey response to assignment on submit, mark assignment completed"
```

---

## Verification Checklist

Run through each scenario before calling done:

- [ ] Anonymous survey at `/survey/ai-essentials` (no token) — form works, response inserts with null `user_id`/`assignment_id`
- [ ] Admin creates student with course + survey — `survey_assignments` row created with `status = 'pending'`
- [ ] Admin creates student with no survey — no `survey_assignments` row created
- [ ] Welcome email with survey assigned — contains student name, course title, "Set Your Password" CTA, survey CTA, `help@honuvibe.com` link
- [ ] Welcome email without survey — no survey section appears
- [ ] Survey URL with valid pending token — name pre-filled, form works
- [ ] Survey URL with invalid/garbage token — form renders in anonymous mode, no error shown
- [ ] Survey submitted via token — `user_id` + `assignment_id` in `survey_responses`, `status = 'completed'` in `survey_assignments`
- [ ] Survey URL opened after completion — "Survey Complete" screen renders, form does not show
- [ ] `/admin/students` page — shows "Pending" badge for assigned+incomplete, "Completed" badge after submission, "—" for unassigned
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds
