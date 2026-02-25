import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AccessGate } from '@/components/library/AccessGate';

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

const defaultProps = {
  thumbnailUrl: '/images/test-thumb.jpg',
  videoSlug: 'test-video',
  locale: 'en',
  translations: {
    heading: 'Create a free account to watch',
    sub: 'Get access to the full tutorial library.',
    button: 'Sign Up Free',
    login: 'Already have an account? Log in',
  },
};

describe('AccessGate', () => {
  it('renders the heading and subtext', () => {
    render(<AccessGate {...defaultProps} />);
    expect(screen.getByText('Create a free account to watch')).toBeInTheDocument();
    expect(screen.getByText('Get access to the full tutorial library.')).toBeInTheDocument();
  });

  it('renders the sign up button', () => {
    render(<AccessGate {...defaultProps} />);
    expect(screen.getByText('Sign Up Free')).toBeInTheDocument();
  });

  it('renders the login link', () => {
    render(<AccessGate {...defaultProps} />);
    expect(screen.getByText('Already have an account? Log in')).toBeInTheDocument();
  });

  it('has correct signup URL with redirect', () => {
    render(<AccessGate {...defaultProps} />);
    const signupLink = screen.getByText('Sign Up Free').closest('a');
    expect(signupLink?.getAttribute('href')).toContain('/learn/auth');
    expect(signupLink?.getAttribute('href')).toContain('redirect=');
  });

  it('renders thumbnail as blurred background', () => {
    const { container } = render(<AccessGate {...defaultProps} />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.className).toContain('blur-sm');
  });

  it('renders fallback background when no thumbnail', () => {
    const { container } = render(<AccessGate {...defaultProps} thumbnailUrl={null} />);
    const fallback = container.querySelector('.bg-bg-tertiary');
    expect(fallback).toBeInTheDocument();
  });
});
