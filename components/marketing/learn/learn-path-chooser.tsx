import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { Section, Container } from '@/components/marketing/primitives';

type PathKey = 'solo' | 'cohort' | 'team';

const PATHS: { key: PathKey; href: string; accent: 'teal' | 'coral' }[] = [
  { key: 'solo', href: '#vault', accent: 'teal' },
  { key: 'cohort', href: '#courses', accent: 'teal' },
  { key: 'team', href: '/organizations', accent: 'coral' },
];

/**
 * "Which path is right for you?" — a 3-way intent chooser that reduces decision
 * friction on /learn by mapping how someone wants to learn to the matching path
 * (Vault / Courses / Organizations). Static, server-rendered; no urgency — the
 * reassurance line carries the on-brand risk reversal.
 */
export async function LearnPathChooser() {
  const t = await getTranslations('learn.path_chooser');

  return (
    <Section variant="canvas" spacing="tight">
      <Container>
        <div className="mx-auto mb-10 max-w-[640px] text-center">
          <h2 className="font-serif text-[clamp(24px,3vw,34px)] font-normal text-[var(--m-ink-primary)]">
            {t('heading')}
          </h2>
          <p className="mt-3 text-[16px] leading-[1.6] text-[var(--m-ink-secondary)]">
            {t('subhead')}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PATHS.map(({ key, href, accent }) => {
            const accentVar =
              accent === 'coral' ? 'var(--m-accent-coral)' : 'var(--m-accent-teal)';
            return (
              <a
                key={key}
                href={href}
                className="group flex flex-col rounded-[16px] border border-[var(--m-border)] bg-[var(--m-white)] p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--m-border-strong)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
              >
                <p className="text-[13px] font-medium text-[var(--m-ink-tertiary)]">
                  {t(`${key}_intent` as 'solo_intent')}
                </p>
                <p
                  className="mt-1.5 text-[19px] font-bold tracking-[-0.01em]"
                  style={{ color: accentVar }}
                >
                  {t(`${key}_path` as 'solo_path')}
                </p>
                <p className="mt-2.5 flex-1 text-[14.5px] leading-[1.55] text-[var(--m-ink-secondary)]">
                  {t(`${key}_desc` as 'solo_desc')}
                </p>
                <span
                  className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold"
                  style={{ color: accentVar }}
                >
                  {t(`${key}_cta` as 'solo_cta')}
                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </a>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-[620px] text-center text-[13.5px] leading-[1.6] text-[var(--m-ink-tertiary)]">
          {t('reassure')}
        </p>
      </Container>
    </Section>
  );
}
