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
        'group flex items-start justify-between gap-3 sm:gap-4 px-4 py-4 -mx-4',
        'border-b border-[var(--m-border-soft)]',
        'transition-colors duration-150',
        'hover:bg-[var(--m-white)] hover:rounded-[var(--m-radius-md)]',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[16px] font-semibold text-[var(--m-ink-primary)]">
            {abbreviation || term_en}
          </span>
          {abbreviation && (
            <span className="text-[14px] text-[var(--m-ink-tertiary)]">{term_en}</span>
          )}
        </div>
        {term_jp && (
          <p className="text-[13px] text-[var(--m-ink-tertiary)] mt-0.5">{term_jp}</p>
        )}
        <p className="text-[14px] text-[var(--m-ink-secondary)] leading-[1.55] mt-1 line-clamp-2 md:line-clamp-1">
          {definition_short}
        </p>
      </div>

      <div className="shrink-0 mt-0.5">
        <DifficultyBadge difficulty={difficulty} label={difficultyLabel} />
      </div>
    </Link>
  );
}
