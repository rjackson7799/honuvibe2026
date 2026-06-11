// Shared value→label maps for the Build It AI discovery tool. Intake option
// lists live here; question-option labels are derived from lib/questions.ts so
// they can't drift from the backbone. Used by the intake gate, the review step,
// and the summary screen.

import { QUESTIONS, BRANCHES } from '@/lib/questions';

export interface Option {
  value: string;
  label: string;
}

// ── Intake gate option lists ─────────────────────────────────────────────────

export const LOCATION_TYPE_OPTIONS: Option[] = [
  { value: 'online', label: 'Online only' },
  { value: 'physical', label: 'Physical location(s)' },
  { value: 'both', label: 'Both' },
];

export const TIER_OPTIONS: Option[] = [
  { value: 'starter', label: 'Studio Starter' },
  { value: 'pro', label: 'Studio Pro' },
  { value: 'ai_native', label: 'Studio AI-Native' },
  { value: 'not_sure', label: 'Not sure yet' },
];

// Reuses the studio_leads industry set so migrated leads and discovery leads
// share labels in the admin. 'healthcare' also drives the Q9 compliance branch.
export const INDUSTRY_OPTIONS: Option[] = [
  { value: 'creator', label: 'Creators' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'service', label: 'Service business (trades, local services)' },
  { value: 'professional', label: 'Professional services (firms, advisors)' },
  { value: 'other', label: 'Other' },
];

// Discovery timeline chips (Q15). Distinct from the studio form's timeline
// vocabulary — leads.timeline is free-text, so both fit.
export const TIMELINE_OPTIONS: Option[] = [
  { value: 'asap', label: 'ASAP' },
  { value: '2_3_weeks', label: '2–3 weeks' },
  { value: 'within_month', label: 'Within a month' },
  { value: 'no_rush', label: 'No rush' },
];

const toMap = (opts: Option[]): Record<string, string> =>
  Object.fromEntries(opts.map((o) => [o.value, o.label]));

const LOCATION_TYPE_LABEL = toMap(LOCATION_TYPE_OPTIONS);
const TIER_LABEL = toMap(TIER_OPTIONS);
const INDUSTRY_LABEL = toMap(INDUSTRY_OPTIONS);
const TIMELINE_LABEL = toMap(TIMELINE_OPTIONS);

const labelize =
  (map: Record<string, string>) =>
  (value: string | null | undefined): string | null =>
    value ? (map[value] ?? value) : null;

export const labelizeLocationType = labelize(LOCATION_TYPE_LABEL);
export const labelizeTier = labelize(TIER_LABEL);
export const labelizeIndustry = labelize(INDUSTRY_LABEL);
export const labelizeTimeline = labelize(TIMELINE_LABEL);

// ── Question-option labels (derived from the backbone + branches) ────────────

function buildFieldOptionIndex(): Record<string, Record<string, string>> {
  const index: Record<string, Record<string, string>> = {};
  const collect = (capturesField: string, opts?: Option[], groups?: { options: Option[] }[]) => {
    const map: Record<string, string> = index[capturesField] ?? {};
    for (const o of opts ?? []) map[o.value] = o.label;
    for (const g of groups ?? []) for (const o of g.options) map[o.value] = o.label;
    if (Object.keys(map).length) index[capturesField] = map;
  };
  for (const q of QUESTIONS) collect(q.capturesField, q.options, q.groups);
  for (const b of BRANCHES) collect(b.question.capturesField, b.question.options, b.question.groups);
  return index;
}

const FIELD_OPTION_INDEX = buildFieldOptionIndex();

/** Map a stored option value back to its label for a given capturesField. */
export function optionLabel(field: string, value: string): string {
  return FIELD_OPTION_INDEX[field]?.[value] ?? value;
}

/** Map an array of stored values to their labels (multi-select answers). */
export function optionLabels(field: string, values: string[]): string[] {
  return values.map((v) => optionLabel(field, v));
}
