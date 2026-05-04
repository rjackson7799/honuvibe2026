'use client';

import { PriceDisplay } from './PriceDisplay';
import { EnrollButton } from './EnrollButton';

type StickyEnrollBarProps = {
  title: string;
  courseId: string;
  courseSlug: string;
  priceUsd: number | null;
  priceJpy: number | null;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  isFull: boolean;
  isInProgress: boolean;
};

export function StickyEnrollBar({
  title,
  courseId,
  courseSlug,
  priceUsd,
  priceJpy,
  isLoggedIn,
  isEnrolled,
  isFull,
  isInProgress,
}: StickyEnrollBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--m-border-default)] px-4 py-3 md:hidden safe-area-bottom backdrop-blur-md"
      style={{ background: 'rgba(253, 251, 247, 0.94)' }}
    >
      <p className="text-[12px] font-semibold text-[var(--m-ink-secondary)] truncate mb-1 max-w-lg mx-auto">
        {title}
      </p>
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        <PriceDisplay priceUsd={priceUsd} priceJpy={priceJpy} size="md" />
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
          size="sm"
        />
      </div>
    </div>
  );
}
