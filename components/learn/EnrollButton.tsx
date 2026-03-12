'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { simulatedEnroll } from '@/lib/enrollments/actions';

type EnrollButtonProps = {
  courseId: string;
  courseSlug: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  isFull: boolean;
  priceUsd?: number | null;
  priceJpy?: number | null;
  variant?: 'primary' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
};

export function EnrollButton({
  courseId,
  courseSlug,
  isLoggedIn,
  isEnrolled,
  isFull,
  priceUsd,
  priceJpy,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: EnrollButtonProps) {
  const t = useTranslations('learn');
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if this is a paid course based on locale
  const isPaid =
    locale === 'ja'
      ? priceJpy != null && priceJpy > 0
      : priceUsd != null && priceUsd > 0;

  if (isEnrolled) {
    const prefix = locale === 'ja' ? '/ja' : '';
    return (
      <Button
        variant="primary"
        size={size}
        fullWidth={fullWidth}
        onClick={() => router.push(`${prefix}/learn/dashboard/${courseSlug}`)}
      >
        {t('continue')}
      </Button>
    );
  }

  if (isFull) {
    return (
      <Button variant="gold" size={size} fullWidth={fullWidth} disabled>
        {t('cohort_full')}
      </Button>
    );
  }

  async function handleEnroll() {
    if (!isLoggedIn) {
      const prefix = locale === 'ja' ? '/ja' : '';
      router.push(
        `${prefix}/learn/auth?redirect=${encodeURIComponent(`${prefix}/learn/${courseSlug}`)}`,
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const prefix = locale === 'ja' ? '/ja' : '';
      if (isPaid) {
        // Paid course: navigate to embedded checkout page
        router.push(`${prefix}/learn/${courseSlug}/checkout`);
        return;
      } else {
        // Free course: direct enrollment
        const result = await simulatedEnroll(courseId, locale);
        if (result.success) {
          router.push(
            `${prefix}/learn/dashboard/${courseSlug}?enrolled=true`,
          );
          router.refresh();
        }
      }
    } catch (err) {
      console.error('Enrollment failed:', err);
      setError(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        onClick={handleEnroll}
        disabled={loading}
      >
        {loading ? '...' : t('enroll_now')}
      </Button>
      {error && (
        <p className="text-sm text-red-400 mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
