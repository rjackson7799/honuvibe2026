import { useTranslations } from 'next-intl';
import { MousePointerClick } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';

/**
 * Sandbox hero — ACTION voice (bold sans, tight tracking), mirroring the
 * home hero: this page asks the visitor to *do* something (open a demo),
 * so it does not use Explore's editorial italic-serif voice.
 */
export function SandboxHero() {
  const t = useTranslations('sandbox.hero');

  const notes = [
    t('note_simulated'),
    t('note_no_signup'),
    t('note_real_code'),
  ];

  return (
    <Section variant="canvas" spacing="hero" className="pb-16 md:pb-20">
      <Container>
        <div className="max-w-[760px]">
          <div className="mb-6 inline-flex items-center gap-2">
            <MousePointerClick
              size={14}
              className="text-[var(--m-accent-teal)]"
              aria-hidden
            />
            <span className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-[var(--m-ink-secondary)]">
              {t('eyebrow')}
            </span>
          </div>

          <h1
            className="mb-6 font-bold leading-[1.08] tracking-[-0.025em] text-[var(--m-ink-primary)]"
            style={{ fontSize: 'clamp(42px, 5.5vw, 66px)' }}
          >
            {t('headline_line_1')}
            <br />
            <span className="text-[var(--m-accent-teal)]">
              {t('headline_line_2')}
            </span>
          </h1>

          <p className="mb-8 max-w-[560px] text-[18px] leading-[1.65] text-[var(--m-ink-secondary)]">
            {t('subhead')}
          </p>

          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {notes.map((note) => (
              <li
                key={note}
                className="flex items-center gap-2 text-[13.5px] font-medium text-[var(--m-ink-tertiary)]"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--m-accent-teal)]"
                  aria-hidden
                />
                {note}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
