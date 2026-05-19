/**
 * Tier registry — single source of truth for HonuVibe paid tiers.
 *
 * USD only. JP-locale customers see the same USD prices.
 *
 * Cohorts use a separate registry (lib/stripe/cohorts.ts) keyed by cohort_id,
 * because each cohort has its own Stripe product and date metadata.
 */

export type SubscriptionTier = 'community' | 'vault';
export type Tier = SubscriptionTier | 'cohort';

interface TierConfig {
  mode: 'subscription' | 'payment';
  trialDays?: number;
  priceEnvVar: string;
  displayName: string;
}

export const TIER_REGISTRY: Record<SubscriptionTier, TierConfig> = {
  community: {
    mode: 'subscription',
    trialDays: 14,
    priceEnvVar: 'STRIPE_COMMUNITY_PRICE_USD',
    displayName: 'HonuVibe Community — Monthly',
  },
  vault: {
    mode: 'subscription',
    priceEnvVar: 'STRIPE_VAULT_PRICE_USD',
    displayName: 'HonuVibe Vault — Monthly',
  },
};

/**
 * Legacy Vault price IDs that should still resolve to 'vault' tier.
 * Existing live-mode subscribers from before the $49 reprice may still be
 * billed against these prices until we run a deliberate subscriptions.update
 * migration. The webhook MUST treat these as 'vault' so events for these
 * subscribers don't get silently skipped.
 */
export const LEGACY_VAULT_PRICE_IDS: readonly string[] = [
  'price_1T6pF0KnFgO2lCd9JpL1Dfvs',
  'price_1T6pIMKnFgO2lCd9edvw00Zr',
];

/**
 * Get the configured Stripe price ID for a subscription tier.
 * Throws if the env var is missing — fail loud at request time, not at runtime
 * with a confusing Stripe error.
 */
export function getSubscriptionPriceId(tier: SubscriptionTier): string {
  const config = TIER_REGISTRY[tier];
  const priceId = process.env[config.priceEnvVar];
  if (!priceId) {
    throw new Error(
      `[Stripe] Missing env var ${config.priceEnvVar} for tier '${tier}'`,
    );
  }
  return priceId;
}

/**
 * Resolve a Stripe price ID back to a subscription tier.
 *
 * Used by webhook handlers for customer.subscription.* and invoice.paid
 * events, where the tier isn't on the event metadata but the price ID is.
 *
 * Returns undefined for unknown price IDs — caller should log and skip
 * rather than guess (data drift indicator).
 */
export function resolveSubscriptionTier(
  priceId: string,
): SubscriptionTier | undefined {
  const communityId = process.env.STRIPE_COMMUNITY_PRICE_USD;
  const vaultId = process.env.STRIPE_VAULT_PRICE_USD;

  if (communityId && priceId === communityId) return 'community';
  if (vaultId && priceId === vaultId) return 'vault';
  if (LEGACY_VAULT_PRICE_IDS.includes(priceId)) return 'vault';

  return undefined;
}

/**
 * Get the payments.type value for a subscription renewal of the given tier.
 * Used by the invoice.paid handler.
 */
export function paymentTypeForRenewal(
  tier: SubscriptionTier,
): 'community_renewal' | 'vault_renewal' {
  return tier === 'community' ? 'community_renewal' : 'vault_renewal';
}
