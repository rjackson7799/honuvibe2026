-- ============================================================================
-- 067_studio_engagement.sql — Studio engagement spine + client discovery
-- ============================================================================
-- Plan: docs/plans/2026-09-04-studio-engagement-spine.md (rev 2, approved).
--
-- Five tables behind /admin/studio/engagements:
--   engagements                      — the client record. Opens from a QUALIFIED
--                                      lead (start_engagement) and owns the stage
--                                      discovery → proposal → build → launch → care,
--                                      plus two terminal stages: lost and closed.
--   engagement_events                — append-only timeline (stage changes are
--                                      trigger-written so they cannot be missed;
--                                      needs_attention is asserted at write time).
--   engagement_questionnaires        — ONE row per (engagement, kind). Questions
--                                      are a jsonb manifest on the row; the token
--                                      is stored ONLY as a sha256 hash.
--   engagement_questionnaire_answers — one row per answered question (the
--                                      discovery_responses idiom: concurrent
--                                      autosaves touch different rows).
--   engagement_briefs                — one row per AI discovery-brief run
--                                      (generating → completed | partial | failed),
--                                      the lead_audits idiom; retry = new row.
--
-- THE MIRROR. Once an engagement exists, its `stage` is the single source of
-- truth and a trigger writes leads.sales_stage = engagement_sales_stage_for(stage)
-- so the existing /admin/studio/leads list + chips keep working:
--   discovery -> qualified   proposal -> proposal
--   build | launch | care | closed -> won      lost -> lost
-- Protection: (1) tg_engagements_stage_sync is the ONLY writer of
-- leads.sales_stage once an engagement exists; (2) engagement_sales_stage_for is
-- the ONE encoding — lib/studio/engagement/stages.ts is pinned to it by a parity
-- test; (3) trg_leads_sales_stage_engagement_guard RAISEs on any conflicting
-- direct write, INCLUDING by the service role (triggers are not RLS); (4) the
-- lead form no longer sends sales_stage; (5) the RLS suite asserts zero drift
-- after a randomised transition sequence. There is deliberately NO session-GUC
-- bypass flag: the mirror satisfies the guard by construction.
--
-- NOT MIRRORED, NOT TOUCHED: leads.lifecycle is the discovery engine's system
-- status and means something entirely different — do not wire it up. Likewise
-- leads.sales_stage's CHECK is NOT tightened: prod rows already sit at
-- proposal/won, and the mirror is what gives those values meaning now.
--
-- RLS: every table carries a single *_admin_all policy and NO anon/member policy
-- (the discovery_sessions idiom). The anonymous client reaches its questionnaire
-- only through a service-role route that has already verified the token hash —
-- an RLS predicate cannot see a cookie. The engagement_list view is
-- security_invoker, so it inherits the base tables' RLS.
--
-- RPCs are SECURITY DEFINER, SET search_path = '', service_role EXECUTE only.
-- Trigger functions are SECURITY DEFINER too, so the derived writes they perform
-- (the mirror, the event row, token revocation) never depend on the caller's
-- policies; they only ever fire on a row the caller was already allowed to write.
--
-- NUMBERING: 066_blue_filler.sql is the highest committed file (065 is present
-- but uncommitted), so this is 067.
--
-- ROLLOUT — APPLY BEFORE THE PUSH (like 062/064, unlike 060/061). Prod
-- migrations are NOT run by the Vercel build. Apply THIS file manually in the
-- Supabase dashboard SQL editor on project zvfwtndbxshrtpwcwynw, THEN push.
-- Reason: the slice-1 code's leads list embeds `engagements(...)` and the lead
-- workspace reads the engagement, so a deploy ahead of this schema 500s the
-- EXISTING /admin/studio/leads pages, not just the new engagement routes.
-- Applying first is zero-risk: everything here is additive, and the
-- leads.sales_stage guard is inert until an engagement row exists (the old
-- lead form's unconditional sales_stage write passes it). This one migration
-- covers BOTH build slices (spine + discovery), so there is only one apply.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. The stage map — the ONE encoding of engagement stage -> leads.sales_stage.
--    IMMUTABLE, RAISEs on an unknown stage, never returns NULL (leads.sales_stage
--    is NOT NULL). Left callable by every role: side-effect free, and the RLS
--    parity test calls it as admin.
-- ----------------------------------------------------------------------------
-- The CASE's ELSE is NULL; the explicit check turns an unknown stage into a loud
-- error rather than a NULL that would then violate leads.sales_stage NOT NULL.
CREATE OR REPLACE FUNCTION public.engagement_sales_stage_for(p_stage text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_mapped text;
BEGIN
  v_mapped := CASE p_stage
    WHEN 'discovery' THEN 'qualified'
    WHEN 'proposal'  THEN 'proposal'
    WHEN 'build'     THEN 'won'
    WHEN 'launch'    THEN 'won'
    WHEN 'care'      THEN 'won'
    WHEN 'closed'    THEN 'won'
    WHEN 'lost'      THEN 'lost'
    ELSE NULL
  END;
  IF v_mapped IS NULL THEN
    RAISE EXCEPTION 'engagement_sales_stage_for: unknown engagement stage %',
      COALESCE(p_stage, 'null');
  END IF;
  RETURN v_mapped;
END;
$$;

-- "Is this stored answer a real answer?" — shared by the submit RPC's required
-- check and the engagement_list view's answered count, so the two can never
-- disagree. A string answer of '__other' (the reserved allow_other sentinel,
-- see lib/studio/engagement/questions-schema.ts) counts only with other_text.
CREATE OR REPLACE FUNCTION public.engagement_answer_is_present(p_answer jsonb, p_other_text text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_answer IS NULL THEN false
    WHEN jsonb_typeof(p_answer) = 'string' THEN
      btrim(p_answer #>> '{}') <> ''
      AND ((p_answer #>> '{}') <> '__other' OR COALESCE(btrim(p_other_text), '') <> '')
    WHEN jsonb_typeof(p_answer) = 'array' THEN jsonb_array_length(p_answer) > 0
    ELSE false
  END;
$$;

-- ----------------------------------------------------------------------------
-- 2. engagements
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagements (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  -- RESTRICT, not CASCADE: an engagement is the revenue record. Deleting a lead
  -- that has one must be a loud error, never silent data loss.
  lead_id              uuid NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,

  title                text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  locale               text NOT NULL DEFAULT 'en' CHECK (locale IN ('en','ja')),
  client_contact_name  text CHECK (client_contact_name IS NULL OR char_length(client_contact_name) <= 200),
  client_contact_email text CHECK (client_contact_email IS NULL OR char_length(client_contact_email) <= 320),

  stage                text NOT NULL DEFAULT 'discovery'
                         CHECK (stage IN ('discovery','proposal','build','launch','care','lost','closed')),
  -- Always now() on any stage change (trigger-maintained) -> "days in stage".
  stage_entered_at     timestamptz NOT NULL DEFAULT now(),

  tier                 text CHECK (tier IS NULL OR tier IN ('starter','pro','ai_native')),

  -- Money is integer minor units + currency (USD cents / JPY yen — zero-decimal),
  -- matching payments.amount (008). Not numeric.
  currency             text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','JPY')),
  contract_value       int CHECK (contract_value IS NULL OR contract_value >= 0),
  care_mrr             int CHECK (care_mrr IS NULL OR care_mrr >= 0),

  -- Five anchors, not seven per-stage columns. Full per-stage history lives in
  -- engagement_events (trigger-written). Semantics are enforced by
  -- tg_engagements_stage_anchors:
  --   won_at          first entry into build|launch|care|closed; never cleared
  --   care_started_at first entry into care; never cleared
  --   care_ended_at   set on leaving care; CLEARED on re-entering care
  --                   (so care_ended_at IS NULL always means "in care now")
  --   ended_at        set on entering lost|closed; cleared on reopening
  won_at               timestamptz,
  care_started_at      timestamptz,
  care_ended_at        timestamptz,
  ended_at             timestamptz,
  lost_reason          text CHECK (lost_reason IS NULL OR char_length(lost_reason) BETWEEN 1 AND 1000),

  next_action          text CHECK (next_action IS NULL OR char_length(next_action) <= 500),
  next_action_due_at   timestamptz,
  notes                text CHECK (notes IS NULL OR char_length(notes) <= 20000),

  -- Terminal shape: lost carries a reason + ended_at; closed carries ended_at and
  -- NO reason (it is not a loss); an active stage carries neither.
  CONSTRAINT engagements_terminal_shape_ck CHECK (
    (stage = 'lost'   AND ended_at IS NOT NULL AND lost_reason IS NOT NULL)
    OR (stage = 'closed' AND ended_at IS NOT NULL AND lost_reason IS NULL)
    OR (stage NOT IN ('lost','closed') AND ended_at IS NULL AND lost_reason IS NULL)
  ),
  CONSTRAINT engagements_care_window_ck CHECK (care_ended_at IS NULL OR care_started_at IS NOT NULL)
);

-- Hard UNIQUE, not a partial index: with two engagements the mirror becomes
-- ambiguous ("which one drives sales_stage?"), and that ambiguity IS the
-- stale-mirror failure mode. The unlock for repeat business is specified in the
-- plan ("Two judgment calls worth a second look", #1).
CREATE UNIQUE INDEX IF NOT EXISTS uq_engagements_lead ON public.engagements (lead_id);
CREATE INDEX IF NOT EXISTS idx_engagements_stage_entered
  ON public.engagements (stage, stage_entered_at);

DROP TRIGGER IF EXISTS trg_engagements_updated_at ON public.engagements;
CREATE TRIGGER trg_engagements_updated_at
  BEFORE UPDATE ON public.engagements
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "engagements_admin_all" ON public.engagements;
CREATE POLICY "engagements_admin_all" ON public.engagements
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. engagement_events — append-only timeline
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagement_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id   uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  kind            text NOT NULL CHECK (kind IN (
                    'stage_changed','note',
                    'questionnaire_drafted','questionnaire_tailored','questionnaire_ready',
                    'questionnaire_back_to_draft','questionnaire_sent','questionnaire_opened',
                    'questionnaire_submitted','questionnaire_reopened','questionnaire_revoked',
                    'questionnaire_reset',
                    'brief_generated','brief_failed',
                    'notification_sent','notification_failed'
                  )),
  -- admin: Ryan (stage moves, notes). client: the anonymous questionnaire holder.
  -- system: background jobs (tailoring, brief, notifications).
  actor           text NOT NULL DEFAULT 'admin' CHECK (actor IN ('admin','client','system')),
  from_stage      text CHECK (from_stage IS NULL OR from_stage IN ('discovery','proposal','build','launch','care','lost','closed')),
  to_stage        text CHECK (to_stage IS NULL OR to_stage IN ('discovery','proposal','build','launch','care','lost','closed')),
  summary         text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 4000),
  -- Never carries a raw token: see engagement_rls.test.ts "token hygiene".
  data            jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(data) = 'object'),
  -- Asserted by the writer who knows (questionnaire_submitted, brief_*), never
  -- derived by scanning the timeline. Clearing is SET resolved_at = now().
  needs_attention boolean NOT NULL DEFAULT false,
  resolved_at     timestamptz,

  CONSTRAINT engagement_events_stage_change_shape_ck
    CHECK (kind <> 'stage_changed' OR to_stage IS NOT NULL),
  CONSTRAINT engagement_events_resolved_shape_ck
    CHECK (resolved_at IS NULL OR needs_attention)
);

CREATE INDEX IF NOT EXISTS idx_engagement_events_engagement_created
  ON public.engagement_events (engagement_id, created_at DESC);
-- "What needs my attention today" is one scan of this partial index, no aggregates.
CREATE INDEX IF NOT EXISTS idx_engagement_events_open_attention
  ON public.engagement_events (created_at DESC) WHERE needs_attention AND resolved_at IS NULL;

ALTER TABLE public.engagement_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "engagement_events_admin_all" ON public.engagement_events;
CREATE POLICY "engagement_events_admin_all" ON public.engagement_events
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Append-only: the only mutable column is resolved_at. HONEST LIMITATION: DELETE
-- is NOT blocked, because a BEFORE DELETE guard would also block the
-- ON DELETE CASCADE from engagements.
CREATE OR REPLACE FUNCTION public.tg_engagement_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (to_jsonb(NEW) - 'resolved_at') IS DISTINCT FROM (to_jsonb(OLD) - 'resolved_at') THEN
    RAISE EXCEPTION 'engagement_events_append_only';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engagement_events_append_only ON public.engagement_events;
CREATE TRIGGER trg_engagement_events_append_only
  BEFORE UPDATE ON public.engagement_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_engagement_events_append_only();

-- ----------------------------------------------------------------------------
-- 4. engagement_questionnaires — one row per (engagement, kind), always.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagement_questionnaires (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id              uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),

  kind                       text NOT NULL DEFAULT 'discovery' CHECK (kind IN ('discovery')),
  -- ONE language per questionnaire (decision #4). The template is bilingual
  -- authoring source; the instance is a locale-resolved snapshot.
  locale                     text NOT NULL CHECK (locale IN ('en','ja')),
  title                      text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  intro_md                   text CHECK (intro_md IS NULL OR char_length(intro_md) <= 5000),
  template_key               text CHECK (template_key IS NULL OR char_length(template_key) <= 64),

  -- The manifest. jsonb interiors are bounded by zod at the write sites
  -- (pg_column_size CHECKs are brittle — 066's policy); SQL guards shape and
  -- count only, in the CASE form because SQL AND is not a guaranteed
  -- short-circuit and jsonb_array_length raises on a non-array.
  sections                   jsonb NOT NULL DEFAULT '[]'::jsonb,
  questions                  jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Bumped on every manifest change in draft/ready (which also clears answers);
  -- reword-only edits after send do NOT bump it. Answers carry the version they
  -- were written against, and the answer lock rejects a stale one.
  questions_version          int NOT NULL DEFAULT 1 CHECK (questions_version >= 1),

  -- draft -> ready (human review gate) -> sent -> in_progress -> submitted.
  -- Expiry and revocation are TOKEN columns, not statuses.
  status                     text NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','ready','sent','in_progress','submitted')),

  -- AI tailoring run state (the lead_audits generating/… idiom).
  tailoring_status           text NOT NULL DEFAULT 'none'
                               CHECK (tailoring_status IN ('none','generating','completed','failed')),
  tailoring_started_at       timestamptz,      -- staleness anchor for the on-read flip
  tailored_at                timestamptz,
  -- Curated codes ONLY (066): raw provider text never reaches the DB or client.
  tailoring_error            text CHECK (
                               tailoring_error IS NULL
                               OR tailoring_error IN ('timeout','provider_error','malformed_output',
                                                      'too_many_dropped','missing_key','internal')
                             ),
  tailoring_model_id         text,
  tailoring_pipeline_version text,

  -- Magic-link token: the plaintext is NEVER stored (discovery_sessions idiom).
  access_token_hash          text CHECK (access_token_hash IS NULL OR access_token_hash ~ '^[0-9a-f]{64}$'),
  token_issued_at            timestamptz,
  token_expires_at           timestamptz,
  token_revoked_at           timestamptz,

  -- Open counters (touch_engagement_questionnaire_open). No IP / UA is stored,
  -- hashed or otherwise — these counters are the whole "who opened it" story.
  open_count                 int NOT NULL DEFAULT 0 CHECK (open_count >= 0),
  first_opened_at            timestamptz,
  last_opened_at             timestamptz,

  sent_at                    timestamptz,
  submitted_at               timestamptz,
  notification_sent_at       timestamptz,     -- null after submit = "resend" state
  -- Pinned at submit by the RPC: { questions_version, locale, title, sections,
  -- questions, answers: [{ question_id, answer, other_text }] }. Retained across
  -- a reopen (it is the record of what was submitted); overwritten by a resubmit.
  answer_snapshot            jsonb,

  CONSTRAINT engagement_questionnaires_sections_shape_ck CHECK (
    CASE WHEN jsonb_typeof(sections) = 'array' THEN jsonb_array_length(sections) <= 12 ELSE false END
  ),
  CONSTRAINT engagement_questionnaires_questions_shape_ck CHECK (
    CASE WHEN jsonb_typeof(questions) = 'array' THEN jsonb_array_length(questions) <= 40 ELSE false END
  ),
  CONSTRAINT engagement_questionnaires_snapshot_shape_ck CHECK (
    answer_snapshot IS NULL OR jsonb_typeof(answer_snapshot) = 'object'
  ),
  CONSTRAINT engagement_questionnaires_tailoring_anchor_ck CHECK (
    tailoring_status <> 'generating' OR tailoring_started_at IS NOT NULL
  ),
  -- A token record is all-or-nothing.
  CONSTRAINT engagement_questionnaires_token_shape_ck CHECK (
    (access_token_hash IS NULL AND token_issued_at IS NULL
       AND token_expires_at IS NULL AND token_revoked_at IS NULL)
    OR (access_token_hash IS NOT NULL AND token_issued_at IS NOT NULL AND token_expires_at IS NOT NULL)
  ),
  -- A sent/in_progress/submitted row cannot exist without a token record; a
  -- submitted row cannot exist without its snapshot + submitted_at.
  CONSTRAINT engagement_questionnaires_status_shape_ck CHECK (
    status IN ('draft','ready')
    OR (status IN ('sent','in_progress')
        AND access_token_hash IS NOT NULL AND sent_at IS NOT NULL)
    OR (status = 'submitted'
        AND access_token_hash IS NOT NULL AND sent_at IS NOT NULL
        AND answer_snapshot IS NOT NULL AND submitted_at IS NOT NULL)
  )
);

-- Hard UNIQUE — one row per kind, always. Reopen and "start over" transition the
-- same row; a partial index over "live" statuses would let drafts and submitted
-- rows accumulate, contradicting the one-instance panel.
CREATE UNIQUE INDEX IF NOT EXISTS uq_engagement_questionnaires_engagement_kind
  ON public.engagement_questionnaires (engagement_id, kind);
-- Single-flight tailoring (23505 -> 409 in the route).
CREATE UNIQUE INDEX IF NOT EXISTS uq_engagement_questionnaires_one_tailoring
  ON public.engagement_questionnaires (engagement_id) WHERE tailoring_status = 'generating';
-- The entry route looks a token up by hash.
CREATE UNIQUE INDEX IF NOT EXISTS uq_engagement_questionnaires_token_hash
  ON public.engagement_questionnaires (access_token_hash) WHERE access_token_hash IS NOT NULL;

DROP TRIGGER IF EXISTS trg_engagement_questionnaires_updated_at ON public.engagement_questionnaires;
CREATE TRIGGER trg_engagement_questionnaires_updated_at
  BEFORE UPDATE ON public.engagement_questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.engagement_questionnaires ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "engagement_questionnaires_admin_all" ON public.engagement_questionnaires;
CREATE POLICY "engagement_questionnaires_admin_all" ON public.engagement_questionnaires
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Reopen guard: leaving `submitted` (reopen -> in_progress, or start over ->
-- draft) is refused while a brief is generating from that submission — a
-- resubmit or a cleared snapshot would desync the brief from the answers. The
-- route maps the RAISE to 409; Ryan waits for the brief (or its stale flip).
CREATE OR REPLACE FUNCTION public.tg_engagement_questionnaires_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'submitted' AND NEW.status <> 'submitted' THEN
    IF EXISTS (
      SELECT 1 FROM public.engagement_briefs b
       WHERE b.engagement_id = NEW.engagement_id AND b.status = 'generating'
    ) THEN
      RAISE EXCEPTION 'brief_in_flight';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. engagement_questionnaire_answers — rows, not a blob (concurrent autosave)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagement_questionnaire_answers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id  uuid NOT NULL REFERENCES public.engagement_questionnaires(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  question_id       text NOT NULL CHECK (char_length(question_id) BETWEEN 1 AND 64),
  -- A string (text / single) or an array of strings (multi) — shape-identical to
  -- discovery_responses.answer. Real caps are per-question in zod
  -- (validateOneAnswer); these are loose backstops.
  answer            jsonb NOT NULL CHECK (
                      CASE
                        WHEN jsonb_typeof(answer) = 'string' THEN char_length(answer #>> '{}') <= 5000
                        WHEN jsonb_typeof(answer) = 'array'  THEN jsonb_array_length(answer) <= 12
                        ELSE false
                      END
                    ),
  -- Sibling column, not a key inside `answer`: keeps `answer` shape-identical to
  -- discovery_responses, is length-CHECKable, and allows exactly one "other".
  other_text        text CHECK (other_text IS NULL OR char_length(other_text) <= 500),
  -- The manifest version this answer was written against.
  questions_version int NOT NULL CHECK (questions_version >= 1),

  CONSTRAINT uq_engagement_questionnaire_answers_question UNIQUE (questionnaire_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_questionnaire_answers_questionnaire
  ON public.engagement_questionnaire_answers (questionnaire_id);

DROP TRIGGER IF EXISTS trg_engagement_questionnaire_answers_updated_at ON public.engagement_questionnaire_answers;
CREATE TRIGGER trg_engagement_questionnaire_answers_updated_at
  BEFORE UPDATE ON public.engagement_questionnaire_answers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.engagement_questionnaire_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "engagement_questionnaire_answers_admin_all" ON public.engagement_questionnaire_answers;
CREATE POLICY "engagement_questionnaire_answers_admin_all" ON public.engagement_questionnaire_answers
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- THE ANSWER LOCK. Reads the parent FOR KEY SHARE — the weakest row lock that
-- still conflicts with the submit RPC's FOR UPDATE — so:
--   * an autosave in flight when submission begins holds the RPC until it
--     commits (and is therefore IN the snapshot);
--   * an autosave that starts after the RPC took its lock waits, then sees
--     'submitted' and raises questionnaire_not_open.
-- That pairing makes "the snapshot equals the answers table" an invariant.
-- Rules: INSERT/UPDATE only while the parent is draft|ready|sent|in_progress
-- (draft/ready so Ryan can test-fill), and only at the parent's current
-- questions_version (else stale_manifest). DELETE only while the parent is
-- draft|ready (the manifest-save path clears answers) OR when the parent row is
-- not found — that is the ON DELETE CASCADE from the questionnaire itself, whose
-- row is already gone in the trigger's view; the FK makes any other orphan
-- impossible.
CREATE OR REPLACE FUNCTION public.tg_engagement_questionnaire_answers_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_qid     uuid;
  v_status  text;
  v_version int;
BEGIN
  v_qid := CASE WHEN TG_OP = 'DELETE' THEN OLD.questionnaire_id ELSE NEW.questionnaire_id END;

  SELECT q.status, q.questions_version
    INTO v_status, v_version
    FROM public.engagement_questionnaires q
   WHERE q.id = v_qid
     FOR KEY SHARE;

  IF TG_OP = 'DELETE' THEN
    IF NOT FOUND THEN
      RETURN OLD;  -- cascade from the questionnaire row itself
    END IF;
    IF v_status NOT IN ('draft','ready') THEN
      RAISE EXCEPTION 'questionnaire_answers_locked';
    END IF;
    RETURN OLD;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'questionnaire_not_found';
  END IF;
  IF v_status NOT IN ('draft','ready','sent','in_progress') THEN
    RAISE EXCEPTION 'questionnaire_not_open';
  END IF;
  IF NEW.questions_version <> v_version THEN
    RAISE EXCEPTION 'stale_manifest';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engagement_questionnaire_answers_lock ON public.engagement_questionnaire_answers;
CREATE TRIGGER trg_engagement_questionnaire_answers_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.engagement_questionnaire_answers
  FOR EACH ROW EXECUTE FUNCTION public.tg_engagement_questionnaire_answers_lock();

-- ----------------------------------------------------------------------------
-- 6. engagement_briefs — a table, not columns (retry = a new row)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagement_briefs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id    uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  -- Nullable so a brief from a meeting transcript later needs no schema change.
  questionnaire_id uuid REFERENCES public.engagement_questionnaires(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  status           text NOT NULL DEFAULT 'generating'
                     CHECK (status IN ('generating','completed','partial','failed')),

  -- Phase 1: deterministic answers document rendered in code from the pinned
  -- snapshot. Written immediately, NEVER overwritten (finalize COALESCEs).
  digest_md        text CHECK (digest_md IS NULL OR char_length(digest_md) <= 200000),
  -- Phase 2: the model's narrative.
  brief_md         text CHECK (brief_md IS NULL OR char_length(brief_md) <= 60000),
  structured       jsonb CHECK (structured IS NULL OR jsonb_typeof(structured) = 'object'),
  source_snapshot  jsonb CHECK (source_snapshot IS NULL OR jsonb_typeof(source_snapshot) = 'object'),

  model_id         text,
  pipeline_version text,
  build_sha        text,
  -- Curated codes ONLY.
  generation_error text CHECK (
    generation_error IS NULL
    OR generation_error IN ('timeout','provider_error','malformed_output','digest_failed','missing_key','internal')
  ),
  completed_at     timestamptz,

  -- completed = digest + narrative + provenance; partial = digest + the reason
  -- the narrative failed (so Ryan always has a readable answers document);
  -- failed = phase 1 itself failed (should only happen on a malformed snapshot).
  CONSTRAINT engagement_briefs_terminal_shape_ck CHECK (
    status = 'generating'
    OR (status = 'completed'
        AND digest_md IS NOT NULL AND brief_md IS NOT NULL
        AND structured IS NOT NULL AND source_snapshot IS NOT NULL
        AND completed_at IS NOT NULL AND model_id IS NOT NULL AND pipeline_version IS NOT NULL)
    OR (status = 'partial'
        AND digest_md IS NOT NULL AND generation_error IS NOT NULL AND completed_at IS NOT NULL)
    OR (status = 'failed'
        AND generation_error IS NOT NULL AND completed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_engagement_briefs_engagement_created
  ON public.engagement_briefs (engagement_id, created_at DESC);
-- Single-flight generation: the submit RPC's claim row and the regenerate route
-- both rely on this to turn a double submit into a 23505, not a second paid run.
CREATE UNIQUE INDEX IF NOT EXISTS uq_engagement_briefs_one_generating
  ON public.engagement_briefs (engagement_id) WHERE status = 'generating';

DROP TRIGGER IF EXISTS trg_engagement_briefs_updated_at ON public.engagement_briefs;
CREATE TRIGGER trg_engagement_briefs_updated_at
  BEFORE UPDATE ON public.engagement_briefs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.engagement_briefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "engagement_briefs_admin_all" ON public.engagement_briefs;
CREATE POLICY "engagement_briefs_admin_all" ON public.engagement_briefs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- The questionnaire guard depends on engagement_briefs, so it is created here.
DROP TRIGGER IF EXISTS trg_engagement_questionnaires_guard ON public.engagement_questionnaires;
CREATE TRIGGER trg_engagement_questionnaires_guard
  BEFORE UPDATE ON public.engagement_questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.tg_engagement_questionnaires_guard();

-- ----------------------------------------------------------------------------
-- 7. Stage triggers on engagements
-- ----------------------------------------------------------------------------
-- BEFORE: the timestamp anchors, enforced here so they cannot drift.
CREATE OR REPLACE FUNCTION public.tg_engagements_stage_anchors()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now     timestamptz := now();
  v_changed boolean;
BEGIN
  -- lead_id is immutable. The mirror is keyed on it: repointing an engagement
  -- would leave the old lead frozen at a stale mirrored value and the new one
  -- unmirrored — and the guard would then refuse to correct either by hand.
  IF TG_OP = 'UPDATE' AND NEW.lead_id <> OLD.lead_id THEN
    RAISE EXCEPTION 'engagement_lead_id_immutable';
  END IF;

  v_changed := (TG_OP = 'INSERT') OR (NEW.stage IS DISTINCT FROM OLD.stage);
  IF NOT v_changed THEN
    RETURN NEW;
  END IF;

  -- RAISEs on an unknown stage (the CHECK would too; this is the clearer error).
  PERFORM public.engagement_sales_stage_for(NEW.stage);

  NEW.stage_entered_at := v_now;

  -- won_at: first entry only; never cleared by a transition (revenue is
  -- recognised once; a mistaken win is an explicit admin edit).
  IF NEW.stage IN ('build','launch','care','closed') AND NEW.won_at IS NULL THEN
    NEW.won_at := v_now;
  END IF;

  IF NEW.stage = 'care' THEN
    IF NEW.care_started_at IS NULL THEN
      NEW.care_started_at := v_now;
    END IF;
    NEW.care_ended_at := NULL;            -- re-entering care reopens the window
  ELSIF TG_OP = 'UPDATE' AND OLD.stage = 'care' THEN
    NEW.care_ended_at := v_now;           -- leaving care closes it
    -- engagements_care_window_ck needs a start for every end; if a manual
    -- edit nulled care_started_at while in care, the care window began when
    -- the row entered the stage.
    NEW.care_started_at := COALESCE(NEW.care_started_at, OLD.stage_entered_at);
  END IF;

  IF NEW.stage IN ('lost','closed') THEN
    NEW.ended_at := v_now;
    IF NEW.stage = 'lost' THEN
      IF NEW.lost_reason IS NULL OR btrim(NEW.lost_reason) = '' THEN
        RAISE EXCEPTION 'lost_reason_required';
      END IF;
    ELSE
      NEW.lost_reason := NULL;            -- closed is not a loss
    END IF;
  ELSE
    -- Reopening (or any active-stage move): both cleared. The event log keeps
    -- the prior loss.
    NEW.ended_at := NULL;
    NEW.lost_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engagements_stage_anchors ON public.engagements;
CREATE TRIGGER trg_engagements_stage_anchors
  BEFORE INSERT OR UPDATE ON public.engagements
  FOR EACH ROW EXECUTE FUNCTION public.tg_engagements_stage_anchors();

-- AFTER: the mirror (the ONLY writer of leads.sales_stage once an engagement
-- exists), the stage_changed event, and — on entering a terminal stage — token
-- revocation + resolution of every open needs_attention event. Reopening does
-- not undo either; Ryan resends a link or re-flags attention explicitly.
-- DELETE resets the lead to 'qualified' (it was qualified when the engagement
-- opened; the guard sees no engagement any more, so the write is allowed).
CREATE OR REPLACE FUNCTION public.tg_engagements_stage_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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

    UPDATE public.engagement_events
       SET resolved_at = now()
     WHERE engagement_id = NEW.id
       AND needs_attention
       AND resolved_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engagements_stage_sync ON public.engagements;
CREATE TRIGGER trg_engagements_stage_sync
  AFTER INSERT OR UPDATE OF stage OR DELETE ON public.engagements
  FOR EACH ROW EXECUTE FUNCTION public.tg_engagements_stage_sync();

-- ----------------------------------------------------------------------------
-- 8. The hard guard on leads.sales_stage
-- ----------------------------------------------------------------------------
-- Fires for ANY writer, including the service role (triggers are not RLS).
-- Raises only on a CONFLICTING value — writing the value the mirror would write
-- is harmless, so a stale-but-correct client does not 500.
CREATE OR REPLACE FUNCTION public.tg_leads_sales_stage_engagement_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_stage text;
BEGIN
  SELECT e.stage INTO v_stage FROM public.engagements e WHERE e.lead_id = NEW.id;
  IF FOUND AND NEW.sales_stage IS DISTINCT FROM public.engagement_sales_stage_for(v_stage) THEN
    RAISE EXCEPTION 'lead_sales_stage_is_engagement_derived'
      USING DETAIL = format(
        'lead %s has an engagement at stage %s; sales_stage is derived (%s) and cannot be set to %s directly',
        NEW.id, v_stage, public.engagement_sales_stage_for(v_stage), NEW.sales_stage
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_sales_stage_engagement_guard ON public.leads;
CREATE TRIGGER trg_leads_sales_stage_engagement_guard
  BEFORE UPDATE OF sales_stage ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_leads_sales_stage_engagement_guard();

-- ----------------------------------------------------------------------------
-- 9. engagement_list — the admin list's pre-aggregated read (no N+1 in the page)
-- ----------------------------------------------------------------------------
-- security_invoker: the base tables' RLS applies to whoever selects, so anon and
-- members see nothing and the admin sees everything.
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
  ), 0)                 AS open_attention_count
FROM public.engagements e
LEFT JOIN public.engagement_questionnaires q
       ON q.engagement_id = e.id AND q.kind = 'discovery'
LEFT JOIN LATERAL (
  SELECT b2.status
    FROM public.engagement_briefs b2
   WHERE b2.engagement_id = e.id
   ORDER BY b2.created_at DESC
   LIMIT 1
) b ON true;

-- ----------------------------------------------------------------------------
-- 10. RPCs — SECURITY DEFINER, search_path = '', service_role EXECUTE only
-- ----------------------------------------------------------------------------

-- start_engagement — the convert_prospect mould. ORDER MATTERS:
--   (1) lock the LEAD FOR UPDATE (the engagement may not exist yet, so there is
--       no row to lock; this is what serialises a double-click);
--   (2) if an engagement already exists, return it with already_started = true —
--       BEFORE the eligibility check, because the mirror has already moved the
--       lead off 'qualified';
--   (3) otherwise REQUIRE sales_stage = 'qualified' (the disabled button is UX;
--       this is the enforcement);
--   (4) insert, seeding from the lead. The initial stage_changed event and the
--       mirror are trigger-produced in the same transaction. Writes NO
--       sales_stage — one writer only.
CREATE OR REPLACE FUNCTION public.start_engagement(p_lead_id uuid)
RETURNS TABLE (engagement_id uuid, already_started boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lead     public.leads%ROWTYPE;
  v_existing uuid;
  v_id       uuid;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead_not_found';
  END IF;

  SELECT e.id INTO v_existing FROM public.engagements e WHERE e.lead_id = p_lead_id;
  IF FOUND THEN
    RETURN QUERY SELECT v_existing, true;
    RETURN;
  END IF;

  IF v_lead.sales_stage <> 'qualified' THEN
    RAISE EXCEPTION 'lead_not_qualified';
  END IF;

  INSERT INTO public.engagements
    (lead_id, title, locale, client_contact_name, client_contact_email, tier)
  VALUES (
    p_lead_id,
    COALESCE(NULLIF(left(btrim(v_lead.business_name), 200), ''), 'Untitled engagement'),
    CASE WHEN v_lead.source_locale IN ('en','ja') THEN v_lead.source_locale ELSE 'en' END,
    NULLIF(left(btrim(COALESCE(v_lead.name, '')), 200), ''),
    NULLIF(btrim(COALESCE(v_lead.email, '')), ''),
    NULLIF(v_lead.tier_interest, 'not_sure')
  )
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, false;
END;
$$;
REVOKE ALL ON FUNCTION public.start_engagement(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_engagement(uuid) TO service_role;

-- submit_engagement_questionnaire — THE WHOLE SUBMISSION IS THIS ONE TRANSACTION:
-- lock (FOR UPDATE — waits for any in-flight autosave holding FOR KEY SHARE and
-- blocks new ones until commit) → status check → required check in SQL →
-- snapshot (pinned manifest + raw answers) → status flip → event → brief claim.
-- A replay hits the status check and returns applied:false with no second
-- event, no snapshot overwrite and no second brief. The TS pre-check
-- (findMissingRequired) is UX; THIS is the enforcement.
CREATE OR REPLACE FUNCTION public.submit_engagement_questionnaire(p_questionnaire_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_q        public.engagement_questionnaires%ROWTYPE;
  v_missing  text[];
  v_snapshot jsonb;
  v_brief    uuid;
BEGIN
  SELECT * INTO v_q FROM public.engagement_questionnaires WHERE id = p_questionnaire_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'questionnaire_not_found';
  END IF;

  IF v_q.status NOT IN ('sent','in_progress') THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_open');
  END IF;

  -- Every required question in the STORED manifest needs a present answer
  -- written against the CURRENT manifest version.
  SELECT array_agg(t.q ->> 'id' ORDER BY t.ord)
    INTO v_missing
    FROM jsonb_array_elements(v_q.questions) WITH ORDINALITY AS t(q, ord)
   WHERE COALESCE((t.q ->> 'required')::boolean, false)
     AND NOT EXISTS (
       SELECT 1 FROM public.engagement_questionnaire_answers a
        WHERE a.questionnaire_id = v_q.id
          AND a.question_id = t.q ->> 'id'
          AND a.questions_version = v_q.questions_version
          AND public.engagement_answer_is_present(a.answer, a.other_text)
     );
  IF v_missing IS NOT NULL AND array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'required_missing: %', array_to_string(v_missing, ',')
      USING DETAIL = array_to_string(v_missing, ',');
  END IF;

  -- The pinned manifest plus the raw answers: strictly more than pinning labels,
  -- trivially atomic, and rendering resolves labels from it forever.
  v_snapshot := jsonb_build_object(
    'questions_version', v_q.questions_version,
    'locale',            v_q.locale,
    'title',             v_q.title,
    'sections',          v_q.sections,
    'questions',         v_q.questions,
    'answers', COALESCE((
      SELECT jsonb_agg(
               jsonb_build_object('question_id', a.question_id, 'answer', a.answer, 'other_text', a.other_text)
               ORDER BY a.question_id)
        FROM public.engagement_questionnaire_answers a
       WHERE a.questionnaire_id = v_q.id
         AND a.questions_version = v_q.questions_version
    ), '[]'::jsonb)
  );

  UPDATE public.engagement_questionnaires
     SET status = 'submitted',
         submitted_at = now(),
         answer_snapshot = v_snapshot,
         updated_at = now()
   WHERE id = v_q.id;

  INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data, needs_attention)
  VALUES (
    v_q.engagement_id, 'questionnaire_submitted', 'client',
    'Discovery questionnaire submitted',
    jsonb_build_object('questionnaire_id', v_q.id, 'questions_version', v_q.questions_version),
    true
  );

  -- The brief claim row: the paid generation is durably scheduled even if the
  -- request dies a millisecond later (flipStaleBriefs recovers a dead one). A
  -- second in-flight brief for this engagement surfaces as 23505 -> 409.
  INSERT INTO public.engagement_briefs (engagement_id, questionnaire_id, status)
  VALUES (v_q.engagement_id, v_q.id, 'generating')
  RETURNING id INTO v_brief;

  RETURN jsonb_build_object(
    'applied', true,
    'engagement_id', v_q.engagement_id,
    'brief_id', v_brief
  );
END;
$$;
REVOKE ALL ON FUNCTION public.submit_engagement_questionnaire(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_engagement_questionnaire(uuid) TO service_role;

-- touch_engagement_questionnaire_open — the bump_preview_access mould (supabase-js
-- cannot increment). Flips sent -> in_progress; writes questionnaire_opened
-- ONLY on the first open so repeat opens don't spam the timeline.
CREATE OR REPLACE FUNCTION public.touch_engagement_questionnaire_open(p_questionnaire_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_engagement uuid;
  v_first      boolean;
BEGIN
  SELECT q.engagement_id, (q.first_opened_at IS NULL)
    INTO v_engagement, v_first
    FROM public.engagement_questionnaires q
   WHERE q.id = p_questionnaire_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'questionnaire_not_found';
  END IF;

  UPDATE public.engagement_questionnaires
     SET open_count      = open_count + 1,
         first_opened_at = COALESCE(first_opened_at, now()),
         last_opened_at  = now(),
         status          = CASE WHEN status = 'sent' THEN 'in_progress' ELSE status END,
         updated_at      = now()
   WHERE id = p_questionnaire_id;

  IF v_first THEN
    INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data)
    VALUES (v_engagement, 'questionnaire_opened', 'client',
            'Client opened the discovery questionnaire',
            jsonb_build_object('questionnaire_id', p_questionnaire_id));
  END IF;

  RETURN jsonb_build_object('first_open', v_first);
END;
$$;
REVOKE ALL ON FUNCTION public.touch_engagement_questionnaire_open(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_engagement_questionnaire_open(uuid) TO service_role;

-- finalize_engagement_questionnaire_tailoring — the finalize_blue_filler_research
-- CAS clone: the compare-and-swap off tailoring_status = 'generating' (the
-- admin GET's stale flip is the other, deliberately direct, writer — as with
-- briefs and audits). On 'completed' it
-- replaces the manifest, bumps questions_version and clears every answer row
-- (draft test-fills are throwaway), in one transaction — and refuses to touch a
-- questionnaire that is no longer a draft (never overwrite a sent instance).
CREATE OR REPLACE FUNCTION public.finalize_engagement_questionnaire_tailoring(
  p_questionnaire_id uuid,
  p_status           text,
  p_sections         jsonb DEFAULT NULL,
  p_questions        jsonb DEFAULT NULL,
  p_model_id         text  DEFAULT NULL,
  p_pipeline_version text  DEFAULT NULL,
  p_tailoring_error  text  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_q public.engagement_questionnaires%ROWTYPE;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('completed','failed') THEN
    RAISE EXCEPTION 'finalize_engagement_questionnaire_tailoring: p_status must be completed|failed (got %)',
      COALESCE(p_status, 'null');
  END IF;

  IF p_status = 'completed' THEN
    IF p_sections IS NULL OR jsonb_typeof(p_sections) <> 'array'
       OR p_questions IS NULL OR jsonb_typeof(p_questions) <> 'array'
       OR jsonb_array_length(p_questions) < 1
       OR p_model_id IS NULL OR p_pipeline_version IS NULL THEN
      RAISE EXCEPTION 'finalize_engagement_questionnaire_tailoring: completed requires sections[], questions[] (>= 1), model_id and pipeline_version';
    END IF;
  ELSIF p_tailoring_error IS NULL THEN
    RAISE EXCEPTION 'finalize_engagement_questionnaire_tailoring: failed requires tailoring_error';
  END IF;

  SELECT * INTO v_q FROM public.engagement_questionnaires WHERE id = p_questionnaire_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'questionnaire_not_found';
  END IF;

  -- Already terminal (a stale flip, or a repeat finalization): no-op, and NO
  -- other write happens regardless of payload.
  IF v_q.tailoring_status <> 'generating' THEN
    RETURN jsonb_build_object('applied', false);
  END IF;

  IF p_status = 'completed' THEN
    IF v_q.status <> 'draft' THEN
      RAISE EXCEPTION 'questionnaire_not_draft';
    END IF;

    DELETE FROM public.engagement_questionnaire_answers WHERE questionnaire_id = v_q.id;

    UPDATE public.engagement_questionnaires
       SET sections                   = p_sections,
           questions                  = p_questions,
           questions_version          = questions_version + 1,
           tailoring_status           = 'completed',
           tailored_at                = now(),
           tailoring_error            = NULL,
           tailoring_model_id         = p_model_id,
           tailoring_pipeline_version = p_pipeline_version,
           updated_at                 = now()
     WHERE id = v_q.id;

    INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data)
    VALUES (v_q.engagement_id, 'questionnaire_tailored', 'system',
            'Discovery questionnaire tailored by AI — review before sending',
            jsonb_build_object('questionnaire_id', v_q.id, 'model_id', p_model_id,
                               'question_count', jsonb_array_length(p_questions)));
  ELSE
    UPDATE public.engagement_questionnaires
       SET tailoring_status           = 'failed',
           tailoring_error            = p_tailoring_error,
           tailoring_model_id         = COALESCE(p_model_id, tailoring_model_id),
           tailoring_pipeline_version = COALESCE(p_pipeline_version, tailoring_pipeline_version),
           updated_at                 = now()
     WHERE id = v_q.id;
  END IF;

  RETURN jsonb_build_object('applied', true);
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_engagement_questionnaire_tailoring(
  uuid, text, jsonb, jsonb, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_engagement_questionnaire_tailoring(
  uuid, text, jsonb, jsonb, text, text, text
) TO service_role;

-- finalize_engagement_brief — the ONLY way a brief leaves 'generating'. Two-phase:
-- phase 1 (digest_md) may already sit on the row from a fenced write; finalize
-- COALESCEs so it is NEVER overwritten. completed/partial write a
-- brief_generated event with needs_attention; failed writes brief_failed (Ryan
-- must click Regenerate, so it needs attention too).
CREATE OR REPLACE FUNCTION public.finalize_engagement_brief(
  p_brief_id         uuid,
  p_status           text,
  p_digest_md        text  DEFAULT NULL,
  p_brief_md         text  DEFAULT NULL,
  p_structured       jsonb DEFAULT NULL,
  p_source_snapshot  jsonb DEFAULT NULL,
  p_generation_error text  DEFAULT NULL,
  p_model_id         text  DEFAULT NULL,
  p_pipeline_version text  DEFAULT NULL,
  p_build_sha        text  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_b      public.engagement_briefs%ROWTYPE;
  v_digest text;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('completed','partial','failed') THEN
    RAISE EXCEPTION 'finalize_engagement_brief: p_status must be completed|partial|failed (got %)',
      COALESCE(p_status, 'null');
  END IF;

  SELECT * INTO v_b FROM public.engagement_briefs WHERE id = p_brief_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'brief_not_found';
  END IF;
  IF v_b.status <> 'generating' THEN
    RETURN jsonb_build_object('applied', false);
  END IF;

  v_digest := COALESCE(v_b.digest_md, p_digest_md);

  IF p_status = 'completed' THEN
    IF v_digest IS NULL OR p_brief_md IS NULL
       OR p_structured IS NULL OR jsonb_typeof(p_structured) <> 'object'
       OR p_source_snapshot IS NULL OR jsonb_typeof(p_source_snapshot) <> 'object'
       OR p_model_id IS NULL OR p_pipeline_version IS NULL THEN
      RAISE EXCEPTION 'finalize_engagement_brief: completed requires digest_md, brief_md, structured, source_snapshot, model_id and pipeline_version';
    END IF;
    UPDATE public.engagement_briefs
       SET status           = 'completed',
           digest_md        = v_digest,
           brief_md         = p_brief_md,
           structured       = p_structured,
           source_snapshot  = p_source_snapshot,
           model_id         = p_model_id,
           pipeline_version = p_pipeline_version,
           build_sha        = COALESCE(p_build_sha, build_sha),
           generation_error = NULL,
           completed_at     = now(),
           updated_at       = now()
     WHERE id = v_b.id;

  ELSIF p_status = 'partial' THEN
    IF v_digest IS NULL OR p_generation_error IS NULL THEN
      RAISE EXCEPTION 'finalize_engagement_brief: partial requires digest_md and generation_error';
    END IF;
    UPDATE public.engagement_briefs
       SET status           = 'partial',
           digest_md        = v_digest,
           source_snapshot  = COALESCE(p_source_snapshot, source_snapshot),
           model_id         = COALESCE(p_model_id, model_id),
           pipeline_version = COALESCE(p_pipeline_version, pipeline_version),
           build_sha        = COALESCE(p_build_sha, build_sha),
           generation_error = p_generation_error,
           completed_at     = now(),
           updated_at       = now()
     WHERE id = v_b.id;

  ELSE
    IF p_generation_error IS NULL THEN
      RAISE EXCEPTION 'finalize_engagement_brief: failed requires generation_error';
    END IF;
    UPDATE public.engagement_briefs
       SET status           = 'failed',
           generation_error = p_generation_error,
           completed_at     = now(),
           updated_at       = now()
     WHERE id = v_b.id;
  END IF;

  INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data, needs_attention)
  VALUES (
    v_b.engagement_id,
    CASE WHEN p_status = 'failed' THEN 'brief_failed' ELSE 'brief_generated' END,
    'system',
    CASE p_status
      WHEN 'completed' THEN 'Discovery brief ready'
      WHEN 'partial'   THEN 'Discovery brief partial — answers digest ready, narrative failed'
      ELSE 'Discovery brief generation failed'
    END,
    jsonb_build_object('brief_id', v_b.id, 'status', p_status),
    true
  );

  RETURN jsonb_build_object('applied', true);
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_engagement_brief(
  uuid, text, text, text, jsonb, jsonb, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_engagement_brief(
  uuid, text, text, text, jsonb, jsonb, text, text, text, text
) TO service_role;

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-migration verification (run in the SQL editor after applying):
--
-- 1. Five tables, all RLS-protected (expect 5 rows, rowsecurity = true):
--      select tablename, rowsecurity from pg_tables
--       where schemaname = 'public' and tablename like 'engagement%';
--
-- 2. Exactly one *_admin_all policy per table (expect 5 rows):
--      select tablename, policyname, cmd from pg_policies
--       where schemaname = 'public' and tablename like 'engagement%';
--
-- 3. The map agrees with lib/studio/engagement/stages.ts
--    (expect qualified / proposal / won / won / won / won / lost):
--      select s, public.engagement_sales_stage_for(s)
--        from unnest(array['discovery','proposal','build','launch','care','closed','lost']) s;
--    …and RAISEs on an unknown stage (should ERROR):
--      select public.engagement_sales_stage_for('bogus');
--
-- 4. The guard is armed on leads (expect 1 row):
--      select tgname from pg_trigger where tgname = 'trg_leads_sales_stage_engagement_guard';
--
-- 5. The terminal-shape constraints exist — CREATE TABLE IF NOT EXISTS would
--    silently skip them on a pre-existing table (expect 3 rows):
--      select conname from pg_constraint
--       where conname in ('engagements_terminal_shape_ck',
--                         'engagement_questionnaires_status_shape_ck',
--                         'engagement_briefs_terminal_shape_ck');
--
-- 6. The five RPCs are service-role only. For each, expect exactly service_role
--    and postgres — NEITHER anon NOR authenticated:
--      select routine_name, grantee from information_schema.routine_privileges
--       where routine_schema = 'public'
--         and routine_name in ('start_engagement','submit_engagement_questionnaire',
--                              'touch_engagement_questionnaire_open',
--                              'finalize_engagement_questionnaire_tailoring',
--                              'finalize_engagement_brief')
--       order by routine_name, grantee;
--
-- 7. Zero mirror drift (expect 0 — trivially, on a fresh apply):
--      select count(*) from public.engagements e join public.leads l on l.id = e.lead_id
--       where l.sales_stage <> public.engagement_sales_stage_for(e.stage);
--
-- 8. As anon / an ordinary authenticated user, every table and the view is
--    empty or denied:
--      select * from public.engagements;        -- 0 rows / permission denied
--      select * from public.engagement_list;    -- 0 rows / permission denied
-- ----------------------------------------------------------------------------
