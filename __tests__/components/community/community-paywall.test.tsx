import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { CommunityPaywall } from '@/components/community/CommunityPaywall';
import en from '@/messages/en.json';
import ja from '@/messages/ja.json';

vi.mock('next/navigation', () => ({
  usePathname: () => '/learn/dashboard/community',
}));
vi.mock('@/lib/analytics', () => ({
  trackCommunityPaywallViewed: vi.fn(),
  trackCommunityPaywallCtaClicked: vi.fn(),
}));

// Honu Community is free since 078: the "paywall" is now only a fallback for a
// signed-in session whose profile row is missing. It must never sell anything.
describe.each([
  ['en', en, ''],
  ['ja', ja, '/ja'],
] as const)('CommunityPaywall fallback (%s)', (locale, messages, prefix) => {
  function renderPaywall() {
    const onError = vi.fn();
    const view = render(
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="Pacific/Honolulu"
        onError={onError}
      >
        <CommunityPaywall />
      </NextIntlClientProvider>,
    );
    return { ...view, onError };
  }

  it('renders the profile-setup fallback with no missing translations', () => {
    const { onError } = renderPaywall();
    expect(
      screen.getByRole('heading', { name: messages.community.paywall_title }),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.community.paywall_subtitle)).toBeInTheDocument();
    expect(onError).not.toHaveBeenCalled();
  });

  it('links to contact and the course catalog, never to checkout', () => {
    const { container } = renderPaywall();
    expect(
      screen.getByRole('link', { name: messages.community.paywall_contact }),
    ).toHaveAttribute('href', `${prefix}/contact`);
    expect(
      screen.getByRole('link', { name: new RegExp(messages.community.paywall_cta_courses) }),
    ).toHaveAttribute('href', `${prefix}/learn`);

    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs.some((h) => h?.includes('/api/stripe'))).toBe(false);
  });
});
