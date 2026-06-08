import { describe, it, expect } from 'vitest';
import { validateProofForPublish } from './validation';

type Input = Parameters<typeof validateProofForPublish>[0];

function makeProof(overrides: Partial<Input> = {}): Input {
  return {
    quote_en: 'HonuVibe helped me ship my first AI app in five weeks.',
    quote_jp: '5週間で初めてのAIアプリを公開できました。',
    quote_permission: true,
    name_public: true,
    logo_permission: true,
    person_name: 'Takeshi M.',
    org: 'Vertice Society',
    logo_url: 'https://example.com/logo.png',
    rating: 5,
    ...overrides,
  };
}

describe('validateProofForPublish', () => {
  it('returns no errors for a complete, permissioned proof', () => {
    expect(validateProofForPublish(makeProof())).toEqual([]);
  });

  it('requires a non-blank EN quote', () => {
    expect(validateProofForPublish(makeProof({ quote_en: '   ' }))).toContain(
      'Quote (EN) is required.',
    );
  });

  it('blocks publish without quote permission (consent gate)', () => {
    const errors = validateProofForPublish(makeProof({ quote_permission: false }));
    expect(errors).toContain(
      'Quote permission is required to publish (consent gate).',
    );
  });

  it('flags a set person name when name is not public', () => {
    const errors = validateProofForPublish(
      makeProof({ person_name: 'Takeshi M.', name_public: false }),
    );
    expect(errors.some((e) => e.includes('name public'))).toBe(true);
  });

  it('flags an org/logo without any display permission', () => {
    const errors = validateProofForPublish(
      makeProof({
        org: 'Vertice Society',
        logo_url: 'https://example.com/logo.png',
        logo_permission: false,
        name_public: false,
        person_name: null,
      }),
    );
    expect(errors.some((e) => e.includes('no display permission'))).toBe(true);
  });

  it('does not flag org when name is public (name covers attribution)', () => {
    const errors = validateProofForPublish(
      makeProof({ logo_permission: false, name_public: true }),
    );
    expect(errors.some((e) => e.includes('no display permission'))).toBe(false);
  });

  it('rejects an out-of-range rating', () => {
    expect(validateProofForPublish(makeProof({ rating: 7 }))).toContain(
      'Rating must be between 1 and 5.',
    );
  });

  it('allows a null rating', () => {
    expect(validateProofForPublish(makeProof({ rating: null }))).toEqual([]);
  });

  it('allows an anonymous, quote-only proof (no name/org)', () => {
    const errors = validateProofForPublish(
      makeProof({
        person_name: null,
        org: null,
        logo_url: null,
        name_public: false,
        logo_permission: false,
      }),
    );
    expect(errors).toEqual([]);
  });
});
