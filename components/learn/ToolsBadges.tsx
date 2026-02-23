import { useTranslations } from 'next-intl';

type ToolsBadgesProps = {
  tools: string[] | null;
};

export function ToolsBadges({ tools }: ToolsBadgesProps) {
  const t = useTranslations('learn');

  if (!tools?.length) return null;

  return (
    <div>
      <h2 className="text-xl font-serif text-fg-primary mb-4">
        {t('tools_youll_learn')}
      </h2>
      <div className="flex flex-wrap gap-2">
        {tools.map((tool) => (
          <span
            key={tool}
            className="px-3 py-1.5 text-sm font-mono bg-bg-tertiary text-fg-secondary border border-border-default rounded"
          >
            {tool}
          </span>
        ))}
      </div>
    </div>
  );
}
