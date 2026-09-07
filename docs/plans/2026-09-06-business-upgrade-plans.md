# Business Upgrade Plans — product and technical implementation plan

> **STATUS: rev 2 DRAFT FOR REVIEW — DO NOT BUILD.**
>
> **Date:** 2026-09-06 · **Plan author:** Codex · **Product/content owner:** Ryan
>
> **Scope:** Feature #1 only. Preserve integration points for the future Workflow Builder, Business Brain, and Industry Implementation Packs without building them.
>
> **Migration reservation:** use `076_business_upgrade_plans.sql` or the next free number at execution. Migration 075 is reserved by the approved Studio deposit plan. Recheck committed files, untracked files, and approved plans before choosing the number.
>
> **Review-time production schema:** 067 and 074 are reported on production; 068–073 remain pending/untracked, and 075 is reserved. Reconfirm the live migration ledger before writing or applying SQL. The migration header must state the live schema it assumes.
>
> **Product decision:** lead with Business Upgrade Plans for small business owners, solopreneurs, and employed professionals who need practical AI outcomes. The Vault is the primary subscription product; HonuVibe Studio is the implementation path for members who want help.

## Outcome

Business Upgrade Plans turn the Vault from a browsable library into an outcome system. A member answers a short assessment, sees up to three suitable upgrade projects, chooses one, and completes a guided plan containing:

1. the minimum Vault material needed to understand the task;
2. a relevant Workbench exercise when the member's entitlement supports it and one exists;
3. actions performed in the member's real business or career;
4. a required baseline and result measure; and
5. an optional Studio handoff when the member wants implementation help.

The first release should prove whether members start and finish practical upgrades. It is not a general AI consultant, workflow builder, CRM, reminder service, or document repository.

### Recommended first project

The preferred first project is **Improve Customer Inquiry Follow-Up**. It has a recognizable problem, a clear deliverable, a short completion cycle, and measurable signals such as response time or follow-up consistency.

Do not assume a matching published Workbench scenario exists. Ryan must inventory the production Vault and Workbench catalogs during content preparation. If no matching scenario passes EN/JA review, launch with an `action` step and add the Workbench reference later.

The launch catalog must contain three to five equally concrete, fully authored projects before enablement. Tool-type Vault entries remain excluded while the tool registry forces them to draft.

## Verified current-system constraints

