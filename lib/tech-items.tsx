import { TechIcon } from '@/components/sections/exploration/tech-icon';
import type { ReactNode } from 'react';

export type TechItem = {
  key: string;
  label: string;
  color: string;
  tier: 'featured' | 'ai' | 'infra';
};

export const techItems: TechItem[] = [
  // Featured
  { key: 'claude', label: 'Claude by Anthropic', color: 'var(--accent-gold)', tier: 'featured' },
  // AI & Development
  { key: 'cursor', label: 'Cursor', color: 'var(--accent-teal)', tier: 'ai' },
  { key: 'openai', label: 'OpenAI', color: 'var(--fg-primary)', tier: 'ai' },
  { key: 'lovable', label: 'Lovable', color: 'var(--territory-auto)', tier: 'ai' },
  // Framework & Infrastructure
  { key: 'nextjs', label: 'Next.js', color: 'var(--fg-primary)', tier: 'infra' },
  { key: 'react', label: 'React', color: 'var(--accent-teal)', tier: 'infra' },
  { key: 'typescript', label: 'TypeScript', color: 'var(--territory-db)', tier: 'infra' },
  { key: 'tailwind', label: 'Tailwind CSS', color: 'var(--accent-teal)', tier: 'infra' },
  { key: 'supabase', label: 'Supabase', color: 'var(--territory-pro)', tier: 'infra' },
  { key: 'stripe', label: 'Stripe', color: 'var(--territory-auto)', tier: 'infra' },
  { key: 'nodejs', label: 'Node.js', color: 'var(--territory-pro)', tier: 'infra' },
  { key: 'vercel', label: 'Vercel', color: 'var(--fg-primary)', tier: 'infra' },
  { key: 'figma', label: 'Figma', color: 'var(--territory-auto)', tier: 'infra' },
];

export function renderTechIcon(key: string, size: number): ReactNode {
  return <TechIcon name={key} size={size} />;
}
