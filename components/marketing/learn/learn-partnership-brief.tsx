import { useTranslations } from 'next-intl';
import { HonuIcon } from '@/components/marketing/icons/honu';

export function LearnPartnershipBrief() {
  const t = useTranslations('learn.partnership_brief');

  return (
    <div className="rounded-2xl border border-[var(--m-border-default)] bg-[var(--m-sand)] p-6 shadow-[var(--m-shadow-xs)]">
      <p className="mb-4 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
        {t('label')}
      </p>
      <div className="flex items-center gap-3 border-b border-[var(--m-border-soft)] pb-4">
        <span className="rounded-md bg-[var(--m-ink-primary)] px-3 py-1.5 text-[13px] font-bold text-white">
          {t('your_community')}
        </span>
        <span className="text-[17px] text-[var(--m-ink-tertiary)]">×</span>
        <span className="text-[var(--m-accent-teal)]">
          <HonuIcon size={22} />
        </span>
        <span className="text-[13px] font-bold text-[var(--m-ink-primary)]">
          HonuVibe.AI
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 text-[12.5px] font-semibold text-[var(--m-ink-secondary)]">
        <span>{t('tag_cobrand')}</span>
        <span className="text-[var(--m-ink-tertiary)]">·</span>
        <span>{t('tag_custom')}</span>
        <span className="text-[var(--m-ink-tertiary)]">·</span>
        <span>{t('tag_lang')}</span>
      </div>
      <div className="mt-5 flex items-center gap-2.5 border-t border-[var(--m-border-soft)] pt-4">
        <span className="h-2 w-2 rounded-full bg-[var(--m-accent-teal)]" aria-hidden />
        <span className="text-[13px] text-[var(--m-ink-secondary)]">
          {t('active_count')}
        </span>
      </div>
    </div>
  );
}
