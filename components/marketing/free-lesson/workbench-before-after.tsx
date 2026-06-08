import { Section, Container } from '@/components/marketing/primitives';
import { SAMPLE, type SampleLocale } from '@/lib/free-lesson/sample';
import { CONTENT } from '@/lib/free-lesson/content';

/**
 * Static "before / after" of the Apply-It Workbench practice loop — the clearest
 * way to show HonuVibe's "learn by doing" difference without a live LLM call.
 * Renders illustrative SAMPLE data (no real user attempt, no PII).
 */
export function WorkbenchBeforeAfter({ locale }: { locale: string }) {
  const loc: SampleLocale = locale === 'ja' ? 'ja' : 'en';
  const s = SAMPLE[loc];
  const L = CONTENT[loc].sampleLabels;

  return (
    <Section variant="sand">
      <Container>
        <h2 className="mb-3 text-center font-serif text-[clamp(24px,3vw,34px)] font-normal text-[var(--m-ink-primary)]">
          {L.heading}
        </h2>
        <p className="mx-auto mb-10 max-w-[640px] text-center text-[15.5px] text-[var(--m-ink-secondary)]">
          <span className="font-semibold text-[var(--m-ink-primary)]">{L.brief_label}:</span> {s.brief}
        </p>

        <div className="grid gap-5 md:grid-cols-2">
          <Column
            badge={L.before_label}
            tone="weak"
            promptLabel={L.prompt_label}
            outputLabel={L.output_label}
            scoreLabel={L.score_label}
            prompt={s.weak.prompt}
            output={s.weak.output}
            score={s.weak.score}
          />
          <Column
            badge={L.after_label}
            tone="strong"
            promptLabel={L.prompt_label}
            outputLabel={L.output_label}
            scoreLabel={L.score_label}
            prompt={s.strong.prompt}
            output={s.strong.output}
            score={s.strong.score}
          />
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-[14px] border border-[var(--m-border)] bg-[var(--m-white)] p-5">
            <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--m-accent-coral)]">
              {L.gaps_label}
            </p>
            <ul className="space-y-1.5">
              {s.gaps.map((g) => (
                <li key={g} className="text-[14px] leading-[1.5] text-[var(--m-ink-secondary)]">
                  • {g}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-center rounded-[14px] border-[1.5px] border-[var(--m-accent-teal)] bg-[rgba(15,169,160,0.06)] p-5">
            <p className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--m-accent-teal)]">
              {L.takeaway_label}
            </p>
            <p className="text-[15px] leading-[1.6] text-[var(--m-ink-primary)]">{s.takeaway}</p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function Column({
  badge,
  tone,
  promptLabel,
  outputLabel,
  scoreLabel,
  prompt,
  output,
  score,
}: {
  badge: string;
  tone: 'weak' | 'strong';
  promptLabel: string;
  outputLabel: string;
  scoreLabel: string;
  prompt: string;
  output: string;
  score: number;
}) {
  const accent = tone === 'strong' ? 'var(--m-accent-teal)' : 'var(--m-accent-coral)';
  return (
    <div className="overflow-hidden rounded-[16px] border border-[var(--m-border)] bg-[var(--m-white)]">
      <div className="flex items-center justify-between border-b border-[var(--m-border)] px-5 py-3">
        <span
          className="text-[12px] font-bold uppercase tracking-[0.08em]"
          style={{ color: accent }}
        >
          {badge}
        </span>
        <span className="text-[13px] text-[var(--m-ink-tertiary)]">
          {scoreLabel}:{' '}
          <span className="font-bold" style={{ color: accent }}>
            {score}/100
          </span>
        </span>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--m-ink-tertiary)]">
            {promptLabel}
          </p>
          <p className="rounded-[10px] bg-[var(--m-sand)] px-3.5 py-3 font-mono text-[13px] leading-[1.55] text-[var(--m-ink-primary)]">
            {prompt}
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--m-ink-tertiary)]">
            {outputLabel}
          </p>
          <p className="whitespace-pre-line text-[13.5px] leading-[1.6] text-[var(--m-ink-secondary)]">
            {output}
          </p>
        </div>
      </div>
    </div>
  );
}
