import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUsePathname = vi.fn(() => '/');

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

import { ConditionalMain } from '@/components/layout/conditional-nav';

/**
 * Phase 6 widened ConditionalMain's no-padding decision to cover marketing
 * routes (in addition to auth-shell routes), so MarketingShell could drop its
 * legacy -mt-14 md:-mt-16 compensation hack. If anyone re-adds pt-14 here for
 * a marketing path, the marketing pages will visually push down by 56-64px.
 * This test guards that regression.
 */

describe('ConditionalMain padding gate', () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
  });

  it.each(['/', '/ja', '/learn', '/ja/learn', '/explore', '/about', '/contact', '/partnerships'])(
    'omits dark-Nav padding on marketing route %s',
    (pathname) => {
      mockUsePathname.mockReturnValue(pathname);
      const { container } = render(
        <ConditionalMain>
          <p>x</p>
        </ConditionalMain>,
      );
      const main = container.firstElementChild as HTMLElement;
      expect(main.tagName).toBe('MAIN');
      expect(main.className).not.toContain('pt-14');
      expect(main.className).not.toContain('md:pt-16');
    },
  );

  it.each(['/learn/dashboard', '/ja/learn/vault', '/admin', '/admin/courses'])(
    'omits dark-Nav padding on auth-shell route %s',
    (pathname) => {
      mockUsePathname.mockReturnValue(pathname);
      const { container } = render(
        <ConditionalMain>
          <p>x</p>
        </ConditionalMain>,
      );
      const main = container.firstElementChild as HTMLElement;
      expect(main.className).not.toContain('pt-14');
    },
  );

  it.each(['/blog', '/blog/some-post', '/glossary', '/glossary/transformer', '/honuhub', '/privacy', '/terms'])(
    'keeps dark-Nav padding on legacy public route %s',
    (pathname) => {
      mockUsePathname.mockReturnValue(pathname);
      const { container } = render(
        <ConditionalMain>
          <p>x</p>
        </ConditionalMain>,
      );
      const main = container.firstElementChild as HTMLElement;
      expect(main.className).toContain('pt-14');
      expect(main.className).toContain('md:pt-16');
    },
  );
});
