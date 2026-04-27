# Phase 4 — Partnerships

> Sub-plan of [`2026-04-26-marketing-rebuild.md`](./2026-04-26-marketing-rebuild.md). Phases 0–3 shipped; this phase introduces the first new backend slice in the rebuild.

## Context

We're continuing the public-marketing visual rebuild. Phase 4 adds a coral-accented `/partnerships` route — a "For Organizations" sales page driving inbound partnership inquiries from professional networks, creative communities, nonprofits, and companies. Unlike Phases 1–3 (visual swaps over existing routes), this phase introduces:

- a new Supabase table (`partnership_inquiries`) with RLS,
- a new Zod-validated submit endpoint,
- a new bilingual Resend email pair (applicant confirmation + admin notification),
- a new admin list view,
- and a brand-new public route + sections.

Goal: ship a working end-to-end inquiry pipeline matching [docs/designs/Partnerships.html](../designs/Partnerships.html) and [docs/DESIGN.md](../DESIGN.md), without disturbing the existing `/admin/partners` partner-org CRUD or the existing `partners`/`partner_courses` schema.

Baseline confirmed before kickoff: `pnpm verify:fast` ✅ — 319 tests / 32 files / 23s.

## Decisions locked in

| Area | Decision | Why |
|---|---|---|
| Schema source | Match the design HTML form fields exactly. No `budget_band` / `region` / `role`. | The design HTML is canonical; the umbrella plan's draft schema predated the final form. |
| Public partner cards | Render Vertice ("IN SESSION") only + a coral "More partnerships launching soon" callout in the second column. | `project_smashhaus_partner_visibility` memory: SmashHaus cannot appear on the public site until the deal closes. |
| Admin route | `/admin/partnership-inquiries` (not `/admin/partnerships`). | `app/[locale]/admin/partners/` already exists for partner-org CRUD; the inquiries list is a different concept. |
| Validation | Zod, per user instruction. Adopting Zod here (not previously established) — manual checks remain in legacy routes. | Stronger DX for a form with 13 fields and 5 enum-ish selects. |
| Service-role Supabase client | Reuse existing `createAdminClient()` from `lib/supabase/server.ts:30`. | Don't inline `createClient(url, serviceRoleKey)` like `app/api/apply/submit/route.ts:33` does — the helper already exists. |
| Email pattern | Dual-recipient, fire-and-forget via `Promise.all`, mirroring `sendApplicationConfirmation` + `sendApplicationAdminNotification`. Reuse existing `baseLayout` / `heading` / `paragraph` / `divider` / `detailsTable` / `accentBanner` / `ctaButton` helpers in `lib/email/templates.ts` — no new template helpers. | Matches the application pipeline byte-for-byte; locale handled with `isJP = locale === 'ja'`. |
| Source locale | Captured server-side from request body, defaulted to `'en'`. | Mirrors application route; future analytics. |
| Form-field labels | Form sends raw enum keys (`'professional_network'`, `'10_25'`); email + admin list resolve to human labels via a small `lib/partnerships/labels.ts` map. | Keeps EN/JP consistency; centralized for the future JP pass. |
| Git workflow | Direct-to-main per `feedback_git_workflow.md`. Two-commit split for the marketing page (components → swap) per Phase 1–3 convention. | Same convention. |

## Build order — 4 commits

