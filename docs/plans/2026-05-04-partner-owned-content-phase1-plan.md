# Partner-Owned Content (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add partner ownership to courses and Vault content so SmashHaus (and future partners) can have a co-branded catalog of music-industry AI training, surfaced everywhere with a "Presented by" badge and reflected in the partner portal as new stats.

**Architecture:** Three nullable `partner_id` columns (courses, content_items, vault_series) with `on delete set null`. Ownership wins over cookie attribution at enrollment time. A single shared `<PartnerBadge>` component renders everywhere partner content surfaces. Partner portal queries broaden to UNION owned-course enrollments with cookie-attributed enrollments.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase (Postgres + RLS), Stripe webhooks, Tailwind, next-intl, Vitest.

**Source spec:** [docs/plans/2026-05-04-partner-owned-content-phase1-design.md](./2026-05-04-partner-owned-content-phase1-design.md)

---

## Pre-execution prerequisites

Confirm these BEFORE starting Task 1:

- [ ] **Verify SmashHaus rev-share = 0:** Run `select slug, revenue_share_pct from partners where is_active = true;` in Supabase. Every active partner that will receive ownership-tagged content must show `0`. If any are non-zero, decide with Ryan whether to leave that partner un-tagged or to coordinate with INS-3 ledger expectations.
- [ ] **Confirm migration `033` is applied** (INS-3 revenue split): `select 1 from information_schema.columns where table_name = 'enrollments' and column_name = 'partner_share_amount';` returns one row.
- [ ] **Capture pre-flight snapshot:** sign in to `/partner/?as=<smashhaus_id>` as admin, screenshot the dashboard. Save to `docs/plans/2026-05-04-preflight/` (locally, not committed). Same for Vertice. After this plan ships, re-take the screenshots — numbers must match if no content has been tagged.
- [ ] **Working tree clean:** `git status` empty. Commits go directly to `main` per project workflow.

---

## File Structure

### New files (8)
| Path | Responsibility |
|---|---|
| `supabase/migrations/034_partner_ownership.sql` | Add `partner_id` to courses, content_items, vault_series |
| `components/partners/PartnerBadge.tsx` | Shared "Presented by X" chip component |
| `app/[locale]/partner/vault/page.tsx` | Partner-portal Vault stats page |
| `lib/partner-portal/queries.test.ts` | Vitest suite for partner-portal queries |
| `lib/partner-attribution/resolve.ts` | Pure helper: `resolveEnrollmentPartnerId(course, cookieSlug)` |
| `lib/partner-attribution/resolve.test.ts` | Vitest suite for resolve helper |
| `components/partners/PartnerFilterChips.tsx` | Filter row for /learn and /learn/vault |
| `components/partners/PartnerVaultSection.tsx` | "Vault content from {Partner}" section on landing page |

### Modified files (~14)
| Path | Change |
|---|---|
| `lib/partner-portal/queries.ts` | Broaden enrollment fetch; add owned-course / vault-stats queries |
| `lib/stripe/webhooks.ts` | Apply `resolveEnrollmentPartnerId` before insert |
| `lib/enrollments/actions.ts` | Apply same resolution for free enrollments |
| `app/[locale]/admin/courses/[id]/page.tsx` | Pass partners list to detail component |
| `components/admin/AdminCourseDetail.tsx` | Partner dropdown + auto-feature + rev-share warning |
| `app/[locale]/admin/vault/[id]/page.tsx` | Partner dropdown + series default |
| `app/[locale]/admin/vault/series/[id]/page.tsx` | Partner dropdown + bulk-apply prompt |
| `app/[locale]/learn/page.tsx` | Render `<PartnerBadge>` on course cards + filter chips |
| `app/[locale]/learn/[slug]/page.tsx` | Render `<PartnerBadge>` in course header |
| `app/[locale]/learn/vault/page.tsx` | Render `<PartnerBadge>` + filter chips |
| `app/[locale]/learn/vault/[slug]/page.tsx` | Render `<PartnerBadge>` |
| `app/[locale]/learn/vault/series/[slug]/page.tsx` | Render `<PartnerBadge>` on series header |
| `app/[locale]/partners/[slug]/page.tsx` | Server-fetch owned vault content; pass to landing |
| `components/partners/PartnerLanding.tsx` | Render new `<PartnerVaultSection>` |
| `app/[locale]/partner/page.tsx` | Add Vault stats cards + "Owned" column |
| `components/partner-portal/PartnerNav.tsx` | Add Vault entry |
| `messages/en.json`, `messages/ja.json` | Add `partner_badge.*` keys |

---

## Task 1: Pre-flight migration

**Goal:** Add the three nullable `partner_id` columns. Reversible. No content tagged yet.

**Files:**
- Create: `supabase/migrations/034_partner_ownership.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 034_partner_ownership.sql
-- Adds partner_id ownership columns to courses, content_items, and vault_series.
-- Source spec: docs/plans/2026-05-04-partner-owned-content-phase1-design.md
-- All columns nullable, no defaults => zero row rewrites on existing data.

-- Course-level partner ownership (1:1; null = HonuVibe-owned)
alter table courses
  add column partner_id uuid references partners(id) on delete set null;
create index courses_partner_id_idx on courses(partner_id) where partner_id is not null;

-- Vault item-level partner ownership (source of truth)
alter table content_items
  add column partner_id uuid references partners(id) on delete set null;
create index content_items_partner_id_idx on content_items(partner_id) where partner_id is not null;

-- Vault series-level partner ownership (admin UX sugar; defaults onto items)
alter table vault_series
  add column partner_id uuid references partners(id) on delete set null;

-- ============================================================
-- Down migration (manual — Supabase doesn't run these automatically):
--
-- drop index if exists courses_partner_id_idx;
-- drop index if exists content_items_partner_id_idx;
-- alter table courses        drop column if exists partner_id;
-- alter table content_items  drop column if exists partner_id;
-- alter table vault_series   drop column if exists partner_id;
-- ============================================================
```

- [ ] **Step 2: Apply the migration to Supabase**

Apply via Supabase dashboard SQL editor or `supabase db push`. Confirm with:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where (table_name, column_name) in (
  ('courses', 'partner_id'),
  ('content_items', 'partner_id'),
  ('vault_series', 'partner_id')
);
```

Expected: 3 rows, all `uuid`, all `YES` nullable.

- [ ] **Step 3: Verify FK + index**

```sql
select indexname from pg_indexes
where indexname in ('courses_partner_id_idx', 'content_items_partner_id_idx');
```

Expected: 2 rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/034_partner_ownership.sql
git commit -m "feat(partners): migration 034 — partner_id ownership columns"
```

---

## Task 2: i18n keys for PartnerBadge

**Goal:** Add the bilingual translation key needed by the badge before the component lands.

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ja.json`

- [ ] **Step 1: Add EN keys**

In `messages/en.json`, find the appropriate top-level section (alphabetical after `partners.*` if present) and add:

```json
"partner_badge": {
  "presented_by": "Presented by {name}",
  "from_partner": "From {name}"
}
```

`presented_by` is for course/vault detail pages (full chip). `from_partner` is the shorter variant for compact card placements.

- [ ] **Step 2: Add JP keys**

In `messages/ja.json`:

```json
"partner_badge": {
  "presented_by": "{name}提供",
  "from_partner": "{name}より"
}
```

- [ ] **Step 3: Verify next-intl picks them up**

```bash
pnpm typecheck
```

Expected: no errors. (next-intl will surface missing keys via `useTranslations` typing only at the call site, but JSON parse errors would surface here.)

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ja.json
git commit -m "feat(partners): add partner_badge i18n keys"
```

