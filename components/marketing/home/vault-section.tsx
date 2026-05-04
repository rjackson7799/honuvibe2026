import { useLocale, useTranslations } from 'next-intl';
import { Globe, Infinity as InfinityIcon, Sparkles, Workflow } from 'lucide-react';
import {
  BrowserFrame,
  Button,
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';
import { cn } from '@/lib/utils';
import { VaultLessonMockup } from './vault-lesson-mockup';

export function HomeVaultSection() {
  const t = useTranslations('home.vault_section');
  const locale = useLocale();
  const isEn = locale === 'en';

  const chips = [
    { Icon: InfinityIcon, label: t('chip_always_on') },
    { Icon: Sparkles, label: t('chip_prompts') },
    { Icon: Workflow, label: t('chip_workflows') },
    { Icon: Globe, label: t('chip_bilingual') },
  ];

  return (
    <Section variant="sand">
      <Container>
        <div className="mx-auto max-w-[720px] text-center">
          <Overline tone="coral" className="mb-3.5">
            {t('overline')}
          </Overline>
          <SectionHeading className="mb-5">
            {t.rich('heading', {
              em: (chunks) => (
                <span
                  className={cn(
                    'text-[var(--m-seafoam)]',
                    isEn && 'italic',
                  )}
                  style={isEn ? { fontFamily: 'var(--font-dm-serif)' } : undefined}
                >
                  {chunks}
                </span>
              ),
            })}
          </SectionHeading>
          <p className="text-[16.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
            {t('body')}
          </p>

          <ul
            role="list"
            className="mt-12 flex flex-wrap justify-center gap-3"
          >
            {chips.map(({ Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--m-seafoam)]/30 bg-[var(--m-white)] px-4 py-2 text-[14px] font-medium text-[var(--m-ink-secondary)]"
              >
                <Icon
                  size={16}
                  strokeWidth={2}
                  className="text-[var(--m-seafoam)]"
                />
                {label}
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <Button href="/learn" variant="primary-teal" size="md" withArrow>
              {t('cta_explore')}
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-[1080px] md:mt-20">
          <BrowserFrame
            url={`vault.honuvibe.ai${t('lesson.browser_url_path')}`}
            secure
            height="auto"
            className="rounded-[14px] shadow-[0_24px_60px_-12px_rgba(15,61,61,0.12),0_8px_24px_-8px_rgba(15,61,61,0.08)]"
          >
            <VaultLessonMockup />
          </BrowserFrame>
        </div>
      </Container>
    </Section>
  );
}
