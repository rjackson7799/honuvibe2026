# Unit 2 -- Branded Member Home + Scoped Partner Catalog (rev 4)

> Program context: `2026-07-24-partner-platform-roadmap.md`. This is Unit 2 of 5.
> Stands on Unit 1 (`2026-07-24-partner-membership-spine.md`, shipped b179b60,
> migration 064 applied to prod). Read-only against the spine -- NO MIGRATION.
> Rev 2 folded review #1: community scope defect, enrollment/progress model,
> catalog cap + partial-failure semantics, onboarding bypass, insertion point,
> chokepoint contract, remote-logo validation, test layering.
> Rev 3 folded review #2: full image-pattern (not host-only) validation with a
> shared constant, community scope resolved from `community_scope_for` rather
> than the cosmetic helper, an honest session-validation contract, exact SQL
> ordering before the cap, a discriminated enrollment state, log hygiene for
> unlisted partner slugs.
> Rev 4 folds review #3 (approval round): `is_active` always selected so the
> primary and fallback query paths share one shape; an explicit contract for
> root-relative logo values; `courses!inner` on the featured query; a named
> config export so the drift test is possible; and `PartnerIdentity` applying
> its own accent, since the header sits outside the module's token scope.
> Execute in a fresh session via `docs/plans/_EXECUTION_TEMPLATE.md`.
> **APPROVED BY RYAN 2026-07-25 after three review rounds.**

## Context

Unit 1 built the membership spine: a user can join a partner through a code, an
invite or a sponsored seat, and `partner_members.status = 'active'` gates every
entitlement. But nothing in the product tells that member they are in a partner
space. They join SmashHaus and land on the same dashboard as everyone else.

Unit 2 closes that gap on the member dashboard: partner identity in the header,
a "<Partner> home" module with that partner's courses, and a community tile that
finally shows the feed the member actually has access to. Everyone else sees the
dashboard they see today. Nothing is written to the database by this unit.

## Inherited invariants (Unit 1 -- unchanged, enforced here too)

1. **One active partner per user** -- "the user's partner" is always singular. The
   partial unique index `partner_members_one_active_per_user` (064) makes multiple
   active rows DB-impossible; no tie-breaking logic is written.
2. **`status = 'active'` gates everything** -- the branding lookup filters on it.
3. **All mutations are transactional service-role-only RPCs** -- vacuously
   satisfied: this unit performs no mutations.
4. **`partner_admins` + `is_partner_for()` remain the only partner-admin
   authorization source** -- untouched. `partner_members.role` is not read.

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Branding is module-scoped, plus a header identity strip.** | The dashboard runs inside `.learn-zone` (`styles/globals.css:324`), a light-only palette. `ResumeHero` sits in `.resume-ocean` (`styles/globals.css:746`), which **re-pins `--accent-teal` to `#0fa9a0`** -- a page-wide override would visibly skip the largest element on the page, and would pour arbitrary hex into 13px link text on unaudited surfaces. |
| D2 | **Module contains the partner course rail + identity. The community entry is the EXISTING `CommunityTile`, repaired and conditionally labeled** -- not a second entry. | Section 2. The tile is already the community entry and is currently broken for partner members; a second entry would leave one of them empty. |
| D3 | **Module sits immediately after `ActionItemsBand`, before the My Courses section.** | Resume-first is a shipped decision; dated obligations stay above. The rail directly above My Courses reads as one block. |
| D4 | **Partner rail lives on the dashboard home only.** | Changing `/learn/dashboard/courses` would mean changing `/api/dashboard/courses` and a client component for no roadmap requirement. |
| D5 | **A partner with zero published courses still gets the module**, with a coming-soon empty state. | SmashHaus and AfroTech will have zero courses at ship. |
| D6 | **`is_private` partner courses are INCLUDED.** | Matches `app/[locale]/partners/[slug]/page.tsx`, which filters only on `is_published`. `is_private` hides courses from *public* surfaces (`025_course_privacy.sql`); this surface is auth- and membership-gated. |
| D7 | **The contrast guard is reused, parameterized by surface.** | Same WCAG 3:1 rule, correct surfaces. `.learn-zone` never paints `#0d1220`. A brand near `#1a2b33` is ~14:1 on white and ~1.1:1 on the dark join card; the unparameterized helper would strip the accent from dark-branded partners. |
| D8 | **The `WelcomeScreen` branch gets the identity strip, in BOTH its steps.** | A brand-new user redeeming a join code lands there. `WelcomeScreen` has two separate returns (`:74` password, `:91` chooser); the strip goes in both, enforced structurally (section 5). |
| D9 | **Duplicate course cards are allowed and not suppressed.** | The rail, My Courses and the hero answer different questions. Suppressing would hide a partner's flagship course from its own rail for its most engaged members. Enrolled cards show progress, so the rail never reads as a duplicate *offer*. |
| D10 | **`--accent-gold` is NOT overridden.** `secondary_color` is used only for the module header wash. | Nothing in the module uses gold; setting an unused token is complexity without value. A stated narrowing of the roadmap wording. |
| D11 | **Community feed scope comes from `community_scope_for`, never from the branding helper.** | Section 2. The two rules genuinely differ -- branding requires `partners.is_active`, scope does not -- so deriving one from the other would be wrong for deactivated partners. |
| D12 | **Partner logos are remote HTTPS only.** A root-relative value degrades to the monogram. | `partners.logo_url` is a free-text admin field and `new URL()` throws without a base, so the contract must be explicit. Partner assets are uploaded to Supabase storage; nothing in the product places partner logos in `/public`, so accepting root-relative paths from a DB field would add a traversal-shaped surface for no real use case. If the preflight (rollout step 5) finds a root-relative logo on any partner, adopt the alternative before shipping: accept a single leading `/`, reject protocol-relative `//host/path` and traversal segments. |

