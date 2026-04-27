import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import {
  PartnershipsHero,
  PartnershipsWhatYouGet,
  PartnershipsHowItWorks,
  PartnershipsCurrentPartners,
  PartnershipsWhoIsItFor,
  PartnershipsPricing,
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

  it('Hero renders the coral overline + split-color headline', () => {
    render(<PartnershipsHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('Bring AI training');
    expect(h1.textContent).toContain('to your community.');
    expect(screen.getByText('For Organizations')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /Apply for Partnership/i });
    expect(cta).toHaveAttribute('href', '#apply');
  });

  it('WhatYouGet renders four feature cards', () => {
    render(<PartnershipsWhatYouGet />);
    expect(screen.getByText('Custom Curriculum')).toBeInTheDocument();
    expect(screen.getByText('Bilingual Delivery')).toBeInTheDocument();
    expect(screen.getByText('Co-Branded Experience')).toBeInTheDocument();
    expect(screen.getByText('Live + On-Demand')).toBeInTheDocument();
  });

  it('HowItWorks renders four numbered steps with the connecting line', () => {
    render(<PartnershipsHowItWorks />);
    expect(screen.getByText('Discovery Call')).toBeInTheDocument();
    expect(screen.getByText('Custom Proposal')).toBeInTheDocument();
    expect(screen.getByText('Build & Prepare')).toBeInTheDocument();
    expect(screen.getByText('Launch')).toBeInTheDocument();
  });

  it('CurrentPartners shows Vertice "In Session" + the More-partnerships callout (no SmashHaus)', () => {
    render(<PartnershipsCurrentPartners />);
    expect(screen.getByText('Vertice Society × HonuVibe')).toBeInTheDocument();
    expect(screen.getByText('In Session')).toBeInTheDocument();
    expect(screen.getByText('More partnerships launching soon.')).toBeInTheDocument();
    expect(screen.queryByText(/SmashHaus/i)).toBeNull();
    const moreCta = screen.getAllByRole('link', { name: /Apply for Partnership/i });
    expect(moreCta.length).toBeGreaterThan(0);
  });

  it('WhoIsItFor renders three columns including the courses link', () => {
    render(<PartnershipsWhoIsItFor />);
    expect(screen.getByText('Great fit')).toBeInTheDocument();
    expect(screen.getByText('Not the right fit')).toBeInTheDocument();
    expect(screen.getByText('Not sure?')).toBeInTheDocument();
    const coursesLink = screen.getByRole('link', {
      name: /check out our public courses/i,
    });
    expect(coursesLink).toHaveAttribute('href', '/learn');
  });

  it('Pricing renders three tiers with the highlighted Full plan', () => {
    render(<PartnershipsPricing />);
    expect(screen.getByText('Starter Program')).toBeInTheDocument();
    expect(screen.getByText('Full Program')).toBeInTheDocument();
    expect(screen.getByText('Enterprise / Custom')).toBeInTheDocument();
    expect(screen.getByText('$5,000')).toBeInTheDocument();
    expect(screen.getByText('$12,000')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
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
      screen.getByLabelText('Tell us about your community'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('What kind of program are you imagining?'),
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

  it('ApplicationForm shows an error alert when the POST fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );
    render(<PartnershipsApplicationForm />);
    fireEvent.change(screen.getByLabelText('Your Name'), {
      target: { value: 'A' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'a@b.co' },
    });
    fireEvent.change(screen.getByLabelText('Organization Name'), {
      target: { value: 'Org' },
    });
    fireEvent.change(
      screen.getByLabelText('What type of organization are you?'),
      { target: { value: 'company' } },
    );
    fireEvent.change(screen.getByLabelText('Tell us about your community'), {
      target: { value: 'x' },
    });
    fireEvent.change(
      screen.getByLabelText('What kind of program are you imagining?'),
      { target: { value: 'y' } },
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Submit Partnership Inquiry/i }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Something went wrong/i);
  });

  it('renders every Partnerships section without console.error', () => {
    render(
      <>
        <PartnershipsHero />
        <PartnershipsWhatYouGet />
        <PartnershipsHowItWorks />
        <PartnershipsCurrentPartners />
        <PartnershipsWhoIsItFor />
        <PartnershipsPricing />
        <PartnershipsApplicationForm />
      </>,
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