| Existing capability | Verified behavior | Business Upgrade integration |
|---|---|---|
| Study Paths | AI-generated sequences of published Vault content with member-owned records | Keep the model and all `/learn/paths*` routes. Show Study Paths separately in the Plans hub. |
| Study Path access | [`hasPremiumAccess()`](../../lib/paths/access.ts#L8) covers admin, Vault tier, and grace, but not every Vault source | Preserve current behavior. Entitlement unification is a separate security-sensitive project. |
| Vault app access | [`checkVaultAccess()`](../../lib/vault/access.ts#L72) includes subscription, cohort, partner seat, and legacy enrollment | Authoritative Business Upgrade entitlement in server code. |
| Vault SQL access | [`has_vault_access(uid)`](../../supabase/migrations/064_partner_membership_spine.sql#L1823) omits legacy enrollment | Do not use it as the Business Upgrade record boundary and do not widen it in this unit. |
| Workbench | Scenarios use `has_vault_access()`; a scored attempt has `scored_at is not null` | Enrollment-only members cannot use Workbench today. Filter Workbench-dependent recommendations for them. |
| Vault content | Published `content_items` parents are anonymously readable; protected material lives in child tables. Completion is a bookmark row. | Reference only `is_published = true` items. Keep upgrade progress separate from bookmarks. |
| Dashboard | [`ResumeHero`](../../app/[locale]/learn/dashboard/page.tsx#L314) is the primary action after the `WelcomeScreen` early return. Data uses one `Promise.all` with mixed per-call catches. | Keep ResumeHero first and add an isolated optional Business Upgrade query/module. |
| Member nav | Study Paths is index 4; instructor insertion and the mobile six-item slice depend on that position. | Replace it in place and add an explicit secondary match for `/learn/paths`. |
| Admin | `AdminGuard`, repeated local admin checks, and hardcoded English AdminNav labels are current patterns. | Follow them; do not invent a shared admin helper here. |
| Site settings | Public-readable singleton; current reader/actions are banner-specific. | Add a dedicated flag reader, action, and admin card. Expose only the boolean. |
| Deployment | One Supabase project; previews use production data; production migrations are manual. | Verify locally, deploy dark to production, smoke as admin, then enable separately. |

### Architectural boundary

Study Paths answer, “What should I learn?” Business Upgrade Plans answer, “What should I improve, what did I produce, and what changed?” Business Upgrades therefore receive a separate domain model and transactional lifecycle. A `/learn/plans` hub unites the experiences in the interface while existing Study Path URLs and records remain intact.

## Locked decisions

Changing one of these requires revising the affected schema, access matrix, and tests before implementation.

| Decision | Locked behavior |
|---|---|
| Eligibility | Server-side `checkVaultAccess()`, including legacy enrollment |
| Enrollment-only limitation | Action/Vault projects are eligible; Workbench-dependent projects are not until shared entitlement is fixed separately |
| Database writes | Authenticated server actions derive the user, then call service-role-only RPCs with trusted `p_user_id` |
| RLS | Owner SELECT on member records; no direct member mutations; templates read server-side after access checks |
| Concurrent work | One active Business Upgrade per member |
| Starting another | A new plan requires a new assessment; one assessment creates at most one plan |
| Reopen/reactivate | Reject with `another_plan_active` when another active plan exists |
| Recommendations | Deterministic, versioned admin rules; no model call |
| Recommendation validity | 14 days and only while the project remains published at the recommended template version |
| Launch catalog | Three to five complete projects with verified references |
| Project length | Three to ten required steps, normally 7–14 days |
| Measurement | Exactly one required baseline and result; baseline precedes result; result required for completion |
| Business data | Bounded structured fields; no secrets, customer records, uploads, or unrestricted documents |
| Professionals | `employed_professional` is supported; business/offer/customer summaries are optional |
| Admin visibility | Profile/plan context is read-only for support with no bulk export; analytics/logs exclude it |
| Versioning | Update one project row in place and increment `template_version` on material publish changes; plans keep snapshots |
| Dashboard | ResumeHero stays first; Business Upgrade follows Action Items for eligible members |
| Non-members | No dashboard module; Plans hub shows a localized Vault upsell |
| Nudges | No scheduled reminders or auto-archive; show plan age and keep Archive obvious |
| Studio handoff | Existing Studio lead flow with controlled source/project slug only; no profile or metric data |
| Admin analytics | Aggregate dashboards/exports deferred; MVP includes authoring and read-only member-plan support |

### Product-documentation correction before coding

Vault-first positioning conflicts with [`CLAUDE.md`](../../CLAUDE.md), [`docs/HonuVibe_PRD_v11.md`](../HonuVibe_PRD_v11.md), and [`docs/analytics-events.md`](../analytics-events.md), which still encode course-first conversion goals. Unit A must update all three through a reviewed docs change.

The separate **Confirm Vault pricing** item in [`TODO.md`](../../TODO.md) remains unresolved. This feature must not add or change pricing.

## Member experience

### Entry points and flow

- Replace Study Paths in place with **Plans** at `/learn/plans` and add `alsoMatches: ['/learn/paths']`.
- Preserve `/learn/paths`, `/learn/paths/new`, and `/learn/paths/[id]`.
- Keep onboarding and ResumeHero first; show Business Upgrade after Action Items.
- Show a localized `BusinessUpgradeGate` on the Plans hub for authenticated non-members. Do not copy older gates with non-localized links.

Member flow:

1. **Assess:** Five to seven questions covering goal, work model, optional business context, confidence, tools, and weekly time.
2. **Recommend:** Up to three compatible projects with outcome, deliverable, time, and controlled reasons.
3. **Choose:** Validate freshness and create the plan plus step snapshots in one transaction.
4. **Execute:** Show one next action, progress, outcome, plan age, and ordered steps.
5. **Measure:** Record baseline before result; Workbench uses owned scored attempts; Vault/action steps use explicit confirmation.
6. **Complete:** Require all required steps and a valid result. A new project requires a new assessment.
7. **Escalate:** Offer the controlled Studio handoff.

### Routes

```text
app/[locale]/learn/plans/layout.tsx
app/[locale]/learn/plans/page.tsx
app/[locale]/learn/plans/business/new/page.tsx
app/[locale]/learn/plans/business/recommendations/[assessmentId]/page.tsx
app/[locale]/learn/plans/business/[planId]/page.tsx
```

Each server page authenticates, derives the user ID, reads availability, and calls `checkVaultAccess()`. Client components are never the access boundary. When Business Upgrades are off, the hub can still show Study Paths.

## Data model

Use `076_business_upgrade_plans.sql` or the next free number. User foreign keys reference `public.users(id)`.

### Controlled-code registry

Create `lib/business-upgrades/codes.ts` for goal, industry, work-model, tool, reason, step, measurement, metric-type, and improvement-direction codes. Each code has EN/JA labels. Mirror values in SQL `CHECK`s and test TypeScript/SQL parity.

### `business_upgrade_profiles`

- unique `user_id` FK to `public.users`;
- optional bounded `business_name`, `offer_summary`, and `customer_summary`;
- controlled work model (including `employed_professional`), optional industry, goal, confidence, tools;
- bounded weekly minutes and timestamps.

Do not add these to `users`; migration 068 protects that table with a self-update allowlist. Accept no secrets, customer PII, keys, financial records, or uploads.

### `business_upgrade_assessments`

- member, version, locale, created time, and `expires_at = created_at + 14 days`;
- normalized goal, work model, optional industry, confidence, tools, and time;
- bounded answer snapshot and recommendation-engine version.

Assessments are immutable.

### `business_upgrade_projects`

- unique slug and bilingual title, description, outcome, deliverable, and metric label;
- draft/published/archived status;
- nullable targeting arrays where `NULL` means “any”;
- confidence/time-fit rules, estimated days/minutes;
- metric unit, numeric bounds, value type, and improvement direction;
- integer template version, featured flag, author, published/updated timestamps.

Editing is in place. Publishing material changes increments the version; old plans remain intact through snapshots.

### `business_upgrade_project_steps`

- project and unique sort order;
- `vault`, `workbench`, `action`, or `measurement` type;
- optional `baseline` or `result` measurement kind;
- bilingual title/instructions;
- optional content/scenario FK with `ON DELETE SET NULL`;
- completion rule, estimate, required flag, timestamps.

Column checks enforce field/reference combinations. A database publish-transition trigger enforces 3–10 steps, valid refs, exactly one required baseline/result, and baseline order before result. App-level `validateProjectForPublish()` follows [`validateScenarioForPublish`](../../lib/workbench/validation.ts#L34) for bilingual copy and Japanese-review state.

### `business_upgrade_recommendations`

- assessment/project FKs and project-version snapshot;
- rank, score, controlled reasons, engine version, created/expiry times;
- unique assessment/project and assessment/rank constraints.

Selection requires an unexpired matching row.

### `business_upgrade_plans`

- member, assessment, project, and project-version snapshot;
- bilingual title/outcome/deliverable/metric-label/reason snapshots;
- metric unit/type/bounds/direction snapshots and bounded numeric baseline/result;
- active/completed/archived status and lifecycle timestamps;
- unique `(user_id, source_assessment_id)` for retry idempotency;
- partial unique index for one active plan per member.

Completing or archiving permits a fresh assessment and plan. The old assessment is never reused.

### `business_upgrade_plan_steps`

- plan, source step, order, type, measurement kind, bilingual text snapshots;
- source ID plus stable source slug/title snapshot;
- `ON DELETE SET NULL` on source IDs so history survives deletion;
- pending/completed state, completion time, confirmation flag, optional Workbench attempt.

Unavailable/unpublished sources never expose protected material. Admin broken-reference checks examine current template refs and active plan snapshot refs.

### `business_upgrade_daily_usage`

Copy [`reserve_study_path_generation`](../../supabase/migrations/069_study_path_generation_quota.sql#L21): `(user_id, usage_date)` primary key, bounded count, atomic `INSERT ... ON CONFLICT ... WHERE ... RETURNING`, `SECURITY INVOKER`, and service-role-only execute.

`reserve_business_upgrade_assessment(p_user_id)` allows five assessment creations per UTC day. Reserve after auth/access/payload validation and before insert. Consumed reservations are not refunded after later failures, matching Study Paths.

## Server actions, RPCs, and consistency

Use the repository's established sequence: cookie-authenticated server action → derive user ID → `checkVaultAccess(user.id)` → Zod validation → service-role-only RPC with trusted `p_user_id`.

Mutating RPCs use `SECURITY DEFINER SET search_path = ''`, revoke `PUBLIC`, `anon`, and `authenticated`, and grant only `service_role`. The quota RPC remains `SECURITY INVOKER`. This avoids depending on the incomplete SQL Vault entitlement helper.

### Assessment creation

- Authenticate, check the global/admin-preview flag, and call `checkVaultAccess()`.
- Validate codes/bounds, reserve quota, and upsert only permitted profile fields.
- Insert the immutable assessment, score server-read published templates, and persist zero to three recommendations transactionally.
- Persist zero recommendations and show an honest gap state when nothing qualifies.

### Plan creation

`create_business_upgrade_plan(p_user_id, p_assessment_id, p_project_id)` must atomically:

1. verify assessment ownership and recommendation existence/expiry;
2. require the project to remain published at the recommended version;
3. enforce the Workbench capability decision from trusted server context;
4. reject another active plan with `active_plan_exists`;
5. return the existing plan for a same-assessment retry;
6. copy all project, metric, and step snapshots; and
7. return the new plan.

Never accept access capability from the browser.

### Step completion and lifecycle

`set_business_upgrade_step_status(p_user_id, p_plan_id, p_step_id, p_completed)` locks plan and step, validates ownership, and enforces:

- Vault/action: explicit member confirmation; Vault bookmark state may be shown but does not silently complete the step.
- Workbench: owned attempt for the scenario with `scored_at is not null`, saving the attempt ID; [`userHasScoredAttempt`](../../lib/workbench/queries.ts#L157) is the query precedent.
- Baseline: bounded numeric value before result.
- Result: bounded numeric value after baseline.

The transaction recalculates plan status. Concurrent final-step calls yield one completion. Reopen/reactivate fail with `another_plan_active` when a different active plan exists. Nothing silently archives another plan.

## Recommendation engine

Create a pure versioned function in `lib/business-upgrades/recommend.ts`. First filter drafts, archives, stale/broken resources, and incompatible Workbench projects. Then score:

| Criterion | Score |
|---|---:|
| Exact primary goal | +40 and required |
| Exact work model | +20 |
| Generic work model (`NULL`) | +10 |
| Exact industry | +20 |
| Generic industry (`NULL`) | +10 |
| Confidence in configured range | +10; otherwise ineligible |
| `total_minutes <= weekly_minutes × estimated_weeks` | +10 |
| More than 150% of available time | Ineligible |

Return at most three with score ≥50. Tie-break by score descending, featured descending, slug ascending. Persist reason codes and localize from `codes.ts`. Do not call Claude or assemble arbitrary plans in MVP.

## Admin experience

Add **Business Upgrades** under AdminNav's Learning group and keep it on the mobile strip.

```text
app/[locale]/admin/business-upgrades/page.tsx
app/[locale]/admin/business-upgrades/new/page.tsx
app/[locale]/admin/business-upgrades/[projectId]/page.tsx
app/[locale]/admin/business-upgrades/[projectId]/preview/page.tsx
app/[locale]/admin/business-upgrades/member-plans/page.tsx
app/[locale]/admin/business-upgrades/member-plans/[planId]/page.tsx
```

Template authoring provides filtering, create/edit/duplicate/reorder/preview/publish/unpublish/archive, published Vault/Workbench reference search, targeting/metric controls, and precise validation errors. Never hard-delete a referenced project.

The support view searches member plans and displays profile context, assessment codes, progress, metrics, lifecycle errors, and unavailable refs read-only. It provides no export or progress/profile mutation. Aggregate charts and exports are deferred.

### Content ownership

- Product and final content approval: Ryan.
- Drafting: Ryan or a delegate named in the execution task.
- Native Japanese reviewer: Mayumi (assigned 2026-09-06; review completion remains required before Unit B2 is accepted).
- Sequence: approve outcomes/metrics → inventory production refs → author EN → native JA review → publish while member flag is off.

## Integration details

### Plans navigation and Study Paths

Extend `NavItem` with `alsoMatches?: string[]`. Replace the index-4 entry in [`StudentNav.tsx`](../../components/learn/StudentNav.tsx#L28) with `/learn/plans`, `nav_plans`, and `alsoMatches: ['/learn/paths']`; preserve the instructor splice and mobile slice.

The hub checks Business Upgrade and Study Path eligibility independently. A cohort/seat/enrollment member may see Business Upgrades beside a locked Study Paths section. Explain the distinction; do not expand shared access in this unit.

### Dashboard

Preserve: onboarding early return → notices → ResumeHero → Action Items → eligible Business Upgrade → partner/course/path/Workbench/Vault/community in current relative order. Add `getActiveBusinessUpgrade()` to the existing `Promise.all` with its own `.catch()` and `null` fallback. Dashboard components remain flat under `components/learn/`.

### Vault and Workbench

Use the existing [`VaultContentCard` badge slot](../../components/vault/VaultContentCard.tsx#L54). Keep plan progress separate from completion bookmarks. Require published parent rows and authorized child content.

Use locale-preserving Workbench links with validated `?plan=<uuid>&step=<uuid>`. Do not accept an arbitrary `returnTo`; reconstruct the return link from validated IDs and locale. The completion RPC performs the authoritative attempt check; scoring does not mutate plan tables.

### Feature flag and gate

Add `business_upgrades_enabled boolean not null default false` to public-readable `site_settings`. Create `lib/business-upgrades/availability.ts` using the banner reader's 30-second fail-closed pattern plus request-scoped admin bypass. Store no user IDs in the public row.

Add a dedicated `BusinessUpgradeSettingsCard` to Admin Settings and a business-upgrade admin action using the local admin-check pattern. Revalidate Learn layout/Plans routes. Admins preview while off; members cannot.

`BusinessUpgradeGate` appears on EN/JA Plans hubs for authenticated non-members with a locale-prefixed Vault sales link. It stays off the dashboard.

### Studio handoff

Target `https://studio.honuvibe.ai/contact?source=business_upgrade&project=<slug>`. `StartProjectForm` submits only those controlled values in addition to the user's own form input. The API validates the source, slug format, and published project, then stores `business_upgrade:<slug>` in existing `referral_source`.

Transmit no profile, assessment, member ID, metric, or plan ID. The current Studio destination is EN-only; record that limitation in the UI for JA members.

### Localization and accessibility

Add `dashboard.nav_plans` and a Business Upgrade namespace to both locale catalogs. Require native JA review, preserve locale in Vault/Workbench round trips, and verify keyboard access, focus, reduced motion, 44 px touch targets, and Japanese typography.

## Security and privacy

- Enable RLS before grants.
- Owner SELECT only on member tables; no direct client mutation.
- Admin-only template policies; member DTOs via server-only queries after access checks.
- Service-role-only lifecycle RPCs with fixed empty search path and qualified tables.
- `SECURITY INVOKER` service-only quota RPC.
- Admin support is read-only with no export.
- Analytics/logs exclude business text, customer data, member IDs, assessment prose, and metric values.
- No arbitrary return URL; validate IDs/slugs and recheck ownership/status.

Test anonymous, non-member, owner, cross-user, admin, every Vault access source at the app boundary, and the explicit legacy-enrollment Workbench limitation. Do not assert that `has_vault_access()` includes legacy enrollment. No storage bucket or upload exists.

## Analytics and success criteria

Keep the small event spine and document four events before wiring:

- `business_upgrade_assessment_completed`
- `business_upgrade_plan_started`
- `business_upgrade_plan_completed`
- `business_upgrade_studio_cta_clicked`

Derive recommendation/step state from the database. Plausible properties are strings only, consistent with [`lib/analytics.ts`](../../lib/analytics.ts). Use [`trackServerEvent`](../../lib/analytics-server.ts#L29) for authoritative starts/completions. Allowed properties: project slug, locale, rank. No profile, member, or metric data.

Before enabling, save dated baseline results for:

1. paths completed within 14 days divided by paths created in the preceding complete 30-day cohort;
2. distinct eligible users adding a completed Vault bookmark divided by distinct eligible Vault users in the same 30 days.

These are directional comparators. Review after **30 plan starts or eight weeks, whichever comes later**. Proposed targets: 60% complete a first step within 48 hours and 30% complete a plan within 14 days. If baselines make these unreasonable, revise them before enablement and record why.

## Exact proposed file inventory

Confirm every path against the execution baseline. **New** files are marked.

### Foundation

- `supabase/migrations/076_business_upgrade_plans.sql` — **new**, or next free
- `supabase/tests/business_upgrade_plans_rls.test.ts` — **new**
- `supabase/tests/business_upgrade_plan_races.test.ts` — **new**
- `lib/business-upgrades/types.ts` — **new**
- `lib/business-upgrades/codes.ts` — **new**
- `lib/business-upgrades/schemas.ts` — **new**
- `lib/business-upgrades/schemas.test.ts` — **new**
- `lib/business-upgrades/recommend.ts` — **new**
- `lib/business-upgrades/recommend.test.ts` — **new**
- `lib/business-upgrades/availability.ts` — **new**
- `lib/business-upgrades/queries.ts` — **new**
- `lib/business-upgrades/actions.ts` — **new**
- `lib/business-upgrades/actions.test.ts` — **new**
- `lib/business-upgrades/admin-actions.ts` — **new**
- `lib/business-upgrades/launch-catalog.ts` — **new**
- `lib/business-upgrades/launch-catalog.test.ts` — **new**
- `scripts/seed-business-upgrades-local.ts` — **new**, guarded to localhost
- `scripts/rehearse-business-upgrades-local.ts` — **new**, guarded to localhost and restores launch gates during cleanup
- `docs/content/business-upgrade-launch-catalog.md` — **new**
- `lib/business-upgrades/admin-actions.test.ts` — **new**

### Member

- `app/[locale]/learn/plans/layout.tsx` — **new**
- `app/[locale]/learn/plans/page.tsx` — **new**
- `app/[locale]/learn/plans/business/new/page.tsx` — **new**
- `app/[locale]/learn/plans/business/recommendations/[assessmentId]/page.tsx` — **new**
- `app/[locale]/learn/plans/business/[planId]/page.tsx` — **new**
- `components/learn/BusinessUpgradeGate.tsx` — **new**
- `components/learn/BusinessUpgradeAssessmentWizard.tsx` — **new**
- `components/learn/BusinessUpgradeRecommendationCards.tsx` — **new**
- `components/learn/BusinessUpgradePlanView.tsx` — **new**
- `components/learn/BusinessUpgradePlanCard.tsx` — **new**
- `components/learn/BusinessUpgradeMetricInput.tsx` — **new**
- `components/learn/StudentNav.tsx`
- `app/[locale]/learn/dashboard/page.tsx`
- `app/[locale]/learn/vault/page.tsx`
- `components/vault/VaultBrowseGrid.tsx`
- `components/vault/VaultContentCard.tsx`
- `app/[locale]/learn/vault/workbench/[slug]/page.tsx`
- `components/workbench/WorkbenchWorkspace.tsx`
- `messages/en.json`
- `messages/ja.json`

### Admin, Studio, and docs

- `app/[locale]/admin/business-upgrades/page.tsx` — **new**
- `app/[locale]/admin/business-upgrades/new/page.tsx` — **new**
- `app/[locale]/admin/business-upgrades/[projectId]/page.tsx` — **new**
- `app/[locale]/admin/business-upgrades/[projectId]/preview/page.tsx` — **new**
- `app/[locale]/admin/business-upgrades/member-plans/page.tsx` — **new**
- `app/[locale]/admin/business-upgrades/member-plans/[planId]/page.tsx` — **new**
- `components/admin/AdminBusinessUpgradeList.tsx` — **new**
- `components/admin/AdminBusinessUpgradeEditor.tsx` — **new**
- `components/admin/BusinessUpgradeSettingsCard.tsx` — **new**
- `components/admin/AdminNav.tsx`
- `app/[locale]/admin/settings/page.tsx`
- `components/marketing/studio/start-project-form.tsx`
- `app/api/studio-leads/submit/route.ts`
- `docs/analytics-events.md`
- `CLAUDE.md`
- `docs/HonuVibe_PRD_v11.md`
- `TODO.md` — pricing item remains; no expected feature-scope change

Remove a listed touch only after proving it unnecessary. Adding a shared/system file requires a plan amendment.

## Build order — reviewable units

Each unit gets a fresh implementation task, narrow file ownership, validation record, and review.

### Unit A — product alignment and foundation, dark

- [ ] Capture HEAD, dirty status, live migration ledger, and next-free reservation.
- [ ] Approve Vault-first edits in `CLAUDE.md`, PRD, and analytics docs.
- [ ] Add migration, RLS, RPCs, quota, codes, schemas, types, availability, queries/actions, and tests.
- [ ] Add the default-off flag and admin toggle. Keep member routes absent.

### Unit B1 — admin authoring

- [ ] Add nav, project list/editor, step builder, published-reference search, duplicate, preview, validation, publishing, and archive.
- [ ] Verify database and application publish gates cannot silently diverge.

### Unit B2 — launch content

- [x] Ryan approves three-to-five outcomes, deliverables, metrics, and targets. Approved 2026-09-06.
- [x] Inventory production refs; never assume seed content is live.
- [x] Complete EN authoring.
- [ ] Complete named native-JA review.
- [ ] Publish templates while the member flag stays off.

### Unit C — assessment and recommendations

- [ ] Add hub, non-member gate, assessment, recommendations, gap/expiry states, and transactional creation.
- [ ] Preserve Study Path routes and current eligibility.

### Unit D — execution

- [ ] Add plan detail, progress, measurement, completion, reopen/archive/reactivate, history, age display, and races.

### Unit E — integrations and support

- [ ] Add dashboard, Vault, Workbench, Studio, four analytics events, and read-only admin support.
- [ ] Complete EN/JA, mobile, keyboard, screen-reader, and access-state review.

### Unit F — local verification, production-dark rollout, enablement

- [ ] Complete local DB, app, browser, and regression gates.
- [ ] Apply the migration manually to production before code that queries it, following the proven 062/074 order.
- [ ] Deploy with the flag false and smoke admin authoring/preview with named admin accounts.
- [ ] Confirm content, permissions, telemetry, and rollback.
- [ ] Enable as a separate action and immediately smoke named member accounts.
- [ ] Disable on any access, content, or lifecycle failure.

There is no separate staging environment. A future one must be established before any plan depends on it.

## Verification and regression gates

### Automated

- Recommendation weights, threshold, `NULL = any`, time fit, ties, capabilities, expiry/version, and no-match.
- Schema bounds, code parity, professional fields, EN/JA labels.
- Quota race and no-refund behavior.
- Idempotency, one-active, archive/new-assessment, reopen/reactivate conflicts, and stale recommendations.
- Baseline/result order, bounds, snapshots, and required-result completion.
- Two-connection concurrent final-step and reactivate-vs-create tests.
- Workbench attempt ownership and `scored_at` validation.
- RLS for anon, non-member, owner, cross-user, admin; app access for every Vault source.
- Enrollment-only Workbench exclusion.
- Publish validation, `ON DELETE SET NULL`, broken refs, immutable snapshots.
- Nav active states, feature off, admin preview, gate, and localized CTA.
- Focused Vitest, then `pnpm verify` and `pnpm test:rls`.

RLS runs require local Docker Supabase and the documented temporary handling of duplicate migrations 022/025 in [`docs/dev-workflow.md`](../dev-workflow.md). Review-time known-red baseline: 28 failures in `lib/progress/{actions,queries}.test.ts`. Record the execution-time baseline exactly.

### Browser and production-dark

- Desktop and 375 px mobile in EN/JA.
- Restart, quota, double submit, expiry/version staleness, and no match.
- Two-tab completion, lifecycle conflicts, expired access, and disabled flag.
- Subscription, trial, grace, cohort, seat, legacy enrollment, and non-member states.
- Vault/Workbench round trips, protected child access, validated params, and locale.
- ResumeHero/onboarding order plus Study Path, Vault, Workbench, partner, course, admin-nav, and subscription regressions.
- Studio CTA carries only controlled source/slug and appears through the existing lead flow.
- Native Japanese review of every member string and project.

Local checks are not production clearance. Record the migration, commit, named fixtures/accounts, access cases, flag state, and rollback result.

## Rollout, rollback, and observability

1. Verify against the local stack.
2. Apply reviewed SQL to production before dependent code.
3. Deploy with the flag off.
4. Smoke admin authoring/preview.
5. Enable separately and smoke members.
6. Disable on leakage, lifecycle inconsistency, broken launch content, or sustained RPC errors.

Disabling hides Business Upgrade member surfaces while preserving Study Paths, Vault, Workbench, and plan data. Monitor controlled RPC errors, no-match rate, broken refs, assessment abandonment, starts/completions, and lifecycle inconsistencies.

## Dirty-tree and do-not-touch rules

The review snapshot has roughly 132 unrelated uncommitted entries, including some future shared touchpoints. No implementation task may clean, reset, stash, reformat, stage, or commit unrelated work.

- Never touch untracked migrations 065 or 068–073, their tests, or migration 075 from the Studio deposit plan.
- Do not edit `middleware.ts`, `package.json`, lockfiles, `lib/vault/access.ts`, `lib/paths/access.ts`, shared Workbench actions/scoring, or existing Study Path data code.
- For required shared files such as locale catalogs, StudentNav, dashboard, Vault browse, AdminNav, and Studio intake, capture the prior diff and make only approved hunks.
- Stage/commit by exact path and verify no prior hunks entered the staged diff.
- Prefer a fresh isolated worktree from the approved base. If work occurs in the shared dirty tree, publish its quarantine list before editing.

## Explicitly not this release

- AI-generated/conversational plans
- Workflow Builder or full Business Brain
- Uploaded company knowledge or new storage
- Industry Pack storefront
- Scheduled reminders or auto-archive
- Aggregate admin dashboards/exports
- Admin mutation of member progress/profile
- Multiple active plans
- Shared entitlement unification
- New Vault content types/Tool widgets
- New Studio proposal/engagement behavior
- Pricing/checkout changes
- A new staging environment

## Judgment calls worth a second look

1. Enrollment-only members get Business Upgrades but not Workbench projects; this is safer than widening shared SQL but visibly different.
2. One active plan and a fresh assessment after archive improve clarity but add friction.
3. Required results give completion meaning but depend on choosing quickly observable metrics.
4. Read-only admin support still exposes member-entered business context.
5. Studio handoff works for JA members but lands on the current EN-only Studio site.
6. Deterministic weights are explainable but should be recalibrated after usage data.
7. Production-dark rollout matches current infrastructure but is weaker isolation than a real staging environment.

## Verification log — fill during execution

| Date | Unit | Commit / migration | Checks | Result / known failures | Reviewer |
|---|---|---|---|---|---|
| 2026-09-06 | A–E | Working tree / `076_business_upgrade_plans.sql` | Focused lint; TypeScript; 8 recommendation/schema tests; 4 local RLS/lifecycle tests | Pass | Codex |
| 2026-09-06 | A–E regression | Working tree | Full application test suite | 1,699 passed; known baseline remains 28 failures in `lib/progress/actions.test.ts` and `lib/progress/queries.test.ts` because their mocks omit `course_catalog` | Codex |
| 2026-09-06 | A–E build | Working tree | Next.js optimized production build and 495-page route generation | Pass; existing middleware/Edge deprecation and dynamic Vault route warnings only | Codex |
| 2026-09-06 | B2 draft content | Working tree / local database | Hosted catalog read-only inventory; schema and audience-coverage tests; guarded local seed | 4 projects and 20 steps loaded locally as drafts; all retain the native-JA review gate; no published Workbench scenario was available | Codex |
| 2026-09-06 | B2 verification | Working tree / local database | Second seed run; publish-gate probe; 12 focused tests; focused lint; isolated TypeScript pass | Pass; project count remained 4, every project retained 5 steps and valid Vault refs, and premature publishing was rejected | Codex |
| 2026-09-06 | Local release rehearsal | Working tree / local database | Temporary local publish; member assessment and recommendation; repeated plan creation; five step completions; baseline/result capture; cleanup verification | Pass; one five-step plan reached `completed`, repeated creation returned the same plan, baseline/result were 120/30 minutes, all four projects returned to draft with `jp_needs_review = true`, the feature flag returned to off, and the rehearsal member was removed | Codex |
| 2026-09-06 | B2 Japanese review assignment | Launch catalog | Named native Japanese reviewer | Mayumi assigned; editorial review remains open | Ryan |
| 2026-09-06 | Local route smoke | Local Next.js + local Supabase | EN/JA admin and member route requests | All four routes compiled and returned locale-correct authentication redirects; graphical webview and Chrome could not attach, so visual QA remains open | Codex |

### Implementation status

The local implementation is complete through Units A, B1, C, D, and E. The admin editor keeps step authoring, preview, and member support views in their route components instead of adding three thin wrapper components from the initial inventory. Migration 076 was syntax-checked and exercised against the local Supabase database; it has not been recorded in the local migration ledger or applied to a hosted database.

Unit B2 has four fully structured English launch drafts with existing Vault references. The approved lifecycle was rehearsed locally from assessment through measured completion, including duplicate-plan protection, and the rehearsal cleanup restored every launch gate. Japanese drafts are present but still require named native review before publishing. The hosted catalog returned no published Workbench scenario, so the launch set intentionally contains no Workbench step. Unit F remains intentionally incomplete: the local Browser webview and Chrome attachment both failed during QA, and production-dark migration/deployment, hosted smoke tests, and feature enablement require separate execution. The feature flag remains off by default.

## Definition of done

An eligible member can assess, receive auditable compatible recommendations, start exactly one active project, finish each supported step type, record a required baseline/result, and see history in EN/JA. An admin can author, validate, preview, publish, archive, toggle, and support the lifecycle without database-console content edits. Existing Study Paths, Vault, Workbench, partner access, courses, dashboard order, and subscription gates pass regression checks.

Implementation must not begin until rev 2 and its locked decisions are approved.
