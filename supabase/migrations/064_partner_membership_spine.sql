-- ============================================================================
-- 064_partner_membership_spine.sql — Partner membership spine (Unit 1 of 5)
-- ============================================================================
-- Plan: docs/plans/2026-07-24-partner-membership-spine.md (rev 4)
-- Program: docs/plans/2026-07-24-partner-platform-roadmap.md
--
-- EXPAND PHASE ONLY. Everything here is additive and backward compatible:
-- no Vertice legacy behavior is removed (`users.is_vertice_member` writes and
-- the STRIPE_VERTICE_COUPON_ID env fallback both stay live). The contract
-- deploy that removes them ships separately, later.
--
-- APPLY ORDER — like 062, this file is applied in the Supabase dashboard SQL
-- editor on project zvfwtndbxshrtpwcwynw *BEFORE* the code deploy. Nothing in
-- the existing app reads these objects, so applying first is zero-risk and
-- removes the window where code 500s ahead of its schema.
--
-- What ships:
--   1a. partner_members grows role / status / joined_via / activated_at /
--       removed_at / updated_at + a partial unique index enforcing
--       ONE ACTIVE PARTNER PER USER.
--   1b. New tables: partner_seat_blocks, partner_join_codes,
--       partner_code_redemptions, partner_fulfillment_events,
--       partner_seat_grants, partner_invites, partner_benefits,
--       partner_audit_log.
--   1c. RLS + privileges (incl. the partner_invites_browse view that never
--       exposes token_hash, and the append-only audit log).
--   1d. Transactional SECURITY DEFINER RPCs — service-role EXECUTE only, with
--       the single authenticated exception get_my_active_seat_grants().
--   1e. Entitlement helpers gain active-status + seat awareness.
--   1f. Vertice partner_benefits backfill (secret-free — coupon id stays in env
--       until the contract deploy).
--
-- RERUNNABLE from expected states: IF NOT EXISTS / CREATE OR REPLACE /
-- DROP POLICY IF EXISTS everywhere, and every CHECK/FK is explicitly named and
-- added through a guarded DO block (ADD COLUMN IF NOT EXISTS does NOT converge
-- a pre-existing column onto a new CHECK, so name-then-guard is the only
-- deterministic form).
--
-- ---------------------------------------------------------------------------
-- PRIVILEGE MATRIX (what each role can do; service_role bypasses RLS)
-- ---------------------------------------------------------------------------
-- TABLE                        anon   authenticated                service_role
-- partner_seat_blocks          none   SELECT (HV admin | partner admin)   ALL
-- partner_join_codes           none   SELECT (HV admin | partner admin)   ALL
-- partner_code_redemptions     none   SELECT (HV admin | partner admin)   ALL
-- partner_seat_grants          none   SELECT (self | HV admin | partner
--                                     admin via block join)               ALL
-- partner_invites              none   HV admin ALL, but token_hash is
--                                     column-REVOKEd from anon+authenticated;
--                                     partner admins read the
--                                     partner_invites_browse view instead     ALL
-- partner_fulfillment_events   none   SELECT (HV admin)                   ALL
-- partner_benefits             none   SELECT (HV admin | partner admin)   ALL
-- partner_audit_log            none   SELECT ONLY (HV admin | partner
--                                     admin); UPDATE/DELETE revoked from
--                                     anon, authenticated AND service_role;
--                                     INSERT only inside the mutation RPCs
-- partner_members (existing)   none   SELECT self / partner admin; HV admin ALL
--
-- FUNCTION                                 anon  authenticated  service_role
-- redeem_partner_code                      —     —              EXECUTE
-- accept_partner_invite                    —     —              EXECUTE
-- remove_partner_member                    —     —              EXECUTE
-- fulfill_partner_membership               —     —              EXECUTE
-- create/resend/revoke_partner_invite      —     —              EXECUTE
-- upsert_join_code / set_join_code_active  —     —              EXECUTE
-- upsert_seat_block                        —     —              EXECUTE
-- update_partner_benefits                  —     —              EXECUTE
-- log_partner_audit                        —     —              EXECUTE
-- get_my_active_seat_grants                —     EXECUTE        EXECUTE
--
-- True immutability of partner_audit_log against the table OWNER is NOT
-- claimed. The enforced guarantee is narrower and precise: no client role can
-- modify it, and the service key cannot modify it through normal grants.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1a. partner_members upgrade
-- ============================================================================
-- Semantics:
--   joined_at    — first-ever join, NEVER rewritten (042 column)
--   activated_at — latest activation (set on join and on every reactivation)
--   removed_at   — set on removal, cleared on reactivation
-- Existing rows (the 042 Vertice backfill) default to active/member/backfill,
-- which is exactly right.

ALTER TABLE public.partner_members
  ADD COLUMN IF NOT EXISTS role         text        NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS status       text        NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS joined_via   text        NOT NULL DEFAULT 'backfill',
  ADD COLUMN IF NOT EXISTS activated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS removed_at   timestamptz NULL,
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pm_role_check' AND conrelid = 'public.partner_members'::regclass
  ) THEN
    ALTER TABLE public.partner_members
      ADD CONSTRAINT pm_role_check CHECK (role IN ('member', 'teacher'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pm_status_check' AND conrelid = 'public.partner_members'::regclass
  ) THEN
    ALTER TABLE public.partner_members
      ADD CONSTRAINT pm_status_check CHECK (status IN ('active', 'removed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pm_joined_via_check' AND conrelid = 'public.partner_members'::regclass
  ) THEN
    ALTER TABLE public.partner_members
      ADD CONSTRAINT pm_joined_via_check
      CHECK (joined_via IN ('self_pay', 'join_code', 'seat', 'invite', 'backfill'));
  END IF;
END $$;

-- INVARIANT 1 — one active partner per user.
CREATE UNIQUE INDEX IF NOT EXISTS partner_members_one_active_per_user
  ON public.partner_members (user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS partner_members_partner_status_idx
  ON public.partner_members (partner_id, status);

COMMENT ON COLUMN public.partner_members.role IS
  'member | teacher. NOT an authorization source for partner-admin rights — '
  'partner_admins + is_partner_for() stay the only one (invariant 4).';
COMMENT ON COLUMN public.partner_members.status IS
  'active | removed. Pending users live solely in partner_invites; a membership '
  'row is created on acceptance, never before (invariant 2).';
COMMENT ON COLUMN public.partner_members.joined_via IS
  'self_pay | join_code | seat | invite | backfill — how the LATEST activation happened.';

-- ============================================================================
-- 1b. New tables (partner_seat_blocks first — the others FK into it)
-- ============================================================================

-- ---- partner_seat_blocks ---------------------------------------------------
-- v1 is vault-only. The 'community' tier value is deliberately NOT allowed:
-- membership already includes Community (shipped 042 behavior), so a
-- community seat would be a no-op. Reserved for a future decoupling.
CREATE TABLE IF NOT EXISTS public.partner_seat_blocks (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id       uuid        NOT NULL,
  label            text        NOT NULL,
  seats_total      integer     NOT NULL,
  granted_tier     text        NOT NULL DEFAULT 'vault',
  access_starts_at timestamptz NOT NULL,
  access_ends_at   timestamptz NOT NULL,
  source           text        NOT NULL,
  notes            text,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT psb_partner_fk       FOREIGN KEY (partner_id) REFERENCES public.partners(id),
  CONSTRAINT psb_created_by_fk    FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT psb_seats_total_ck   CHECK (seats_total >= 0),
  CONSTRAINT psb_granted_tier_ck  CHECK (granted_tier IN ('vault')),
  CONSTRAINT psb_window_ck        CHECK (access_ends_at > access_starts_at),
  CONSTRAINT psb_source_ck        CHECK (source IN ('sponsored', 'purchased')),
  -- Composite-FK anchor: lets join codes / invites reference a block AND its
  -- partner together, so a cross-partner link is impossible at the DB level.
  CONSTRAINT psb_id_partner_uq    UNIQUE (id, partner_id)
);

COMMENT ON TABLE public.partner_seat_blocks IS
  'A block of sponsored/purchased seats a partner can hand out. v1 grants Vault '
  'only — membership already includes Community. Deleting is not supported once '
  'grants exist (FK RESTRICT); deactivate instead.';

-- ---- partner_join_codes ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_join_codes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    uuid        NOT NULL,
  code          text        NOT NULL,
  seat_block_id uuid        NULL,
  max_uses      integer     NULL,
  expires_at    timestamptz NULL,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pjc_partner_fk    FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE,
  CONSTRAINT pjc_created_by_fk FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT pjc_code_uq       UNIQUE (code),
  -- Normalization is DB-enforced so no route can insert a lowercase/padded code
  -- that the redeem lookup (which normalizes) would then never find.
  CONSTRAINT pjc_code_norm_ck  CHECK (code = upper(btrim(code))),
  -- Unambiguous charset (no 0/O/1/I), bounded length; matches the generator.
  CONSTRAINT pjc_code_shape_ck CHECK (code ~ '^[A-Z2-9]{8,24}$'),
  CONSTRAINT pjc_max_uses_ck   CHECK (max_uses IS NULL OR max_uses >= 0),
  -- Same-partner seat-block link, enforced by the database, not by app code.
  CONSTRAINT pjc_seat_block_fk FOREIGN KEY (seat_block_id, partner_id)
    REFERENCES public.partner_seat_blocks(id, partner_id)
);

COMMENT ON TABLE public.partner_join_codes IS
  'Human-shareable bearer join codes. Threat model accepted: possession = the '
  'right to join. Backstops are generic errors, the auth requirement on '
  'redemption, and ledger uniqueness — not code secrecy.';

-- ---- partner_code_redemptions (usage ledger — no mutable counter) ----------
CREATE TABLE IF NOT EXISTS public.partner_code_redemptions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id    uuid        NOT NULL,
  user_id    uuid        NULL,
  outcome    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- RESTRICT: usage history must survive. Codes deactivate, they never delete.
  CONSTRAINT pcr_code_fk    FOREIGN KEY (code_id) REFERENCES public.partner_join_codes(id),
  -- SET NULL, not CASCADE: deleting a user must NOT reopen a consumed code use.
  -- Orphaned rows keep counting toward usage. The UNIQUE below then only
  -- constrains live users (SQL UNIQUE treats NULLs as distinct — exactly what
  -- we want here).
  CONSTRAINT pcr_user_fk    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT pcr_outcome_ck CHECK (outcome IN ('joined', 'joined_no_seat', 'seat_granted')),
  CONSTRAINT pcr_code_user_uq UNIQUE (code_id, user_id)
);

COMMENT ON TABLE public.partner_code_redemptions IS
  'Usage ledger for join codes. LEDGER RULE: exactly one row whenever a code '
  'causes a DURABLE membership or seat change (created, reactivated, or seat '
  'granted). RPC failure outcomes (conflict/invalid/expired/exhausted) and true '
  'no-ops write NO row and consume NO use. Usage = count of rows; there is no '
  'mutable counter. joined_no_seat is NOT final — a retry once a seat frees '
  'transitions the row to seat_granted without consuming another use.';

-- ---- partner_fulfillment_events (DB-enforced webhook idempotency) ----------
CREATE TABLE IF NOT EXISTS public.partner_fulfillment_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_ref text        NOT NULL,
  partner_id uuid        NOT NULL,
  user_id    uuid        NULL,
  outcome    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pfe_stripe_ref_uq UNIQUE (stripe_ref),
  CONSTRAINT pfe_partner_fk FOREIGN KEY (partner_id) REFERENCES public.partners(id),
  -- SET NULL: deleting a user must not erase the idempotency record. A replayed
  -- old webhook for a deleted user must still dedupe, never fulfill anew.
  CONSTRAINT pfe_user_fk    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT pfe_outcome_ck CHECK (outcome IN ('processing', 'fulfilled', 'conflict', 'repaired'))
);