| # | Commit | Scope | Verify gate |
|---|---|---|---|
| A | `feat(partnerships): backend — migration + email pipeline + Zod API` | Migration `034`, types in `lib/email/types.ts` + `lib/admin/types.ts`, send fns in `lib/email/send.ts`, query in `lib/admin/queries.ts`, `app/api/partnerships/submit/route.ts`, label map, API smoke test. No UI. | `pnpm verify:fast` (typecheck + vitest); migration applied via `supabase db push` or studio. |
| B | `feat(partnerships): marketing components + i18n + smoke tests` | All seven section components under `components/marketing/partnerships/`, `partnerships` namespace in `messages/{en,ja}.json` (JP stubbed with EN), `__tests__/marketing/partnerships/sections.test.tsx`. Components are unmounted. | `pnpm verify` (full: typecheck + vitest + build). |
| C | `feat(partnerships): swap page to new marketing shell` | Rewrite `app/[locale]/partnerships/page.tsx` to mount the new sections inside `<MarketingShell>` + `<MarketingNav />` + `<MarketingNewsletter />` + `<MarketingFooter />`. | `pnpm verify` + manual `/partnerships` + `/ja/partnerships` walk side-by-side with the design HTML. |
| D | `feat(admin): partnership inquiries list view` | `app/[locale]/admin/partnership-inquiries/page.tsx`, `components/admin/AdminPartnershipInquiriesList.tsx`, `components/admin/PartnershipInquiryCard.tsx`, nav entry in `components/admin/AdminNav.tsx`. | `pnpm verify` + e2e: submit on dev form → row visible in admin list → admin email received. |

## Files

### Commit A — backend

**Create [`supabase/migrations/034_partnership_inquiries.sql`](../../supabase/migrations/034_partnership_inquiries.sql)** — mirror `033_revenue_split.sql` style.

```sql
-- ============================================================
-- PARTNERSHIP INQUIRIES — Inbound leads from /partnerships form.
-- Anonymous insert (form is unauthenticated); admin-only read/update via is_admin().
-- ============================================================

CREATE TABLE IF NOT EXISTS partnership_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  full_name text NOT NULL,
  email text NOT NULL,
  organization text NOT NULL,
  website text,
  org_type text NOT NULL CHECK (org_type IN (
    'professional_network','creative_community','nonprofit','company','accelerator','other'
  )),
  community_description text NOT NULL,
  program_description text NOT NULL,
  audience_size text CHECK (audience_size IN (
    'under_10','10_25','25_50','50_100','100_plus'
  )),
  language text CHECK (language IN ('en','ja','bilingual')),
  timeline text CHECK (timeline IN ('ready_now','1_3_months','3_6_months','exploring')),
  referral_source text CHECK (referral_source IN (
    'web_search','social_media','referral','vertice','smashhaus','conference','other'
  )),
  source_locale text NOT NULL DEFAULT 'en' CHECK (source_locale IN ('en','ja')),
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','reviewing','responded','archived')),
  notes text,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_partnership_inquiries_status_created
  ON partnership_inquiries(status, created_at DESC);

ALTER TABLE partnership_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partnership_inquiries_admin_all" ON partnership_inquiries;
CREATE POLICY "partnership_inquiries_admin_all" ON partnership_inquiries
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "partnership_inquiries_anon_insert" ON partnership_inquiries;
CREATE POLICY "partnership_inquiries_anon_insert" ON partnership_inquiries
  FOR INSERT TO anon WITH CHECK (true);
```

(Service-role client bypasses RLS, so the API route can insert regardless; the anon policy is belt-and-suspenders for future direct-to-Supabase form support.)

**Edit [`lib/email/types.ts`](../../lib/email/types.ts)** — add:

```ts
export type PartnershipInquiryEmailData = {
  locale: Locale;
  fullName: string;
  email: string;
  organization: string;
  website: string | null;
  orgTypeLabel: string;          // already humanized
  communityDescription: string;
  programDescription: string;
  audienceSizeLabel: string | null;
  languageLabel: string | null;
  timelineLabel: string | null;
  referralSourceLabel: string | null;
};
```

**Edit [`lib/email/send.ts`](../../lib/email/send.ts)** — add two functions modeled on `sendApplicationConfirmation` (line 150) and `sendApplicationAdminNotification` (line 191):

