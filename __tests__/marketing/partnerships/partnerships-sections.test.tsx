import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import {
  PartnershipsEditorialHero,
  PartnershipsGrowingCycle,
  PartnershipsCohortChapter,
  PartnershipsMonetize,
  PartnershipsMembersTeachers,
  PartnershipsStudioRouter,
  PartnershipsMethodTable,
  PartnershipsNextChapter,
  PartnershipsApplicationForm,
} from '@/components/marketing/partnerships';
import { STUDIO_URL } from '@/lib/constants/urls';

vi.mock('next-intl', () => {
  function getNs(ns: string): Record<string, unknown> {
    return ns.split('.').reduce<unknown>((o, k) => {
      if (o && typeof o === 'object' && k in (o as Record<string, unknown>)) {
        return (o as Record<string, unknown>)[k];
      }
      return undefined;
    }, en) as Record<string, unknown>;
  }

  function tFor(ns: string) {
    const base = getNs(ns) ?? {};
    function resolve(key: string): unknown {
      const path = key.split('.');
      let cur: unknown = base;
      for (const p of path) {
        if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
          cur = (cur as Record<string, unknown>)[p];
        } else {
          return undefined;
        }
      }
      return cur;
    }
    function t(key: string, vars?: Record<string, unknown>): string {
      const value = resolve(key);
      if (typeof value !== 'string') return key;
      const flattened = value.replace(/<\/?[^>]+>/g, '');
      if (!vars) return flattened;
      return Object.entries(vars).reduce<string>(
        (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
        flattened,
      );
    }
    t.raw = (key: string): unknown => resolve(key);
    return t;
  }

  return {
    useTranslations: (namespace: string) => tFor(namespace),
    useLocale: () => 'en',
  };
});

describe('Partnerships page sections', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('EditorialHero renders the single-focus headline and one cohort anchor chip', () => {
    render(<PartnershipsEditorialHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('Programs that take root');
    expect(h1.textContent).toContain('in your community');
    expect(
      screen.getByText(/We design and run AI learning programs/i),
    ).toBeInTheDocument();
    const anchor = screen.getByRole('link', {
      name: /How a community program grows/i,
    });
    expect(anchor).toHaveAttribute('href', '#grows');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(
      screen.queryByRole('link', { name: /Building out your project/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Strategy, audits & AI-ops/i }),
    ).not.toBeInTheDocument();
  });

  it('CohortChapter shows Vertice proof tile and routes CTA to /apply?type=cohort', () => {
    render(<PartnershipsCohortChapter />);
    expect(screen.getByText('Vertice Society')).toBeInTheDocument();
    expect(screen.getByText('In session')).toBeInTheDocument();
    const cta = screen.getByRole('link', {
      name: /Apply for a cohort partnership/i,
    });
    expect(cta).toHaveAttribute('href', '/partnerships/apply?type=cohort');
    const proofLink = screen.getByRole('link', {
      name: /Read the Vertice case study/i,
    });
    expect(proofLink).toHaveAttribute('href', '/partners/vertice-society');
  });

  it('GrowingCycle shows the seed → tend → harvest triptych', () => {
    render(<PartnershipsGrowingCycle />);
    expect(
      screen.getByRole('heading', { name: /How a community grows/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Seed — custom curriculum')).toBeInTheDocument();
    expect(screen.getByText('Tend — co-branded delivery')).toBeInTheDocument();
    expect(screen.getByText('Harvest — monetize')).toBeInTheDocument();
  });

  it('Monetize spells out the three revenue models', () => {
    render(<PartnershipsMonetize />);
    expect(
      screen.getByRole('heading', {
        name: /Turn your community into a program that pays/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Revenue share')).toBeInTheDocument();
    expect(screen.getByText('Flat license')).toBeInTheDocument();
    expect(screen.getByText('Sponsor-funded')).toBeInTheDocument();
  });

  it('MembersTeachers frames members growing into paid teachers, with no wired link', () => {
    render(<PartnershipsMembersTeachers />);
    expect(
      screen.getByRole('heading', {
        name: /Your best members can become teachers/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Grown from within')).toBeInTheDocument();
    // Teachers story is framed generically for now — no apply flow wired yet.
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('StudioRouter links out to the Studio site in a new tab', () => {
    render(<PartnershipsStudioRouter />);
    expect(
      screen.getByText(/Need something built or advised, not taught/i),
    ).toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', STUDIO_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('MethodTable renders the five-phase cohort lifecycle without the cut columns', () => {
    render(<PartnershipsMethodTable />);
    expect(
      screen.getByRole('heading', { name: /^Five seasons/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('How a cohort partnership runs')).toBeInTheDocument();
    expect(screen.getByText('Audience deep-dive')).toBeInTheDocument();
    expect(screen.getByText('Co-design')).toBeInTheDocument();
    expect(screen.getByText('Deliver live')).toBeInTheDocument();
    expect(screen.getByText('Iterate')).toBeInTheDocument();
    expect(screen.getByText('Outcome')).toBeInTheDocument();
    expect(screen.queryByText('Contracting')).not.toBeInTheDocument();
    expect(screen.queryByText('Consulting')).not.toBeInTheDocument();
  });

  it('NextChapter routes primary to cohort apply and secondary to the Studio site', () => {
    render(<PartnershipsNextChapter />);
    const primary = screen.getByRole('link', {
      name: /Apply for a cohort partnership/i,
    });
    expect(primary).toHaveAttribute('href', '/partnerships/apply?type=cohort');
    const secondary = screen.getByRole('link', {
      name: /Visit HonuVibe Studio/i,
    });
    expect(secondary).toHaveAttribute('href', STUDIO_URL);
    expect(secondary).toHaveAttribute('target', '_blank');
    expect(secondary).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('ApplicationForm renders all required fields and the coral submit', () => {
    render(<PartnershipsApplicationForm />);
    expect(screen.getByLabelText('Your Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Organization Name')).toBeInTheDocument();
    expect(
      screen.getByLabelText('What type of organization are you?'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Submit Partnership Inquiry/i }),
    ).toBeInTheDocument();
  });

  it('ApplicationForm posts to /api/partnerships/submit and shows success', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchSpy);
    render(<PartnershipsApplicationForm />);

    fireEvent.change(screen.getByLabelText('Your Name'), {
      target: { value: 'Aiko Tanaka' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'aiko@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Organization Name'), {
      target: { value: 'Vertice Society' },
    });
    fireEvent.change(
      screen.getByLabelText('What type of organization are you?'),
      { target: { value: 'professional_network' } },
    );
    fireEvent.change(screen.getByLabelText('Tell us about your community'), {
      target: { value: 'Tokyo professionals' },
    });
    fireEvent.change(
      screen.getByLabelText('What kind of program are you imagining?'),
      { target: { value: '5-week bilingual cohort' } },
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Submit Partnership Inquiry/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Inquiry received.' }),
      ).toBeInTheDocument(),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/partnerships/submit',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.full_name).toBe('Aiko Tanaka');
    expect(body.org_type).toBe('professional_network');
    expect(body.source_locale).toBe('en');
  });

  it('renders every Partnerships section without console.error', () => {
    render(
      <>
        <PartnershipsEditorialHero />
        <PartnershipsGrowingCycle />
        <PartnershipsCohortChapter />
        <PartnershipsMonetize />
        <PartnershipsMembersTeachers />
        <PartnershipsStudioRouter />
        <PartnershipsMethodTable />
        <PartnershipsNextChapter />
        <PartnershipsApplicationForm />
      </>,
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