## 1. Data reads -- helpers, no migration

### 1a. The chokepoint: `lib/partners/active-partner.ts` (NEW)

Resolves "my active partner + its branding" in one place. **Nothing else may
resolve a user's partner for display purposes.** It is a *cosmetic* helper; it is
not an authorization or scope source (D11).

```ts
export type ActivePartnerContext = {
  partnerId: string;
  slug: string;
  name: string;                 // locale-resolved
  logoUrl: string | null;       // null when absent OR not renderable (1c)
  accent: string | null;        // 3:1-checked; null => caller uses var(--accent-teal)
  accentSubtle: string | null;
  accentWash: string | null;    // <=6% alpha of secondary_color (D10), decorative
};

export async function getActivePartnerContext(
  supabase: SupabaseClient,
  authenticatedUserId: string,
  locale: Locale,               // 'en' | 'ja' from i18n/routing.ts, not string
): Promise<ActivePartnerContext | null>;
```

**Session contract.** The helper does **not** revalidate the session. The page owns
authentication; it has already called `supabase.auth.getUser()` at
`dashboard/page.tsx:60`, and a second call would be a real round trip because
`@supabase/ssr`'s `getUser()` validates against the auth server. The parameter is
documented as **a filter, not a trust boundary**: `pm_self_read`
(`042_community_feed.sql:127`) restricts this query to `auth.uid()` regardless of
what id is passed, so a mismatched id returns zero rows and can never surface
another user's membership. RLS is the security boundary.

**Exact query contract:**

- One embedded query:

```ts
.from('partner_members')
.select(`partner_id, partners!inner(
   id, slug, name_en, name_jp, logo_url,
   primary_color, secondary_color, is_active
 )`)
.eq('user_id', authenticatedUserId)
.eq('status', 'active')
.eq('partners.is_active', true)
.limit(1)
.maybeSingle()
```

- **`is_active` is always selected** (rev 4), so the primary path and the
  contingency below return one identical response shape and the TypeScript check
  is a no-op on the primary path rather than a second code path.
- **Contingency, decided in advance:** if `.eq('partners.is_active', true)` does not
  filter as expected on this PostgREST version, drop that one line and rely on the
  selected `is_active` column in TypeScript. Same columns, same shape, one round
  trip. Do not silently drop the rule.
- **Embedded shape must be normalized.** PostgREST may return the embedded
  `partners` as an object or a single-element array depending on inferred
  relationship metadata. Use the shipped normalization from
  `lib/courses/queries.ts:79-85` (`Array.isArray(raw) ? raw[0] ?? null : raw ?? null`).
  Tested against both shapes.
- `.maybeSingle()`, never `.single()` -- `.single()` errors on zero rows, the normal
  case for most users, and would log noise on every render.
- `.limit(1)` is belt-and-braces, not error handling (invariant 1).
- Columns are exactly those listed. Not `is_public`, `revenue_share_pct` or
  `contact_email`.
- Errors log `error.message` only. No row, no email, no user id, **no slug** (1d).

**Failure contract:** top-level `try/catch`; returns `null` for **all** failures --
`{ error }` responses, unexpected shapes, and thrown client calls alike. Tested
with a stub that throws, not only one that returns an error object.

**Read path:** the authenticated client. RLS grants exactly this read via
`pm_self_read` and `partners_public_read` (`029_partners.sql:88`). Section 8 covers
the Unit 5 contract this creates.

### 1b. The catalog: `lib/partners/catalog.ts` (NEW)

```ts
export type PartnerCatalogEnrollment =
  | { state: 'active';       progressPercent: number }
  | { state: 'completed';    progressPercent: 100 }
  | { state: 'not_enrolled' }
  | { state: 'unknown' };            // enrollment data failed to load

export type PartnerCatalogItem = {
  course: PartnerCourseSummary;      // id, slug, title, description, thumbnailUrl,
                                     // level, totalWeeks, language -- locale-resolved
  displayOrder: number | null;       // from partner_courses; null = owned-only
  enrollment: PartnerCatalogEnrollment;
};

export type PartnerCatalogResult =
  | { status: 'ok';      items: PartnerCatalogItem[]; truncated: boolean }
  | { status: 'partial'; items: PartnerCatalogItem[]; truncated: boolean }
  | { status: 'error';   items: [] };
```

The discriminated enrollment state makes the dangerous case unrepresentable: with
`enrollment: null` plus a separate `available` flag, "not enrolled" and "we don't
know" collapse into the same value and a card can silently claim "View course" to
a paying member after a failed lookup.

