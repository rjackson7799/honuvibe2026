-- ============================================================================
-- 074_studio_proposals.sql — Studio proposal (engagement spine, slice 3)
-- ============================================================================
-- Plan: docs/plans/2026-09-05-studio-proposal.md (rev 2, approved).
--
-- One new table behind /admin/studio/engagements/<id>:
--   engagement_proposals — a VERSIONED priced offer + seven narrative sections.
--     draft -> ready (human-review gate) -> sent (ISSUED: the document is frozen
--     into issued_snapshot and the exact PDF is archived) -> accepted -> voided.
--     Side exits: withdrawn, superseded (revise = a new row, version + 1).
--     One open (draft|ready|sent) and one accepted row per engagement.
--
-- THE FREEZE. issue_engagement_proposal pins issued_snapshot (content AND the
-- cover's identity fields) and the archived PDF path + sha256. From `sent` on,
-- tg_engagement_proposals_guard makes every content column immutable, so
-- "what the client saw is what was accepted" is an invariant, not a habit.
-- valid_until is deliberately NOT in the snapshot: it is the one client-visible
-- field allowed to change, and only forward.
--
-- THE WIN. accept_engagement_proposal is ONE transaction: proposal ->
-- accepted, engagement tier/currency/contract_value/care_mrr written, stage ->
-- build (if still discovery|proposal) — the 067 triggers set won_at, write
-- stage_changed and mirror the lead to 'won' inside the same transaction.
-- void_engagement_proposal_acceptance is the audited correction path.
--
-- LOCK ORDER — engagement FIRST, then proposal(s) — in every RPC and in the
-- amended terminal sweep. accept/void/issue read the proposal's engagement_id
-- WITHOUT a lock, lock the engagement, lock the proposal, then re-check every
-- status. The client accept path passes the presented token hash into the
-- RPC and it is re-validated on the LOCKED row, so a revoke or rotate that
-- committed before the lock was obtained wins the race.
--
-- RLS: one *_admin_all policy, NO anon/member policy (the 067 posture). The
-- client reaches its proposal only through a service-role route that has
-- verified the cookie — an RLS predicate cannot see a cookie.
--
-- STORAGE: a NEW private bucket `engagement-documents` (the 047 mould), with
-- no storage policies — only the service role reads or writes it.
--
-- NUMBERING: 067 is the highest committed migration; 065 and 068–073 sit
-- uncommitted in the working tree, so this is 074.
--
-- ROLLOUT — APPLY BEFORE THE DEPLOY (the 062 precedent). Everything here is
-- additive: a new table, a new bucket, RPCs and triggers nothing calls yet, a
-- constraint swap that is a superset, and view columns APPENDED after the
-- ones the shipped list reads. Applying first means there is no interval in
-- which the workspace page queries a table that does not exist.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. engagement_proposals
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagement_proposals (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  engagement_id              uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  version                    int NOT NULL CHECK (version >= 1),
  locale                     text NOT NULL CHECK (locale IN ('en','ja')),
  title                      text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),

  status                     text NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','ready','sent','accepted','voided','superseded','withdrawn')),

  -- Bumped by the guard trigger on every content change: the optimistic-
  -- concurrency token for saves, the AI run's input version, the issue CAS.
  content_version            int NOT NULL DEFAULT 1 CHECK (content_version >= 1),

  -- The offer. Money is integer minor units in `currency` (USD cents / JPY yen).
  currency                   text NOT NULL CHECK (currency IN ('USD','JPY')),
  tier                       text NOT NULL CHECK (tier IN ('starter','pro','ai_native')),
  pricing_mode               text NOT NULL DEFAULT 'fixed' CHECK (pricing_mode IN ('fixed','performance','hybrid')),
  pricing                    jsonb NOT NULL,
  -- Real columns so the accept RPC copies them without parsing JSON; pinned to
  -- the blob by engagement_proposals_totals_match_ck below.
  total_build                int NOT NULL CHECK (total_build >= 0),
  total_monthly              int NOT NULL CHECK (total_monthly >= 0),
  performance_terms          jsonb CHECK (performance_terms IS NULL OR jsonb_typeof(performance_terms) = 'object'),

  -- Basis: the skill's "real data before proposals" as a declared flag.
  data_basis                 text NOT NULL CHECK (data_basis IN ('client_records','provisional')),
  brief_id                   uuid REFERENCES public.engagement_briefs(id) ON DELETE SET NULL,
  -- Set at issue (default HST today + 30); may only move LATER afterwards.
  valid_until                date,

  -- Exactly seven {key, title, body_md} in a fixed order (zod-owned interior).
  sections                   jsonb NOT NULL,

  -- AI drafting run state (the 067 tailoring idiom + a run id and an input
  -- version so a finished run can never land on changed input).
  drafting_status            text NOT NULL DEFAULT 'none'
                               CHECK (drafting_status IN ('none','generating','completed','failed')),
  drafting_started_at        timestamptz,
  drafted_at                 timestamptz,
  drafting_run_id            uuid,
  drafting_input_version     int,
  -- Curated codes ONLY: raw provider text never reaches the DB or client.
  drafting_error             text CHECK (
                               drafting_error IS NULL
                               OR drafting_error IN ('timeout','provider_error','malformed_output','emitted_price',
                                                     'stale_input','missing_key','internal')
                             ),
  drafting_model_id          text,
  drafting_pipeline_version  text,
  source_snapshot            jsonb CHECK (source_snapshot IS NULL OR jsonb_typeof(source_snapshot) = 'object'),

  -- Issuance: the frozen document + the archived PDF.
  issued_snapshot            jsonb CHECK (issued_snapshot IS NULL OR jsonb_typeof(issued_snapshot) = 'object'),
  issued_pdf_path            text CHECK (issued_pdf_path IS NULL OR char_length(issued_pdf_path) BETWEEN 1 AND 500),
  issued_pdf_sha256          text CHECK (issued_pdf_sha256 IS NULL OR issued_pdf_sha256 ~ '^[0-9a-f]{64}$'),
  sent_at                    timestamptz,
  delivery_method            text CHECK (delivery_method IS NULL OR delivery_method IN ('link','manual')),

  -- Magic-link token: the plaintext is NEVER stored (the 067 idiom).
  access_token_hash          text CHECK (access_token_hash IS NULL OR access_token_hash ~ '^[0-9a-f]{64}$'),
  token_issued_at            timestamptz,
  token_expires_at           timestamptz,
  token_revoked_at           timestamptz,
  open_count                 int NOT NULL DEFAULT 0 CHECK (open_count >= 0),
  first_opened_at            timestamptz,
  last_opened_at             timestamptz,

  -- Acceptance (immutable once written — guard rule 4).
  accepted_at                timestamptz,
  accepted_by_name           text CHECK (accepted_by_name IS NULL OR char_length(accepted_by_name) BETWEEN 1 AND 200),
  accepted_via               text CHECK (accepted_via IS NULL OR accepted_via IN ('client','admin')),
  notification_sent_at       timestamptz,

  -- Void (the audited correction).
  voided_at                  timestamptz,
  void_reason                text CHECK (void_reason IS NULL OR char_length(void_reason) BETWEEN 1 AND 1000),

  -- Retirement.
  withdrawn_at               timestamptz,
  superseded_at              timestamptz,
  superseded_by              uuid REFERENCES public.engagement_proposals(id) ON DELETE SET NULL,

  -- The two totals are pinned to the blob. CASE form: SQL AND is not a
  -- guaranteed short-circuit and ::int raises on non-numeric text.
  CONSTRAINT engagement_proposals_totals_match_ck CHECK (
    CASE WHEN jsonb_typeof(pricing) = 'object'
          AND jsonb_typeof(pricing -> 'total_build') = 'number'
          AND jsonb_typeof(pricing -> 'total_monthly') = 'number'
         THEN (pricing ->> 'total_build')::int = total_build
          AND (pricing ->> 'total_monthly')::int = total_monthly
         ELSE false END
  ),
  CONSTRAINT engagement_proposals_sections_shape_ck CHECK (
    CASE WHEN jsonb_typeof(sections) = 'array' THEN jsonb_array_length(sections) = 7 ELSE false END
  ),
  CONSTRAINT engagement_proposals_mode_shape_ck CHECK (
    (pricing_mode = 'fixed') = (performance_terms IS NULL)
  ),
  CONSTRAINT engagement_proposals_drafting_anchor_ck CHECK (
    (drafting_status <> 'generating'
       OR (drafting_started_at IS NOT NULL AND drafting_run_id IS NOT NULL AND drafting_input_version IS NOT NULL))
    AND (drafting_status <> 'failed' OR drafting_error IS NOT NULL)
  ),
  -- A token record is all-or-nothing.
  CONSTRAINT engagement_proposals_token_shape_ck CHECK (
    (access_token_hash IS NULL AND token_issued_at IS NULL
       AND token_expires_at IS NULL AND token_revoked_at IS NULL)
    OR (access_token_hash IS NOT NULL AND token_issued_at IS NOT NULL AND token_expires_at IS NOT NULL)
  ),
  -- What each status must carry. Stated once; the RPCs and the tests agree.
  CONSTRAINT engagement_proposals_status_shape_ck CHECK (
    CASE status
      WHEN 'draft' THEN
        issued_snapshot IS NULL AND sent_at IS NULL AND access_token_hash IS NULL
      WHEN 'ready' THEN
        issued_snapshot IS NULL AND sent_at IS NULL AND access_token_hash IS NULL
      WHEN 'sent' THEN
        issued_snapshot IS NOT NULL AND issued_pdf_path IS NOT NULL AND issued_pdf_sha256 IS NOT NULL
        AND sent_at IS NOT NULL AND delivery_method IS NOT NULL AND valid_until IS NOT NULL
        AND (delivery_method = 'manual' OR access_token_hash IS NOT NULL)
      WHEN 'accepted' THEN
        issued_snapshot IS NOT NULL AND issued_pdf_path IS NOT NULL AND issued_pdf_sha256 IS NOT NULL
        AND sent_at IS NOT NULL AND delivery_method IS NOT NULL AND valid_until IS NOT NULL
        AND (delivery_method = 'manual' OR access_token_hash IS NOT NULL)
        AND accepted_at IS NOT NULL AND accepted_by_name IS NOT NULL AND accepted_via IS NOT NULL
      WHEN 'voided' THEN
        issued_snapshot IS NOT NULL AND issued_pdf_path IS NOT NULL AND issued_pdf_sha256 IS NOT NULL
        AND sent_at IS NOT NULL AND delivery_method IS NOT NULL AND valid_until IS NOT NULL
        AND (delivery_method = 'manual' OR access_token_hash IS NOT NULL)
        AND accepted_at IS NOT NULL AND accepted_by_name IS NOT NULL AND accepted_via IS NOT NULL
        AND voided_at IS NOT NULL AND void_reason IS NOT NULL
      WHEN 'superseded' THEN superseded_at IS NOT NULL
      WHEN 'withdrawn'  THEN withdrawn_at IS NOT NULL
      ELSE false
    END
  )
);