- `sendPartnershipInquiryConfirmation(data: PartnershipInquiryEmailData)` — to applicant. Subject EN: "Thanks — we received your partnership inquiry"; JP equivalent. Body: `heading('Aloha, {{fullName}}')` + `paragraph(thanksCopy)` + `paragraph('We respond within 5 business days.')` + `divider()` + `ctaButton({ href: ${siteUrl}/learn, label: ... })`. Same `baseLayout` wrapper.
- `sendPartnershipInquiryAdminNotification(data)` — to `getAdminEmail()`. `accentBanner('New Partnership Inquiry')` + `detailsTable` of every field (using the *Label* fields, not raw keys) + `divider()` + `heading('Community')` + `paragraph(communityDescription)` + `heading('Program')` + `paragraph(programDescription)` + `ctaButton({ href: ${siteUrl}/admin/partnership-inquiries, label: 'View in Admin Panel' })`.

Both fire-and-forget from the API route.

**Create [`lib/partnerships/labels.ts`](../../lib/partnerships/labels.ts)** — humanizes raw form values:

```ts
import type { Locale } from '@/lib/email/types';

export const orgTypeLabels: Record<Locale, Record<string, string>> = {
  en: { professional_network: 'Professional Network', /* ... */ },
  ja: { professional_network: 'プロフェッショナルネットワーク', /* ... */ },
};
// + audienceSizeLabels, languageLabels, timelineLabels, referralSourceLabels
export function labelize<T extends keyof typeof orgTypeLabels.en>(/* ... */): string;
```

**Create [`app/api/partnerships/submit/route.ts`](../../app/api/partnerships/submit/route.ts)** — Zod-validated POST:

```ts
import { z } from 'zod';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendPartnershipInquiryConfirmation, sendPartnershipInquiryAdminNotification } from '@/lib/email/send';
import { labelize, /* maps */ } from '@/lib/partnerships/labels';

const schema = z.object({
  full_name: z.string().min(1).max(200),
  email: z.string().email(),
  organization: z.string().min(1).max(200),
  website: z.string().url().nullish().or(z.literal('')),
  org_type: z.enum(['professional_network','creative_community','nonprofit','company','accelerator','other']),
  community_description: z.string().min(1).max(4000),
  program_description: z.string().min(1).max(4000),
  audience_size: z.enum(['under_10','10_25','25_50','50_100','100_plus']).nullish(),
  language: z.enum(['en','ja','bilingual']).nullish(),
  timeline: z.enum(['ready_now','1_3_months','3_6_months','exploring']).nullish(),
  referral_source: z.enum(['web_search','social_media','referral','vertice','smashhaus','conference','other']).nullish(),
  source_locale: z.enum(['en','ja']).default('en'),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const supabase = createAdminClient();
  const { error } = await supabase.from('partnership_inquiries').insert({ ...d /* normalize empty strings to null */ });
  if (error) console.error('[Partnerships] DB insert failed:', error.message);

  const emailData = { /* labelize d for current locale */ };
  void Promise.all([
    sendPartnershipInquiryConfirmation(emailData),
    sendPartnershipInquiryAdminNotification(emailData),
  ]);
  return NextResponse.json({ success: true });
}
```

**Edit [`lib/admin/types.ts`](../../lib/admin/types.ts)** — add:

```ts
export type PartnershipInquiryStatus = 'received' | 'reviewing' | 'responded' | 'archived';
export type PartnershipInquiry = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  organization: string;
  website: string | null;
  org_type: string;
  community_description: string;
  program_description: string;
  audience_size: string | null;
  language: string | null;
  timeline: string | null;
  referral_source: string | null;
  source_locale: 'en' | 'ja';
  status: PartnershipInquiryStatus;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
};
```