**Set:** owned (`courses.partner_id = X`) UNION featured (`partner_courses` joined
to `courses`). **Filter:** `is_published = true` on both sides, in SQL.
`is_private` not filtered (D6).

**The featured query uses an INNER embed** (rev 4):
`courses:course_id!inner(...)` with `.eq('courses.is_published', true)`. Without
`!inner`, PostgREST returns the parent `partner_courses` row carrying a null embed
instead of excluding it, which is why the existing landing page has to filter
nulls in TypeScript (`app/[locale]/partners/[slug]/page.tsx:70-72`). The inner
embed makes the filter do the work and keeps the 51-row prefix meaningful.

**Dedup:** by `courses.id`. "Owned wins" governs row identity only -- both sides
reference the same `courses` row. A course that is both keeps its featured
`display_order`, the only explicit ordering signal a partner admin has.

**Rank, precisely.** Featured membership is determined by the existence of a
`partner_courses` row, **not** by `display_order` being non-null (the column is
`DEFAULT 0` but nullable, `029_partners.sql:46`). Sort key:

1. `(0, displayOrder ?? Infinity)` for featured rows -- numbered featured first,
   a featured row with NULL `display_order` after them but still before owned-only
2. `(1, 0)` for owned-only rows
3. locale-aware title (`localeCompare(locale)`, the idiom at `dashboard/courses/page.tsx:93`)
4. `courses.id` -- final deterministic tiebreak

**Exact SQL ordering, applied BEFORE the cap:**

- Featured: `.order('display_order', { ascending: true, nullsFirst: false })`
  then `.order('course_id', { ascending: true })`. Tiebreak is `course_id` because
  `partner_courses` has a composite PK `(partner_id, course_id)` and no `id`
  column (`029_partners.sql:48`). No foreign-table ordering is needed -- featured
  never sorts by title at the SQL layer.
- Owned: `.order('title_en', { ascending: true })` then `.order('id', { ascending: true })`.
  Deliberately `title_en` even on `/ja`: `title_jp` is nullable, so ordering by it
  would scatter untranslated courses. The SQL order exists only to pick a
  deterministic 51-row prefix; the user-visible order is the locale-aware JS sort.

**Cap:** `.limit(51)` **per source**. Merge, dedup, sort, slice to 50.
`truncated = uniqueCount > 50`. The 51st row is what distinguishes "exactly 50"
from "more than 50"; `.limit(50)` alone cannot.

*Ordering guarantee, stated honestly:* featured always ranks before owned-only,
and each source is fetched in its own deterministic order, so for any partner with
<= 50 published courses -- every real case -- the result is the complete, correctly
ordered catalog. Above 50 the tail is best-effort (SQL collation is not JS
`localeCompare('ja')`), and the truncation log is the signal that a dedicated
partner catalog page is needed. No silent truncation.

**Partial failure, unambiguous.** The two queries are issued and caught
independently:

- Both succeed -> `ok`
- Exactly one succeeds -> `partial` with the rows that loaded, **including when
  the surviving source returns zero rows** -- that case renders partial/failure
  copy, never coming-soon copy. Explicitly tested, because conditional ordering
  (`items.length === 0` checked before `status`) is the easy bug here.
- Both fail -> `error`, no rows

**Enrollment data comes from the page.** `getPartnerCatalog` issues no enrollment
or progress reads. A pure exported
`enrichWithEnrollment(items, enrollments, progress, available)` maps the
already-loaded dashboard bundle onto the union above.

### 1c. Renderable-image validation (full pattern, not host-only)

`next.config.ts:110-127` constrains **protocol, hostname and pathname**:
`https + cdn.sanity.io + /images/**`, `https + *.supabase.co + /storage/v1/object/public/**`,
`https + placehold.co`. A host-only check is not enough:
`https://project.supabase.co/not-storage/logo.png` passes it and still makes
`next/image` reject at render. `partners.logo_url` is free text, and on the
dashboard a rejected `<Image>` takes down the member's home page rather than
degrading.

**Single source of truth:** `lib/images/remote-patterns.ts` (NEW) exports the
pattern array and `isRenderableRemoteImage(url)`. `next.config.ts` imports it via
a **relative** path (`./lib/images/remote-patterns`) so the config loader does not
have to resolve the `@/` alias, and spreads it into `images.remotePatterns`. The
module has no imports of its own, so it is safe to load from the config context.

**Config drift test needs a named export** (rev 4). Today `nextConfig` is a local
const and only `withNextIntl(nextConfig)` is exported (`next.config.ts:128-131`),
so the wrapped value is not reliably introspectable. Add
`export const nextConfig = { ... }` alongside the default export -- Next.js reads
only the default export, so an extra named export is inert -- and have the test
assert `nextConfig.images.remotePatterns` deep-equals `REMOTE_IMAGE_PATTERNS`.
Do this in the FIRST execution step, not at the final gate.

*Contingency:* if the config loader rejects the shared import, duplicate the array
in `next.config.ts`. The drift test is required either way -- it is the mechanism,
not a "keep in sync" comment.

Matching semantics mirror Next.js exactly:

- Parse with `new URL()`; unparseable -> not renderable. Per **D12** this means
  root-relative values (`/logo.svg`) are not renderable and fall back to the
  monogram; that is the contract, not an accident of the parser.
