type BadgeVariant = 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';

const variantClasses: Record<BadgeVariant, string> = {
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
};

const tierVariants: Record<string, BadgeVariant> = {
  none: 'gray',
  silver: 'gray',
  gold: 'yellow',
  platinum: 'purple',
  '100k': 'purple',
};

const statusVariants: Record<string, BadgeVariant> = {
  planned: 'blue',
  completed: 'green',
  cancelled: 'red',
  pending_credit: 'yellow',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  tier?: string;
  status?: string;
}

export default function Badge({ children, variant, tier, status }: BadgeProps) {
  const resolved = variant || (tier && tierVariants[tier]) || (status && statusVariants[status]) || 'gray';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[resolved]}`}
    >
      {children}
    </span>
  );
}
