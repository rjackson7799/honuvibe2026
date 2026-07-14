import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

const ITEMS = ['real_builds', 'simulated_data', 'safe_to_break'] as const;

/**
 * Compact strip explaining how Sandbox demos work: ported from real builds,
 * running on simulated data, safe to click anything.
 */
export function SandboxMethodStrip() {
  const t = useTranslations('sandbox.method');

  return (
    <Section variant="canvas" spacing="tight">
      <Container>
        <p className="mb-8 font-mono text-[11.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
          {t('overline')}
        </p>
        <ul className="grid gap-8 md:grid-cols-3 md:gap-10">
          {ITEMS.map((key, i) => (
            <li key={key} className="border-t border-[var(--m-border-soft)] pt-5">
              <span className="font-mono text-[12px] font-bold text-[var(--m-accent-teal)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-2 text-[17px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
                {t(`${key}_title`)}
              </h3>
              <p className="mt-2 text-[14.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
                {t(`${key}_body`)}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