- `protocol` must be `https:`
- hostname: exact match, or a `*.` prefix matching **exactly one** leading label
  (`p.supabase.co` matches `*.supabase.co`; `a.b.supabase.co` and bare
  `supabase.co` do not)
- pathname: a `/prefix/**` pattern requires the pathname to start with `/prefix/`;
  a pattern with no `pathname` accepts any path
- reject URLs carrying credentials (`url.username || url.password`) or an explicit
  port

Failing the check yields `logoUrl: null`, so the module falls back to the monogram
chip (the `PartnerLanding.tsx:105-110` pattern).

### 1d. Log hygiene

Unit 5 provisions unlisted demo partners with deliberately unguessable slugs
(`afrotech-preview-x7k2`); URL secrecy is part of their confidentiality posture.
Log the partner **id** (an opaque UUID) plus the **returned** source counts -- with
`.limit(51)` these are capped at 51 and are not true database totals. No slug
appears in any log line this unit adds.

## 2. Community scope and label (D11) -- repairs a live bug

**Mechanism (policy text), and an UNCONFIRMED claim about today's behavior.**
`dashboard/page.tsx:152` calls `listFeed(supabase, { partnerId: null, ... })`,
which resolves to `.is('partner_id', null)` (`lib/community/queries.ts:41`) -- the
global feed. `cp_scope_read` (`042_community_feed.sql:302`) requires
`partner_id IS NOT DISTINCT FROM community_scope_for(auth.uid())`, and for a member
that returns their partner id. On that reading, global posts are unreadable by
partner members and the tile would be empty for them.

> **Not established.** An earlier revision asserted the tile "has returned zero
> rows for every Vertice member since 042". A production check contradicted it,
> but was made on an admin account -- and `cp_admin_all`
> (`042_community_feed.sql:323`) is `USING (is_admin() OR is_partner_for(partner_id))`,
> so an admin bypasses `cp_scope_read` entirely. The claim is therefore unproven
> in **both** directions and is withdrawn from the commit message and the rollout
> note. It is not load-bearing: the change below is correct regardless of what
> today's behavior turns out to be. Pinning it down needs a plain-member account
> (`users.role != 'admin'`, not in `partner_admins`).

There is no leak risk either way -- RLS makes it impossible for global posts to
appear under a partner label.

**Scope is resolved from the SQL rule, not from branding.** `community_scope_for`
filters only `partner_members.status = 'active'`; it does **not** check
`partners.is_active`. The branding helper does. Deriving feed scope from the
branding helper would send a deactivated partner's members to the global feed
while RLS still expects partner scope -- an empty tile with no explanation.

- `lib/community/scope.ts` (MODIFIED) gains a thin
  `getCommunityScopeId(supabase, userId): Promise<string | null>` -- a single
  `community_scope_for` RPC call. This keeps the community rule inside the
  community module, honoring that file's existing instruction not to re-implement
  the membership lookup in TypeScript.
- The dashboard resolves `[partner, scopeId]` in one `Promise.all` before the main
  bundle, and passes `partnerId: scopeId` to `listFeed`.
- **The tile is partner-labeled only when `partner && scopeId === partner.partnerId`.**
  The label is thereby provably about the feed being shown, not about branding
  state.

**Accepted ambiguity, stated:** on RPC error the helper logs and returns `null`,
which is indistinguishable from "global scope" at the call site. RLS prevents any
leakage, so the only consequence is that a partner member may briefly see a global
empty state instead of a load error. A discriminated result would improve
operational accuracy; it is deliberately deferred because acting on it would mean
adding a new tile state and its bilingual copy, which is scope this unit did not
budget. Recorded here so the trade is explicit rather than accidental.

**Deactivated-partner members, defined:** scope still returns their partner, so the
tile shows that partner's feed with the **generic** label, and the rest of the
dashboard is unbranded. Changing scope on deactivation would mean altering
`community_scope_for`, which is a migration and is out of scope. This is an
improvement, not a regression -- today those members see an empty tile.

**Named, not solved:** `getUnreadCommunityReplies` (`lib/notifications/queries.ts:58`)
counts `notifications` rows user-wide; that table has no partner column. A user who
leaves partner A and joins B can see an unread count for replies to A-scoped posts
they can no longer open. Requires a partner switch to reach; scoping it is a
notifications-model change. Out of scope, recorded as a known gap.

## 3. Branding mechanism

`lib/partners/contrast.ts` (MODIFIED) gains `LEARN_ZONE_SURFACES = ['#ffffff', '#f0ebe3']`
(from `styles/globals.css:326-327`), `safeAccentColorOn(value, surfaces)`, and
`withAlpha(hex, alpha)` on the existing `parseHexColor`. `safeAccentColor(value)`
becomes `safeAccentColorOn(value, [DARK, LIGHT])` -- identical behavior, existing
tests in `__tests__/lib/partners/join.test.ts` pass untouched.

The module wrapper sets `--accent-teal`, `--accent-teal-hover`,
`--accent-teal-subtle` so tinted surfaces cannot mismatch. Hover reuses the same
hex (`PartnerLanding.tsx:74-81` precedent -- no invented color math); feedback comes
from `hover:opacity-90`. `--accent-gold` is untouched (D10).

