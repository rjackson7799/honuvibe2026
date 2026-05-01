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
  freePreviewCount?: number;
  isRecordedOnly?: boolean;
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
  freePreviewCount = 0,
  isRecordedOnly = false,
}: StickyEnrollSidebarProps) {
  const t = useTranslations('learn');
  const locale = useLocale();

  const isFull =
    !!maxEnrollment && currentEnrollment >= maxEnrollment;

  const isInProgress =
    (startDate ? new Date(startDate) <= new Date() : false) ||
    status === 'in-progress';

  const startDateFormatted = startDate
    ? new Date(startDate).toLocaleDateString(
        locale === 'ja' ? 'ja-JP' : 'en-US',
        { month: 'long', day: 'numeric', year: 'numeric' },
      )
    : null;

  return (
    <div className="hidden md:block sticky top-8 w-72 shrink-0 self-start">
      <div className="bg-bg-secondary border border-border-default rounded-2xl overflow-hidden shadow-[var(--shadow-lg)]">
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
          <h3 className="text-[17px] font-bold text-fg-primary tracking-[-0.015em] leading-snug">
            {title}
          </h3>

          <PriceDisplay priceUsd={priceUsd} priceJpy={priceJpy} size="lg" />

          {freePreviewCount > 0 && !isEnrolled && (
            <p className="text-sm font-semibold text-[color:var(--accent-teal)]">
              {t('freemium.firstNFree', { count: freePreviewCount })}
            </p>
          )}

          {startDateFormatted && !isRecordedOnly && (
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
            isInProgress={isInProgress}
            priceUsd={priceUsd}
            priceJpy={priceJpy}
            fullWidth
          />

          <a
            href="/contact"
            className="block text-sm text-center text-fg-tertiary hover:text-[color:var(--accent-teal)] transition-colors"
          >
            {t('cancellation_policy')} →
          </a>
        </div>
      </div>
    </div>
  );
}
