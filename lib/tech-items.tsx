import { TechIcon } from '@/components/sections/exploration/tech-icon';
import type { ReactNode } from 'react';

export type TechItem = {
  key: string;
  color: string;
};

export const techItems: TechItem[] = [
  { key: 'nextjs', color: 'var(--fg-primary)' },
  { key: 'react', color: 'var(--accent-teal)' },
  { key: 'typescript', color: 'var(--territory-db)' },
  { key: 'tailwind', color: 'var(--accent-teal)' },
  { key: 'supabase', color: 'var(--territory-pro)' },
  { key: 'stripe', color: 'var(--territory-auto)' },
  { key: 'openai', color: 'var(--fg-primary)' },
  { key: 'nodejs', color: 'var(--territory-pro)' },
  { key: 'vercel', color: 'var(--fg-primary)' },
  { key: 'figma', color: 'var(--territory-auto)' },
  { key: 'claude', color: 'var(--accent-gold)' },
  { key: 'cursor', color: 'var(--accent-teal)' },
  { key: 'lovable', color: 'var(--territory-auto)' },
];

export function renderTechIcon(key: string, size: number): ReactNode {
  return <TechIcon name={key} size={size} />;
}