---

## Task 3: PartnerBadge component

**Goal:** Single reusable chip component. Renders `[logo] Presented by {name}`, links to `/partners/{slug}`.

**Files:**
- Create: `components/partners/PartnerBadge.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/partners/PartnerBadge.tsx
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type PartnerBadgePartner = {
  slug: string;
  name_en: string;
  name_jp: string | null;
  logo_url: string | null;
};

type Variant = 'default' | 'compact';

type Props = {
  partner: PartnerBadgePartner;
  locale: string;
  variant?: Variant;
  className?: string;
};

export function PartnerBadge({ partner, locale, variant = 'default', className }: Props) {
  const t = useTranslations('partner_badge');
  const name = (locale === 'ja' && partner.name_jp) || partner.name_en;
  const labelKey = variant === 'compact' ? 'from_partner' : 'presented_by';
  const prefix = locale === 'ja' ? '/ja' : '';

  return (
    <Link
      href={`${prefix}/partners/${partner.slug}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-[11px] uppercase tracking-wider text-fg-tertiary transition-colors hover:text-fg-secondary hover:bg-bg-tertiary',
        className,
      )}
    >
      {partner.logo_url && (
        <Image
          src={partner.logo_url}
          alt=""
          width={14}
          height={14}
          className="rounded-sm object-contain"
          unoptimized
        />
      )}
      <span>{t(labelKey, { name })}</span>
    </Link>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/partners/PartnerBadge.tsx
git commit -m "feat(partners): add PartnerBadge component"
```

---

## Task 4: Attribution resolver helper + tests (TDD)

**Goal:** Pure function that decides `enrollments.partner_id`. Reused by Stripe webhook AND free-enrollment paths.

**Files:**
- Create: `lib/partner-attribution/resolve.ts`
- Create: `lib/partner-attribution/resolve.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/partner-attribution/resolve.test.ts
import { describe, it, expect } from 'vitest';
import { resolveEnrollmentPartnerId } from './resolve';

