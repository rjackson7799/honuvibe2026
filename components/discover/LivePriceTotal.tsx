'use client';

import { useFlow } from './DiscoverFlowProvider';
import type { PricingResult } from '@/lib/pricing';

const usd = (n: number) => n.toLocaleString('en-US');

const TIER_META: Record<'starter' | 'pro', { name: string; desc: string }> = {
  starter: { name: 'Studio Starter', desc: 'A sharp, fast site to get you online' },
  pro: { name: 'Studio Pro', desc: 'Design + build, content & AI assists' },
};

/** Right-rail live price panel (flow). */
export function LivePriceTotal() {
  const { pricing } = useFlow();
  return (
    <aside className="dsc-aside">
      <PriceBreakdown pricing={pricing} />
    </aside>
  );
}

/** Layout-agnostic price content — used by the aside and the summary/review cards. */
export function PriceBreakdown({ pricing }: { pricing: PricingResult }) {
  if (pricing.isCustom) {
    return (
      <>
        <div className="dsc-price__top">
          <p className="dsc-overline">Your project</p>
          <span className="dsc-livetag">Custom</span>
        </div>
        <p className="dsc-price__tier-name">Studio AI-Native</p>
        <p className="dsc-price__tier-desc">Custom-quoted after a scoping call.</p>
        <p className="dsc-price__reassure">
          We&rsquo;ll map out scope together and come back with a tailored plan.
        </p>
      </>
    );
  }

  const tier = pricing.resolvedTier === 'pro' ? TIER_META.pro : TIER_META.starter;
  const isRecommended = !!pricing.recommendedTier;

  return (
    <>
      <div className="dsc-price__top">
        <p className="dsc-overline">Your project</p>
        <span className="dsc-livetag">Live estimate</span>
      </div>

      <div className="dsc-price__tier">
        <div>
          <span className="dsc-price__tier-name">{tier.name}</span>
          <p className="dsc-price__tier-desc">{isRecommended ? 'Recommended for you' : tier.desc}</p>
        </div>
        <div>
          <span className="dsc-price__amt">${usd(pricing.totalBuild)}</span>
          <span className="dsc-price__mo">+${usd(pricing.totalMonthly)}/mo</span>
        </div>
      </div>

      {pricing.lines.length > 0 && (
        <div className="dsc-price__lines">
          {pricing.lines.map((l) => (
            <div className="dsc-price__line" key={l.id}>
              <span className="dsc-price__line-label">{l.label}</span>
              <span className="dsc-price__line-amt">
                {l.build > 0 ? `+$${usd(l.build)}` : ''}
                {l.build > 0 && l.monthly > 0 ? ' · ' : ''}
                {l.monthly > 0 ? `+$${usd(l.monthly)}/mo` : ''}
              </span>
              <span className="dsc-price__line-value">{l.value}</span>
            </div>
          ))}
        </div>
      )}

      {pricing.recommendUpgrade && (
        <p className="dsc-price__nudge">
          A site this size may fit Studio Pro — we&rsquo;ll confirm your exact plan after a quick
          review. No per-page charge either way.
        </p>
      )}

      <hr className="dsc-price__rule" />
      <div className="dsc-price__total">
        <span>One-time build</span>
        <b>${usd(pricing.totalBuild)}</b>
      </div>
      <div className="dsc-price__total">
        <span>Care &amp; hosting</span>
        <b style={{ fontSize: 16 }}>${usd(pricing.totalMonthly)}/mo</b>
      </div>
      {pricing.rushApplied && (
        <p className="dsc-price__tier-desc" style={{ marginTop: 8 }}>
          Includes a rush (+25%) for your timeline.
        </p>
      )}

      <p className="dsc-price__reassure">
        This is an estimate — we&rsquo;ll confirm your final price after a quick review, back to you
        within one business day. No card needed now.
      </p>
    </>
  );
}
