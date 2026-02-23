'use client';

import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { PriceDisplay } from './PriceDisplay';
import { EnrollButton } from './EnrollButton';
import { AvailabilityBadge } from './AvailabilityBadge';

type StickyEnrollSidebarProps = {
  title: string;
  courseId: string;
  courseSlug: string;
  priceUsd: number | null;
  priceJpy: number | null;
  startDate: string | null;
  currentEnrollment: number;
  maxEnrollment: number | null;
  status: string;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  thumbnailUrl?: string | null;
};

export function StickyEnrollSidebar({
  title,
  courseId,
  courseSlug,
  priceUsd,
  priceJpy,
  startDate,
  currentEnrollment,
  maxEnrollment,
  status,
  isLoggedIn,
  isEnrolled,
  thumbnailUrl,
}: StickyEnrollSidebarProps) {
  const t = useTranslations('learn');
  const locale = useLocale();

  const isFull =
    !!maxEnrollment && currentEnrollment >= maxEnrollment;

  const startDateFormatted = startDate
    ? new Date(startDate).toLocaleDateString(
        locale === 'ja' ? 'ja-JP' : 'en-US',
        { month: 'long', day: 'numeric', year: 'numeric' },
      )
    : null;

  return (
    <div className="hidden md:block sticky top-24 w-72 shrink-0">
      <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden shadow-lg shadow-black/20 ring-1 ring-white/5">
        {thumbnailUrl && (
          <div className="aspect-[16/9] bg-bg-tertiary overflow-hidden">
            <Image
              src={thumbnailUrl}
              alt=""
              width={288}
              height={162}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-6 space-y-4">
        <h3 className="text-lg font-serif text-fg-primary leading-snug">
          {title}
        </h3>

        <PriceDisplay
          priceUsd={priceUsd}
          priceJpy={priceJpy}
          size="lg"
        />

        {startDateFormatted && (
          <p className="text-sm text-fg-secondary">
            {t('starts', { date: startDateFormatted })}
          </p>
        )}

        <AvailabilityBadge
          currentEnrollment={currentEnrollment}
          maxEnrollment={maxEnrollment}
          status={status}
        />

        <EnrollButton
          courseId={courseId}
          courseSlug={courseSlug}
          isLoggedIn={isLoggedIn}
          isEnrolled={isEnrolled}
          isFull={isFull}
          fullWidth
        />

        <a
          href="/contact"
          className="block text-sm text-center text-fg-tertiary hover:text-accent-teal transition-colors"
        >
          {t('cancellation_policy')} →
        </a>
        </div>
      </div>
    </div>
  );
}
