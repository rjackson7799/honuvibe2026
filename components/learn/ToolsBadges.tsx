import { useTranslations } from 'next-intl';
import { BadgePill } from '@/components/ui/badge-pill';
import { SectionHeading } from '@/components/marketing/primitives/section-heading';

type ToolsBadgesProps = {
  tools: string[] | null;
};

export function ToolsBadges({ tools }: ToolsBadgesProps) {
  const t = useTranslations('learn');

  if (!tools?.length) return null;

  return (
    <div>
      <SectionHeading size="h3" className="mb-4">
        {t('tools_youll_learn')}
      </SectionHeading>
      <div className="flex flex-wrap gap-2">
        {tools.map((tool) => (
          <BadgePill key={tool} variant="gray" size="md">
            {tool}
          </BadgePill>
        ))}
      </div>
    </div>
  );
}
