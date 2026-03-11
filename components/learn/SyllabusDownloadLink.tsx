'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

type SyllabusDownloadLinkProps = {
  courseId: string;
  variant: 'card' | 'sidebar' | 'admin';
  className?: string;
};

export function SyllabusDownloadLink({
  courseId,
  variant,
  className,
}: SyllabusDownloadLinkProps) {
  const t = useTranslations('learn');
  const locale = useLocale();

  const href = `/api/courses/${courseId}/syllabus?locale=${locale}`;

  function handleClick(e: React.MouseEvent) {
    // Stop propagation so parent Link (CourseCard) doesn't navigate
    e.stopPropagation();
    e.preventDefault();
    window.open(href, '_blank');
  }

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs text-fg-tertiary',
          'hover:text-accent-teal transition-colors duration-[var(--duration-fast)]',
          className,
        )}
      >
        <Download size={12} />
        {t('download_syllabus')}
      </button>
    );
  }

  if (variant === 'sidebar') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-md text-sm font-medium',
          'border border-border-default text-fg-secondary',
          'hover:border-accent-teal hover:text-accent-teal',
          'transition-all duration-[var(--duration-fast)]',
          className,
        )}
      >
        <Download size={16} />
        {t('download_syllabus')}
      </a>
    );
  }

  // admin variant
  return (
    <button
      type="button"
      onClick={() => window.open(href.replace(`locale=${locale}`, 'locale=en&preview=true'), '_blank')}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md',
        'text-fg-secondary hover:text-fg-primary',
        'border border-border-default hover:border-border-hover',
        'transition-all duration-[var(--duration-fast)]',
        className,
      )}
    >
      <Download size={14} />
      Preview Syllabus
    </button>
  );
}
