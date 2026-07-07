import { describe, it, expect } from 'vitest';
import {
  createWorkbenchScenarioSchema,
  updateWorkbenchScenarioSchema,
} from './types';
import type { CreateWorkbenchScenarioInput } from './types';

// Minimal valid create payload; helpers override single fields to probe rules.
function makeInput(
  overrides: Partial<CreateWorkbenchScenarioInput> = {},
): CreateWorkbenchScenarioInput {
  return {
    slug: 'launch-copy',
    title_en: 'Launch copy',
    domain: 'marketing',
    difficulty: 'beginner',
    brief_en: 'Write launch copy for a new app.',
    applicable_dimensions: ['role', 'task'],
    expert_prompt_en: 'You are a launch copywriter. Write the hero copy.',
    expert_output_en: 'Expert output.',
    ...overrides,
  };
}

describe('createWorkbenchScenarioSchema', () => {
  it('accepts a minimal English-only draft (JP fields omitted)', () => {
    const result = createWorkbenchScenarioSchema.safeParse(makeInput());
    expect(result.success).toBe(true);
  });

  it('trims string fields', () => {
    const result = createWorkbenchScenarioSchema.parse(
      makeInput({ title_en: '  Launch copy  ' }),
    );
    expect(result.title_en).toBe('Launch copy');
  });

  it('rejects a malformed slug', () => {
    for (const slug of ['Not A Slug!', 'UPPER', 'has_underscore', '']) {
      expect(
        createWorkbenchScenarioSchema.safeParse(makeInput({ slug })).success,
      ).toBe(false);
    }
  });

  it('rejects unknown domain and difficulty', () => {
    expect(
      createWorkbenchScenarioSchema.safeParse(
        makeInput({ domain: 'finance' as never }),
      ).success,
    ).toBe(false);
    expect(
      createWorkbenchScenarioSchema.safeParse(
        makeInput({ difficulty: 'expert' as never }),
      ).success,
    ).toBe(false);
  });

  it('rejects empty or unknown dimensions', () => {
    expect(
      createWorkbenchScenarioSchema.safeParse(
        makeInput({ applicable_dimensions: [] }),
      ).success,
    ).toBe(false);
    expect(
      createWorkbenchScenarioSchema.safeParse(
        makeInput({ applicable_dimensions: ['role', 'tone'] as never }),
      ).success,
    ).toBe(false);
  });

  it('rejects missing required English fields', () => {
    expect(
      createWorkbenchScenarioSchema.safeParse(makeInput({ brief_en: '   ' }))
        .success,
    ).toBe(false);
    expect(
      createWorkbenchScenarioSchema.safeParse(
        makeInput({ expert_output_en: '' }),
      ).success,
    ).toBe(false);
  });
});

describe('updateWorkbenchScenarioSchema', () => {
  it('accepts a partial payload', () => {
    const result = updateWorkbenchScenarioSchema.safeParse({
      title_jp: 'ローンチコピー',
    });
    expect(result.success).toBe(true);
  });

  it('still enforces field rules on provided keys', () => {
    expect(
      updateWorkbenchScenarioSchema.safeParse({ slug: 'Bad Slug' }).success,
    ).toBe(false);
    expect(
      updateWorkbenchScenarioSchema.safeParse({ applicable_dimensions: [] })
        .success,
    ).toBe(false);
  });
});