-- One version number per engagement; one OPEN and one ACCEPTED row per
-- engagement (voided frees the accepted slot); single-flight drafting; token
-- lookup by hash; the version list.
CREATE UNIQUE INDEX IF NOT EXISTS uq_engagement_proposals_version
  ON public.engagement_proposals (engagement_id, version);
CREATE UNIQUE INDEX IF NOT EXISTS uq_engagement_proposals_one_open
  ON public.engagement_proposals (engagement_id) WHERE status IN ('draft','ready','sent');
CREATE UNIQUE INDEX IF NOT EXISTS uq_engagement_proposals_one_accepted
  ON public.engagement_proposals (engagement_id) WHERE status = 'accepted';
CREATE UNIQUE INDEX IF NOT EXISTS uq_engagement_proposals_one_drafting
  ON public.engagement_proposals (engagement_id) WHERE drafting_status = 'generating';
CREATE UNIQUE INDEX IF NOT EXISTS uq_engagement_proposals_token_hash
  ON public.engagement_proposals (access_token_hash) WHERE access_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_engagement_proposals_engagement_version
  ON public.engagement_proposals (engagement_id, version DESC);

DROP TRIGGER IF EXISTS trg_engagement_proposals_updated_at ON public.engagement_proposals;
CREATE TRIGGER trg_engagement_proposals_updated_at
  BEFORE UPDATE ON public.engagement_proposals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.engagement_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "engagement_proposals_admin_all" ON public.engagement_proposals;
CREATE POLICY "engagement_proposals_admin_all" ON public.engagement_proposals
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. The guard — decision #10 and the transition rules as one mechanism
-- ----------------------------------------------------------------------------
-- BEFORE UPDATE. In order:
--   0. engagement_id and version are immutable, always.
--   1. Transitions are ENUMERATED: draft→ready, ready→draft, ready→sent,
--      sent→accepted, accepted→voided, {draft,ready,sent}→{withdrawn,superseded},
--      any status to itself. Everything else RAISEs proposal_transition_invalid.
--   2. Content columns change ONLY while OLD.status IN (draft, ready)
--      (proposal_content_locked), never while a drafting run is live
--      (proposal_drafting_in_progress — the finalize RPC flips the status in
--      the same statement and passes), and a change on `ready` must return the
--      row to draft (proposal_ready_content_change). The trigger itself bumps
--      content_version on a content change and pins it otherwise.
--   3. Once issued (issued_snapshot present — sent/accepted/voided, and a
--      withdrawn/superseded row that was issued): the snapshot, pdf path/sha,
--      sent_at and delivery_method are immutable; valid_until may only move later.
--   4. Once accepted: accepted_at / accepted_by_name / accepted_via are
--      immutable. Token columns, counters and notification_sent_at stay
--      mutable — access management is separate from the frozen agreement.
CREATE OR REPLACE FUNCTION public.tg_engagement_proposals_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_allowed         boolean;
  v_content_changed boolean;
