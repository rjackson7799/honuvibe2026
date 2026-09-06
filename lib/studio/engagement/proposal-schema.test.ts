import { describe, expect, it } from 'vitest';
import { buildUsdOffer } from './proposal-pricing';
import {
  acceptedByNameSchema,
  performanceTermsSchema,
  pricedOfferSchema,
  proposalInputSchema,
  proposalSectionsSchema,
  voidReasonSchema,
} from './proposal-schema';
import { seedSections } from './proposal-terms';

const OFFER = buildUsdOffer({ tier: 'starter', addons: { booking: true, aiChat: true }, timeline: 'asap' }, { label: 'Discount', build: -15000, monthly: 0 });

describe('pricedOfferSchema', () => {
  it('accepts a calculator-built offer', () => {
    expect(pricedOfferSchema.safeParse(OFFER).success).toBe(true);
  });

  it('rejects stored totals that disagree with totalsOf', () => {
    const r = pricedOfferSchema.safeParse({ ...OFFER, total_build: 87501 });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/total_build/);
    expect(pricedOfferSchema.safeParse({ ...OFFER, total_monthly: 1 }).success).toBe(false);
  });

  it('rejects non-integer money, negative lines, a negative total, an unlabelled non-zero adjustment, and unknown keys', () => {
    expect(pricedOfferSchema.safeParse({ ...OFFER, base: { ...OFFER.base, build: 500.5 } }).success).toBe(false);
    expect(pricedOfferSchema.safeParse({ ...OFFER, lines: [{ ...OFFER.lines[0], build: -1 }, OFFER.lines[1]] }).success).toBe(false);
    expect(pricedOfferSchema.safeParse({ ...OFFER, adjustment: { label: '', build: -100, monthly: 0 } }).success).toBe(false);
    expect(pricedOfferSchema.safeParse({ ...OFFER, adjustment: { label: 'Huge', build: -900000, monthly: 0 }, total_build: -812500 }).success).toBe(false);
    expect(pricedOfferSchema.safeParse({ ...OFFER, extra: 1 }).success).toBe(false);
  });

  it('JPY carries usd_reference; USD does not', () => {
    expect(pricedOfferSchema.safeParse({ ...OFFER, usd_reference: { total_build: 1, total_monthly: 1 } }).success).toBe(false);
    const jpy = { ...OFFER, currency: 'JPY', usd_reference: { total_build: 102500, total_monthly: 6500 } };
    expect(pricedOfferSchema.safeParse(jpy).success).toBe(true);
    expect(pricedOfferSchema.safeParse({ ...jpy, usd_reference: null }).success).toBe(false);
  });
});

describe('performanceTermsSchema + proposalInputSchema', () => {
  const terms = {
    rate_percent: 10,
    applies_to: 'Net revenue from online bookings',
    qualifying_new: 'A first booking from a customer with no prior visit in 24 months',
    reporting: 'Monthly, by the 5th',
    payment_timing: 'Net 15 after the monthly report',
    tracking_note: null,
  };

  it('rate_percent is an integer 1–100; text fields are bounded', () => {
    expect(performanceTermsSchema.safeParse(terms).success).toBe(true);
    expect(performanceTermsSchema.safeParse({ ...terms, rate_percent: 0 }).success).toBe(false);
    expect(performanceTermsSchema.safeParse({ ...terms, rate_percent: 12.5 }).success).toBe(false);
    expect(performanceTermsSchema.safeParse({ ...terms, applies_to: 'x'.repeat(501) }).success).toBe(false);
    expect(performanceTermsSchema.safeParse({ ...terms, tracking_note: 'x'.repeat(1001) }).success).toBe(false);
  });

  it('performance terms are required iff pricing_mode ≠ fixed', () => {
    const base = {
      title: 'Website + booking',
      currency: 'USD',
      tier: 'starter',
      pricing_mode: 'fixed',
      offer: OFFER,
      performance_terms: null,
      data_basis: 'provisional',
      valid_until: null,
      sections: seedSections('en'),
    };
    expect(proposalInputSchema.safeParse(base).success).toBe(true);
    expect(proposalInputSchema.safeParse({ ...base, performance_terms: terms }).success).toBe(false);
    expect(proposalInputSchema.safeParse({ ...base, pricing_mode: 'performance' }).success).toBe(false);
    expect(proposalInputSchema.safeParse({ ...base, pricing_mode: 'performance', performance_terms: terms }).success).toBe(true);
    expect(proposalInputSchema.safeParse({ ...base, pricing_mode: 'hybrid', performance_terms: terms }).success).toBe(true);
    expect(proposalInputSchema.safeParse({ ...base, data_basis: 'guess' }).success).toBe(false);
    expect(proposalInputSchema.safeParse({ ...base, valid_until: '2026-13-01' }).success).toBe(false);
    expect(proposalInputSchema.safeParse({ ...base, valid_until: '2026-10-05' }).success).toBe(true);
    // The offer's currency/tier must agree with the row's.
    expect(proposalInputSchema.safeParse({ ...base, currency: 'JPY' }).success).toBe(false);
    expect(proposalInputSchema.safeParse({ ...base, tier: 'pro' }).success).toBe(false);
  });
});

describe('proposalSectionsSchema', () => {
  it('exactly the seven keys in order; body_md ≤ 8000; titles 1..200', () => {
    const ok = seedSections('en');
    expect(proposalSectionsSchema.safeParse(ok).success).toBe(true);
    expect(proposalSectionsSchema.safeParse(ok.slice(0, 6)).success).toBe(false);
    expect(proposalSectionsSchema.safeParse([ok[1], ok[0], ...ok.slice(2)]).success).toBe(false);
    expect(proposalSectionsSchema.safeParse([...ok.slice(0, 6), { ...ok[6], key: 'extra' }]).success).toBe(false);
    expect(proposalSectionsSchema.safeParse([{ ...ok[0], body_md: 'x'.repeat(8001) }, ...ok.slice(1)]).success).toBe(false);
    expect(proposalSectionsSchema.safeParse([{ ...ok[0], title: '' }, ...ok.slice(1)]).success).toBe(false);
    expect(proposalSectionsSchema.safeParse([{ ...ok[0], body_md: '' }, ...ok.slice(1)]).success).toBe(true); // empty allowed in draft
  });
});

describe('acceptedByNameSchema / voidReasonSchema', () => {
  it('trim then 1..200 / 1..1000', () => {
    expect(acceptedByNameSchema.parse('  Test Client ')).toBe('Test Client');
    expect(acceptedByNameSchema.safeParse('   ').success).toBe(false);
    expect(acceptedByNameSchema.safeParse('x'.repeat(201)).success).toBe(false);
    expect(voidReasonSchema.parse(' wrong tier ')).toBe('wrong tier');
    expect(voidReasonSchema.safeParse('').success).toBe(false);
    expect(voidReasonSchema.safeParse('x'.repeat(1001)).success).toBe(false);
  });
});
