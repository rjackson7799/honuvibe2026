'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  WorkbenchDifficulty,
  WorkbenchDomain,
  WorkbenchScenario,
} from '@/lib/workbench/types';

const domainStyle: Record<WorkbenchDomain, string> = {
  marketing: 'bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)]',
  operations: 'bg-[color:var(--accent-gold-subtle)] text-[color:var(--accent-gold)]',
  communication: 'bg-[color:var(--accent-purple-subtle)] text-[color:var(--accent-purple)]',
};

const difficultyStyle: Record<WorkbenchDifficulty, string> = {
  beginner: 'bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)]',
  intermediate: 'bg-[color:var(--accent-coral-subtle)] text-[color:var(--accent-coral)]',
  advanced: 'bg-[color:var(--accent-purple-subtle)] text-[color:var(--accent-purple)]',
};

export function WorkbenchScenarioCard({ scenario }: { scenario: WorkbenchScenario }) {
  const locale = useLocale();
  const t = useTranslations('workbench');

  const title = locale === 'ja' && scenario.title_jp ? scenario.title_jp : scenario.title_en;
  const brief = locale === 'ja' && scenario.brief_jp ? scenario.brief_jp : scenario.brief_en;

  const domainLabel: Record<WorkbenchDomain, string> = {
    marketing: t('domain_marketing'),
    operations: t('domain_operations'),
    communication: t('domain_communication'),
  };
  const levelLabel: Record<WorkbenchDifficulty, string> = {
    beginner: t('level_beginner'),
    intermediate: t('level_intermediate'),
    advanced: t('level_advanced'),
  };

  return (
    <Link
      href={`/learn/vault/workbench/${scenario.slug}`}
      className={cn(
        'group relative flex flex-col gap-3 p-4 bg-bg-secondary border border-border-default rounded-[14px]',
        'shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5 hover:border-[color:var(--accent-teal)]/35',
        'transition-all duration-200',
      )}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={cn(
            'text-[10.5px] font-bold px-2 py-0.5 rounded-full',
            domainStyle[scenario.domain],
          )}
        >
          {domainLabel[scenario.domain]}
        </span>
        <span
          className={cn(
            'text-[10.5px] font-bold px-2 py-0.5 rounded-full capitalize',
            difficultyStyle[scenario.difficulty],
          )}
        >
          {levelLabel[scenario.difficulty]}
        </span>
      </div>

      <h3 className="text-[14.5px] font-bold text-fg-primary leading-[1.4] tracking-[-0.01em] line-clamp-2">
        {title}
      </h3>

      <p className="text-[12.5px] text-fg-tertiary leading-[1.55] line-clamp-3 flex-1">{brief}</p>

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[11.5px] text-fg-tertiary">
          {t('card_dimensions', { count: scenario.applicable_dimensions.length })}
        </span>
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent-teal opacity-0 group-hover:opacity-100 transition-opacity">
          {t('card_cta')}
          <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}