BEGIN
  IF NEW.engagement_id <> OLD.engagement_id OR NEW.version <> OLD.version THEN
    RAISE EXCEPTION 'proposal_identity_immutable';
  END IF;

  -- 1. transitions
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_allowed :=
         (OLD.status = 'draft'    AND NEW.status IN ('ready','withdrawn','superseded'))
      OR (OLD.status = 'ready'    AND NEW.status IN ('draft','sent','withdrawn','superseded'))
      OR (OLD.status = 'sent'     AND NEW.status IN ('accepted','withdrawn','superseded'))
      OR (OLD.status = 'accepted' AND NEW.status = 'voided');
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'proposal_transition_invalid'
        USING DETAIL = format('%s -> %s', OLD.status, NEW.status);
    END IF;
  END IF;

  -- 2. content
  v_content_changed :=
    (NEW.title, NEW.locale, NEW.currency, NEW.tier, NEW.pricing_mode, NEW.pricing,
     NEW.total_build, NEW.total_monthly, NEW.performance_terms, NEW.data_basis,
     NEW.sections, NEW.brief_id)
    IS DISTINCT FROM
    (OLD.title, OLD.locale, OLD.currency, OLD.tier, OLD.pricing_mode, OLD.pricing,
     OLD.total_build, OLD.total_monthly, OLD.performance_terms, OLD.data_basis,
     OLD.sections, OLD.brief_id);

  IF v_content_changed THEN
    IF OLD.status NOT IN ('draft','ready') THEN
      RAISE EXCEPTION 'proposal_content_locked';
    END IF;
    IF OLD.drafting_status = 'generating' AND NEW.drafting_status = 'generating' THEN
      RAISE EXCEPTION 'proposal_drafting_in_progress';
    END IF;
    IF OLD.status = 'ready' AND NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'proposal_ready_content_change';
    END IF;
    NEW.content_version := OLD.content_version + 1;
  ELSE
    NEW.content_version := OLD.content_version;
  END IF;

  -- 3. issued
  IF OLD.issued_snapshot IS NOT NULL THEN
    IF (NEW.issued_snapshot, NEW.issued_pdf_path, NEW.issued_pdf_sha256, NEW.sent_at, NEW.delivery_method)
       IS DISTINCT FROM
       (OLD.issued_snapshot, OLD.issued_pdf_path, OLD.issued_pdf_sha256, OLD.sent_at, OLD.delivery_method) THEN
      RAISE EXCEPTION 'proposal_issued_fields_locked';
    END IF;
    IF NEW.valid_until IS DISTINCT FROM OLD.valid_until
       AND (NEW.valid_until IS NULL OR NEW.valid_until < OLD.valid_until) THEN
      RAISE EXCEPTION 'proposal_validity_shortened';
    END IF;
  END IF;

  -- 4. accepted
  IF OLD.status IN ('accepted','voided') THEN
    IF (NEW.accepted_at, NEW.accepted_by_name, NEW.accepted_via)
       IS DISTINCT FROM (OLD.accepted_at, OLD.accepted_by_name, OLD.accepted_via) THEN
      RAISE EXCEPTION 'proposal_acceptance_locked';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engagement_proposals_guard ON public.engagement_proposals;
CREATE TRIGGER trg_engagement_proposals_guard
  BEFORE UPDATE ON public.engagement_proposals
  FOR EACH ROW EXECUTE FUNCTION public.tg_engagement_proposals_guard();

-- ----------------------------------------------------------------------------
-- 3. Storage — bucket `engagement-documents`, private, NO storage policies
-- ----------------------------------------------------------------------------
-- Object path: proposals/<engagement_id>/<proposal_id>-v<version>.pdf. Only the
-- service role reads or writes it (no SELECT policy = no client reads).
INSERT INTO storage.buckets (id, name, public)
VALUES ('engagement-documents', 'engagement-documents', false)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. engagement_events.kind — constraint swap, found through the catalog
-- ----------------------------------------------------------------------------
-- The 067 CHECK is inline, so its name is Postgres-generated, and
-- pg_get_constraintdef returns a RECONSTRUCTION (= ANY (ARRAY[…])), never the
-- original IN (…). So: find the CHECK by the column it covers (conkey = the
-- attnum of `kind`), assert exactly one, drop it by name, re-add a superset.
DO $$
DECLARE v_name text; v_count int;
BEGIN
  SELECT count(*), min(c.conname) INTO v_count, v_name
    FROM pg_constraint c
   WHERE c.conrelid = 'public.engagement_events'::regclass
     AND c.contype = 'c'
     AND c.conkey = ARRAY[(SELECT a.attnum FROM pg_attribute a
                            WHERE a.attrelid = c.conrelid AND a.attname = 'kind' AND NOT a.attisdropped)];
  IF v_count <> 1 THEN
    RAISE EXCEPTION '074: expected exactly one CHECK on engagement_events.kind, found %', v_count;
  END IF;
  EXECUTE format('ALTER TABLE public.engagement_events DROP CONSTRAINT %I', v_name);
END $$;

ALTER TABLE public.engagement_events ADD CONSTRAINT engagement_events_kind_check CHECK (kind IN (
  -- the sixteen 067 kinds, verbatim
  'stage_changed','note',
  'questionnaire_drafted','questionnaire_tailored','questionnaire_ready',
  'questionnaire_back_to_draft','questionnaire_sent','questionnaire_opened',
  'questionnaire_submitted','questionnaire_reopened','questionnaire_revoked',
  'questionnaire_reset',
  'brief_generated','brief_failed',
  'notification_sent','notification_failed',
  -- the twelve proposal kinds
  'proposal_drafted','proposal_ai_drafted','proposal_ai_failed','proposal_ready','proposal_back_to_draft',
  'proposal_sent','proposal_opened','proposal_accepted','proposal_acceptance_voided',
  'proposal_withdrawn','proposal_superseded','proposal_revoked'
));

