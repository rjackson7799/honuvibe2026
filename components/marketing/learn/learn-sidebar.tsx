'use client';

import { useTranslations } from 'next-intl';
import { HvCard, HvEyebrow } from '@/components/marketing/hv';
import { isTrackId, type TrackId } from '@/lib/tracks';
import { setCatalogState } from './catalog-state';

type Goal = { label: string; track: TrackId };
type Part = { title: string; body: string };

/** Study-path goals (D5: each sets a track filter, no counts) and "What a lesson can include". */
export function LearnSidebar() {
  const t = useTranslations('learn_catalog.sidebar');
  const tt = useTranslations('tracks');
  const goals = ((t.raw('goals') as Goal[]) ?? []).filter((g) => isTrackId(g.track));
  const parts = (t.raw('inside_parts') as Part[]) ?? [];

  return (
    <div className="grid gap-5">
      <HvCard variant="dark" radius={14} className="p-[22px]">
        <HvEyebrow tone="amber">{t('eyebrow')}</HvEyebrow>
        <h3 className="mb-1 mt-2.5 font-hv-display text-[21px] font-semibold tracking-[-0.02em]">{t('title')}</h3>
        <p className="text-[14px] leading-[1.5] text-hv-green-400">{t('sub')}</p>
        <div className="mt-[18px] grid gap-2.5">
          {goals.map((goal) => (
            <button
              key={goal.label}
              type="button"
              onClick={() => setCatalogState({ track: goal.track, query: '', freeOnly: false }, { scroll: true })}
              className="block min-h-[44px] w-full rounded-[10px] bg-hv-green-800 p-3.5 text-left transition-colors hover:bg-hv-green-750 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber"
            >
              <span className="block text-[15.5px] font-semibold leading-[1.3] text-hv-sand-100">{goal.label}</span>
              <span className="mt-[5px] block text-[13px] text-hv-green-400">{tt(`${goal.track}.label`)}</span>
            </button>
          ))}
        </div>
      </HvCard>
      <HvCard variant="light" radius={14} className="p-[22px]">
        <HvEyebrow tone="muted">{t('inside_title')}</HvEyebrow>
        <div className="mt-3.5 grid gap-3">
          {parts.map((part) => (
            <div key={part.title}>
              <p className="text-[15.5px] font-semibold text-hv-green-900">{part.title}</p>
              <p className="mt-[3px] text-[14px] leading-[1.5] text-hv-ink-500">{part.body}</p>
            </div>
          ))}
        </div>
      </HvCard>
    </div>
  );
}
