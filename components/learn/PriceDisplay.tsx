import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

type PriceDisplayProps = {
  priceUsd: number | null;
  priceJpy: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US')}`;
}

function formatJpy(yen: number): string {
  return `¥${yen.toLocaleString('ja-JP')}`;
}

export function PriceDisplay({
  priceUsd,
  priceJpy,
  className,
  size = 'md',
}: PriceDisplayProps) {
  const locale = useLocale();

  const sizeStyles = {
    sm: 'text-sm',
    md: 'text-lg font-medium',
    lg: 'text-2xl font-semibold',
  };

  const primaryPrice =
    locale === 'ja' && priceJpy
      ? formatJpy(priceJpy)
      : priceUsd
        ? formatUsd(priceUsd)
        : null;

  const secondaryPrice =
    locale === 'ja' && priceUsd
      ? formatUsd(priceUsd)
      : priceJpy
        ? formatJpy(priceJpy)
        : null;

  if (!primaryPrice) return null;

  return (
    <div className={cn('text-fg-primary', sizeStyles[size], className)}>
      <span>{primaryPrice}</span>
      {secondaryPrice && (
        <span className="text-fg-tertiary text-sm ml-2">
          / {secondaryPrice}
        </span>
      )}
    </div>
  );
}
