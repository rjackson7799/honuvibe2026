'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { HonuMark } from '@/components/ocean/honu-mark';

export function PathGenerating() {
  const t = useTranslations('study_paths');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progress over ~12 seconds
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        // Start fast, slow down
        const increment = prev < 50 ? 4 : prev < 75 ? 2 : 1;
        return Math.min(prev + increment, 90);
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <div className="animate-pulse">
        <HonuMark size={64} />
      </div>

      <div className="text-center space-y-2">
        <h2 className="font-display text-xl text-fg-primary">
          {t('generating_title')}
        </h2>
        <p className="text-sm text-fg-secondary max-w-md">
          {t('generating_subtitle')}
        </p>
      </div>

      <div className="w-full max-w-xs">
        <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
          <div
            className="h-full rounded-full bg-accent-teal transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-fg-muted">{t('generating_time')}</p>
    </div>
  );
}
