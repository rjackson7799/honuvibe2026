'use client';

// The proposal panel — states off the LATEST proposal's status (none → draft
// → ready → sent → accepted → voided, plus withdrawn / superseded history
// rows). Precedent: EngagementDiscoveryPanel (button classes, useTransition +
// inline error, the amber review strip when status='draft' &&
// drafting_status='completed', the CJK warning for a ja proposal whose drafted
// sections contain no Japanese, "Notification not sent — resend"). Extra
// states here: the GATE strip when the hard gate is unmet (Create disabled —
// the RPC enforces it), the STALE-BRIEF strip, the PROVISIONAL strip,
// "Viewed 3× · first Mar 14", and the drafting-in-progress LOCK.
//
// Slice A: manual issue only. Link delivery buttons render disabled until
// slice B ships the client page.

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { ProposalPricingForm, draftFromProposal, initialDraft, proposalInputFromDraft, type PricingDraft } from './ProposalPricingForm';
import { ProposalSectionsEditor } from './ProposalSectionsEditor';
import { ProposalVersionList } from './ProposalVersionList';
import {
  createProposal,
  issueProposal,
  markProposalAccepted,
  markProposalReady,
  proposalBackToDraft,
  resendAcceptNotification,
  reviseProposal,
  saveProposal,
  voidProposalAcceptance,
  withdrawProposal,
} from '@/lib/studio/engagement/proposal-actions';
import { formatDateTime, formatMinorUnits, formatRelativeDays, formatShortDate } from '@/lib/studio/engagement/format';
import { seedSections } from '@/lib/studio/engagement/proposal-terms';
import type { ProposalSection } from '@/lib/studio/engagement/proposal-schema';
import { PROPOSAL_AI_SECTION_KEYS } from '@/lib/studio/engagement/types';
import type { Engagement, EngagementBrief, EngagementProposal, EngagementQuestionnaire } from '@/lib/admin/types';

const ghostBtn =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors';
const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[12.5px] font-semibold shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-all';
const dangerBtn =
  'inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border border-[color:var(--accent-coral)]/40 text-[color:var(--accent-coral)] text-[12.5px] font-semibold hover:bg-[color:var(--accent-coral-subtle)] disabled:opacity-50 transition-colors';

const DRAFT_ERROR_COPY: Record<string, string> = {
  timeout: 'The AI draft timed out — the proposal is untouched. Re-draft to try again.',
  provider_error: 'The AI draft failed on the AI side — the proposal is untouched. Re-draft to try again.',
  malformed_output: 'The AI returned an unusable draft — the proposal is untouched. Re-draft to try again.',
  emitted_price: 'The draft mentioned the investment amount — re-draft; the numbers belong in the table.',
  stale_input: 'The proposal changed while the AI was drafting — re-draft.',
  missing_key: 'AI drafting is not configured (ANTHROPIC_API_KEY).',
  internal: 'The AI draft failed — check the server logs.',
};

const CJK = /[぀-ヿ一-鿿]/;

