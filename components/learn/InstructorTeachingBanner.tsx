'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { GraduationCap, ArrowRight } from 'lucide-react';

type Props = {
  classCount: number;
};

export function InstructorTeachingBanner({ classCount }: Props) {
  const locale = useLocale();
  const t = useTranslations('instructor');
  const prefix = locale === 'ja' ? '/ja' : '';

  if (classCount === 0) return null;

  return (
    <Link
      href={`${prefix}/learn/dashboard/my-classes`}
      className="flex items-center gap-3 bg-accent-teal/5 border border-accent-teal/20 rounded-lg px-4 py-3 hover:bg-accent-teal/10 transition-colors duration-[var(--duration-fast)] group"
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-teal/10 shrink-0">
        <GraduationCap size={18} className="text-accent-teal" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg-primary">
          {t('banner_title', { count: classCount })}
        </p>
        <p className="text-xs text-fg-tertiary">{t('banner_subtitle')}</p>
      </div>
      <ArrowRight size={16} className="text-accent-teal shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}
