import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { SectionHeading } from '@/components/marketing/primitives/section-heading';

type LearningOutcomesProps = {
  outcomes: string[] | null;
};

export function LearningOutcomes({ outcomes }: LearningOutcomesProps) {
  const t = useTranslations('learn');

  if (!outcomes?.length) return null;

  return (
    <div>
      <SectionHeading size="h3" className="mb-5">
        {t('what_youll_master')}
      </SectionHeading>
      <ul className="space-y-3">
        {outcomes.map((outcome, i) => (
          <li key={i} className="flex gap-3">
            <Check
              size={20}
              className="shrink-0 mt-0.5 text-[var(--m-accent-teal)]"
            />
            <span className="text-[var(--m-ink-secondary)]">{outcome}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
