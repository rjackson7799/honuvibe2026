'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

type GlossaryTermAnalyticsProps = {
  slug: string;
  category: string;
  difficulty: string;
  locale: string;
};

export function GlossaryTermAnalytics({ slug, category, difficulty, locale }: GlossaryTermAnalyticsProps) {
  useEffect(() => {
    trackEvent('glossary_term_view', {
      term_slug: slug,
      category,
      difficulty,
      locale,
    });
  }, [slug, category, difficulty, locale]);

  return null;
}
