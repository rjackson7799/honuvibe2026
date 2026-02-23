'use client';

import { cn } from '@/lib/utils';

type Tab = {
  key: string;
  label: string;
};

type TabNavigationProps = {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
};

export function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex border-b border-border-default gap-0 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onTabChange(tab.key)}
          className={cn(
            'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-[var(--duration-fast)]',
            activeTab === tab.key
              ? 'text-accent-teal border-b-2 border-accent-teal'
              : 'text-fg-tertiary hover:text-fg-secondary',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