**`PartnerIdentity` must not depend on inherited tokens** (rev 4). It renders in
the dashboard header and on the welcome screen, both **outside** the module
wrapper, where `--accent-teal` is still HonuVibe teal. It therefore takes the
validated `accent` as a prop and applies it directly (inline style on the elements
that use it, or its own wrapper that sets the vars). A component test asserts the
header identity paints the partner accent with no module ancestor present.

**No solid partner-filled buttons.** Partner color appears as a top rule, an
overline, a logo chip ring and card hover borders -- the shipped
`components/join/join-shell.tsx:29-51` posture. That is why no foreground-color
picker is needed and no arbitrary hex sits behind small text.

`accentWash` (from `secondary_color`) deliberately **skips** the 3:1 gate: clamped
to <= 6% alpha over a white card, decorative, not a UI boundary; text over it stays
`--fg-primary` navy at >= 12:1. Only parseability is validated. (`color-mix` is
already in use at `WelcomeScreen.tsx:118` if preferred at the CSS layer;
`withAlpha` is chosen for unit-testability.)

Every fallback is `var(--accent-teal)`.

## 4. Page wiring (`app/[locale]/learn/dashboard/page.tsx`)

1. After the profile read, resolve
   `const [partner, scopeId] = await Promise.all([getActivePartnerContext(...), getCommunityScopeId(...)])`
   -- **above** the `WelcomeScreen` early return at line 89 (D8).
2. `WelcomeScreen` branch: pass the partner identity. No module, no catalog fetch --
   a brand-new user still does not pay for the dashboard bundle.
3. The existing `Promise.all` receives `scopeId` and `partner?.partnerId`, so
   `listFeed` and `getPartnerCatalog` join the **same parallel batch**. No extra
   sequential round trip for partner members.
4. `getStudentDashboardData` is wrapped to carry an explicit success flag:

```ts
getStudentDashboardData(user.id)
  .then((d) => ({ ok: true as const, ...d }))
  .catch((e) => { console.error(...); return { ok: false as const, enrollments: [], ... }; })
```

The existing catch returns `enrollments: []`, indistinguishable from "genuinely not
enrolled". Without the flag a transient failure renders "View course" to a paying
enrolled member. `enrichWithEnrollment(..., available = dashboardData.ok)` maps
`ok: false` to `{ state: 'unknown' }` for every card.

**Insertion point (D3):** between `<ActionItemsBand>` (line 253) and the
`showMyCourses` section (line 257).

**Cost for non-partner members:** no intended visual or behavioral change; two
single-row reads issued in parallel before the bundle. The membership read is
served by `partner_members_one_active_per_user` -- the partial unique index on
`(user_id) WHERE status = 'active'` (064) -- and `community_scope_for` is an
existing STABLE helper already called on every community page load.

## 5. File-by-file changes

### New files

| File | Purpose |
|---|---|
| `lib/partners/active-partner.ts` | Chokepoint (1a). |
| `lib/partners/catalog.ts` | Catalog queries + pure `mergePartnerCatalog` / `enrichWithEnrollment` (1b). |
| `lib/images/remote-patterns.ts` | Shared `next/image` pattern constants + `isRenderableRemoteImage` (1c). |
| `components/learn/PartnerIdentity.tsx` | Logo-or-monogram + name + accent rule. Applies its own accent (section 3). One identity rendering, shared by header and welcome screen. |
| `components/learn/PartnerHomeModule.tsx` | Server component. Wrapper carries the tokens; renders heading, rail, and the ok/empty/partial/error states. |
| `components/learn/PartnerCourseCard.tsx` | One rail card; presentation per the enrollment union (section 6). Links to `/learn/dashboard/<slug>`, which already handles the not-enrolled case (`[course-slug]/page.tsx:46,69` -> `CourseHub isEnrolled`), so a member is never sent to the public sales page. |
| `__tests__/lib/partners/catalog-merge.test.ts` | **Pure**: merge, dedup, rank, tiebreaks, enrichment. |
| `__tests__/lib/partners/catalog-query.test.ts` | **Mocked client**: filters, `!inner` embed, `.order(...)`, `.limit(51)`, ok/partial/error, truncation. |
| `__tests__/lib/partners/active-partner.test.ts` | **Mocked client**: filters, embedded shape (object AND array), maybeSingle, thrown client, locale. |
| `__tests__/lib/images/remote-patterns.test.ts` | Pattern matching + the config drift assertion (1c). |
| `__tests__/learn/partner-home-module.test.tsx` | Render cases (section 7). |
| `supabase/tests/partner_branding_rls.test.ts` | Read path + Unit 5 tripwire (section 8). |

### Modified files

