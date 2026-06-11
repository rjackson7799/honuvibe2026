'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { discoverPath } from './paths';
import { PriceBreakdown } from './LivePriceTotal';
import { summarizeAnswers } from '@/lib/discover/display';
import { STEPS } from '@/lib/questions';
import type { PricingResult } from '@/lib/pricing';

interface ReviewData {
  lead: { name: string; businessName: string };
  answers: Record<string, unknown>;
  pricing: PricingResult;
}

// Review & Edit: a consolidated read-back before verification. "Edit answers"
// returns to the flow (where any answer can be changed); "Looks good" marks the
// review step (lifecycle → 'review') and advances to verification.
export function ReviewEdit({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/discover/review/${sessionId}`, { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('Could not load your review.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (error) {
    return (
      <div className="dsc-center">
        <p className="dsc-error">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="dsc-center">
        <p className="dsc-q__sub">Loading your plan…</p>
      </div>
    );
  }

  const items = summarizeAnswers(data.answers);

  const onVerify = async () => {
    setSubmitting(true);
    await fetch(`/api/discover/review/${sessionId}`, { method: 'POST' });
    router.push(discoverPath(`/discover/${sessionId}/verify`));
  };

  return (
    <div className="dsc-summary">
      <p className="dsc-stepmark">Review · {data.lead.businessName}</p>
      <h1 className="dsc-q__head">Here&rsquo;s everything, in one place.</h1>
      <p className="dsc-q__sub">
        Take a look. If anything&rsquo;s off, jump back and change it — then confirm your email to
        see your full plan.
      </p>

      {STEPS.map((s) => {
        const stepItems = items.filter((i) => i.step === s.id);
        if (stepItems.length === 0) return null;
        return (
          <div className="dsc-card" key={s.id}>
            <p className="dsc-card__title">
              {s.label} · {s.sub}
            </p>
            <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stepItems.map((i) => (
                <div key={i.id}>
                  <dt style={{ fontSize: 13, color: 'var(--ink-3)' }}>{i.headline}</dt>
                  <dd style={{ margin: 0, color: 'var(--ink)' }}>{i.display}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}

      <div className="dsc-card">
        <p className="dsc-card__title">Your investment</p>
        <PriceBreakdown pricing={data.pricing} />
      </div>

      <div className="dsc-actions">
        <button
          type="button"
          className="dsc-btn dsc-btn--ghost"
          onClick={() => router.push(discoverPath(`/discover/${sessionId}`))}
        >
          <span aria-hidden>←</span> Edit answers
        </button>
        <button
          type="button"
          className="dsc-btn dsc-btn--primary"
          onClick={onVerify}
          disabled={submitting}
        >
          {submitting ? 'One sec…' : 'Looks good — confirm email'} <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
