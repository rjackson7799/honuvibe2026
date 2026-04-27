import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import {
  ContactHero,
  ContactForm,
  ContactInfoStrip,
  ContactSocialSection,
} from '@/components/marketing/contact';

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
    function t(key: string, vars?: Record<string, unknown>): string {
      const path = key.split('.');
      let cur: unknown = base;
      for (const p of path) {
        if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
          cur = (cur as Record<string, unknown>)[p];
        } else {
          cur = undefined;
          break;
        }
      }
      if (typeof cur !== 'string') return key;
      const flattened = cur.replace(/<\/?[^>]+>/g, '');
      if (!vars) return flattened;
      return Object.entries(vars).reduce<string>(
        (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
        flattened,
      );
    }
    return t;
  }

  return {
    useTranslations: (namespace: string) => tFor(namespace),
  };
});

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('Contact page sections', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('Hero renders the two-line headline + mailto pill', () => {
    render(<ContactHero />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain("We'd love to");
    expect(h1.textContent).toContain('hear from you.');
    const mailto = screen.getByRole('link', { name: /hello@honuvibe.ai/i });
    expect(mailto).toHaveAttribute('href', 'mailto:hello@honuvibe.ai');
  });

  it('ContactForm renders all fields and the new 5-option subject set', () => {
    render(<ContactForm />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    const subject = screen.getByLabelText('Subject') as HTMLSelectElement;
    expect(subject).toBeInTheDocument();
    const options = Array.from(subject.querySelectorAll('option')).map(
      (o) => o.value,
    );
    expect(options).toEqual([
      'general',
      'course',
      'partnership',
      'media',
      'other',
    ]);
    expect(
      screen.getByRole('button', { name: /Send Message/i }),
    ).toBeInTheDocument();
  });

  it('ContactForm shows success state after a successful POST', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      }),
    );
    render(<ContactForm />);
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Tester' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Hello there' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Message/i }));

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Message sent.' }),
      ).toBeInTheDocument(),
    );
    expect(fetch).toHaveBeenCalledWith(
      '/api/contact/submit',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('ContactForm shows an error alert when the POST fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'boom' }),
      }),
    );
    render(<ContactForm />);
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Tester' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Hello there' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Message/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Something went wrong/i);
  });

  it('ContactForm character counter reflects message length', () => {
    render(<ContactForm />);
    const message = screen.getByLabelText('Message') as HTMLTextAreaElement;
    fireEvent.change(message, { target: { value: 'A'.repeat(150) } });
    expect(screen.getByText('150 / 2000')).toBeInTheDocument();
  });

  it('InfoStrip shows three info cards with the contact email + response window', () => {
    render(<ContactInfoStrip />);
    expect(screen.getByText('hello@honuvibe.ai')).toBeInTheDocument();
    expect(screen.getByText('Honolulu, Hawaii (Global)')).toBeInTheDocument();
    expect(screen.getByText('Within 2 business days')).toBeInTheDocument();
  });

  it('SocialSection renders four cards including LinkedIn (not LINE)', () => {
    render(<ContactSocialSection />);
    expect(
      screen.getByRole('heading', { name: 'Follow along.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /TikTok/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Instagram/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /YouTube/ })).toBeInTheDocument();
    const linkedin = screen.getByRole('link', { name: /LinkedIn/ });
    expect(linkedin).toHaveAttribute(
      'href',
      expect.stringContaining('linkedin'),
    );
    expect(screen.queryByRole('link', { name: /^LINE$/ })).toBeNull();
  });

  it('renders every Contact section without console.error', () => {
    render(
      <>
        <ContactHero />
        <ContactForm />
        <ContactInfoStrip />
        <ContactSocialSection />
      </>,
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
