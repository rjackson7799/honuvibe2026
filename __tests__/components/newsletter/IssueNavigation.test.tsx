import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IssueNavigation } from '@/components/newsletter/IssueNavigation';

// Mock i18n navigation Link
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const prevIssue = {
  title: 'Previous Issue Title',
  slug: { current: 'prev-issue' },
  issueNumber: 10,
};

const nextIssue = {
  title: 'Next Issue Title',
  slug: { current: 'next-issue' },
  issueNumber: 12,
};

describe('IssueNavigation', () => {
  it('renders both prev and next when both are provided', () => {
    render(
      <IssueNavigation
        prev={prevIssue}
        next={nextIssue}
        prevLabel="← Previous Issue"
        nextLabel="Next Issue →"
      />,
    );
    expect(screen.getByText('← Previous Issue')).toBeInTheDocument();
    expect(screen.getByText('Next Issue →')).toBeInTheDocument();
    expect(screen.getByText('Previous Issue Title')).toBeInTheDocument();
    expect(screen.getByText('Next Issue Title')).toBeInTheDocument();
  });

  it('renders only prev when next is not provided', () => {
    render(
      <IssueNavigation
        prev={prevIssue}
        prevLabel="← Previous Issue"
        nextLabel="Next Issue →"
      />,
    );
    expect(screen.getByText('Previous Issue Title')).toBeInTheDocument();
    expect(screen.queryByText('Next Issue Title')).not.toBeInTheDocument();
  });

  it('renders only next when prev is not provided', () => {
    render(
      <IssueNavigation
        next={nextIssue}
        prevLabel="← Previous Issue"
        nextLabel="Next Issue →"
      />,
    );
    expect(screen.getByText('Next Issue Title')).toBeInTheDocument();
    expect(screen.queryByText('Previous Issue Title')).not.toBeInTheDocument();
  });

  it('returns null when neither prev nor next is provided', () => {
    const { container } = render(
      <IssueNavigation
        prevLabel="← Previous Issue"
        nextLabel="Next Issue →"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('links prev to the correct URL', () => {
    render(
      <IssueNavigation
        prev={prevIssue}
        prevLabel="← Previous Issue"
        nextLabel="Next Issue →"
      />,
    );
    const link = screen.getByText('Previous Issue Title').closest('a');
    expect(link).toHaveAttribute('href', '/newsletter/prev-issue');
  });

  it('links next to the correct URL', () => {
    render(
      <IssueNavigation
        next={nextIssue}
        prevLabel="← Previous Issue"
        nextLabel="Next Issue →"
      />,
    );
    const link = screen.getByText('Next Issue Title').closest('a');
    expect(link).toHaveAttribute('href', '/newsletter/next-issue');
  });
});
