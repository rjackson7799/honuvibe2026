import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewsletterSubscribeBlock } from '@/components/newsletter/NewsletterSubscribeBlock';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

// Mock Button component to simplify test
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}));

describe('NewsletterSubscribeBlock', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mock('next-intl', () => ({
      useTranslations: () => (key: string) => key,
    }));
    vi.mock('@/lib/analytics', () => ({
      trackEvent: vi.fn(),
    }));
    vi.mock('@/components/ui/button', () => ({
      Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
        <button {...props}>{children}</button>
      ),
    }));
  });

  it('renders the heading and sub text', () => {
    render(<NewsletterSubscribeBlock locale="en" sourcePage="newsletter_index" />);
    expect(screen.getByText('subscribe_heading')).toBeInTheDocument();
    expect(screen.getByText('subscribe_sub')).toBeInTheDocument();
  });

  it('renders an email input', () => {
    render(<NewsletterSubscribeBlock locale="en" sourcePage="newsletter_index" />);
    const input = screen.getByPlaceholderText('subscribe_placeholder');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'email');
  });

  it('renders a submit button', () => {
    render(<NewsletterSubscribeBlock locale="en" sourcePage="newsletter_index" />);
    expect(screen.getByText('subscribe_button')).toBeInTheDocument();
  });

  it('email input has 16px font to prevent iOS zoom', () => {
    render(<NewsletterSubscribeBlock locale="en" sourcePage="newsletter_index" />);
    const input = screen.getByPlaceholderText('subscribe_placeholder');
    expect(input.className).toContain('text-[16px]');
  });

  it('shows success message after successful submit', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true });

    render(<NewsletterSubscribeBlock locale="en" sourcePage="newsletter_index" />);

    const input = screen.getByPlaceholderText('subscribe_placeholder');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('success')).toBeInTheDocument();
    });
  });

  it('shows error message after failed submit', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false });

    render(<NewsletterSubscribeBlock locale="en" sourcePage="newsletter_index" />);

    const input = screen.getByPlaceholderText('subscribe_placeholder');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
  });
});
