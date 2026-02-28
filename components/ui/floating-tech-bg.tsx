'use client';

import { FloatingIcons } from './floating-icons';
import { techItems, renderTechIcon } from '@/lib/tech-items';

const techLabels: Record<string, string> = {
  nextjs: 'Next.js',
  react: 'React',
  typescript: 'TypeScript',
  tailwind: 'Tailwind CSS',
  supabase: 'Supabase',
  stripe: 'Stripe',
  openai: 'OpenAI',
  nodejs: 'Node.js',
  vercel: 'Vercel',
  figma: 'Figma',
  claude: 'Claude AI',
  cursor: 'Cursor',
  lovable: 'Lovable',
};

type FloatingTechBgProps = {
  iconSize?: number;
  className?: string;
};

export function FloatingTechBg({ iconSize = 44, className }: FloatingTechBgProps) {
  const items = techItems.map(({ key, color }) => ({
    key,
    color,
    label: techLabels[key] ?? key,
    icon: renderTechIcon(key, iconSize),
  }));

  return (
    <FloatingIcons
      items={items}
      iconSize={iconSize}
      className={className}
    />
  );
}
