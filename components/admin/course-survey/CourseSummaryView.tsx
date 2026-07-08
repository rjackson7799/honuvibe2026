import type { CourseStats, CourseSummaryContent } from '@/lib/survey/course-summary';

type Props = {
  responseCount: number;
  content: CourseSummaryContent;
  stats: CourseStats;
};

/** Generic, qtype-driven summary renderer (not AI-Essentials-shaped). */
export function CourseSummaryView({ responseCount, content, stats }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
          Cohort summary
        </h3>
        <span className="text-[12px] text-fg-tertiary">Generated from {responseCount} responses</span>
      </div>

      <p className="text-[15px] leading-[1.6] text-fg-secondary">{content.summary_text}</p>

      {content.key_takeaways.length > 0 && (
        <ul className="list-disc space-y-1.5 pl-5 text-[14px] text-fg-secondary">
          {content.key_takeaways.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ul>
      )}

      <div className="rounded-lg bg-accent-teal/5 px-4 py-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-accent-teal">
          Teaching focus
        </p>
        <p className="mt-1 text-[14px] leading-[1.6] text-fg-secondary">{content.teaching_focus}</p>
      </div>

      <div className="rounded-lg bg-amber-500/5 px-4 py-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-amber-600">
          Instructor notes
        </p>
        <p className="mt-1 text-[14px] leading-[1.6] text-fg-secondary">{content.instructor_notes}</p>
      </div>

      {stats.questions.length > 0 && (
        <div className="space-y-4 pt-1">
          {stats.questions.map((q) => (
            <div key={q.questionId} className="space-y-1.5">
              <p className="text-[13px] font-medium text-fg-primary">{q.promptEn}</p>
              {q.qtype === 'text' ? (
                <p className="text-[12px] text-fg-tertiary">{q.count} free-text response(s)</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {q.counts
                    .filter((c) => c.n > 0)
                    .map((c) => (
                      <span
                        key={c.value}
                        className="rounded-full border border-border-default px-2 py-0.5 text-[12px] text-fg-secondary"
                      >
                        {c.labelEn}: {c.n}
                      </span>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