describe('resolveEnrollmentPartnerId', () => {
  it('returns course owner when course has a partner_id', () => {
    expect(
      resolveEnrollmentPartnerId({
        coursePartnerId: 'p-owner',
        cookiePartnerId: 'p-cookie',
      }),
    ).toBe('p-owner');
  });

  it('returns course owner even when no cookie is present', () => {
    expect(
      resolveEnrollmentPartnerId({
        coursePartnerId: 'p-owner',
        cookiePartnerId: null,
      }),
    ).toBe('p-owner');
  });

  it('falls back to cookie when course has no owner', () => {
    expect(
      resolveEnrollmentPartnerId({
        coursePartnerId: null,
        cookiePartnerId: 'p-cookie',
      }),
    ).toBe('p-cookie');
  });

  it('returns null when neither source provides a partner', () => {
    expect(
      resolveEnrollmentPartnerId({
        coursePartnerId: null,
        cookiePartnerId: null,
      }),
    ).toBeNull();
  });

  it('treats empty string as null', () => {
    expect(
      resolveEnrollmentPartnerId({
        coursePartnerId: '',
        cookiePartnerId: 'p-cookie',
      }),
    ).toBe('p-cookie');
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
pnpm vitest run lib/partner-attribution/resolve.test.ts
```

Expected: FAIL ("Cannot find module './resolve'").

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/partner-attribution/resolve.ts

export type ResolveInput = {
  coursePartnerId: string | null | undefined;
  cookiePartnerId: string | null | undefined;
};

/**
 * Decides which partner an enrollment is attributed to.
 * Ownership (course.partner_id) wins over cookie (hv_partner).
 * Returns null when neither is present.
 */
export function resolveEnrollmentPartnerId(input: ResolveInput): string | null {
  const owner = input.coursePartnerId?.trim();
  if (owner) return owner;
  const cookie = input.cookiePartnerId?.trim();
  if (cookie) return cookie;
  return null;
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
pnpm vitest run lib/partner-attribution/resolve.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/partner-attribution/resolve.ts lib/partner-attribution/resolve.test.ts
git commit -m "feat(partners): add resolveEnrollmentPartnerId helper"
```

---

## Task 5: Wire resolver into Stripe webhook

**Goal:** Stripe-paid enrollments use the new resolver. Ownership wins over cookie.

**Files:**
- Modify: `lib/stripe/webhooks.ts`

- [ ] **Step 1: Read the current handler**

Read `lib/stripe/webhooks.ts` and locate `handleCheckoutCompleted`. Note where the existing `partner_slug` cookie value is read from session metadata (added by the Slice B attribution wiring) and where `partner_id` is looked up before the enrollment insert. Note line numbers.

- [ ] **Step 2: Add the import**

At the top of `lib/stripe/webhooks.ts`, add:

```ts
import { resolveEnrollmentPartnerId } from '@/lib/partner-attribution/resolve';
```

- [ ] **Step 3: Update the partner_id resolution**

Find the block where the cookie-based `partner_id` is resolved (slug → id via `resolvePartnerIdBySlug` or equivalent). Just before the enrollment insert, also fetch `course.partner_id` and call the resolver.

```ts
// Before the enrollment insert in handleCheckoutCompleted:

// 1) Cookie-derived partner_id (existing path, may be null)
const cookiePartnerId = /* existing: from session.metadata.partner_slug → DB lookup */;

// 2) Course owner partner_id (new — ownership wins)
const { data: courseRow } = await adminClient
  .from('courses')
  .select('partner_id')
  .eq('id', courseId)
  .single();

const partnerId = resolveEnrollmentPartnerId({
  coursePartnerId: courseRow?.partner_id ?? null,
  cookiePartnerId,
});

// Pass `partnerId` (not the cookie-only value) into the enrollment insert.
```

- [ ] **Step 4: Type-check**

```bash
pnpm typecheck
```

Expected: clean.

- [ ] **Step 5: Manual verify with a test course**

Pick a HonuVibe-owned course (no `partner_id`). Trigger a Stripe test-mode purchase with no `hv_partner` cookie. Confirm `enrollments.partner_id IS NULL` (no regression).

Then set `partner_id` on a test course to SmashHaus's id (one-off SQL update; will be undone in cleanup). Trigger another purchase with no cookie. Confirm `enrollments.partner_id = <smashhaus.id>`.

Cleanup:

```sql
update courses set partner_id = null where id = '<test-course-id>';
```

- [ ] **Step 6: Commit**

```bash
git add lib/stripe/webhooks.ts
git commit -m "feat(partners): ownership wins over cookie in Stripe webhook attribution"
```

---

## Task 6: Wire resolver into free-enrollment path

**Goal:** Free enrollments (no Stripe) use the same resolver.

**Files:**
- Modify: `lib/enrollments/actions.ts`

- [ ] **Step 1: Read current free-enrollment flow**

Read `lib/enrollments/actions.ts`. Find the function(s) that insert into `enrollments` (likely a `createFreeEnrollment` or `enrollInFreeCourse` action). Note where `partner_id` is currently set (or not).

- [ ] **Step 2: Apply same resolver logic**

Add import:

```ts
import { resolveEnrollmentPartnerId } from '@/lib/partner-attribution/resolve';
```

Before each enrollment insert, fetch `course.partner_id` and call the resolver:

```ts
const { data: courseRow } = await adminClient
  .from('courses')
  .select('partner_id')
  .eq('id', courseId)
  .single();

// cookiePartnerSlug comes from existing cookie-reading code (or null if free path
// doesn't currently read the cookie — in that case, just pass null)
const partnerId = resolveEnrollmentPartnerId({
  coursePartnerId: courseRow?.partner_id ?? null,
  cookiePartnerId: existingCookiePartnerId ?? null,
});

await adminClient.from('enrollments').insert({
  /* ...other fields... */
  partner_id: partnerId,
});
```

If the free-enrollment path doesn't currently read the `hv_partner` cookie at all, that's a separate feature (not in scope here) — pass `cookiePartnerId: null` and document with a one-line comment that cookie attribution for free courses is handled by Slice B's existing wiring at the cookie-set point, not at insert. Verify with Ryan during implementation if uncertain.

- [ ] **Step 3: Type-check**

```bash
pnpm typecheck
```

- [ ] **Step 4: Manual verify**

Enroll a test user in a free, partner-owned course (after setting `partner_id` on a test course). Confirm `enrollments.partner_id = <partner.id>`. Cleanup the test course `partner_id` after.

- [ ] **Step 5: Commit**

```bash
git add lib/enrollments/actions.ts
git commit -m "feat(partners): apply ownership-wins attribution to free enrollments"
```

---

## Task 7: Broaden partner-portal queries (TDD)

**Goal:** `getPartnerStats` and friends include enrollments in partner-owned courses, not just cookie-attributed ones.

**Files:**
- Create: `lib/partner-portal/queries.test.ts`
- Modify: `lib/partner-portal/queries.ts`

- [ ] **Step 1: Read current queries.ts**

Read `lib/partner-portal/queries.ts` end-to-end. Note exported function signatures: `resolvePartnerScope`, `getPartnerStats`, `getPartnerCourses`, `getPartnerDailyEnrollments`. Note `fetchAttributedEnrollments` (private helper).

- [ ] **Step 2: Write failing tests**

```ts
// lib/partner-portal/queries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase server module before import
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/server';
import { getPartnerStats, getPartnerOwnedCourses } from './queries';

type EnrollmentSeed = {
  user_id: string;
  status: string;
  amount_paid: number | null;
  currency: string | null;
  enrolled_at: string;
  course_id: string;
  partner_id: string | null;
};

function buildAdminClient(opts: {
  partnerCourses?: { course_id: string }[];
  ownedCourses?: { id: string }[];
  enrollments?: EnrollmentSeed[];
}) {
  const partnerCourses = opts.partnerCourses ?? [];
  const ownedCourses = opts.ownedCourses ?? [];
  const enrollments = opts.enrollments ?? [];

  return {
    from: (table: string) => {
      if (table === 'partner_courses') {
        return {
          select: () => ({
            eq: () => ({ data: partnerCourses, error: null }),
          }),
        };
      }
      if (table === 'courses') {
        return {
          select: () => ({
            eq: () => ({ data: ownedCourses, error: null }),
          }),
        };
      }
      if (table === 'enrollments') {
        return {
          select: () => ({
            // Mimic .eq().neq() chain used by query
            eq: () => ({
              neq: () => ({ data: enrollments, error: null }),
              gte: () => ({
                order: () => ({ data: enrollments, error: null }),
              }),
            }),
            // Variant: in().neq() chain for owned-course set
            in: () => ({
              neq: () => ({ data: enrollments, error: null }),
            }),
          }),
        };
      }
      throw new Error(`unmocked table: ${table}`);
    },
  };
}

describe('getPartnerStats — owned-course attribution', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns zeros when partner has no owned courses and no attributed enrollments', async () => {
    (createAdminClient as any).mockReturnValue(
      buildAdminClient({
        partnerCourses: [],
        ownedCourses: [],
        enrollments: [],
      }),
    );

    const stats = await getPartnerStats('p-1');
    expect(stats.studentCount).toBe(0);
    expect(stats.revenueUsd).toBe(0);
    expect(stats.revenueJpy).toBe(0);
  });

  // NOTE: full integration tests with realistic UNION semantics live in the
  // manual verification step. These unit tests guard the no-regression case
  // and the de-dup invariant.

  it('does not double-count an enrollment that matches both ownership and cookie', async () => {
    const sharedRow: EnrollmentSeed = {
      user_id: 'u-1',
      status: 'active',
      amount_paid: 5000,
      currency: 'usd',
      enrolled_at: new Date().toISOString(),
      course_id: 'c-1',
      partner_id: 'p-1',
    };
    (createAdminClient as any).mockReturnValue(
      buildAdminClient({
        partnerCourses: [{ course_id: 'c-1' }],
        ownedCourses: [{ id: 'c-1' }],
        enrollments: [sharedRow], // same row returned by both branches
      }),
    );

    const stats = await getPartnerStats('p-1');
    expect(stats.studentCount).toBe(1);
    expect(stats.revenueUsd).toBe(5000);
  });
});

describe('getPartnerOwnedCourses', () => {
  it('returns only courses where partner_id matches', async () => {
    (createAdminClient as any).mockReturnValue(
      buildAdminClient({
        ownedCourses: [{ id: 'c-1' }, { id: 'c-2' }],
      }),
    );

    const owned = await getPartnerOwnedCourses('p-1');
    expect(owned.map((c: any) => c.id).sort()).toEqual(['c-1', 'c-2']);
  });
});
```

- [ ] **Step 3: Run tests — confirm they fail**

```bash
pnpm vitest run lib/partner-portal/queries.test.ts
```

Expected: failures referencing `getPartnerOwnedCourses` (not exported) or wrong stats values.

- [ ] **Step 4: Update queries.ts — broaden enrollment fetch**

In `lib/partner-portal/queries.ts`, replace `fetchAttributedEnrollments` with a broader `fetchPartnerEnrollments`:

```ts
async function fetchPartnerEnrollments(partnerId: string): Promise<EnrollmentRow[]> {
  const adminClient = createAdminClient();

  // 1) Get owned-course ids
  const { data: ownedCourses } = await adminClient
    .from('courses')
    .select('id')
    .eq('partner_id', partnerId);
  const ownedIds = (ownedCourses ?? []).map((c: { id: string }) => c.id);

  // 2) Cookie-attributed enrollments
  const { data: attributedRows, error: attrErr } = await adminClient
    .from('enrollments')
    .select('id, user_id, status, amount_paid, currency, enrolled_at, course_id')
    .eq('partner_id', partnerId)
    .neq('status', 'refunded');
  if (attrErr) console.error('[PartnerPortal] attributed fetch failed:', attrErr);

  // 3) Owned-course enrollments (may overlap with #2)
  let ownedRows: any[] = [];
  if (ownedIds.length > 0) {
    const { data, error } = await adminClient
      .from('enrollments')
      .select('id, user_id, status, amount_paid, currency, enrolled_at, course_id')
      .in('course_id', ownedIds)
      .neq('status', 'refunded');
    if (error) console.error('[PartnerPortal] owned fetch failed:', error);
    ownedRows = data ?? [];
  }

  // 4) Dedupe by enrollment id
  const seen = new Set<string>();
  const merged: EnrollmentRow[] = [];
  for (const r of [...(attributedRows ?? []), ...ownedRows]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    merged.push(r as EnrollmentRow);
  }
  return merged;
}
```

Update the `EnrollmentRow` type to include `id: string`. Replace all internal callers of `fetchAttributedEnrollments` with `fetchPartnerEnrollments`.

- [ ] **Step 5: Add `getPartnerOwnedCourses`**

```ts
export type PartnerOwnedCourse = {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
  is_published: boolean;
};

export async function getPartnerOwnedCourses(partnerId: string): Promise<PartnerOwnedCourse[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('courses')
    .select('id, slug, title_en, title_jp, is_published')
    .eq('partner_id', partnerId);
  if (error) {
    console.error('[PartnerPortal] owned courses fetch failed:', error);
    return [];
  }
  return (data ?? []) as PartnerOwnedCourse[];
}
```

- [ ] **Step 6: Update PartnerStats type + getPartnerStats**

Extend the type:

```ts
export type PartnerStats = {
  studentCount: number;
  revenueUsd: number;
  revenueJpy: number;
  courseCount: number;        // featured (existing)
  ownedCourseCount: number;   // NEW
  monthOverMonth: { students: number; revenueUsd: number; revenueJpy: number };
};
```

Update `getPartnerStats`:

```ts
const [{ data: courseLinks }, { data: ownedCourseRows }, rows] = await Promise.all([
  adminClient.from('partner_courses').select('course_id').eq('partner_id', partnerId),
  adminClient.from('courses').select('id').eq('partner_id', partnerId),
  fetchPartnerEnrollments(partnerId),
]);

const courseCount = courseLinks?.length ?? 0;
const ownedCourseCount = ownedCourseRows?.length ?? 0;

// ...rest of existing computation, using `rows` (now broader)...

return {
  studentCount: uniqueStudents.size,
  revenueUsd,
  revenueJpy,
  courseCount,
  ownedCourseCount,
  monthOverMonth: mom,
};
```

- [ ] **Step 7: Run tests — confirm pass**

```bash
pnpm vitest run lib/partner-portal/queries.test.ts
```

Expected: all green.

- [ ] **Step 8: Type-check + manual verify**

```bash
pnpm typecheck
```

Sign in as SmashHaus partner admin (or use admin `?as=<id>` preview). Numbers should match pre-flight snapshot (no content tagged yet, so broader query returns same set).

- [ ] **Step 9: Commit**

```bash
git add lib/partner-portal/queries.ts lib/partner-portal/queries.test.ts
git commit -m "feat(partners): broaden portal queries to include owned-course enrollments"
```

---

## Task 8: Add `getPartnerVaultStats` query

**Goal:** Reusable query for the new `/partner/vault` page and the broadened dashboard.

**Files:**
- Modify: `lib/partner-portal/queries.ts`

- [ ] **Step 1: Add the type and query**

```ts
export type PartnerVaultStats = {
  itemsOwned: number;
  seriesOwned: number;
  views30d: number;
  helpfulSum: number;
};

export async function getPartnerVaultStats(partnerId: string): Promise<PartnerVaultStats> {
  const adminClient = createAdminClient();

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);

  const [{ data: items }, { data: series }, { data: views }] = await Promise.all([
    adminClient
      .from('content_items')
      .select('id, helpful_count')
      .eq('partner_id', partnerId),
    adminClient.from('vault_series').select('id').eq('partner_id', partnerId),
    adminClient
      .from('vault_views')
      .select('content_item_id')
      .gte('created_at', since.toISOString()),
  ]);

  const ownedItemIds = new Set((items ?? []).map((i: { id: string }) => i.id));
  const views30d = (views ?? []).filter((v: { content_item_id: string }) =>
    ownedItemIds.has(v.content_item_id),
  ).length;
  const helpfulSum = (items ?? []).reduce(
    (s: number, i: { helpful_count: number | null }) => s + (i.helpful_count ?? 0),
    0,
  );

  return {
    itemsOwned: items?.length ?? 0,
    seriesOwned: series?.length ?? 0,
    views30d,
    helpfulSum,
  };
}

export type PartnerVaultItem = {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
  freshness_status: string | null;
  helpful_count: number | null;
  not_helpful_count: number | null;
  series_id: string | null;
};

export async function getPartnerVaultItems(partnerId: string): Promise<PartnerVaultItem[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('content_items')
    .select('id, slug, title_en, title_jp, freshness_status, helpful_count, not_helpful_count, series_id')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[PartnerPortal] vault items fetch failed:', error);
    return [];
  }
  return (data ?? []) as PartnerVaultItem[];
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add lib/partner-portal/queries.ts
git commit -m "feat(partners): add getPartnerVaultStats and getPartnerVaultItems"
```

---

## Task 9: Admin course form — partner dropdown + auto-feature + warning

**Goal:** Admin can assign a partner to a course; saving auto-creates the `partner_courses` feature row; rev-share > 0 triggers a warning.

**Files:**
- Modify: `app/[locale]/admin/courses/[id]/page.tsx`
- Modify: `components/admin/AdminCourseDetail.tsx`

- [ ] **Step 1: Read both files end-to-end**

Read `app/[locale]/admin/courses/[id]/page.tsx` and `components/admin/AdminCourseDetail.tsx`. Identify:
- How the page fetches and passes data to the detail component.
- Whether the detail is split into tabs (overview, content, etc.) — partner control belongs in the overview tab adjacent to existing course-meta fields.
- How saves are currently posted (server action vs API route).

- [ ] **Step 2: Server-fetch active partners list**

In the page server component, fetch active partners and pass to the client detail:

```ts
const { data: partners } = await adminClient
  .from('partners')
  .select('id, slug, name_en, logo_url, revenue_share_pct')
  .eq('is_active', true)
  .order('name_en');
// Also fetch current course.partner_id (likely already in the course row)

return <AdminCourseDetail course={course} partners={partners ?? []} {...rest} />;
```

- [ ] **Step 3: Add the dropdown + warning UI**

In `AdminCourseDetail.tsx`, add to the overview tab (place near other top-level course meta like title/slug):

```tsx
type PartnerOpt = {
  id: string;
  slug: string;
  name_en: string;
  logo_url: string | null;
  revenue_share_pct: number;
};

// Inside the component, with existing form state:
const [partnerId, setPartnerId] = useState<string | null>(course.partner_id ?? null);
const selectedPartner = props.partners.find((p) => p.id === partnerId) ?? null;
const showRevShareWarning = selectedPartner ? selectedPartner.revenue_share_pct > 0 : false;

// In the JSX:
<div className="space-y-2">
  <label className="block text-sm font-medium text-fg-primary">Partner (owner)</label>
  <select
    value={partnerId ?? ''}
    onChange={(e) => setPartnerId(e.target.value || null)}
    className="block w-full rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm"
  >
    <option value="">— HonuVibe (default) —</option>
    {props.partners.map((p) => (
      <option key={p.id} value={p.id}>
        {p.name_en}
        {p.revenue_share_pct > 0 ? ` (${p.revenue_share_pct}% rev-share)` : ''}
      </option>
    ))}
  </select>
  {showRevShareWarning && (
    <div className="rounded-md border border-accent-gold/40 bg-accent-gold/10 px-3 py-2 text-xs text-accent-gold">
      <strong>Rev-share warning:</strong> {selectedPartner!.name_en} has a {selectedPartner!.revenue_share_pct}% revenue share. Tagging this course as owned will route share dollars to them via the INS-3 ledger on every enrollment. Confirm this is intended for Phase 1 (typically owner partners should be 0%).
    </div>
  )}
</div>
```

Wire `partnerId` into the existing save payload (server action or PATCH body): include `partner_id: partnerId`.

- [ ] **Step 4: Server-side: persist partner_id + auto-feature**

In the server action / API route that handles course updates (locate during Step 1):

```ts
// After updating the courses row with partner_id:
if (input.partner_id) {
  // Idempotent insert into partner_courses
  await adminClient
    .from('partner_courses')
    .upsert(
      {
        partner_id: input.partner_id,
        course_id: courseId,
        // display_order: max+1 — fetch and compute
      },
      { onConflict: 'partner_id,course_id', ignoreDuplicates: true },
    );
}
```

For `display_order`, query existing max for that partner and use `max + 1`:

```ts
const { data: existing } = await adminClient
  .from('partner_courses')
  .select('display_order')
  .eq('partner_id', input.partner_id)
  .order('display_order', { ascending: false })
  .limit(1);
const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;
```

- [ ] **Step 5: Type-check + manual verify**

```bash
pnpm typecheck
pnpm dev
```

In the browser:
1. Open a HonuVibe-owned course in admin. Confirm dropdown shows "— HonuVibe (default) —" selected.
2. Select SmashHaus. Confirm warning appears IF SmashHaus rev-share > 0; otherwise no warning.
3. Save. Confirm:
   - `select partner_id from courses where id = '<id>'` returns SmashHaus's id.
   - `select * from partner_courses where course_id = '<id>'` returns one row.
4. Re-open the course. Set partner back to "— HonuVibe (default) —". Save. Confirm `courses.partner_id IS NULL` and the `partner_courses` row IS NOT removed (cross-promotion preserved).

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/admin/courses/[id]/page.tsx components/admin/AdminCourseDetail.tsx
# also any server-action / API route file modified
git commit -m "feat(partners): admin course form — partner dropdown + auto-feature"
```

---

## Task 10: Admin Vault item form — partner dropdown + series default

**Goal:** Admin can assign a partner to a Vault content_item. If the item is in a series with a partner_id, default to it.

**Files:**
- Modify: `app/[locale]/admin/vault/[id]/page.tsx`

- [ ] **Step 1: Read the file**

Read `app/[locale]/admin/vault/[id]/page.tsx`. Note the form structure and save handler.

- [ ] **Step 2: Server-fetch partners list**

Same pattern as Task 9: fetch active partners and pass to the form.

- [ ] **Step 3: Compute the default**

In the form component:

```ts
// Default partner_id = item.partner_id ?? series?.partner_id ?? null
const defaultPartnerId =
  contentItem.partner_id ?? props.parentSeries?.partner_id ?? null;
const [partnerId, setPartnerId] = useState<string | null>(defaultPartnerId);
```

- [ ] **Step 4: Add the dropdown**

Same JSX as Task 9 (no rev-share warning needed on Vault items — owned content here doesn't drive revenue, but include the warning consistently to avoid future foot-guns).

- [ ] **Step 5: Persist on save**

Include `partner_id` in the existing PATCH/upsert.

- [ ] **Step 6: Type-check + manual verify**

```bash
pnpm typecheck
```

Open an existing Vault item in admin → set partner → save → confirm DB.

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/admin/vault/[id]/page.tsx
git commit -m "feat(partners): admin vault-item form — partner dropdown"
```

---

## Task 11: Admin Vault series form — partner dropdown + bulk-apply

**Goal:** Admin sets partner_id on a series and optionally applies it to all items in that series.

**Files:**
- Modify: `app/[locale]/admin/vault/series/[id]/page.tsx`

- [ ] **Step 1: Read the file**

Read `app/[locale]/admin/vault/series/[id]/page.tsx`.

- [ ] **Step 2: Add the dropdown** (same pattern as Tasks 9-10)

- [ ] **Step 3: Add a bulk-apply button**

Below the dropdown, render a button when `partnerId` is set AND series has items:

```tsx
{partnerId && itemCount > 0 && (
  <button
    type="button"
    onClick={async () => {
      if (!confirm(`Apply ${selectedPartner.name_en} to all ${itemCount} items in this series?`)) return;
      const res = await fetch(`/api/admin/vault/series/${seriesId}/apply-partner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: partnerId }),
      });
      if (res.ok) router.refresh();
      else alert('Failed to bulk-apply');
    }}
    className="text-xs text-accent-teal hover:underline"
  >
    Apply this partner to all {itemCount} items in this series →
  </button>
)}
```

- [ ] **Step 4: Create the bulk-apply API route**

Create `app/api/admin/vault/series/[id]/apply-partner/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/require-admin'; // or wherever the existing helper lives

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate) return gate;

  const { id: seriesId } = await params;
  const { partner_id } = await req.json();
  if (!partner_id) return NextResponse.json({ error: 'partner_id required' }, { status: 400 });

  const adminClient = createAdminClient();
  const { error, count } = await adminClient
    .from('content_items')
    .update({ partner_id })
    .eq('series_id', seriesId)
    .select('*', { count: 'exact', head: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: count ?? 0 });
}
```

(Adjust the `requireAdmin` import to match how other admin routes guard themselves — see `app/api/admin/partners/[id]/route.ts` for the established pattern.)

- [ ] **Step 5: Type-check + manual verify**

Create a 3-item test series, assign SmashHaus, click "Apply to all 3 items", confirm all three rows in `content_items` get the partner_id.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/admin/vault/series/[id]/page.tsx app/api/admin/vault/series/[id]/apply-partner/route.ts
git commit -m "feat(partners): admin vault-series form — partner + bulk-apply"
```

