import { Check } from 'lucide-react';

export function ViewedBadge({ label = 'Watched' }: { label?: string }) {
  return (
    <div
      className="absolute bottom-2 right-2 bg-accent-teal rounded-full w-6 h-6 flex items-center justify-center"
      aria-label={label}
    >
      <Check size={14} className="text-white" />
    </div>
  );
}
