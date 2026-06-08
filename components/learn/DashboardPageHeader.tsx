import type { LucideIcon } from 'lucide-react';
import { BadgePill } from '@/components/ui/badge-pill';

/**
 * Canonical learner-dashboard page header: a teal icon badge + title, with an
 * optional count pill and subtitle. Use the SAME icon as the page's sidebar nav
 * entry. `count` is a pre-formatted string (each page formats its own).
 */
export function DashboardPageHeader({
  icon: Icon,
  title,
  subtitle,
  count,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  count?: string;
}) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <div className="w-10 h-10 rounded-[10px] bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)] flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h1 className="text-[clamp(20px,2.4vw,24px)] font-bold text-fg-primary tracking-[-0.02em]">
            {title}
          </h1>
          {count ? (
            <BadgePill variant="teal" size="sm">
              {count}
            </BadgePill>
          ) : null}
        </div>
        {subtitle ? <p className="text-[14px] text-fg-tertiary">{subtitle}</p> : null}
      </div>
    </div>
  );
}
