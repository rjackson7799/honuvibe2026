'use client';

import { useState } from 'react';
// next/navigation, not next-intl's router: the push below already carries the
// /ja prefix (next-intl's router would make /ja/ja/…).
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { HvButton, type HvButtonSize } from '@/components/marketing/hv/button';
import { simulatedEnroll } from '@/lib/enrollments/actions';
import { trackCourseEnrollCtaClick, trackCourseJoinVaultClick } from '@/lib/analytics';
import type { CourseCta } from '@/lib/learn/course-cta';
import { cn } from '@/lib/utils';

type CourseCtaButtonProps = {
  cta: CourseCta;
  label: string;
  courseId: string;
  slug: string;
  size?: HvButtonSize;
  /** amber = primary on dark/sand bands; dark = green-900 fill inside the price card. */
  tone?: 'amber' | 'dark';
  /** Background the button sits on, for the error text colour (AA on both). */
  surface?: 'dark' | 'light';
  className?: string;
};

/**
 * The course page's one CTA island. Every row with an href is a link (page
 * hrefs through next-intl's Link, /api/ and #anchors as plain <a> via
 * HvButton). Only a signed-in free enroll (href null) is a button: it calls
 * the 072 RPC through simulatedEnroll, then opens the course hub.
 */
export function CourseCtaButton({
  cta,
  label,
  courseId,
  slug,
  size = 'md',
  tone = 'amber',
  surface = 'light',
  className,
}: CourseCtaButtonProps) {
  const locale = useLocale();
  const t = useTranslations('course_detail.cta');
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const variant = tone === 'dark' ? 'dark' : 'amber';

  function track() {
    if (cta.kind === 'join_vault') {
      trackCourseJoinVaultClick({ course_slug: slug, locale });
    } else if (cta.kind === 'buy' || cta.kind === 'enroll_free') {
      trackCourseEnrollCtaClick({ course_slug: slug, is_paid: cta.kind === 'buy', locale });
    }
  }

  if (cta.href) {
    return (
      <HvButton href={cta.href} variant={variant} size={size} className={className} onClick={track}>
        {label}
      </HvButton>
    );
  }

  async function enroll() {
    if (pending) return;
    track();
    setPending(true);
    setFailed(false);
    try {
      const result = await simulatedEnroll(courseId, locale);
      if (result?.success) {
        const prefix = locale === 'ja' ? '/ja' : '';
        router.push(`${prefix}/learn/dashboard/${slug}?enrolled=true`);
        router.refresh();
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <HvButton variant={variant} size={size} onClick={enroll} disabled={pending} aria-busy={pending}>
        {pending ? t('enrolling') : label}
      </HvButton>
      {failed && (
        <p
          role="alert"
          className={cn(
            'text-[14px] font-medium leading-[1.45]',
            surface === 'dark' ? 'text-hv-amber' : 'text-hv-terracotta-dark',
          )}
        >
          {t('enroll_error')}
        </p>
      )}
    </div>
  );
}
