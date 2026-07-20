'use client';

import { useState, useTransition } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { setBannerEnabled, setBannerEvent } from '@/lib/marketing/actions';

type EventOption = { slug: string; label: string };

type Props = {
  initialEnabled: boolean;
  initialSlug: string | null;
  eventOptions: EventOption[];
};

const NONE = '__none__';

export function BannerSettingsCard({
  initialEnabled,
  initialSlug,
  eventOptions,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [slug, setSlug] = useState<string | null>(initialSlug);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const next = !enabled;
    setEnabled(next); // optimistic
    startTransition(async () => {
      try {
        await setBannerEnabled(next);
      } catch {
        setEnabled(!next); // revert on failure
      }
    });
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const raw = e.target.value;
    const next = raw === NONE ? null : raw;
    const prev = slug;
    setSlug(next); // optimistic
    startTransition(async () => {
      try {
        await setBannerEvent(next);
      } catch {
        setSlug(prev); // revert on failure
      }
    });
  }

  return (
    <Card className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-teal/10 text-accent-teal">
            <CalendarDays size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-fg-primary">
              Homepage announcement banner
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">
              The strip across the top of every marketing page. Turn it on and
              pick which free/public event to feature.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Show announcement banner"
          onClick={handleToggle}
          disabled={pending}
          className={cn(
            'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-[var(--duration-fast)] disabled:opacity-60',
            enabled ? 'bg-accent-teal' : 'bg-border-default',
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-[var(--duration-fast)]',
              enabled ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
      </div>

      <Select
        label="Featured event"
        value={slug ?? NONE}
        onChange={handleSlugChange}
        disabled={pending}
        options={[
          { value: NONE, label: '— None —' },
          ...eventOptions.map((o) => ({ value: o.slug, label: o.label })),
        ]}
      />

      <p className="text-[12px] leading-relaxed text-fg-tertiary">
        Event content (title, blurb, date, description) is hand-authored in code
        at <code className="font-mono text-[11px]">lib/events/public-events.ts</code>.
        This page only controls whether the banner shows and which event it
        points to. The strip also hides itself automatically once an event has
        ended.
      </p>
    </Card>
  );
}
