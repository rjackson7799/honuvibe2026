# Partner Platform Buildout — Program Roadmap

> Program-level design doc. Each unit below gets its own detailed plan file +
> fresh execution session per docs/dev-workflow.md, pausing for Ryan's review
> before build. Unit 1 detail: `2026-07-24-partner-membership-spine.md`.

## Context

HonuVibe needs to support **large community partners** — SmashHaus (deal open, page uncommitted/demo-grade) and AfroTech (relationship; their "train 1M people in AI" initiative is the scale target: Fortune 100 sponsors, learners at every career stage, members becoming builders/teachers). The /partnerships marketing page already promises monetization, member value, and members-become-teachers — but the build lags the promise: entitlements are all individual-Stripe-billed, partner perks are hardcoded to Vertice, the partner portal is read-only, and there is no member→teacher pipeline.

**Decisions made with Ryan (brainstorm, 2026-07-24):**
- **Production infrastructure first** — demos fall out of the real product, not mockups.
- **Tenancy:** branded space *inside* HonuVibe (partner logo/colors, scoped catalog, own feed; "powered by HonuVibe" visible). No white-label subdomains.
- **Money (data model anticipates all four; v1 implements first three):** rev-share on member purchases (rails exist), sponsored seat blocks (new), partner teacher earnings (rails exist via instructor shares), partner-set pricing (columns only, no UI yet).
- **Entry paths (all four):** open self-pay, partner join link/code, seat redemption, roster invite/import.
- **Partner-admin self-serve:** member roster management + teacher management. (Moderation view already exists; landing-page editing stays engineer-built for now.)
- **Teacher path:** partner nominates from roster → lands in existing instructor-applications queue with partner context → Ryan approves. Teacher scope: 1v1 tutoring, teach partner cohort courses, propose/create courses — all on existing rails.
- **Member experience:** partner-branded dashboard home + partner-scoped catalog; rest of LMS stays standard.
- **Demos:** unlisted live spaces on production (real partner rows, seeded demo data, unguessable/unlinked + noindex). SmashHaus must stay off the public site until the deal closes; AfroTech same treatment.
- **Sequencing: foundation-first** (units below in order).

Third-party plan review (2026-07-24) incorporated; its four locked invariants below govern all units.

## Architecture: extend the partner primitive (no new "organization" concept)

The `partners` row already *is* the org tenant: owns courses/vault content (`035`), walls the community feed via RLS (`042`: `community_scope_for`, `has_community_access`), carries branding colors + `revenue_share_pct` (`029`), has attribution (`enrollments.partner_id`, rev-split snapshots `033`) and a portal (`app/[locale]/partner/*`). We grow it rather than adding a parallel org layer.

### Locked invariants (all units)

1. **One active partner per user.** Enforced by a partial unique index `ON partner_members(user_id) WHERE status = 'active'`. Every join path (join code, invite acceptance, seat redemption, checkout fulfillment) returns a defined conflict response if the user already has an active membership in another partner. Rejoining the *same* partner after removal reactivates the existing row (composite PK); joining a *different* partner after removal is allowed.
2. **`status = 'active'` gates everything.** Membership statuses are `('active','removed')` only — pending users live solely in `partner_invites`; a `partner_members` row is created on acceptance, never before. All helpers and consumers filter on active: `community_scope_for`, `has_community_access`, branded-home/branding lookup, catalog scoping, community RLS, roster counts, teacher authorization.
3. **Seat/code consumption is transactional.** A SECURITY DEFINER Postgres RPC (called from service-role routes) locks the join-code and seat-block rows, revalidates active/expiry/window, checks usage against limits, creates membership + grant idempotently, increments usage only on success, and returns stable outcomes for retries/double-clicks. Never enforce counts in app code alone; no triggers.
4. **One canonical partner-admin authorization source: `partner_admins` + `is_partner_for()`** (unchanged). `partner_members.role` is `('member','teacher')` only — no `partner_admin` role; the portal roster displays admins by joining `partner_admins`. No dual-maintenance.

### Separation of concerns (stated, not implied)

**Attribution** (who referred a purchase: `enrollments.partner_id`, rev-split snapshots), **membership** (which tenant a user belongs to: `partner_members`), and **entitlement** (what access they have: subscription/cohort/seat grants) are independent. Changing or removing one never silently rewrites another. Historical enrollment attribution and revenue-split snapshots are immutable.

Key existing code to reuse (verified):
- `supabase/migrations/042_community_feed.sql` — `partner_members(partner_id, user_id, joined_at)` composite-PK table; grows columns in place.
- `lib/access/checks.ts` — pure-function entitlement ladder; extend with a `SeatGrantRow` input alongside `CohortEnrollmentRow`.
- `lib/partner-attribution.ts` + `lib/revenue-split/{compute,persist}.ts` — attribution + split snapshots.
- `instructor_applications` (`031`), `instructor_profiles` (`004`), `course_instructors` + `enrollment_instructor_shares` (`033`), 1v1 machinery (`052`/`058`).
- `lib/partner-portal/queries.ts` + `components/partner-portal/*`, `app/api/admin/partners/*`.
- RLS helper patterns: `is_admin()`, `is_partner_for(partner_id)`, SECURITY DEFINER STABLE.

