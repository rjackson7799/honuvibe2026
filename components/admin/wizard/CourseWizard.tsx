'use client';

import { useState, useCallback } from 'react';
import { WizardProgress } from './WizardProgress';
import { WizardStepBasicInfo } from './WizardStepBasicInfo';
import { WizardStepContent } from './WizardStepContent';
import { WizardStepInstructions } from './WizardStepInstructions';
import type { WizardParams, ParsedCourseData } from '@/lib/courses/types';

type WizardStep = 'basic' | 'content' | 'instructions';

const DEFAULT_WIZARD_DATA: WizardParams = {
  title: '',
  description: '',
  instructorName: 'Ryan Jackson',
  courseType: 'cohort',
  level: 'beginner',
  format: 'live',
  studentLanguage: 'en',
  contentDifficulty: 'foundational',
  totalWeeks: 8,
  priceUsd: 0,
  priceJpy: 0,
  topicOverview: '',
  learningOutcomes: [],
  toolsToCover: [],
  targetAudience: '',
};

type CourseWizardProps = {
  onGenerated: (data: ParsedCourseData, uploadId: string) => void;
};

export function CourseWizard({ onGenerated }: CourseWizardProps) {
  const [step, setStep] = useState<WizardStep>('basic');
  const [wizardData, setWizardData] = useState<WizardParams>(DEFAULT_WIZARD_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = useCallback((partial: Partial<WizardParams>) => {
    setWizardData((prev) => ({ ...prev, ...partial }));
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/courses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wizardParams: wizardData }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data = await res.json();
      onGenerated(data.parsedData, data.uploadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <WizardProgress currentStep={step} />

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading && (
        <div className="mb-4 bg-accent-teal/10 border border-accent-teal/30 rounded-lg px-4 py-3">
          <p className="text-sm text-accent-teal">
            Generating your course curriculum with AI... This may take 15-30 seconds.
          </p>
        </div>
      )}

      {step === 'basic' && (
        <WizardStepBasicInfo
          data={wizardData}
          onChange={handleChange}
          onNext={() => setStep('content')}
        />
      )}

      {step === 'content' && (
        <WizardStepContent
          data={wizardData}
          onChange={handleChange}
          onNext={() => setStep('instructions')}
          onBack={() => setStep('basic')}
        />
      )}

      {step === 'instructions' && (
        <WizardStepInstructions
          data={wizardData}
          onChange={handleChange}
          onBack={() => setStep('content')}
          onGenerate={handleGenerate}
          loading={loading}
        />
      )}
    </div>
  );
}
