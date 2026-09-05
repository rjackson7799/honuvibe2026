'use client';

// The client discovery questionnaire page body: sticky header (wordmark ·
// title · the ONE save chip), the section rail, the current section's
// questions, prev/next + submit, and the in-place thank-you / read-only /
// fatal states. No LangToggle — the questionnaire's locale is fixed by the
// entry route. Chromeless: the global Nav is suppressed for /discovery in
// components/layout/conditional-nav.tsx; this component carries its own
// HonuVibe wordmark inside a `data-shell="marketing" learn-zone` surface (the
// /join and /survey precedent).

import { useEffect, useRef } from 'react';
import { CheckCircle2, KeyRound, Clock } from 'lucide-react';
import { CommunityMarkdown } from '@/lib/community/markdown';
import {
  QuestionnaireProvider,
  useQuestionnaire,
  type ClientQuestionnaire,
} from './QuestionnaireProvider';
import { QuestionField } from './QuestionField';
import { SaveChip } from './SaveChip';
import { SectionRail } from './SectionRail';
import type { StoredAnswer } from '@/lib/studio/engagement/questions-schema';

export function QuestionnaireApp({
  questionnaire,
  initialAnswers,
}: {
  questionnaire: ClientQuestionnaire;
  initialAnswers: Pick<StoredAnswer, 'question_id' | 'answer' | 'other_text'>[];
}) {
  return (
    <QuestionnaireProvider questionnaire={questionnaire} initialAnswers={initialAnswers}>
      <Shell />
    </QuestionnaireProvider>
  );
}

function Wordmark() {
  return (
    <span className="text-[17px] font-semibold tracking-tight text-[var(--m-ink-primary)]">
      HonuVibe<span className="text-[var(--m-accent-teal)]">.AI</span>
      <span className="ml-1.5 text-[12px] font-medium text-[var(--m-ink-secondary)]">Studio</span>
    </span>
  );
}

