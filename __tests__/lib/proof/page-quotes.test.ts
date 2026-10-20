import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '@/messages/en.json';
import type { PublicProofArtifact } from '@/lib/proof/types';

const getPublishedTestimonials = vi.fn();

vi.mock('@/lib/proof/queries', () => ({
  getPublishedTestimonials: (...args: unknown[]) => getPublishedTestimonials(...args),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: async ({ namespace }: { namespace: string }) => {
    const scope = namespace
      .split('.')
      .reduce<Record<string, unknown>>((o, k) => o[k] as Record<string, unknown>, en as unknown as Record<string, unknown>);
    return (key: string) =>
      key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], scope) as string;
  },
}));

import { getPageQuotes } from '@/lib/proof/page-quotes';

function proof(n: number): PublicProofArtifact {
  return {
    quote_en: `Quote ${n}`,
    quote_jp: null,
    person_name: `Person ${n}`,
    role_en: 'Role',
    role_jp: null,
    org: 'Org',
  } as unknown as PublicProofArtifact;
}

describe('getPageQuotes', () => {
  beforeEach(() => getPublishedTestimonials.mockReset());

  it('returns real quotes once three exist', async () => {
    getPublishedTestimonials.mockResolvedValue([proof(1), proof(2), proof(3)]);
    const quotes = await getPageQuotes('en');
    expect(getPublishedTestimonials).toHaveBeenCalledWith(3);
    expect(quotes).toEqual([
      { text: 'Quote 1', name: 'Person 1', org: 'Role, Org' },
      { text: 'Quote 2', name: 'Person 2', org: 'Role, Org' },
      { text: 'Quote 3', name: 'Person 3', org: 'Role, Org' },
    ]);
  });

  it('falls back to the three i18n testimonials with fewer than three', async () => {
    getPublishedTestimonials.mockResolvedValue([proof(1), proof(2)]);
    const quotes = await getPageQuotes('en');
    const tq = en.social_proof.testimonials;
    expect(quotes).toEqual(
      (['two', 'one', 'three'] as const).map((k) => ({
        text: tq[k].quote,
        name: tq[k].name,
        org: tq[k].role,
      })),
    );
  });
});
