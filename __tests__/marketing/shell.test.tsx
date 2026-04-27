import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MarketingShell } from '@/components/marketing/shell';

describe('MarketingShell', () => {
  it('applies data-shell="marketing" so --m-* tokens activate', () => {
    const { container } = render(
      <MarketingShell>
        <p>hello</p>
      </MarketingShell>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.getAttribute('data-shell')).toBe('marketing');
  });

  it('renders its children', () => {
    const { getByText } = render(
      <MarketingShell>
        <p>marketing-content</p>
      </MarketingShell>,
    );
    expect(getByText('marketing-content')).toBeInTheDocument();
  });

  it('does not apply the legacy negative top margin (Phase 6 removed the compensation hack)', () => {
    // ConditionalMain now skips its dark-Nav pt-14 md:pt-16 on marketing
    // routes, so MarketingShell no longer needs to negate it.
    const { container } = render(
      <MarketingShell>
        <p>x</p>
      </MarketingShell>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain('-mt-');
  });

  it('allows callers to extend className', () => {
    const { container } = render(
      <MarketingShell className="extra-class">
        <p>x</p>
      </MarketingShell>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('extra-class');
  });
});
