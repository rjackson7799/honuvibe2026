'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { SessionReportView } from './SessionReportView';
import type { SessionReport } from '@/lib/tutoring/types';

export function SessionReportsTab({
  reports,
  locale,
}: {
  reports: SessionReport[];
  locale: 'en' | 'ja';
}) {
  const t = useTranslations('tutoring');
  const [openId, setOpenId] = useState<string | null>(reports[0]?.id ?? null);

  if (reports.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border-default py-12 text-center text-sm text-fg-tertiary">
        {t('list_empty')}
      </p>
    );
  }

  const df = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', { dateStyle: 'long' });

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-tertiary">{t('list_intro')}</p>
      {reports.map((r) => {
        const open = openId === r.id;
        const dateStr = df.format(new Date(`${r.session_date}T00:00:00`));
        return (
          <div
            key={r.id}
            className="overflow-hidden rounded-xl border border-border-default bg-bg-secondary"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : r.id)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-bg-tertiary/40"
            >
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium text-fg-primary">
                  {r.topic ?? t('session_on', { date: dateStr })}
                </p>
                <p className="text-[13px] text-fg-tertiary">
                  {dateStr}
                  {r.duration_minutes ? ` · ${r.duration_minutes} min` : ''}
                </p>
              </div>
              <ChevronDown
                size={18}
                className={`shrink-0 text-fg-tertiary transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>
            {open && r.student_json && (
              <div className="border-t border-border-default px-5 py-6 md:px-8">
                <SessionReportView report={r.student_json} locale={locale} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
