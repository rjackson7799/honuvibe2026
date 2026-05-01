import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: 'default' | 'learn';
  accent?: 'teal' | 'coral';
  className?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  accent = 'teal',
  className,
}: StatCardProps) {
  if (variant === 'learn') {
    const accentBg =
      accent === 'coral' ? 'bg-[color:var(--accent-coral-subtle)]' : 'bg-[color:var(--accent-teal-subtle)]';
    const accentFg =
      accent === 'coral' ? 'text-[color:var(--accent-coral)]' : 'text-[color:var(--accent-teal)]';

    return (
      <div
        className={cn(
          'bg-bg-secondary border border-border-default rounded-[14px] px-5 py-5 flex flex-col gap-2.5 shadow-[var(--shadow-md)]',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12px] font-semibold tracking-[0.03em] text-fg-tertiary uppercase">
            {label}
          </p>
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', accentBg, accentFg)}>
            <Icon size={16} />
          </div>
        </div>
        <p className="text-[34px] font-bold text-fg-primary tracking-[-0.03em] leading-none">
          {value}
        </p>
        {trend && (
          <span className="text-xs text-[color:var(--accent-teal)] font-medium">{trend}</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('bg-bg-secondary border border-border-default rounded-lg p-5 space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-fg-tertiary">{label}</span>
        <Icon size={18} className="text-fg-tertiary" />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold text-fg-primary">{value}</span>
        {trend && (
          <span className="text-xs text-accent-teal mb-1">{trend}</span>
        )}
      </div>
    </div>
  );
}
