import { useTranslations } from 'next-intl';
import { Video, Play, Pencil, Users, FileText } from 'lucide-react';
import { SectionHeading } from '@/components/marketing/primitives/section-heading';

type HowItWorksProps = {
  communityMonths?: number | null;
  isRecordedOnly?: boolean;
};

export function HowItWorks({
  communityMonths,
  isRecordedOnly = false,
}: HowItWorksProps) {
  const t = useTranslations('learn');

  const step1 = isRecordedOnly
    ? { icon: Play, label: t('how_step_1_recorded') }
    : { icon: Video, label: t('how_step_1') };

  const step2 = isRecordedOnly
    ? { icon: FileText, label: t('how_step_2_recorded') }
    : { icon: Play, label: t('how_step_2') };

  const steps = [
    step1,
    step2,
    { icon: Pencil, label: t('how_step_3') },
    {
      icon: Users,
      label: t('how_step_4', { months: communityMonths ?? 3 }),
    },
  ];

  return (
    <div>
      <SectionHeading size="h2" className="mb-8">
        {t('how_it_works')}
      </SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex flex-col items-center text-center p-6 bg-[var(--m-white)] rounded-[var(--m-radius-lg)] border border-[var(--m-border-default)] shadow-[var(--m-shadow-xs)]"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--m-accent-teal-soft)] flex items-center justify-center mb-4">
              <step.icon size={22} className="text-[var(--m-accent-teal)]" />
            </div>
            <span className="text-sm text-[var(--m-ink-secondary)] leading-snug">
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