COMMENT ON COLUMN public.partner_fulfillment_events.stripe_ref IS
  'CANONICAL reference = the Checkout Session id (cs_...). NEVER an event id — '
  'two webhook events for one checkout must dedupe to one row.';
COMMENT ON COLUMN public.partner_fulfillment_events.outcome IS
  'processing exists only INSIDE the RPC transaction (inserted first to take the '
  'dedupe lock, updated to the final outcome before commit). A committed '
  'processing row is impossible and would indicate a bug. '
  'fulfilled = this call created or reactivated the membership; '
  'repaired = membership was already active for this partner (idempotent no-op); '
  'conflict = user is active in a DIFFERENT partner, membership untouched.';

-- ---- partner_seat_grants ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_seat_grants (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_block_id uuid        NOT NULL,
  user_id       uuid        NOT NULL,
  redeemed_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT psg_block_fk FOREIGN KEY (seat_block_id) REFERENCES public.partner_seat_blocks(id),
  CONSTRAINT psg_user_fk  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT psg_block_user_uq UNIQUE (seat_block_id, user_id)
);

-- ---- partner_invites -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_invites (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    uuid        NOT NULL,
  email         text        NOT NULL,
  invited_by    uuid        NOT NULL,
  token_hash    text        NOT NULL,
  seat_block_id uuid        NULL,
  status        text        NOT NULL DEFAULT 'pending',
  expires_at    timestamptz NOT NULL,
  accepted_by   uuid        NULL,
  accepted_at   timestamptz NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pi_partner_fk     FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE,
  CONSTRAINT pi_invited_by_fk  FOREIGN KEY (invited_by) REFERENCES public.users(id),
  CONSTRAINT pi_accepted_by_fk FOREIGN KEY (accepted_by) REFERENCES public.users(id),
  -- lower/trim is sufficient for Supabase auth email semantics; we deliberately
  -- do NOT canonicalize plus-addressing.
  CONSTRAINT pi_email_norm_ck  CHECK (email = lower(btrim(email))),
  CONSTRAINT pi_token_hash_uq  UNIQUE (token_hash),
  CONSTRAINT pi_status_ck      CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  CONSTRAINT pi_seat_block_fk  FOREIGN KEY (seat_block_id, partner_id)
    REFERENCES public.partner_seat_blocks(id, partner_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS partner_invites_one_pending_per_email
  ON public.partner_invites (partner_id, email) WHERE status = 'pending';

COMMENT ON COLUMN public.partner_invites.token_hash IS
  'sha256 hex of the raw 256-bit invite token. The raw token exists only in the '
  'invite URL and is never stored, logged, or sent to analytics.';

-- ---- partner_benefits ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_benefits (
  partner_id          uuid          PRIMARY KEY,
  course_discount_pct numeric(5, 2) NOT NULL DEFAULT 0,
  stripe_coupon_id    text          NULL,
  included_tier       text          NULL,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT pb_partner_fk   FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE,
  CONSTRAINT pb_discount_ck  CHECK (course_discount_pct BETWEEN 0 AND 100),
  CONSTRAINT pb_incl_tier_ck CHECK (included_tier IS NULL OR included_tier IN ('community', 'vault'))
);

COMMENT ON COLUMN public.partner_benefits.course_discount_pct IS
  'DISPLAY metadata only. Never used for price math — stripe_coupon_id is the '
  'authoritative discount at checkout.';
COMMENT ON COLUMN public.partner_benefits.included_tier IS
  'INERT in Unit 1. Reserved for the flat-license model; entitlement helpers do '
  'not read it.';

-- ---- partner_audit_log (append-only; survives deletes) ---------------------
CREATE TABLE IF NOT EXISTS public.partner_audit_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id     uuid        NOT NULL,
  partner_slug   text        NOT NULL,
  source         text        NOT NULL,
  actor_id       uuid        NULL,
  action         text        NOT NULL,
  target_type    text        NULL,
  target_id      uuid        NULL,
  target_email   text        NULL,
  old_value      jsonb       NULL,
  new_value      jsonb       NULL,
  correlation_id text        NULL,
  reason         text        NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  -- RESTRICT: partners soft-delete, so an audit row can always resolve its partner.
  CONSTRAINT pal_partner_fk FOREIGN KEY (partner_id) REFERENCES public.partners(id),
  CONSTRAINT pal_source_ck  CHECK (source IN ('admin', 'partner_portal', 'webhook', 'system'))
);

COMMENT ON COLUMN public.partner_audit_log.actor_id IS
  'Deliberately has NO foreign key — an audit row must survive deletion of the '
  'user who caused it.';
COMMENT ON COLUMN public.partner_audit_log.partner_slug IS
  'Snapshot at write time so the row stands alone even if the partner is renamed.';
COMMENT ON COLUMN public.partner_audit_log.action IS
  'Free text (no CHECK) so new actions never need a migration. Vocabulary in use: '
  'member_joined, member_reactivated, member_removed, invite_accepted, '
  'seat_granted, seat_revoked, invite_created, invite_resent, invite_revoked, '
  'code_created, code_updated, code_deactivated, code_reactivated, '
  'block_created, block_edited, block_shortened, block_deactivated, '
  'benefits_updated, benefit_coupon_failed, self_pay_attribution_conflict.';
COMMENT ON COLUMN public.partner_audit_log.correlation_id IS
  'Stripe event/session id or request id. NON-unique — one checkout session can '
  'produce several audit actions.';

-- ---- indexes ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS partner_seat_grants_user_active_idx
  ON public.partner_seat_grants (user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS partner_seat_grants_block_active_idx
  ON public.partner_seat_grants (seat_block_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS partner_code_redemptions_code_idx
  ON public.partner_code_redemptions (code_id);
CREATE INDEX IF NOT EXISTS partner_invites_partner_status_idx
  ON public.partner_invites (partner_id, status);
CREATE INDEX IF NOT EXISTS partner_join_codes_partner_idx
  ON public.partner_join_codes (partner_id);
CREATE INDEX IF NOT EXISTS partner_seat_blocks_partner_idx
  ON public.partner_seat_blocks (partner_id);
CREATE INDEX IF NOT EXISTS partner_audit_log_partner_recent_idx
  ON public.partner_audit_log (partner_id, created_at DESC);

-- ============================================================================
-- 1c. RLS + privileges
-- ============================================================================
-- No anon policies on any new table. No INSERT/UPDATE/DELETE policies for
-- authenticated — every write goes through a service-role RPC/route.
-- `updated_at` has no triggers anywhere: each mutation sets it explicitly.

ALTER TABLE public.partner_seat_blocks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_join_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_code_redemptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_fulfillment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_seat_grants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invites            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_benefits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_audit_log          ENABLE ROW LEVEL SECURITY;

-- ---- partner_seat_blocks ---------------------------------------------------
DROP POLICY IF EXISTS "psb_admin_all"    ON public.partner_seat_blocks;
DROP POLICY IF EXISTS "psb_partner_read" ON public.partner_seat_blocks;
CREATE POLICY "psb_admin_all" ON public.partner_seat_blocks
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "psb_partner_read" ON public.partner_seat_blocks
  FOR SELECT USING (public.is_partner_for(partner_id));

-- ---- partner_join_codes ----------------------------------------------------
DROP POLICY IF EXISTS "pjc_admin_all"    ON public.partner_join_codes;
DROP POLICY IF EXISTS "pjc_partner_read" ON public.partner_join_codes;
CREATE POLICY "pjc_admin_all" ON public.partner_join_codes
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "pjc_partner_read" ON public.partner_join_codes
  FOR SELECT USING (public.is_partner_for(partner_id));

-- ---- partner_code_redemptions ---------------------------------------------
DROP POLICY IF EXISTS "pcr_admin_all"    ON public.partner_code_redemptions;
DROP POLICY IF EXISTS "pcr_partner_read" ON public.partner_code_redemptions;
CREATE POLICY "pcr_admin_all" ON public.partner_code_redemptions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "pcr_partner_read" ON public.partner_code_redemptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.partner_join_codes c
      WHERE c.id = partner_code_redemptions.code_id
        AND public.is_partner_for(c.partner_id)
    )
  );

-- ---- partner_seat_grants ---------------------------------------------------
DROP POLICY IF EXISTS "psg_admin_all"    ON public.partner_seat_grants;
DROP POLICY IF EXISTS "psg_self_read"    ON public.partner_seat_grants;
DROP POLICY IF EXISTS "psg_partner_read" ON public.partner_seat_grants;
CREATE POLICY "psg_admin_all" ON public.partner_seat_grants
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "psg_self_read" ON public.partner_seat_grants
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "psg_partner_read" ON public.partner_seat_grants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.partner_seat_blocks b
      WHERE b.id = partner_seat_grants.seat_block_id
        AND public.is_partner_for(b.partner_id)
    )
  );

