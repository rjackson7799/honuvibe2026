import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import en from '@/messages/en.json';
import { ProofStories } from '@/components/marketing/home/proof-stories';
import { getPublishedTestimonials } from '@/lib/proof/queries';
import { getLocale } from 'next-intl/server';
import type { PublicProofArtifact } from '@/lib/proof/types';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

function getNs(ns: string): Record<string, string> {
  return ns.split('.').reduce<unknown>((o, k) => {
    if (o && typeof o === 'object' && k in (o as Record<string, unknown>)) {
      return (o as Record<string, unknown>)[k];
    }
    return undefined;
  }, en) as Record<string, string>;
}

vi.mock('next-intl/server', () => ({
  getLocale: vi.fn(async () => 'en'),
  getTranslations: vi.fn(async (ns: string) => {
    const base = getNs(ns) ?? {};
    return (key: string) => base[key] ?? key;
  }),
}));

vi.mock('@/lib/proof/queries', () => ({
  getPublishedTestimonials: vi.fn(),
}));

function story(over: Partial<PublicProofArtifact>): PublicProofArtifact {
  return {
    id: Math.random().toString(36).slice(2),
    artifact_type: 'testimonial',
    quote_en: 'Great course.',
    quote_jp: null,
    title_en: null,
    title_jp: null,
    person_name: 'Person',
    role_en: 'Role',
    role_jp: null,
    org: null,
    person_image_url: null,
    logo_url: null,
    organization_url: null,
    rating: 5,
    metrics_json: {},
    course_id: null,
    is_featured: false,
    display_order: 0,
    ...over,
  };
}

const WALL_HEADING = en.home.testimonials.wall_heading;

describe('ProofStories', () => {
  beforeEach(() => {
    vi.mocked(getPublishedTestimonials).mockReset();
    vi.mocked(getLocale).mockResolvedValue('en');
  });

  it('renders nothing (section hidden) when there are zero governed rows', async () => {
    vi.mocked(getPublishedTestimonials).mockResolvedValue([]);
    const { container } = render(await ProofStories());
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(WALL_HEADING)).toBeNull();
  });

  it('renders the 3-card layout for 1–3 rows under the proof heading', async () => {
    vi.mocked(getPublishedTestimonials).mockResolvedValue([
      story({ quote_en: 'One.', person_name: 'Aiko' }),
      story({ quote_en: 'Two.', person_name: 'Ben' }),
    ]);
    render(await ProofStories());
    expect(screen.getByRole('heading', { name: WALL_HEADING })).toBeInTheDocument();
    expect(screen.getByText('“One.”')).toBeInTheDocument();
    expect(screen.getByText('Aiko')).toBeInTheDocument();
    expect(screen.getByText('Ben')).toBeInTheDocument();
  });

  it('renders the wall for 4+ rows', async () => {
    vi.mocked(getPublishedTestimonials).mockResolvedValue(
      Array.from({ length: 6 }, (_, i) =>
        story({ quote_en: `Quote ${i}.`, person_name: `P${i}` }),
      ),
    );
    render(await ProofStories());
    expect(screen.getByRole('heading', { name: WALL_HEADING })).toBeInTheDocument();
    for (let i = 0; i < 6; i++) {
      expect(screen.getByText(`“Quote ${i}.”`)).toBeInTheDocument();
    }
  });

  it('falls back to quote_en on /ja when quote_jp is null', async () => {
    vi.mocked(getLocale).mockResolvedValue('ja');
    vi.mocked(getPublishedTestimonials).mockResolvedValue([
      story({ quote_en: 'English only.', quote_jp: null, person_name: 'Kenji' }),
    ]);
    render(await ProofStories());
    expect(screen.getByText('“English only.”')).toBeInTheDocument();
  });
});
