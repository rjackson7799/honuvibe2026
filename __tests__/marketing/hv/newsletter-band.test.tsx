import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HvNewsletterBand } from '@/components/marketing/hv/newsletter-band';

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) =>
    (
      ({
        hv_heading: 'Join the wave.',
        hv_body: 'Weekly insights.',
        hv_placeholder: 'you@example.com',
        hv_success: 'Thanks. Your first issue arrives this week.',
        email_label: 'Email address',
        cta: 'Subscribe',
        error: 'Something went wrong.',
      }) as Record<string, string>
    )[key] ?? key,
}));

describe('HvNewsletterBand', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('posts the email with the page source and shows the thank-you line', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    render(<HvNewsletterBand source="learn" />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'a@b.co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Thanks. Your first issue arrives this week.'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/newsletter/subscribe',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'a@b.co', source: 'learn' }) }),
    );
    expect(screen.queryByRole('button', { name: 'Subscribe' })).toBeNull();
  });

  it('surfaces the API error and keeps the form', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Already subscribed' }) }),
    );
    render(<HvNewsletterBand source="home" />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'a@b.co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Already subscribed'));
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument();
  });

  it('keeps the #newsletter anchor the footer links to', () => {
    vi.stubGlobal('fetch', vi.fn());
    const { container } = render(<HvNewsletterBand source="home" />);
    expect((container.firstElementChild as HTMLElement).id).toBe('newsletter');
  });
});
