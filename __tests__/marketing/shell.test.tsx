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

  it('compensates for the locale layout <main> padding via negative top margin', () => {
    // When this hack is removed (Phase 5 cleanup target), update this test
    // to assert the new structural choice.
    const { container } = render(
      <MarketingShell>
        <p>x</p>
      </MarketingShell>,
    );
    const root = container.firstElementChild as HTMLElement;
    // -mt-14 md:-mt-16 — checking the static class string is enough; we don't
    // test computed style because jsdom doesn't apply Tailwind utilities.
    expect(root.className).toContain('-mt-14');
    expect(root.className).toContain('md:-mt-16');
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
