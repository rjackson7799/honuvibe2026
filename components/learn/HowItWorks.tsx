import { useTranslations } from 'next-intl';
import { Video, Play, Pencil, Users } from 'lucide-react';

type HowItWorksProps = {
  communityMonths?: number | null;
};

export function HowItWorks({ communityMonths }: HowItWorksProps) {
  const t = useTranslations('learn');

  const steps = [
    { icon: Video, label: t('how_step_1') },
    { icon: Play, label: t('how_step_2') },
    { icon: Pencil, label: t('how_step_3') },
    {
      icon: Users,
      label: t('how_step_4', { months: communityMonths ?? 3 }),
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-serif text-fg-primary mb-6">
        {t('how_it_works')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex flex-col items-center text-center p-4 bg-bg-secondary rounded border border-border-default"
          >
            <div className="w-10 h-10 rounded-full bg-accent-teal/10 flex items-center justify-center mb-3">
              <step.icon size={20} className="text-accent-teal" />
            </div>
            <span className="text-sm text-fg-secondary leading-snug">
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
