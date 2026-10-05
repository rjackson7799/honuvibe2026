'use client';

import { cn } from '@/lib/utils';
import { HvPillToggle, type PillTone } from '../pill';

export type PillOption<V extends string = string> = { value: V; label: string };

type SingleProps<V extends string> = {
  multiple?: false;
  value: V | null;
  onChange: (value: V) => void;
};

type MultiProps<V extends string> = {
  multiple: true;
  value: readonly V[];
  onChange: (value: V[]) => void;
};

type PillGroupProps<V extends string> = (SingleProps<V> | MultiProps<V>) & {
  options: readonly PillOption<V>[];
  /** Accessible name for the group ("What kind of project?"). */
  label: string;
  tone?: PillTone;
  className?: string;
};

/**
 * README "Lead forms": choices are pill toggle buttons, the active one amber
 * on dark. Single-select behaves like radios; `multiple` toggles membership
 * (the Partner enquiry's "Interested in (pick any)").
 */
export function HvPillGroup<V extends string>(props: PillGroupProps<V>) {
  const { options, label, tone = 'dark', className } = props;

  const isActive = (v: V) => (props.multiple ? props.value.includes(v) : props.value === v);

  const toggle = (v: V) => {
    if (props.multiple) {
      const next = props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v];
      props.onChange(next);
    } else {
      props.onChange(v);
    }
  };

  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((o) => (
        <HvPillToggle key={o.value} tone={tone} active={isActive(o.value)} onClick={() => toggle(o.value)}>
          {o.label}
        </HvPillToggle>
      ))}
    </div>
  );
}