function Shell() {
  const { questionnaire, t, fatal, submitted, currentSection, sectionIndex, goToSection, submit, submitting, submitError, missing, answeredCount, chip } =
    useQuestionnaire();
  const isJa = questionnaire.locale === 'ja';
  const missingRef = useRef(missing);

  // Jump to the first missing question when the submit pre-check flags it.
  useEffect(() => {
    if (missing !== missingRef.current) {
      missingRef.current = missing;
      const first = Object.keys(missing)[0];
      if (first) {
        // Wait a frame so the section switch has rendered.
        requestAnimationFrame(() => {
          document.querySelector(`[data-question="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    }
  }, [missing]);

  // On an INNER wrapper, not the data-shell element: the unlayered
  // [data-shell="marketing"] { font-family: Inter… } rule in globals.css beats
  // a Tailwind utility on the same node, so the JP stack must sit one level down.
  const jpText = isJa ? 'font-[family-name:var(--font-noto-sans-jp)] leading-[1.75] tracking-[0.03em]' : '';

  if (fatal) {
    const isExpired = fatal === 'expired';
    const isStale = fatal === 'stale';
    const isUnavailable = fatal === 'unavailable';
    return (
      <div data-shell="marketing" className="learn-zone min-h-screen px-5 py-12 sm:px-6" style={{ backgroundColor: 'var(--m-canvas)' }}>
        <div lang={isJa ? 'ja' : 'en'} className={`mx-auto w-full max-w-[560px] ${jpText}`}>
          <div className="mb-8 text-center"><Wordmark /></div>
          <div className="rounded-[18px] border border-[var(--m-border-soft)] bg-[var(--m-white)] p-8 text-center shadow-[var(--m-shadow-md)]">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(232,118,90,0.10)' }}>
              {isExpired ? <Clock size={28} style={{ color: 'var(--m-accent-coral)' }} /> : <KeyRound size={28} style={{ color: 'var(--m-accent-coral)' }} />}
            </div>
            <h1 className="mb-2 text-[22px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">
              {isExpired ? t.expiredTitle : isStale ? t.staleTitle : isUnavailable ? t.unavailableTitle : t.forbiddenTitle}
            </h1>
            <p className="text-[15px] leading-[1.7] text-[var(--m-ink-secondary)]">
              {isExpired ? t.expiredBody : isStale ? t.staleBody : isUnavailable ? t.unavailableBody : t.forbiddenBody}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sections = questionnaire.sections;
  const section = sections[sectionIndex] ?? sections[0];
  const questions = questionnaire.questions.filter((q) => q.section_key === section?.key);
  const isLast = sectionIndex === sections.length - 1;
  const total = questionnaire.questions.length;
  let globalIndex = 0;
  for (let i = 0; i < sectionIndex; i += 1) {
    globalIndex += questionnaire.questions.filter((q) => q.section_key === sections[i].key).length;
  }
  const submittedDate = questionnaire.submitted_at
    ? new Date(questionnaire.submitted_at).toLocaleDateString(isJa ? 'ja-JP' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const primaryBtn =
    'inline-flex items-center justify-center rounded-[10px] bg-[var(--m-accent-teal)] px-6 min-h-[48px] text-[15px] font-bold text-white transition-colors hover:bg-[var(--m-accent-teal-dark)] disabled:opacity-60';
  const ghostBtn =
    'inline-flex items-center justify-center rounded-[10px] border border-[var(--m-border-strong)] bg-[var(--m-white)] px-5 min-h-[48px] text-[15px] font-semibold text-[var(--m-ink-primary)] transition-colors hover:border-[var(--m-accent-teal)] disabled:opacity-60';

  return (
    <div data-shell="marketing" className="learn-zone min-h-screen" style={{ backgroundColor: 'var(--m-canvas)' }}>
      <div lang={isJa ? 'ja' : 'en'} className={jpText}>
      <header className="sticky top-0 z-20 border-b border-[var(--m-border-soft)] bg-[var(--m-canvas)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-3 px-5 py-3 sm:px-6">
          <div className="min-w-0">
            <Wordmark />
            <p className="truncate text-[12px] text-[var(--m-ink-secondary)]">
              {questionnaire.title} · {t.answered(answeredCount, total)}
            </p>
          </div>
          <SaveChip />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-5 py-8 sm:px-6 sm:py-10">
        {submitted ? (
          <div className="mx-auto max-w-[640px] space-y-8">
            <div className="rounded-[18px] border border-[var(--m-border-soft)] bg-[var(--m-white)] p-8 text-center shadow-[var(--m-shadow-md)]">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(15,169,160,0.1)' }}>
                <CheckCircle2 size={28} strokeWidth={2} style={{ color: 'var(--m-accent-teal)' }} />
              </div>
              <h1 className="mb-2 text-[22px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">{t.thanksTitle}</h1>
              <p className="text-[15px] leading-[1.7] text-[var(--m-ink-secondary)]">{t.thanksBody}</p>
              {submittedDate ? <p className="mt-3 text-[12.5px] text-[var(--m-ink-secondary)]">{t.submittedOn(submittedDate)}</p> : null}
            </div>
            <p className="text-center text-[13px] text-[var(--m-ink-secondary)]">{t.readOnlyNote}</p>
            <ReadOnlyAnswers />
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)]">
            <SectionRail />
            <div className="min-w-0 space-y-8">
              {sectionIndex === 0 && questionnaire.intro_md ? (
                <div className="rounded-[14px] bg-[rgba(15,169,160,0.08)] px-4 py-3.5 text-[14px] leading-[1.7] text-[var(--m-ink-secondary)] [&_p]:my-1">
                  <CommunityMarkdown body={questionnaire.intro_md} />
                </div>
              ) : null}

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
                  {t.sectionOf(sectionIndex + 1, sections.length)}
                </p>
                <h1 className="mt-1 text-[clamp(22px,3vw,28px)] font-bold tracking-[-0.02em] text-[var(--m-ink-primary)]">{section?.title}</h1>
                {section?.blurb ? <p className="mt-2 max-w-[640px] text-[14.5px] leading-[1.7] text-[var(--m-ink-secondary)]">{section.blurb}</p> : null}
              </div>

              <div className="space-y-8 rounded-[18px] border border-[var(--m-border-soft)] bg-[var(--m-white)] p-5 shadow-[var(--m-shadow-md)] sm:p-7">
                {questions.map((q, i) => (
                  <QuestionField key={q.id} question={q} index={globalIndex + i + 1} />
                ))}
                {/* Honeypot — bots fill it, humans never see it. */}
                <input type="text" name="company_url" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" defaultValue="" />
              </div>

              {submitError ? (
                <div className="rounded-[12px] border border-[rgba(232,118,90,0.4)] bg-[rgba(232,118,90,0.08)] px-4 py-3 text-[14px] text-[var(--m-ink-primary)]">
                  {submitError}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" className={ghostBtn} disabled={sectionIndex === 0} onClick={() => goToSection(sections[sectionIndex - 1].key)}>
                  {t.prev}
                </button>
                {isLast ? (
                  <button type="button" className={primaryBtn} disabled={submitting || chip.kind === 'unsaved'} onClick={() => void submit()}>
                    {submitting ? t.submitting : t.submit}
                  </button>
                ) : (
                  <button type="button" className={primaryBtn} onClick={() => goToSection(sections[sectionIndex + 1].key)}>
                    {t.next}
                  </button>
                )}
              </div>
              <p className="text-[12.5px] text-[var(--m-ink-secondary)]">{isLast ? t.beforeSubmitNote : t.autosaveHint}</p>
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}

/** After submission: the answers, read-only, with the pinned option labels. */
function ReadOnlyAnswers() {
  const { questionnaire, answers, t } = useQuestionnaire();
  return (
    <div className="space-y-6">
      {questionnaire.sections.map((s) => {
        const qs = questionnaire.questions.filter((q) => q.section_key === s.key);
        if (qs.length === 0) return null;
        return (
          <section key={s.key} className="rounded-[18px] border border-[var(--m-border-soft)] bg-[var(--m-white)] p-5 shadow-[var(--m-shadow-md)] sm:p-6">
            <h2 className="text-[16px] font-bold text-[var(--m-ink-primary)]">{s.title}</h2>
            <dl className="mt-4 space-y-4">
              {qs.map((q) => {
                const a = answers[q.id];
                const values = Array.isArray(a?.value) ? a.value : a?.value ? [a.value] : [];
                const labels = values.map((v) => (v === '__other' ? `${t.other}: ${a?.other ?? ''}` : q.options.find((o) => o.value === v)?.label ?? v));
                const text = q.qtype === 'text' ? (typeof a?.value === 'string' ? a.value.trim() : '') : labels.join(' · ');
                return (
                  <div key={q.id}>
                    <dt className="text-[13.5px] font-semibold text-[var(--m-ink-primary)]">{q.prompt}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-[14.5px] leading-[1.7] text-[var(--m-ink-secondary)]">{text || '—'}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