-- ----------------------------------------------------------------------------
-- 5. tg_engagements_stage_sync — amended: the terminal sweep withdraws every
--    OPEN proposal. Body copied from 067 verbatim; only the marked block is new.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_engagements_stage_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_p record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.leads SET sales_stage = 'qualified' WHERE id = OLD.lead_id;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.stage IS NOT DISTINCT FROM OLD.stage THEN
    RETURN NEW;
  END IF;

  -- Writes EXACTLY the mapped value, so it satisfies the guard by construction.
  UPDATE public.leads
     SET sales_stage = public.engagement_sales_stage_for(NEW.stage)
   WHERE id = NEW.lead_id;

  INSERT INTO public.engagement_events (engagement_id, kind, actor, from_stage, to_stage, summary)
  VALUES (
    NEW.id,
    'stage_changed',
    'admin',
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.stage ELSE NULL END,
    NEW.stage,
    CASE WHEN TG_OP = 'INSERT'
         THEN 'Engagement started'
         ELSE format('Stage changed: %s → %s', OLD.stage, NEW.stage)
    END
  );

  IF NEW.stage IN ('lost','closed') THEN
    UPDATE public.engagement_questionnaires
       SET token_revoked_at = now(), updated_at = now()
     WHERE engagement_id = NEW.id
       AND access_token_hash IS NOT NULL
       AND status <> 'submitted'
       AND token_revoked_at IS NULL;

    -- 074: withdraw every open proposal (draft|ready|sent). accepted/voided
    -- rows are untouched — a closed care plan keeps its contract. The
    -- engagement row is already locked by the UPDATE that fired this trigger,
    -- so this honours the engagement -> proposal lock order. Reopening does
    -- not undo it; Ryan revises explicitly.
    FOR v_p IN
      SELECT p.id, p.version
        FROM public.engagement_proposals p
       WHERE p.engagement_id = NEW.id AND p.status IN ('draft','ready','sent')
       ORDER BY p.version
       FOR UPDATE
    LOOP
      UPDATE public.engagement_proposals
         SET status = 'withdrawn',
             withdrawn_at = now(),
             token_revoked_at = CASE WHEN access_token_hash IS NOT NULL
                                     THEN COALESCE(token_revoked_at, now()) ELSE NULL END,
             updated_at = now()
       WHERE id = v_p.id;

      INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data)
      VALUES (NEW.id, 'proposal_withdrawn', 'system',
              format('Proposal v%s withdrawn — engagement marked %s', v_p.version, NEW.stage),
              jsonb_build_object('proposal_id', v_p.id, 'version', v_p.version, 'reason', NEW.stage));
    END LOOP;

    UPDATE public.engagement_events
       SET resolved_at = now()
     WHERE engagement_id = NEW.id
       AND needs_attention
       AND resolved_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. engagement_list — replaced; nine proposal columns APPENDED (CREATE OR
--    REPLACE VIEW may only append), from the LATEST-version proposal.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.engagement_list
WITH (security_invoker = true)
AS
SELECT
  e.id,
  e.lead_id,
  e.title,
  e.locale,
  e.stage,
  e.stage_entered_at,
  e.created_at,
  e.updated_at,
  e.tier,
  e.client_contact_name,
  e.client_contact_email,
  e.next_action,
  e.next_action_due_at,
  e.won_at,
  e.ended_at,
  q.id                  AS discovery_id,
  q.status              AS discovery_status,
  q.sent_at             AS discovery_sent_at,
  q.submitted_at        AS discovery_submitted_at,
  q.token_expires_at    AS discovery_token_expires_at,
  q.token_revoked_at    AS discovery_token_revoked_at,
  CASE WHEN q.id IS NULL THEN 0
       ELSE (SELECT count(*)::int FROM jsonb_array_elements(q.questions)) END
                        AS discovery_question_count,
  COALESCE((
    SELECT count(*)::int
      FROM public.engagement_questionnaire_answers a
     WHERE a.questionnaire_id = q.id
       AND a.questions_version = q.questions_version
       AND public.engagement_answer_is_present(a.answer, a.other_text)
  ), 0)                 AS discovery_answered_count,
  b.status              AS latest_brief_status,
  (SELECT max(ev.created_at) FROM public.engagement_events ev WHERE ev.engagement_id = e.id)
                        AS last_activity_at,
  COALESCE((
    SELECT count(*)::int FROM public.engagement_events ev
     WHERE ev.engagement_id = e.id AND ev.needs_attention AND ev.resolved_at IS NULL
  ), 0)                 AS open_attention_count,
  p.id                  AS proposal_id,
  p.version             AS proposal_version,
  p.status              AS proposal_status,
  p.sent_at             AS proposal_sent_at,
  p.accepted_at         AS proposal_accepted_at,
  p.total_build         AS proposal_total_build,
  p.currency            AS proposal_currency,
  p.open_count          AS proposal_open_count,
  p.first_opened_at     AS proposal_first_opened_at
FROM public.engagements e
LEFT JOIN public.engagement_questionnaires q
       ON q.engagement_id = e.id AND q.kind = 'discovery'
LEFT JOIN LATERAL (
  SELECT b2.status
    FROM public.engagement_briefs b2
   WHERE b2.engagement_id = e.id
   ORDER BY b2.created_at DESC
   LIMIT 1
) b ON true
LEFT JOIN LATERAL (
  SELECT p2.id, p2.version, p2.status, p2.sent_at, p2.accepted_at, p2.total_build, p2.currency,
         p2.open_count, p2.first_opened_at
    FROM public.engagement_proposals p2
   WHERE p2.engagement_id = e.id
   ORDER BY p2.version DESC
   LIMIT 1
) p ON true;

-- ----------------------------------------------------------------------------
-- 7. RPCs — SECURITY DEFINER, search_path = '', service_role EXECUTE only
-- ----------------------------------------------------------------------------