| File | Change |
|---|---|
| `app/[locale]/learn/dashboard/page.tsx` | Section 4 in full. |
| `components/learn/DashboardWelcomeHeader.tsx` | Optional `partner` prop -> `PartnerIdentity`. Optional and defaulted, so `app/[locale]/admin/page.tsx` is unaffected. |
| `components/learn/WelcomeScreen.tsx` | Optional `partner` prop. Two separate returns (`:74` password step, `:91` chooser); **extract their shared outer container into a local frame that renders `PartnerIdentity`**, so both steps carry it by construction. No other change; its inline bilingual strings stay. |
| `components/learn/CommunityTile.tsx` | Optional `partnerName` -> labeled title, passed only when scope and branding agree (section 2). |
| `lib/community/scope.ts` + `lib/community/types.ts` | Add `getCommunityScopeId`; add `name_jp` to `CommunityScope.partner` and its select. |
| `app/[locale]/learn/dashboard/community/page.tsx` | Line 68 uses `name_en` even on `/ja`. Use `name_jp ?? name_en`. Scoped in because it is the same partner label this unit must get right, one click deeper. |
| `lib/partners/contrast.ts` | Section 3. |
| `next.config.ts` | Import the shared patterns + add the named `nextConfig` export (1c). |
| `messages/en.json` + `messages/ja.json` | New `dashboard.partner_*` keys (section 6). |

Nothing else is touched. Player, library, billing, `/learn`,
`/learn/dashboard/courses`, the partner portal and every API route are out of
scope and unmodified.

## 6. i18n and card presentation

New keys in the existing `dashboard` namespace, EN and JA in the same commit
(`__tests__/i18n/message-parity.test.ts` enforces parity):

- `partner_home_overline`, `partner_home_title` ("{partner} home")
- `partner_home_empty` -- coming-soon; used **only** for `status: 'ok'` with zero items
- `partner_home_partial` / `partner_home_error` -- operational copy, never coming-soon
- `partner_home_browse_all` -- names its destination explicitly ("Browse all HonuVibe courses"), because that link goes to the standard, non-partner-scoped catalog (D4)
- `partner_community_cta` ("{partner} community")
- `partner_course_continue` / `partner_course_review` / `partner_course_view` / `partner_course_open`

Card presentation is fully determined by the enrollment union -- no implementer
invention:

| State | Progress bar | CTA |
|---|---|---|
| `active` | yes, computed percent | `partner_course_continue` |
| `completed` | yes, 100% | `partner_course_review` |
| `not_enrolled` | none | `partner_course_view` |
| `unknown` | none | `partner_course_open` |

`completed` renders 100% rather than its computed percent, matching the shipped
convention at `dashboard/courses/page.tsx:67`.

JP typography: body line-height 1.7-1.8, letter-spacing 0.02-0.04em
(`join-shell.tsx:60` precedent). No `text-justify`. Section headings follow the
learn zone's own convention -- `components/learn/SectionHeading.tsx` is bold sans,
not the marketing DM Serif rule. Confirm `messages/*.json` stay UTF-8 in the diff.

## 7. Defined behavior

| Situation | Behavior |
|---|---|
| No membership row | Standard dashboard, global feed. No change. |
| `status = 'removed'` | Standard dashboard, no branding; scope follows `community_scope_for` (no active row -> global). |
| Active membership, `partners.is_active = false` | No branding. Community tile shows that partner's feed with the **generic** label (section 2). |
| No `logo_url`, or URL failing the full pattern check | Monogram chip. Never a render throw (1c). |
| Root-relative `logo_url` (`/logo.svg`) | Monogram chip, by contract (D12). |
| `primary_color` null / malformed / below 3:1 on learn-zone surfaces | Accent falls back to `var(--accent-teal)`. Module still renders. |
| `secondary_color` unsafe or absent | Wash falls back to the primary accent, then to `--accent-teal-subtle`. |
| Partner has 0 published courses | Coming-soon empty state (D5). |
| One source fails, other returns rows | `partial` -- rows plus partial copy. |
| One source fails, other returns **zero** rows | `partial` -- partial copy only. **Never** coming-soon. |
| Both sources fail | `error` -- failure copy, no rows. |
| More than 50 unique courses | Sliced to 50, `truncated: true`, logged with partner **id** and returned counts (1d). |
| Course both owned and featured | One card, ordered by its `display_order`. |
| Featured row with NULL `display_order` | After numbered featured, before owned-only (1b). |
| Owned but not featured | After all featured, by locale-aware title. |
| Unpublished course | Excluded in SQL on both sides, via the `!inner` embed on the featured side. |
| `is_private` partner course | Included (D6). |
| Partner course also in ResumeHero or My Courses | Rendered in both; not suppressed (D9). |
| `getStudentDashboardData` failed | Every card `{ state: 'unknown' }` -> "Open course", no progress. Never "View course". |
| Chokepoint fails (any cause, incl. thrown client) | `null` -> standard dashboard, logged. |
| `getCommunityScopeId` fails | `null` -> global feed, unlabeled, logged. Accepted ambiguity (section 2). |
| Not onboarded, or `?welcome=true` | `WelcomeScreen` with the identity strip in **both** steps (D8). No module, no catalog fetch. |
| Member is also a HonuVibe admin | No special case. |
| Member switched partners, old unread replies | Count may include unreachable posts. Named, not solved (section 2). |
| `/ja` locale | `name_jp ?? name_en` everywhere the name appears, including the community page. |

## 8. Cross-unit contract (Unit 5 must honor this)

