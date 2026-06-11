'use client';

import { useRouter } from 'next/navigation';
import { useFlow } from './DiscoverFlowProvider';
import { AnalysisLoader } from './AnalysisLoader';
import { StepRail } from './StepRail';
import { LivePriceTotal } from './LivePriceTotal';
import { QuestionCard } from './QuestionCard';
import { discoverPath } from './paths';
import {
  questionsForStep,
  activeBranchesFor,
  STEPS,
  type StepId,
  type AnswerMap,
} from '@/lib/questions';

// The 3-column discovery flow: stepper rail · stacked questions · live price.
// All 15 questions live across the 3 steps; conditional branches render inline
// under their parent question when triggered.
export function DiscoverFlow() {
  const { hydrated, error, currentStep, goToStep, sessionId, answers, intake } = useFlow();
  const router = useRouter();

  if (error) {
    return (
      <div className="dsc-center">
        <p className="dsc-error">{error}</p>
      </div>
    );
  }
  if (!hydrated) return <AnalysisLoader />;

  const step = STEPS.find((s) => s.id === currentStep) ?? STEPS[0];
  const questions = questionsForStep(currentStep as StepId);

  // Branch predicates read capturesField keys; industry/location live on intake.
  const predicateMap: AnswerMap = {
    ...answers,
    industry: intake.industry ?? undefined,
    location_type: intake.location_type ?? undefined,
  };

  const onContinue = () => {
    if (currentStep < 3) {
      goToStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push(discoverPath(`/discover/${sessionId}/review`));
    }
  };

  const onBack = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="dsc-grid">
      <StepRail currentStep={currentStep} />

      <main className="dsc-main">
        <p className="dsc-stepmark">
          Step {currentStep} of 3 · {step.label}
        </p>

        {questions.map((q) => (
          <div key={q.id}>
            <QuestionCard q={q} />
            {activeBranchesFor(q.id, predicateMap).map((b) => (
              <QuestionCard key={b.question.id} q={b.question} />
            ))}
          </div>
        ))}

        <div className="dsc-actions">
          {currentStep > 1 ? (
            <button type="button" className="dsc-btn dsc-btn--ghost" onClick={onBack}>
              <span aria-hidden>←</span> Back
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="dsc-btn dsc-btn--primary" onClick={onContinue}>
            {currentStep < 3 ? 'Continue' : 'Review my plan'} <span aria-hidden>→</span>
          </button>
        </div>
      </main>

      <LivePriceTotal />
    </div>
  );
}
