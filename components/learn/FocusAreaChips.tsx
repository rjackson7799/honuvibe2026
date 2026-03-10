'use client';

import { useTranslations } from 'next-intl';

type FocusAreaChipsProps = {
  tags: { slug: string; name_en: string; name_jp?: string | null }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  locale: string;
};

export function FocusAreaChips({
  tags,
  selected,
  onChange,
  locale,
}: FocusAreaChipsProps) {
  const t = useTranslations('study_paths');

  function toggleTag(slug: string) {
    if (selected.includes(slug)) {
      onChange(selected.filter((s) => s !== slug));
    } else {
      onChange([...selected, slug]);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fg-secondary">
        {t('focus_label')}
      </label>
      <p className="text-xs text-fg-muted">{t('focus_subtitle')}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selected.includes(tag.slug);
          const label =
            locale === 'ja' && tag.name_jp ? tag.name_jp : tag.name_en;

          return (
            <button
              key={tag.slug}
              type="button"
              onClick={() => toggleTag(tag.slug)}
              className={`rounded-full px-3 py-1.5 text-sm transition-all duration-[var(--duration-normal)] ${
                isSelected
                  ? 'bg-accent-teal text-white'
                  : 'border border-border-primary bg-bg-secondary text-fg-secondary hover:border-border-hover'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
