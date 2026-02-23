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
}: StickyEnrollBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-bg-primary border-t border-border-default px-4 py-3 md:hidden safe-area-bottom">
      <p className="text-xs font-serif text-fg-primary truncate mb-1.5 max-w-lg mx-auto">
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
          size="sm"
        />
      </div>
    </div>
  );
}
