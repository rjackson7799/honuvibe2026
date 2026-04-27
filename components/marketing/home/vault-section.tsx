import { useTranslations } from 'next-intl';
import {
  BrowserFrame,
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';
import { cn } from '@/lib/utils';

export function HomeVaultSection() {
  const t = useTranslations('home.vault_section');

  return (
    <Section variant="sand">
      <Container>
        <div className="mb-14 max-w-[560px]">
          <Overline tone="coral" className="mb-3.5">
            {t('overline')}
          </Overline>
          <SectionHeading className="mb-5">{t('heading')}</SectionHeading>
          <p className="text-[16.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
            {t('body')}
          </p>
        </div>

        <BrowserFrame
          url="vault.honuvibe.ai"
          secure={false}
          height="auto"
          className="rounded-[20px] shadow-[0_20px_60px_rgba(26,43,51,0.12)]"
        >
          <VaultPanel />
        </BrowserFrame>

        <p className="mt-4 text-center text-[13px] text-[var(--m-ink-tertiary)]">
          {t('caption')}
        </p>
      </Container>
    </Section>
  );
}

function VaultPanel() {
  const t = useTranslations('home.vault_section');

  const topics = [
    t('topic_1'),
    t('topic_2'),
    t('topic_3'),
    t('topic_4'),
    t('topic_5'),
    t('topic_6'),
  ];

  const lessons = [
    t('lesson_1'),
    t('lesson_2'),
    t('lesson_3'),
    t('lesson_4'),
    t('lesson_5'),
    t('lesson_6'),
  ];

  return (
    <div className="bg-[var(--m-white)] p-6 md:p-8">
      <div className="grid gap-7 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <div>
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--m-ink-tertiary)]">
            {t('library_label')}
          </p>
          {topics.map((topic, i) => {
            const active = i === 2;
            return (
              <div
                key={topic + i}
                className={cn(
                  'mb-1 cursor-default rounded-[8px] px-3 py-2.5 text-[13.5px]',
                  active
                    ? 'bg-[var(--m-accent-teal-soft)] font-semibold text-[var(--m-accent-teal)]'
                    : 'text-[var(--m-ink-secondary)]',
                )}
              >
                {topic}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-[18px] font-bold text-[var(--m-ink-primary)]">
              {t('chapter_title')}
            </h3>
            <span className="rounded-full bg-[var(--m-accent-teal-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--m-accent-teal)]">
              {t('lessons_count')}
            </span>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lesson, i) => {
              const completed = i < 3;
              return (
                <div
                  key={lesson + i}
                  className="cursor-default rounded-[10px] border border-[var(--m-border-soft)] bg-[var(--m-sand)] p-4"
                >
                  <div
                    className={cn(
                      'mb-2.5 flex h-7 w-7 items-center justify-center rounded-[6px]',
                      completed
                        ? 'bg-[var(--m-accent-teal)]'
                        : 'bg-[rgba(26,43,51,0.1)]',
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--m-white)]" />
                  </div>
                  <p className="text-[12.5px] font-semibold text-[var(--m-ink-primary)]">
                    {lesson}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--m-ink-tertiary)]">
                    {completed ? t('completed_label') : t('duration_label')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
