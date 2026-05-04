import { useLocale, useTranslations } from 'next-intl';
import {
  Bookmark,
  ChevronRight,
  Clock,
  Copy,
  FileOutput,
  FileText,
  Globe,
  Search,
  Star,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SERIF = 'var(--font-dm-serif)';
const MONO = 'var(--font-jetbrains-mono)';

export function VaultLessonMockup() {
  const t = useTranslations('home.vault_section.lesson');
  const locale = useLocale();
  const isEn = locale === 'en';

  return (
    <div className="bg-[var(--m-white)] px-4 pb-7 pt-7 sm:px-8 sm:pb-9 sm:pt-9 md:px-14 md:pb-11 md:pt-9">
      {/* Seafoam accent bar */}
      <span
        aria-hidden
        className="mb-3.5 block h-0.5 w-8 rounded-sm bg-[var(--m-seafoam)] opacity-60"
      />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-2.5 text-[13px] font-medium text-[var(--m-ink-tertiary)]"
      >
        <span>{t('breadcrumb_root')}</span>
        <ChevronRight size={12} className="opacity-50" />
        <span>{t('breadcrumb_section')}</span>
        <ChevronRight size={12} className="opacity-50" />
        <span className="font-semibold text-[var(--m-teal-dark-2)]">
          {t('breadcrumb_current')}
        </span>
      </nav>

      {/* Header */}
      <header className="mb-9 border-b border-[var(--m-border-soft)] pb-7">
        <div className="mb-[18px] flex flex-wrap items-center gap-3.5">
          <span className="inline-flex items-center rounded-[4px] bg-[var(--m-accent-coral-soft)] px-2.5 py-[5px] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--m-accent-coral)]">
            {t('eyebrow_pill')}
          </span>
          <span className="text-[12px] font-medium tracking-[0.04em] text-[var(--m-ink-tertiary)]">
            {t('eyebrow_meta')}
          </span>
        </div>

        <h1
          className="mb-4 text-[clamp(28px,4.5vw,42px)] leading-[1.1] tracking-[-0.02em] text-[var(--m-teal-deep)]"
          style={{ fontFamily: SERIF, fontWeight: 400 }}
        >
          {t.rich('title', {
            em: (chunks) => (
              <span
                className={cn(
                  'text-[var(--m-seafoam)]',
                  isEn && 'italic',
                )}
              >
                {chunks}
              </span>
            ),
          })}
        </h1>

        <p className="max-w-[720px] text-[16px] font-normal leading-[1.55] text-[var(--m-ink-secondary)] sm:text-[17px]">
          {t('subtitle')}
        </p>

        {/* Meta row */}
        <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3">
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--m-ink-tertiary)]">
            <Clock size={14} className="text-[var(--m-seafoam)]" strokeWidth={2} />
            {t('meta_duration')}
          </span>
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--m-ink-tertiary)]">
            <Star size={14} className="text-[var(--m-seafoam)]" strokeWidth={2} />
            {t('meta_difficulty')}
          </span>
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--m-ink-tertiary)]">
            <Globe size={14} className="text-[var(--m-seafoam)]" strokeWidth={2} />
            {t('meta_locale')}
          </span>
          <span className="hidden flex-1 sm:block" />
          <button
            type="button"
            aria-disabled
            tabIndex={-1}
            className="inline-flex cursor-default items-center gap-1.5 rounded-[7px] border border-[var(--m-seafoam-light)] bg-[var(--m-seafoam-pale)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--m-teal-dark-2)]"
          >
            <Bookmark
              size={13}
              fill="currentColor"
              className="text-[var(--m-seafoam)]"
              strokeWidth={2}
            />
            {t('save_button')}
          </button>
        </div>
      </header>

      {/* What you'll build */}
      <section className="mb-9">
        <SectionTitle>{t('build_title')}</SectionTitle>
        <ul className="grid list-none grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2">
          {(['build_1', 'build_2', 'build_3', 'build_4'] as const).map((key) => (
            <li
              key={key}
              className="flex items-start gap-3 text-[14.5px] leading-[1.5] text-[var(--m-ink-secondary)] sm:text-[15px]"
            >
              <CheckIcon />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* The workflow */}
      <section className="mb-9">
        <SectionTitle>{t('workflow_title')}</SectionTitle>
        <div
          className={cn(
            'rounded-[12px] border border-[var(--m-border-soft)] px-4 py-6 sm:px-6 sm:py-7',
            'bg-[linear-gradient(135deg,var(--m-seafoam-faint)_0%,var(--m-sand)_100%)]',
            'grid items-center gap-x-2 gap-y-6',
            'grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]',
          )}
        >
          <Step icon={<FileText size={22} strokeWidth={1.8} />} label={t('step_1_label')} desc={t('step_1_desc')} />
          <StepConnector />
          <Step icon={<Search size={22} strokeWidth={1.8} />} label={t('step_2_label')} desc={t('step_2_desc')} />
          <StepConnector />
          <Step icon={<Tag size={22} strokeWidth={1.8} />} label={t('step_3_label')} desc={t('step_3_desc')} />
          <StepConnector />
          <Step icon={<FileOutput size={22} strokeWidth={1.8} />} label={t('step_4_label')} desc={t('step_4_desc')} />
        </div>
      </section>

      {/* The prompt */}
      <section className="mb-9">
        <SectionTitle>{t('prompt_title')}</SectionTitle>
        <div className="overflow-hidden rounded-[10px] border border-[var(--m-code-bg-light)] bg-[var(--m-code-bg)]">
          <div className="flex items-center justify-between border-b border-white/5 bg-[var(--m-code-bg-light)] px-[18px] py-3">
            <span
              className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--m-code-comment)]"
              style={{ fontFamily: MONO }}
            >
              {t('prompt_lang_label')}
            </span>
            <button
              type="button"
              aria-disabled
              tabIndex={-1}
              className="inline-flex cursor-default items-center gap-1.5 rounded-[5px] border border-white/10 bg-transparent px-3 py-1 text-[11px] font-medium text-[var(--m-code-text)]"
            >
              <Copy size={12} strokeWidth={2} />
              {t('prompt_copy')}
            </button>
          </div>
          <pre
            className="overflow-x-auto px-4 py-4 text-[13.5px] leading-[1.65] text-[var(--m-code-text)] sm:px-6 sm:py-5"
            style={{ fontFamily: MONO }}
          >
            <SystemPrompt />
          </pre>
        </div>
      </section>

      {/* Example output */}
      <section className="mb-9">
        <SectionTitle>{t('output_title')}</SectionTitle>
        <div className="relative rounded-[10px] border border-[var(--m-border-soft)] bg-[#FBFAF6] px-4 py-5 sm:px-7 sm:py-6">
          <span className="absolute -top-2.5 left-5 rounded-[4px] border border-[var(--m-seafoam-light)] bg-[var(--m-white)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--m-seafoam)]">
            {t('output_tag')}
          </span>

          <h3
            className="mb-3.5 mt-1 text-[17px] tracking-[-0.01em] text-[var(--m-teal-deep)]"
            style={{ fontFamily: SERIF, fontWeight: 500 }}
          >
            {t('output_pain_title')}
          </h3>

          {[
            { num: '01', titleKey: 'output_pain_1_title', quoteKey: 'output_pain_1_quote' },
            { num: '02', titleKey: 'output_pain_2_title', quoteKey: 'output_pain_2_quote' },
            { num: '03', titleKey: 'output_pain_3_title', quoteKey: 'output_pain_3_quote' },
          ].map(({ num, titleKey, quoteKey }) => (
            <div key={num} className="mb-4 last:mb-0">
              <div className="mb-1.5 text-[14.5px] font-semibold text-[var(--m-teal-deep)]">
                <span className="mr-1.5 font-bold text-[var(--m-seafoam)]">{num}</span>
                {t(titleKey)}
              </div>
              <blockquote className="my-1.5 ml-2 border-l-[3px] border-[var(--m-seafoam-light)] py-1 pl-3.5 text-[14px] italic leading-[1.5] text-[var(--m-ink-secondary)]">
                &ldquo;{t(quoteKey)}&rdquo;
              </blockquote>
            </div>
          ))}

          <h3
            className="mb-3.5 mt-5 text-[17px] tracking-[-0.01em] text-[var(--m-teal-deep)]"
            style={{ fontFamily: SERIF, fontWeight: 500 }}
          >
            {t('output_themes_title')}
          </h3>
          <ul className="list-none">
            {[
              { labelKey: 'output_theme_1', countKey: 'output_theme_1_count' },
              { labelKey: 'output_theme_2', countKey: 'output_theme_2_count' },
              { labelKey: 'output_theme_3', countKey: 'output_theme_3_count' },
            ].map(({ labelKey, countKey }) => (
              <li
                key={labelKey}
                className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--m-border-soft)] py-2 text-[14px] text-[var(--m-ink-secondary)] last:border-b-0"
              >
                <span>{t(labelKey)}</span>
                <span className="rounded-[4px] bg-[var(--m-seafoam-pale)] px-2 py-0.5 text-[12px] font-medium text-[var(--m-ink-tertiary)]">
                  {t(countKey)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-6 border-t border-[var(--m-border-soft)] pt-7">
        <div className="flex flex-wrap gap-2">
          {(['tag_research', 'tag_claude', 'tag_workflow', 'tag_real'] as const).map((key) => (
            <span
              key={key}
              className="rounded-[6px] border border-[var(--m-border-soft)] bg-[var(--m-sand)] px-3 py-1.5 text-[12px] font-medium text-[var(--m-ink-secondary)]"
            >
              {t(key)}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            aria-disabled
            tabIndex={-1}
            className="inline-flex cursor-default items-center gap-2 rounded-[8px] border border-[var(--m-border-default)] bg-[var(--m-white)] px-5 py-[11px] text-[14px] font-semibold text-[var(--m-teal-dark-2)]"
          >
            <Copy size={14} strokeWidth={2} />
            {t('footer_copy_prompt')}
          </button>
          <button
            type="button"
            aria-disabled
            tabIndex={-1}
            className="inline-flex cursor-default items-center gap-2 rounded-[8px] bg-[var(--m-teal-dark-2)] px-5 py-[11px] text-[14px] font-semibold text-[var(--m-white)]"
          >
            {t('footer_open_in_claude')}
            <span aria-hidden>→</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mb-[18px] text-[22px] tracking-[-0.01em] text-[var(--m-teal-deep)]"
      style={{ fontFamily: SERIF, fontWeight: 500 }}
    >
      {children}
    </h2>
  );
}

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--m-seafoam)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function Step({
  icon,
  label,
  desc,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center px-2 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[12px] border border-[var(--m-seafoam-light)] bg-[var(--m-white)] text-[var(--m-seafoam)] shadow-[0_1px_2px_rgba(15,61,61,0.04)]">
        {icon}
      </div>
      <div
        className="mb-1 text-[16px] tracking-[-0.01em] text-[var(--m-teal-deep)]"
        style={{ fontFamily: SERIF, fontWeight: 500 }}
      >
        {label}
      </div>
      <div className="max-w-[130px] text-[12px] leading-[1.4] text-[var(--m-ink-tertiary)]">
        {desc}
      </div>
    </div>
  );
}

function StepConnector() {
  return (
    <div
      aria-hidden
      className="hidden text-[18px] text-[var(--m-seafoam)] opacity-50 sm:mb-6 sm:block sm:px-1"
    >
      →
    </div>
  );
}

function SystemPrompt() {
  return (
    <>
      <span className="italic text-[var(--m-code-comment)]"># Role</span>
      {'\n'}
      You are a{' '}
      <span className="font-medium text-[var(--m-code-keyword)]">
        senior product researcher
      </span>{' '}
      analyzing customer{'\n'}interviews for{' '}
      <span className="font-medium text-[var(--m-code-string)]">{'{{ company }}'}</span>.
      {'\n\n'}
      <span className="italic text-[var(--m-code-comment)]"># Task</span>
      {'\n'}
      Given the transcript below, extract:
      {'\n\n'}
      {'  '}
      <span className="text-[var(--m-code-accent)]">1.</span> Top 3 pain points{' '}
      <span className="italic text-[var(--m-code-comment)]">(with verbatim quotes)</span>
      {'\n'}
      {'  '}
      <span className="text-[var(--m-code-accent)]">2.</span> Repeated themes across the
      conversation{'\n'}
      {'  '}
      <span className="text-[var(--m-code-accent)]">3.</span> Implicit needs the customer
      didn&apos;t state directly{'\n'}
      {'  '}
      <span className="text-[var(--m-code-accent)]">4.</span> Three follow-up questions worth
      asking next time{'\n\n'}
      <span className="italic text-[var(--m-code-comment)]"># Format</span>
      {'\n'}
      Return as structured markdown. Use blockquotes for{'\n'}verbatim customer language. Tag
      each pain point with{'\n'}a category from:{' '}
      <span className="text-[var(--m-code-string)]">[workflow, tooling, communication,</span>
      {'\n'}
      <span className="text-[var(--m-code-string)]">onboarding, reporting, other]</span>.
      {'\n\n'}
      <span className="italic text-[var(--m-code-comment)]"># Transcript</span>
      {'\n'}
      <span className="font-medium text-[var(--m-code-string)]">{'{{ transcript }}'}</span>
    </>
  );
}
