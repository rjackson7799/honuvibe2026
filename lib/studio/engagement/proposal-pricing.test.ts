import { describe, expect, it } from 'vitest';
import { calculatePricing, RUSH_MULTIPLIER, type PricingInput } from '@/lib/pricing';
import {
  OfferError,
  buildCustomOffer,
  buildJpyOffer,
  buildUsdOffer,
  totalsOf,
  usdOfferMatchesCalculator,
} from './proposal-pricing';

// The click-path offer: Starter + booking + AI chat + asap − $150 = $875 / $65.
const INPUTS: PricingInput = { tier: 'starter', addons: { booking: true, aiChat: true }, timeline: 'asap' };
const DISCOUNT = { label: 'Founding-client discount', build: -15000, monthly: 0 };

describe('buildUsdOffer', () => {
  it('base = baseBuild × 100 (unrushed); rush is an explicit line only when asap; lines = calculator × 100', () => {
    const offer = buildUsdOffer(INPUTS, DISCOUNT);
    const result = calculatePricing(INPUTS);
    expect(offer.currency).toBe('USD');
    expect(offer.tier).toBe('starter');
    expect(offer.base).toEqual({ label: 'Starter build', build: 50000, monthly: 2500 });
    expect(offer.rush).toEqual({ label: 'Rush delivery (ASAP)', build: (Math.round(500 * RUSH_MULTIPLIER) - 500) * 100 });
    expect(offer.rush!.build).toBe(12500);
    expect(offer.lines.map((l) => [l.id, l.build, l.monthly])).toEqual([
      ['booking', 25000, 1500],
      ['ai_chat', 15000, 2500],
    ]);
    expect(offer.lines[0].value).toBe(result.lines[0].value);
    expect(offer.adjustment).toEqual(DISCOUNT);
    expect(offer.usd_reference).toBeNull();
    expect(offer.total_build).toBe(87500);
    expect(offer.total_monthly).toBe(6500);
    // The cross-check the plan pins: totalsOf equals the calculator's total + the adjustment.
    expect(totalsOf(offer).total_build).toBe(result.totalBuild * 100 + DISCOUNT.build);
    expect(totalsOf(offer).total_monthly).toBe(result.totalMonthly * 100 + DISCOUNT.monthly);
  });

  it('no rush line when the timeline is not asap; the total then equals the calculator exactly', () => {
    const inputs: PricingInput = { tier: 'pro', timeline: 'no_rush', contentReadiness: 'need_help' };
    const offer = buildUsdOffer(inputs, null);
    expect(offer.rush).toBeNull();
    expect(offer.adjustment).toBeNull();
    expect(offer.total_build).toBe(calculatePricing(inputs).totalBuild * 100);
    expect(offer.total_build).toBe(280000);
    expect(offer.total_monthly).toBe(7500);
  });

  it('adjustment is signed; a discount cannot make the offer negative; label required when non-zero', () => {
    expect(buildUsdOffer(INPUTS, { label: 'Referral bonus', build: 5000, monthly: 500 }).total_build).toBe(107500);
    expect(() => buildUsdOffer(INPUTS, { label: 'Too big', build: -200000, monthly: 0 })).toThrow(OfferError);
    expect(() => buildUsdOffer(INPUTS, { label: '  ', build: -100, monthly: 0 })).toThrow(/label/);
    expect(() => buildUsdOffer(INPUTS, { label: 'Half cents', build: -0.5, monthly: 0 })).toThrow(/integer/);
    // A zero adjustment collapses to null.
    expect(buildUsdOffer(INPUTS, { label: '', build: 0, monthly: 0 }).adjustment).toBeNull();
  });

  it('refuses ai_native (custom-quoted) — buildCustomOffer is that path', () => {
    expect(() => buildUsdOffer({ tier: 'ai_native' }, null)).toThrow(OfferError);
  });

  it('usdOfferMatchesCalculator: the server re-run rejects a payload whose base/rush/lines differ', () => {
    const offer = buildUsdOffer(INPUTS, DISCOUNT);
    expect(usdOfferMatchesCalculator(offer)).toBe(true);
    expect(usdOfferMatchesCalculator({ ...offer, base: { ...offer.base, build: 40000 } })).toBe(false);
    expect(usdOfferMatchesCalculator({ ...offer, rush: null })).toBe(false);
    expect(usdOfferMatchesCalculator({ ...offer, lines: offer.lines.slice(1) })).toBe(false);
    expect(usdOfferMatchesCalculator({ ...offer, lines: [{ ...offer.lines[0], monthly: 0 }, offer.lines[1]] })).toBe(false);
    // The adjustment is the one free-form money on a USD offer — it does not affect the match.
    expect(usdOfferMatchesCalculator({ ...offer, adjustment: null })).toBe(true);
  });
});

