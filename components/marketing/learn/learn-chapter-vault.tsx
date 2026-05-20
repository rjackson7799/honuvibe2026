import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { Button, Container, Section } from '@/components/marketing/primitives';
import { LearnVaultSample } from './learn-vault-sample';

export function LearnChapterVault() {
  const t = useTranslations('learn.chapter_vault');

  const bullets = [
    t('bullet_1'),
    t('bullet_2'),
    t('bullet_3'),
    t('bullet_4'),
    t('bullet_5'),
  ];

  return (
    <Section variant="canvas" id="vault" className="learn-chapter scroll-mt-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <ChapterHeader number={t('number')} title={t('title')} titleJp={t('title_jp')} pill={t('pill')} />
            <p
              className="mt-6 max-w-[560px] font-serif italic leading-[1.3] tracking-[-0.01em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(22px, 2.4vw, 30px)' }}
            >
              {t('intro')}
            </p>

            <ul className="mt-8 list-none space-y-3.5 p-0">
              {bullets.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 text-[15.5px] leading-[1.6] text-[var(--m-ink-secondary)]"
                >
                  <Check
                    size={16}
                    strokeWidth={2}
                    className="mt-1 shrink-0 text-[var(--m-accent-teal)]"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[var(--m-border-teal)] bg-[var(--m-white)] p-8 shadow-[var(--m-shadow-sm)]">
              <p className="text-[44px] font-bold leading-none tracking-[-0.02em] text-[var(--m-ink-primary)]">
                {t('price')}
                <span className="ml-1 text-[17px] font-medium text-[var(--m-ink-secondary)]">
                  {t('price_unit')}
                </span>
              </p>
              <p className="mt-2 text-[13px] font-semibold text-[var(--m-accent-teal)]">
                {t('price_note')}
              </p>
              <div className="mt-7 flex flex-col gap-3">
                <Button href="/learn/auth?intent=vault" variant="primary-teal" withArrow>
                  {t('cta_primary')}
                </Button>
                <Button href="#courses" variant="outline-teal">
                  {t('cta_secondary')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <LearnVaultSample />
      </Container>
    </Section>
  );
}

function ChapterHeader({
  number,
  title,
  titleJp,
  pill,
}: {
  number: string;
  title: string;
  titleJp: string;
  pill?: string;
}) {
  return (
    <div className="flex flex-wrap items-end gap-6">
      <span
        className="font-serif leading-none text-[var(--m-accent-teal)]/30"
        style={{
          fontSize: 'clamp(96px, 12vw, 160px)',
          letterSpacing: '-0.04em',
        }}
        aria-hidden
      >
        {number}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h2
            className="font-bold leading-[1.05] tracking-[-0.02em] text-[var(--m-ink-primary)]"
            style={{ fontSize: 'clamp(36px, 4.5vw, 56px)' }}
          >
            {title}
          </h2>
          {pill && (
            <span className="rounded-full bg-[var(--m-accent-teal)] px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white">
              {pill}
            </span>
          )}
        </div>
        <p className="mt-1 text-[15px] text-[var(--m-ink-secondary)]">{titleJp}</p>
      </div>
    </div>
  );
}