-- create_engagement_proposal — creation AND revision, one transaction.
--   (1) lock the ENGAGEMENT; (2) engagement_terminal; (3) proposal_already_accepted
--   (void it first); (4) THE HARD GATE with provenance: the discovery
--   questionnaire is submitted (discovery_not_submitted); p_brief_id names a
--   completed|partial brief OF THIS ENGAGEMENT (brief_missing) generated from
--   the CURRENT submission (brief_stale); (5) supersede the open row if asked
--   (proposal_not_open otherwise); (6) version = max + 1; (7) insert with the
--   engagement's locale; (8) proposal_drafted; (9) superseded_by; return id.
--   A second open proposal without a supersede hits
--   uq_engagement_proposals_one_open -> 23505.
CREATE OR REPLACE FUNCTION public.create_engagement_proposal(
  p_engagement_id     uuid,
  p_title             text,
  p_currency          text,
  p_tier              text,
  p_pricing_mode      text,
  p_pricing           jsonb,
  p_total_build       int,
  p_total_monthly     int,
  p_performance_terms jsonb,
  p_sections          jsonb,
  p_data_basis        text,
  p_brief_id          uuid,
  p_source_snapshot   jsonb DEFAULT NULL,
  p_supersede_id      uuid  DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_e       public.engagements%ROWTYPE;
  v_q       public.engagement_questionnaires%ROWTYPE;
  v_b       public.engagement_briefs%ROWTYPE;
  v_old     public.engagement_proposals%ROWTYPE;
  v_version int;
  v_id      uuid;
BEGIN
  SELECT * INTO v_e FROM public.engagements WHERE id = p_engagement_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'engagement_not_found';
  END IF;
  IF v_e.stage IN ('lost','closed') THEN
    RAISE EXCEPTION 'engagement_terminal';
  END IF;
  IF EXISTS (SELECT 1 FROM public.engagement_proposals x
              WHERE x.engagement_id = p_engagement_id AND x.status = 'accepted') THEN
    RAISE EXCEPTION 'proposal_already_accepted';
  END IF;

  -- The hard gate (decision #5), with provenance.
  SELECT * INTO v_q FROM public.engagement_questionnaires
   WHERE engagement_id = p_engagement_id AND kind = 'discovery';
  IF NOT FOUND OR v_q.status <> 'submitted' OR v_q.submitted_at IS NULL THEN
    RAISE EXCEPTION 'discovery_not_submitted';
  END IF;
  IF p_brief_id IS NULL THEN
    RAISE EXCEPTION 'brief_missing';
  END IF;
  SELECT * INTO v_b FROM public.engagement_briefs
   WHERE id = p_brief_id AND engagement_id = p_engagement_id AND status IN ('completed','partial');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'brief_missing';
  END IF;
  IF v_b.questionnaire_id IS DISTINCT FROM v_q.id OR v_b.created_at < v_q.submitted_at THEN
    RAISE EXCEPTION 'brief_stale';
  END IF;

  -- Revision: retire the open row (engagement lock is already held).
  IF p_supersede_id IS NOT NULL THEN
    SELECT * INTO v_old FROM public.engagement_proposals WHERE id = p_supersede_id FOR UPDATE;
    IF NOT FOUND OR v_old.engagement_id <> p_engagement_id
       OR v_old.status NOT IN ('draft','ready','sent') THEN
      RAISE EXCEPTION 'proposal_not_open';
    END IF;
    UPDATE public.engagement_proposals
       SET status = 'superseded',
           superseded_at = now(),
           token_revoked_at = CASE WHEN access_token_hash IS NOT NULL
                                   THEN COALESCE(token_revoked_at, now()) ELSE NULL END,
           updated_at = now()
     WHERE id = v_old.id;
    INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data)
    VALUES (p_engagement_id, 'proposal_superseded', 'admin',
            format('Proposal v%s superseded by a revision', v_old.version),
            jsonb_build_object('proposal_id', v_old.id, 'version', v_old.version));
  END IF;

  SELECT COALESCE(max(version), 0) + 1 INTO v_version
    FROM public.engagement_proposals WHERE engagement_id = p_engagement_id;

  INSERT INTO public.engagement_proposals
    (engagement_id, version, locale, title, currency, tier, pricing_mode, pricing,
     total_build, total_monthly, performance_terms, data_basis, brief_id, sections, source_snapshot)
  VALUES
    (p_engagement_id, v_version, v_e.locale, p_title, p_currency, p_tier, p_pricing_mode, p_pricing,
     p_total_build, p_total_monthly, p_performance_terms, p_data_basis, p_brief_id, p_sections, p_source_snapshot)
  RETURNING id INTO v_id;

  INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data)
  VALUES (p_engagement_id, 'proposal_drafted', 'admin',
          CASE WHEN p_supersede_id IS NULL
               THEN format('Proposal v%s created (%s, %s)', v_version, p_tier, p_currency)
               ELSE format('Proposal v%s created as a revision of v%s', v_version, v_old.version) END,
          jsonb_build_object('proposal_id', v_id, 'version', v_version,
                             'supersedes', CASE WHEN p_supersede_id IS NULL THEN NULL ELSE v_old.id END));

  IF p_supersede_id IS NOT NULL THEN
    UPDATE public.engagement_proposals SET superseded_by = v_id, updated_at = now() WHERE id = v_old.id;
  END IF;

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_engagement_proposal(
  uuid, text, text, text, text, jsonb, int, int, jsonb, jsonb, text, uuid, jsonb, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_engagement_proposal(
  uuid, text, text, text, text, jsonb, int, int, jsonb, jsonb, text, uuid, jsonb, uuid
) TO service_role;

-- issue_engagement_proposal — THE FREEZE, ready -> sent.
--   (1) lock engagement -> lock proposal; (2) status = ready else not_ready;
--   (3) CAS on BOTH sources of the snapshot (content_version + engagement
--   updated_at) else stale — the caller built the snapshot and the PDF from
--   exactly those two reads; (4) mandatory sections in SQL on the locked row
--   (proposal_incomplete); (5) delivery shape; (6) the write; (7) proposal_sent.
--   The event carries NO hash (the RLS suite scans event data for 64-hex).
CREATE OR REPLACE FUNCTION public.issue_engagement_proposal(
  p_proposal_id           uuid,
  p_content_version       int,
  p_engagement_updated_at timestamptz,
  p_issued_snapshot       jsonb,
  p_pdf_path              text,
  p_pdf_sha256            text,
  p_delivery              text,
  p_token_hash            text,
  p_token_expires_at      timestamptz,
  p_valid_until           date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_eid        uuid;
  v_e          public.engagements%ROWTYPE;
  v_p          public.engagement_proposals%ROWTYPE;
  v_required   int;
  v_valid      date;
BEGIN
  SELECT engagement_id INTO v_eid FROM public.engagement_proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal_not_found';
  END IF;
  SELECT * INTO v_e FROM public.engagements WHERE id = v_eid FOR UPDATE;
  SELECT * INTO v_p FROM public.engagement_proposals WHERE id = p_proposal_id FOR UPDATE;

  IF v_p.status <> 'ready' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_ready');
  END IF;
  IF v_p.content_version <> p_content_version OR v_e.updated_at <> p_engagement_updated_at THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'stale');
  END IF;

  IF p_issued_snapshot IS NULL OR jsonb_typeof(p_issued_snapshot) <> 'object'
     OR p_pdf_path IS NULL OR p_pdf_sha256 IS NULL THEN
    RAISE EXCEPTION 'issue_snapshot_required';
  END IF;

  -- The four mandatory sections, on the LOCKED row (the TS check is UX).
  SELECT count(*) INTO v_required
    FROM jsonb_array_elements(v_p.sections) s
   WHERE s ->> 'key' IN ('exec_summary','recommendation','scope','terms')
     AND COALESCE(btrim(s ->> 'body_md'), '') <> '';
  IF jsonb_typeof(v_p.sections) <> 'array' OR jsonb_array_length(v_p.sections) <> 7 OR v_required <> 4 THEN
    RAISE EXCEPTION 'proposal_incomplete';
  END IF;

  IF p_delivery = 'link' THEN
    IF p_token_hash IS NULL OR p_token_expires_at IS NULL THEN
      RAISE EXCEPTION 'issue_delivery_shape';
    END IF;
  ELSIF p_delivery = 'manual' THEN
    IF p_token_hash IS NOT NULL OR p_token_expires_at IS NOT NULL THEN
      RAISE EXCEPTION 'issue_delivery_shape';
    END IF;
  ELSE
    RAISE EXCEPTION 'issue_delivery_shape';
  END IF;

  v_valid := COALESCE(p_valid_until, v_p.valid_until, (now() AT TIME ZONE 'Pacific/Honolulu')::date + 30);

  UPDATE public.engagement_proposals
     SET status            = 'sent',
         sent_at           = now(),
         delivery_method   = p_delivery,
         issued_snapshot   = p_issued_snapshot,
         issued_pdf_path   = p_pdf_path,
         issued_pdf_sha256 = p_pdf_sha256,
         access_token_hash = p_token_hash,
         token_issued_at   = CASE WHEN p_token_hash IS NULL THEN NULL ELSE now() END,
         token_expires_at  = p_token_expires_at,
         token_revoked_at  = NULL,
         valid_until       = v_valid,
         updated_at        = now()
   WHERE id = v_p.id;

  INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data)
  VALUES (v_eid, 'proposal_sent', 'admin',
          CASE WHEN p_delivery = 'link'
               THEN format('Proposal v%s issued — link sent', v_p.version)
               ELSE format('Proposal v%s issued for manual delivery', v_p.version) END,
          jsonb_build_object('proposal_id', v_p.id, 'version', v_p.version, 'delivery', p_delivery,
                             'emailed', NULL, 'expires_at', p_token_expires_at, 'valid_until', v_valid));

  RETURN jsonb_build_object('applied', true, 'valid_until', v_valid);
