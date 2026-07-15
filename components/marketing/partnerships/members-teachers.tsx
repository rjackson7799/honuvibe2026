import { useTranslations } from 'next-intl';
import { GraduationCap, Coins, TrendingUp, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Container, Overline, Section } from '@/components/marketing/primitives';

const POINTS: { key: 'teach' | 'earn' | 'compound'; icon: LucideIcon }[] = [
  { key: 'teach', icon: GraduationCap },
  { key: 'earn', icon: Coins },
  { key: 'compound', icon: TrendingUp },
];

export function PartnershipsMembersTeachers() {
  const t = useTranslations('partnerships.members_teachers');

  return (
    <Section variant="canvas" spacing="default">
      <Container>
        <div className="grid gap-12 md:grid-cols-[1fr_1.1fr] md:gap-16">
          {/* Left: the story */}
          <div className="max-w-[46ch]">
            <Overline tone="teal">{t('overline')}</Overline>
            <h2
              className="mt-4 font-serif font-normal leading-[1.08] tracking-[-0.01em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(30px, 4vw, 48px)' }}
            >
              {t('heading')}
            </h2>
            <p className="mt-6 text-[16.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
              {t('body')}
            </p>
            <p className="mt-8 flex items-center gap-2.5 text-[13.5px] leading-[1.5] text-[var(--m-ink-secondary)]">
              <Sprout
                size={16}
                strokeWidth={1.75}
                className="shrink-0 text-[var(--m-accent-verdigris)]"
                aria-hidden
              />
              {t('cta_note')}
            </p>
          </div>

          {/* Right: they teach / they earn / it compounds */}
          <ul className="flex flex-col divide-y divide-[var(--m-border-soft)] self-center">
            {POINTS.map(({ key, icon: Icon }) => (
              <li key={key} className="flex items-start gap-5 py-6 first:pt-0 last:pb-0">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: 'var(--m-accent-verdigris-soft)',
                    color: 'var(--m-accent-verdigris)',
                  }}
                >
                  <Icon size={20} strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <h3 className="text-[16px] font-bold leading-snug text-[var(--m-ink-primary)]">
                    {t(`point_${key}_title`)}
                  </h3>
                  <p className="mt-1.5 text-[14.5px] leading-[1.6] text-[var(--m-ink-secondary)]">
                    {t(`point_${key}_body`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
