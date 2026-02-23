'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { simulatedEnroll } from '@/lib/enrollments/actions';

type EnrollButtonProps = {
  courseId: string;
  courseSlug: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  isFull: boolean;
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
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: EnrollButtonProps) {
  const t = useTranslations('learn');
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
    try {
      const result = await simulatedEnroll(courseId, locale);
      if (result.success) {
        const prefix = locale === 'ja' ? '/ja' : '';
        router.push(
          `${prefix}/learn/dashboard/${courseSlug}?enrolled=true`,
        );
        router.refresh();
      }
    } catch (err) {
      console.error('Enrollment failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      onClick={handleEnroll}
      disabled={loading}
    >
      {loading ? '...' : t('enroll_now')}
    </Button>
  );
}
