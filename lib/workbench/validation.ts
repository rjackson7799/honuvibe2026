// Apply-It Workbench — admin publish validation (mirrors lib/events/validation.ts).
//
// A scenario is authored draft-first; the _jp companions and why_this_works may
// be empty while drafting. validateScenarioForPublish() is the gate the publish
// server action runs before flipping is_published=true: it returns a list of
// human-readable errors (empty = ready to publish). The same rule is the single
// source of truth — the admin form surfaces whatever this returns.

import { WORKBENCH_DIMENSIONS } from './types';

interface ScenarioPublishCheckInput {
  slug: string;
  title_en: string;
  title_jp?: string | null;
  brief_en: string;
  brief_jp?: string | null;
  applicable_dimensions: string[];
  expert_prompt_en: string;
  expert_prompt_jp?: string | null;
  expert_output_en: string;
  expert_output_jp?: string | null;
  why_this_works_en?: string | null;
  why_this_works_jp?: string | null;
}

const isBlank = (v: string | null | undefined): boolean => !v || !v.trim();

/**
 * Returns the human-readable errors that block publishing a scenario.
 * Empty array = ready to publish. Per the project convention, every required
 * bilingual field must be present in BOTH languages before publish.
 */
export function validateScenarioForPublish(
  scenario: ScenarioPublishCheckInput,
): string[] {
  const errors: string[] = [];

  // Slug — required, lowercase/numbers/hyphens only.
  if (isBlank(scenario.slug)) {
    errors.push('Slug is required.');
  } else if (!/^[a-z0-9-]+$/.test(scenario.slug)) {
    errors.push('Slug must be lowercase letters, numbers, and hyphens only.');
  }

  // Required content — both languages mandatory before publish.
  const requiredPairs: Array<
    [label: string, en: string | null | undefined, jp: string | null | undefined]
  > = [
    ['Title', scenario.title_en, scenario.title_jp],
    ['Brief', scenario.brief_en, scenario.brief_jp],
    ['Expert prompt', scenario.expert_prompt_en, scenario.expert_prompt_jp],
    ['Expert output', scenario.expert_output_en, scenario.expert_output_jp],
  ];
  for (const [label, en, jp] of requiredPairs) {
    if (isBlank(en)) errors.push(`${label} (EN) is required.`);
    if (isBlank(jp)) errors.push(`${label} (JP) is required.`);
  }

  // Applicable dimensions — at least one, all from the known set.
  const dims = scenario.applicable_dimensions ?? [];
  if (dims.length === 0) {
    errors.push('Select at least one applicable dimension.');
  } else {
    const known = WORKBENCH_DIMENSIONS as readonly string[];
    const unknown = dims.filter((d) => !known.includes(d));
    if (unknown.length > 0) {
      errors.push(`Unknown dimension(s): ${unknown.join(', ')}.`);
    }
  }

  // Why-this-works is optional, but must be filled in both languages or neither.
  const hasWhyEn = !isBlank(scenario.why_this_works_en);
  const hasWhyJp = !isBlank(scenario.why_this_works_jp);
  if (hasWhyEn !== hasWhyJp) {
    errors.push(
      'Why-this-works must be filled in both languages or left empty in both.',
    );
  }

  return errors;
}
