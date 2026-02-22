'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/providers/theme-provider';
import { IconButton } from '@/components/ui/icon-button';
import { useTranslations } from 'next-intl';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations('theme');

  const label = theme === 'dark' ? t('switch_to_light') : t('switch_to_dark');
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <IconButton
      icon={Icon}
      label={label}
      onClick={toggleTheme}
    />
  );
}
