import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AssignmentCompletionToggle } from '@/components/learn/AssignmentCompletionToggle';
import { BadgePill } from '@/components/ui/badge-pill';
import { SectionHeading } from '@/components/learn/SectionHeading';
import { countOverdue, getDueInfo, sortByDue } from '@/lib/dashboard/due-dates';
import type { PendingAssignmentItem } from '@/lib/dashboard/types';

type ActionItemsBandProps = {
  items: PendingAssignmentItem[];
  locale: string;
  now: Date;
};

const MAX_ROWS = 5;

/**
 * Homework and challenges — the only time-bound obligations on the dashboard, so
 * this band is never hidden behind a tile.
 *
 * There is no all-assignments route to link to, so rather than invent one the
 * header carries the true total and every row deep-links to its course hub.
 */
export async function ActionItemsBand({ items, locale, now }: ActionItemsBandProps) {
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const prefix = locale === 'ja' ? '/ja' : '';

  const overdue = countOverdue(items, now);
  const sorted = sortByDue(items, now).slice(0, MAX_ROWS);

  return (
    <section>
      <SectionHeading title={t('section_action_items')} />

      {items.length === 0 ? (
        <div className="py-6 px-4 rounded-[10px] border border-dashed border-border-default bg-bg-tertiary text-center">
          <p className="text-sm text-fg-tertiary">{t('no_assignments')}</p>
        </div>
      ) : (
        <>
          <p className="-mt-1 mb-3 text-[12px] text-fg-tertiary">
            {t('action_items_count', { count: items.length })}
            {overdue > 0 && (
              <>
                {' · '}
                <span className="text-[color:var(--accent-coral)] font-semibold">
                  {t('overdue_count', { count: overdue })}
                </span>
              </>
            )}
          </p>

          <div className="flex flex-col gap-2">
            {sorted.map((assignment) => {
              const title =
                locale === 'ja' && assignment.title_jp
                  ? assignment.title_jp
                  : assignment.title_en;
              const courseTitle =
                locale === 'ja' && assignment.course_title_jp
                  ? assignment.course_title_jp
                  : assignment.course_title_en;

              const tagLabel =
                assignment.assignment_type === 'homework'
                  ? t('homework')
                  : assignment.assignment_type === 'action-challenge'
                    ? t('action_challenge')
                    : t('project');
              const tagVariant: 'teal' | 'coral' | 'gray' =
                assignment.assignment_type === 'homework'
                  ? 'teal'
                  : assignment.assignment_type === 'action-challenge'
                    ? 'coral'
                    : 'gray';

              // Same helper the sort uses, so the label and the order can't disagree.
              const { bucket, daysUntil } = getDueInfo(assignment.due_date, now);
              const dueLabel =
                bucket === 'overdue'
                  ? t('overdue')
                  : daysUntil === 0
                    ? t('due_today')
                    : assignment.due_date
                      ? t('due_date', {
                          date: new Date(assignment.due_date).toLocaleDateString(
                            locale === 'ja' ? 'ja-JP' : 'en-US',
                            { month: 'short', day: 'numeric', timeZone: 'UTC' },
                          ),
                        })
                      : t('no_due_date');
              const dueClass =
                bucket === 'overdue'
                  ? 'text-[color:var(--accent-coral)] font-semibold'
                  : bucket === 'due_soon'
                    ? 'text-[color:var(--accent-coral)]'
                    : 'text-fg-tertiary';

              return (
                <div
                  key={assignment.id}
                  className="flex items-center gap-3 px-4 py-3 bg-bg-secondary border border-border-default rounded-[10px] hover:border-border-hover transition-colors"
                >
                  <AssignmentCompletionToggle assignmentId={assignment.id} />
                  <Link
                    href={`${prefix}/learn/dashboard/${assignment.course_slug}`}
                    className="flex-1 min-w-0 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[13.5px] font-semibold text-fg-primary truncate">
                          {title}
                        </span>
                        <BadgePill variant={tagVariant} size="xs">
                          {tagLabel}
                        </BadgePill>
                      </div>
                      <p className="text-[12px] text-fg-tertiary truncate">
                        {courseTitle} · {t('week_label', { number: assignment.week_number })}
                      </p>
                    </div>
                    <span
                      className={`text-[12px] font-medium whitespace-nowrap shrink-0 ${dueClass}`}
                    >
                      {dueLabel}
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
