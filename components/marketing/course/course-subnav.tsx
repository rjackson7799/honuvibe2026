import { useTranslations } from 'next-intl';
import { HvContainer } from '@/components/marketing/hv';

type CourseSubnavProps = { sections: { id: string; label: string }[] };

/**
 * Design 03 sticky sub-nav (:83-91). Lists only the sections that rendered;
 * hidden below three (a two-link sub-nav is noise). Sticks under the fixed
 * header, which itself sits under the event strip.
 */
export function CourseSubnav({ sections }: CourseSubnavProps) {
  const t = useTranslations('course_detail.subnav');
  if (sections.length < 3) return null;

  return (
    <nav
      aria-label={t('label')}
      className="sticky top-[calc(var(--m-strip-h)+68px)] z-[190] border-b border-hv-sand-300 bg-hv-sand-100"
    >
      <HvContainer className="flex gap-[26px] overflow-x-auto">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="inline-flex min-h-[52px] flex-none items-center border-b-2 border-transparent text-[15px] font-semibold text-hv-ink-700 transition-colors hover:border-hv-amber hover:text-hv-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber"
          >
            {s.label}
          </a>
        ))}
      </HvContainer>
    </nav>
  );
}
