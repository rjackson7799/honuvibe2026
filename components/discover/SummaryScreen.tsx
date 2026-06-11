'use client';

import { useEffect, useState } from 'react';
import { PriceBreakdown } from './LivePriceTotal';
import type { PricingResult } from '@/lib/pricing';

// Summary screen. On mount it POSTs /complete (idempotent) to finalize: this
// snapshots pricing, writes discovery_outputs.pricing_summary, and advances the
// lifecycle → 'completed'. The brand-voice / PRD artifacts are stubbed as
// "pending" placeholders until the Claude generation increment.
export function SummaryScreen({ sessionId }: { sessionId: string }) {
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/discover/complete/${sessionId}`, { method: 'POST' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setPricing(data.pricing);
      } catch {
        if (!cancelled) setError('Could not finalize your plan. Please confirm your email first.');
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
  if (!pricing) {
    return (
      <div className="dsc-center">
        <p className="dsc-q__sub">Putting your plan together…</p>
      </div>
    );
  }

  return (
    <div className="dsc-summary">
      <p className="dsc-stepmark">🎉 We&rsquo;ve got everything we need</p>
      <h1 className="dsc-q__head">Your plan is ready.</h1>

      <div className="dsc-card">
        <p className="dsc-card__title">Your brand voice</p>
        <p className="dsc-pending">
          <span aria-hidden>✦</span> Generating — your brand voice profile will land in your inbox
          shortly.
        </p>
      </div>

      <div className="dsc-card">
        <p className="dsc-card__title">Your investment</p>
        <PriceBreakdown pricing={pricing} />
      </div>

      <div className="dsc-card">
        <p className="dsc-card__title">What happens next</p>
        <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-2)', lineHeight: 1.9 }}>
          <li>A copy of your plan lands in your inbox</li>
          <li>Book your kickoff call (link coming soon)</li>
          <li>We start designing</li>
        </ol>
      </div>

      <p className="dsc-confidential">
        This summary is confidential and prepared by HonuVibe.ai. Built in Hawaii 🌺
      </p>
    </div>
  );
}
