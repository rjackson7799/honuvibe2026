# Unit 1 -- Partner Membership Spine, Entry Paths, Generalized Benefits (rev 4)

> Program context: `2026-07-24-partner-platform-roadmap.md`. This is Unit 1 of 5.
> Rev 2 folds in third-party review #2 (2026-07-24): service-role-only RPCs,
> transactional mutations, redemption ledger, vault-only seats, DB-enforced
> cross-partner integrity, invite/token hardening.
> Rev 3 folds in third-party review #3 (2026-07-24): authenticated seat-grant
> read path (RLS would have blocked the TS vault join), upgradeable
> joined_no_seat ledger outcome, expired-invite replacement, admin mutations
> as RPCs, DB-enforced fulfillment idempotency, audit append-only precision.
> Rev 4 folds in third-party review #4 (2026-07-24): ledger-row lookup BEFORE
> max_uses (upgrade path was unreachable on exhausted codes), durable-change
> ledger rule, SET NULL on ledger/fulfillment user FKs (deletion must not
> reopen capacity or erase idempotency), serialized-transition race language.
> Execute in a fresh session via `docs/plans/_EXECUTION_TEMPLATE.md`.
> **PAUSE FOR RYAN'S REVIEW OF THIS PLAN BEFORE BUILDING.**

## Locked invariants (govern every change in this unit)

1. **One active partner per user** -- partial unique index on `partner_members(user_id) WHERE status='active'`. Every join path returns a defined `conflict` outcome if the user already has an active membership in a *different* partner. Rejoining the *same* partner reactivates the existing row.
2. **`status='active'` gates everything** -- pending users exist only in `partner_invites`; membership rows are created on acceptance, never before. Statuses: `('active','removed')`.
3. **All mutations are transactional, service-role-only RPCs** -- SECURITY DEFINER functions with `REVOKE ALL ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role;`, `SET search_path = pg_catalog, public`, schema-qualified objects, row/advisory locks. Routes authenticate the session user in code, then pass the SERVER-derived user id -- never a client-supplied one. **This covers admin/portal compound mutations too**: any data change that pairs with an audit insert (invite create/resend/revoke, code create/deactivate, seat-block create/edit/deactivate, benefits update) is one RPC -- a route doing a table write followed by a separate audit insert is not atomic and is not allowed. No triggers; no app-code counting.
4. **`partner_admins` + `is_partner_for()` stay the only partner-admin authorization source** -- `partner_members.role` is `('member','teacher')` only.

Entitlement rule (explicit): **membership includes Community** (shipped 042 behavior -- any active membership grants community/feed access); **seats sponsor Vault only** in v1. Attribution (enrollments.partner_id, rev-split snapshots), membership (partner_members), and entitlement (subs/cohorts/seat grants) are independent; changing one never rewrites another; historical snapshots are immutable. **A referral cookie never creates membership** (section 4).

## 1. Migration `supabase/migrations/064_partner_membership_spine.sql`

Additive only (expand phase). **Rerunnable from expected states** (IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS; constraints explicitly named so reruns and catalog checks are deterministic -- note: ADD COLUMN IF NOT EXISTS does not converge a pre-existing column to a new CHECK, so name every constraint and add it via a guarded DO block). Single `BEGIN/COMMIT`, 042 house style.

### 1a. `partner_members` upgrade

```sql
ALTER TABLE partner_members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS joined_via text NOT NULL DEFAULT 'backfill',
  ADD COLUMN IF NOT EXISTS activated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS removed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
-- named CHECKs added via guarded DO blocks:
--   pm_role_check     role IN ('member','teacher')
--   pm_status_check   status IN ('active','removed')
--   pm_joined_via_check joined_via IN ('self_pay','join_code','seat','invite','backfill')
CREATE UNIQUE INDEX IF NOT EXISTS partner_members_one_active_per_user
  ON partner_members(user_id) WHERE status = 'active';
```

Semantics: `joined_at` = first-ever join (never rewritten); `activated_at` = latest activation; `removed_at` set on removal, cleared on reactivation. Existing rows (Vertice backfill) default to active/member/backfill -- correct.

No `seat_grant_id` column on `partner_members` (judgment call, carried from rev 1): linkage is derivable via `partner_seat_grants.user_id` and the block's `partner_id`; membership-revoke -> seat-revoke happens inside `remove_partner_member` (1d).

### 1b. New tables

