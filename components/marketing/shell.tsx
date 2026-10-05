import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type MarketingShellTheme = 'marketing' | 'hv';

type MarketingShellProps = {
  children: ReactNode;
  /**
   * 'marketing' (default) = the legacy light shell (--m-* tokens, Inter).
   * 'hv' = the 2026 green design system (--hv-* tokens, Space Grotesk +
   * Public Sans; docs/design_2026_green/README.md). Pages switch to 'hv' as
   * each redesign unit lands; the default flips once every marketing page
   * has moved.
   */
  theme?: MarketingShellTheme;
  className?: string;
};

/**
 * Wraps every public marketing page. Applies the [data-shell] scope so the
 * matching token set in styles/globals.css activates. ConditionalMain in
 * components/layout/conditional-nav.tsx skips its dark-Nav padding on
 * marketing routes, so this wrapper no longer needs a negative-margin hack.
 */
export function MarketingShell({ children, theme = 'marketing', className }: MarketingShellProps) {
  return (
    <div
      data-shell={theme}
      className={cn('min-h-screen pt-[var(--m-strip-h)]', className)}
    >
      {children}
    </div>
  );
}
