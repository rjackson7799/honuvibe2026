'use client';

// Admin-only preview of a Workbench scenario as members see it: the workspace
// header/brief (styles mirror WorkbenchWorkspace) plus the post-reveal expert
// comparison (reuses WorkbenchCompareReveal with the expert content pre-set).
// The EN / 日本語 toggle swaps the route locale, which drives the content pick.

import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkbenchCompareReveal } from '@/components/workbench/WorkbenchCompareReveal';
import type {
  WorkbenchDifficulty,
  WorkbenchDimension,
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

export function AdminWorkbenchPreview({ scenario }: { scenario: WorkbenchScenario }) {
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
  const dimLabel: Record<WorkbenchDimension, string> = {
    role: t('dim_role'),
    context: t('dim_context'),
    task: t('dim_task'),
    constraints: t('dim_constraints'),
    format: t('dim_format'),
    examples: t('dim_examples'),
  };

  const previewPath = `/admin/workbench/${scenario.id}/preview`;
  const localeLink = (active: boolean) =>
    cn(
      'px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-colors',
      active
        ? 'bg-accent-teal/10 text-accent-teal'
        : 'text-fg-tertiary hover:text-fg-secondary',
    );

  return (
    <div className="max-w-[1100px] space-y-6">
      <a
        href={`/admin/workbench/${scenario.id}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-fg-tertiary hover:text-fg-secondary"
      >
        <ArrowLeft size={15} /> Back to editor
      </a>

      {/* Preview banner */}
      <div className="rounded-lg border border-[color:var(--accent-gold)]/40 bg-[color:var(--accent-gold-subtle)] px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-fg-secondary">
          <Eye size={15} /> Preview — this is what members see after revealing the expert version.
        </p>
        <span className="inline-flex items-center gap-1">
          <a href={previewPath} className={localeLink(locale !== 'ja')}>
            EN
          </a>
          <a href={`/ja${previewPath}`} className={localeLink(locale === 'ja')}>
            日本語
          </a>
        </span>
      </div>

      {/* Workspace-style header */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
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
              'text-[10.5px] font-bold px-2 py-0.5 rounded-full',
              difficultyStyle[scenario.difficulty],
            )}
          >
            {levelLabel[scenario.difficulty]}
          </span>
        </div>
        <h1 className="text-[clamp(20px,2.4vw,26px)] font-bold text-fg-primary tracking-[-0.02em]">
          {title}
        </h1>
      </div>

      {/* Brief */}
      <div className="rounded-[14px] border border-border-default bg-bg-secondary p-4">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-fg-tertiary mb-1.5">
          {t('ws_brief')}
        </p>
        <p className="text-[14px] text-fg-secondary leading-[1.6] whitespace-pre-wrap">{brief}</p>
        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          <span className="text-[11px] text-fg-tertiary">{t('ws_scored_on')}:</span>
          {scenario.applicable_dimensions.map((d) => (
            <span
              key={d}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-bg-tertiary text-fg-secondary"
            >
              {dimLabel[d]}
            </span>
          ))}
        </div>
      </div>

      {/* Expert comparison as revealed to members */}
      <WorkbenchCompareReveal
        expert={{
          expert_prompt_en: scenario.expert_prompt_en,
          expert_prompt_jp: scenario.expert_prompt_jp,
          expert_output_en: scenario.expert_output_en,
          expert_output_jp: scenario.expert_output_jp,
          why_this_works_en: scenario.why_this_works_en,
          why_this_works_jp: scenario.why_this_works_jp,
        }}
        userPrompt=""
        onReveal={() => undefined}
        revealing={false}
        canReveal
      />
    </div>
  );
}
