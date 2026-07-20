import { useLocale, useTranslations } from 'next-intl';
import {
  BookOpen,
  Compass,
  Globe,
  Sparkles,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import {
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';
import { cn } from '@/lib/utils';
import { CopyPromptButton } from './copy-prompt-button';

const TILES: { n: number; Icon: LucideIcon; featured?: boolean }[] = [
  { n: 1, Icon: BookOpen },
  { n: 2, Icon: Workflow },
  { n: 3, Icon: Compass },
  { n: 4, Icon: Globe },
  { n: 5, Icon: Sparkles, featured: true },
  { n: 6, Icon: Users },
];

/**
 * The value stack: six tiles, each an entitlement actually included in the $99
 * Vault subscription (verified against lib/access/checks.ts — vault tier grants
 * Vault lessons + Community; Workbench and Study Paths are Vault-gated member
 * features; live cohorts are a SEPARATE purchase and are deliberately absent).
 * Below the grid, a compact lesson teaser with a real Copy-Prompt affordance
 * replaces the old full-page lesson embed.
 */
export function HomeMembershipBento() {
  const t = useTranslations('home.membership');
  const locale = useLocale();
  const isEn = locale === 'en';

  return (
    <Section variant="canvas">
      <Container>
        <div className="mx-auto mb-12 max-w-[680px] text-center md:mb-16">
          <Overline tone="teal" className="mb-3.5">
            {t('overline')}
          </Overline>
          <SectionHeading className="mb-5">
            {t.rich('heading', {
              em: (chunks) => (
                <span
                  className={cn('text-[var(--m-seafoam)]', isEn && 'italic')}
                  style={isEn ? { fontFamily: 'var(--font-dm-serif)' } : undefined}
                >
                  {chunks}
                </span>
              ),
            })}
          </SectionHeading>
          <p className="text-[16px] leading-[1.7] text-[var(--m-ink-secondary)]">
            {t('subhead')}
          </p>
        </div>

        <ul role="list" className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5">
          {TILES.map(({ n, Icon, featured }) => {
            const isFeatured = featured === true;
            return (
              <li
                key={n}
                className={cn(
                  'flex flex-col rounded-[16px] border p-5 md:p-6',
                  isFeatured
                    ? 'border-transparent bg-[var(--m-teal-deep)] text-[var(--m-white)]'
                    : 'border-[var(--m-border-soft)] bg-[var(--m-white)] shadow-[var(--m-shadow-xs)]',
                )}
              >
                <div
                  className={cn(
                    'mb-4 flex h-11 w-11 items-center justify-center rounded-[12px]',
                    isFeatured
                      ? 'bg-[var(--m-white)]/12 text-[var(--m-seafoam-light)]'
                      : 'bg-[var(--m-accent-teal-soft)] text-[var(--m-accent-teal)]',
                  )}
                >
                  <Icon size={22} strokeWidth={1.7} aria-hidden />
                </div>
                <h3
                  className={cn(
                    'mb-2 text-[16.5px] font-bold tracking-[-0.01em]',
                    isFeatured
                      ? 'text-[var(--m-white)]'
                      : 'text-[var(--m-ink-primary)]',
                  )}
                >
                  {t(`tile_${n}_title` as 'tile_1_title')}
                </h3>
                <p
                  className={cn(
                    'text-[14px] leading-[1.6]',
                    isFeatured
                      ? 'text-[var(--m-white)]/80'
                      : 'text-[var(--m-ink-secondary)]',
                  )}
                >
                  {t(`tile_${n}_body` as 'tile_1_body')}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="mx-auto mt-12 max-w-[760px] rounded-[18px] border border-[var(--m-border-soft)] bg-[var(--m-sand)] p-6 md:mt-16 md:p-9">
          <Overline tone="coral" className="mb-3">
            {t('teaser.overline')}
          </Overline>
          <h3
            className="mb-2.5 text-[clamp(22px,3vw,28px)] leading-[1.15] tracking-[-0.01em] text-[var(--m-teal-deep)]"
            style={{ fontFamily: 'var(--font-dm-serif)', fontWeight: 400 }}
          >
            {t('teaser.title')}
          </h3>
          <p className="mb-6 max-w-[560px] text-[15px] leading-[1.65] text-[var(--m-ink-secondary)]">
            {t('teaser.description')}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <CopyPromptButton prompt={t.raw('teaser.prompt')} locale={locale} />
            <a
              href="/learn#vault"
              className="group inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[var(--m-accent-teal)] transition-colors hover:text-[var(--m-accent-teal-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-sand)] rounded-sm"
            >
              {t('teaser.see_full')}
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </a>
          </div>
        </div>
      </Container>
    </Section>
  );
}
