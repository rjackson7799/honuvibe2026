import { Tag } from '@/components/ui/tag';
import type { GlossaryDifficulty } from '@/lib/sanity/types';

type DifficultyBadgeProps = {
  difficulty: GlossaryDifficulty;
  label: string;
};

const difficultyColors: Record<GlossaryDifficulty, string | undefined> = {
  beginner: 'var(--accent-teal)',
  intermediate: 'var(--accent-gold)',
  advanced: undefined,
};

export function DifficultyBadge({ difficulty, label }: DifficultyBadgeProps) {
  return <Tag color={difficultyColors[difficulty]}>{label}</Tag>;
}