-- ---- partner_invites -------------------------------------------------------
-- Deliberately NO partner-admin policy: portal invite reads go through the
-- token-free partner_invites_browse view below (the vault_downloads_browse
-- precedent). Belt and braces on top of that, token_hash is column-REVOKEd
-- from anon + authenticated, so not even a HonuVibe admin JWT can read it —
-- the raw/hashed token is service-role territory only.
DROP POLICY IF EXISTS "pi_admin_all" ON public.partner_invites;
CREATE POLICY "pi_admin_all" ON public.partner_invites
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

REVOKE SELECT ON public.partner_invites FROM anon, authenticated;
GRANT SELECT (
  id, partner_id, email, invited_by, seat_block_id, status,
  expires_at, accepted_by, accepted_at, created_at, updated_at
) ON public.partner_invites TO authenticated;

CREATE OR REPLACE VIEW public.partner_invites_browse
WITH (security_barrier = true) AS
SELECT
  i.id,
  i.partner_id,
  i.email,
  i.invited_by,
  i.seat_block_id,
  i.status,
  i.expires_at,
  i.accepted_by,
  i.accepted_at,
  i.created_at,
  i.updated_at
FROM public.partner_invites i
WHERE public.is_admin() OR public.is_partner_for(i.partner_id);

COMMENT ON VIEW public.partner_invites_browse IS
  'Token-free invite listing for HonuVibe admins and partner admins. Runs with '
  'the view owner''s rights (security_barrier, NOT security_invoker) and does '
  'its own authorization, because partner_invites itself has no partner-admin '
  'RLS policy. token_hash is not selectable here or anywhere else outside the '
  'service role.';

GRANT SELECT ON public.partner_invites_browse TO authenticated;

-- ---- partner_fulfillment_events -------------------------------------------
DROP POLICY IF EXISTS "pfe_admin_read" ON public.partner_fulfillment_events;
CREATE POLICY "pfe_admin_read" ON public.partner_fulfillment_events
  FOR SELECT USING (public.is_admin());

-- ---- partner_benefits ------------------------------------------------------
DROP POLICY IF EXISTS "pb_admin_all"    ON public.partner_benefits;
DROP POLICY IF EXISTS "pb_partner_read" ON public.partner_benefits;
CREATE POLICY "pb_admin_all" ON public.partner_benefits
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "pb_partner_read" ON public.partner_benefits
  FOR SELECT USING (public.is_partner_for(partner_id));

-- ---- partner_audit_log (append-only, precisely) ---------------------------
-- SELECT-only policies for both admin flavours (note: FOR SELECT, not FOR ALL).
-- No UPDATE/DELETE policy or grant for any client role, and the grant layer is
-- what constrains service_role since it bypasses RLS entirely.
DROP POLICY IF EXISTS "pal_admin_read"   ON public.partner_audit_log;
DROP POLICY IF EXISTS "pal_partner_read" ON public.partner_audit_log;
CREATE POLICY "pal_admin_read" ON public.partner_audit_log
  FOR SELECT USING (public.is_admin());
CREATE POLICY "pal_partner_read" ON public.partner_audit_log
  FOR SELECT USING (public.is_partner_for(partner_id));

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.partner_audit_log FROM anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.partner_audit_log FROM service_role;

-- ============================================================================
-- 1d. RPCs
-- ============================================================================
-- Every mutating RPC: SECURITY DEFINER, single transaction, schema-qualified,
-- SET search_path = pg_catalog, public, explicit updated_at, and
-- service-role-only EXECUTE. Routes authenticate the session user in code and
-- pass the SERVER-derived user id — never a client-supplied one.
--
-- LOCK ORDERING (deadlock-free; used by every RPC that touches these rows):
--   advisory user lock -> invite/code row FOR UPDATE -> seat-block row FOR UPDATE
--
-- RACE SEMANTICS (accept vs revoke/resend): exactly one valid serialized
-- transition wins. Lock ordering prevents deadlock; it does not give either
-- side priority. Revocation-beating-a-started-acceptance is NOT a requirement.

