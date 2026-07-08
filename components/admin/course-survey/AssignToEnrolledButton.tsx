'use client';

import { useState, useTransition } from 'react';
import { Send } from 'lucide-react';
import { assignCourseSurveyToEnrolled } from '@/lib/admin/course-survey-actions';

export function AssignToEnrolledButton({
  courseId,
  disabled,
  disabledReason,
}: {
  courseId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  if (disabled) {
    return <p className="text-[13px] text-fg-tertiary">{disabledReason}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm('Assign this survey to all active enrollees and email them the link?'))
            return;
          setMsg(null);
          setOk(null);
          start(async () => {
            try {
              const r = await assignCourseSurveyToEnrolled(courseId);
              setOk(true);
              setMsg(
                `${r.assigned} newly assigned · ${r.alreadyAssigned} already had it · ${r.emailed} emailed (of ${r.total} enrolled).`,
              );
            } catch (e) {
              setOk(false);
              setMsg(e instanceof Error ? e.message : 'Failed.');
            }
          });
        }}
        className="inline-flex items-center gap-1.5 rounded-lg bg-accent-teal px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-teal/90 disabled:opacity-50"
      >
        <Send size={14} /> {pending ? 'Assigning…' : 'Assign to all enrolled'}
      </button>
      {msg && <span className={`text-[12px] ${ok ? 'text-accent-teal' : 'text-red-600'}`}>{msg}</span>}
    </div>
  );
}