All PKs: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`. All tables: `created_at timestamptz NOT NULL DEFAULT now()`; `created_by uuid REFERENCES public.users(id)` where an actor exists. All CHECKs/FKs named.

```sql
partner_seat_blocks (
  id uuid PK DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id),          -- RESTRICT (no cascade)
  label text NOT NULL,
  seats_total integer NOT NULL CHECK (seats_total >= 0),
  granted_tier text NOT NULL CHECK (granted_tier IN ('vault')),  -- v1 vault-only;
      -- 'community' value reserved: membership already includes Community (042)
  access_starts_at timestamptz NOT NULL,
  access_ends_at timestamptz NOT NULL CHECK (access_ends_at > access_starts_at),
  source text NOT NULL CHECK (source IN ('sponsored','purchased')),
  notes text, is_active boolean NOT NULL DEFAULT true,
  UNIQUE (id, partner_id)                                    -- composite-FK anchor
)
partner_join_codes (
  id uuid PK DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE
    CHECK (code = upper(btrim(code)))                        -- normalization DB-enforced
    CHECK (code ~ '^[A-Z2-9]{8,24}$'),                       -- unambiguous charset (no 0/O/1/I),
                                                             -- bounded length; matches generator
  seat_block_id uuid NULL,
  FOREIGN KEY (seat_block_id, partner_id)
    REFERENCES partner_seat_blocks(id, partner_id),          -- same-partner DB-enforced
  max_uses integer NULL CHECK (max_uses IS NULL OR max_uses >= 0),
  expires_at timestamptz NULL,
  is_active boolean NOT NULL DEFAULT true
)
partner_code_redemptions (                                   -- usage ledger (no mutable counter)
  id uuid PK DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES partner_join_codes(id),   -- RESTRICT: usage history must
                                                             -- survive; codes deactivate, not delete
  user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
      -- SET NULL, not CASCADE: deleting a user must NOT reopen a consumed code use.
      -- Orphaned rows keep counting toward usage. UNIQUE below only constrains live users
      -- (SQL UNIQUE treats NULLs as distinct, which is exactly what we want here).
  outcome text NOT NULL CHECK (outcome IN ('joined','joined_no_seat','seat_granted')),
      -- LEDGER RULE: create exactly one ledger row whenever this code causes a DURABLE
      -- membership or seat change (created, reactivated, or seat granted). RPC failure
      -- outcomes (conflict/invalid/expired/exhausted) and true no-ops (already active
      -- member, nothing changed) write NO row and consume NO use. NOTE: the RPC result
      -- name and the ledger outcome are decoupled -- e.g. RPC seat_revoked_previously
      -- that reactivates membership ledgers as joined_no_seat.
      -- joined_no_seat is NOT final: a retry when a seat is free transitions this row
      -- to seat_granted transactionally WITHOUT consuming another use (see RPC step 6).
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
)
partner_fulfillment_events (                                 -- DB-enforced webhook idempotency
  id uuid PK DEFAULT gen_random_uuid(),
  stripe_ref text NOT NULL UNIQUE,                           -- CANONICAL: Checkout Session id
      -- (cs_...), never event ids -- two webhook events for one checkout must dedupe
  partner_id uuid NOT NULL REFERENCES partners(id),
  user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
      -- SET NULL: deleting a user must not erase the idempotency record; a replayed
      -- old webhook for a deleted user must still dedupe, never fulfill anew
  outcome text NOT NULL CHECK (outcome IN ('processing','fulfilled','conflict','repaired')),
      -- 'processing' exists only inside the RPC's transaction (inserted first for the
      -- dedupe lock, updated to the final outcome before commit); a committed
      -- 'processing' row is impossible and would indicate a bug
  created_at timestamptz NOT NULL DEFAULT now()
)
partner_seat_grants (
  id uuid PK DEFAULT gen_random_uuid(),
  seat_block_id uuid NOT NULL REFERENCES partner_seat_blocks(id),  -- RESTRICT
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  UNIQUE (seat_block_id, user_id)
)
partner_invites (
  id uuid PK DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(btrim(email))),   -- lowercase/trim is sufficient
      -- for Supabase auth email semantics (no plus-addressing canonicalization)
  invited_by uuid NOT NULL REFERENCES public.users(id),
  token_hash text NOT NULL UNIQUE,                           -- sha256 hex of raw token
  seat_block_id uuid NULL,
  FOREIGN KEY (seat_block_id, partner_id)
    REFERENCES partner_seat_blocks(id, partner_id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at timestamptz NOT NULL,
  accepted_by uuid NULL REFERENCES public.users(id), accepted_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
)
-- unique pending invite per (partner_id, email):
CREATE UNIQUE INDEX ... ON partner_invites(partner_id, email) WHERE status = 'pending';
partner_benefits (
  partner_id uuid PK REFERENCES partners(id) ON DELETE CASCADE,
  course_discount_pct numeric(5,2) NOT NULL DEFAULT 0
    CHECK (course_discount_pct BETWEEN 0 AND 100),           -- DISPLAY metadata only (section 6)
  stripe_coupon_id text NULL,                                -- AUTHORITATIVE at checkout
  included_tier text NULL CHECK (included_tier IN ('community','vault')),
      -- INERT in Unit 1: reserved for the flat-license model; entitlement helpers do not read it
  updated_at timestamptz NOT NULL DEFAULT now()
)
partner_audit_log (                                          -- append-only; survives deletes
  id uuid PK DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id),          -- RESTRICT (partners soft-delete)
  partner_slug text NOT NULL,                                -- snapshot; row stands alone
  source text NOT NULL CHECK (source IN ('admin','partner_portal','webhook','system')),
  actor_id uuid NULL,                                        -- no FK: must survive user deletion
  action text NOT NULL,        -- member_removed, member_reactivated, seat_granted, seat_revoked,
                               -- invite_created, invite_revoked, invite_resent, code_created,
                               -- code_deactivated, benefits_updated, block_edited,
                               -- self_pay_attribution_conflict
  target_type text NULL, target_id uuid NULL,                -- generalizes target_user_id
  target_email text NULL,                                    -- snapshot
  old_value jsonb NULL, new_value jsonb NULL,                -- minimal PII in values
  correlation_id text NULL,                                  -- Stripe event id / request id
  reason text NULL, created_at timestamptz NOT NULL DEFAULT now()
)
```

Creation order: `partner_seat_blocks` first (FK deps). Indexes: `partner_members(partner_id, status)`; `partner_seat_grants(user_id) WHERE revoked_at IS NULL`; `partner_seat_grants(seat_block_id) WHERE revoked_at IS NULL` (capacity-count aligned); `partner_code_redemptions(code_id)`; `partner_invites(partner_id, status)`; `partner_join_codes(partner_id)`; `partner_audit_log(partner_id, created_at DESC)`.

`updated_at` maintenance: no triggers -- every mutation RPC/route sets it explicitly; tested.

### 1c. RLS + privileges

- All new tables: `ENABLE ROW LEVEL SECURITY`; `*_admin_all FOR ALL USING (public.is_admin())` -- **except `partner_audit_log`** (below).
- Partner-admin SELECT via `is_partner_for(partner_id)` on: seat_blocks, join_codes, benefits, audit_log, seat_grants (via block join), code_redemptions. **NOT on `partner_invites`** -- portal invite reads go through service APIs or a `partner_invites_browse` view that excludes `token_hash` (the `vault_downloads_browse` precedent). Token hashes are never exposed to any non-service role. `partner_fulfillment_events`: admin SELECT only.
- Member self-read: `partner_members` (`user_id = auth.uid()`, keep existing policies) and `partner_seat_grants` (`user_id = auth.uid()`).
- **`partner_audit_log` append-only, precisely:** HonuVibe admin and partner admin get SELECT-only policies (admin policy is `FOR SELECT`, not `FOR ALL`); no UPDATE/DELETE policy or grant for anon/authenticated; INSERT happens only inside the mutation RPCs. Defense-in-depth: `REVOKE UPDATE, DELETE ON partner_audit_log FROM service_role` (service_role bypasses RLS, so the grant layer is what constrains it). True immutability against the table owner is not claimed -- the enforced guarantee is: no client role can modify it, and the service key cannot modify it through normal grants.
- No anon policies on any new table. No INSERT/UPDATE/DELETE policies for authenticated -- all writes via service-role RPCs/routes.
- **Authenticated seat-grant read path (closes an RLS gap):** `partner_seat_blocks` is NOT member-readable, so an authenticated-client join from grants to blocks would silently lose the block's window/active fields and the TS check would deny access that SQL RLS grants. Fix: SECURITY DEFINER read RPC `public.get_my_active_seat_grants()` -- derives `auth.uid()` (rejects null), `GRANT EXECUTE TO authenticated`. **"Active" is filtered inside the RPC, precisely:** grant unrevoked AND block active AND `access_starts_at <= now() < access_ends_at` -- so no `block_is_active` field in the result (it would always be true). Returns ONLY the fields access/billing need: `partner_id, partner_slug, partner_name_en, partner_name_jp, granted_tier, access_starts_at, access_ends_at` (JP name so the `/ja` billing page can localize the sponsor label). `lib/vault/access.ts` and the billing page consume this RPC. End-to-end test with a real authenticated NON-admin client, not just pure-function parity.
- The unit plan's execution adds a **privilege matrix** to the migration comments: per table and function, what anon / authenticated / service_role can SELECT/INSERT/UPDATE/DELETE/EXECUTE.

### 1d. RPCs (all: SECURITY DEFINER, service-role-only EXECUTE, `SET search_path = pg_catalog, public`, schema-qualified, single transaction, explicit `updated_at`)

```sql
-- entry-path + lifecycle (service-role-only EXECUTE):
public.redeem_partner_code(p_user_id uuid, p_code text) RETURNS jsonb
public.accept_partner_invite(p_user_id uuid, p_token_hash text) RETURNS jsonb
    -- NO email param: the RPC reads the canonical email from public.users by
    -- p_user_id; the route never accepts an email from the request body
