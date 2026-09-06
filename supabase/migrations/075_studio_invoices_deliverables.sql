-- ============================================================================
-- 075_studio_invoices_deliverables.sql — Studio deposit + build kickoff
--                                        (engagement spine, slice 4)
-- ============================================================================
-- Plan: docs/plans/2026-09-06-studio-deposit-kickoff.md (rev 2, approved).
--
-- Two new tables behind /admin/studio/engagements/<id>:
--   engagement_invoices     — one money row per billing event.
--     kind deposit|balance|care_month; integer minor units + currency;
--     draft -> sent -> paid -> refunded, with void as the audited exit and
--     void -> paid as the money-arrived-after-void case. ONE live deposit and
--     ONE live balance per proposal, where "live" is voided_at IS NULL: a
--     voided invoice whose 24 h Checkout session is paid afterwards becomes
--     void -> paid but KEEPS voided_at, so it can never collide with the
--     deposit Ryan re-issued after the void. That collision would have been a
--     23505 inside the webhook — a 500, three days of Stripe retries, and
--     money nobody recorded.
--   engagement_deliverables — what the build owes, seeded from the accepted
--     proposal's scope bullets. planned -> in_progress -> delivered ->
--     accepted, backwards allowed (one operator, corrections are normal); the
--     guard owns delivered_at so the shape CHECK can never be violated by a
--     caller, and an ordinary edit of a delivered row keeps its timestamp.
--
-- THE WEBHOOK IS THE TRUTH. Nothing marks an invoice paid but
-- mark_engagement_invoice_paid, called from the signature-verified Stripe
-- webhook. It is a no-op on a replay of the SAME payment intent
-- (already_paid) and flags a DIFFERENT one as invoice_duplicate_payment —
-- a konbini voucher landing days after a card payment is never swallowed.
--
-- LOCK ORDER — engagement -> proposal -> invoice — in every multi-row RPC and
-- in both amended trigger/RPC sweeps, so no writer can deadlock with 074's.
-- record_/rearm_/mark_..._awaiting take a single-row lock only (a single-row
-- lock cannot participate in a cycle with the rule above — 074's
-- touch_engagement_proposal_open reasoning).
--
-- RLS: one *_admin_all policy per table, NO anon/member policy (the 067/074
-- posture). The client reaches its invoice only through a service-role route
-- that has verified the hv_engp_ cookie; Stripe reaches it only through the
-- signature-verified webhook. An RLS predicate cannot see either.
--
-- NEVER in engagement_events.data: a Stripe event body, a Checkout URL, a
-- card detail, an email address. Allowed: invoice id, kind, amount, currency,
-- pct, session id, payment intent id, a curated reason code.
--
-- NUMBERING: 074 is the highest committed migration; 065 and 068–073 sit
-- uncommitted in the working tree, so this is 075.
--
-- ROLLOUT — APPLY BEFORE THE DEPLOY (the 062/074 precedent). Everything here
-- is additive: two new tables, RPCs and triggers nothing calls yet, an
-- amended void RPC whose new branch only fires when invoice rows exist, an
-- amended sweep that finds no rows, a constraint swap that is a superset, and
-- view columns APPENDED after the ones the shipped list reads. Applying first
-- means there is no interval in which the workspace page or the webhook
-- queries a table that does not exist.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. engagement_invoices
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagement_invoices (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  engagement_id               uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  -- A care_month row of a later unit may carry NULL; this slice always sets it.
  proposal_id                 uuid REFERENCES public.engagement_proposals(id) ON DELETE CASCADE,

  kind                        text NOT NULL CHECK (kind IN ('deposit','balance','care_month')),
  -- 50/50 or 100 for deposit/balance; NULL for care_month (pct shape CHECK).
  pct_of_build                smallint CHECK (pct_of_build IS NULL OR pct_of_build BETWEEN 1 AND 100),
  -- What the client sees on Stripe Checkout: "Deposit — <business> (50%)".
  label                       text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),

  -- Money is integer minor units in `currency` (USD cents / JPY yen). 50 is
  -- the Stripe minimum for BOTH currencies ($0.50 = 50 cents, ¥50 = 50 yen)
  -- and also excludes zero.
  currency                    text NOT NULL CHECK (currency IN ('USD','JPY')),
  amount                      int NOT NULL CHECK (amount >= 50),

  -- The engagement's contact email SNAPSHOTTED at issue, immutable: the only
  -- address the Checkout customer_email and the deposit email ever use.
  -- Params under one idempotency key must never drift.
  recipient_email             text CHECK (recipient_email IS NULL OR char_length(recipient_email) BETWEEN 3 AND 320),

  status                      text NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft','sent','paid','refunded','void')),

  sent_at                     timestamptz,
  paid_at                     timestamptz,
  refunded_at                 timestamptz,
  voided_at                   timestamptz,
  void_reason                 text CHECK (void_reason IS NULL OR char_length(void_reason) BETWEEN 1 AND 1000),
  -- Stamped by the action on provider success (the notification_sent_at
  -- idiom): engagement_events is append-only, so delivery state lives here.
  invoice_email_sent_at       timestamptz,

  -- Stripe. The Checkout URL is NEVER stored (a durable payment link).
  stripe_checkout_session_id  text,
  checkout_session_expires_at timestamptz,
  -- Set when a session completed with payment_status='unpaid' (konbini /
  -- bank transfer): blocks re-arming until Stripe reports success or failure.
  awaiting_async_payment_at   timestamptz,
  mint_attempt                int NOT NULL DEFAULT 0 CHECK (mint_attempt >= 0),
  checkout_count              int NOT NULL DEFAULT 0 CHECK (checkout_count >= 0),
  stripe_payment_intent_id    text,
  amount_refunded             int CHECK (amount_refunded IS NULL OR amount_refunded >= 0),
  -- Decision 8 — the care-billing attach point. Unused this slice.
  stripe_subscription_id      text,

  -- What each status must carry. CASE form: SQL AND is not a guaranteed
  -- short-circuit. A void -> paid row carries BOTH voided_at and paid_at; the
  -- `paid` branch permits that on purpose (decision 6).
  CONSTRAINT engagement_invoices_status_shape_ck CHECK (
    CASE status
      WHEN 'draft' THEN
        sent_at IS NULL AND paid_at IS NULL AND stripe_payment_intent_id IS NULL
      WHEN 'sent' THEN
        sent_at IS NOT NULL AND paid_at IS NULL
      WHEN 'paid' THEN
        sent_at IS NOT NULL AND paid_at IS NOT NULL AND stripe_payment_intent_id IS NOT NULL
      WHEN 'refunded' THEN
        sent_at IS NOT NULL AND paid_at IS NOT NULL AND stripe_payment_intent_id IS NOT NULL
        AND refunded_at IS NOT NULL AND amount_refunded IS NOT NULL
      WHEN 'void' THEN
        voided_at IS NOT NULL AND void_reason IS NOT NULL
      ELSE false
    END
  ),
  CONSTRAINT engagement_invoices_pct_shape_ck CHECK (
    (kind = 'care_month') = (pct_of_build IS NULL)
  ),
  CONSTRAINT engagement_invoices_session_shape_ck CHECK (
    (stripe_checkout_session_id IS NULL) = (checkout_session_expires_at IS NULL)
  )
);