## Migration rollout rule (Units 1 and 4)

Expand/deploy/contract, using the 062 precedent (additive migration applied to prod BEFORE deploy):
1. Apply the backward-compatible additive migration in the Supabase dashboard (`zvfwtndbxshrtpwcwynw`).
2. Verify schema + policies in prod (each migration-bearing unit plan includes a preflight query and a post-migration verification query).
3. Deploy code that consumes the new schema.
4. Backfill and verify counts.
5. Contract (e.g. removing Vertice legacy behavior) ships only in a later deployment after backfill verification.

## The five build units

### Unit 1 — Membership spine, entry paths, generalized benefits (foundation migration)

The biggest unit; everything else stands on it. Full detail in `2026-07-24-partner-membership-spine.md`. Summary:
- Migration ~064: `partner_members` gains `role/status/joined_via` + partial unique index (one active partner per user); new tables `partner_join_codes` (optional `seat_block_id`, same-partner composite FK), `partner_code_redemptions` (usage ledger — no mutable counter), `partner_seat_blocks`, `partner_seat_grants`, `partner_invites` (hashed tokens, email-bound), `partner_benefits` (generalizes `is_vertice_member` + Vertice coupon), `partner_audit_log` (append-only); all mutations via transactional service-role-only RPCs.
- Seat semantics locked (rev 2, review #2 folded): **membership includes Community** (shipped 042 behavior — any active membership grants community/feed access); **seats sponsor Vault only in v1** (`granted_tier` = 'vault'; 'community' reserved for a future decoupling). Grant active = unrevoked AND inside block window (inclusive start, exclusive end); membership revoke → seat revoke, not vice versa. A referral cookie never creates membership — membership on self-pay comes only from explicit partner checkout contexts.
- Entitlement wiring at the chokepoints: `lib/access/checks.ts` (+`SeatGrantRow`), `lib/vault/access.ts` (new source `'seat'`), `lib/community/scope.ts`, SQL `has_community_access`/`has_vault_access`/`community_scope_for` (active-status filter). TS↔SQL parity tests on a shared case matrix.
- Entry routes `/join/[code]` + `/join/invite/[token]`; checkout/fulfillment generalized from Vertice special-cases (expand phase keeps `is_vertice_member` writes; contract deploy removes them later).
- Admin partner editor gains Join codes / Seat blocks / Benefits tabs.

### Unit 2 — Branded member home + scoped catalog

- Member dashboard (`app/[locale]/learn/dashboard`) detects the user's **active** partner: logo + name in header area, accent CSS vars overridden (`--accent-teal`/`--accent-gold` ← `partners.primary_color/secondary_color`, same mechanism as `PartnerLanding.tsx`), "‹Partner› home" module with their courses front and center, community entry labeled with partner name.
- **Partner catalog definition:** partner-owned courses (`courses.partner_id`) ∪ featured courses (`partner_courses`), deduplicated (owned wins), ordered by `partner_courses.display_order` then title; unpublished courses excluded; standard catalog below with normal entitlement rules. Inactive partner or removed membership → standard dashboard, no branding.
- Non-partner members: zero change. Player/library/billing untouched.

### Unit 3 — Partner portal: roster + seats

- `partner/members`: searchable roster (name, email, role, joined-via, seat usage), invite by email (single + CSV paste), revoke membership, resend invite, CSV export. Backed by service-role APIs under `app/api/partner/*` gated by `is_partner_for()`.
- `partner/seats`: seat blocks (vault-only in v1) with usage bars, remaining counts, grant/revoke seat per member. Dashboard tiles: members, seats used/total, teachers.
- **Permission matrix required in the unit plan**: each action (view / invite / revoke membership / change role / grant seat / revoke seat / nominate teacher / export CSV) × actor (HonuVibe admin / partner admin / teacher / member). Safeguards: a partner admin cannot touch another partner, cannot elevate themselves via request payloads; HonuVibe admin manages `partner_admins` (as today), so no last-admin lockout path exists in the portal.
- **CSV hygiene:** row/file limits, strict email normalization + duplicate reporting, per-row success/error results, formula-injection escaping on export, no raw service-role errors surfaced; imports/grants/revocations/role changes written to `partner_audit_log`.
- "Last active" derives from `max(course_session_opens.opened_at)`; omitted from v1 if that proves unreliable — do not invent a new tracking source for it.

### Unit 4 — Teacher pipeline + teacher management

- **Association model:** `instructor_profiles` stays global (1:1 per user, no partner column) — the partner association is **active `partner_members.role = 'teacher'`**, which works under the one-active-partner invariant. If multi-partner teaching ever arrives, introduce `partner_instructors` then; do not build it now.
- `partner_teacher_nominations` — `partner_id`, `user_id`, `nominated_by`, `note`, `status CHECK IN ('nominated','submitted','approved','rejected')`, `instructor_application_id NULL`; unique unresolved nomination per `(partner_id, user_id)`.
- Portal `partner/teachers`: nominate from roster → nomination + `instructor_applications` row tagged `partner_id` (new nullable column) → Ryan's existing `admin/instructor-applications` queue with partner badge → approval creates `instructor_profiles` + sets membership role to `teacher`.
- **Nomination edge cases (defined, no duplicate applications):** nominee already has a pending application → link nomination to it; prior rejected/withdrawn application → new application allowed with history visible; already a global instructor → skip application, set role directly on approval-by-Ryan; removed from the partner mid-review → nomination auto-rejected; duplicate nomination/retry → idempotent no-op on the unresolved unique constraint.
- **Approval is transactional + idempotent:** essential state changes (profile create, application stamp, membership role, nomination status) in one DB transaction (RPC) or with explicit compensation; safe to retry; nomination status stays synchronized with application decisions; emails send only after commit and never roll back approval.
- **Partner-scope enforcement at every teaching mutation** (enumerated + tested in the unit plan, not one gate): course assignment/removal, course creation + proposals, cohort ownership, tutoring assignment, earnings visibility, content editing/publication, and admin UIs that attach instructors. DB constraints protect simple ownership relations; app-level authorization covers the rest. Rule: partner teachers attach only to courses owned by their partner.
- Portal shows per-teacher earnings from `enrollment_instructor_shares` (read-only).

### Unit 5 — Seed SmashHaus + AfroTech unlisted demo spaces

- **Tighten partner readability first (small migration):** change `partners_public_read` from `USING (is_active)` to `USING (is_active AND is_public)` (same for `partner_courses_public_read`); partner landing pages fetch via service-role so unlisted pages still render at their URL; members/partner-admins read their own partner row via new member-read + existing `partners_self_read` policies (needed for branding). Without this, "unlisted" partners are enumerable through the anon REST API regardless of slug secrecy. **Accepted residual risk (explicit):** page *content* at an unguessable URL is protected by URL secrecy + noindex only — the Hawaii Palms/MilesChaser posture. If a deal requires hard confidentiality, add the password-gate (Studio preview pattern, migration 057) at that point.
- Idempotent seed script: partner row (`is_public=false`, tokened slug e.g. `afrotech-preview-x7k2`, renamed at launch), branding, benefits, join code, seat block, demo members/teacher/partner-admin, 2–3 partner courses, seeded feed posts, a nomination in each state.
- **Synthetic identities only:** clearly fake names/emails (`*@demo.honuvibe.ai`), synthetic earnings/sponsor data, a visible "Demo data" marker on demo-partner surfaces so screenshots can't be mistaken for real results. Demo auth users provisioned idempotently via service-role script; passwords generated at seed time and delivered out-of-band (never committed, never in the repo or seed file); documented reset + teardown procedure.
- **SmashHaus commit scope:** exact file manifest + diff review before staging (the worktree also holds unrelated modified files and temp-renamed migrations — nothing outside the manifest is auto-approved). JP TODO + placeholder cleanup scoped here.
- Output: walkthrough script — pitch as demo partner-admin (roster/seats/teachers), demo teacher, demo student (branded home, feed, course).

## Deferred (explicitly out of scope for this program)

- Partner payout/settlement rail (partner shares stay informational/off-platform; instructors keep CSV payouts).
- Stripe billing for seat blocks; partner-set pricing UI (columns only).
- Landing-page self-editing; community moderation portal changes; multi-partner membership; `partner_instructors`; white-label domains; monitoring dashboards (structured logging on redemption/fulfillment paths only).

## Verification (per unit)

- `pnpm verify` (type-check → tests → build; needs `NODE_OPTIONS=--max-old-space-size=8192`).
- Units 1/4/5 touch RLS/migrations → `pnpm test:rls` (temp-rename dup migrations 022/025 first, restore after). Migration applied twice in local testing (idempotency proven), plus DB **constraint** tests (unique-active-membership, window validity, grant uniqueness) — not just app tests.
- Unit 1: TS↔SQL parity tests on the shared entitlement case matrix; **concurrent redemption test** proving no seat/code oversubscription; retry/idempotency tests for invite acceptance and checkout fulfillment; removed/expired/future-start membership tests.
- Units 3/4: cross-partner authorization tests for every `app/api/partner/*` route and teaching mutation.
- Unit 4: approval retry/idempotency + partial-legacy-record reconciliation test.
- UI units: browser EN + `/ja` smoke, both themes (join/invite flows included — errors and emails in both locales).
- Migration-bearing units: preflight + post-migration verification queries in the plan, rollback/forward-fix notes, and a prod smoke of the touched flow immediately after each schema deploy.
- End-to-end after Unit 5: full walkthrough as each demo persona.
