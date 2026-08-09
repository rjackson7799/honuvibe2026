'use client';

// Blue Filler — the idea's scores, exit math and Taste Memory controls.
//
// Scores show the generation-time value and the delta the latest completed
// research applied, so a research pass that moved a score is visible rather than
// silently overwriting history. gen_scores is never mutated.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateIdeaStatus, updateIdeaVerdict } from '@/lib/blue-filler/actions';
import { SCORE_KEYS, SCORE_LABELS, type BlueFillerIdea, type IdeaStatus } from '@/lib/blue-filler/types';
import { SCORE_WEIGHTS, THESIS_BAND } from '@/lib/blue-filler/scoring';
import { getIndustry } from '@/lib/blue-filler/industry-map';

const STATUSES: IdeaStatus[] = ['new', 'shortlist', 'archived'];

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function BlueFillerIdeaOverview({ idea }: { idea: BlueFillerIdea }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [note, setNote] = useState(idea.verdict_note ?? '');

  const industry = getIndustry(idea.industry_key);
  const { exit_assumptions: assumptions, exit_math: math } = idea.thesis;

  function run(action: () => Promise<void>) {
    setError('');
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Scores */}
      <section className="rounded-xl border border-border-primary bg-bg-secondary p-5">
        <h2 className="text-base font-semibold text-fg-primary">Scores</h2>
        <ul className="mt-4 space-y-3">
          {SCORE_KEYS.map((key) => {
            const current = idea.current_scores[key];
            const generated = idea.gen_scores[key];
            const delta = current - generated;
            return (
              <li key={key} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-xs text-fg-secondary">
                  {SCORE_LABELS[key]}
                  <span className="ml-1 text-fg-muted">×{SCORE_WEIGHTS[key]}</span>
                </span>
                <div
                  className="h-2 flex-1 rounded-full bg-bg-tertiary overflow-hidden"
                  role="img"
                  aria-label={`${SCORE_LABELS[key]}: ${current} out of 10${
                    delta === 0 ? '' : `, ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} after research`
                  }`}
                >
                  <div
                    className="h-full rounded-full bg-[color:var(--accent-teal)]"
                    style={{ width: `${current * 10}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-xs tabular-nums text-fg-primary">
                  {current}
                  {delta !== 0 && (
                    <span
                      className={
                        delta > 0
                          ? 'ml-1 text-[color:var(--accent-teal)]'
                          : 'ml-1 text-[color:var(--accent-coral)]'
                      }
                    >
                      {delta > 0 ? '+' : ''}
                      {delta}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[11px] text-fg-muted">
          Composite {idea.composite} · grade {idea.grade} · {industry?.label ?? idea.industry_key}
          {industry ? ` · priors reviewed ${industry.lastReviewedAt}` : ''}
        </p>
      </section>

      {/* Exit math */}
      <section className="rounded-xl border border-border-primary bg-bg-secondary p-5">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-fg-primary">Exit math</h2>
          {idea.thesis.exit_in_thesis_band ? (
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[color:var(--accent-teal)]">
              In thesis band
            </span>
          ) : (
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[color:var(--accent-gold)]">
              Outside the {usd.format(THESIS_BAND.min)}–{usd.format(THESIS_BAND.max)} band
            </span>
          )}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Target exit', usd.format(assumptions.target_exit_usd)],
            ['Assumed multiple', `${assumptions.assumed_multiple}× ARR`],
            ['Needed ARR', usd.format(math.needed_arr_usd)],
            [
              'Customers needed',
              `${math.customers_needed.toLocaleString('en-US')} @ ${usd.format(assumptions.price_point_monthly_usd)}/mo`,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] uppercase tracking-[0.04em] text-fg-muted">{label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-fg-primary">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[11px] text-fg-muted">
          Needed ARR and customer count are computed from the model&apos;s assumptions, not supplied
          by it. Any QSBS or tax-structuring angle mentioned anywhere in this idea is a HYPOTHESIS
          only and requires qualified tax and legal review before it means anything.
        </p>
      </section>

      {/* Taste Memory */}
      <section className="rounded-xl border border-border-primary bg-bg-secondary p-5 space-y-4">
        <h2 className="text-base font-semibold text-fg-primary">Your call</h2>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Idea status">
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={idea.status === status}
              disabled={pending}
              onClick={() => run(() => updateIdeaStatus(idea.id, status))}
              className={`min-h-[44px] px-4 rounded-full text-sm font-medium border transition-colors disabled:opacity-60 ${
                idea.status === status
                  ? 'border-[color:var(--border-accent)] bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)]'
                  : 'border-border-primary text-fg-secondary hover:border-border-hover'
              }`}
            >
              {status === 'new' ? 'New' : status === 'shortlist' ? 'Shortlist' : 'Archive'}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label htmlFor="bf-verdict-note" className="block text-xs font-semibold text-fg-secondary">
            Why? <span className="font-normal text-fg-muted">(feeds the taste profile)</span>
          </label>
          <textarea
            id="bf-verdict-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={500}
            className="w-full text-base rounded-lg border border-border-primary bg-bg-primary px-3 py-2 text-fg-primary"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={idea.verdict === 'interested'}
              disabled={pending}
              onClick={() => run(() => updateIdeaVerdict(idea.id, 'interested', note))}
              className={`min-h-[44px] px-4 rounded-full text-sm font-medium border transition-colors disabled:opacity-60 ${
                idea.verdict === 'interested'
                  ? 'border-[color:var(--border-accent)] bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)]'
                  : 'border-border-primary text-fg-secondary hover:border-border-hover'
              }`}
            >
              Interested
            </button>
            <button
              type="button"
              aria-pressed={idea.verdict === 'pass'}
              disabled={pending}
              onClick={() => run(() => updateIdeaVerdict(idea.id, 'pass', note))}
              className={`min-h-[44px] px-4 rounded-full text-sm font-medium border transition-colors disabled:opacity-60 ${
                idea.verdict === 'pass'
                  ? 'border-[color:var(--border-accent)] bg-[rgba(26,43,51,0.06)] text-fg-secondary'
                  : 'border-border-primary text-fg-secondary hover:border-border-hover'
              }`}
            >
              Pass
            </button>
            {idea.verdict && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setNote('');
                  run(() => updateIdeaVerdict(idea.id, null, null));
                }}
                className="min-h-[44px] px-4 rounded-full text-sm font-medium border border-border-primary text-fg-tertiary hover:border-border-hover disabled:opacity-60"
              >
                Clear verdict
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-[color:var(--accent-coral)]">{error}</p>}
      </section>
    </div>
  );
}