---

## Task 12: PartnerFilterChips component

**Goal:** Filter row used by both `/learn` and `/learn/vault`. Server component reads selected slug from `searchParams`, renders chips that link to filtered URLs.

**Files:**
- Create: `components/partners/PartnerFilterChips.tsx`

- [ ] **Step 1: Read the existing filter pattern**

Find how `/learn` and `/learn/vault` currently handle filters (e.g., category chips). Match the visual pattern. Common path: `components/learn/CourseFilters.tsx` or similar.

- [ ] **Step 2: Write the component**

```tsx
// components/partners/PartnerFilterChips.tsx
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type PartnerOpt = {
  slug: string;
  name_en: string;
  name_jp: string | null;
};

type Props = {
  partners: PartnerOpt[];
  selectedSlug: string | null;  // null = "All"
  basePath: string;             // e.g. "/learn" or "/learn/vault"
  locale: string;
};

export function PartnerFilterChips({ partners, selectedSlug, basePath, locale }: Props) {
  const t = useTranslations('partner_badge');
  if (partners.length === 0) return null;

  const prefix = locale === 'ja' ? '/ja' : '';
  const allHref = `${prefix}${basePath}`;

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Filter by partner">
      <Chip href={allHref} selected={selectedSlug === null} label="All" />
      <Chip
        href={`${allHref}?owner=honuvibe`}
        selected={selectedSlug === 'honuvibe'}
        label="HonuVibe"
      />
      {partners.map((p) => (
        <Chip
          key={p.slug}
          href={`${allHref}?owner=${p.slug}`}
          selected={selectedSlug === p.slug}
          label={(locale === 'ja' && p.name_jp) || p.name_en}
        />
      ))}
    </nav>
  );
}

function Chip({ href, selected, label }: { href: string; selected: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-full border px-3 py-1 text-xs uppercase tracking-wider transition-colors',
        selected
          ? 'border-accent-teal bg-accent-teal/10 text-accent-teal'
          : 'border-border-default text-fg-tertiary hover:text-fg-secondary',
      )}
    >
      {label}
    </Link>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add components/partners/PartnerFilterChips.tsx
git commit -m "feat(partners): add PartnerFilterChips component"
```

