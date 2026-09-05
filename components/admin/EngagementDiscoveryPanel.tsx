'use client';

// The centerpiece of slice 2: six states off questionnaire.status
// (none → draft → ready → sent → in_progress → submitted), the human-review
// gate (Send is disabled until Mark ready; tailoring always lands at draft),
// the amber review strip when status='draft' && tailoring_status='completed',
// the CJK warning for a ja questionnaire whose tailored output has no
// Japanese, copy-link ONLY in the send/resend response, and the
// "Notification not sent — resend" state. Existing panel chrome.

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Loader2, Sparkles } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { QuestionnaireEditor } from './QuestionnaireEditor';
import {
  backToDraft,
  draftFromTemplate,
  markReady,
  reopenQuestionnaire,
  resendNotification,
  resendQuestionnaire,
  revokeLink,
  sendQuestionnaire,
  startOver,
} from '@/lib/studio/engagement/questionnaire-actions';
import { formatDateTime, formatRelativeDays, formatShortDate } from '@/lib/studio/engagement/format';
import type { Engagement, EngagementQuestionnaire } from '@/lib/admin/types';

const ghostBtn =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-bg-primary border border-border-default text-fg-secondary text-[12.5px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors';
const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[12.5px] font-semibold shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-all';
const dangerBtn =
  'inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border border-[color:var(--accent-coral)]/40 text-[color:var(--accent-coral)] text-[12.5px] font-semibold hover:bg-[color:var(--accent-coral-subtle)] disabled:opacity-50 transition-colors';

const TAILOR_ERROR_COPY: Record<string, string> = {
  timeout: 'Tailoring timed out — the template draft is untouched.',
  provider_error: 'Tailoring failed on the AI side — the template draft is untouched.',
  malformed_output: 'The AI returned an unusable draft — the template draft is untouched.',
  too_many_dropped: 'The AI tried to drop too many template questions and was rejected — the template draft is untouched.',
  missing_key: 'AI tailoring is not configured (ANTHROPIC_API_KEY).',
  internal: 'Tailoring failed — check the server logs.',
};

const CJK = /[぀-ヿ一-鿿]/;

function tokenState(q: EngagementQuestionnaire): 'none' | 'live' | 'expired' | 'revoked' {
  if (!q.access_token_hash) return 'none';
  if (q.token_revoked_at) return 'revoked';
  if (q.token_expires_at && new Date(q.token_expires_at).getTime() <= Date.now()) return 'expired';
  return 'live';
}

export function EngagementDiscoveryPanel({
  engagement,
  questionnaire,
  answeredCount,
}: {
  engagement: Engagement;
  questionnaire: EngagementQuestionnaire | null;
  answeredCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<'tailor' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tailorWanted, setTailorWanted] = useState(true);
  const [link, setLink] = useState<{ url: string; emailed: boolean; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const hasEmail = !!engagement.client_contact_email?.trim();
  const q = questionnaire;
  const token = q ? tokenState(q) : 'none';

  const noCjk = useMemo(() => {
    if (!q || q.locale !== 'ja' || q.tailoring_status !== 'completed') return false;
    const text = [...q.sections.map((s) => `${s.title} ${s.blurb ?? ''}`), ...q.questions.map((x) => `${x.prompt} ${x.help ?? ''} ${x.options.map((o) => o.label).join(' ')}`)].join(' ');
    return !CJK.test(text);
  }, [q]);

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

  async function tailor(questionnaireId: string) {
    setBusy('tailor');
    setError('');
    setNotice('');
    try {
      const res = await fetch(`/api/admin/engagements/${engagement.id}/questionnaire/tailor`, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string; questionCount?: number; dropped?: string[]; added?: string[]; rationale?: string };
      if (!res.ok) {
        setError(data.error ?? TAILOR_ERROR_COPY[data.code ?? 'internal'] ?? 'Tailoring failed.');
      } else {
        setNotice(
          `Tailored: ${data.questionCount} questions (${data.added?.length ?? 0} added, ${data.dropped?.length ?? 0} dropped).${data.rationale ? ` ${data.rationale}` : ''}`,
        );
      }
    } catch {
      setError('Tailoring failed — check your connection and try again.');
    } finally {
      setBusy(null);
      router.refresh();
    }
    void questionnaireId;
  }

  function handleDraft() {
    setError('');
    setNotice('');
    startTransition(async () => {
      try {
        const { questionnaireId } = await draftFromTemplate(engagement.id, 'small_business_discovery');
        if (tailorWanted) await tailor(questionnaireId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to draft the questionnaire.');
      }
    });
  }

  function handleSend(mode: 'send' | 'resend') {
    if (!q) return;
    if (mode === 'resend' && !window.confirm('Rotate the link? The previous link stops working and the client gets a fresh email.')) return;
    setError('');
    setNotice('');
    setLink(null);
    startTransition(async () => {
      try {
        const result = mode === 'send' ? await sendQuestionnaire(q.id) : await resendQuestionnaire(q.id);
        setLink({ url: result.url, emailed: result.emailed, expiresAt: result.expiresAt });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sending failed.');
      }
    });
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Copy failed — select the link and copy it by hand.');
    }
  }

  const working = pending || busy !== null;

  return (
    <section className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-bold text-fg-primary">Discovery questionnaire</h2>
        {q && (
          <span className="inline-flex items-center gap-2 flex-wrap">
            <StatusBadge status={q.status} />
            {q.tailoring_status === 'generating' && (
              <span className="inline-flex items-center gap-1 text-[12px] text-fg-tertiary">
                <Loader2 size={12} className="animate-spin" /> tailoring…
              </span>
            )}
            <span className="text-[12px] text-fg-tertiary">{q.locale === 'ja' ? 'Japanese' : 'English'} · v{q.questions_version}</span>
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-[color:var(--accent-teal)]/30 bg-[color:var(--accent-teal-subtle)] px-4 py-2.5 text-[13px] text-fg-secondary">
          {notice}
        </div>
      )}

      {/* The send/resend response: the ONLY place the link is ever shown. */}
      {link && (
        <div className={`rounded-lg border px-4 py-3 text-[13px] space-y-2 ${link.emailed ? 'border-[color:var(--accent-teal)]/30 bg-[color:var(--accent-teal-subtle)]' : 'border-[color:var(--accent-coral)]/40 bg-[color:var(--accent-coral-subtle)]'}`}>
          <p className="font-semibold text-fg-primary">
            {link.emailed
              ? `Email sent to ${engagement.client_contact_email}. Link valid until ${formatShortDate(link.expiresAt)}.`
              : 'Email failed — copy the link and send it yourself.'}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="min-w-0 flex-1 truncate rounded bg-bg-primary px-2 py-1.5 font-mono text-[11.5px] text-fg-secondary">{link.url}</code>
            <button type="button" onClick={copyLink} className={ghostBtn}>
              {copied ? <Check size={14} className="text-[color:var(--accent-teal)]" /> : <Copy size={14} />}
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
          </div>
          <p className="text-[12px] text-fg-tertiary">This link is shown once. Resend to get a new one.</p>
        </div>
      )}

      {/* ── none ─────────────────────────────────────────────────────────── */}
      {!q && (
        <div className="space-y-3">
          <p className="text-[13px] text-fg-secondary">
            Draft the discovery questionnaire from the <span className="font-mono text-[12px]">small_business_discovery</span> template
            in {engagement.locale === 'ja' ? 'Japanese' : 'English'} (7 sections, economics second). You review and edit it before anything is sent.
          </p>
          <label className="flex items-center gap-2 text-[13px] text-fg-secondary min-h-[44px]">
            <input type="checkbox" checked={tailorWanted} onChange={(e) => setTailorWanted(e.target.checked)} />
            Tailor with AI using the lead record and the latest website audit
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={handleDraft} disabled={working} className={primaryBtn}>
              {working ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {busy === 'tailor' ? 'Tailoring…' : working ? 'Drafting…' : tailorWanted ? 'Draft & tailor' : 'Draft from template'}
            </button>
            {!hasEmail && <span className="text-[12px] text-fg-tertiary">Add a client email above before sending.</span>}
          </div>
        </div>
      )}

      {/* ── draft / ready ────────────────────────────────────────────────── */}
      {q && (q.status === 'draft' || q.status === 'ready') && (
        <div className="space-y-4">
          {q.status === 'draft' && q.tailoring_status === 'completed' && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-[13px] text-amber-800">
              <span className="font-semibold">AI-tailored draft — review before sending.</span> Tailored {q.tailored_at ? formatDateTime(q.tailored_at) : ''}
              {q.tailoring_model_id ? ` by ${q.tailoring_model_id}` : ''}. Read every question; Mark ready is the gate.
              {noCjk && (
                <span className="mt-1 block font-semibold">
                  ⚠ This is a Japanese questionnaire but the tailored text contains no Japanese — re-tailor or rewrite before sending.
                </span>
              )}
            </div>
          )}
          {q.tailoring_status === 'failed' && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-fg-secondary">
              {TAILOR_ERROR_COPY[q.tailoring_error ?? 'internal'] ?? 'Tailoring failed.'}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {q.status === 'draft' ? (
              <>
                <button type="button" onClick={() => run('Mark ready', () => markReady(q.id))} disabled={working || q.tailoring_status === 'generating'} className={primaryBtn}>
                  Mark ready
                </button>
                <button type="button" onClick={() => void tailor(q.id)} disabled={working || q.tailoring_status === 'generating'} className={ghostBtn}>
                  {busy === 'tailor' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {busy === 'tailor' ? 'Tailoring…' : q.tailoring_status === 'none' ? 'Tailor with AI' : 'Re-tailor'}
                </button>
                <button type="button" disabled className={primaryBtn} title="Mark ready first">
                  Send to client
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => handleSend('send')} disabled={working || !hasEmail} className={primaryBtn} title={hasEmail ? undefined : 'Add a client email first'}>
                  Send to client
                </button>
                <button type="button" onClick={() => run('Back to draft', () => backToDraft(q.id))} disabled={working} className={ghostBtn}>
                  Back to draft
                </button>
              </>
            )}
            <span className="text-[12px] text-fg-tertiary">
              {q.status === 'draft' ? 'Send unlocks after Mark ready.' : hasEmail ? `Will email ${engagement.client_contact_email}.` : 'Add a client email above to send.'}
            </span>
          </div>

          <QuestionnaireEditor key={`${q.id}-${q.questions_version}-${q.status}`} questionnaire={q} mode="full" />

          <div className="border-t border-border-default pt-3">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Start over? This resets the questionnaire to a fresh draft and clears any test answers.')) run('Start over', () => startOver(q.id));
              }}
              disabled={working}
              className={dangerBtn}
            >
              Start over
            </button>
          </div>
        </div>
      )}

      {/* ── sent / in_progress ───────────────────────────────────────────── */}
      {q && (q.status === 'sent' || q.status === 'in_progress') && (
        <div className="space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-fg-tertiary">Sent</dt>
              <dd className="text-fg-secondary">{q.sent_at ? `${formatDateTime(q.sent_at)} · ${formatRelativeDays(q.sent_at)}` : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-tertiary">Link</dt>
              <dd className={token === 'live' ? 'text-fg-secondary' : 'text-[color:var(--accent-coral)] font-medium'}>
                {token === 'live' && q.token_expires_at ? `Valid until ${formatShortDate(q.token_expires_at)}` : token === 'expired' ? 'Expired — resend' : token === 'revoked' ? 'Revoked — resend to reissue' : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-fg-tertiary">Progress</dt>
              <dd className="text-fg-secondary">
                {answeredCount} of {q.questions.length} answered
                {q.open_count > 0 ? ` · opened ${q.open_count}× (first ${q.first_opened_at ? formatShortDate(q.first_opened_at) : '—'})` : ' · not opened yet'}
              </dd>
            </div>
          </dl>

          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => handleSend('resend')} disabled={working || !hasEmail} className={primaryBtn}>
              Resend (new link)
            </button>
            {token === 'live' && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Revoke the link? The client's open tab will stop saving until you resend.")) run('Revoke', () => revokeLink(q.id));
                }}
                disabled={working}
                className={ghostBtn}
              >
                Revoke link
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Start over? The client's saved answers are deleted, the link is revoked, and the questionnaire returns to draft.")) run('Start over', () => startOver(q.id));
              }}
              disabled={working}
              className={dangerBtn}
            >
              Start over
            </button>
          </div>

          <QuestionnaireEditor key={`${q.id}-${q.questions_version}-${q.status}`} questionnaire={q} mode="reword" />
        </div>
      )}

      {/* ── submitted ────────────────────────────────────────────────────── */}
      {q && q.status === 'submitted' && (
        <div className="space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-fg-tertiary">Submitted</dt>
              <dd className="text-fg-secondary">{q.submitted_at ? formatDateTime(q.submitted_at) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-tertiary">Notification</dt>
              <dd className={q.notification_sent_at ? 'text-fg-secondary' : 'text-[color:var(--accent-coral)] font-medium'}>
                {q.notification_sent_at ? `Emailed ${formatDateTime(q.notification_sent_at)}` : 'Notification not sent'}
                {!q.notification_sent_at && (
                  <>
                    {' — '}
                    <button type="button" onClick={() => run('Resend notification', () => resendNotification(q.id))} disabled={working} className="underline hover:no-underline">
                      resend
                    </button>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-fg-tertiary">Link</dt>
              <dd className="text-fg-secondary">
                {token === 'live' && q.token_expires_at ? `Valid until ${formatShortDate(q.token_expires_at)}` : token === 'expired' ? 'Expired' : token === 'revoked' ? 'Revoked' : '—'}
              </dd>
            </div>
          </dl>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reopen for the client to edit? Their submitted answers stay on record until they resubmit.')) run('Reopen', () => reopenQuestionnaire(q.id));
              }}
              disabled={working || token !== 'live'}
              className={primaryBtn}
              title={token !== 'live' ? 'Resend a link first, then reopen' : undefined}
            >
              Reopen for edits
            </button>
            <button type="button" onClick={() => handleSend('resend')} disabled={working || !hasEmail} className={ghostBtn}>
              Resend link
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Start over? The submitted answers and snapshot are cleared and the questionnaire returns to draft. Existing briefs are kept.')) run('Start over', () => startOver(q.id));
              }}
              disabled={working}
              className={dangerBtn}
            >
              Start over
            </button>
            {token !== 'live' && <span className="text-[12px] text-fg-tertiary">Reopen needs a live link — resend first.</span>}
          </div>
        </div>
      )}
    </section>
  );
}
