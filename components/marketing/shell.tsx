import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MarketingShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Wraps every public marketing page. Applies the [data-shell="marketing"]
 * scope so the --m-* token set in styles/globals.css activates Inter
 * typography, the cream canvas, and navy ink. ConditionalMain in
 * components/layout/conditional-nav.tsx skips its dark-Nav padding on
 * marketing routes, so this wrapper no longer needs a negative-margin hack.
 */
export function MarketingShell({ children, className }: MarketingShellProps) {
  return (
    <div data-shell="marketing" className={cn('min-h-screen', className)}>
      {children}
    </div>
  );
}