-- One LIVE deposit and one LIVE balance per proposal. voided_at IS NULL, not
-- status <> 'void': see the header. care_month rows are many and excluded.
CREATE UNIQUE INDEX IF NOT EXISTS uq_engagement_invoices_one_live
  ON public.engagement_invoices (proposal_id, kind)
  WHERE voided_at IS NULL AND kind IN ('deposit','balance');
CREATE UNIQUE INDEX IF NOT EXISTS uq_engagement_invoices_session
  ON public.engagement_invoices (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
-- The webhook's identity backstop (idempotency-requires-identity).
CREATE UNIQUE INDEX IF NOT EXISTS uq_engagement_invoices_payment_intent
  ON public.engagement_invoices (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_engagement_invoices_engagement
  ON public.engagement_invoices (engagement_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_invoices_proposal
  ON public.engagement_invoices (proposal_id);

DROP TRIGGER IF EXISTS trg_engagement_invoices_updated_at ON public.engagement_invoices;
CREATE TRIGGER trg_engagement_invoices_updated_at
  BEFORE UPDATE ON public.engagement_invoices
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.engagement_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "engagement_invoices_admin_all" ON public.engagement_invoices;
CREATE POLICY "engagement_invoices_admin_all" ON public.engagement_invoices
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. tg_engagement_invoices_guard — identity, transitions, payment lock
-- ----------------------------------------------------------------------------
-- BEFORE UPDATE. In order:
--   0. engagement_id, proposal_id, kind, currency, amount, pct_of_build,
--      label and recipient_email are immutable ALWAYS — the Checkout params
--      are built from exactly these columns under one idempotency key.
--   1. Transitions are ENUMERATED: draft->sent, draft->void, sent->paid,
--      sent->void, paid->refunded, refunded->void, void->paid (money after a
--      void), and any status to itself (refunded->refunded is how a partial
--      refund grows into a full one). Everything else RAISEs
--      invoice_transition_invalid — in particular paid->void, paid->sent and
--      refunded->paid.
--   2. Once paid_at is set, paid_at and stripe_payment_intent_id are frozen.
--   3. amount_refunded may only grow.
CREATE OR REPLACE FUNCTION public.tg_engagement_invoices_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_allowed boolean;
BEGIN
  IF (NEW.engagement_id, NEW.proposal_id, NEW.kind, NEW.currency, NEW.amount,
      NEW.pct_of_build, NEW.label, NEW.recipient_email)
     IS DISTINCT FROM
     (OLD.engagement_id, OLD.proposal_id, OLD.kind, OLD.currency, OLD.amount,
      OLD.pct_of_build, OLD.label, OLD.recipient_email) THEN
    RAISE EXCEPTION 'invoice_identity_immutable';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_allowed :=
         (OLD.status = 'draft'    AND NEW.status IN ('sent','void'))
      OR (OLD.status = 'sent'     AND NEW.status IN ('paid','void'))
      OR (OLD.status = 'paid'     AND NEW.status = 'refunded')
      OR (OLD.status = 'refunded' AND NEW.status = 'void')
      OR (OLD.status = 'void'     AND NEW.status = 'paid');
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'invoice_transition_invalid'
        USING DETAIL = format('%s -> %s', OLD.status, NEW.status);
    END IF;
  END IF;

  IF OLD.paid_at IS NOT NULL THEN
    IF (NEW.paid_at, NEW.stripe_payment_intent_id)
       IS DISTINCT FROM (OLD.paid_at, OLD.stripe_payment_intent_id) THEN
      RAISE EXCEPTION 'invoice_payment_locked';
    END IF;
  END IF;

  IF OLD.amount_refunded IS NOT NULL
     AND (NEW.amount_refunded IS NULL OR NEW.amount_refunded < OLD.amount_refunded) THEN
    RAISE EXCEPTION 'invoice_refund_shrunk';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engagement_invoices_guard ON public.engagement_invoices;
CREATE TRIGGER trg_engagement_invoices_guard
  BEFORE UPDATE ON public.engagement_invoices
  FOR EACH ROW EXECUTE FUNCTION public.tg_engagement_invoices_guard();

-- ----------------------------------------------------------------------------
-- 3. engagement_deliverables
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagement_deliverables (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  -- Which accepted proposal seeded it; NULL for hand-added rows.
  proposal_id   uuid REFERENCES public.engagement_proposals(id) ON DELETE SET NULL,

  title         text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  phase         text NOT NULL DEFAULT 'build' CHECK (phase IN ('build','launch')),
  status        text NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('planned','in_progress','delivered','accepted')),
  due_on        date,
  delivered_at  timestamptz,
  notes_md      text CHECK (notes_md IS NULL OR char_length(notes_md) <= 4000),
  sort_order    int NOT NULL DEFAULT 0,

  CONSTRAINT engagement_deliverables_delivered_shape_ck CHECK (
    (status IN ('delivered','accepted')) = (delivered_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_engagement_deliverables_engagement
  ON public.engagement_deliverables (engagement_id, phase, sort_order);
CREATE INDEX IF NOT EXISTS idx_engagement_deliverables_proposal
  ON public.engagement_deliverables (proposal_id);

DROP TRIGGER IF EXISTS trg_engagement_deliverables_updated_at ON public.engagement_deliverables;
CREATE TRIGGER trg_engagement_deliverables_updated_at
  BEFORE UPDATE ON public.engagement_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.engagement_deliverables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "engagement_deliverables_admin_all" ON public.engagement_deliverables;
CREATE POLICY "engagement_deliverables_admin_all" ON public.engagement_deliverables
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- BEFORE INSERT OR UPDATE. engagement_id is immutable on UPDATE. Every status
-- move is allowed (decision 7) — the trigger owns delivered_at so the shape
-- CHECK can never be violated by a caller: an ordinary edit (title, notes,
-- due date) of an already-delivered row that omits or nulls delivered_at
-- keeps the ORIGINAL timestamp. transition-allowlist-as-data with an
-- all-pairs allowlist and one derived column: a later unit narrows it here.
CREATE OR REPLACE FUNCTION public.tg_engagement_deliverables_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.engagement_id <> OLD.engagement_id THEN
    RAISE EXCEPTION 'deliverable_identity_immutable';
  END IF;

  IF NEW.status IN ('delivered','accepted') THEN
    NEW.delivered_at := COALESCE(
      NEW.delivered_at,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.delivered_at END,
      now()
    );
  ELSE
    NEW.delivered_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engagement_deliverables_guard ON public.engagement_deliverables;
CREATE TRIGGER trg_engagement_deliverables_guard
  BEFORE INSERT OR UPDATE ON public.engagement_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.tg_engagement_deliverables_guard();

-- ----------------------------------------------------------------------------
-- 4. engagement_events.kind — constraint swap, found through the catalog
-- ----------------------------------------------------------------------------
-- The 074 CHECK is named, but pg_get_constraintdef returns a RECONSTRUCTION
-- (= ANY (ARRAY[…])), never the original IN (…). So: find the CHECK by the
-- column it covers (conkey = the attnum of `kind`), assert exactly one, drop
-- it by name, re-add a superset — the same DO block 074 used.
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
    RAISE EXCEPTION '075: expected exactly one CHECK on engagement_events.kind, found %', v_count;
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
  -- the twelve 074 proposal kinds, verbatim
  'proposal_drafted','proposal_ai_drafted','proposal_ai_failed','proposal_ready','proposal_back_to_draft',
  'proposal_sent','proposal_opened','proposal_accepted','proposal_acceptance_voided',
  'proposal_withdrawn','proposal_superseded','proposal_revoked',
  -- the eight invoice / deliverable kinds
  'invoice_issued','invoice_paid','invoice_payment_failed','invoice_duplicate_payment',
  'invoice_refunded','invoice_voided','deliverables_seeded','deliverable_delivered'
));

-- ----------------------------------------------------------------------------
-- 5. engagement_format_minor — the SQL twin of formatMinorUnits, for summaries
-- ----------------------------------------------------------------------------
-- STABLE, not IMMUTABLE: to_char depends on lc_numeric. Nothing indexes it.
CREATE OR REPLACE FUNCTION public.engagement_format_minor(p_amount int, p_currency text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE upper(p_currency)
           WHEN 'JPY' THEN '¥' || to_char(p_amount, 'FM999,999,999,990')
           ELSE '$' || to_char(p_amount / 100.0, 'FM999,999,999,990.00')
         END;
$$;
REVOKE ALL ON FUNCTION public.engagement_format_minor(int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.engagement_format_minor(int, text) TO service_role;

-- ----------------------------------------------------------------------------
-- 6. RPCs — SECURITY DEFINER, search_path = '', service_role EXECUTE only
-- ----------------------------------------------------------------------------

-- issue_engagement_deposit — Ryan clicks "Request deposit" on the ACCEPTED row.
--   (1) read engagement_id unlocked; (2) lock ENGAGEMENT, engagement_terminal;
--   (3) lock PROPOSAL, proposal_not_accepted; (4) pct in (50,100);
--   (5) total_build = 0 -> nothing to bill; (6) one live deposit already ->
--   invoice_already_issued (the partial unique index is the backstop -> 23505);
--   (7) arithmetic in BIGINT (int*int overflows above ¥21,474,836): integer
--   division on positive ints is round-half-up; the balance is total - deposit
--   so the two sum EXACTLY; (8) recipient snapshot; (9) insert the deposit
--   `sent`; (10) at pct < 100 insert the balance `draft` (never sent this
--   slice); (11) invoice_issued. NO `emailed` key — engagement_events is
--   append-only, so delivery is recorded on the row and by a second event.
CREATE OR REPLACE FUNCTION public.issue_engagement_deposit(
  p_proposal_id uuid,
  p_pct         int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_eid       uuid;
  v_e         public.engagements%ROWTYPE;
  v_p         public.engagement_proposals%ROWTYPE;
  v_deposit   int;
  v_balance   int;
  v_email     text;
  v_word      text;
  v_label     text;
  v_id        uuid;
  v_balance_id uuid;
BEGIN
  SELECT engagement_id INTO v_eid FROM public.engagement_proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal_not_found';
  END IF;

  SELECT * INTO v_e FROM public.engagements WHERE id = v_eid FOR UPDATE;
  IF v_e.stage IN ('lost','closed') THEN
    RAISE EXCEPTION 'engagement_terminal';
  END IF;

  SELECT * INTO v_p FROM public.engagement_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF v_p.status <> 'accepted' THEN
    RAISE EXCEPTION 'proposal_not_accepted';
  END IF;

  IF p_pct IS NULL OR p_pct NOT IN (50, 100) THEN
    RAISE EXCEPTION 'invoice_pct_invalid';
  END IF;
  IF v_p.total_build = 0 THEN
    RAISE EXCEPTION 'invoice_nothing_to_bill';
  END IF;

  -- The live-slot test matches uq_engagement_invoices_one_live exactly.
  IF EXISTS (SELECT 1 FROM public.engagement_invoices x
              WHERE x.proposal_id = v_p.id AND x.kind = 'deposit' AND x.voided_at IS NULL) THEN
    RAISE EXCEPTION 'invoice_already_issued';
  END IF;

  v_deposit := ((v_p.total_build::bigint * p_pct + 50) / 100)::int;
  v_balance := v_p.total_build - v_deposit;
  IF v_deposit < 50 OR (p_pct < 100 AND v_balance < 50) THEN
    RAISE EXCEPTION 'invoice_below_minimum';
  END IF;

  v_email := NULLIF(btrim(v_e.client_contact_email), '');
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'invoice_recipient_required';
  END IF;

  -- left(title, 150) keeps a 200-char title inside the 200-char label CHECK
  -- and Stripe's 250-char product name.
  v_word  := CASE WHEN p_pct = 100 THEN 'Build investment' ELSE 'Deposit' END;
  v_label := format('%s — %s (%s%%)', v_word, left(v_e.title, 150), p_pct);

  INSERT INTO public.engagement_invoices
    (engagement_id, proposal_id, kind, pct_of_build, label, currency, amount,
     recipient_email, status, sent_at)
  VALUES
    (v_eid, v_p.id, 'deposit', p_pct, v_label, v_p.currency, v_deposit,
     v_email, 'sent', now())
  RETURNING id INTO v_id;

  IF p_pct < 100 THEN
    INSERT INTO public.engagement_invoices
      (engagement_id, proposal_id, kind, pct_of_build, label, currency, amount,
       recipient_email, status)
    VALUES
      (v_eid, v_p.id, 'balance', 100 - p_pct,
       format('Balance — %s (%s%%)', left(v_e.title, 150), 100 - p_pct),
       v_p.currency, v_balance, v_email, 'draft')
    RETURNING id INTO v_balance_id;
  END IF;

  INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data)
  VALUES (v_eid, 'invoice_issued', 'admin',
          format('%s requested: %s (%s%% of %s) — v%s',
                 v_word,
                 public.engagement_format_minor(v_deposit, v_p.currency),
                 p_pct,
                 public.engagement_format_minor(v_p.total_build, v_p.currency),
                 v_p.version),
          jsonb_build_object('invoice_id', v_id, 'kind', 'deposit', 'amount', v_deposit,
                             'currency', v_p.currency, 'pct', p_pct,
                             'balance_invoice_id', v_balance_id));

  RETURN jsonb_build_object('invoice_id', v_id, 'balance_invoice_id', v_balance_id,
                            'amount', v_deposit, 'currency', v_p.currency);
END;
$$;
REVOKE ALL ON FUNCTION public.issue_engagement_deposit(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_engagement_deposit(uuid, int) TO service_role;

-- begin_engagement_invoice_checkout — the cookie-authenticated mint's DB half.
--   Locks engagement -> proposal -> invoice, then re-validates the token hash
--   AND every status with all three locks held (authorize-under-the-lock): a
--   revoke or rotate that committed first wins. Returns ONLY immutable
--   invoice/proposal columns, so two clicks under one idempotency key always
--   build identical Checkout params.
CREATE OR REPLACE FUNCTION public.begin_engagement_invoice_checkout(
  p_invoice_id uuid,
  p_token_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_eid     uuid;
  v_pid     uuid;
  v_e       public.engagements%ROWTYPE;
  v_p       public.engagement_proposals%ROWTYPE;
  v_i       public.engagement_invoices%ROWTYPE;
  v_attempt int;
BEGIN
  SELECT engagement_id, proposal_id INTO v_eid, v_pid
    FROM public.engagement_invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_found');
  END IF;

  SELECT * INTO v_e FROM public.engagements WHERE id = v_eid FOR UPDATE;
  IF v_e.stage IN ('lost','closed') THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_open');
  END IF;

  IF v_pid IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_open');
  END IF;
  SELECT * INTO v_p FROM public.engagement_proposals WHERE id = v_pid FOR UPDATE;

  SELECT * INTO v_i FROM public.engagement_invoices WHERE id = p_invoice_id FOR UPDATE;

  -- Credential re-validation on the LOCKED proposal row (074's accept rule).
  IF p_token_hash IS NULL
     OR v_p.access_token_hash IS NULL
     OR p_token_hash <> v_p.access_token_hash
     OR v_p.token_revoked_at IS NOT NULL
     OR v_p.token_expires_at IS NULL
     OR v_p.token_expires_at <= now() THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'forbidden');
  END IF;

  IF v_p.status <> 'accepted' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_open');
  END IF;
  IF v_i.status IN ('paid','refunded') THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'already_paid');
  END IF;
  IF v_i.status <> 'sent' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_open');
  END IF;
  -- A konbini / bank-transfer voucher is outstanding: minting a second
  -- session would invite a second real payment.
  IF v_i.awaiting_async_payment_at IS NOT NULL THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'payment_pending');
  END IF;

  v_attempt := v_i.mint_attempt;
  -- Belt over checkout.session.expired: re-arm when the stored session is
  -- within 60 s of expiry (judgment call 5 — the residual double-pay window).
  IF v_i.stripe_checkout_session_id IS NOT NULL
     AND v_i.checkout_session_expires_at <= now() + interval '60 seconds' THEN
    v_attempt := v_i.mint_attempt + 1;
    UPDATE public.engagement_invoices
       SET mint_attempt                = v_attempt,
           stripe_checkout_session_id  = NULL,
           checkout_session_expires_at = NULL,
           updated_at                  = now()
     WHERE id = v_i.id;
  END IF;

  RETURN jsonb_build_object(
    'applied', true,
    'attempt', v_attempt,
    'invoice_id', v_i.id,
    'amount', v_i.amount,
    'currency', v_i.currency,
    'label', v_i.label,
    'recipient_email', v_i.recipient_email,
    'engagement_id', v_eid,
    'proposal_id', v_p.id,
    'locale', v_p.locale
  );
END;
$$;
REVOKE ALL ON FUNCTION public.begin_engagement_invoice_checkout(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_engagement_invoice_checkout(uuid, text) TO service_role;

-- record_engagement_invoice_checkout — single-row lock; CAS on
-- (status = 'sent' AND mint_attempt = p_attempt). A void or a concurrent
-- re-arm wins and the session Stripe created for the losing attempt simply
-- expires unused. No event: a mint is not a business fact.
CREATE OR REPLACE FUNCTION public.record_engagement_invoice_checkout(
  p_invoice_id uuid,
  p_attempt    int,
  p_session_id text,
  p_expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_i public.engagement_invoices%ROWTYPE;
BEGIN
  SELECT * INTO v_i FROM public.engagement_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_found');
  END IF;
  IF v_i.status <> 'sent' OR v_i.mint_attempt <> p_attempt THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'stale');
  END IF;
  IF p_session_id IS NULL OR p_expires_at IS NULL THEN
    RAISE EXCEPTION 'invoice_session_shape';
  END IF;

  UPDATE public.engagement_invoices
     SET stripe_checkout_session_id  = p_session_id,
         checkout_session_expires_at = p_expires_at,
         checkout_count              = checkout_count + 1,
         updated_at                  = now()
   WHERE id = v_i.id;

  RETURN jsonb_build_object('applied', true);
END;
$$;
REVOKE ALL ON FUNCTION public.record_engagement_invoice_checkout(uuid, int, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_engagement_invoice_checkout(uuid, int, text, timestamptz) TO service_role;

-- rearm_engagement_invoice_checkout — single-row lock. Two callers: the
-- checkout.session.expired handler (WITH the session id, so a stale event for
-- a session already replaced matches nothing) and the mint route after a
-- Stripe idempotency_error (with NULL — force a fresh key, then retry once).
-- Refuses while an async payment is outstanding. No event.
CREATE OR REPLACE FUNCTION public.rearm_engagement_invoice_checkout(
  p_invoice_id uuid,
  p_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_i public.engagement_invoices%ROWTYPE;
BEGIN
  SELECT * INTO v_i FROM public.engagement_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_found');
  END IF;
  IF v_i.status <> 'sent'
     OR v_i.awaiting_async_payment_at IS NOT NULL
     OR (p_session_id IS NOT NULL AND v_i.stripe_checkout_session_id IS DISTINCT FROM p_session_id) THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'stale');
  END IF;

  UPDATE public.engagement_invoices
     SET mint_attempt                = mint_attempt + 1,
         stripe_checkout_session_id  = NULL,
         checkout_session_expires_at = NULL,
         updated_at                  = now()
   WHERE id = v_i.id;

  RETURN jsonb_build_object('applied', true, 'attempt', v_i.mint_attempt + 1);
END;
$$;
REVOKE ALL ON FUNCTION public.rearm_engagement_invoice_checkout(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rearm_engagement_invoice_checkout(uuid, text) TO service_role;

-- mark_engagement_invoice_awaiting_async — single-row lock.
--   p_clear = false (from `completed` with payment_status='unpaid'): stamp
--   awaiting_async_payment_at, which blocks a second mint.
--   p_clear = true (from async_payment_failed): clear it so the client can pay
--   again. No event from either path; the failed path's event is the
--   handler's.
CREATE OR REPLACE FUNCTION public.mark_engagement_invoice_awaiting_async(
  p_invoice_id uuid,
  p_session_id text,
  p_clear      boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_i public.engagement_invoices%ROWTYPE;
BEGIN
  SELECT * INTO v_i FROM public.engagement_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_found');
  END IF;
  IF v_i.status <> 'sent' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_open');
  END IF;
  IF p_session_id IS NULL OR v_i.stripe_checkout_session_id IS DISTINCT FROM p_session_id THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'stale');
  END IF;

  UPDATE public.engagement_invoices
     SET awaiting_async_payment_at = CASE WHEN p_clear THEN NULL ELSE now() END,
         updated_at                = now()
   WHERE id = v_i.id;

  RETURN jsonb_build_object('applied', true, 'cleared', p_clear);
END;
$$;
REVOKE ALL ON FUNCTION public.mark_engagement_invoice_awaiting_async(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_engagement_invoice_awaiting_async(uuid, text, boolean) TO service_role;

-- mark_engagement_invoice_paid — THE WEBHOOK'S WRITE. Three locks in order
-- (proposal_id may be NULL on a future care row — then the proposal lock is
-- skipped). Then, in order:
--   (0) not_found — the engagement was deleted and the cascade took the
--       invoice; the webhook logs, emails Ryan and returns 200 (there is no
--       row to retry into);
--   (1) already paid/refunded by the SAME payment intent -> already_paid (a
--       replay: `completed` + `async_payment_succeeded` for one payment).
--       A DIFFERENT payment intent is a real SECOND payment: write
--       invoice_duplicate_payment and return duplicate_payment. Never a
--       silent no-op — Stripe took that money;
--   (2) amount/currency mismatch -> RAISE (the price is server-set and
--       promotion codes are off, so this is tampering or a Stripe-side
--       change; the handler writes invoice_payment_failed and returns 200 so
--       Stripe does not retry into the same wall);
--   (3) the write, clearing awaiting_async_payment_at;
--   (4) invoice_paid (needs_attention). Stage and won_at are NOT touched.
CREATE OR REPLACE FUNCTION public.mark_engagement_invoice_paid(
  p_invoice_id        uuid,
  p_session_id        text,
  p_payment_intent_id text,
  p_amount_total      int,
  p_currency          text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_eid     uuid;
  v_pid     uuid;
  v_e       public.engagements%ROWTYPE;
  v_p       public.engagement_proposals%ROWTYPE;
  v_i       public.engagement_invoices%ROWTYPE;
  v_was_void boolean;
BEGIN
  SELECT engagement_id, proposal_id INTO v_eid, v_pid
    FROM public.engagement_invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_found');
  END IF;

  SELECT * INTO v_e FROM public.engagements WHERE id = v_eid FOR UPDATE;
  IF v_pid IS NOT NULL THEN
    SELECT * INTO v_p FROM public.engagement_proposals WHERE id = v_pid FOR UPDATE;
  END IF;
  SELECT * INTO v_i FROM public.engagement_invoices WHERE id = p_invoice_id FOR UPDATE;

  IF v_i.status IN ('paid','refunded') THEN
    IF p_payment_intent_id IS NOT DISTINCT FROM v_i.stripe_payment_intent_id THEN
      RETURN jsonb_build_object('applied', false, 'reason', 'already_paid');
    END IF;

    INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data, needs_attention)
    VALUES (v_eid, 'invoice_duplicate_payment', 'system',
            format('A SECOND payment of %s landed on an already-paid invoice — refund %s in Stripe',
                   public.engagement_format_minor(p_amount_total, p_currency),
                   COALESCE(p_payment_intent_id, '(unknown payment intent)')),
            jsonb_build_object('invoice_id', v_i.id, 'amount', p_amount_total,
                               'currency', upper(p_currency), 'payment_intent_id', p_payment_intent_id,
                               'session_id', p_session_id,
                               'original_payment_intent_id', v_i.stripe_payment_intent_id),
            true);
    RETURN jsonb_build_object('applied', false, 'reason', 'duplicate_payment',
                              'engagement_id', v_eid, 'kind', v_i.kind,
                              'amount', p_amount_total, 'currency', upper(p_currency),
                              'payment_intent_id', p_payment_intent_id);
  END IF;

  IF p_amount_total IS DISTINCT FROM v_i.amount OR upper(p_currency) IS DISTINCT FROM v_i.currency THEN
    RAISE EXCEPTION 'invoice_amount_mismatch';
  END IF;
  IF p_payment_intent_id IS NULL THEN
    RAISE EXCEPTION 'invoice_payment_intent_required';
  END IF;

  v_was_void := v_i.status = 'void';

  UPDATE public.engagement_invoices
     SET status                     = 'paid',
         paid_at                    = now(),
         stripe_payment_intent_id   = p_payment_intent_id,
         stripe_checkout_session_id = COALESCE(stripe_checkout_session_id, p_session_id),
         checkout_session_expires_at = CASE
           WHEN stripe_checkout_session_id IS NULL AND p_session_id IS NOT NULL
             THEN COALESCE(checkout_session_expires_at, now())
           ELSE checkout_session_expires_at END,
         awaiting_async_payment_at  = NULL,
         updated_at                 = now()
   WHERE id = v_i.id;

  INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data, needs_attention)
  VALUES (v_eid, 'invoice_paid', 'client',
          CASE WHEN v_was_void
               THEN format('Payment received on a VOIDED invoice: %s — refund it in Stripe',
                           public.engagement_format_minor(v_i.amount, v_i.currency))
               ELSE format('%s received: %s',
                           CASE WHEN v_i.kind = 'deposit' AND v_i.pct_of_build = 100
                                THEN 'Build investment'
                                WHEN v_i.kind = 'deposit' THEN 'Deposit'
                                WHEN v_i.kind = 'balance' THEN 'Balance'
                                ELSE 'Payment' END,
                           public.engagement_format_minor(v_i.amount, v_i.currency))
          END,
          jsonb_build_object('invoice_id', v_i.id, 'kind', v_i.kind, 'amount', v_i.amount,
                             'currency', v_i.currency, 'payment_intent_id', p_payment_intent_id,
                             'session_id', p_session_id, 'on_void', v_was_void),
          true);

  RETURN jsonb_build_object('applied', true, 'engagement_id', v_eid, 'kind', v_i.kind,
                            'amount', v_i.amount, 'currency', v_i.currency, 'on_void', v_was_void);
END;
$$;
REVOKE ALL ON FUNCTION public.mark_engagement_invoice_paid(uuid, text, text, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_engagement_invoice_paid(uuid, text, text, int, text) TO service_role;

-- mark_engagement_invoice_refunded — from charge.refunded. Finds the invoice
-- by payment intent WITHOUT a lock (not_found = the charge belongs to a
-- course, and the caller falls through to the enrollment branch), then the
-- three locks. A partial refund flips the status too (judgment call 3) and a
-- later refund GROWS amount_refunded (refunded -> refunded).
CREATE OR REPLACE FUNCTION public.mark_engagement_invoice_refunded(
  p_payment_intent_id text,
  p_amount_refunded   int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id  uuid;
  v_eid uuid;
  v_pid uuid;
  v_e   public.engagements%ROWTYPE;
  v_p   public.engagement_proposals%ROWTYPE;
  v_i   public.engagement_invoices%ROWTYPE;
BEGIN
  IF p_payment_intent_id IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_found');
  END IF;
  SELECT id, engagement_id, proposal_id INTO v_id, v_eid, v_pid
    FROM public.engagement_invoices WHERE stripe_payment_intent_id = p_payment_intent_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_found');
  END IF;

  SELECT * INTO v_e FROM public.engagements WHERE id = v_eid FOR UPDATE;
  IF v_pid IS NOT NULL THEN
    SELECT * INTO v_p FROM public.engagement_proposals WHERE id = v_pid FOR UPDATE;
  END IF;
  SELECT * INTO v_i FROM public.engagement_invoices WHERE id = v_id FOR UPDATE;

  IF v_i.status IN ('draft','sent','void') THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_paid');
  END IF;
  IF v_i.status = 'refunded' AND p_amount_refunded <= COALESCE(v_i.amount_refunded, 0) THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'already_refunded');
  END IF;

  UPDATE public.engagement_invoices
     SET status          = 'refunded',
         refunded_at     = COALESCE(refunded_at, now()),
         amount_refunded = p_amount_refunded,
         updated_at      = now()
   WHERE id = v_i.id;

  INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data, needs_attention)
  VALUES (v_eid, 'invoice_refunded', 'system',
          format('%s refunded: %s of %s (%s) — void the acceptance if the deal is off',
                 CASE WHEN v_i.kind = 'deposit' AND v_i.pct_of_build = 100 THEN 'Build investment'
                      WHEN v_i.kind = 'deposit' THEN 'Deposit'
                      WHEN v_i.kind = 'balance' THEN 'Balance'
                      ELSE 'Payment' END,
                 public.engagement_format_minor(p_amount_refunded, v_i.currency),
                 public.engagement_format_minor(v_i.amount, v_i.currency),
                 CASE WHEN p_amount_refunded < v_i.amount THEN 'partial' ELSE 'full' END),
          jsonb_build_object('invoice_id', v_i.id, 'amount', v_i.amount,
                             'amount_refunded', p_amount_refunded, 'currency', v_i.currency,
                             'partial', p_amount_refunded < v_i.amount),
          true);

  RETURN jsonb_build_object('applied', true, 'engagement_id', v_eid, 'invoice_id', v_i.id,
                            'partial', p_amount_refunded < v_i.amount);
END;
$$;
REVOKE ALL ON FUNCTION public.mark_engagement_invoice_refunded(text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_engagement_invoice_refunded(text, int) TO service_role;

-- ----------------------------------------------------------------------------
-- 7. void_engagement_proposal_acceptance — CREATE OR REPLACE. The 074 body
--    verbatim plus ONE block: lock this proposal's non-void invoices in the
--    lock order (engagement -> proposal -> invoice); REFUSE while any is paid
--    (refund in Stripe first — there is no force flag); otherwise void the
--    draft|sent|refunded ones in the same transaction.
-- ----------------------------------------------------------------------------
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
  v_inv      record;
  v_voided   int := 0;
  v_has_paid boolean := false;
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

  -- 075: lock this proposal's non-void invoices in the one lock order
  -- (engagement -> proposal -> invoice), then decide. A paid invoice REFUSES
  -- the void — money in Stripe must be refunded before the ledger says the
  -- acceptance never happened. No force flag.
  FOR v_inv IN
    SELECT i.id, i.status
      FROM public.engagement_invoices i
     WHERE i.proposal_id = v_p.id AND i.status <> 'void'
     ORDER BY i.created_at
     FOR UPDATE
  LOOP
    IF v_inv.status = 'paid' THEN
      v_has_paid := true;
    END IF;
  END LOOP;
  IF v_has_paid THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'invoice_paid');
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

  -- 075: void the draft|sent|refunded invoices of this proposal.
  FOR v_inv IN
    SELECT i.id, i.kind, i.amount, i.currency
      FROM public.engagement_invoices i
     WHERE i.proposal_id = v_p.id AND i.status IN ('draft','sent','refunded')
     ORDER BY i.created_at
     FOR UPDATE
  LOOP
    UPDATE public.engagement_invoices
       SET status      = 'void',
           voided_at   = now(),
           void_reason = 'Acceptance voided: ' || v_reason,
           updated_at  = now()
     WHERE id = v_inv.id;

    INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data)
    VALUES (v_eid, 'invoice_voided', 'admin',
            format('Invoice voided (%s, %s) — acceptance of v%s voided',
                   v_inv.kind, public.engagement_format_minor(v_inv.amount, v_inv.currency), v_p.version),
            jsonb_build_object('invoice_id', v_inv.id, 'kind', v_inv.kind, 'amount', v_inv.amount,
                               'currency', v_inv.currency, 'reason', 'acceptance_voided'));
    v_voided := v_voided + 1;
  END LOOP;

  RETURN jsonb_build_object('applied', true, 'stage_reverted', v_reverted, 'invoices_voided', v_voided);
END;
$$;
REVOKE ALL ON FUNCTION public.void_engagement_proposal_acceptance(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.void_engagement_proposal_acceptance(uuid, text) TO service_role;

-- ----------------------------------------------------------------------------
-- 8. tg_engagements_stage_sync — CREATE OR REPLACE. The 074 body verbatim
--    plus ONE block in the terminal branch: void the draft|sent invoices.
--    paid and refunded rows are UNTOUCHED — a closed care plan keeps its
--    money history. Reopening does not undo it; Ryan re-issues explicitly
--    (the void freed the slot).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_engagements_stage_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_p record;
  v_inv record;
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

    -- 075: void the unpaid invoices. The accepted proposal is NOT in 074's
    -- open loop, so its parent rows are locked here first — engagement ->
    -- proposal -> invoice, the one lock order (sweep-revalidate-under-lock).
    PERFORM 1 FROM public.engagement_proposals p
      WHERE p.id IN (SELECT DISTINCT i.proposal_id FROM public.engagement_invoices i
                      WHERE i.engagement_id = NEW.id AND i.status IN ('draft','sent')
                        AND i.proposal_id IS NOT NULL)
      ORDER BY p.version
      FOR UPDATE;

    FOR v_inv IN
      SELECT i.id, i.kind, i.amount, i.currency
        FROM public.engagement_invoices i
       WHERE i.engagement_id = NEW.id AND i.status IN ('draft','sent')
       ORDER BY i.created_at
       FOR UPDATE
    LOOP
      UPDATE public.engagement_invoices
         SET status      = 'void',
             voided_at   = now(),
             void_reason = format('Engagement marked %s', NEW.stage),
             updated_at  = now()
       WHERE id = v_inv.id;

      INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data)
      VALUES (NEW.id, 'invoice_voided', 'system',
              format('Invoice voided (%s, %s) — engagement marked %s',
                     v_inv.kind, public.engagement_format_minor(v_inv.amount, v_inv.currency), NEW.stage),
              jsonb_build_object('invoice_id', v_inv.id, 'kind', v_inv.kind, 'amount', v_inv.amount,
                                 'currency', v_inv.currency, 'reason', NEW.stage));
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
-- 9. engagement_list — replaced; SIX columns APPENDED (CREATE OR REPLACE VIEW
--    may only append) after proposal_first_opened_at.
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
  p.first_opened_at     AS proposal_first_opened_at,
  -- 075 — the live deposit + the build-phase deliverable counters.
  i.id                  AS deposit_invoice_id,
  i.status              AS deposit_status,
  i.amount              AS deposit_amount,
  i.paid_at             AS deposit_paid_at,
  COALESCE(d.open_count, 0)  AS deliverables_open_count,
  COALESCE(d.total_count, 0) AS deliverables_total_count
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
) p ON true
LEFT JOIN LATERAL (
  SELECT i2.id, i2.status, i2.amount, i2.paid_at
    FROM public.engagement_invoices i2
   WHERE i2.engagement_id = e.id AND i2.kind = 'deposit' AND i2.status <> 'void'
   ORDER BY i2.created_at DESC
   LIMIT 1
) i ON true
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE d2.status IN ('planned','in_progress') AND d2.phase = 'build')::int AS open_count,
         count(*)::int AS total_count
    FROM public.engagement_deliverables d2
   WHERE d2.engagement_id = e.id
) d ON true;

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-migration verification (run in the SQL editor after applying):
--
-- 1. Both tables exist, RLS on, exactly one policy each (expect 2 rows with
--    rowsecurity = true, and 2 policy rows):
--      select tablename, rowsecurity from pg_tables
--       where schemaname = 'public'
--         and tablename in ('engagement_invoices','engagement_deliverables');
--      select tablename, policyname, cmd from pg_policies
--       where schemaname = 'public'
--         and tablename in ('engagement_invoices','engagement_deliverables');
--
-- 2. The shape constraints exist — CREATE TABLE IF NOT EXISTS would silently
--    skip them on a pre-existing table (expect 4 rows):
--      select conname from pg_constraint
--       where conname in ('engagement_invoices_status_shape_ck',
--                         'engagement_invoices_pct_shape_ck',
--                         'engagement_invoices_session_shape_ck',
--                         'engagement_deliverables_delivered_shape_ck');
--
-- 3. The eight RPCs + the helper are service-role only. For each, expect
--    exactly service_role and postgres — NEITHER anon NOR authenticated:
--      select routine_name, grantee from information_schema.routine_privileges
--       where routine_schema = 'public'
--         and routine_name in ('issue_engagement_deposit','begin_engagement_invoice_checkout',
--                              'record_engagement_invoice_checkout','rearm_engagement_invoice_checkout',
--                              'mark_engagement_invoice_awaiting_async','mark_engagement_invoice_paid',
--                              'mark_engagement_invoice_refunded','void_engagement_proposal_acceptance',
--                              'engagement_format_minor')
--       order by routine_name, grantee;
--
-- 4. The view carries the six new columns (expect 6 rows):
--      select column_name from information_schema.columns
--       where table_schema = 'public' and table_name = 'engagement_list'
--         and column_name in ('deposit_invoice_id','deposit_status','deposit_amount',
--                             'deposit_paid_at','deliverables_open_count','deliverables_total_count');
--
-- 5. Exactly one CHECK covers engagement_events.kind and it accepts the new
--    kinds (expect 1 row named engagement_events_kind_check whose definition
--    contains 'invoice_paid'):
--      select c.conname, pg_get_constraintdef(c.oid) like '%invoice_paid%' as has_new_kinds
--        from pg_constraint c
--       where c.conrelid = 'public.engagement_events'::regclass and c.contype = 'c'
--         and c.conkey = array[(select a.attnum from pg_attribute a
--                                where a.attrelid = c.conrelid and a.attname = 'kind')];
--
-- 6. The two guards and the amended sweep are armed (expect 3 rows):
--      select tgname from pg_trigger
--       where tgname in ('trg_engagement_invoices_guard',
--                        'trg_engagement_deliverables_guard',
--                        'trg_engagements_stage_sync');
--
-- 7. The money formatter agrees with the TS formatter (expect $437.50, ¥66,000):
--      select public.engagement_format_minor(43750, 'USD'),
--             public.engagement_format_minor(66000, 'JPY');
--
-- 8. As anon / an ordinary authenticated user, both tables are empty or denied:
--      select * from public.engagement_invoices;      -- 0 rows / permission denied
--      select * from public.engagement_deliverables;  -- 0 rows / permission denied
-- ----------------------------------------------------------------------------
