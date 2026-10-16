'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/components/marketing/hv/motion/use-reduced-motion';

export const HOME_PATHS = ['learn', 'build', 'partner'] as const;
export type HomePath = (typeof HOME_PATHS)[number];

export type HomePathTab = { key: HomePath; title: string; tags: readonly string[] };

type Props = {
  defaultTab: HomePath;
  /** Hero copy above the tabs (server-rendered); shares the left column with the tablist. */
  intro: ReactNode;
  /** "Three ways to work with us". */
  label: string;
  /** Accessible name for the tablist. */
  tablistLabel: string;
  tabs: readonly HomePathTab[];
  /** All three panels are server-rendered and stay in the DOM; inactive ones are hidden. */
  panels: Record<HomePath, ReactNode>;
};

const EASE = 'cubic-bezier(.2,.7,.2,1)';
const tabId = (key: HomePath) => `home-path-tab-${key}`;
const panelId = (key: HomePath) => `home-path-panel-${key}`;

/**
 * The Home hero's "Three ways to work with us" switcher (WAI-ARIA tabs,
 * automatic activation). Renders both hero grid cells: the left column (intro
 * + tablist) and the cream panel on the right. A tab change crossfades the
 * panel (380ms) unless reduced motion is on.
 */
export function HomePathTabs({ defaultTab, intro, label, tablistLabel, tabs, panels }: Props) {
  const [active, setActive] = useState<HomePath>(defaultTab);
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<HomePath, HTMLButtonElement | null>>>({});
  const changed = useRef(false);

  useEffect(() => {
    if (!changed.current) return;
    const el = panelRef.current;
    if (reduce || !el || typeof el.animate !== 'function') return;
    el.animate(
      [
        { opacity: 0.4, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 380, easing: EASE },
    );
  }, [active, reduce]);

  const select = (key: HomePath, focus = false) => {
    if (key !== active) {
      changed.current = true;
      setActive(key);
    }
    if (focus) tabRefs.current[key]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const i = tabs.findIndex((t) => t.key === active);
    const last = tabs.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = i === last ? 0 : i + 1;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = i === 0 ? last : i - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    select(tabs[next].key, true);
  };

  return (
    <>
      <div>
        {intro}
        <div data-intro>
          <p className="mt-8 text-[12px] font-semibold uppercase tracking-[0.12em] text-hv-green-400">{label}</p>
          <div role="tablist" aria-label={tablistLabel} aria-orientation="vertical" className="mt-3 grid gap-2">
            {tabs.map((tab, i) => {
              const selected = tab.key === active;
              return (
                <button
                  key={tab.key}
                  ref={(el) => {
                    tabRefs.current[tab.key] = el;
                  }}
                  type="button"
                  role="tab"
                  id={tabId(tab.key)}
                  aria-selected={selected}
                  aria-controls={panelId(tab.key)}
                  aria-labelledby={`${tabId(tab.key)}-title`}
                  aria-describedby={`${tabId(tab.key)}-tags`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(tab.key)}
                  onKeyDown={onKeyDown}
                  className={cn(
                    'grid min-h-[44px] grid-cols-[34px_minmax(0,1fr)_20px] items-center gap-3 rounded-[12px] border-[1.5px] px-4 py-3.5 text-left text-hv-sand-100',
                    'transition-[background-color,transform] duration-[250ms] ease-hv hover:translate-x-[3px] hover:bg-hv-green-800',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-amber focus-visible:ring-offset-2 focus-visible:ring-offset-hv-green-900',
                    selected ? 'border-hv-amber bg-hv-green-800' : 'border-hv-green-700 bg-transparent',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn('font-hv-display text-[14px] font-bold', selected ? 'text-hv-amber' : 'text-hv-green-600')}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex min-w-0 flex-col gap-[7px]">
                    <span id={`${tabId(tab.key)}-title`} className="font-hv-display text-[18px] font-semibold tracking-[-0.02em]">
                      {tab.title}
                    </span>
                    <span id={`${tabId(tab.key)}-tags`} className="flex flex-wrap gap-1.5">
                      {tab.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-hv-green-700 px-[9px] py-[3px] text-[12.5px] text-hv-green-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span aria-hidden className={cn('text-[17px]', selected ? 'text-hv-amber' : 'text-hv-green-600')}>
                    →
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        ref={panelRef}
        data-intro
        className="flex flex-col rounded-[16px] bg-hv-sand-100 p-5 text-hv-ink sm:p-[26px]"
      >
        {HOME_PATHS.map((key) => (
          <div
            key={key}
            role="tabpanel"
            id={panelId(key)}
            aria-labelledby={tabId(key)}
            hidden={key !== active}
            className={key === active ? 'flex flex-1 flex-col' : undefined}
          >
            {panels[key]}
          </div>
        ))}
      </div>
    </>
  );
}