public.remove_partner_member(p_partner_id uuid, p_user_id uuid, p_actor_id uuid,
                             p_source text, p_reason text) RETURNS jsonb
public.fulfill_partner_membership(p_user_id uuid, p_partner_id uuid,
                                  p_stripe_ref text) RETURNS jsonb
-- admin/portal compound mutations (service-role-only EXECUTE; each = data change
-- + audit row in one transaction, invariant 3):
public.create_partner_invite(...)   -- also locks + marks any time-expired pending
                                    -- invite for (partner,email) as 'expired' first,
                                    -- so stale pending rows never block a replacement
public.resend_partner_invite(...)   -- rotates token_hash atomically in the same UPDATE
public.revoke_partner_invite(...)
public.upsert_join_code(...) / public.set_join_code_active(...)
public.upsert_seat_block(...)       -- enforces edit rules (section 5) transactionally
public.update_partner_benefits(...)
public.log_partner_audit(...)       -- standalone audit insert for events whose trigger is
                                    -- an EXTERNAL call (e.g. benefit_coupon_failed after a
                                    -- Stripe rejection) and thus cannot share a transaction
-- authenticated read (the one exception to service-role-only):
public.get_my_active_seat_grants() RETURNS TABLE (...)  -- derives auth.uid(); section 1c
```

Grants: `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role;` (read RPC excepted: authenticated EXECUTE) -- authorization tests prove direct authenticated/anon invocation fails and user A cannot redeem/accept for user B (routes pass only the server-derived session user id).

**Lock ordering (deadlock-free, used by every RPC that touches these rows):** advisory user lock -> invite/code row FOR UPDATE -> seat-block row FOR UPDATE. **Race semantics (accept vs revoke/resend): exactly one valid serialized transition wins** -- lock ordering prevents deadlock, it does not give either side priority. If revoke commits first, acceptance observes `revoked` and fails with that outcome; if acceptance commits first, revoke observes `accepted` and returns a defined no-op/conflict result. No partial membership or invite state is possible. (Revocation-beats-started-acceptance is NOT a product requirement.)

`redeem_partner_code` / `accept_partner_invite` shared behavior:
1. **Advisory lock on the user id** (`pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0))` -- 64-bit key to avoid needless 32-bit collisions) before the membership check -- serializes two same-user redemptions for different partners; additionally catch the partial-index unique violation and translate it to `conflict` (never a raw constraint error).
2. `SELECT ... FOR UPDATE` the code (or invite) row; for seat-backed paths also lock the seat block row (ordering above).
3. **Look up and lock the existing `(code_id, user_id)` ledger row BEFORE any capacity check.** If it exists, this is a retry: follow the retry/upgrade path (step 6) and NEVER re-apply `max_uses` -- an exhausted code must not block the `joined_no_seat` -> `seat_granted` upgrade of a use that was already consumed.
4. Revalidate under lock: **`partners.is_active = true`** (deactivated partners admit no one); code/invite active + unexpired -- a time-expired pending invite is marked `expired` here (materialized at acceptance as well as at creation); **only when creating a NEW ledger row**: `max_uses IS NULL OR (SELECT count(*) FROM partner_code_redemptions WHERE code_id = ...) < max_uses` -> else outcome `exhausted`; seat capacity `seats_total > (SELECT count(*) FROM partner_seat_grants WHERE seat_block_id = ... AND revoked_at IS NULL)` -> else membership-only path; invite email must equal the canonical `lower(btrim(users.email))` for `p_user_id`.
5. Membership: active in a DIFFERENT partner -> `{outcome:'conflict'}` (no writes; invite stays `pending` -- NOT consumed). Active in the SAME partner with nothing to change -> `already_member` (true no-op: no ledger row, no use consumed; grant seat if entitled and not yet granted -- which IS a durable change and ledgers). Removed row for this partner -> reactivate (`status='active'`, new `joined_via`, `activated_at=now()`, `removed_at=NULL`). Else insert.
6. Seat grant: insert `partner_seat_grants` (idempotent via UNIQUE); a previously revoked grant on the same block is NOT re-granted in v1 -> RPC returns `seat_revoked_previously` (membership still activates).
7. Ledger (rule: **one row whenever the code caused a durable membership or seat change**): new-membership/reactivation/seat outcomes insert `partner_code_redemptions` (UNIQUE(code_id, user_id)); the RPC result name is decoupled from the ledger outcome -- `seat_revoked_previously` that created/reactivated membership ledgers as `joined_no_seat`. Retries return a stable outcome from the existing ledger row -- with ONE deliberate exception: **if the row is `joined_no_seat`, the code is seat-backed, and capacity is now free, the same transaction grants the seat and transitions the row to `seat_granted` WITHOUT consuming another use** (`joined_no_seat` is not final; a sponsored learner who clicked before a seat opened is not locked out). Usage = count of ledger rows; there is no mutable counter, so the transition never changes usage.
8. Invite acceptance: mark `accepted`/`accepted_by/at` ONLY on outcomes that activate membership (`joined`, `joined_no_seat`, `already_member`, `seat_revoked_previously`).
9. Audit rows written in the same transaction.

RPC outcomes: `joined | joined_no_seat | already_member | conflict | invalid | expired | exhausted | seat_revoked_previously`. Ledger outcomes are only `joined | joined_no_seat | seat_granted`, written per the durable-change rule above; failure outcomes and true no-ops write no ledger row and consume no use.

`remove_partner_member`: sets `status='removed'`/`removed_at`, revokes unrevoked grants on that partner's blocks, audit rows -- one transaction, idempotent (already-removed -> no-op result), defined jsonb result. An independently paid subscription is untouched (UI + audit copy state this).

`fulfill_partner_membership`: **idempotency is DB-enforced** -- first step inserts into `partner_fulfillment_events` (`stripe_ref` = the **Checkout Session id**, the canonical reference; never event ids) with outcome `'processing'` and `ON CONFLICT DO NOTHING`. If the row already exists: **verify it belongs to the same `(user_id, partner_id)`** -- same-params replay returns the stored outcome with no further writes; a `stripe_ref` reused with DIFFERENT params raises an integrity error (never silently returns another checkout's outcome). Deleted-user rows (`user_id` NULL) still dedupe -- a replayed old webhook never fulfills anew. On the fresh path: create-or-reactivate membership honoring the conflict rule (existing other-partner membership -> keep it, audit `self_pay_attribution_conflict`, do NOT switch tenants), stamp `stripe_ref` as the audit `correlation_id` (non-unique -- one session may produce several audit actions), then update the event row to its final outcome before commit ('processing' never survives the transaction). Safe under webhook retry AND repairs the "enrollment exists, membership missing" case -- the caller must invoke it before/independently of any existing early-return in cohort fulfillment (see section 4).

### 1e. SQL entitlement helpers (CREATE OR REPLACE)

- `community_scope_for(uid)` -- add `AND pm.status = 'active'`.
- `has_community_access(uid)` -- membership clause becomes `status='active'`. **No seat clause** (membership includes Community; seats are vault-only).
- `has_vault_access(uid)` (from 041) -- ADD seat clause: unrevoked grant on an active block, `granted_tier='vault'`, `access_starts_at <= now() AND now() < access_ends_at` (inclusive start, exclusive end).

### 1f. Backfill

Vertice -> `partner_benefits`: `course_discount_pct = 40`, `stripe_coupon_id = NULL` (env var `STRIPE_VERTICE_COUPON_ID` stays the runtime fallback during expand; the coupon id moves into the column at the contract deploy -- keeps the migration secret-free). `ON CONFLICT (partner_id) DO NOTHING`.

## 2. TypeScript entitlement chokepoints

- `lib/access/checks.ts` -- add `SeatGrantRow { access_starts_at, access_ends_at, revoked_at, block_is_active }` (tier implicitly vault in v1); `hasVaultAccess` takes optional `seatGrants` (default `[]`). `hasCommunityAccess` gains an optional `hasActiveMembership` boolean input to close the **pre-existing TS/SQL divergence** (SQL 042 grants community access for membership; the TS function never did) -- parity tests cover it.
- `lib/vault/access.ts` -- `checkVaultAccess` fetches the user's grants via the `get_my_active_seat_grants()` RPC (NOT an authenticated-client table join -- `partner_seat_blocks` is not member-readable under RLS, so the join would silently drop the block's window/active fields and deny access that SQL grants) and adds source `'seat'` (priority: subscription -> cohort -> seat -> enrollment). `VaultAccessResult.source` union gains `'seat'`. The billing page consumes the same RPC for the sponsor label.
- `lib/community/scope.ts` -- active-status filter on the membership lookup (mirror of `community_scope_for`).
- `components/billing/VaultStatusCard.tsx` + `app/[locale]/learn/dashboard/billing/page.tsx` -- handle `vaultSource: 'seat'` ("Access sponsored by <Partner>", no Manage Subscription button). NOTE: both files carry uncommitted local edits -- read current state first, extend, don't revert.
- Access-gate inventory (consumers of the chokepoints -- verify behavior, most need no edits): vault pages (`app/[locale]/learn/vault/**` incl. workbench), `app/api/vault/downloads/[id]`, `app/api/dashboard/vault`, `app/api/workbench/**`, community pages + `app/api/community/**`, `app/api/stripe/subscribe` (upsell logic: vault-seat holders shouldn't be pushed to re-buy vault). Middleware does role-only checks -- untouched.

## 3. Entry-path routes

- `app/[locale]/join/[code]/page.tsx` -- server page: normalize code (trim+upper), look up via service-role (generic invalid message -- no partner-existence leak), partner-branded join card (logo/colors, with a contrast-safe fallback if partner colors fail WCAG AA), CTA -> existing magic-link auth flow -> after auth, POST `app/api/join/redeem` (authenticates session, calls `redeem_partner_code` with the server-derived user id) -> locale-preserving redirect (`/learn/dashboard` or `/ja/learn/dashboard`). Response headers on join/invite pages: `Cache-Control: no-store` + restrictive `Referrer-Policy`. Outcome messages for ALL RPC outcomes, EN + JA.
- `app/[locale]/join/invite/[token]/page.tsx` + `app/api/join/accept-invite` -- token hashed server-side (sha256 hex), never logged or sent to analytics. **GET renders only; acceptance requires the authenticated POST** -- email scanners/prefetchers must never consume an invite. Acceptance bound to the invite email; wrong-account login shows a clear switch-account message.
- Invite tokens: 256-bit random; resend rotates atomically (single UPDATE replaces `token_hash`; old token dead -- tested).
- Join codes: human-shareable bearer codes by design (threat model accepted); >= 8 chars, unambiguous charset, random with collision-retry, never sequential. Rate limiting per-IP AND per-code using the existing in-memory limiter pattern -- **documented accepted MVP limitation: per-instance/best-effort on serverless**; real backstops are generic errors, the auth requirement on redemption, and ledger uniqueness. Revisit a shared limiter only if abuse materializes.
- Auth round-trip uses the existing **`redirect`** param contract in `app/api/auth/callback/route.ts` (NOT `next`) to return to `/join/<code>` after magic-link.
- Conflict UX is generic: "already a member of another partner community -- manage in account settings"; never reveals WHICH partner.
- New i18n namespace `join` in `messages/en.json` + `messages/ja.json` (all outcomes, CTAs, errors).

## 4. Checkout / fulfillment (expand phase -- Vertice behavior preserved)

- **Membership creation happens ONLY in explicit partner contexts:** `app/api/stripe/partner-checkout` (guest checkout from a partner landing -- explicit partner intent in trusted Stripe metadata) and cohort purchases carrying a `partnerSlug`. Both call `fulfill_partner_membership`. **Generic course checkout with an `hv_partner` attribution cookie records attribution only** (`enrollments.partner_id` + rev-split snapshots) -- no membership row. A referral is not a tenant election.
- Fulfillment wiring (`lib/stripe/webhooks.ts` + `lib/partner-checkout/fulfill.ts`): call the RPC before/independently of the existing "session already fulfilled" early-return so webhook retries repair missing membership; keep writing `is_vertice_member` (back-compat) -- removal is the contract deploy.
- Benefits at checkout (`app/api/stripe/checkout/route.ts` + `checkout-embed`): active membership -> `partner_benefits` on an **active** partner -> apply `stripe_coupon_id` (env-var fallback for vertice-society until contract). `course_discount_pct` is never used for price math. **Stale-coupon behavior (decided):** if Stripe rejects session creation because the stored coupon is deleted/invalid/inapplicable, retry session creation once WITHOUT the coupon so checkout never blocks -- the member pays full price rather than being unable to buy. The signal: call a dedicated `log_partner_audit(...)` RPC to write `benefit_coupon_failed` (source `system`). This CANNOT be atomic with the Stripe call (external service); if the audit write itself fails, emit a structured error log (the existing logging path) as the fallback signal -- checkout still completes. Admin fixes the coupon from either signal.
- Admin removal route `app/api/admin/partners/[id]/members/[userId]` -> `remove_partner_member` RPC. (Portal roster UI is Unit 3.)

## 5. Admin UI (partner editor tabs)

`components/admin/partner-editor/` gains three sections following the existing section pattern; APIs under `app/api/admin/partners/[id]/{join-codes,seat-blocks,benefits}` (admin-gated, **Zod-validated**: UUIDs, tier/source enums, nonempty trimmed labels, window sanity + max duration, code charset/length, coupon id format, reason length; origin/same-site checks on cookie-authenticated mutations). **Every route delegates its write to the matching RPC from 1d** (`upsert_join_code`, `set_join_code_active`, `upsert_seat_block`, `update_partner_benefits`, invite RPCs) -- routes validate and authorize; RPCs mutate and audit atomically. Bulk-impact operations (block shorten/deactivate) write ONE summary audit row carrying the affected-grant count -- no per-user audit explosion -- and set `updated_at`.

- **Join codes** -- list/create/deactivate, optional seat-block link (same partner only -- also DB-enforced), usage from the ledger, copy-link button (`/join/<code>`).
- **Seat blocks** -- create/edit via RPC with edit rules: after the first grant, `granted_tier`/`access_starts_at`/`source` are immutable; `access_ends_at` may extend freely, shortening requires an explicit confirm + audit; `seats_total` cannot drop below active grants (enforced transactionally); deactivate = kill switch with confirm + audit; no delete once grants exist.
- **Benefits** -- discount % (display), Stripe coupon id (authoritative; existence + percent validated against Stripe at save time; UI warns when % and coupon diverge), included tier (shown as "reserved -- not yet active").

## 6. Out of scope for this unit

Branded member home (Unit 2), portal roster/seats UI (Unit 3), teacher pipeline (Unit 4), demo seeding + `partners_public_read` tightening (Unit 5), Vertice contract removal (separate later deploy), Stripe billing for blocks, partner-set pricing UI, `included_tier` behavior (inert), shared/distributed rate limiter.

## Verification

- [x] `pnpm verify` clean (`NODE_OPTIONS=--max-old-space-size=8192`)
- [x] `pnpm test:rls` clean (temp-rename 022/025 first, restore after)
- [x] Migration applied twice locally from the expected schema without error (rerunnability)
- [x] DB constraint tests: one-active-membership partial index; window CHECK; grant UNIQUE; pending-invite partial unique; code normalization + charset/length CHECKs; email normalization CHECK; composite same-partner FK rejects a cross-partner block (outside RPCs); `partner_fulfillment_events.stripe_ref` UNIQUE; ledger FK RESTRICT blocks code deletion with history
- [x] RPC authorization: direct invocation as anon and authenticated FAILS for every mutating RPC; user A cannot redeem/accept for user B; `get_my_active_seat_grants()` as authenticated returns only own grants + only the specified fields
- [x] **End-to-end seat entitlement with a real authenticated NON-admin client**: seat holder sees Vault (via the read RPC path), non-holder denied -- proves the RLS read path, not just pure-function parity
- [x] TS<->SQL parity test on the shared case matrix (active/removed membership x unexpired/expired/future-start block x revoked/unrevoked grant x sub/cohort stacking x membership-community rule)
- [x] Concurrent redemption: N parallel `redeem_partner_code` calls vs a smaller block -> grants never exceed seats; `max_uses` concurrency test independent of seat capacity; two-partner simultaneous redemption by one user -> one membership + defined `conflict` for the loser (no raw constraint error)
- [x] Retry/idempotency: same user redeems same code twice -> stable outcome, ledger single row; **`joined_no_seat` retry after a seat frees -> transitions to `seat_granted`, grant created, usage count unchanged**; **code AT max_uses + existing `joined_no_seat` row + newly free seat -> upgrade still succeeds without increasing usage** (ledger lookup precedes max_uses); RPC `seat_revoked_previously` that reactivates membership ledgers as `joined_no_seat`, true already-member no-op writes no row; webhook fulfillment replayed -> `partner_fulfillment_events` dedupes (single membership, zero repeated audit/activation writes); same `stripe_ref` with DIFFERENT user/partner -> integrity error; out-of-order webhook + "enrollment exists, membership missing" repair; no committed `'processing'` event row after any RPC completion
- [x] User deletion: deleting a redeemed user leaves the ledger row (`user_id` NULL) and code usage count unchanged; deleting a fulfilled user leaves the fulfillment event -- replaying their old webhook does NOT fulfill anew
- [x] Removal RPC atomicity: forced audit/revocation failure rolls the whole removal back; removal leaves an independent paid subscription untouched; admin compound-mutation RPCs (invite/code/block/benefits) roll back data+audit together on forced failure
- [x] Invite lifecycle: accept vs revoke/resend race -> **exactly one serialized transition wins** (revoke-first: acceptance observes `revoked` and fails; accept-first: revoke observes `accepted` and returns its defined no-op/conflict result; no partial state either way); old token dead after resend; GET never consumes; wrong-email acceptance rejected; conflict leaves invite `pending`; **time-expired pending invite does not block a replacement invite** (creation marks it expired first)
- [x] Audit append-only at the grant level: UPDATE/DELETE on `partner_audit_log` fails as anon, authenticated, AND service_role
- [ ] Stale-coupon fallback: deleted/invalid coupon -> checkout succeeds at full price + `benefit_coupon_failed` audit row  
      *Status: unit-covered (`isCouponRejection` against real Stripe error shapes, `logBenefitCouponFailure` incl. the no-partner and audit-write-failed fallbacks) + the retry-once-without-coupon path in both checkout routes. A live Stripe run with a deleted coupon is still pending.*
- [x] Inactive partner: redemption, acceptance, and checkout benefits all refuse
- [x] Seat-block edit rules: below-active-usage rejected; immutable fields enforced; shorten/deactivate audited
- [x] Seat-expired member: vault gate denies at/after `access_ends_at` (exclusive end)
- [x] RLS exposure: partner admin cannot read `token_hash` (view/API excludes it); audit log not writable/updatable by non-service roles
- [ ] Billing page shows sponsored-seat state; no "Manage Subscription" for seat-only users  
      *Status: component-covered (`__tests__/billing/vault-status-card.test.tsx` — sponsor named, no Manage button, no upsell). Browser smoke pending Ryan.*
- [ ] Vertice regression: existing member still gets the coupon at checkout; partner guest checkout still creates membership + `is_vertice_member`; legacy flag/membership disagreement reconciled by a checked query  
      *Status: `resolveCheckoutDiscount` unit-covered for all four paths (partner coupon / Vertice env fallback / legacy `is_vertice_member` flag / no discount), and the legacy flag write is untouched in `fulfill.ts`. Live checkout + the flag<->membership reconciliation query are prod steps, pending.*
- [ ] Generic course checkout with attribution cookie creates NO membership row (attribution only)  
      *Status: verified by construction — membership is only ever written by `fulfillPartnerMembership()`, which is called solely from the two explicit partner branches in `lib/partner-checkout/fulfill.ts`; the course branch in `lib/stripe/webhooks.ts` never reaches it. No automated test; confirm in the prod smoke.*
- [ ] Browser EN + `/ja` smoke of `/join/<code>`: happy path, invalid, exhausted, conflict; locale-preserving redirect; both themes; mobile 375px; keyboard/focus/contrast on the join card (partner-color contrast fallback)  
      *Status: PENDING RYAN — needs a real browser; cannot be run from the build session.*
- [ ] No console warnings (missing translations, hydration, 404s); no token in any log/analytics event  
      *Status: PENDING RYAN (browser). Analytics side is closed in code: Plausible now loads `script.exclusions.js` with `/join/*` excluded, so no code or token reaches it.*

## Rollout (expand/deploy/contract -- 062 precedent)

1. Preflight in prod: duplicate-active-membership query (must be empty before the partial index); Vertice flag<->membership parity query; existing `has_vault_access`/`has_community_access`/`community_scope_for` signatures + grants; confirm 064 is still the next free migration number; expected `partner_members` row count.
2. Apply `064` in the Supabase dashboard (`zvfwtndbxshrtpwcwynw`) **before** deploying code.
3. Post-migration verification: new tables exist with RLS enabled + expected policies/grants (catalog queries); `community_scope_for(<vertice user>)` unchanged; `has_vault_access` unchanged for a known subscriber; `partner_benefits` has the Vertice row; mutating RPCs have service-role-only EXECUTE while `get_my_active_seat_grants` allows authenticated; `partner_audit_log` UPDATE/DELETE revoked from service_role.
4. Deploy; prod smoke: Vertice member login (feed + coupon); create a test partner + join code, redeem with a throwaway account, verify vault seat entitlement, remove member, verify revocation + audit rows.
5. Contract deploy (separate, later): remove `is_vertice_member` writes + `STRIPE_VERTICE_COUPON_ID` fallback + deprecated `app/api/vertice/*` routes after backfill verification; move the coupon id into `partner_benefits.stripe_coupon_id`.
6. Rollback posture: additive migration -- code rollback alone is safe; forward-fix SQL preferred over down-migration.

## Suggested commit message

```
feat(partners): membership spine -- seat blocks, join codes, invites, generalized benefits

Migration 064: partner_members role/status/joined_via + one-active-partner
index; seat blocks (vault-only v1) / join codes + redemption ledger /
invites (hashed tokens) / benefits / append-only audit log; transactional
service-role-only RPCs (redeem, accept, remove, fulfill); seat-aware vault
entitlement (SQL + lib/access/checks). /join/[code] + /join/invite/[token]
entry routes. Vertice benefits generalized (expand phase -- contract deploy
removes legacy flags later).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```
