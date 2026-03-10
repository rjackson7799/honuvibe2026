'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { PathIntakeForm } from '@/components/learn/PathIntakeForm';
import { PathGenerating } from '@/components/learn/PathGenerating';
import { PathPreview } from '@/components/learn/PathPreview';
import type { PathIntakeInput, StudyPathWithItems } from '@/lib/paths/types';

type FlowState = 'intake' | 'generating' | 'preview' | 'error';

type PathIntakeFlowProps = {
  tags: { slug: string; name_en: string; name_jp?: string | null }[];
  userTier: 'free' | 'premium';
};

export function PathIntakeFlow({ tags, userTier }: PathIntakeFlowProps) {
  const router = useRouter();
  const locale = useLocale();
  const prefix = locale === 'ja' ? '/ja' : '';

  const [state, setState] = useState<FlowState>('intake');
  const [generatedPath, setGeneratedPath] = useState<StudyPathWithItems | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  async function handleSubmit(input: PathIntakeInput) {
    setState('generating');
    setError(null);

    try {
      const response = await fetch('/api/learn/paths/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to generate path');
      }

      setGeneratedPath(data.path);
      setState('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setState('error');
    }
  }

  function handleStartLearning() {
    if (generatedPath) {
      router.push(`${prefix}/learn/paths/${generatedPath.id}`);
    }
  }

  async function handleRegenerate(feedback: string) {
    if (!generatedPath) return;

    setIsRegenerating(true);
    try {
      const response = await fetch(
        `/api/learn/paths/${generatedPath.id}/regenerate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to regenerate path');
      }

      setGeneratedPath(data.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      setIsRegenerating(false);
    }
  }

  if (state === 'generating') {
    return <PathGenerating />;
  }

  if (state === 'preview' && generatedPath) {
    return (
      <PathPreview
        path={generatedPath}
        onStartLearning={handleStartLearning}
        onRegenerate={handleRegenerate}
        isRegenerating={isRegenerating}
      />
    );
  }

  if (state === 'error') {
    return (
      <div className="text-center space-y-4 py-8">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => setState('intake')}
          className="text-sm text-accent-teal hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <PathIntakeForm
      tags={tags}
      onSubmit={handleSubmit}
      isSubmitting={false}
      userTier={userTier}
    />
  );
}
