import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import {
  PartnershipsEditorialHero,
  PartnershipsCohortChapter,
  PartnershipsProjectChapter,
  PartnershipsConsultingChapter,
  PartnershipsMethodTable,
  PartnershipsNextChapter,
  PartnershipsApplicationForm,
} from '@/components/marketing/partnerships';

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

  it('EditorialHero renders the headline, lede, and three chapter chips', () => {
    render(<PartnershipsEditorialHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('Partner');
    expect(h1.textContent).toContain('with us');
    expect(
      screen.getByText(/HonuVibe partners three ways/i),
    ).toBeInTheDocument();
    const chipCohort = screen.getByRole('link', {
      name: /Community & organizational learning/i,
    });
    expect(chipCohort).toHaveAttribute('href', '#cohort');
    const chipProject = screen.getByRole('link', {
      name: /Building out your project/i,
    });
    expect(chipProject).toHaveAttribute('href', '#project');
    const chipConsulting = screen.getByRole('link', {
      name: /Strategy, audits & AI-ops/i,
    });
    expect(chipConsulting).toHaveAttribute('href', '#consulting');
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

  it('ProjectChapter shows three "currently building" tiles and project CTA', () => {
    render(<PartnershipsProjectChapter />);
    expect(screen.getByText('A bilingual healthcare archive')).toBeInTheDocument();
    expect(screen.getByText('A photography archive rebuild')).toBeInTheDocument();
    expect(screen.getByText('Your project here')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /Tell us about your project/i });
    expect(cta).toHaveAttribute('href', '/partnerships/apply?type=project');
  });

  it('ConsultingChapter shows artifact preview and consulting CTA', () => {
    render(<PartnershipsConsultingChapter />);
    expect(screen.getByText(/honuvibe audit/i)).toBeInTheDocument();
    const cta = screen.getByRole('link', {
      name: /Book a consulting intro call/i,
    });
    expect(cta).toHaveAttribute(
      'href',
      '/partnerships/apply?type=consulting',
    );
  });

  it('MethodTable renders the three engagement columns and five workflow rows', () => {
    render(<PartnershipsMethodTable />);
    expect(
      screen.getByRole('heading', { name: /^Method/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Private cohorts').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Contracting').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Consulting').length).toBeGreaterThan(0);
    expect(screen.getByText('Audience deep-dive')).toBeInTheDocument();
    expect(screen.getByText('Co-design / SOW')).toBeInTheDocument();
    expect(screen.getByText('Sprint & ship')).toBeInTheDocument();
    expect(screen.getByText('Co-deliver + iterate')).toBeInTheDocument();
    expect(screen.getByText('Outcome')).toBeInTheDocument();
  });

  it('NextChapter shows dual CTAs routing to /apply and /explore', () => {
    render(<PartnershipsNextChapter />);
    const primary = screen.getByRole('link', { name: /Start an inquiry/i });
    expect(primary).toHaveAttribute('href', '/partnerships/apply');
    const secondary = screen.getByRole('link', { name: /See recent work/i });
    expect(secondary).toHaveAttribute('href', '/explore');
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
        <PartnershipsCohortChapter />
        <PartnershipsProjectChapter />
        <PartnershipsConsultingChapter />
        <PartnershipsMethodTable />
        <PartnershipsNextChapter />
        <PartnershipsApplicationForm />
      </>,
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
