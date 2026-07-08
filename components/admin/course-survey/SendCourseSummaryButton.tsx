'use client';

import { useState, useTransition } from 'react';
import { Send } from 'lucide-react';
import { sendCourseSummaryAction } from '@/lib/admin/course-survey-actions';

const REASON: Record<string, string> = {
  no_instructor_email: "No instructor is assigned to this course (course_instructors).",
  no_responses: 'No survey responses yet.',
  no_course: 'This survey is not bound to a course.',
  summary_unavailable: 'Could not generate the summary — check the AI key.',
  email_not_configured: 'Email is not configured.',
};

export function SendCourseSummaryButton({
  surveyId,
  courseId,
}: {
  surveyId: string;
  courseId: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          setOk(null);
          start(async () => {
            try {
              const r = await sendCourseSummaryAction(surveyId, courseId);
              setOk(r.sent);
              setMsg(
                r.sent
                  ? 'Sent to instructor(s).'
                  : REASON[r.reason ?? ''] ?? r.reason ?? 'Send failed.',
              );
            } catch {
              setOk(false);
              setMsg('Send failed.');
            }
          });
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] font-medium text-fg-secondary transition-colors hover:border-accent-teal hover:text-accent-teal disabled:opacity-50"
      >
        <Send size={14} /> {pending ? 'Sending…' : 'Send summary to instructor(s)'}
      </button>
      {msg && <span className={`text-[12px] ${ok ? 'text-accent-teal' : 'text-red-600'}`}>{msg}</span>}
    </div>
  );
}