**Edit [`lib/admin/queries.ts`](../../lib/admin/queries.ts)** — add `getPartnershipInquiries(status?)` mirroring `getApplications` (line 194), but ordering by `created_at desc` (the table's natural timestamp).

**Create `__tests__/api/partnerships-submit.test.ts`** — three cases:
1. Valid payload → 200, supabase insert called, both email senders invoked.
2. Invalid email → 400 with Zod issues.
3. Missing required field (`organization`) → 400.

Mocks: `createAdminClient` returning `{ from: vi.fn(...).insert: vi.fn().resolves({error:null}) }`; both email senders mocked to `vi.fn()`.

### Commit B — marketing components

Create files under `components/marketing/partnerships/`:

- **`hero.tsx`** — server. `<Section variant="canvas" spacing="hero">` → `<Container>` → max-width 620 column. `<Overline tone="coral">FOR ORGANIZATIONS</Overline>` → custom `<h1>` with `clamp(40px, 5vw, 64px)` (per design HTML; not the `--m-text-h1` token, which caps lower) — text "Bring AI training" (navy) line-break `<span class="text-[var(--m-accent-teal)]">to your community.</span>`. Subhead. Single coral primary CTA `Apply for Partnership` → `#apply` via `<Button variant="primary-coral" href="#apply" withArrow>`.
- **`what-you-get.tsx`** — server. `<Section variant="canvas">`. `<Overline tone="teal">WHAT YOU GET</Overline>`. `<SectionHeading>` "A complete AI training program. Built for your people." 2x2 grid of `<Card>`. Each card: 44px square teal-tinted icon bg with lucide icon (`FileText`, `Globe`, `Handshake`, `PlayCircle`), title, body. Hover lift via `<Card interactive>`.
- **`how-it-works.tsx`** — server. `<Section variant="sand">`. `<Overline tone="teal">THE PROCESS</Overline>`. Heading "From conversation to launch in 4 weeks." 4-step horizontal row using `<NumberedStep layout="horizontal">` with the connecting gradient line behind the circles (absolutely positioned `<div>` between numbers).
- **`current-partners.tsx`** — server. `<Section variant="sand">` continuation. Top divider (1px ink-primary at 0.1 alpha). `<Overline tone="teal">OUR PARTNERS</Overline>` → "Programs in motion." subhead. **2-col grid: left = `<VerticePartnerCard>`, right = `<MorePartnersCallout>`.**
  - `<VerticePartnerCard>`: white surface, 5px teal accent bar at top, header row with name + navy `<Badge tone="status">IN SESSION</Badge>`, program/audience meta, 4 detail rows with lucide icons (`Calendar`, `Globe`, `PlayCircle`, `Users`), italic placeholder quote + attribution with 3px coral left border.
  - `<MorePartnersCallout>`: coral-soft surface (`bg-[var(--m-accent-coral-soft)]`), coral overline "WE'RE BUILDING", heading "More partnerships launching soon", body "Want to be next? We're actively talking with networks, communities, and companies that want to bring AI training to their people.", coral text link "Apply for Partnership →" anchoring `#apply`. Visually mirrors the "Not sure?" callout from `<WhoIsItFor>` for consistency.
  - Bottom italic line: "More partnerships launching soon. Want to be next?" linking to `#apply`.
- **`who-is-it-for.tsx`** — server. `<Section variant="canvas">`. `<Overline tone="teal">IS THIS RIGHT FOR YOU?</Overline>`. 3-col grid:
  - Great fit (teal-tinted card): 5 bullets with teal `CheckCircle2` icons.
  - Not the right fit (gray card): 3 bullets with gray `XCircle` icons; one ("Individual learners") includes inline link to `/learn`.
  - Not sure? (coral-soft card): heading + body + bottom-anchored "Book a Discovery Call →" link to `#apply`.
- **`pricing.tsx`** — server. `<Section variant="sand">`. `<Overline tone="teal">INVESTMENT</Overline>`. Heading "Transparent pricing." 3 pricing cards:
  - Starter Program ($5,000 starting at) — white `<Card>`, teal "Apply for Partnership" button → `#apply`.
  - **Full Program** ($12,000 starting at) — `<Card variant="navy">` with 4px teal top accent strip and `transform: scale(1.025)`, white text, coral "Apply for Partnership" button.
  - Enterprise / Custom (Custom pricing) — white `<Card>`, ghost "Let's talk →" anchor.
  - Footnote: italic "All programs include bilingual delivery at no additional cost. Nonprofit and community organization pricing available — ask us."
- **`application-form.tsx`** — `'use client'`. Mirrors [`components/marketing/contact/contact-form.tsx`](../../components/marketing/contact/contact-form.tsx) exactly:
  - State: `useState<FormState>(initialForm)`, `useState<Status>('idle' | 'loading' | 'success' | 'error')`.
  - `useTranslations('partnerships.application_form')` for all labels/placeholders/options.
  - `handleSubmit` POSTs to `/api/partnerships/submit` including `source_locale: useLocale()`.
  - Layout per design HTML: section id `apply`, sand bg, centered 760px container, white form panel with shadow `--m-shadow-md`, 20px radius. Rows:
    1. Name + Email (2-col)
    2. Organization + Website (2-col)
    3. Org type (select)
    4. Community description (textarea, required)
    5. Program description (textarea, required)
    6. Participants + Language (2-col selects)
    7. Timeline + Referral source (2-col selects)
    Submit button: full-width coral with `<ArrowRight>` icon, `disabled` during loading with `Loader2` spin (matching contact form).
  - Success state: 700px centered card with teal `Check` icon, "Inquiry received." heading, "We'll review your inquiry and be in touch within 5 business days." body — mirrors contact's success block visually.
  - Error state: inline coral error message under submit, `role="alert"`.

**Edit `messages/en.json` and `messages/ja.json`** — add `partnerships` namespace with sub-keys: `meta` (page title + description), `hero`, `what_you_get`, `how_it_works`, `current_partners`, `who_is_it_for`, `pricing`, `application_form` (labels, placeholders, dropdown option labels, success/error copy). JP stubbed with EN per Phase 1.5.

**Create `__tests__/marketing/partnerships/sections.test.tsx`** — render-smoke tests for all 7 components. Mock `useTranslations` to return key as value (matching `learn-sections.test.tsx` pattern). Assert key copy renders, form's status states swap correctly when toggled imperatively.

### Commit C — page swap

**Rewrite [`app/[locale]/partnerships/page.tsx`](../../app/[locale]/partnerships/page.tsx)**:

```tsx
import { setRequestLocale } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import {
  Hero, WhatYouGet, HowItWorks, CurrentPartners,
  WhoIsItFor, Pricing, ApplicationForm,
} from '@/components/marketing/partnerships';

export default async function PartnershipsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        <Hero />
        <WhatYouGet />
        <HowItWorks />
        <CurrentPartners />
        <WhoIsItFor />
        <Pricing />
        <ApplicationForm />
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
```

`/partnerships` is already in `MARKETING_PATHS` ([`lib/marketing-routes.ts:15`](../../lib/marketing-routes.ts#L15)), so the legacy nav/footer auto-yields. No edit there.

### Commit D — admin

**Create [`app/[locale]/admin/partnership-inquiries/page.tsx`](../../app/[locale]/admin/partnership-inquiries/page.tsx)** — mirrors [`app/[locale]/admin/applications/page.tsx`](../../app/[locale]/admin/applications/page.tsx). Calls `getPartnershipInquiries()`. Title "Partnership Inquiries — Admin".

**Create [`components/admin/AdminPartnershipInquiriesList.tsx`](../../components/admin/AdminPartnershipInquiriesList.tsx)** — mirrors [`components/admin/AdminApplicationList.tsx`](../../components/admin/AdminApplicationList.tsx): filter tabs over `received | reviewing | responded | archived | all`, count badges, list of `<PartnershipInquiryCard>` rows.

**Create [`components/admin/PartnershipInquiryCard.tsx`](../../components/admin/PartnershipInquiryCard.tsx)** — mirror `ApplicationCard.tsx`: collapsible row with summary header (name, organization, status badge, date) + disclosure showing all fields including the two long-text descriptions. Reuse status-badge styling.

**Edit [`components/admin/AdminNav.tsx`](../../components/admin/AdminNav.tsx)** — add `Partnership Inquiries` link → `/admin/partnership-inquiries`. Place adjacent to the existing "Applications" entry.

## Critical files to reuse

| Need | Reuse | Path |
|---|---|---|
| Service-role Supabase client | `createAdminClient()` | `lib/supabase/server.ts:30` |
| Email layout/banner/table helpers | `baseLayout`, `heading`, `paragraph`, `ctaButton`, `divider`, `detailsTable`, `accentBanner` | `lib/email/templates.ts` |
| Email send pattern | `sendApplicationConfirmation` + `sendApplicationAdminNotification` | `lib/email/send.ts:150,191` |
| Admin email recipient resolver | `getAdminEmail()` | `lib/email/client.ts` |
| Admin list pattern | filter tabs + cards | `components/admin/AdminApplicationList.tsx` |
| Admin row card pattern | collapsible disclosure + status badge | `components/admin/ApplicationCard.tsx` |
| Admin query pattern | order desc + optional status filter | `lib/admin/queries.ts:194` |
| Form state-machine + success state | idle/loading/success/error + locale-aware POST | `components/marketing/contact/contact-form.tsx` |
| Marketing primitives | Section, Container, Card, Badge, NumberedStep, Button, Overline, SectionHeading | `components/marketing/primitives/` |
| Migration style (RLS + indexes) | `is_admin()` policy + composite index | `supabase/migrations/033_revenue_split.sql`, `029_partners.sql` |
| Marketing route detection | `/partnerships` already listed | `lib/marketing-routes.ts:15` |

## Verification

**After commit A (backend):**
- `pnpm verify:fast` — typecheck ✓, vitest ✓ including new API smoke test.
- Apply migration locally: `supabase db push` (or paste SQL into supabase studio).
- Optional: hit the route via `curl -X POST http://localhost:3000/api/partnerships/submit -H 'Content-Type: application/json' -d '{...minimal valid payload...}'` → expect 200 + supabase row + console-logged email send.

**After commit B (components):**
- `pnpm verify` — typecheck + vitest + `next build` all green. Should add ~7–10 tests to the suite (target: 326+).

**After commit C (page swap):**
- `pnpm dev`. Browse `/partnerships` and `/ja/partnerships` at 1440 / 768 / 414.
- Side-by-side with `docs/designs/Partnerships.html` open in Chrome.
- Submit a real inquiry from the dev form → confirm row in `partnership_inquiries` + admin email arrives at `ADMIN_EMAIL`.
- Lighthouse on `/partnerships`: LCP < 2.5s, accessibility ≥ 95.
- JP locale: Noto Sans JP loads, no English fallback in headlines.

**After commit D (admin):**
- Sign in as admin, visit `/admin/partnership-inquiries` → submitted row appears at top.
- Status filter tabs work; counts correct.
- Status update path optional in v1 (read-only list this phase).

**Final:**
- `pnpm verify` ✅ end-to-end on the post-commit-D HEAD.
- Append a new row to the Phase 4 verification log in [`docs/plans/2026-04-26-marketing-rebuild.md`](./2026-04-26-marketing-rebuild.md).
- Mark Phase 4 ✅ done in the umbrella Progress table.

## Risks

1. **Migration application** — if the dev DB doesn't have migration `034` applied, form submits 500 from Postgres. Document `supabase db push` (or studio paste) in commit A's message.
2. **i18n key proliferation** — partnerships namespace adds ~80 new keys. JP stubbed with EN; full JP deferred to Phase 1.5 follow-up per umbrella decision.
3. **`<MorePartnersCallout>` is a design extrapolation** — not in the prototype; replaces the SmashHaus card to honor the visibility memory. Coral-soft surface mirrors the "Not sure?" callout style for visual consistency.
4. **Form-field translation drift** — labels live in three places (form i18n, label-map for emails, admin card display). Centralize in `lib/partnerships/labels.ts` to avoid drift; ship EN-only this phase.
5. **Hero font size** — design HTML uses `clamp(40px, 5vw, 64px)` directly, not the `--m-text-h1` token (which caps at 62px). Inline the clamp in `hero.tsx` like Phase 1's home hero patch did. Don't rely on `<DisplayHeading>` here.
6. **Anonymous insert RLS** — the `partnership_inquiries_anon_insert` policy is belt-and-suspenders; the API route uses service-role and bypasses RLS. If we ever switch to direct supabase-js posts from the browser, the policy is already in place.
