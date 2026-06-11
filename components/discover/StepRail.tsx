'use client';

import { STEPS } from '@/lib/questions';

// Left rail: the 3-step discovery stepper + the "what I found" personalization
// card. The card renders a neutral empty state this slice (scraping/synthesis
// are stubbed); the synthesis increment fills it from the context_brief.
export function StepRail({ currentStep }: { currentStep: number }) {
  return (
    <aside className="dsc-rail">
      <p className="dsc-overline">Discovery</p>
      <ol className="dsc-steps">
        {STEPS.map((s) => {
          const stateAttr =
            s.id === currentStep ? 'active' : s.id < currentStep ? 'done' : 'upcoming';
          return (
            <li key={s.id} className="dsc-step" data-state={stateAttr}>
              <span className="dsc-step__num">{s.id < currentStep ? '✓' : s.id}</span>
              <span>
                <span className="dsc-step__label">{s.label}</span>
                <br />
                <span className="dsc-step__sub">{s.sub}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="dsc-found">
        <p className="dsc-found__title">
          <span aria-hidden>✦</span> Here&rsquo;s what I&rsquo;ll find
        </p>
        <p className="dsc-found--empty">
          As we go, I&rsquo;ll surface details from your site and logo here — colors, contact info,
          and tone — to pre-fill answers for you.
        </p>
      </div>

      <p className="dsc-rail__foot">Free, no signup — built in Hawaii 🌺</p>
    </aside>
  );
}