---

## Task 13: /learn catalog — render badge + filter

**Goal:** Course cards in `/learn` show `<PartnerBadge>` when `partner_id` is set; filter chips above the grid.

**Files:**
- Modify: `app/[locale]/learn/page.tsx`
- Modify: the course card component used by `/learn` (locate during Step 1)

- [ ] **Step 1: Read `app/[locale]/learn/page.tsx`**

Identify (a) the course card component, (b) the data fetch returning courses (note whether it includes `partner_id`).

- [ ] **Step 2: Add `partner` to the course query**

Adjust the courses query to include partner data when partner_id is set:

```ts
const { data: courses } = await supabase
  .from('courses')
  .select(`
    id, slug, title_en, title_jp, /* existing fields */,
    partner_id,
    partners!courses_partner_id_fkey ( slug, name_en, name_jp, logo_url )
  `)
  .eq('is_published', true)
  // existing filters
  ;
```

If a partner filter is in `searchParams.owner`, apply it:

```ts
const ownerSlug = (await searchParams).owner ?? null;
let query = supabase.from('courses').select(/* ... */).eq('is_published', true);
if (ownerSlug === 'honuvibe') query = query.is('partner_id', null);
else if (ownerSlug) {
  // Resolve slug -> id then filter
  const { data: p } = await supabase.from('partners').select('id').eq('slug', ownerSlug).maybeSingle();
  if (p) query = query.eq('partner_id', p.id);
}
```