-- ---------------------------------------------------------------------------
-- log_partner_audit — standalone audit insert.
-- Used inside the compound RPCs below AND directly by callers whose trigger is
-- an EXTERNAL call that cannot share a transaction (e.g. benefit_coupon_failed
-- after Stripe rejects a coupon).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_partner_audit(
  p_partner_id     uuid,
  p_audit_source   text,
  p_action         text,
  p_actor_id       uuid    DEFAULT NULL,
  p_target_type    text    DEFAULT NULL,
  p_target_id      uuid    DEFAULT NULL,
  p_target_email   text    DEFAULT NULL,
  p_old_value      jsonb   DEFAULT NULL,
  p_new_value      jsonb   DEFAULT NULL,
  p_correlation_id text    DEFAULT NULL,
  p_reason         text    DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_slug text;
  v_id   uuid;
BEGIN
  SELECT p.slug INTO v_slug FROM public.partners p WHERE p.id = p_partner_id;
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'log_partner_audit: unknown partner %', p_partner_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  INSERT INTO public.partner_audit_log (
    partner_id, partner_slug, source, actor_id, action,
    target_type, target_id, target_email, old_value, new_value,
    correlation_id, reason
  ) VALUES (
    p_partner_id, v_slug, p_audit_source, p_actor_id, p_action,
    p_target_type, p_target_id, p_target_email, p_old_value, p_new_value,
    p_correlation_id, p_reason
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- redeem_partner_code
-- ---------------------------------------------------------------------------
-- Outcomes: joined | joined_no_seat | already_member | conflict | invalid |
--           expired | exhausted | seat_revoked_previously
-- The RPC outcome name and the LEDGER outcome are deliberately decoupled: e.g.
-- a seat_revoked_previously result that reactivated membership ledgers as
-- joined_no_seat.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_partner_code(
  p_user_id uuid,
  p_code    text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_norm             text;
  v_code             public.partner_join_codes%ROWTYPE;
  v_partner          public.partners%ROWTYPE;
  v_block            public.partner_seat_blocks%ROWTYPE;
  v_ledger           public.partner_code_redemptions%ROWTYPE;
  v_member           public.partner_members%ROWTYPE;
  v_grant            public.partner_seat_grants%ROWTYPE;
  v_other_partner    uuid;
  v_uses             integer;
  v_active_grants    integer;
  v_seat_state       text := 'none';   -- none|granted_now|already_granted|revoked_previously|no_capacity
  v_member_changed   boolean := false;
  v_seat_backed      boolean := false;
  v_has_seat_now     boolean := false;
  v_outcome          text;
  v_ledger_outcome   text;
  v_action           text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('outcome', 'invalid');
  END IF;

  v_norm := upper(btrim(coalesce(p_code, '')));
  IF v_norm !~ '^[A-Z2-9]{8,24}$' THEN
    RETURN jsonb_build_object('outcome', 'invalid');
  END IF;

  -- STEP 1 — advisory lock on the user. Serializes two same-user redemptions
  -- for different partners before the membership check. 64-bit key.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  -- STEP 2 — lock the code row, then (seat-backed paths) the block row.
  SELECT * INTO v_code FROM public.partner_join_codes
    WHERE code = v_norm FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'invalid');
  END IF;

  v_seat_backed := v_code.seat_block_id IS NOT NULL;
  IF v_seat_backed THEN
    SELECT * INTO v_block FROM public.partner_seat_blocks
      WHERE id = v_code.seat_block_id FOR UPDATE;
  END IF;

  -- STEP 3 — ledger lookup BEFORE any capacity/max_uses check. If the row
  -- exists this is a retry: never re-apply max_uses, or an exhausted code
  -- would block the joined_no_seat -> seat_granted upgrade of a use that was
  -- already consumed.
  SELECT * INTO v_ledger FROM public.partner_code_redemptions
    WHERE code_id = v_code.id AND user_id = p_user_id FOR UPDATE;

  -- STEP 4 — revalidate under lock.
  SELECT * INTO v_partner FROM public.partners WHERE id = v_code.partner_id;
  IF NOT FOUND OR coalesce(v_partner.is_active, false) = false THEN
    RETURN jsonb_build_object('outcome', 'invalid');  -- deactivated partners admit no one
  END IF;

  IF v_code.is_active = false THEN
    RETURN jsonb_build_object('outcome', 'invalid');
  END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at <= now() THEN
    RETURN jsonb_build_object('outcome', 'expired');
  END IF;

  -- max_uses applies ONLY when a new ledger row would be created.
  IF v_ledger.id IS NULL AND v_code.max_uses IS NOT NULL THEN
    SELECT count(*) INTO v_uses FROM public.partner_code_redemptions
      WHERE code_id = v_code.id;
    IF v_uses >= v_code.max_uses THEN
      RETURN jsonb_build_object('outcome', 'exhausted');
    END IF;
  END IF;

  -- STEP 5 — membership.
  SELECT * INTO v_member FROM public.partner_members
    WHERE user_id = p_user_id AND partner_id = v_code.partner_id FOR UPDATE;

  SELECT pm.partner_id INTO v_other_partner FROM public.partner_members pm
    WHERE pm.user_id = p_user_id AND pm.status = 'active'
      AND pm.partner_id <> v_code.partner_id
    LIMIT 1;
  IF v_other_partner IS NOT NULL THEN
    RETURN jsonb_build_object('outcome', 'conflict');
  END IF;

  BEGIN
    IF v_member.user_id IS NULL THEN
      INSERT INTO public.partner_members (
        partner_id, user_id, joined_at, role, status, joined_via,
        activated_at, removed_at, updated_at
      ) VALUES (
        v_code.partner_id, p_user_id, now(), 'member', 'active', 'join_code',
        now(), NULL, now()
      );
      v_member_changed := true;
      v_action := 'member_joined';
    ELSIF v_member.status = 'removed' THEN
      UPDATE public.partner_members
         SET status = 'active', joined_via = 'join_code',
             activated_at = now(), removed_at = NULL, updated_at = now()
       WHERE partner_id = v_code.partner_id AND user_id = p_user_id;
      v_member_changed := true;
      v_action := 'member_reactivated';
    END IF;
  EXCEPTION WHEN unique_violation THEN
    -- Partial-index race against the one-active-partner invariant. Never leak
    -- a raw constraint error.
    RETURN jsonb_build_object('outcome', 'conflict');
  END;

  -- STEP 6 — seat grant. The window predicate here is deliberately IDENTICAL to
  -- the one in has_vault_access() and get_my_active_seat_grants(): inclusive
  -- start, exclusive end, block active. If grant-time were looser than
  -- entitlement-time we would hand out a seat and then deny the Vault it is
  -- supposed to buy.
  IF v_seat_backed THEN
    SELECT * INTO v_grant FROM public.partner_seat_grants
      WHERE seat_block_id = v_block.id AND user_id = p_user_id;

    IF FOUND AND v_grant.revoked_at IS NULL THEN
      v_seat_state := 'already_granted';
      v_has_seat_now := true;
    ELSIF FOUND THEN
      -- A previously revoked grant is NOT re-granted in v1.
      v_seat_state := 'revoked_previously';
    ELSIF v_block.is_active
      AND v_block.granted_tier = 'vault'
      AND v_block.access_starts_at <= now()
      AND now() < v_block.access_ends_at
    THEN
      SELECT count(*) INTO v_active_grants FROM public.partner_seat_grants
        WHERE seat_block_id = v_block.id AND revoked_at IS NULL;
      IF v_active_grants < v_block.seats_total THEN
        INSERT INTO public.partner_seat_grants (seat_block_id, user_id)
        VALUES (v_block.id, p_user_id)
        ON CONFLICT ON CONSTRAINT psg_block_user_uq DO NOTHING;
        v_seat_state := 'granted_now';
        v_has_seat_now := true;
      ELSE
        v_seat_state := 'no_capacity';
      END IF;
    ELSE
      v_seat_state := 'no_capacity';
    END IF;
  END IF;

  -- STEP 7 — outcome + ledger (durable-change rule).
  IF v_seat_state = 'revoked_previously' THEN
    v_outcome := 'seat_revoked_previously';
  ELSIF v_member_changed THEN
    v_outcome := CASE WHEN v_seat_backed AND NOT v_has_seat_now
                      THEN 'joined_no_seat' ELSE 'joined' END;
  ELSE
    v_outcome := 'already_member';
  END IF;

  IF v_member_changed OR v_seat_state = 'granted_now' THEN
    v_ledger_outcome := CASE
      WHEN NOT v_seat_backed        THEN 'joined'
      WHEN v_has_seat_now           THEN 'seat_granted'
      ELSE                               'joined_no_seat'
    END;

    INSERT INTO public.partner_code_redemptions (code_id, user_id, outcome)
    VALUES (v_code.id, p_user_id, v_ledger_outcome)
    ON CONFLICT ON CONSTRAINT pcr_code_user_uq DO UPDATE
      SET outcome = EXCLUDED.outcome, updated_at = now();
  END IF;

  -- Audit — same transaction.
  IF v_member_changed THEN
    PERFORM public.log_partner_audit(
      v_code.partner_id, 'system', v_action, p_user_id,
      'user', p_user_id, NULL, NULL,
      jsonb_build_object('joined_via', 'join_code', 'code_id', v_code.id), NULL, NULL
    );
  END IF;
  IF v_seat_state = 'granted_now' THEN
    PERFORM public.log_partner_audit(
      v_code.partner_id, 'system', 'seat_granted', p_user_id,
      'seat_block', v_block.id, NULL, NULL,
      jsonb_build_object('code_id', v_code.id), NULL, NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'outcome',        v_outcome,
    'partner_id',     v_partner.id,
    'partner_slug',   v_partner.slug,
    'partner_name_en', v_partner.name_en,
    'partner_name_jp', v_partner.name_jp,
    'seat_backed',    v_seat_backed,
    'seat_granted',   v_seat_state = 'granted_now',
    'has_seat',       v_has_seat_now
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- accept_partner_invite
-- ---------------------------------------------------------------------------
-- No email parameter by design: the canonical email is read from public.users
-- by p_user_id. The route never accepts an email from the request body.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_partner_invite(
  p_user_id    uuid,
  p_token_hash text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_invite         public.partner_invites%ROWTYPE;
  v_partner        public.partners%ROWTYPE;
  v_block          public.partner_seat_blocks%ROWTYPE;
  v_member         public.partner_members%ROWTYPE;
  v_grant          public.partner_seat_grants%ROWTYPE;
  v_user_email     text;
  v_other_partner  uuid;
  v_active_grants  integer;
  v_seat_state     text := 'none';
  v_seat_backed    boolean := false;
  v_has_seat_now   boolean := false;
  v_member_changed boolean := false;
  v_outcome        text;
  v_action         text;
BEGIN
  IF p_user_id IS NULL OR coalesce(btrim(p_token_hash), '') = '' THEN
    RETURN jsonb_build_object('outcome', 'invalid');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  SELECT * INTO v_invite FROM public.partner_invites
    WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'invalid', 'reason', 'not_found');
  END IF;

  v_seat_backed := v_invite.seat_block_id IS NOT NULL;
  IF v_seat_backed THEN
    SELECT * INTO v_block FROM public.partner_seat_blocks
      WHERE id = v_invite.seat_block_id FOR UPDATE;
  END IF;

  IF v_invite.status = 'revoked' THEN
    RETURN jsonb_build_object('outcome', 'invalid', 'reason', 'revoked');
  END IF;
  IF v_invite.status = 'expired' THEN
    RETURN jsonb_build_object('outcome', 'expired');
  END IF;
  -- An accepted invite is SPENT. It is never a live credential again — not even
  -- for the person who accepted it. Otherwise an invite link sitting in an
  -- inbox would let a removed member reactivate their own membership by
  -- replaying it, and remove_partner_member would be undoable by its target.
  -- Double-clicks stay idempotent: an acceptor who is still an active member
  -- gets the same already_member answer, but nothing is ever re-activated here.
  IF v_invite.status = 'accepted' THEN
    IF v_invite.accepted_by IS NOT DISTINCT FROM p_user_id
       AND EXISTS (
         SELECT 1 FROM public.partner_members pm
         WHERE pm.user_id = p_user_id
           AND pm.partner_id = v_invite.partner_id
           AND pm.status = 'active'
       )
    THEN
      SELECT * INTO v_partner FROM public.partners WHERE id = v_invite.partner_id;
      RETURN jsonb_build_object(
        'outcome',         'already_member',
        'partner_id',      v_partner.id,
        'partner_slug',    v_partner.slug,
        'partner_name_en', v_partner.name_en,
        'partner_name_jp', v_partner.name_jp
      );
    END IF;
    RETURN jsonb_build_object('outcome', 'invalid', 'reason', 'already_accepted');
  END IF;

  -- A time-expired pending invite is materialized as expired here, exactly as
  -- it is at creation time.
  IF v_invite.status = 'pending' AND v_invite.expires_at <= now() THEN
    UPDATE public.partner_invites
       SET status = 'expired', updated_at = now()
     WHERE id = v_invite.id;
    RETURN jsonb_build_object('outcome', 'expired');
  END IF;

  SELECT * INTO v_partner FROM public.partners WHERE id = v_invite.partner_id;
  IF NOT FOUND OR coalesce(v_partner.is_active, false) = false THEN
    RETURN jsonb_build_object('outcome', 'invalid', 'reason', 'partner_inactive');
  END IF;

  SELECT lower(btrim(u.email)) INTO v_user_email
    FROM public.users u WHERE u.id = p_user_id;
  IF v_user_email IS NULL OR v_user_email <> v_invite.email THEN
    RETURN jsonb_build_object('outcome', 'invalid', 'reason', 'email_mismatch');
  END IF;

  SELECT * INTO v_member FROM public.partner_members
    WHERE user_id = p_user_id AND partner_id = v_invite.partner_id FOR UPDATE;

  SELECT pm.partner_id INTO v_other_partner FROM public.partner_members pm
    WHERE pm.user_id = p_user_id AND pm.status = 'active'
      AND pm.partner_id <> v_invite.partner_id
    LIMIT 1;
  IF v_other_partner IS NOT NULL THEN
    -- Conflict consumes nothing: the invite stays pending.
    RETURN jsonb_build_object('outcome', 'conflict');
  END IF;

  BEGIN
    IF v_member.user_id IS NULL THEN
      INSERT INTO public.partner_members (
        partner_id, user_id, joined_at, role, status, joined_via,
        activated_at, removed_at, updated_at
      ) VALUES (
        v_invite.partner_id, p_user_id, now(), 'member', 'active', 'invite',
        now(), NULL, now()
      );
      v_member_changed := true;
      v_action := 'member_joined';
    ELSIF v_member.status = 'removed' THEN
      UPDATE public.partner_members
         SET status = 'active', joined_via = 'invite',
             activated_at = now(), removed_at = NULL, updated_at = now()
       WHERE partner_id = v_invite.partner_id AND user_id = p_user_id;
      v_member_changed := true;
      v_action := 'member_reactivated';
    END IF;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('outcome', 'conflict');
  END;

  IF v_seat_backed THEN
    SELECT * INTO v_grant FROM public.partner_seat_grants
      WHERE seat_block_id = v_block.id AND user_id = p_user_id;

    IF FOUND AND v_grant.revoked_at IS NULL THEN
      v_seat_state := 'already_granted';
      v_has_seat_now := true;
    ELSIF FOUND THEN
      v_seat_state := 'revoked_previously';
    ELSIF v_block.is_active
      AND v_block.granted_tier = 'vault'
      AND v_block.access_starts_at <= now()
      AND now() < v_block.access_ends_at
    THEN
      SELECT count(*) INTO v_active_grants FROM public.partner_seat_grants
        WHERE seat_block_id = v_block.id AND revoked_at IS NULL;
      IF v_active_grants < v_block.seats_total THEN
        INSERT INTO public.partner_seat_grants (seat_block_id, user_id)
        VALUES (v_block.id, p_user_id)
        ON CONFLICT ON CONSTRAINT psg_block_user_uq DO NOTHING;
        v_seat_state := 'granted_now';
        v_has_seat_now := true;
      ELSE
        v_seat_state := 'no_capacity';
      END IF;
    ELSE
      v_seat_state := 'no_capacity';
    END IF;
  END IF;

  IF v_seat_state = 'revoked_previously' THEN
    v_outcome := 'seat_revoked_previously';
  ELSIF v_member_changed THEN
    v_outcome := CASE WHEN v_seat_backed AND NOT v_has_seat_now
                      THEN 'joined_no_seat' ELSE 'joined' END;
  ELSE
    v_outcome := 'already_member';
  END IF;

  -- Mark accepted ONLY on outcomes that activate membership.
  IF v_invite.status = 'pending' THEN
    UPDATE public.partner_invites
       SET status = 'accepted', accepted_by = p_user_id,
           accepted_at = now(), updated_at = now()
     WHERE id = v_invite.id;
  END IF;

  IF v_member_changed THEN
    PERFORM public.log_partner_audit(
      v_invite.partner_id, 'system', v_action, p_user_id,
      'user', p_user_id, v_invite.email, NULL,
      jsonb_build_object('joined_via', 'invite', 'invite_id', v_invite.id), NULL, NULL
    );
  END IF;
  PERFORM public.log_partner_audit(
    v_invite.partner_id, 'system', 'invite_accepted', p_user_id,
    'invite', v_invite.id, v_invite.email, NULL,
    jsonb_build_object('outcome', v_outcome), NULL, NULL
  );
  IF v_seat_state = 'granted_now' THEN
    PERFORM public.log_partner_audit(
      v_invite.partner_id, 'system', 'seat_granted', p_user_id,
      'seat_block', v_block.id, v_invite.email, NULL,
      jsonb_build_object('invite_id', v_invite.id), NULL, NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'outcome',        v_outcome,
    'partner_id',     v_partner.id,
    'partner_slug',   v_partner.slug,
    'partner_name_en', v_partner.name_en,
    'partner_name_jp', v_partner.name_jp,
    'seat_backed',    v_seat_backed,
    'seat_granted',   v_seat_state = 'granted_now',
    'has_seat',       v_has_seat_now
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- remove_partner_member
-- ---------------------------------------------------------------------------
-- One transaction: status -> removed, revoke every unrevoked grant on THAT
-- partner's blocks, audit. Idempotent. An independently paid subscription is
-- never touched.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_partner_member(
  p_partner_id uuid,
  p_user_id    uuid,
  p_actor_id   uuid,
  p_source     text,
  p_reason     text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_member         public.partner_members%ROWTYPE;
  v_revoked        integer := 0;
  v_target_email   text;
BEGIN
  IF p_partner_id IS NULL OR p_user_id IS NULL THEN
    RETURN jsonb_build_object('outcome', 'invalid');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  SELECT * INTO v_member FROM public.partner_members
    WHERE partner_id = p_partner_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;
  IF v_member.status = 'removed' THEN
    RETURN jsonb_build_object('outcome', 'already_removed', 'seats_revoked', 0);
  END IF;

  UPDATE public.partner_members
     SET status = 'removed', removed_at = now(), updated_at = now()
   WHERE partner_id = p_partner_id AND user_id = p_user_id;

  WITH revoked AS (
    UPDATE public.partner_seat_grants g
       SET revoked_at = now()
      FROM public.partner_seat_blocks b
     WHERE g.seat_block_id = b.id
       AND b.partner_id = p_partner_id
       AND g.user_id = p_user_id
       AND g.revoked_at IS NULL
    RETURNING g.id
  )
  SELECT count(*) INTO v_revoked FROM revoked;

  SELECT lower(btrim(u.email)) INTO v_target_email
    FROM public.users u WHERE u.id = p_user_id;

  PERFORM public.log_partner_audit(
    p_partner_id, p_source, 'member_removed', p_actor_id,
    'user', p_user_id, v_target_email,
    jsonb_build_object('status', 'active'),
    jsonb_build_object('status', 'removed', 'seats_revoked', v_revoked),
    NULL, p_reason
  );

  IF v_revoked > 0 THEN
    PERFORM public.log_partner_audit(
      p_partner_id, p_source, 'seat_revoked', p_actor_id,
      'user', p_user_id, v_target_email, NULL,
      jsonb_build_object('seats_revoked', v_revoked, 'cause', 'membership_removed'),
      NULL, p_reason
    );
  END IF;

  RETURN jsonb_build_object('outcome', 'removed', 'seats_revoked', v_revoked);
END;
$$;

-- ---------------------------------------------------------------------------
-- fulfill_partner_membership
-- ---------------------------------------------------------------------------
-- Idempotency is DB-enforced: the first step inserts the fulfillment event and
-- lets the UNIQUE index on stripe_ref (the Checkout Session id) decide whether
-- this is the fresh path or a replay. Safe under webhook retry AND repairs the
-- "enrollment exists, membership missing" case.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fulfill_partner_membership(
  p_user_id    uuid,
  p_partner_id uuid,
  p_stripe_ref text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_event_id      uuid;
  v_event         public.partner_fulfillment_events%ROWTYPE;
  v_partner       public.partners%ROWTYPE;
  v_member        public.partner_members%ROWTYPE;
  v_other_partner uuid;
  v_outcome       text;
  v_action        text;
BEGIN
  IF p_user_id IS NULL OR p_partner_id IS NULL OR coalesce(btrim(p_stripe_ref), '') = '' THEN
    RETURN jsonb_build_object('outcome', 'invalid');
  END IF;

  SELECT * INTO v_partner FROM public.partners WHERE id = p_partner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'invalid');
  END IF;

  INSERT INTO public.partner_fulfillment_events (stripe_ref, partner_id, user_id, outcome)
  VALUES (p_stripe_ref, p_partner_id, p_user_id, 'processing')
  ON CONFLICT (stripe_ref) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    SELECT * INTO v_event FROM public.partner_fulfillment_events
      WHERE stripe_ref = p_stripe_ref FOR UPDATE;

    -- A stripe_ref reused with DIFFERENT params is an integrity failure, never
    -- a silent return of another checkout's outcome. Rows whose user was
    -- deleted (user_id NULL) still dedupe.
    IF v_event.partner_id <> p_partner_id
       OR (v_event.user_id IS NOT NULL AND v_event.user_id <> p_user_id) THEN
      RAISE EXCEPTION
        'fulfill_partner_membership: stripe_ref % already recorded for a different user/partner',
        p_stripe_ref USING ERRCODE = 'unique_violation';
    END IF;

    RETURN jsonb_build_object('outcome', v_event.outcome, 'replayed', true);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  SELECT * INTO v_member FROM public.partner_members
    WHERE user_id = p_user_id AND partner_id = p_partner_id FOR UPDATE;

  SELECT pm.partner_id INTO v_other_partner FROM public.partner_members pm
    WHERE pm.user_id = p_user_id AND pm.status = 'active'
      AND pm.partner_id <> p_partner_id
    LIMIT 1;

  IF v_other_partner IS NOT NULL THEN
    -- Keep the existing tenancy. Attribution is independent of membership and
    -- is NOT rewritten here.
    v_outcome := 'conflict';
    PERFORM public.log_partner_audit(
      p_partner_id, 'webhook', 'self_pay_attribution_conflict', NULL,
      'user', p_user_id, NULL, NULL,
      jsonb_build_object('kept_partner_id', v_other_partner),
      p_stripe_ref, 'user already active in another partner'
    );
  ELSE
    BEGIN
      IF v_member.user_id IS NULL THEN
        INSERT INTO public.partner_members (
          partner_id, user_id, joined_at, role, status, joined_via,
          activated_at, removed_at, updated_at
        ) VALUES (
          p_partner_id, p_user_id, now(), 'member', 'active', 'self_pay',
          now(), NULL, now()
        );
        v_outcome := 'fulfilled';
        v_action := 'member_joined';
      ELSIF v_member.status = 'removed' THEN
        UPDATE public.partner_members
           SET status = 'active', joined_via = 'self_pay',
               activated_at = now(), removed_at = NULL, updated_at = now()
         WHERE partner_id = p_partner_id AND user_id = p_user_id;
        v_outcome := 'fulfilled';
        v_action := 'member_reactivated';
      ELSE
        v_outcome := 'repaired';  -- already active here: idempotent no-op
      END IF;
    EXCEPTION WHEN unique_violation THEN
      v_outcome := 'conflict';
    END;

    IF v_action IS NOT NULL THEN
      PERFORM public.log_partner_audit(
        p_partner_id, 'webhook', v_action, NULL,
        'user', p_user_id, NULL, NULL,
        jsonb_build_object('joined_via', 'self_pay'),
        p_stripe_ref, NULL
      );
    END IF;
  END IF;

  UPDATE public.partner_fulfillment_events
     SET outcome = v_outcome
   WHERE id = v_event_id;

  RETURN jsonb_build_object(
    'outcome', v_outcome,
    'replayed', false,
    'partner_slug', v_partner.slug
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- create_partner_invite — locks + expires any stale pending invite first, so a
-- time-expired row never blocks a replacement.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_partner_invite(
  p_partner_id    uuid,
  p_email         text,
  p_invited_by    uuid,
  p_token_hash    text,
  p_seat_block_id uuid,
  p_expires_at    timestamptz,
  p_audit_source  text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_email    text;
  v_existing public.partner_invites%ROWTYPE;
  v_id       uuid;
BEGIN
  v_email := lower(btrim(coalesce(p_email, '')));
  IF v_email = '' OR p_partner_id IS NULL OR p_invited_by IS NULL
     OR coalesce(btrim(p_token_hash), '') = '' OR p_expires_at IS NULL THEN
    RETURN jsonb_build_object('outcome', 'invalid');
  END IF;

  SELECT * INTO v_existing FROM public.partner_invites
    WHERE partner_id = p_partner_id AND email = v_email AND status = 'pending'
    FOR UPDATE;

  IF FOUND THEN
    IF v_existing.expires_at <= now() THEN
      UPDATE public.partner_invites
         SET status = 'expired', updated_at = now()
       WHERE id = v_existing.id;
    ELSE
      RETURN jsonb_build_object('outcome', 'already_pending', 'invite_id', v_existing.id);
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.partner_invites (
      partner_id, email, invited_by, token_hash, seat_block_id,
      status, expires_at, updated_at
    ) VALUES (
      p_partner_id, v_email, p_invited_by, p_token_hash, p_seat_block_id,
      'pending', p_expires_at, now()
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    -- Two concurrent creates for the same (partner, email), or a token_hash
    -- collision. Either way: never surface a raw constraint error.
    RETURN jsonb_build_object('outcome', 'already_pending');
  END;

  PERFORM public.log_partner_audit(
    p_partner_id, p_audit_source, 'invite_created', p_invited_by,
    'invite', v_id, v_email, NULL,
    jsonb_build_object('seat_block_id', p_seat_block_id, 'expires_at', p_expires_at),
    NULL, NULL
  );

  RETURN jsonb_build_object('outcome', 'created', 'invite_id', v_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- resend_partner_invite — rotates token_hash atomically in the same UPDATE.
-- The old token is dead the instant this commits.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resend_partner_invite(
  p_invite_id    uuid,
  p_actor_id     uuid,
  p_token_hash   text,
  p_expires_at   timestamptz,
  p_audit_source text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_invite public.partner_invites%ROWTYPE;
BEGIN
  IF p_invite_id IS NULL OR coalesce(btrim(p_token_hash), '') = '' OR p_expires_at IS NULL THEN
    RETURN jsonb_build_object('outcome', 'invalid');
  END IF;

  SELECT * INTO v_invite FROM public.partner_invites
    WHERE id = p_invite_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;
  IF v_invite.status <> 'pending' THEN
    RETURN jsonb_build_object('outcome', 'not_pending', 'status', v_invite.status);
  END IF;

  UPDATE public.partner_invites
     SET token_hash = p_token_hash, expires_at = p_expires_at, updated_at = now()
   WHERE id = p_invite_id;

  PERFORM public.log_partner_audit(
    v_invite.partner_id, p_audit_source, 'invite_resent', p_actor_id,
    'invite', p_invite_id, v_invite.email, NULL,
    jsonb_build_object('expires_at', p_expires_at, 'token_rotated', true),
    NULL, NULL
  );

  RETURN jsonb_build_object('outcome', 'resent', 'invite_id', p_invite_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- revoke_partner_invite
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_partner_invite(
  p_invite_id    uuid,
  p_actor_id     uuid,
  p_audit_source text,
  p_reason       text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_invite public.partner_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM public.partner_invites
    WHERE id = p_invite_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;

  -- Serialized-transition rule: if acceptance committed first we observe
  -- 'accepted' and return a defined no-op result rather than half-undoing it.
  IF v_invite.status <> 'pending' THEN
    RETURN jsonb_build_object('outcome', 'not_pending', 'status', v_invite.status);
  END IF;

  UPDATE public.partner_invites
     SET status = 'revoked', updated_at = now()
   WHERE id = p_invite_id;

  PERFORM public.log_partner_audit(
    v_invite.partner_id, p_audit_source, 'invite_revoked', p_actor_id,
    'invite', p_invite_id, v_invite.email,
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', 'revoked'),
    NULL, p_reason
  );

  RETURN jsonb_build_object('outcome', 'revoked', 'invite_id', p_invite_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- upsert_join_code — the code itself is immutable after creation (shared links
-- must not silently retarget); only the seat link, cap and expiry are editable.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_join_code(
  p_partner_id    uuid,
  p_code_id       uuid,
  p_code          text,
  p_seat_block_id uuid,
  p_max_uses      integer,
  p_expires_at    timestamptz,
  p_actor_id      uuid,
  p_audit_source  text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_code     text;
  v_existing public.partner_join_codes%ROWTYPE;
  v_id       uuid;
BEGIN
  IF p_partner_id IS NULL THEN
    RETURN jsonb_build_object('outcome', 'invalid');
  END IF;

  IF p_code_id IS NULL THEN
    v_code := upper(btrim(coalesce(p_code, '')));
    IF v_code !~ '^[A-Z2-9]{8,24}$' THEN
      RETURN jsonb_build_object('outcome', 'invalid_code');
    END IF;

    BEGIN
      INSERT INTO public.partner_join_codes (
        partner_id, code, seat_block_id, max_uses, expires_at,
        is_active, created_by, updated_at
      ) VALUES (
        p_partner_id, v_code, p_seat_block_id, p_max_uses, p_expires_at,
        true, p_actor_id, now()
      )
      RETURNING id INTO v_id;
    EXCEPTION WHEN unique_violation THEN
      RETURN jsonb_build_object('outcome', 'code_taken');
    END;

    PERFORM public.log_partner_audit(
      p_partner_id, p_audit_source, 'code_created', p_actor_id,
      'join_code', v_id, NULL, NULL,
      jsonb_build_object('code', v_code, 'seat_block_id', p_seat_block_id,
                         'max_uses', p_max_uses, 'expires_at', p_expires_at),
      NULL, NULL
    );
    RETURN jsonb_build_object('outcome', 'created', 'code_id', v_id, 'code', v_code);
  END IF;

  SELECT * INTO v_existing FROM public.partner_join_codes
    WHERE id = p_code_id FOR UPDATE;
  IF NOT FOUND OR v_existing.partner_id <> p_partner_id THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;

  UPDATE public.partner_join_codes
     SET seat_block_id = p_seat_block_id,
         max_uses      = p_max_uses,
         expires_at    = p_expires_at,
         updated_at    = now()
   WHERE id = p_code_id;

  PERFORM public.log_partner_audit(
    p_partner_id, p_audit_source, 'code_updated', p_actor_id,
    'join_code', p_code_id, NULL,
    jsonb_build_object('seat_block_id', v_existing.seat_block_id,
                       'max_uses', v_existing.max_uses,
                       'expires_at', v_existing.expires_at),
    jsonb_build_object('seat_block_id', p_seat_block_id,
                       'max_uses', p_max_uses,
                       'expires_at', p_expires_at),
    NULL, NULL
  );

  RETURN jsonb_build_object('outcome', 'updated', 'code_id', p_code_id, 'code', v_existing.code);
END;
$$;

-- ---------------------------------------------------------------------------
-- set_join_code_active
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_join_code_active(
  p_code_id      uuid,
  p_is_active    boolean,
  p_actor_id     uuid,
  p_audit_source text,
  p_reason       text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_code public.partner_join_codes%ROWTYPE;
BEGIN
  SELECT * INTO v_code FROM public.partner_join_codes
    WHERE id = p_code_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;
  IF v_code.is_active = p_is_active THEN
    RETURN jsonb_build_object('outcome', 'unchanged', 'is_active', p_is_active);
  END IF;

  UPDATE public.partner_join_codes
     SET is_active = p_is_active, updated_at = now()
   WHERE id = p_code_id;

  PERFORM public.log_partner_audit(
    v_code.partner_id, p_audit_source,
    CASE WHEN p_is_active THEN 'code_reactivated' ELSE 'code_deactivated' END,
    p_actor_id, 'join_code', p_code_id, NULL,
    jsonb_build_object('is_active', v_code.is_active),
    jsonb_build_object('is_active', p_is_active),
    NULL, p_reason
  );

  RETURN jsonb_build_object('outcome', 'updated', 'is_active', p_is_active);
END;
$$;

-- ---------------------------------------------------------------------------
-- upsert_seat_block — enforces the edit rules transactionally.
-- After the first grant: granted_tier / access_starts_at / source are
-- immutable; access_ends_at extends freely but shortening needs an explicit
-- confirm; seats_total can never drop below the active grant count;
-- deactivation is a confirmed kill switch. Bulk-impact operations write ONE
-- summary audit row carrying the affected-grant count.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_seat_block(
  p_partner_id       uuid,
  p_block_id         uuid,
  p_label            text,
  p_seats_total      integer,
  p_granted_tier     text,
  p_access_starts_at timestamptz,
  p_access_ends_at   timestamptz,
  p_block_source     text,
  p_notes            text,
  p_is_active        boolean,
  p_actor_id         uuid,
  p_audit_source     text,
  p_confirm_impact   boolean DEFAULT false,
  p_reason           text    DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing      public.partner_seat_blocks%ROWTYPE;
  v_active_grants integer := 0;
  v_ever_granted  integer := 0;
  v_id            uuid;
  v_action        text;
BEGIN
  IF p_partner_id IS NULL OR coalesce(btrim(p_label), '') = ''
     OR p_seats_total IS NULL OR p_seats_total < 0
     OR p_access_starts_at IS NULL OR p_access_ends_at IS NULL
     OR p_access_ends_at <= p_access_starts_at THEN
    RETURN jsonb_build_object('outcome', 'invalid');
  END IF;

  IF p_block_id IS NULL THEN
    INSERT INTO public.partner_seat_blocks (
      partner_id, label, seats_total, granted_tier, access_starts_at,
      access_ends_at, source, notes, is_active, created_by, updated_at
    ) VALUES (
      p_partner_id, btrim(p_label), p_seats_total, coalesce(p_granted_tier, 'vault'),
      p_access_starts_at, p_access_ends_at, p_block_source, p_notes,
      coalesce(p_is_active, true), p_actor_id, now()
    )
    RETURNING id INTO v_id;

    PERFORM public.log_partner_audit(
      p_partner_id, p_audit_source, 'block_created', p_actor_id,
      'seat_block', v_id, NULL, NULL,
      jsonb_build_object('label', btrim(p_label), 'seats_total', p_seats_total,
                         'granted_tier', coalesce(p_granted_tier, 'vault'),
                         'access_starts_at', p_access_starts_at,
                         'access_ends_at', p_access_ends_at,
                         'source', p_block_source),
      NULL, p_reason
    );
    RETURN jsonb_build_object('outcome', 'created', 'block_id', v_id);
  END IF;

  SELECT * INTO v_existing FROM public.partner_seat_blocks
    WHERE id = p_block_id FOR UPDATE;
  IF NOT FOUND OR v_existing.partner_id <> p_partner_id THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;

  SELECT count(*) INTO v_active_grants FROM public.partner_seat_grants
    WHERE seat_block_id = p_block_id AND revoked_at IS NULL;

  -- Immutability keys on "has EVER granted", not "currently active": revoking
  -- every seat must not make a block's tier/start/source editable again, or a
  -- block that ledger rows and audit history already point at could be
  -- retroactively redefined.
  SELECT count(*) INTO v_ever_granted FROM public.partner_seat_grants
    WHERE seat_block_id = p_block_id;

  IF v_ever_granted > 0 THEN
    IF coalesce(p_granted_tier, v_existing.granted_tier) <> v_existing.granted_tier
       OR p_access_starts_at <> v_existing.access_starts_at
       OR coalesce(p_block_source, v_existing.source) <> v_existing.source THEN
      RETURN jsonb_build_object(
        'outcome', 'immutable_field',
        'active_grants', v_active_grants,
        'ever_granted', v_ever_granted
      );
    END IF;
  END IF;

  IF p_seats_total < v_active_grants THEN
    RETURN jsonb_build_object(
      'outcome', 'below_active_usage', 'active_grants', v_active_grants
    );
  END IF;

  IF (p_access_ends_at < v_existing.access_ends_at
      OR (v_existing.is_active AND coalesce(p_is_active, true) = false))
     AND coalesce(p_confirm_impact, false) = false THEN
    RETURN jsonb_build_object(
      'outcome', 'confirm_required', 'active_grants', v_active_grants
    );
  END IF;

  UPDATE public.partner_seat_blocks
     SET label            = btrim(p_label),
         seats_total      = p_seats_total,
         granted_tier     = coalesce(p_granted_tier, v_existing.granted_tier),
         access_starts_at = p_access_starts_at,
         access_ends_at   = p_access_ends_at,
         source           = coalesce(p_block_source, v_existing.source),
         notes            = p_notes,
         is_active        = coalesce(p_is_active, v_existing.is_active),
         updated_at       = now()
   WHERE id = p_block_id;

  v_action := CASE
    WHEN v_existing.is_active AND coalesce(p_is_active, true) = false THEN 'block_deactivated'
    WHEN p_access_ends_at < v_existing.access_ends_at                 THEN 'block_shortened'
    ELSE 'block_edited'
  END;

  PERFORM public.log_partner_audit(
    p_partner_id, p_audit_source, v_action, p_actor_id,
    'seat_block', p_block_id, NULL,
    jsonb_build_object('label', v_existing.label, 'seats_total', v_existing.seats_total,
                       'access_ends_at', v_existing.access_ends_at,
                       'is_active', v_existing.is_active),
    jsonb_build_object('label', btrim(p_label), 'seats_total', p_seats_total,
                       'access_ends_at', p_access_ends_at,
                       'is_active', coalesce(p_is_active, v_existing.is_active),
                       'affected_active_grants', v_active_grants),
    NULL, p_reason
  );

  RETURN jsonb_build_object(
    'outcome', 'updated', 'block_id', p_block_id, 'active_grants', v_active_grants
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- update_partner_benefits
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_partner_benefits(
  p_partner_id          uuid,
  p_course_discount_pct numeric,
  p_stripe_coupon_id    text,
  p_included_tier       text,
  p_actor_id            uuid,
  p_audit_source        text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_old public.partner_benefits%ROWTYPE;
BEGIN
  IF p_partner_id IS NULL THEN
    RETURN jsonb_build_object('outcome', 'invalid');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE id = p_partner_id) THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;

  SELECT * INTO v_old FROM public.partner_benefits
    WHERE partner_id = p_partner_id FOR UPDATE;

  INSERT INTO public.partner_benefits (
    partner_id, course_discount_pct, stripe_coupon_id, included_tier, updated_at
  ) VALUES (
    p_partner_id, coalesce(p_course_discount_pct, 0),
    nullif(btrim(coalesce(p_stripe_coupon_id, '')), ''),
    nullif(btrim(coalesce(p_included_tier, '')), ''),
    now()
  )
  ON CONFLICT (partner_id) DO UPDATE
    SET course_discount_pct = EXCLUDED.course_discount_pct,
        stripe_coupon_id    = EXCLUDED.stripe_coupon_id,
        included_tier       = EXCLUDED.included_tier,
        updated_at          = now();

  PERFORM public.log_partner_audit(
    p_partner_id, p_audit_source, 'benefits_updated', p_actor_id,
    'partner', p_partner_id, NULL,
    CASE WHEN v_old.partner_id IS NULL THEN NULL ELSE jsonb_build_object(
      'course_discount_pct', v_old.course_discount_pct,
      'stripe_coupon_id', v_old.stripe_coupon_id,
      'included_tier', v_old.included_tier
    ) END,
    jsonb_build_object(
      'course_discount_pct', coalesce(p_course_discount_pct, 0),
      'stripe_coupon_id', nullif(btrim(coalesce(p_stripe_coupon_id, '')), ''),
      'included_tier', nullif(btrim(coalesce(p_included_tier, '')), '')
    ),
    NULL, NULL
  );

  RETURN jsonb_build_object('outcome', 'updated');
END;
$$;

-- ---------------------------------------------------------------------------
-- get_my_active_seat_grants — the ONE authenticated-EXECUTE exception.
-- ---------------------------------------------------------------------------
-- partner_seat_blocks is not member-readable, so an authenticated-client join
-- from grants to blocks would silently lose the block's window/active fields
-- and the TypeScript check would deny access that SQL RLS grants. This RPC
-- closes that gap. "Active" is filtered INSIDE: grant unrevoked AND block
-- active AND access_starts_at <= now() < access_ends_at — which is why there
-- is no block_is_active field in the result (it would always be true).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_active_seat_grants()
RETURNS TABLE (
  partner_id       uuid,
  partner_slug     text,
  partner_name_en  text,
  partner_name_jp  text,
  granted_tier     text,
  access_starts_at timestamptz,
  access_ends_at   timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT b.partner_id, p.slug, p.name_en, p.name_jp,
         b.granted_tier, b.access_starts_at, b.access_ends_at
  FROM public.partner_seat_grants g
  JOIN public.partner_seat_blocks b ON b.id = g.seat_block_id
  JOIN public.partners p            ON p.id = b.partner_id
  WHERE auth.uid() IS NOT NULL
    AND g.user_id = auth.uid()
    AND g.revoked_at IS NULL
    AND b.is_active
    AND b.access_starts_at <= now()
    AND now() < b.access_ends_at
  ORDER BY b.access_ends_at DESC;
$$;

-- ---- grants ----------------------------------------------------------------
REVOKE ALL ON FUNCTION public.redeem_partner_code(uuid, text)                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_partner_invite(uuid, text)                  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_partner_member(uuid, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fulfill_partner_membership(uuid, uuid, text)       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_partner_invite(uuid, text, uuid, text, uuid, timestamptz, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resend_partner_invite(uuid, uuid, text, timestamptz, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_partner_invite(uuid, uuid, text, text)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_join_code(uuid, uuid, text, uuid, integer, timestamptz, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_join_code_active(uuid, boolean, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_seat_block(uuid, uuid, text, integer, text, timestamptz, timestamptz, text, text, boolean, uuid, text, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_partner_benefits(uuid, numeric, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_partner_audit(uuid, text, text, uuid, text, uuid, text, jsonb, jsonb, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.redeem_partner_code(uuid, text)                    TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_partner_invite(uuid, text)                  TO service_role;
GRANT EXECUTE ON FUNCTION public.remove_partner_member(uuid, uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_partner_membership(uuid, uuid, text)       TO service_role;
GRANT EXECUTE ON FUNCTION public.create_partner_invite(uuid, text, uuid, text, uuid, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.resend_partner_invite(uuid, uuid, text, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_partner_invite(uuid, uuid, text, text)      TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_join_code(uuid, uuid, text, uuid, integer, timestamptz, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_join_code_active(uuid, boolean, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_seat_block(uuid, uuid, text, integer, text, timestamptz, timestamptz, text, text, boolean, uuid, text, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_partner_benefits(uuid, numeric, text, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_partner_audit(uuid, text, text, uuid, text, uuid, text, jsonb, jsonb, text, text) TO service_role;

-- The one exception: an authenticated user may read THEIR OWN active grants.
REVOKE ALL    ON FUNCTION public.get_my_active_seat_grants() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_active_seat_grants() TO authenticated, service_role;

-- ============================================================================
-- 1e. Entitlement helpers
-- ============================================================================
-- Parameter names are unchanged on purpose: CREATE OR REPLACE cannot rename an
-- input parameter, and RLS policies across 041/042 call these by name.

CREATE OR REPLACE FUNCTION public.community_scope_for(p_user_id uuid)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT pm.partner_id
  FROM public.partner_members pm
  WHERE pm.user_id = p_user_id
    AND pm.status = 'active'
  ORDER BY pm.joined_at ASC
  LIMIT 1
$$;

COMMENT ON FUNCTION public.community_scope_for(uuid) IS
  'Returns the partner_id the user is scoped to, or NULL for HonuVibe main. '
  'Only ACTIVE memberships count (invariant 2).';

CREATE OR REPLACE FUNCTION public.has_community_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT
    -- ACTIVE partner membership always grants access. Membership includes
    -- Community; seats are Vault-only, so there is deliberately no seat clause.
    EXISTS (
      SELECT 1 FROM public.partner_members
      WHERE user_id = p_user_id AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = p_user_id AND u.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = p_user_id
        AND u.subscription_tier IN ('community','vault')
        AND u.subscription_status IN ('active','trialing')
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = p_user_id
        AND u.subscription_tier IN ('community','vault')
        AND u.subscription_status = 'cancelled'
        AND u.subscription_expires_at IS NOT NULL
        AND u.subscription_expires_at > now()
    )
    OR EXISTS (
      SELECT 1 FROM public.cohort_enrollments ce
      WHERE ce.user_id = p_user_id
        AND ce.bundle_access_starts_at <= now()
        AND ce.bundle_access_ends_at   >= now()
    )
$$;

CREATE OR REPLACE FUNCTION public.has_vault_access(uid uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = uid AND u.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = uid
        AND u.subscription_tier = 'vault'
        AND u.subscription_status IN ('active', 'trialing')
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = uid
        AND u.subscription_tier = 'vault'
        AND u.subscription_status = 'cancelled'
        AND u.subscription_expires_at IS NOT NULL
        AND u.subscription_expires_at > now()
    )
    OR EXISTS (
      SELECT 1 FROM public.cohort_enrollments ce
      WHERE ce.user_id = uid
        AND ce.bundle_access_starts_at <= now()
        AND ce.bundle_access_ends_at   >= now()
    )
    -- Sponsored seat: unrevoked grant on an ACTIVE vault block, inside the
    -- window (inclusive start, EXCLUSIVE end).
    OR EXISTS (
      SELECT 1
      FROM public.partner_seat_grants g
      JOIN public.partner_seat_blocks b ON b.id = g.seat_block_id
      WHERE g.user_id = uid
        AND g.revoked_at IS NULL
        AND b.is_active
        AND b.granted_tier = 'vault'
        AND b.access_starts_at <= now()
        AND now() < b.access_ends_at
    );
$$;

COMMENT ON FUNCTION public.has_vault_access(uuid) IS
  'Vault-tier access: admin | vault subscription (incl. trialing + cancelled '
  'grace) | active cohort window | sponsored partner seat. Mirrors '
  'lib/access/checks.ts hasVaultAccess().';

-- ============================================================================
-- 1f. Backfill
-- ============================================================================
-- Vertice keeps its 40% course perk. stripe_coupon_id stays NULL here on
-- purpose: STRIPE_VERTICE_COUPON_ID remains the runtime fallback for the whole
-- expand phase, so this migration stays secret-free. The coupon id moves into
-- the column at the contract deploy.
INSERT INTO public.partner_benefits (partner_id, course_discount_pct, stripe_coupon_id, updated_at)
SELECT p.id, 40, NULL, now()
FROM public.partners p
WHERE p.slug = 'vertice-society'
ON CONFLICT (partner_id) DO NOTHING;

-- Pre-existing rows got activated_at = DEFAULT now(), i.e. "the moment this
-- migration ran", which is not when they actually joined. Pull it back to
-- joined_at for the backfilled rows only. Idempotent: after one pass the
-- predicate is false, and joined_via is only ever 'backfill' for rows that
-- predate this migration.
UPDATE public.partner_members
   SET activated_at = joined_at
 WHERE joined_via = 'backfill'
   AND removed_at IS NULL
   AND activated_at > joined_at;

COMMIT;
