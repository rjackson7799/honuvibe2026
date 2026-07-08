'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { upsertEventSurvey } from '@/lib/admin/event-survey-actions';
import type {
  EventSurvey,
  EventSurveySettings,
  EventSurveyQuestion,
} from '@/lib/survey/event-surveys';
import { QuestionList } from './QuestionList';

const INPUT =
  'w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none';
const LABEL = 'block text-[12px] font-semibold text-fg-secondary mb-1';

type Props = {
  event: { slug: string; titleEn: string; titleJp: string; startsAt: string };
  survey: EventSurvey | null;
  settings: EventSurveySettings | null;
  questions: EventSurveyQuestion[];
  hasResponses: boolean;
};

/** ISO → 'YYYY-MM-DDTHH:mm' in local time for datetime-local inputs. */
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

export function EventSurveyBuilder({ event, survey, settings, questions, hasResponses }: Props) {
  const [titleEn, setTitleEn] = useState(survey?.titleEn ?? `${event.titleEn} — Pre-event survey`);
  const [titleJp, setTitleJp] = useState(survey?.titleJp ?? `${event.titleJp} 事前アンケート`);
  const [introEn, setIntroEn] = useState(survey?.introEn ?? '');
  const [introJp, setIntroJp] = useState(survey?.introJp ?? '');
  const [presenterEmail, setPresenterEmail] = useState(settings?.presenterEmail ?? '');
  const [presenterLocale, setPresenterLocale] = useState<'en' | 'ja'>(
    settings?.presenterLocale ?? 'en',
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
        await upsertEventSurvey({
          eventSlug: event.slug,
          titleEn,
          titleJp,
          introEn,
          introJp,
          isActive: isActive && canActivate,
          presenterEmail,
          presenterLocale,
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
          href="/admin/event-surveys"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-tertiary transition-colors hover:text-fg-primary"
        >
          <ArrowLeft size={14} /> All event surveys
        </Link>
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold tracking-[-0.02em] text-fg-primary">
          {event.titleEn}
        </h1>
        <p className="text-sm text-fg-tertiary">
          Pre-event survey · registrants are linked here after they confirm their seat.
        </p>
      </div>

      {/* Settings */}
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
            Active (link shown to registrants)
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
            <label className={LABEL}>Closes at (defaults to event start)</label>
            <input
              type="datetime-local"
              className={INPUT}
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <div>
            <label className={LABEL}>Presenter email (summary recipient)</label>
            <input
              className={INPUT}
              type="email"
              value={presenterEmail}
              placeholder="presenter@example.com"
              onChange={(e) => setPresenterEmail(e.target.value)}
            />
            <p className="mt-1 text-[12px] text-fg-tertiary">
              The pre-event summary is emailed here, BCC’d to admins.
            </p>
          </div>
          <div>
            <label className={LABEL}>Presenter language</label>
            <select
              className={INPUT}
              value={presenterLocale}
              onChange={(e) => setPresenterLocale(e.target.value as 'en' | 'ja')}
            >
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
          </div>
        </div>

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

      {/* Questions */}
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
