import { useTranslations, useLocale } from 'next-intl';
import { Check } from 'lucide-react';

type LearningOutcomesProps = {
  outcomesEn: string[] | null;
  outcomesJp: string[] | null;
};

export function LearningOutcomes({
  outcomesEn,
  outcomesJp,
}: LearningOutcomesProps) {
  const t = useTranslations('learn');
  const locale = useLocale();

  const outcomes =
    locale === 'ja' && outcomesJp?.length ? outcomesJp : outcomesEn;

  if (!outcomes?.length) return null;

  return (
    <div>
      <h2 className="text-xl font-serif text-fg-primary mb-4">
        {t('what_youll_master')}
      </h2>
      <ul className="space-y-3">
        {outcomes.map((outcome, i) => (
          <li key={i} className="flex gap-3">
            <Check
              size={20}
              className="shrink-0 mt-0.5 text-accent-teal"
            />
            <span className="text-fg-secondary">{outcome}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
