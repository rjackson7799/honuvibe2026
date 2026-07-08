'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { upsertCourseSurvey } from '@/lib/admin/course-survey-actions';
import type {
  CourseSurvey,
  CourseSurveySettings,
  EventSurveyQuestion,
} from '@/lib/survey/course-surveys';
import { QuestionList } from '@/components/admin/event-survey/QuestionList';
import { AssignToEnrolledButton } from './AssignToEnrolledButton';

const INPUT =
  'w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none';
const LABEL = 'block text-[12px] font-semibold text-fg-secondary mb-1';

type Props = {
  course: { id: string; titleEn: string; titleJp: string | null };
  survey: CourseSurvey | null;
  settings: CourseSurveySettings | null;
  questions: EventSurveyQuestion[];
  hasResponses: boolean;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function CourseSurveyBuilder({ course, survey, settings, questions, hasResponses }: Props) {
  const [titleEn, setTitleEn] = useState(survey?.titleEn ?? `${course.titleEn} — Pre-course survey`);
  const [titleJp, setTitleJp] = useState(survey?.titleJp ?? `${course.titleJp ?? course.titleEn} 受講前アンケート`);
  const [introEn, setIntroEn] = useState(survey?.introEn ?? '');
  const [introJp, setIntroJp] = useState(survey?.introJp ?? '');
  const [generateStudentProfile, setGenerateStudentProfile] = useState(
    settings?.generateStudentProfile ?? false,
  );
  const [opensAt, setOpensAt] = useState(toLocalInput(settings?.opensAt ?? null));
  const [closesAt, setClosesAt] = useState(toLocalInput(settings?.closesAt ?? null));
  const [isActive, setIsActive] = useState(survey?.isActive ?? false);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const canActivate = questions.length >= 1;

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await upsertCourseSurvey({
          courseId: course.id,
          titleEn,
          titleJp,
          introEn,
          introJp,
          isActive: isActive && canActivate,
          generateStudentProfile,
          opensAt: fromLocalInput(opensAt),
          closesAt: fromLocalInput(closesAt),
        });
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed');
      }
    });
  }

  return (
    <div className="max-w-[860px] space-y-8">
      <div className="space-y-2">
        <Link
          href="/admin/course-surveys"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-tertiary transition-colors hover:text-fg-primary"
        >
          <ArrowLeft size={14} /> All course surveys
        </Link>
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold tracking-[-0.02em] text-fg-primary">
          {course.titleEn}
        </h1>
        <p className="text-sm text-fg-tertiary">
          Pre-course survey · assigned to enrolled students; the summary is emailed to the
          instructor(s).
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-border-default bg-bg-secondary p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[16px] font-semibold text-fg-primary">Settings</h2>
          <label
            className={`flex items-center gap-2 text-sm font-medium ${canActivate ? 'text-fg-secondary' : 'text-fg-tertiary'}`}
          >
            <input
              type="checkbox"
              checked={isActive && canActivate}
              disabled={!canActivate}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active (assignable to students)
          </label>
        </div>
        {!canActivate && (
          <p className="text-[12px] text-amber-600">Add at least one question before activating.</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Title (EN)</label>
            <input className={INPUT} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Title (JP)</label>
            <input className={INPUT} value={titleJp} onChange={(e) => setTitleJp(e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Intro (EN, optional)</label>
            <textarea
              className={`${INPUT} min-h-[64px]`}
              value={introEn}
              onChange={(e) => setIntroEn(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Intro (JP, optional)</label>
            <textarea
              className={`${INPUT} min-h-[64px]`}
              value={introJp}
              onChange={(e) => setIntroJp(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Opens at (optional)</label>
            <input
              type="datetime-local"
              className={INPUT}
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Closes at (responses editable until then)</label>
            <input
              type="datetime-local"
              className={INPUT}
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-fg-secondary">
          <input
            type="checkbox"
            checked={generateStudentProfile}
            onChange={(e) => setGenerateStudentProfile(e.target.checked)}
          />
          Email each student a personalized AI profile after they submit
        </label>

        {error && <p className="text-[13px] text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="rounded-lg bg-accent-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-teal/90 disabled:opacity-50"
          >
            {pending ? 'Saving…' : survey ? 'Save settings' : 'Create survey'}
          </button>
          {saved && <span className="text-[13px] text-accent-teal">Saved.</span>}
        </div>
      </section>

      {survey && (
        <section className="space-y-3 rounded-xl border border-border-default bg-bg-secondary p-5">
          <h2 className="text-[16px] font-semibold text-fg-primary">Assign to students</h2>
          <AssignToEnrolledButton
            courseId={course.id}
            disabled={!survey.isActive}
            disabledReason="Activate the survey above to assign it to enrolled students."
          />
        </section>
      )}

      {survey ? (
        <QuestionList surveyId={survey.id} questions={questions} hasResponses={hasResponses} />
      ) : (
        <p className="rounded-xl border border-dashed border-border-default py-8 text-center text-sm text-fg-tertiary">
          Save the settings above to start adding questions.
        </p>
      )}
    </div>
  );
}
