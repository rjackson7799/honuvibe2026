// The reword-only rule for a SENT questionnaire, as a pure function so it can
// be unit-tested (questionnaire-actions.ts is a 'use server' module and may
// only export async functions). After send, prompts / help / option LABELS /
// section titles + blurbs / title + intro may change; every structural
// property must stay identical, otherwise stored answers would be stranded
// against a manifest they were not written for.

import type { EngagementQuestion, QuestionnaireSection } from './questions-schema';

export interface ManifestShape {
  sections: QuestionnaireSection[];
  questions: EngagementQuestion[];
}

/**
 * The reword-only diff for a sent questionnaire: every structural property
 * must be identical (same ids in the same order, same section keys in the
 * same order, same qtype / required / allow_other / max_select / long, same
 * option VALUES in the same order). Returns the first violation, or null.
 */
export function structuralViolation(
  before: ManifestShape,
  after: ManifestShape,
): string | null {
  if (before.sections.map((s) => s.key).join(' ') !== after.sections.map((s) => s.key).join(' ')) {
    return 'sections cannot be added, removed or reordered after the questionnaire has been sent';
  }
  if (before.questions.map((q) => q.id).join(' ') !== after.questions.map((q) => q.id).join(' ')) {
    return 'questions cannot be added, removed or reordered after the questionnaire has been sent';
  }
  for (let i = 0; i < before.questions.length; i += 1) {
    const b = before.questions[i];
    const a = after.questions[i];
    if (b.section_key !== a.section_key) return `"${b.id}" cannot move to another section after send`;
    if (b.qtype !== a.qtype) return `"${b.id}" cannot change type after send`;
    if (b.required !== a.required) return `"${b.id}" cannot change required after send`;
    if (b.allow_other !== a.allow_other) return `"${b.id}" cannot change allow_other after send`;
    if (b.max_select !== a.max_select) return `"${b.id}" cannot change max_select after send`;
    if (b.long !== a.long) return `"${b.id}" cannot change long after send`;
    const bv = b.options.map((o) => o.value).join(' ');
    const av = a.options.map((o) => o.value).join(' ');
    if (bv !== av) return `"${b.id}" option values cannot change after send — relabel instead`;
  }
  return null;
}
