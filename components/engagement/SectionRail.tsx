'use client';

import { isAnswerPresent } from '@/lib/studio/engagement/validate-answers';

// The section rail. The client can JUMP TO ANY SECTION at any time — required
// fields are enforced only at submit (blocking forward movement on a
// 7-section B2B questionnaire is hostile). The data-state attribute is the
// StepRail.tsx idiom; the visual language is SurveyForm's marketing tokens.
// On narrow screens the rail collapses to a horizontal chip strip.

import { useQuestionnaire } from './QuestionnaireProvider';

export function SectionRail() {
  const { questionnaire, goToSection, sectionState, t, sectionIndex, answers, submitted } = useQuestionnaire();
  const sections = questionnaire.sections;

  return (
    <nav aria-label={t.eyebrow} className="md:sticky md:top-[76px]">
      <ol className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1 md:overflow-visible md:pb-0">
        {sections.map((s, i) => {
          const state = sectionState(s.key);
          const qs = questionnaire.questions.filter((q) => q.section_key === s.key);
          const done = qs.filter((q) => {
            const a = answers[q.id];
            return !!a && isAnswerPresent(a.value, a.other);
          }).length;
          return (
            <li key={s.key} data-state={state} className="shrink-0 md:shrink">
              <button
                type="button"
                onClick={() => goToSection(s.key)}
                aria-current={state === 'active' ? 'step' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-[10px] border px-3 min-h-[44px] text-left text-[13.5px] transition-colors ${
                  state === 'active'
                    ? 'border-[var(--m-accent-teal)] bg-[rgba(15,169,160,0.08)] text-[var(--m-ink-primary)]'
                    : state === 'done'
                      ? 'border-transparent text-[var(--m-ink-primary)] hover:bg-[rgba(26,43,51,0.04)]'
                      : 'border-transparent text-[var(--m-ink-secondary)] hover:bg-[rgba(26,43,51,0.04)]'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    state === 'done'
                      ? 'bg-[var(--m-accent-teal)] text-white'
                      : state === 'active'
                        ? 'bg-[var(--m-ink-primary)] text-white'
                        : 'bg-[rgba(26,43,51,0.08)] text-[var(--m-ink-secondary)]'
                  }`}
                  aria-hidden
                >
                  {state === 'done' && !submitted ? '✓' : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block truncate ${i === sectionIndex ? 'font-semibold' : 'font-medium'}`}>{s.title}</span>
                  <span className="hidden text-[11.5px] text-[var(--m-ink-secondary)] md:block">
                    {t.answered(done, qs.length)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