- [ ] **Step 3: Render filter chips above grid**

Fetch active partners and render:

```tsx
const { data: partners } = await supabase
  .from('partners')
  .select('slug, name_en, name_jp')
  .eq('is_active', true)
  .eq('is_public', true)
  .order('name_en');

return (
  <>
    {/* existing heading */}
    <PartnerFilterChips
      partners={partners ?? []}
      selectedSlug={ownerSlug}
      basePath="/learn"
      locale={locale}
    />
    {/* existing course grid */}
  </>
);
```

- [ ] **Step 4: Render badge in card**

In the course card component, when `course.partners` is present:

```tsx
{course.partners && (
  <PartnerBadge
    partner={course.partners}
    locale={locale}
    variant="compact"
    className="mt-2"
  />
)}
```

- [ ] **Step 5: Type-check + manual verify**

```bash
pnpm typecheck
pnpm dev
```

Visit `/learn`. Tag one test course with SmashHaus partner_id (one-off SQL). Confirm:
- Badge appears on that card, not on others.
- Filter chip "SmashHaus" appears.
- Click "SmashHaus" → URL becomes `/learn?owner=smashhaus`, only the tagged course shows.
- Click "HonuVibe" → only HonuVibe-owned courses show.
- Click "All" → reverts.

Cleanup test tagging.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/learn/page.tsx
# also card component if separate
git commit -m "feat(partners): /learn — partner badge + filter chips"
```

---

## Task 14: Course detail page — render badge

**Goal:** `<PartnerBadge>` near the title on `/learn/[slug]`.

**Files:**
- Modify: `app/[locale]/learn/[slug]/page.tsx`

- [ ] **Step 1: Read the file**

Identify where `course.title_en` is rendered in the header.

- [ ] **Step 2: Extend the data fetch**

Include partner via the same FK select pattern as Task 13.

- [ ] **Step 3: Render badge in header**

```tsx
{course.partners && (
  <PartnerBadge partner={course.partners} locale={locale} className="mb-2" />
)}
<h1>{course.title_en}</h1>
```

- [ ] **Step 4: Type-check + manual verify**

Tag a test course → visit detail page → confirm badge appears above title. Cleanup.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/learn/[slug]/page.tsx
git commit -m "feat(partners): course detail page — partner badge in header"
```

---

## Task 15: /learn/vault — render badge + filter

**Goal:** Vault items and series with `partner_id` show `<PartnerBadge>`. Same filter chip row.

**Files:**
- Modify: `app/[locale]/learn/vault/page.tsx`
- Modify: `app/[locale]/learn/vault/series/page.tsx` (if it has its own card layout)

- [ ] **Step 1: Read `app/[locale]/learn/vault/page.tsx`**

Note the data fetch and card component.

- [ ] **Step 2: Extend query + filter**

Same pattern as Task 13: include `partners` join via FK, apply `?owner=` filter, render `<PartnerFilterChips>`.

- [ ] **Step 3: Render badge in vault item card**

```tsx
{item.partners && (
  <PartnerBadge
    partner={item.partners}
    locale={locale}
    variant="compact"
    className="mt-2"
  />
)}
```

- [ ] **Step 4: Same on `app/[locale]/learn/vault/series/page.tsx`** if series cards are rendered there

- [ ] **Step 5: Type-check + manual verify**

Tag a test Vault item with SmashHaus → visit `/learn/vault` → badge + filter work.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/learn/vault/page.tsx app/[locale]/learn/vault/series/page.tsx
git commit -m "feat(partners): /learn/vault — partner badge + filter chips"
```

---

## Task 16: Vault item & series detail pages — render badge

**Goal:** Single-item and single-series detail pages show the badge in the header.

**Files:**
- Modify: `app/[locale]/learn/vault/[slug]/page.tsx`
- Modify: `app/[locale]/learn/vault/series/[slug]/page.tsx`

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Extend each query to include partner via FK**

- [ ] **Step 3: Render `<PartnerBadge>` in each header**

- [ ] **Step 4: Type-check + manual verify**

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/learn/vault/[slug]/page.tsx app/[locale]/learn/vault/series/[slug]/page.tsx
git commit -m "feat(partners): vault detail pages — partner badge in header"
```

---

## Task 17: PartnerVaultSection + landing page integration

**Goal:** `/partners/{slug}` shows a "Vault content from {Partner}" section when the partner owns Vault content.

**Files:**
- Create: `components/partners/PartnerVaultSection.tsx`
- Modify: `app/[locale]/partners/[slug]/page.tsx`
- Modify: `components/partners/PartnerLanding.tsx`