describe('buildJpyOffer', () => {
  const YEN = {
    base: { build: 75000, monthly: 3800 },
    rush: 18000,
    lines: { booking: { build: 37000, monthly: 2200 }, ai_chat: { build: 22000, monthly: 3800 } },
    adjustment: { label: '創業割引', build: -20000, monthly: 0 },
  };

  it('every yen figure is kept exactly as typed; usd_reference equals the USD computation; no multiplication', () => {
    const offer = buildJpyOffer(INPUTS, YEN);
    expect(offer.currency).toBe('JPY');
    expect(offer.base).toEqual({ label: 'Starter build', build: 75000, monthly: 3800 });
    expect(offer.rush).toEqual({ label: 'Rush delivery (ASAP)', build: 18000 });
    expect(offer.lines.map((l) => [l.id, l.build, l.monthly])).toEqual([
      ['booking', 37000, 2200],
      ['ai_chat', 22000, 3800],
    ]);
    expect(offer.adjustment).toEqual(YEN.adjustment);
    const usd = calculatePricing(INPUTS);
    expect(offer.usd_reference).toEqual({ total_build: usd.totalBuild * 100, total_monthly: usd.totalMonthly * 100 });
    expect(offer.total_build).toBe(75000 + 18000 + 37000 + 22000 - 20000);
    expect(offer.total_monthly).toBe(3800 + 2200 + 3800);
    expect(totalsOf(offer)).toEqual({ total_build: offer.total_build, total_monthly: offer.total_monthly });
  });

  it('non-integer / negative yen rejected; a rush figure is required exactly when asap; every calculator line must be typed', () => {
    expect(() => buildJpyOffer(INPUTS, { ...YEN, base: { build: 75000.5, monthly: 3800 } })).toThrow(/integer/);
    expect(() => buildJpyOffer(INPUTS, { ...YEN, lines: { ...YEN.lines, booking: { build: -1, monthly: 0 } } })).toThrow(OfferError);
    expect(() => buildJpyOffer(INPUTS, { ...YEN, rush: null })).toThrow(/rush/);
    expect(() => buildJpyOffer({ ...INPUTS, timeline: 'no_rush' }, YEN)).toThrow(/rush/);
    expect(buildJpyOffer({ ...INPUTS, timeline: 'no_rush' }, { ...YEN, rush: null }).rush).toBeNull();
    expect(() => buildJpyOffer(INPUTS, { ...YEN, lines: { booking: YEN.lines.booking } })).toThrow(/ai_chat/);
    expect(() => buildJpyOffer(INPUTS, { ...YEN, lines: { ...YEN.lines, extra: { build: 1, monthly: 0 } } })).toThrow(/extra/);
  });
});

describe('buildCustomOffer (ai_native)', () => {
  it('custom base / rush / lines / adjustment in either currency; integers only', () => {
    const offer = buildCustomOffer(
      'USD',
      { label: 'AI-native build', build: 900000, monthly: 25000 },
      { label: 'Rush', build: 100000 },
      [{ id: 'custom_1', label: 'Booking engine', build: 150000, monthly: 5000, value: 'Take bookings 24/7' }],
      { label: 'Pilot discount', build: -50000, monthly: 0 },
    );
    expect(offer.tier).toBe('ai_native');
    expect(offer.inputs.tier).toBe('ai_native');
    expect(offer.total_build).toBe(900000 + 100000 + 150000 - 50000);
    expect(offer.total_monthly).toBe(30000);
    expect(() => buildCustomOffer('JPY', { label: 'x', build: 1.5, monthly: 0 }, null, [], null)).toThrow(/integer/);
    expect(() => buildCustomOffer('JPY', { label: 'x', build: 100, monthly: 0 }, null, [{ id: 'a', label: '', build: 1, monthly: 0, value: '' }], null)).toThrow(/label/);
  });
});

describe('totalsOf', () => {
  it('is the one arithmetic: base + rush + Σ lines + adjustment (build); base + Σ lines + adjustment (monthly)', () => {
    expect(
      totalsOf({
        currency: 'USD',
        tier: 'starter',
        inputs: { tier: 'starter' },
        base: { label: 'b', build: 100, monthly: 10 },
        rush: { label: 'r', build: 25 },
        lines: [
          { id: 'a', label: 'a', build: 30, monthly: 3, value: '' },
          { id: 'b', label: 'b', build: 40, monthly: 4, value: '' },
        ],
        adjustment: { label: 'd', build: -5, monthly: -1 },
        usd_reference: null,
      }),
    ).toEqual({ total_build: 190, total_monthly: 16 });
  });
});
