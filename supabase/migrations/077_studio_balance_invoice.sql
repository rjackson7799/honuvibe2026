-- ============================================================================
-- 077_studio_balance_invoice.sql — Studio balance invoice (engagement spine,
--                                  slice 5)
-- ============================================================================
-- Plan: docs/plans/2026-09-06-studio-balance-invoice.md (rev 3, approved).
--
-- Slice 4 (075) creates the BALANCE row as `draft` at deposit time and has no
-- way to send it, so every 50% engagement accrues a second half of the money
-- the system cannot collect. This closes that: one RPC promotes the draft to
-- `sent`, and the client pays it through the SAME route, band and Checkout
-- path the deposit already uses.
--
-- NO new tables, columns, indexes or event kinds — therefore NO constraint
-- swap. 075 built engagement_invoices around an invoice id, so the money path
-- already generalises. Three things happen here:
--
--   1. send_engagement_invoice   the draft -> sent transition, gated on the
--                                engagement having reached launch|care.
--   2. tg_engagements_stage_sync 075's body verbatim, ONE predicate changed:
--                                on `closed` the terminal sweep now voids
--                                NOTHING. See section 2 for why.
--   3. a one-time repair         rows a `closed` sweep already voided, restored
--                                only where that is UNAMBIGUOUS.
--
-- LOCK ORDER — engagement -> proposal -> invoice — unchanged, and
-- send_engagement_invoice follows it, so it cannot deadlock with 074's or
-- 075's writers.
--
-- NEVER in engagement_events.data: a Stripe event body, a Checkout URL, a card
-- detail, an email address. Allowed: invoice id, kind, amount, currency, pct.
--
-- ROLLOUT — APPLY BEFORE THE DEPLOY (the 062/074/075 precedent). Everything
-- here is additive or strictly more permissive: a new RPC nothing calls yet,
-- a sweep that voids strictly LESS than before, and a repair that is a no-op
-- when there is nothing to repair. Applying first means there is no interval
-- in which the panel calls an RPC that does not exist.
--
-- NUMBERING: 075 is the highest committed migration; 076 is taken by the
-- uncommitted 076_business_upgrade_plans.sql in the working tree, so this
-- is 077.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. send_engagement_invoice — the draft -> sent transition
-- ----------------------------------------------------------------------------
-- Ryan clicks "Send balance" on the accepted proposal once the build ships.
--   (1) read engagement_id/proposal_id unlocked; not found -> invoice_not_found;
--   (2) lock ENGAGEMENT; terminal -> engagement_terminal;
--   (3) stage must be launch|care -> invoice_not_billable_yet. `care` is
--       included because a care plan that began before the balance went out
--       still owes it;
--   (4) lock PROPOSAL; must be accepted -> proposal_not_accepted;
--   (5) lock INVOICE and return a TRUTHFUL verdict per status — `already_sent`
--       for every non-draft would lie about three of them;
--   (6) a recipient is required, exactly as issue_engagement_deposit demands;
--   (7) flip to sent; (8) reuse the invoice_issued kind (no constraint swap —
--       the timeline distinguishes them by summary); (9) return the row's
--       immutable money columns.
--
-- The 075 guard already permits draft -> sent and already freezes identity, so
-- no guard change is needed here.
--
-- NO `emailed` key in the event data: engagement_events is append-only, so
-- delivery is recorded on the row (invoice_email_sent_at) and by a second
-- event, never by mutating this one. 075's issue_engagement_deposit makes the
-- same choice for the same reason.
CREATE OR REPLACE FUNCTION public.send_engagement_invoice(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_eid  uuid;
  v_pid  uuid;
  v_e    public.engagements%ROWTYPE;
  v_p    public.engagement_proposals%ROWTYPE;
  v_i    public.engagement_invoices%ROWTYPE;
  v_noun text;
BEGIN
  SELECT engagement_id, proposal_id INTO v_eid, v_pid
    FROM public.engagement_invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice_not_found';
  END IF;

  SELECT * INTO v_e FROM public.engagements WHERE id = v_eid FOR UPDATE;
  IF v_e.stage IN ('lost','closed') THEN
    RAISE EXCEPTION 'engagement_terminal';
  END IF;
  IF v_e.stage NOT IN ('launch','care') THEN
    RAISE EXCEPTION 'invoice_not_billable_yet';
  END IF;

  -- An invoice with no proposal has no accepted contract behind it, so there
  -- is nothing to bill against. Same verdict as "not yet".
  IF v_pid IS NULL THEN
    RAISE EXCEPTION 'invoice_not_billable_yet';
  END IF;
  SELECT * INTO v_p FROM public.engagement_proposals WHERE id = v_pid FOR UPDATE;
  IF v_p.status <> 'accepted' THEN
    RAISE EXCEPTION 'proposal_not_accepted';
  END IF;

  SELECT * INTO v_i FROM public.engagement_invoices WHERE id = p_invoice_id FOR UPDATE;

  -- Verdicts, not exceptions: these are states the caller can legitimately
  -- reach by double-clicking or reloading, and each deserves its own sentence.
  IF v_i.status = 'sent' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'already_sent');
  ELSIF v_i.status IN ('paid','refunded') THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'already_paid');
  ELSIF v_i.status = 'void' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'voided');
  ELSIF v_i.status <> 'draft' THEN
    RAISE EXCEPTION 'invoice_transition_invalid';
  END IF;

  IF NULLIF(btrim(COALESCE(v_i.recipient_email, '')), '') IS NULL THEN
    RAISE EXCEPTION 'invoice_recipient_required';
  END IF;

  UPDATE public.engagement_invoices
     SET status     = 'sent',
         sent_at    = now(),
         updated_at = now()
   WHERE id = v_i.id;

  v_noun := CASE WHEN v_i.kind = 'balance' THEN 'Balance'
                 WHEN v_i.kind = 'care_month' THEN 'Care'
                 ELSE 'Invoice' END;

  INSERT INTO public.engagement_events (engagement_id, kind, actor, summary, data)
  VALUES (v_eid, 'invoice_issued', 'admin',
          format('%s requested: %s (%s%% of %s) — v%s',
                 v_noun,
                 public.engagement_format_minor(v_i.amount, v_i.currency),
                 COALESCE(v_i.pct_of_build, 100),
                 public.engagement_format_minor(v_p.total_build, v_p.currency),
                 v_p.version),
          jsonb_build_object('invoice_id', v_i.id, 'kind', v_i.kind, 'amount', v_i.amount,
                             'currency', v_i.currency, 'pct', v_i.pct_of_build));

  RETURN jsonb_build_object('applied', true, 'invoice_id', v_i.id,
                            'amount', v_i.amount, 'currency', v_i.currency);
