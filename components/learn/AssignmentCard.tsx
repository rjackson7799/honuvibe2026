'use client';

import { useTranslations, useLocale } from 'next-intl';
import { FileText, Zap, FolderOpen } from 'lucide-react';
import type { CourseAssignment } from '@/lib/courses/types';

type AssignmentCardProps = {
  assignment: CourseAssignment;
};

const typeIcons = {
  homework: FileText,
  'action-challenge': Zap,
  project: FolderOpen,
} as const;

export function AssignmentCard({ assignment }: AssignmentCardProps) {
  const t = useTranslations('learn');
  const locale = useLocale();

  const title = locale === 'ja' && assignment.title_jp
    ? assignment.title_jp
    : assignment.title_en;
  const description = locale === 'ja' && assignment.description_jp
    ? assignment.description_jp
    : assignment.description_en;

  const Icon = typeIcons[assignment.assignment_type] ?? FileText;
  const typeLabel = t(assignment.assignment_type === 'action-challenge' ? 'action_challenge' : assignment.assignment_type);

  const dueDateFormatted = assignment.due_date
    ? new Date(assignment.due_date).toLocaleDateString(
        locale === 'ja' ? 'ja-JP' : 'en-US',
        { month: 'short', day: 'numeric' },
      )
    : null;

  return (
    <div className="border border-border-default rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-accent-teal shrink-0" />
        <span className="text-xs font-medium text-accent-teal uppercase tracking-wide">
          {typeLabel}
        </span>
        {dueDateFormatted && (
          <span className="text-xs text-fg-tertiary ml-auto">
            Due {dueDateFormatted}
          </span>
        )}
      </div>
      <h4 className="text-sm font-medium text-fg-primary">{title}</h4>
      {description && (
        <p className="text-sm text-fg-secondary">{description}</p>
      )}
    </div>
  );
}
