import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import { VaultStatusCard } from '@/components/billing/VaultStatusCard';

vi.mock('next-intl', () => {
  const billing = en.billing as Record<string, string>;
  return {
    useLocale: () => 'en',
    useTranslations: () => (key: string, vars?: Record<string, unknown>) => {
      const value = billing[key];
      if (typeof value !== 'string') return key;
      if (!vars) return value;
      return Object.entries(vars).reduce<string>(
        (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
        value,
      );
    },
  };
});

const MANAGE_LABEL = en.billing.manage_subscription;

describe('VaultStatusCard — Manage Subscription button', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hides the Manage button for a vault-source account with no billing account (e.g. admin/complimentary)', () => {
    render(
      <VaultStatusCard
        subscriptionStatus="active"
        subscriptionExpiresAt={null}
        vaultSource="subscription"
        activeCourseName={null}
        hasAccess={true}
        hasBillingAccount={false}
      />,
    );

    // Access is real (Active badge shows) but there is nothing to manage.
    expect(screen.getByText(en.billing.vault_active)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: MANAGE_LABEL })).toBeNull();
  });

  it('shows the Manage button when a real billing account exists', () => {
    render(
      <VaultStatusCard
        subscriptionStatus="active"
        subscriptionExpiresAt="2026-08-22T00:00:00Z"
        vaultSource="subscription"
        activeCourseName={null}
        hasAccess={true}
        hasBillingAccount={true}
      />,
    );

    expect(
      screen.getByRole('button', { name: MANAGE_LABEL }),
    ).toBeInTheDocument();
  });

  it('surfaces an error when the portal request fails instead of silently doing nothing', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'No billing account found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(
      <VaultStatusCard
        subscriptionStatus="active"
        subscriptionExpiresAt="2026-08-22T00:00:00Z"
        vaultSource="subscription"
        activeCourseName={null}
        hasAccess={true}
        hasBillingAccount={true}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: MANAGE_LABEL }));

    await waitFor(() => {
      expect(screen.getByText(en.billing.portal_error)).toBeInTheDocument();
    });
  });
});

describe('VaultStatusCard — sponsored partner seat', () => {
  it('names the sponsor and never offers a subscription to manage', () => {
    render(
      <VaultStatusCard
        subscriptionStatus="none"
        subscriptionExpiresAt={null}
        vaultSource="seat"
        activeCourseName={null}
        hasAccess={true}
        // Even with a Stripe customer on file (they bought a course once), a
        // seat is not theirs to manage.
        hasBillingAccount={true}
        sponsorName="SmashHaus"
        sponsorAccessEndsAt="2027-01-31T00:00:00Z"
      />,
    );

    expect(
      screen.getByText(en.billing.vault_sponsored.replace('{partner}', 'SmashHaus')),
    ).toBeInTheDocument();
    expect(screen.getByText(en.billing.vault_sponsored_note)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: MANAGE_LABEL })).toBeNull();
  });

  it('does not upsell a Vault subscription to someone who already has a seat', () => {
    render(
      <VaultStatusCard
        subscriptionStatus="none"
        subscriptionExpiresAt={null}
        vaultSource="seat"
        activeCourseName={null}
        hasAccess={true}
        hasBillingAccount={false}
        sponsorName="SmashHaus"
        sponsorAccessEndsAt={null}
      />,
    );

    expect(screen.queryByText(en.billing.vault_pitch)).toBeNull();
    expect(
      screen.queryByRole('button', { name: en.billing.subscribe_vault }),
    ).toBeNull();
  });

  it('omits the end date when the sponsor window is unknown', () => {
    render(
      <VaultStatusCard
        subscriptionStatus="none"
        subscriptionExpiresAt={null}
        vaultSource="seat"
        activeCourseName={null}
        hasAccess={true}
        hasBillingAccount={false}
        sponsorName="SmashHaus"
        sponsorAccessEndsAt={null}
      />,
    );

    expect(screen.queryByText(/Sponsored access through/)).toBeNull();
  });
});
