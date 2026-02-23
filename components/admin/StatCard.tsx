import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
};

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
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
