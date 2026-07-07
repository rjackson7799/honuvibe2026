import { describe, it, expect } from 'vitest';
import { validateScenarioForPublish, nextCopySlug } from './validation';
import type { CreateWorkbenchScenarioInput } from './types';

// A fully bilingual, publish-ready scenario. Helpers override single fields to
// probe each rule in isolation.
function makeScenario(
  overrides: Partial<CreateWorkbenchScenarioInput> = {},
): CreateWorkbenchScenarioInput {
  return {
    slug: 'launch-copy',
    title_en: 'Launch copy',
    title_jp: 'ローンチコピー',
    domain: 'marketing',
    difficulty: 'beginner',
    brief_en: 'Write launch copy for a new app.',
    brief_jp: '新しいアプリのローンチコピーを書く。',
    applicable_dimensions: ['role', 'task', 'format'],
    expert_prompt_en: 'You are a launch copywriter. Write the hero copy.',
    expert_prompt_jp: 'あなたはローンチのコピーライターです。',
    expert_output_en: 'Expert output.',
    expert_output_jp: 'お手本の出力。',
    why_this_works_en: null,
    why_this_works_jp: null,
    ...overrides,
  };
}

describe('validateScenarioForPublish', () => {
  it('returns no errors for a complete bilingual scenario', () => {
    expect(validateScenarioForPublish(makeScenario())).toEqual([]);
  });

  it('requires both languages of each required content pair', () => {
    const errors = validateScenarioForPublish(
      makeScenario({
        title_jp: '',
        brief_en: '   ', // whitespace-only counts as missing
        expert_prompt_jp: null,
        expert_output_jp: undefined,
      }),
    );
    expect(errors).toContain('Title (JP) is required.');
    expect(errors).toContain('Brief (EN) is required.');
    expect(errors).toContain('Expert prompt (JP) is required.');
    expect(errors).toContain('Expert output (JP) is required.');
    // The EN sides that ARE present must not be flagged.
    expect(errors).not.toContain('Title (EN) is required.');
  });

  it('requires at least one applicable dimension', () => {
    const errors = validateScenarioForPublish(
      makeScenario({ applicable_dimensions: [] }),
    );
    expect(errors).toContain('Select at least one applicable dimension.');
  });

  it('rejects unknown dimensions', () => {
    const errors = validateScenarioForPublish(
      makeScenario({
        // deliberately invalid value past the type boundary
        applicable_dimensions: ['role', 'tone'] as never,
      }),
    );
    expect(errors.some((e) => e.includes('tone'))).toBe(true);
  });

  it('requires a slug and enforces the slug format', () => {
    expect(validateScenarioForPublish(makeScenario({ slug: '' }))).toContain(
      'Slug is required.',
    );
    const bad = validateScenarioForPublish(makeScenario({ slug: 'Not A Slug!' }));
    expect(
      bad.some((e) => e.toLowerCase().includes('slug must be')),
    ).toBe(true);
  });

  it('treats why-this-works as optional but paired', () => {
    // Both empty -> fine.
    expect(
      validateScenarioForPublish(
        makeScenario({ why_this_works_en: null, why_this_works_jp: null }),
      ),
    ).toEqual([]);
    // Both filled -> fine.
    expect(
      validateScenarioForPublish(
        makeScenario({ why_this_works_en: 'Because.', why_this_works_jp: 'なぜなら。' }),
      ),
    ).toEqual([]);
    // Only one side -> error.
    const errors = validateScenarioForPublish(
      makeScenario({ why_this_works_en: 'Because.', why_this_works_jp: null }),
    );
    expect(errors.some((e) => e.toLowerCase().includes('why'))).toBe(true);
  });
});

describe('jp_needs_review publish gate', () => {
  it('blocks publish while JP content awaits review', () => {
    const errors = validateScenarioForPublish({
      ...makeScenario(),
      jp_needs_review: true,
    });
    expect(
      errors.some((e) => e.toLowerCase().includes('machine-translated')),
    ).toBe(true);
  });

  it('passes once JP review is cleared', () => {
    expect(
      validateScenarioForPublish({ ...makeScenario(), jp_needs_review: false }),
    ).toEqual([]);
  });
});

describe('nextCopySlug', () => {
  it('appends -copy when free', () => {
    expect(nextCopySlug('launch-copy-hero', [])).toBe('launch-copy-hero-copy');
  });

  it('numbers subsequent copies', () => {
    expect(
      nextCopySlug('launch-copy-hero', ['launch-copy-hero-copy']),
    ).toBe('launch-copy-hero-copy-2');
    expect(
      nextCopySlug('launch-copy-hero', [
        'launch-copy-hero-copy',
        'launch-copy-hero-copy-2',
      ]),
    ).toBe('launch-copy-hero-copy-3');
  });

  it('does not stack -copy suffixes when duplicating a copy', () => {
    expect(
      nextCopySlug('launch-copy-hero-copy', ['launch-copy-hero-copy']),
    ).toBe('launch-copy-hero-copy-2');
    expect(
      nextCopySlug('launch-copy-hero-copy-2', [
        'launch-copy-hero-copy',
        'launch-copy-hero-copy-2',
      ]),
    ).toBe('launch-copy-hero-copy-3');
  });
});