Unit 5 plans to tighten `partners_public_read` from `USING (is_active)` to
`USING (is_active AND is_public)`. That would silently delete the branded home for
every member of an `is_public = false` partner -- precisely the SmashHaus and
AfroTech demo spaces.

**What the Unit 2 test does and does not prove.** Today an active member can read
an unlisted partner row *via `partners_public_read`, which ignores `is_public`* --
not via any member-specific policy. The Unit 2 test passes for that reason and is
documented in-file as a **forward-compatibility tripwire**, not as evidence that
member-scoped access exists. Its value is going red the moment Unit 5 tightens
without adding a member-read policy.

**Unit 5 must add, in the same migration, tests asserting:** an active member can
read their own unlisted active partner; an unrelated authenticated user cannot;
anon cannot; a removed member cannot via the member policy; a partner admin still
can via `partners_self_read`.

## 9. Out of scope

Portal roster/seats UI (Unit 3), teacher pipeline (Unit 4), demo seeding and the
`partners_public_read` tightening (Unit 5), any schema change,
`/learn/dashboard/courses`, the public `/learn` catalog, player, my-library,
billing, partner-scoped Vault content, partner announcements, partner-scoped
notification counts, changing `community_scope_for` deactivation semantics, a
discriminated scope-resolution result (section 2), and the Vertice contract
removal.

**Carry-forward, not solved here:** a removed member can rejoin through a
still-active join code, because codes are bearer credentials by design. It does not
affect Unit 2 -- rejoining yields an active membership, which is what this unit
reads. It shapes Unit 3's roster UI.

## Verification

> **Every scope-related item below must be exercised as a PLAIN MEMBER**
> (`users.role != 'admin'` and not present in `partner_admins`). `cp_admin_all`
> (`042_community_feed.sql:323`) is `USING (is_admin() OR is_partner_for(partner_id))`
> and RLS policies are OR'd, so a HonuVibe admin reads every post platform-wide
> and a partner admin reads all of their own partner's -- both bypass
> `cp_scope_read` completely. Verifying scoping from either account produces a
> green checkbox over unverified behavior. In the RLS suite the correct fixture is
> `vertice_member` / `smashhaus_member`, never `honuvibe_admin` or
> `vertice_partner_admin`.

- [x] `pnpm verify` clean (`NODE_OPTIONS=--max-old-space-size=8192`)
- [x] `pnpm test:rls` clean (temp-rename duplicate migrations 022/025 first, restore after) -- for the added RLS test, not for schema
- [x] **Pure** catalog tests: owned-only; featured-only; both (dedup, featured order wins); featured with NULL `display_order` ranks between numbered-featured and owned; owned-only after featured; ties -> title -> id; enrichment maps active/completed/not_enrolled; `available = false` -> every item `unknown`
- [x] **Mocked-query** catalog tests: `.eq('is_published', true)` on both sources; **`!inner` embed on the featured query so an unpublished course excludes its parent row rather than yielding a null embed**; `.order('display_order', nullsFirst:false)` + `.order('course_id')` on featured; `.order('title_en')` + `.order('id')` on owned; `.limit(51)` on both; one-source failure -> `partial`; **failure + surviving source with zero rows -> `partial`, not empty-state**; both fail -> `error`; 51 unique -> `truncated: true` + log carrying partner **id** and returned counts, **no slug**; 50 -> `truncated: false`
- [x] **Mocked-client** chokepoint tests: filters applied; `is_active` present in the selected columns so the contingency path needs no shape change; no membership -> null; removed -> null; inactive partner -> null; embedded partner returned as **object** and as **array** both parse; thrown client -> null (not a rejected promise); `/ja` picks `name_jp`, falls back to `name_en`
- [x] **Image pattern** tests: allowed host + disallowed pathname -> rejected; `http:` on an allowed host -> rejected; allowed host + allowed path -> accepted; `a.b.supabase.co` and bare `supabase.co` -> rejected; URL with credentials -> rejected; explicit port -> rejected; malformed URL -> rejected; **root-relative `/logo.svg` -> rejected per D12**; protocol-relative `//host/path` -> rejected; **drift assertion that the named `nextConfig` export and the shared module carry identical patterns**
- [x] Contrast tests: `safeAccentColor` unchanged (`__tests__/lib/partners/join.test.ts` green untouched); `safeAccentColorOn` accepts dark navy on learn-zone surfaces, rejects near-white; unparseable -> null -> teal
- [x] Component tests: EN + JA; ok/empty/partial/error use distinct copy; all four card states render their section-6 row; unsafe accent -> teal fallback; **`PartnerIdentity` paints the partner accent with NO module ancestor present** (header/welcome case, section 3); **no partner -> module absent, dashboard tree otherwise identical**; partner tokens do NOT leak to the `?enrolled=true` banner or any sibling; `DashboardWelcomeHeader` without a partner renders exactly as today (admin regression); **`WelcomeScreen` shows the identity in the `passwordSet = false` step AND the chooser step**
- [x] Community: partner member's tile queries the scope id, not null; label applied only when `scopeId === partner.partnerId`; **deactivated-partner member gets the partner feed with the generic label**; non-member still queries null
- [ ] Accessibility, rendered state: partner-colored elements are non-text/graphical; focus rings visible with tokens overridden; monogram text readable on its chip; logo has meaningful alt text and fixed dimensions; `accentWash` does not read as an interactive boundary
      > Status: NOT RUN -- needs a browser. Static posture is in place (accent only on
      > non-text elements, `aria-hidden` on the rule/monogram, logo `alt={partner.name}`
      > with fixed 28x28 dimensions, min-h-[44px] on every rail CTA), but focus-ring
      > visibility and rendered contrast were not observed.
