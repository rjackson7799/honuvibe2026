import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import en from '@/messages/en.json';
import { ProofBand } from '@/components/marketing/proof-band';
import { getPublishedLogos } from '@/lib/proof/queries';
import type { PublicProofArtifact } from '@/lib/proof/types';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async (ns: string) => {
    const base =
      (en as unknown as Record<string, Record<string, string>>)[ns] ?? {};
    return (key: string, vars?: Record<string, unknown>) => {
      const raw = base[key];
      if (typeof raw !== 'string') return key;
      if (!vars) return raw;
      return Object.entries(vars).reduce<string>(
        (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
        raw,
      );
    };
  }),
}));

vi.mock('@/lib/proof/queries', () => ({
  getPublishedLogos: vi.fn(),
}));

function logo(over: Partial<PublicProofArtifact>): PublicProofArtifact {
  return {
    id: 'x',
    artifact_type: 'testimonial',
    quote_en: null,
    quote_jp: null,
    title_en: null,
    title_jp: null,
    person_name: null,
    role_en: null,
    role_jp: null,
    org: null,
    person_image_url: null,
    logo_url: null,
    organization_url: null,
    rating: null,
    metrics_json: {},
    course_id: null,
    is_featured: false,
    display_order: 0,
    ...over,
  };
}

const SUPA = 'https://proj.supabase.co/storage/v1/object/public/proof/a.png';

describe('ProofBand', () => {
  beforeEach(() => {
    vi.mocked(getPublishedLogos).mockReset();
  });

  it('renders the 5-stat band including the price anchor', async () => {
    vi.mocked(getPublishedLogos).mockResolvedValue([]);
    render(await ProofBand({ vaultTotalCount: 42 }));
    expect(screen.getByText('1,400+')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('bilingual lessons')).toBeInTheDocument();
    expect(screen.getByText('6-in-1')).toBeInTheDocument();
    expect(screen.getByText('$99/mo')).toBeInTheDocument();
    expect(screen.getByText('cancel anytime')).toBeInTheDocument();
  });

  it('renders a Supabase-hosted logo as an image linked when org_url is https', async () => {
    vi.mocked(getPublishedLogos).mockResolvedValue([
      logo({ id: '1', org: 'Acme', logo_url: SUPA, organization_url: 'https://acme.com' }),
    ]);
    render(await ProofBand({ vaultTotalCount: 0 }));
    const img = screen.getByAltText('Acme');
    expect(img).toHaveAttribute('src', SUPA);
    const link = img.closest('a');
    expect(link).toHaveAttribute('href', 'https://acme.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('skips rows without an org name', async () => {
    vi.mocked(getPublishedLogos).mockResolvedValue([
      logo({ id: '1', org: '', logo_url: SUPA, organization_url: 'https://x.com' }),
    ]);
    render(await ProofBand({ vaultTotalCount: 0 }));
    // no org name → skipped → falls back to the Vertice entry
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Vertice Society')).toBeInTheDocument();
  });

  it('renders a non-Supabase logo host as a Monogram, not next/image', async () => {
    vi.mocked(getPublishedLogos).mockResolvedValue([
      logo({ id: '1', org: 'Beta Co', logo_url: 'https://evil.example.com/b.png', organization_url: null }),
    ]);
    render(await ProofBand({ vaultTotalCount: 0 }));
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Beta Co')).toBeInTheDocument();
  });

  it('does not link a logo whose org_url is not https', async () => {
    vi.mocked(getPublishedLogos).mockResolvedValue([
      logo({ id: '1', org: 'Gamma', logo_url: SUPA, organization_url: 'http://gamma.com' }),
    ]);
    render(await ProofBand({ vaultTotalCount: 0 }));
    const img = screen.getByAltText('Gamma');
    expect(img.closest('a')).toBeNull();
  });

  it('falls back to the Vertice Society entry when there are zero renderable logos', async () => {
    vi.mocked(getPublishedLogos).mockResolvedValue([]);
    render(await ProofBand({ vaultTotalCount: 0 }));
    const vertice = screen.getByText('Vertice Society');
    expect(vertice.closest('a')).toHaveAttribute(
      'href',
      '/partners/vertice-society',
    );
  });
});
