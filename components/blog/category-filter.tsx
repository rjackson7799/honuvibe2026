'use client';

import { useTranslations } from 'next-intl';
import {
  Code2,
  Globe,
  Heart,
  LayoutGrid,
  Rocket,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { BlogCategory } from '@/lib/sanity/types';

type CategoryValue = BlogCategory | 'all';

const CATEGORY_CHIPS: { value: CategoryValue; Icon: LucideIcon }[] = [
  { value: 'all', Icon: LayoutGrid },
  { value: 'ai-tools', Icon: Sparkles },
  { value: 'entrepreneurship', Icon: Rocket },
  { value: 'japan-us', Icon: Globe },
  { value: 'behind-the-build', Icon: Code2 },
  { value: 'honuhub-stories', Icon: Users },
  { value: 'impact', Icon: Heart },
];

export function CategoryFilter() {
  const t = useTranslations('blog');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category') || 'all';

  const handleCategoryClick = (category: CategoryValue) => {
    if (category === 'all') {
      router.push(pathname);
    } else {
      router.push(`${pathname}?category=${category}`);
    }
  };

  return (
    <ul
      role="list"
      className="flex flex-wrap justify-center gap-2.5"
    >
      {CATEGORY_CHIPS.map(({ value, Icon }) => {
        const isActive = activeCategory === value;
        return (
          <li key={value}>
            <button
              type="button"
              onClick={() => handleCategoryClick(value)}
              aria-pressed={isActive}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3.5 py-2 sm:px-4 text-[14px] font-medium',
                'border transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-canvas)]',
                isActive
                  ? 'border-[var(--m-accent-teal)] bg-[var(--m-accent-teal-soft)] text-[var(--m-accent-teal-dark)]'
                  : 'border-[var(--m-border-default)] bg-[var(--m-white)] text-[var(--m-ink-secondary)] hover:border-[var(--m-seafoam)] hover:text-[var(--m-ink-primary)]',
              )}
            >
              <Icon
                size={16}
                strokeWidth={2}
                className={
                  isActive
                    ? 'text-[var(--m-accent-teal)]'
                    : 'text-[var(--m-seafoam)]'
                }
              />
              {t(`categories.${value}`)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
