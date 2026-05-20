'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type IntentKey = 'vault' | 'courses' | 'cohorts';

type IntentOption = {
  key: IntentKey;
  anchor: string;
  labelKey: 'intent_1_label' | 'intent_2_label' | 'intent_3_label';
  captionKey: 'intent_1_caption' | 'intent_2_caption' | 'intent_3_caption';
};

const OPTIONS: IntentOption[] = [
  { key: 'vault', anchor: 'vault', labelKey: 'intent_1_label', captionKey: 'intent_1_caption' },
  { key: 'courses', anchor: 'courses', labelKey: 'intent_2_label', captionKey: 'intent_2_caption' },
  { key: 'cohorts', anchor: 'cohorts', labelKey: 'intent_3_label', captionKey: 'intent_3_caption' },
];

const HIGHLIGHT_MS = 1500;

export function LearnIntentPicker() {
  const t = useTranslations('learn.hero');
  const [active, setActive] = useState<IntentKey | null>(null);

  const handleSelect = (option: IntentOption) => {
    setActive(option.key);

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const allChapters = document.querySelectorAll<HTMLElement>(
      '[data-learn-chapter]',
    );
    allChapters.forEach((el) => {
      el.dataset.active = el.id === option.anchor ? 'true' : 'false';
    });

    const target = document.getElementById(option.anchor);
    const scroll = () => {
      if (target) {
        target.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      }
    };
    if (reduceMotion) {
      scroll();
    } else {
      window.setTimeout(scroll, 220);
    }

    window.setTimeout(() => {
      allChapters.forEach((el) => {
        delete el.dataset.active;
      });
    }, HIGHLIGHT_MS + 220);
  };

  return (
    <div
      role="radiogroup"
      aria-label={t('headline')}
      className="rounded-2xl border border-[var(--m-border-soft)] bg-[var(--m-white)] p-2 shadow-[var(--m-shadow-xs)]"
    >
      {OPTIONS.map((option) => {
        const isActive = active === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => handleSelect(option)}
            className={cn(
              'group flex w-full items-center justify-between gap-4 rounded-xl px-5 py-4 text-left transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-white)]',
              isActive
                ? 'bg-[var(--m-accent-teal-soft)] ring-1 ring-inset ring-[var(--m-accent-teal)]'
                : 'hover:bg-[var(--m-accent-teal-soft)]',
            )}
          >
            <span className="flex items-center gap-3.5 min-w-0">
              <span
                className={cn(
                  'inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors',
                  isActive
                    ? 'border-[var(--m-accent-teal)] bg-[var(--m-accent-teal)] shadow-[inset_0_0_0_2px_var(--m-white)]'
                    : 'border-[var(--m-border-strong)] bg-transparent',
                )}
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block text-[16px] font-semibold leading-tight text-[var(--m-ink-primary)]">
                  {t(option.labelKey)}
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-[var(--m-ink-tertiary)]">
                  {t(option.captionKey)}
                </span>
              </span>
            </span>
            <ArrowRight
              size={18}
              strokeWidth={2}
              className={cn(
                'shrink-0 transition-all duration-200',
                isActive
                  ? 'translate-x-0.5 text-[var(--m-accent-teal)]'
                  : 'text-[var(--m-ink-tertiary)] group-hover:translate-x-0.5 group-hover:text-[var(--m-accent-teal)]',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