export function EngagementProposalPanel({
  engagement,
  proposals,
  questionnaire,
  latestBrief,
}: {
  engagement: Engagement;
  /** All versions, newest first. */
  proposals: EngagementProposal[];
  questionnaire: EngagementQuestionnaire | null;
  /** The newest completed|partial brief (the RPC's rule), or null. */
  latestBrief: EngagementBrief | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<'draft' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);

  const latest = proposals[0] ?? null;
  const editable = !!latest && (latest.status === 'draft' || latest.status === 'ready');
  const drafting = !!latest && latest.drafting_status === 'generating';

  // Editing state seeded from the latest row (keyed by content_version so a
  // refresh after a save / AI draft re-seeds it).
  const [draft, setDraft] = useState<PricingDraft>(() => (latest && editable ? draftFromProposal(latest) : initialDraft(engagement)));
  const [sections, setSections] = useState<ProposalSection[]>(() => (latest && editable ? latest.sections : seedSections(engagement.locale)));
  const [seededFrom, setSeededFrom] = useState<string>(latest ? `${latest.id}:${latest.content_version}:${latest.status}` : 'none');
  const seedKey = latest ? `${latest.id}:${latest.content_version}:${latest.status}` : 'none';
  if (seedKey !== seededFrom) {
    setSeededFrom(seedKey);
    if (latest && editable) {
      setDraft(draftFromProposal(latest));
      setSections(latest.sections);
    }
  }

  // The hard gate, mirrored for the strip (the RPC enforces it).
  const submitted = !!questionnaire && questionnaire.status === 'submitted' && !!questionnaire.submitted_at;
  const briefUsable = !!latestBrief && (latestBrief.status === 'completed' || latestBrief.status === 'partial');
  const briefStale =
    !!latestBrief &&
    !!questionnaire?.submitted_at &&
    (latestBrief.questionnaire_id !== questionnaire.id || new Date(latestBrief.created_at).getTime() < new Date(questionnaire.submitted_at).getTime());
  const gateOk = submitted && briefUsable && !briefStale;

  const noCjk = useMemo(() => {
    if (!latest || latest.locale !== 'ja' || latest.drafting_status !== 'completed') return false;
    const text = latest.sections
      .filter((s) => (PROPOSAL_AI_SECTION_KEYS as readonly string[]).includes(s.key))
      .map((s) => s.body_md)
      .join(' ');
    return !CJK.test(text);
  }, [latest]);

  function run(label: string, fn: () => Promise<void>) {
    setError('');
    setNotice('');
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : `${label} failed.`);
      }
    });
  }

  function buildInput() {
    return proposalInputFromDraft(draft, sections);
  }

  function handleCreate() {
    run('Create', async () => {
      const input = buildInput();
      await createProposal(engagement.id, input);
      setCreating(false);
      setNotice('Proposal created at draft. Price is set — draft the narrative with AI, or write it yourself.');
    });
  }

  function handleSave() {
    if (!latest) return;
    if (latest.status === 'ready' && !window.confirm('Saving returns this proposal to Draft — mark it ready again after. Continue?')) return;
    run('Save', async () => {
      const input = buildInput();
      const r = await saveProposal(latest.id, input, latest.content_version);
      setNotice(`Saved (content v${r.content_version}${r.status === 'draft' && latest.status === 'ready' ? ' — back at Draft' : ''}).`);
    });
  }

  async function handleAiDraft() {
    if (!latest) return;
    const touched = latest.sections.some((s) => (PROPOSAL_AI_SECTION_KEYS as readonly string[]).includes(s.key) && s.body_md.trim() !== '');
    if (
      !window.confirm(
        touched
          ? 'Re-draft with AI? The five narrative sections (executive summary, takeaways, recommendation, scope, investment notes) are REPLACED — your edits to them are lost. Terms and next steps are kept.'
          : 'Draft the five narrative sections with AI from the brief and the priced offer? Terms and next steps stay as seeded.',
      )
    )
      return;
    setBusy('draft');
    setError('');
    setNotice('');
    try {
      const res = await fetch(`/api/admin/engagements/${engagement.id}/proposal/${latest.id}/draft`, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string; languageLooksRight?: boolean; confidenceNote?: string };
      if (!res.ok) {
        setError(data.error ?? DRAFT_ERROR_COPY[data.code ?? 'internal'] ?? 'Drafting failed.');
      } else {
        setNotice(`Drafted. Read every section before Mark ready — the narrative must carry no price.${data.languageLooksRight === false ? ' ⚠ The draft contains no Japanese.' : ''}${data.confidenceNote ? ` Confidence note: ${data.confidenceNote}` : ''}`);
      }
    } catch {
      setError('Drafting failed — check your connection and try again.');
    } finally {
      setBusy(null);
      router.refresh();
    }
  }

  function handleMarkReady() {
    if (!latest) return;
    if (!window.confirm("Mark ready? I've checked the narrative carries no price — the investment table is the only place the numbers appear.")) return;
    run('Mark ready', () => markProposalReady(latest.id));
  }

  function handleIssueManual() {
    if (!latest) return;
    if (!window.confirm('Issue for manual delivery? This freezes the document and archives the PDF. After this, content cannot change — fixing anything means a new version.')) return;
    run('Issue', async () => {
      const r = await issueProposal(latest.id, 'manual');
      setNotice(`Issued — valid until ${r.validUntil}. Download the archived PDF below and email it yourself.`);
    });
  }

  function handleWithdraw() {
    if (!latest) return;
    if (!window.confirm('Withdraw this proposal? It leaves the open slot; a new version can be created afterwards.')) return;
    run('Withdraw', () => withdrawProposal(latest.id));
  }

  function handleRevise(source: EngagementProposal) {
    const supersedes = source.status === 'draft' || source.status === 'ready' || source.status === 'sent';
    if (!window.confirm(supersedes ? `Revise v${source.version}? A new draft version is created with its content, and v${source.version} is superseded.` : `Create a new draft version from v${source.version}'s content?`)) return;
    run('Revise', async () => {
      await reviseProposal(source.id);
      setNotice('New version created at draft.');
    });
  }

  function handleMarkAccepted() {
    if (!latest) return;
    const name = window.prompt('Who accepted? (name, as it should appear on the record)');
    if (name === null) return;
    if (!window.confirm(`Record acceptance by "${name.trim()}"? This moves the engagement to Build and sets the contract value to ${formatMinorUnits(latest.total_build, latest.currency)} (${formatMinorUnits(latest.total_monthly, latest.currency)}/mo care).`)) return;
    run('Mark accepted', async () => {
      const r = await markProposalAccepted(latest.id, name);
      setNotice(`Accepted.${r.stageMoved ? ' Engagement moved to Build.' : ''}${r.notified ? '' : ' Notification email failed — resend from the panel.'}`);
    });
  }

  function handleVoid() {
    if (!latest) return;
    const reason = window.prompt('Why void this acceptance? (recorded on the timeline)');
    if (reason === null) return;
    if (!window.confirm('Void the acceptance? This clears the contract value, returns a Build engagement to Proposal, and frees the slot for a corrected version. won_at is retained (067 rule).')) return;
    run('Void', async () => {
      const r = await voidProposalAcceptance(latest.id, reason);
      setNotice(`Acceptance voided.${r.stageReverted ? ' Engagement returned to Proposal.' : ''} Revise from the voided row to issue a corrected version.`);
    });
  }

  const working = pending || busy !== null;
  const pdfHref = latest ? `/api/admin/engagements/${engagement.id}/proposal/${latest.id}/pdf` : '#';

  return (
    <section className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-bold text-fg-primary">Proposal</h2>
        {latest && (
          <span className="inline-flex items-center gap-2 flex-wrap">
            <StatusBadge status={latest.status} />
            {drafting && (
              <span className="inline-flex items-center gap-1 text-[12px] text-fg-tertiary">
                <Loader2 size={12} className="animate-spin" /> AI drafting…
              </span>
            )}
            <span className="text-[12px] text-fg-tertiary">
              v{latest.version} · {latest.locale === 'ja' ? 'Japanese' : 'English'} · {latest.currency} · {formatMinorUnits(latest.total_build, latest.currency)} build · {formatMinorUnits(latest.total_monthly, latest.currency)}/mo
            </span>
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">{error}</div>
      )}
      {notice && (
        <div className="rounded-lg border border-[color:var(--accent-teal)]/30 bg-[color:var(--accent-teal-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">{notice}</div>
      )}

      {/* ── none / create ─────────────────────────────────────────────── */}
      {(!latest || latest.status === 'withdrawn' || latest.status === 'superseded' || latest.status === 'voided') && !creating && (
        <div className="space-y-3">
          {!gateOk && (
            <div className="rounded-lg border border-border-default bg-bg-tertiary px-4 py-2.5 text-[13px] text-fg-secondary">
              {!submitted
                ? 'Send the discovery questionnaire and wait for the brief before proposing.'
                : briefStale
                  ? 'The brief predates the current submission — regenerate it before proposing.'
                  : 'Wait for the discovery brief (completed or partial) before proposing.'}
            </div>
          )}
          {latest?.status === 'voided' && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-fg-secondary">
              Acceptance of v{latest.version} was voided {latest.voided_at ? formatDateTime(latest.voided_at) : ''} — &ldquo;{latest.void_reason}&rdquo;. Revise it to issue a corrected version, or create a fresh one.
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => { setDraft(initialDraft(engagement)); setSections(seedSections(engagement.locale)); setCreating(true); }} disabled={working || !gateOk} className={primaryBtn} title={gateOk ? undefined : 'The hard gate is unmet'}>
              Create proposal
            </button>
            {latest && (
              <button type="button" onClick={() => handleRevise(latest)} disabled={working || !gateOk} className={ghostBtn}>
                Revise v{latest.version}
              </button>
            )}
            {latest?.issued_pdf_path && (
              <a href={pdfHref} className={ghostBtn}>Download PDF (v{latest.version})</a>
            )}
          </div>
        </div>
      )}

      {creating && !editable && (
        <div className="space-y-4">
          <p className="text-[13px] text-fg-secondary">Price first. The narrative is drafted after the offer is set — Claude sees the price as context and never states it.</p>
          <ProposalPricingForm draft={draft} onChange={setDraft} readOnly={false} />
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={handleCreate} disabled={working} className={primaryBtn}>
              {working ? <Loader2 size={13} className="animate-spin" /> : null} Create at draft
            </button>
            <button type="button" onClick={() => setCreating(false)} disabled={working} className={ghostBtn}>Cancel</button>
            <span className="text-[12px] text-fg-tertiary">Terms and next steps are seeded in {engagement.locale === 'ja' ? 'Japanese' : 'English'}; you edit them next.</span>
          </div>
        </div>
      )}

      {/* ── draft / ready ─────────────────────────────────────────────── */}
      {latest && editable && (
        <div className="space-y-4">
          {latest.status === 'draft' && latest.drafting_status === 'completed' && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-[13px] text-amber-800">
              <span className="font-semibold">AI-drafted narrative — review before marking ready.</span> Drafted {latest.drafted_at ? formatDateTime(latest.drafted_at) : ''}
              {latest.drafting_model_id ? ` by ${latest.drafting_model_id}` : ''}. Read every section; confirm it carries no price. Mark ready is the gate.
              {noCjk && <span className="mt-1 block font-semibold">⚠ This is a Japanese proposal but the drafted text contains no Japanese — re-draft or rewrite before issuing.</span>}
            </div>
          )}
          {latest.drafting_status === 'failed' && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-fg-secondary">
              {DRAFT_ERROR_COPY[latest.drafting_error ?? 'internal'] ?? 'The AI draft failed.'}
            </div>
          )}
          {latest.data_basis === 'provisional' && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-[13px] text-amber-800">
              Provisional data basis — the document carries the &ldquo;to be confirmed against your records&rdquo; footnote and † marks. Switch to client records once real data is in.
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={handleSave} disabled={working || drafting} className={primaryBtn}>Save</button>
            {latest.status === 'draft' ? (
              <>
                <button type="button" onClick={() => void handleAiDraft()} disabled={working || drafting} className={ghostBtn}>
                  {busy === 'draft' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {busy === 'draft' ? 'Drafting…' : latest.drafting_status === 'none' ? 'Draft with AI' : 'Re-draft with AI'}
                </button>
                <button type="button" onClick={handleMarkReady} disabled={working || drafting} className={ghostBtn}>Mark ready</button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleIssueManual} disabled={working} className={primaryBtn}>Issue for manual delivery</button>
                <button type="button" disabled className={primaryBtn} title="Link delivery ships with the client proposal page (next release)">Issue &amp; send link</button>
                <button type="button" onClick={() => run('Back to draft', () => proposalBackToDraft(latest.id))} disabled={working} className={ghostBtn}>Back to draft</button>
              </>
            )}
            <a href={pdfHref} className={ghostBtn}>Download PDF (preview)</a>
            <button type="button" onClick={handleWithdraw} disabled={working || drafting} className={dangerBtn}>Withdraw</button>
          </div>
          <p className="text-[12px] text-fg-tertiary">
            {latest.status === 'draft' ? 'Issue unlocks after Mark ready. Saving on Ready returns the proposal to Draft.' : 'Issuing freezes the document and archives the PDF; a change after that is a new version.'}
          </p>

          <ProposalPricingForm draft={draft} onChange={setDraft} readOnly={drafting || busy === 'draft'} />
          <ProposalSectionsEditor
            sections={sections}
            onChange={setSections}
            readOnly={drafting || busy === 'draft'}
            lockMessage={drafting || busy === 'draft' ? 'AI is drafting — edits unlock when it finishes.' : null}
          />
        </div>
      )}

      {/* ── sent ───────────────────────────────────────────────────────── */}
      {latest && latest.status === 'sent' && (
        <div className="space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-fg-tertiary">Issued</dt>
              <dd className="text-fg-secondary">{latest.sent_at ? `${formatDateTime(latest.sent_at)} · ${formatRelativeDays(latest.sent_at)}` : '—'} · {latest.delivery_method === 'manual' ? 'manual delivery' : 'link'}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-tertiary">Valid until</dt>
              <dd className="text-fg-secondary">{latest.valid_until ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-tertiary">Client views</dt>
              <dd className="text-fg-secondary">{latest.open_count > 0 ? `Viewed ${latest.open_count}× · first ${latest.first_opened_at ? formatShortDate(latest.first_opened_at) : '—'}` : 'Not opened yet'}</dd>
            </div>
          </dl>
          {latest.data_basis === 'provisional' && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-[13px] text-amber-800">Issued on a provisional data basis (footnote on the document).</div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <a href={pdfHref} className={ghostBtn}>Download PDF (archived)</a>
            <button type="button" onClick={handleMarkAccepted} disabled={working} className={primaryBtn}>Mark accepted</button>
            <button type="button" onClick={() => handleRevise(latest)} disabled={working} className={ghostBtn}>Revise</button>
            <button type="button" disabled className={ghostBtn} title="Link delivery ships with the client proposal page (next release)">Resend link</button>
            <button type="button" onClick={handleWithdraw} disabled={working} className={dangerBtn}>Withdraw</button>
          </div>
          <p className="text-[12px] text-fg-tertiary">The document is frozen. To change anything, Revise — the client keeps this version as a PDF.</p>
        </div>
      )}

      {/* ── accepted ───────────────────────────────────────────────────── */}
      {latest && latest.status === 'accepted' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[color:var(--accent-teal)]/30 bg-[color:var(--accent-teal-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
            <span className="font-semibold text-fg-primary">Accepted ✓</span> by {latest.accepted_by_name} ({latest.accepted_via}) {latest.accepted_at ? formatDateTime(latest.accepted_at) : ''} — {formatMinorUnits(latest.total_build, latest.currency)} build · {formatMinorUnits(latest.total_monthly, latest.currency)}/mo care on the engagement record.
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-fg-tertiary">Notification</dt>
              <dd className={latest.notification_sent_at ? 'text-fg-secondary' : 'text-[color:var(--accent-coral)] font-medium'}>
                {latest.notification_sent_at ? `Emailed ${formatDateTime(latest.notification_sent_at)}` : 'Notification not sent'}
                {!latest.notification_sent_at && (
                  <>
                    {' — '}
                    <button type="button" onClick={() => run('Resend notification', () => resendAcceptNotification(latest.id))} disabled={working} className="underline hover:no-underline">resend</button>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-fg-tertiary">Issued</dt>
              <dd className="text-fg-secondary">{latest.sent_at ? formatDateTime(latest.sent_at) : '—'} · valid until {latest.valid_until ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-tertiary">Client views</dt>
              <dd className="text-fg-secondary">{latest.open_count > 0 ? `Viewed ${latest.open_count}×` : 'Not opened online'}</dd>
            </div>
          </dl>
          <div className="flex items-center gap-2 flex-wrap">
            <a href={pdfHref} className={ghostBtn}>Download PDF (archived)</a>
            <button type="button" disabled className={ghostBtn} title="Link delivery ships with the client proposal page (next release)">Resend link</button>
            <button type="button" onClick={handleVoid} disabled={working} className={dangerBtn}>Void acceptance</button>
          </div>
        </div>
      )}

      {proposals.length > 0 && (
        <div className="border-t border-border-default pt-3 space-y-2">
          <p className="text-[12px] font-semibold text-fg-tertiary">Versions</p>
          <ProposalVersionList proposals={proposals} engagementId={engagement.id} />
        </div>
      )}
    </section>
  );
}
