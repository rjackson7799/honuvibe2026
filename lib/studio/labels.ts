// Shared value→label maps for HonuVibe Studio leads. Single source used by
// the public intake API (app/api/studio-leads/submit) and the admin list, so
// the labels can't drift from the studio_leads CHECK constraints.

export const STUDIO_INDUSTRY = [
  'creator',
  'healthcare',
  'service',
  'professional',
  'other',
] as const;
export const STUDIO_PROJECT_TYPE = ['starter', 'pro', 'ai_native', 'not_sure'] as const;
export const STUDIO_BUDGET = ['under_1k', '1k_3k', '3k_7k', '7k_15k', '15k_plus'] as const;
export const STUDIO_TIMELINE = ['asap', '1_month', '1_3_months', 'flexible'] as const;

export type StudioIndustry = (typeof STUDIO_INDUSTRY)[number];
export type StudioProjectType = (typeof STUDIO_PROJECT_TYPE)[number];
export type StudioBudget = (typeof STUDIO_BUDGET)[number];
export type StudioTimeline = (typeof STUDIO_TIMELINE)[number];

const INDUSTRY_LABEL: Record<StudioIndustry, string> = {
  creator: 'Creator',
  healthcare: 'Healthcare',
  service: 'Service Business',
  professional: 'Professional',
  other: 'Other',
};
const PROJECT_TYPE_LABEL: Record<StudioProjectType, string> = {
  starter: 'Studio Starter',
  pro: 'Studio Pro',
  ai_native: 'Studio AI-Native',
  not_sure: 'Not sure yet',
};
const BUDGET_LABEL: Record<StudioBudget, string> = {
  under_1k: 'Under $1k',
  '1k_3k': '$1k – $3k',
  '3k_7k': '$3k – $7k',
  '7k_15k': '$7k – $15k',
  '15k_plus': '$15k+',
};
const TIMELINE_LABEL: Record<StudioTimeline, string> = {
  asap: 'As soon as possible',
  '1_month': 'Within a month',
  '1_3_months': '1–3 months',
  flexible: 'Flexible',
};

const labelize =
  <K extends string>(map: Record<K, string>) =>
  (value: string | null | undefined): string | null =>
    value ? (map[value as K] ?? value) : null;

export const labelizeIndustry = labelize(INDUSTRY_LABEL);
export const labelizeProjectType = labelize(PROJECT_TYPE_LABEL);
export const labelizeBudget = labelize(BUDGET_LABEL);
export const labelizeTimeline = labelize(TIMELINE_LABEL);
