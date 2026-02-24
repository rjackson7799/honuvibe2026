import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NewsletterIssueCard } from '@/components/newsletter/NewsletterIssueCard';

// Mock i18n navigation Link
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

const defaultProps = {
  title: 'How I Built a SaaS MVP in 48 Hours Using Claude',
  excerpt: 'This week I walked through my process of going from idea to working prototype.',
  slug: { current: 'saas-mvp-48-hours' },
  issueNumber: 12,
  publishedAt: '2026-01-15T00:00:00Z',
  locale: 'en',
  issueLabel: 'Issue #12',
  readIssueLabel: 'Read Issue',
};

describe('NewsletterIssueCard', () => {
  it('renders the issue title', () => {
    render(<NewsletterIssueCard {...defaultProps} />);
    expect(screen.getByText('How I Built a SaaS MVP in 48 Hours Using Claude')).toBeInTheDocument();
  });

  it('renders the excerpt', () => {
    render(<NewsletterIssueCard {...defaultProps} />);
    expect(screen.getByText('This week I walked through my process of going from idea to working prototype.')).toBeInTheDocument();
  });

  it('renders the issue label', () => {
    render(<NewsletterIssueCard {...defaultProps} />);
    expect(screen.getByText('Issue #12')).toBeInTheDocument();
  });

  it('renders a date element with the correct datetime attribute', () => {
    render(<NewsletterIssueCard {...defaultProps} />);
    const timeEl = screen.getByRole('link').querySelector('time');
    expect(timeEl).toBeInTheDocument();
    expect(timeEl).toHaveAttribute('datetime', '2026-01-15T00:00:00Z');
  });

  it('renders reading time when provided', () => {
    render(
      <NewsletterIssueCard
        {...defaultProps}
        readingTime={4}
        readingTimeLabel="4 min read"
      />,
    );
    expect(screen.getByText('4 min read')).toBeInTheDocument();
  });

  it('does not render reading time when not provided', () => {
    render(<NewsletterIssueCard {...defaultProps} />);
    expect(screen.queryByText(/min read/)).not.toBeInTheDocument();
  });

  it('links to the correct EN newsletter URL', () => {
    render(<NewsletterIssueCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/newsletter/saas-mvp-48-hours');
  });

  it('renders the "Read Issue" CTA', () => {
    render(<NewsletterIssueCard {...defaultProps} />);
    expect(screen.getByText('Read Issue →')).toBeInTheDocument();
  });

  it('renders a time element in JP locale', () => {
    render(<NewsletterIssueCard {...defaultProps} locale="ja" />);
    const timeEl = screen.getByRole('link').querySelector('time');
    expect(timeEl).toBeInTheDocument();
    // JP date format includes 年 (year), 月 (month), 日 (day)
    expect(timeEl?.textContent).toMatch(/\d{4}年\d{1,2}月\d{1,2}日/);
  });
});
