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

const thumbGradients = [
  'linear-gradient(135deg, #ddeedd 0%, #c8dcc8 100%)',
  'linear-gradient(135deg, #dde8e8 0%, #c4d4d4 100%)',
  'linear-gradient(135deg, #e8dde4 0%, #d4c4cc 100%)',
  'linear-gradient(135deg, #ede8dc 0%, #d8cdb8 100%)',
  'linear-gradient(135deg, #dde0ee 0%, #c4c8d8 100%)',
];

function gradientFor(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  return thumbGradients[Math.abs(hash) % thumbGradients.length];
}

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
    <aside className="hidden md:block sticky top-8 w-72 shrink-0 self-start">
      <div className="bg-[var(--m-white)] border border-[var(--m-border-default)] rounded-[var(--m-radius-lg)] overflow-hidden shadow-[var(--m-shadow-md)]">
        <div
          className="aspect-[16/9] overflow-hidden"
          style={!thumbnailUrl ? { background: gradientFor(courseSlug) } : undefined}
        >
          {thumbnailUrl && (
            <Image
              src={thumbnailUrl}
              alt=""
              width={288}
              height={162}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="p-6 space-y-4">
          <h3 className="text-[17px] font-bold text-[var(--m-ink-primary)] tracking-[-0.015em] leading-snug">
            {title}
          </h3>

          <PriceDisplay priceUsd={priceUsd} priceJpy={priceJpy} size="lg" />

          {freePreviewCount > 0 && !isEnrolled && (
            <p className="text-sm font-semibold text-[var(--m-accent-teal)]">
              {t('freemium.firstNFree', { count: freePreviewCount })}
            </p>
          )}

          {startDateFormatted && !isRecordedOnly && (
            <p className="text-sm text-[var(--m-ink-secondary)]">
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
            variant="primary"
            fullWidth
          />

          <a
            href="/contact"
            className="block text-sm text-center text-[var(--m-ink-tertiary)] hover:text-[var(--m-accent-teal)] transition-colors"
          >
            {t('cancellation_policy')} →
          </a>
        </div>
      </div>
    </aside>
  );
}
