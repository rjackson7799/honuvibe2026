'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Users, Calendar } from 'lucide-react';
import type { InstructorClassItem } from '@/lib/instructors/queries';

type Props = {
  item: InstructorClassItem;
};

const roleBadgeStyles: Record<string, string> = {
  lead: 'bg-accent-teal/10 text-accent-teal',
  instructor: 'bg-accent-gold/10 text-accent-gold',
  guest: 'bg-bg-tertiary text-fg-tertiary',
};

const statusDot: Record<string, string> = {
  published: 'bg-accent-teal',
  draft: 'bg-accent-gold',
  archived: 'bg-fg-muted',
};

export function InstructorClassCard({ item }: Props) {
  const locale = useLocale();
  const t = useTranslations('instructor');

  const title = locale === 'ja' && item.title_jp ? item.title_jp : item.title_en;
  const prefix = locale === 'ja' ? '/ja' : '';

  const nextSessionDate = item.next_session
    ? new Date(item.next_session.scheduled_at)
    : null;

  const nextSessionTitle = item.next_session
    ? (locale === 'ja' && item.next_session.title_jp ? item.next_session.title_jp : item.next_session.title_en)
    : null;

  return (
    <Link
      href={`${prefix}/learn/courses/${item.slug}`}
      className="flex flex-col bg-bg-secondary border border-border-default rounded-lg overflow-hidden hover:border-border-hover hover:shadow-md transition-all duration-[var(--duration-normal)]"
    >
      {/* Thumbnail */}
      {item.thumbnail_url && (
        <div className="aspect-[21/9] bg-bg-tertiary overflow-hidden">
          <img
            src={item.thumbnail_url}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Top row: role badge + status */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeStyles[item.role] ?? roleBadgeStyles.instructor}`}>
            {t(`role_${item.role}`)}
          </span>
          {item.territory && (
            <span className="text-xs text-fg-tertiary px-1.5 py-0.5 rounded bg-bg-tertiary">
              {item.territory}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1.5 text-xs text-fg-tertiary">
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot[item.status] ?? statusDot.draft}`} />
            {item.status}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-serif text-fg-primary leading-snug">{title}</h3>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-fg-tertiary mt-auto">
          <span className="flex items-center gap-1">
            <Users size={14} />
            {t('students_enrolled', { count: item.enrolled_count })}
          </span>
          {nextSessionDate && (
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {nextSessionDate.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Next session preview */}
        {nextSessionTitle && (
          <div className="text-xs text-fg-secondary border-t border-border-default pt-2 mt-1">
            <span className="text-fg-tertiary">{t('next_session')}:</span>{' '}
            {nextSessionTitle}
          </div>
        )}
      </div>
    </Link>
  );
}
