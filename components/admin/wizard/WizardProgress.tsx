'use client';

type WizardStep = 'basic' | 'content' | 'instructions';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'basic', label: 'Basic Info' },
  { key: 'content', label: 'Content' },
  { key: 'instructions', label: 'Instructions' },
];

type WizardProgressProps = {
  currentStep: WizardStep;
};

export function WizardProgress({ currentStep }: WizardProgressProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isComplete = i < currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`w-8 h-px ${isComplete ? 'bg-accent-teal' : 'bg-border-default'}`} />
            )}
            <div
              className={`flex items-center gap-2 text-sm ${
                isActive
                  ? 'text-accent-teal font-medium'
                  : isComplete
                    ? 'text-accent-teal'
                    : 'text-fg-tertiary'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  isActive
                    ? 'bg-accent-teal text-white'
                    : isComplete
                      ? 'bg-accent-teal/20 text-accent-teal'
                      : 'bg-bg-tertiary text-fg-tertiary'
                }`}
              >
                {isComplete ? '\u2713' : i + 1}
              </span>
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