END;
$$;
REVOKE ALL ON FUNCTION public.issue_engagement_proposal(
  uuid, int, timestamptz, jsonb, text, text, text, text, timestamptz, date
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_engagement_proposal(
  uuid, int, timestamptz, jsonb, text, text, text, text, timestamptz, date
) TO service_role;

-- touch_engagement_proposal_open — the touch_engagement_questionnaire_open
-- mould: bump the counters, proposal_opened ONLY on the first open, NO status
-- flip. Touches only the proposal row (no engagement lock).
CREATE OR REPLACE FUNCTION public.touch_engagement_proposal_open(p_proposal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_engagement uuid;
  v_version    int;
  v_first      boolean;
BEGIN
  SELECT p.engagement_id, p.version, (p.first_opened_at IS NULL)
    INTO v_engagement, v_version, v_first
    FROM public.engagement_proposals p
   WHERE p.id = p_proposal_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal_not_found';
  END IF;

  UPDATE public.engagement_proposals
     SET open_count      = open_count + 1,
         first_opened_at = COALESCE(first_opened_at, now()),
         last_opened_at  = now(),
         updated_at      = now()
   WHERE id = p_proposal_id;

  IF v_first THEN
    INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data)
    VALUES (v_engagement, 'proposal_opened', 'client',
            format('Client opened proposal v%s', v_version),
            jsonb_build_object('proposal_id', p_proposal_id, 'version', v_version));
  END IF;

  RETURN jsonb_build_object('first_open', v_first);
END;
$$;
REVOKE ALL ON FUNCTION public.touch_engagement_proposal_open(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_engagement_proposal_open(uuid) TO service_role;

-- accept_engagement_proposal — THE WHOLE ACCEPTANCE IS THIS ONE TRANSACTION.
--   (1) read engagement_id unlocked; (2) lock ENGAGEMENT, engagement_terminal;
--   (3) lock PROPOSAL; (4) already_accepted / not_open (the admin path accepts
--   only an ISSUED proposal); (5) client credential re-validation on the
--   locked row (forbidden) — a revoke/rotate committed before this lock was
--   obtained wins; admin passes no hash; (6) client only: valid_until expiry
--   (the admin path may accept late on purpose); (7) name 1..200;
--   (8) proposal -> accepted, nothing else changes (the token stays live);
--   (9) engagement money + stage (067 triggers do won_at / event / mirror);
--   (10) proposal_accepted with needs_attention; (11) return.
CREATE OR REPLACE FUNCTION public.accept_engagement_proposal(
  p_proposal_id      uuid,
  p_accepted_by_name text,
  p_via              text,
  p_token_hash       text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_eid   uuid;
  v_e     public.engagements%ROWTYPE;
  v_p     public.engagement_proposals%ROWTYPE;
  v_name  text;
  v_moved boolean;
BEGIN
  IF p_via IS NULL OR p_via NOT IN ('client','admin') THEN
    RAISE EXCEPTION 'accept_engagement_proposal: p_via must be client|admin (got %)', COALESCE(p_via, 'null');
  END IF;
  IF p_via = 'admin' AND p_token_hash IS NOT NULL THEN
    RAISE EXCEPTION 'accept_admin_token_not_allowed';
  END IF;

  SELECT engagement_id INTO v_eid FROM public.engagement_proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal_not_found';
  END IF;

  SELECT * INTO v_e FROM public.engagements WHERE id = v_eid FOR UPDATE;
  IF v_e.stage IN ('lost','closed') THEN
    RAISE EXCEPTION 'engagement_terminal';
  END IF;

  SELECT * INTO v_p FROM public.engagement_proposals WHERE id = p_proposal_id FOR UPDATE;

  IF v_p.status = 'accepted' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'already_accepted');
  END IF;
  IF v_p.status <> 'sent' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_open');
  END IF;

  IF p_via = 'client' THEN
    IF p_token_hash IS NULL
       OR v_p.access_token_hash IS NULL
       OR p_token_hash <> v_p.access_token_hash
       OR v_p.token_revoked_at IS NOT NULL
       OR v_p.token_expires_at IS NULL
       OR v_p.token_expires_at <= now() THEN
      RETURN jsonb_build_object('applied', false, 'reason', 'forbidden');
    END IF;
    IF v_p.valid_until IS NOT NULL AND v_p.valid_until < (now() AT TIME ZONE 'Pacific/Honolulu')::date THEN
      RETURN jsonb_build_object('applied', false, 'reason', 'expired');
    END IF;
  END IF;

  v_name := btrim(COALESCE(p_accepted_by_name, ''));
  IF char_length(v_name) < 1 OR char_length(v_name) > 200 THEN
    RAISE EXCEPTION 'accepted_by_required';
  END IF;

  UPDATE public.engagement_proposals
     SET status           = 'accepted',
         accepted_at      = now(),
         accepted_by_name = v_name,
         accepted_via     = p_via,
         updated_at       = now()
   WHERE id = v_p.id;

  v_moved := v_e.stage IN ('discovery','proposal');
  UPDATE public.engagements
     SET tier           = v_p.tier,
         currency       = v_p.currency,
         contract_value = v_p.total_build,
         care_mrr       = v_p.total_monthly,
         stage          = CASE WHEN stage IN ('discovery','proposal') THEN 'build' ELSE stage END
   WHERE id = v_eid;

  INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data, needs_attention)
  VALUES (v_eid, 'proposal_accepted', p_via,
          format('Proposal v%s accepted by %s (%s)%s', v_p.version, v_name, p_via,
                 CASE WHEN v_moved THEN ' — engagement moved to Build' ELSE '' END),
          jsonb_build_object('proposal_id', v_p.id, 'version', v_p.version,
                             'total_build', v_p.total_build, 'total_monthly', v_p.total_monthly,
                             'currency', v_p.currency, 'stage_moved', v_moved),
          true);

  RETURN jsonb_build_object('applied', true, 'engagement_id', v_eid, 'stage_moved', v_moved);
END;
$$;
REVOKE ALL ON FUNCTION public.accept_engagement_proposal(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_engagement_proposal(uuid, text, text, text) TO service_role;

-- void_engagement_proposal_acceptance — the audited correction.
--   lock engagement -> lock proposal; accepted else not_accepted; reason
--   1..1000; proposal -> voided (token revoked); engagement money cleared,
--   build -> proposal (launch|care are not yanked back; tier/currency stay —
--   Ryan chose them too); won_at is LEFT as 067 defines it and the event
--   records won_at_retained: true. The accepted slot is now free.
CREATE OR REPLACE FUNCTION public.void_engagement_proposal_acceptance(
  p_proposal_id uuid,
  p_reason      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_eid      uuid;
  v_e        public.engagements%ROWTYPE;
  v_p        public.engagement_proposals%ROWTYPE;
  v_reason   text;
  v_reverted boolean;
BEGIN
  SELECT engagement_id INTO v_eid FROM public.engagement_proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal_not_found';
  END IF;
  SELECT * INTO v_e FROM public.engagements WHERE id = v_eid FOR UPDATE;
  SELECT * INTO v_p FROM public.engagement_proposals WHERE id = p_proposal_id FOR UPDATE;

  IF v_p.status <> 'accepted' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_accepted');
  END IF;

  v_reason := btrim(COALESCE(p_reason, ''));
  IF char_length(v_reason) < 1 OR char_length(v_reason) > 1000 THEN
    RAISE EXCEPTION 'void_reason_required';
  END IF;

  UPDATE public.engagement_proposals
     SET status           = 'voided',
         voided_at        = now(),
         void_reason      = v_reason,
         token_revoked_at = CASE WHEN access_token_hash IS NOT NULL
                                 THEN COALESCE(token_revoked_at, now()) ELSE NULL END,
         updated_at       = now()
   WHERE id = v_p.id;

  v_reverted := v_e.stage = 'build';
  UPDATE public.engagements
     SET contract_value = NULL,
         care_mrr       = NULL,
         stage          = CASE WHEN stage = 'build' THEN 'proposal' ELSE stage END
   WHERE id = v_eid;

  INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data, needs_attention)
  VALUES (v_eid, 'proposal_acceptance_voided', 'admin',
          format('Acceptance of proposal v%s voided — %s%s', v_p.version, v_reason,
                 CASE WHEN v_reverted THEN ' (engagement returned to Proposal; won_at retained)' ELSE ' (won_at retained)' END),
          jsonb_build_object('proposal_id', v_p.id, 'version', v_p.version, 'reason', v_reason,
                             'stage_reverted', v_reverted, 'won_at_retained', true),
          true);

  RETURN jsonb_build_object('applied', true, 'stage_reverted', v_reverted);
END;
$$;
REVOKE ALL ON FUNCTION public.void_engagement_proposal_acceptance(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.void_engagement_proposal_acceptance(uuid, text) TO service_role;

-- finalize_engagement_proposal_draft — the CAS off (drafting_status =
-- 'generating' AND drafting_run_id = p_run_id). `completed` additionally
-- requires status = draft (proposal_not_draft) and content_version =
-- drafting_input_version — otherwise it records failed/stale_input instead of
-- applying (belt over the guard's braces). p_ai_sections is an OBJECT keyed by
-- the five AI-owned section keys; the RPC rebuilds `sections` by replacing
-- body_md for those keys only, preserving titles, order, terms and next_steps.
-- Touches only the proposal row (no engagement lock).
CREATE OR REPLACE FUNCTION public.finalize_engagement_proposal_draft(
  p_proposal_id      uuid,
  p_run_id           uuid,
  p_status           text,
  p_ai_sections      jsonb DEFAULT NULL,
  p_source_snapshot  jsonb DEFAULT NULL,
  p_model_id         text  DEFAULT NULL,
  p_pipeline_version text  DEFAULT NULL,
  p_drafting_error   text  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_p        public.engagement_proposals%ROWTYPE;
  v_sections jsonb;
  v_key      text;
  v_bad      int;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('completed','failed') THEN
    RAISE EXCEPTION 'finalize_engagement_proposal_draft: p_status must be completed|failed (got %)',
      COALESCE(p_status, 'null');
  END IF;
  IF p_run_id IS NULL THEN
    RAISE EXCEPTION 'finalize_engagement_proposal_draft: p_run_id is required';
  END IF;

  SELECT * INTO v_p FROM public.engagement_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal_not_found';
  END IF;
  IF v_p.drafting_status <> 'generating' OR v_p.drafting_run_id IS DISTINCT FROM p_run_id THEN
    RETURN jsonb_build_object('applied', false);
  END IF;

  IF p_status = 'completed' THEN
    IF v_p.status <> 'draft' THEN
      RAISE EXCEPTION 'proposal_not_draft';
    END IF;
    IF p_ai_sections IS NULL OR jsonb_typeof(p_ai_sections) <> 'object'
       OR p_model_id IS NULL OR p_pipeline_version IS NULL THEN
      RAISE EXCEPTION 'finalize_engagement_proposal_draft: completed requires ai_sections{}, model_id and pipeline_version';
    END IF;
    -- Only the five AI keys, each a string.
    SELECT count(*) INTO v_bad
      FROM jsonb_each(p_ai_sections) kv
     WHERE kv.key NOT IN ('exec_summary','takeaways','recommendation','scope','investment_notes')
        OR jsonb_typeof(kv.value) <> 'string';
    IF v_bad > 0 THEN
      RAISE EXCEPTION 'finalize_engagement_proposal_draft: ai_sections must map the five AI keys to strings';
    END IF;

    IF v_p.content_version IS DISTINCT FROM v_p.drafting_input_version THEN
      UPDATE public.engagement_proposals
         SET drafting_status           = 'failed',
             drafting_error            = 'stale_input',
             drafting_model_id         = COALESCE(p_model_id, drafting_model_id),
             drafting_pipeline_version = COALESCE(p_pipeline_version, drafting_pipeline_version),
             updated_at                = now()
       WHERE id = v_p.id;
      INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data, needs_attention)
      VALUES (v_p.engagement_id, 'proposal_ai_failed', 'system',
              format('AI draft of proposal v%s discarded — the proposal changed while it ran; re-draft', v_p.version),
              jsonb_build_object('proposal_id', v_p.id, 'version', v_p.version, 'drafting_error', 'stale_input'),
              true);
      RETURN jsonb_build_object('applied', true, 'status', 'failed', 'drafting_error', 'stale_input');
    END IF;

    SELECT jsonb_agg(
             CASE WHEN p_ai_sections ? (t.s ->> 'key')
                  THEN jsonb_set(t.s, '{body_md}', p_ai_sections -> (t.s ->> 'key'))
                  ELSE t.s END
             ORDER BY t.ord)
      INTO v_sections
      FROM jsonb_array_elements(v_p.sections) WITH ORDINALITY AS t(s, ord);

    UPDATE public.engagement_proposals
       SET sections                  = v_sections,
           drafting_status           = 'completed',
           drafted_at                = now(),
           drafting_error            = NULL,
           drafting_model_id         = p_model_id,
           drafting_pipeline_version = p_pipeline_version,
           source_snapshot           = COALESCE(p_source_snapshot, source_snapshot),
           updated_at                = now()
     WHERE id = v_p.id;

    INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data)
    VALUES (v_p.engagement_id, 'proposal_ai_drafted', 'system',
            format('Proposal v%s narrative drafted by AI — review before marking ready', v_p.version),
            jsonb_build_object('proposal_id', v_p.id, 'version', v_p.version, 'model_id', p_model_id));
  ELSE
    IF p_drafting_error IS NULL THEN
      RAISE EXCEPTION 'finalize_engagement_proposal_draft: failed requires drafting_error';
    END IF;
    UPDATE public.engagement_proposals
       SET drafting_status           = 'failed',
           drafting_error            = p_drafting_error,
           drafting_model_id         = COALESCE(p_model_id, drafting_model_id),
           drafting_pipeline_version = COALESCE(p_pipeline_version, drafting_pipeline_version),
           updated_at                = now()
     WHERE id = v_p.id;
    INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data, needs_attention)
    VALUES (v_p.engagement_id, 'proposal_ai_failed', 'system',
            format('AI draft of proposal v%s failed (%s) — re-draft from the proposal panel', v_p.version, p_drafting_error),
            jsonb_build_object('proposal_id', v_p.id, 'version', v_p.version, 'drafting_error', p_drafting_error),
            true);
  END IF;

  RETURN jsonb_build_object('applied', true, 'status', p_status);
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_engagement_proposal_draft(
  uuid, uuid, text, jsonb, jsonb, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_engagement_proposal_draft(
  uuid, uuid, text, jsonb, jsonb, text, text, text
) TO service_role;

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-migration verification (run in the SQL editor after applying):
--
-- 1. The table exists, RLS on, exactly one policy (expect 1 row, rowsecurity = true,
--    and 1 policy row):
--      select tablename, rowsecurity from pg_tables
--       where schemaname = 'public' and tablename = 'engagement_proposals';
--      select policyname, cmd from pg_policies
--       where schemaname = 'public' and tablename = 'engagement_proposals';
--
-- 2. The shape constraints exist — CREATE TABLE IF NOT EXISTS would silently
--    skip them on a pre-existing table (expect 6 rows):
--      select conname from pg_constraint
--       where conname in ('engagement_proposals_totals_match_ck',
--                         'engagement_proposals_sections_shape_ck',
--                         'engagement_proposals_mode_shape_ck',
--                         'engagement_proposals_drafting_anchor_ck',
--                         'engagement_proposals_token_shape_ck',
--                         'engagement_proposals_status_shape_ck');
--
-- 3. The six RPCs are service-role only. For each, expect exactly service_role
--    and postgres — NEITHER anon NOR authenticated:
--      select routine_name, grantee from information_schema.routine_privileges
--       where routine_schema = 'public'
--         and routine_name in ('create_engagement_proposal','issue_engagement_proposal',
--                              'touch_engagement_proposal_open','accept_engagement_proposal',
--                              'void_engagement_proposal_acceptance',
--                              'finalize_engagement_proposal_draft')
--       order by routine_name, grantee;
--
-- 4. The view carries the nine new columns (expect 9 rows):
--      select column_name from information_schema.columns
--       where table_schema = 'public' and table_name = 'engagement_list'
--         and column_name like 'proposal_%';
--
-- 5. Exactly one CHECK covers engagement_events.kind and it accepts the new
--    kinds (expect 1 row named engagement_events_kind_check whose definition
--    contains 'proposal_accepted'):
--      select c.conname, pg_get_constraintdef(c.oid) like '%proposal_accepted%' as has_new_kinds
--        from pg_constraint c
--       where c.conrelid = 'public.engagement_events'::regclass and c.contype = 'c'
--         and c.conkey = array[(select a.attnum from pg_attribute a
--                                where a.attrelid = c.conrelid and a.attname = 'kind')];
--
-- 6. The guard and the amended sweep are armed (expect 2 rows):
--      select tgname from pg_trigger
--       where tgname in ('trg_engagement_proposals_guard','trg_engagements_stage_sync');
--
-- 7. The bucket exists and is private (expect 1 row, public = false):
--      select id, public from storage.buckets where id = 'engagement-documents';
--
-- 8. As anon / an ordinary authenticated user, the table is empty or denied:
--      select * from public.engagement_proposals;   -- 0 rows / permission denied
-- ----------------------------------------------------------------------------
