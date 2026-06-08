'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Sparkles, Loader2 } from 'lucide-react';
import type { WorkbenchExpertContent } from '@/lib/workbench/types';

type Props = {
  expert: WorkbenchExpertContent | null;
  userPrompt: string;
  onReveal: () => void;
  revealing: boolean;
  /** False until the member has at least one attempt (reveal gate). */
  canReveal: boolean;
};

export function WorkbenchCompareReveal({
  expert,
  userPrompt,
  onReveal,
  revealing,
  canReveal,
}: Props) {
  const locale = useLocale();
  const t = useTranslations('workbench');

  if (!expert) {
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={onReveal}
          disabled={!canReveal || revealing}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-bg-secondary border border-border-default text-fg-secondary text-[13px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors"
        >
          {revealing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {revealing ? t('ws_revealing') : t('ws_reveal')}
        </button>
        {!canReveal && (
          <p className="text-[12px] text-fg-tertiary">{t('ws_reveal_hint')}</p>
        )}
      </div>
    );
  }

  const pick = (en: string, jp: string | null) => (locale === 'ja' && jp ? jp : en);
  const expertPrompt = pick(expert.expert_prompt_en, expert.expert_prompt_jp);
  const expertOutput = pick(expert.expert_output_en, expert.expert_output_jp);
  const why = pick(expert.why_this_works_en ?? '', expert.why_this_works_jp);

  const blockLabel = 'text-[11.5px] font-bold uppercase tracking-[0.1em] text-fg-tertiary mb-1.5';
  const pre =
    'whitespace-pre-wrap text-[13px] leading-[1.6] text-fg-secondary bg-bg-primary border border-border-default rounded-[10px] p-3';

  return (
    <div className="space-y-4 rounded-[14px] border border-[color:var(--accent-teal)]/30 bg-[color:var(--accent-teal-subtle)] p-4">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-[color:var(--accent-teal)]" />
        <h3 className="text-[14px] font-bold text-fg-primary">{t('ws_compare_title')}</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <p className={blockLabel}>{t('ws_your_prompt')}</p>
          <div className={pre}>{userPrompt || '—'}</div>
        </div>
        <div>
          <p className={blockLabel}>{t('ws_expert_prompt')}</p>
          <div className={pre}>{expertPrompt}</div>
        </div>
      </div>

      <div>
        <p className={blockLabel}>{t('ws_expert_output')}</p>
        <div className={pre}>{expertOutput}</div>
      </div>

      {why && (
        <div>
          <p className={blockLabel}>{t('ws_why')}</p>
          <p className="text-[13px] leading-[1.6] text-fg-secondary">{why}</p>
        </div>
      )}
    </div>
  );
}
