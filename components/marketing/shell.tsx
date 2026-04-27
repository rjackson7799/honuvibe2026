import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MarketingShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Wraps every public marketing page. Applies the [data-shell="marketing"]
 * scope so the --m-* token set in styles/globals.css activates Inter
 * typography, the cream canvas, and navy ink.
 *
 * Compensates for the locale layout's <main className="pt-14 md:pt-16">
 * which exists to clear the dark-themed fixed Nav. On marketing routes the
 * dark Nav is null (see components/layout/nav-client.tsx) so we negate that
 * padding here. The MarketingNav is fixed h-[68px] and each marketing page's
 * first section accounts for that with its own padding-top.
 */
export function MarketingShell({ children, className }: MarketingShellProps) {
  return (
    <div
      data-shell="marketing"
      className={cn('-mt-14 md:-mt-16 min-h-screen', className)}
    >
      {children}
    </div>
  );
}