- [ ] **Step 1: Write the section component**

```tsx
// components/partners/PartnerVaultSection.tsx
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export type PartnerVaultSeriesCard = {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
  item_count: number;
};

export type PartnerVaultItemCard = {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
};

type Props = {
  partnerName: string;
  series: PartnerVaultSeriesCard[];
  standaloneItems: PartnerVaultItemCard[];
  locale: string;
};

export function PartnerVaultSection({ partnerName, series, standaloneItems, locale }: Props) {
  const prefix = locale === 'ja' ? '/ja' : '';
  if (series.length === 0 && standaloneItems.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="font-serif text-2xl text-fg-primary">Vault content from {partnerName}</h2>
      <p className="mt-2 text-sm text-fg-tertiary">
        Curated lessons available with a HonuVibe Vault subscription.
      </p>

      {series.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => (
            <Link
              key={s.id}
              href={`${prefix}/learn/vault/series/${s.slug}`}
              className="rounded-lg border border-border-default bg-bg-secondary p-4 hover:border-accent-teal"
            >
              <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">Series · {s.item_count} lessons</div>
              <div className="mt-1 font-medium text-fg-primary">
                {(locale === 'ja' && s.title_jp) || s.title_en}
              </div>
            </Link>
          ))}
        </div>
      )}

      {standaloneItems.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {standaloneItems.map((i) => (
            <Link
              key={i.id}
              href={`${prefix}/learn/vault/${i.slug}`}
              className="rounded-lg border border-border-default bg-bg-secondary p-4 hover:border-accent-teal"
            >
              <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">Lesson</div>
              <div className="mt-1 font-medium text-fg-primary">
                {(locale === 'ja' && i.title_jp) || i.title_en}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Server-fetch in `app/[locale]/partners/[slug]/page.tsx`**

Add to the existing partner-fetch block:

```ts
const [{ data: series }, { data: standaloneItems }] = await Promise.all([
  supabase
    .from('vault_series')
    .select('id, slug, title_en, title_jp, item_count')
    .eq('partner_id', partner.id)
    .eq('is_published', true),
  supabase
    .from('content_items')
    .select('id, slug, title_en, title_jp')
    .eq('partner_id', partner.id)
    .is('series_id', null),
]);
```

Pass to `<PartnerLanding>`.

- [ ] **Step 3: Render in `PartnerLanding.tsx`**

After the existing featured-courses section:

```tsx
<PartnerVaultSection
  partnerName={(locale === 'ja' && partner.name_jp) || partner.name_en}
  series={vaultSeries}
  standaloneItems={vaultStandaloneItems}
  locale={locale}
/>
```

(Add the new props to the component's prop type.)

- [ ] **Step 4: Type-check + manual verify**

Tag a Vault series with SmashHaus → visit `/partners/smashhaus` → confirm section appears. Untag → section disappears.

- [ ] **Step 5: Commit**

```bash
git add components/partners/PartnerVaultSection.tsx app/[locale]/partners/[slug]/page.tsx components/partners/PartnerLanding.tsx
git commit -m "feat(partners): partner landing — Vault content section"
```

---

## Task 18: Partner portal dashboard updates

**Goal:** New stats (Owned courses, Vault items owned, Vault views 30d). "Owned" column on course performance table.

**Files:**
- Modify: `app/[locale]/partner/page.tsx`

- [ ] **Step 1: Read the file**

- [ ] **Step 2: Fetch new stats in parallel**

```ts
const [stats, courses, daily, vaultStats] = await Promise.all([
  getPartnerStats(partner.id),
  getPartnerCourses(partner.id),         // featured (existing)
  getPartnerDailyEnrollments(partner.id, 30),
  getPartnerVaultStats(partner.id),      // new
]);

const ownedCourseIds = new Set(
  (await getPartnerOwnedCourses(partner.id)).map((c) => c.id),
);
```

- [ ] **Step 3: Replace single "Courses featured" card with two cards**

```tsx
<StatCard label="Courses owned" value={stats.ownedCourseCount} icon={BookOpen} />
<StatCard label="Courses featured" value={stats.courseCount} icon={BookOpen} />
```

(Keep the Students / Revenue cards unchanged — semantics already broadened in Task 7.)

- [ ] **Step 4: Add Vault stats row**

Below the main stats grid, add a second row:

```tsx
<div className="grid grid-cols-2 gap-4 md:grid-cols-3">
  <StatCard label="Vault items owned" value={vaultStats.itemsOwned} icon={Library} />
  <StatCard label="Vault series owned" value={vaultStats.seriesOwned} icon={Library} />
  <StatCard label="Vault views (30d)" value={vaultStats.views30d} icon={Eye} />
</div>
```

- [ ] **Step 5: Add "Owned" column to course performance table**

```tsx
<th>Course</th>
<th>Owned</th>  {/* NEW */}
<th>Lifetime</th>
{/* ... */}

<td>
  {ownedCourseIds.has(c.course_id) && (
    <span className="rounded bg-accent-teal/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent-teal">
      Owned
    </span>
  )}
</td>
```

Rename section heading from "Featured courses" to "Course performance".

- [ ] **Step 6: Type-check + manual verify**

Sign in as SmashHaus partner admin (or admin preview). Confirm:
- 4 dashboard cards still render.
- New row of 3 Vault cards renders.
- Course performance table renders with "Owned" badge column (empty until content tagged).

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/partner/page.tsx
git commit -m "feat(partners): portal dashboard — owned-course stats + Vault stats row"
```

---

## Task 19: /partner/vault new page + nav link

**Goal:** Partner can see all Vault content they own with views/freshness.

**Files:**
- Create: `app/[locale]/partner/vault/page.tsx`
- Modify: `components/partner-portal/PartnerNav.tsx`

- [ ] **Step 1: Add nav entry**

In `PartnerNav.tsx`, add to the `navItems` array between Courses and Settings:

```ts
const navItems = [
  { href: '/partner', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/partner/courses', label: 'Courses', icon: BookOpen },
  { href: '/partner/vault', label: 'Vault', icon: Library },     // NEW
  { href: '/partner/settings', label: 'Settings', icon: Settings },
];
```

(Import `Library` from `lucide-react`.)

- [ ] **Step 2: Write the page**

