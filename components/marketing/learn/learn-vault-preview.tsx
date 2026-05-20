import { useTranslations } from 'next-intl';
import { ArrowRight, Flame } from 'lucide-react';
import type { VaultContentItem } from '@/lib/vault/types';
import { VAULT_HOT_TOPICS } from '@/lib/constants/vault-hot-topics';
import { LearnVaultPreviewCards } from './learn-vault-preview-cards';

type Props = {
  items: VaultContentItem[];
  totalCount: number;
  locale: string;
};

export function LearnVaultPreview({ items, totalCount, locale }: Props) {
  const t = useTranslations('learn.chapter_vault.preview');

  if (items.length === 0) return null;

  const localePrefix = locale === 'ja' ? '/ja' : '';

  return (
    <div className="mx-auto mt-16 max-w-[1100px] md:mt-20">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-[20px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
          {t('heading')}
        </h3>
        <p className="text-[14px] text-[var(--m-ink-secondary)]">
          {t('total_count', { count: totalCount })} · {t('growing_monthly')}
        </p>
      </div>

      <div className="mb-7 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[var(--m-accent-coral)]">
          <Flame size={13} strokeWidth={2.5} />
          {t('hot_topics_label')}
        </span>
        {VAULT_HOT_TOPICS.map((topic) => (
          <a
            key={topic}
            href={`${localePrefix}/learn/vault?tag=${encodeURIComponent(topic)}`}
            className="rounded-full border border-[var(--m-border-default)] bg-[var(--m-white)] px-3 py-1 text-[12.5px] font-semibold text-[var(--m-ink-primary)] transition-colors hover:border-[var(--m-accent-teal)] hover:bg-[var(--m-accent-teal-soft)] hover:text-[var(--m-accent-teal)]"
          >
            {topic}
          </a>
        ))}
      </div>

      <LearnVaultPreviewCards items={items} />

      <div className="mt-8 text-right">
        <a
          href={`${localePrefix}/learn/vault`}
          className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
        >
          {t('browse_all', { count: totalCount })}
          <ArrowRight size={16} strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}
