import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlatformIcon } from '@/components/resources/PlatformIcon';

describe('PlatformIcon', () => {
  const platforms = ['youtube', 'x', 'linkedin', 'instagram', 'tiktok', 'podcast', 'newsletter', 'website'];

  it.each(platforms)('renders an SVG for platform "%s"', (platform) => {
    const { container } = render(<PlatformIcon platform={platform} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders a fallback icon for unknown platforms', () => {
    const { container } = render(<PlatformIcon platform="unknown-platform" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies custom size', () => {
    const { container } = render(<PlatformIcon platform="youtube" size={32} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<PlatformIcon platform="youtube" className="text-red-500" />);
    const svg = container.querySelector('svg');
    expect(svg?.className.baseVal || svg?.getAttribute('class')).toContain('text-red-500');
  });
});