```tsx
// app/[locale]/partner/vault/page.tsx
import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Library, Eye, ThumbsUp } from 'lucide-react';
import { StatCard } from '@/components/admin/StatCard';
import { PartnerPortalLayout } from '@/components/partner-portal/PartnerPortalLayout';
import {
  resolvePartnerScope,
  getPartnerVaultStats,
  getPartnerVaultItems,
} from '@/lib/partner-portal/queries';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ as?: string }>;
};

export default async function PartnerVaultPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { as: previewId } = await searchParams;
  setRequestLocale(locale);

  const scope = await resolvePartnerScope({ locale, previewId });
  if (!scope) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/admin/partners`);
  }

  const { partner, previewMode } = scope;
  const [vaultStats, items] = await Promise.all([
    getPartnerVaultStats(partner.id),
    getPartnerVaultItems(partner.id),
  ]);

  return (
    <PartnerPortalLayout
      partnerName={partner.name_en}
      partnerLogoUrl={partner.logo_url}
      previewMode={previewMode}
    >
      <div className="max-w-[1100px] space-y-8">
        <header>
          <h1 className="font-serif text-3xl text-fg-primary">Vault</h1>
          <p className="mt-1 text-sm text-fg-tertiary">
            Vault content owned by {partner.name_en}.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatCard label="Items owned" value={vaultStats.itemsOwned} icon={Library} />
          <StatCard label="Views (30d)" value={vaultStats.views30d} icon={Eye} />
          <StatCard label="Helpful votes" value={vaultStats.helpfulSum} icon={ThumbsUp} />
        </div>

        {items.length === 0 ? (
          <section className="rounded-lg border border-dashed border-border-default bg-bg-secondary p-8 text-center">
            <h2 className="font-serif text-xl text-fg-primary">No Vault content yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-fg-secondary">
              When HonuVibe tags Vault lessons or series as owned by {partner.name_en}, they'll appear here.
            </p>
          </section>
        ) : (
          <section>
            <h2 className="mb-3 font-serif text-xl text-fg-primary">Items</h2>
            <div className="overflow-hidden rounded-lg border border-border-default bg-bg-secondary">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default text-fg-tertiary">
                    <th className="px-4 py-3 text-left font-medium">Title</th>
                    <th className="px-4 py-3 text-right font-medium">Helpful</th>
                    <th className="px-4 py-3 text-right font-medium">Not helpful</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-b border-border-default last:border-0">
                      <td className="px-4 py-3 text-fg-primary">
                        <Link
                          href={`/${locale === 'ja' ? 'ja/' : ''}learn/vault/${i.slug}`}
                          className="hover:text-accent-teal"
                        >
                          {i.title_en}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-fg-secondary">{i.helpful_count ?? 0}</td>
                      <td className="px-4 py-3 text-right text-fg-secondary">{i.not_helpful_count ?? 0}</td>
                      <td className="px-4 py-3 text-fg-secondary">{i.freshness_status ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </PartnerPortalLayout>
  );
}
```

- [ ] **Step 3: Type-check + manual verify**

Visit `/partner/vault` (admin preview or partner login). Empty state should render. Tag a Vault item with the partner → refresh → table populates.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/partner/vault/page.tsx components/partner-portal/PartnerNav.tsx
git commit -m "feat(partners): /partner/vault page + nav entry"
```

---

## Task 20: Final verification + regression sweep

**Goal:** Confirm nothing is broken end-to-end. Match against pre-flight snapshot.

- [ ] **Step 1: Build verification**

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all green.

- [ ] **Step 2: Run all tests**

```bash
pnpm vitest run
```

Expected: green, including the new `lib/partner-attribution/resolve.test.ts` (5 cases) and `lib/partner-portal/queries.test.ts` (3 cases).

- [ ] **Step 3: Run the manual regression checklist from the spec**

Walk through the checklist in `docs/plans/2026-05-04-partner-owned-content-phase1-design.md` § "Manual regression checklist" — every item.

- [ ] **Step 4: Compare partner portal numbers to pre-flight snapshot**

Sign in as SmashHaus partner admin. With no content tagged yet, all numbers must match the screenshots taken in the pre-execution prerequisites step. If any differ, investigate before proceeding to tag content.

- [ ] **Step 5: Tag a real test course (with Ryan's approval) and validate end-to-end**

Pick one HonuVibe course suitable for SmashHaus (e.g., a music-AI course if one exists). Tag it. Verify:
- Card on `/learn` shows badge.
- Course detail page shows badge.
- Filter by SmashHaus on `/learn` shows it.
- Card on `/partners/smashhaus` shows it (was already in featured? or auto-featured now).
- SmashHaus partner portal: "Courses owned" stat = 1.

If all good, leave tagged for the partnership conversation. If you want to revert: clear `courses.partner_id` and remove the `partner_courses` row.

- [ ] **Step 6: Update PROGRESS.md (if the project tracks it)**

If the repo has `PROGRESS.md`, add a section:

```markdown
## Partner-Owned Content (Phase 1) — 2026-05-04

Implemented partner ownership for courses and Vault content. Migration 034. Admin assignment forms with rev-share warning. Public badging and filter on /learn and /learn/vault. Partner portal extended with owned-content stats and a /partner/vault page.

Plan: docs/plans/2026-05-04-partner-owned-content-phase1-plan.md
Spec: docs/plans/2026-05-04-partner-owned-content-phase1-design.md
```

- [ ] **Step 7: Final commit (if any uncommitted changes remain)**

```bash
git status  # confirm clean or stage final touches
git commit -m "chore(partners): Phase 1 complete — final regression sweep"
git push origin main
```

---

## Out-of-scope reminders

These are NOT part of this plan — do not get distracted:
- Phase 2 (partner instructor program)
- Phase 3 (3-way revenue split, monthly active-user invoicing)
- Member identification / verification
- White-labeling beyond a chip badge
- Vertice migration to data-driven page (Slice D from earlier plan, still deferred)

---

## Rollback plan

If something goes catastrophically wrong post-deploy:

1. **Code rollback:** `git revert` the offending commit(s) and push. The migration is non-destructive — leaving the columns in place is safe.
2. **Schema rollback (only if needed):** Run the down-migration SQL from `034_partner_ownership.sql`. Note this drops `partner_id` from three tables — only do this if no content has been tagged AND you're certain no other code reads those columns.
3. **Data rollback (if content was tagged):** Before running the down-migration, `update courses set partner_id = null` and `update content_items set partner_id = null` and `update vault_series set partner_id = null`. Then run the down-migration.

---

## Self-review

**Spec coverage:** Each numbered design decision (1–7) in the spec maps to a task:
- #1 1:1 ownership → Tasks 1, 9-11
- #2 Ownership wins → Tasks 4-6
- #3 Tagged everywhere → Tasks 13-16
- #4 No member identity / no gating → no work needed (default)
- #5 Series partner_id is sugar → Task 11
- #6 Bilingual null-fallback → Tasks 2, 3, 12, 17
- #7 INS-3 coexistence → Task 9 (rev-share warning) + pre-execution check

**Spec → testing → tasks:**
- Test #1 (no owned content) → Task 7 step 2 case 1
- Test #2 (owned, no enrollments) → covered by manual verify in Task 7 step 8 + Task 9
- Test #3, #4 (mixed) → Task 7 step 2 dedupe test
- Test #5 (`getPartnerOwnedCourses`) → Task 7 step 2 case for ownedCourses
- Test #6 (JP fallback) → manual in Task 13/14/15/16
- Test #7 (no badge when no partner) → manual in Task 13
- Test #8 (Stripe webhook) → Task 5 step 5

**Placeholder scan:** No "TBD" / "implement later" / generic "add error handling". Every code-changing step has runnable code. The few open items in the spec ("locate during implementation") are resolved in this plan via concrete file paths.

**Type consistency:** `PartnerStats.ownedCourseCount` is added in Task 7 step 6 and consumed in Task 18 step 3. `getPartnerVaultStats` defined in Task 8, consumed in Tasks 18 + 19. `resolveEnrollmentPartnerId` defined in Task 4, consumed in Tasks 5 + 6. All match.
