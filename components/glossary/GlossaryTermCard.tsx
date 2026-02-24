import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { DifficultyBadge } from './DifficultyBadge';
import type { GlossaryDifficulty } from '@/lib/sanity/types';

type GlossaryTermCardProps = {
  term_en: string;
  term_jp?: string;
  abbreviation?: string;
  slug: { current: string };
  definition_short: string;
  difficulty: GlossaryDifficulty;
  difficultyLabel: string;
  locale: string;
};

export function GlossaryTermCard({
  term_en,
  term_jp,
  abbreviation,
  slug,
  definition_short,
  difficulty,
  difficultyLabel,
}: GlossaryTermCardProps) {
  return (
    <Link
      href={`/glossary/${slug.current}`}
      className={cn(
        'group flex items-start justify-between gap-4 py-4',
        'border-b border-border-secondary',
        'transition-colors duration-[var(--duration-fast)]',
        'hover:bg-bg-tertiary px-2 -mx-2 rounded',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-sans text-base font-medium text-fg-primary">
            {abbreviation || term_en}
          </span>
          {abbreviation && (
            <span className="text-sm text-fg-tertiary">{term_en}</span>
          )}
        </div>
        {term_jp && (
          <p className="text-sm text-fg-tertiary mt-0.5">{term_jp}</p>
        )}
        <p className="text-sm text-fg-secondary mt-1 line-clamp-2 md:line-clamp-1">
          {definition_short}
        </p>
      </div>

      <div className="shrink-0 mt-0.5 hidden md:block">
        <DifficultyBadge difficulty={difficulty} label={difficultyLabel} />
      </div>
      <div className="shrink-0 mt-1 md:hidden">
        <DifficultyBadge difficulty={difficulty} label={difficultyLabel} />
      </div>
    </Link>
  );
}