END;
$$;
REVOKE ALL ON FUNCTION public.send_engagement_invoice(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_engagement_invoice(uuid) TO service_role;

-- ----------------------------------------------------------------------------
-- 2. tg_engagements_stage_sync — 075's body verbatim, ONE predicate changed
-- ----------------------------------------------------------------------------
-- `lost` means the deal died: void draft AND sent, unchanged from 075.
-- `closed` means the work FINISHED: void NOTHING.
--
-- Voiding on close bought no protection worth its cost. A closed engagement's
-- invoices cannot be newly authorized either way — begin_engagement_invoice_
-- checkout refuses while the stage is terminal — and voiding made closing
-- unrecoverable in two distinct ways:
--
--   * a SENT balance could never be re-sent after a reopen, because the guard
--     has no void -> sent transition; and
--   * a DRAFT balance spared by a narrower rule made re-issuing the deposit
--     crash with 23505 on uq_engagement_invoices_one_live, since the balance
--     still occupied its live slot.
--
-- Note the precision, because it argues FOR keeping the rows rather than
-- against: "cannot be newly authorized" is narrower than "inert". An already
-- open Checkout session keeps working and mark_engagement_invoice_paid has no
-- stage test at all, so money can still land after a close — which is exactly
-- when you want a live, truthful invoice row to receive it.
--
-- Everything else in this function — the lead mirror, stage_changed, the
-- questionnaire revoke, 074's proposal-withdrawal loop and the attention
-- sweep — is copied VERBATIM from 075 and still runs for BOTH terminal stages.
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

    -- 077: void the unpaid invoices ON `lost` ONLY (see the header). The
    -- accepted proposal is NOT in 074's open loop, so its parent rows are
    -- locked here first — engagement -> proposal -> invoice, the one lock
    -- order (sweep-revalidate-under-lock). Both the PERFORM and the loop moved
    -- inside this branch together; splitting them would take the proposal lock
    -- on a close for no reason.
    IF NEW.stage = 'lost' THEN
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
    END IF;

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
-- 3. One-time repair — rows a `closed` sweep already voided
-- ----------------------------------------------------------------------------
-- Between 075 landing (2026-09-06) and this migration, closing an engagement
-- voided its unpaid invoices. Expected to match ZERO rows — prod held zero
-- engagements and zero invoices when this was written — but that is verified
-- here, not assumed.
--
-- Matching the void reason and an accepted proposal is NOT sufficient. Two
-- sequences reachable under 075 make a naive restore wrong, and the first one
-- FAILS THE MIGRATION:
--
--   * THE SLOT WAS RE-TAKEN. issue -> close (voids both) -> reopen -> Request
--     deposit again. The re-issue found no live deposit and inserted a fresh
--     deposit + balance. Restoring the originals puts two `voided_at IS NULL`
--     rows in one (proposal_id, kind) slot -> 23505 on
--     uq_engagement_invoices_one_live.
--   * THE DEAL LATER DIED. close -> then `lost`. engagements.stage carries
--     only a value CHECK, no transition allowlist (067), and the second sweep
--     finds nothing in draft|sent to void, so the rows keep the OLDER reason
--     'Engagement marked closed'. A naive restore revives money on a dead deal.
--   * TWO CANDIDATES CONTEST ONE SLOT. close -> reopen -> reissue -> close
--     again. BOTH voided rows now sit in the same (proposal_id, kind) slot and
--     NEITHER sees a live row, so `slot_taken` is false for both and a single
--     UPDATE would un-void the pair — the same 23505, reached without any live
--     row being involved. `slot_contested` catches it: a slot with more than
--     one candidate cannot be resolved without knowing which one Ryan meant.
--
-- So: preflight and name every candidate, restore only the unambiguous ones,
-- and ABORT (before any write) rather than guess.
DO $$
DECLARE
  v_row       record;
  v_restored  int;
  v_ambiguous int;
BEGIN
  CREATE TEMP TABLE _077_candidates ON COMMIT DROP AS
  SELECT i.id,
         i.kind,
         i.sent_at,
         e.stage,
         EXISTS (SELECT 1 FROM public.engagement_invoices o
                  WHERE o.proposal_id = i.proposal_id
                    AND o.kind        = i.kind
                    AND o.voided_at IS NULL)          AS slot_taken,
         (e.stage = 'lost')                           AS deal_lost,
         (count(*) OVER (PARTITION BY i.proposal_id, i.kind) > 1) AS slot_contested
    FROM public.engagement_invoices  i
    JOIN public.engagement_proposals p ON p.id = i.proposal_id
    JOIN public.engagements          e ON e.id = i.engagement_id
   WHERE p.status      = 'accepted'
     AND i.status      = 'void'
     AND i.void_reason = 'Engagement marked closed';

  FOR v_row IN SELECT * FROM _077_candidates ORDER BY id LOOP
    RAISE NOTICE '077 candidate % (kind=%, stage=%, slot_taken=%, deal_lost=%, slot_contested=%)',
                 v_row.id, v_row.kind, v_row.stage, v_row.slot_taken, v_row.deal_lost,
                 v_row.slot_contested;
  END LOOP;

  SELECT count(*) INTO v_ambiguous FROM _077_candidates
   WHERE slot_taken OR deal_lost OR slot_contested;
  IF v_ambiguous > 0 THEN
    RAISE EXCEPTION
      '077 repair: % ambiguous candidate(s) — reconcile by hand, then re-run. See the NOTICEs above.',
      v_ambiguous;
  END IF;

  -- The guard has no void -> draft/sent transition (correctly — this is a
  -- migration-time repair, not something the app may ever do), so it is
  -- disabled for exactly this statement, inside the migration transaction,
  -- and re-enabled before the block ends.
  ALTER TABLE public.engagement_invoices DISABLE TRIGGER trg_engagement_invoices_guard;

  WITH repaired AS (
    UPDATE public.engagement_invoices i
       SET status      = CASE WHEN i.sent_at IS NULL THEN 'draft' ELSE 'sent' END,
           voided_at   = NULL,
           void_reason = NULL,
           updated_at  = now()
      FROM _077_candidates c
     WHERE c.id = i.id
     RETURNING 1)
  SELECT count(*) INTO v_restored FROM repaired;

  ALTER TABLE public.engagement_invoices ENABLE TRIGGER trg_engagement_invoices_guard;
  RAISE NOTICE '077 repair: restored % invoice(s) voided by a closed sweep', v_restored;
END $$;

COMMIT;
