/**
 * Cohort registry — source of truth for Live Cohort offerings.
 *
 * Each cohort = its own Stripe product (so prices, dates, and capacity stay
 * independent per cohort). Adding a new cohort means:
 *   1. Create a Stripe product + USD price.
 *   2. Add an env var.
 *   3. Add an entry to COHORT_REGISTRY.
 *
 * Cohort buyers receive Vault + Community access for
 * (endDate + bundleDaysAfterEnd). 90 days post-cohort covers momentum.
 */

export type CohortId = 'may2026';

interface CohortConfig {
  priceEnvVar: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  bundleDaysAfterEnd: number;
  displayName: string;
  partnerSlug: string;
}

export const COHORT_REGISTRY: Record<CohortId, CohortConfig> = {
  may2026: {
    priceEnvVar: 'STRIPE_COHORT_MAY2026_PRICE_USD',
    startDate: '2026-05-23',
    endDate: '2026-06-27',
    bundleDaysAfterEnd: 90,
    displayName: 'Vertice Cohort — May 2026',
    partnerSlug: 'vertice-society',
  },
};

export function isCohortId(value: string): value is CohortId {
  return value in COHORT_REGISTRY;
}

export function getCohortPriceId(cohortId: CohortId): string {
  const config = COHORT_REGISTRY[cohortId];
  const priceId = process.env[config.priceEnvVar];
  if (!priceId) {
    throw new Error(
      `[Stripe] Missing env var ${config.priceEnvVar} for cohort '${cohortId}'`,
    );
  }
  return priceId;
}

/**
 * Compute the bundle access window for a cohort purchase.
 * Returns ISO timestamps for the cohort_enrollments row.
 */
export function getCohortBundleWindow(cohortId: CohortId): {
  starts_at: string;
  ends_at: string;
} {
  const config = COHORT_REGISTRY[cohortId];
  const startsAt = new Date(`${config.startDate}T00:00:00Z`);
  const endsAt = new Date(`${config.endDate}T23:59:59Z`);
  endsAt.setUTCDate(endsAt.getUTCDate() + config.bundleDaysAfterEnd);

  return {
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
  };
}