- [x] i18n parity green; no missing-translation warnings; JA committed as UTF-8
- [x] RLS: active member reads their own partner row including `is_public = false` (the section 8 tripwire); a member cannot read another user's `partner_members` row; a removed member has no active row
- [ ] Browser EN + `/ja` as an active partner member: identity strip, module, partner feed in the tile, community page title localized; mobile 375px; keyboard focus order and visible ring; contrast against the rendered card
      > Status: NOT RUN -- Ryan's call (automated gates only this session). Requires a
      > seeded partner member; `.env.local` points at PROD, so this could not be done
      > without writing prod data. **Sign in as a PLAIN MEMBER** (`users.role != 'admin'`,
      > not in `partner_admins`) -- an admin bypasses `cp_scope_read` via `cp_admin_all`.
- [ ] Browser smoke as a NON-partner member: dashboard visually identical to today
      > Status: NOT RUN in a browser. Covered at unit level instead: `DashboardWelcomeHeader`
      > renders byte-identical HTML with the prop absent vs `null`, and the module is gated
      > behind `partner &&`. Visual confirmation still pending.
- [ ] Browser smoke as a member of a deactivated partner: unbranded dashboard, partner feed, generic label
      > Status: NOT RUN in a browser. The label guard is unit-tested via `CommunityTile`
      > (partner label only when `partnerName` is supplied; generic otherwise). **Plain
      > member account required.**
- [ ] Browser smoke of the welcome screen as a newly code-redeemed member: identity strip present in both steps, EN + `/ja`
      > Status: NOT RUN in a browser. Both steps are unit-tested (identity present in the
      > `passwordSet=false` step AND the chooser step, absent in both without a partner).
      > EN + `/ja` visual pass still pending.

## Rollout

1. **No migration.** Read-only against the Unit 1 spine. If execution concludes a
   schema change is genuinely required, **STOP and raise it with Ryan** -- it
   changes the rollout shape and needs his explicit call (roadmap rule).
2. **First execution step:** settle the config drift-test strategy (1c) -- add the
   named `nextConfig` export and prove the assertion runs -- before building the
   rest. Discovering it at the final `pnpm verify` gate is the failure mode to
   avoid.
3. **Worktree hygiene before staging.** The repo carries unrelated modified and
   untracked files (SmashHaus, coming-soon, design docs) and `.bak` migration
   files. Execution runs `git status --short` as preflight, stages **only** the
   section-5 manifest, diffs the staged set against that manifest before
   committing, and confirms no `.bak` file and no unrelated design work is
   modified or staged. If 022/025 are temp-renamed for `pnpm test:rls`, restoring
   them is a required step before staging, verified by a second `git status`.
4. Plain code deploy; no prod SQL step. If any future unit ships a migration, it is
   applied to prod **before** the push (the Unit 1 ordering lesson).
5. **Live-impact warning:** `vertice-society` is the only partner with real members
   today (the `042_community_feed.sql:46` backfill). On deploy every Vertice
   member's dashboard gains the branded home. The tile also switches from global
   scope to `community_scope_for`; what that changes on screen for a real member
   is unconfirmed (section 2) and should be observed on a plain-member account
   post-deploy rather than predicted here.
6. Execution preflight (read-only, dashboard SQL editor on `zvfwtndbxshrtpwcwynw`):
   active `partner_members` count per partner; `partners.primary_color`,
   `secondary_color` and `logo_url` for `vertice-society`, checked against the
   learn-zone contrast bar and the full image-pattern check. **If any partner's
   `logo_url` is root-relative, adopt the D12 alternative before shipping.**
7. Post-deploy prod smoke: Vertice member -> branded home + non-empty community
   tile; non-member -> unchanged dashboard.
8. Rollback: pure code revert. This unit writes nothing, so there is no data to
   unwind and no forward-fix SQL to prepare.

## Suggested commit message

```
feat(partners): branded member home + scoped partner catalog

Active partner members now land on a branded dashboard: partner identity in
the header (and on the welcome screen, which the join-code path hits first),
a "<Partner> home" module with that partner's courses (owned UNION featured,
deduplicated, display_order then title), and a community tile that queries
the scope community_scope_for grants the member, instead of hardcoding
global scope.

Feed scope comes from community_scope_for, not from the branding helper:
the two rules differ on deactivated partners, so the tile is labeled only
when scope and branding agree. Partner accents are scoped to the module and
pass a WCAG 3:1 check against the learn-zone surfaces; partner logo URLs are
validated against the full next/image pattern (protocol, host and path) from
a constant shared with next.config.ts, so an off-pattern logo degrades to a
monogram instead of throwing.

Single chokepoint in lib/partners/active-partner.ts. Read-only against the
Unit 1 spine -- no migration.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```
