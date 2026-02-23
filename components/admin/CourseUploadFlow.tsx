'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CourseUploader } from './CourseUploader';
import { ParsePreview } from './ParsePreview';
import type { ParsedCourseData } from '@/lib/courses/types';

type Step = 'upload' | 'preview' | 'done';

export function CourseUploadFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState<ParsedCourseData | null>(null);
  const [uploadId, setUploadId] = useState('');

  async function handleParse(markdown: string, filename: string) {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/courses/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, filename }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Parsing failed');
      }

      const data = await res.json();
      setParsedData(data.parsedData);
      setUploadId(data.uploadId);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parsing failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(startDate: string) {
    if (!parsedData || !uploadId) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/courses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parsedData,
          uploadId,
          startDate: startDate || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Course creation failed');
      }

      const data = await res.json();
      setStep('done');

      // Redirect to new course detail after short delay
      setTimeout(() => {
        router.push(`/admin/courses/${data.courseId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Course creation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['Upload', 'Preview', 'Confirm'] as const).map((label, i) => {
          const stepIndex = i;
          const currentIndex = step === 'upload' ? 0 : step === 'preview' ? 1 : 2;
          const isActive = stepIndex === currentIndex;
          const isComplete = stepIndex < currentIndex;

          return (
            <div key={label} className="flex items-center gap-2">
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
                  {isComplete ? '✓' : i + 1}
                </span>
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Steps */}
      {step === 'upload' && (
        <CourseUploader onParse={handleParse} loading={loading} />
      )}

      {step === 'preview' && parsedData && (
        <ParsePreview
          parsedData={parsedData}
          onConfirm={handleConfirm}
          onBack={() => setStep('upload')}
          loading={loading}
        />
      )}

      {step === 'done' && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-xl font-serif text-fg-primary mb-2">Course Created!</h2>
          <p className="text-sm text-fg-tertiary">
            Redirecting to course detail...
          </p>
        </div>
      )}
    </div>
  );
}
