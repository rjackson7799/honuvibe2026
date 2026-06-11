import { describe, it, expect } from 'vitest';
import {
  calculatePricing,
  answersToPricingInput,
  PRICING,
  type PricingInput,
} from './pricing';

describe('calculatePricing — base tiers (spec §10.2)', () => {
  it('Starter / 5 pages / no add-ons → $500 build, $25/mo, no upgrade nudge', () => {
    const r = calculatePricing({ tier: 'starter', pages: ['home', 'about', 'services', 'gallery', 'contact'] });
    expect(r.isCustom).toBe(false);
    expect(r.resolvedTier).toBe('starter');
    expect(r.totalBuild).toBe(500);
    expect(r.totalMonthly).toBe(25);
    expect(r.lines).toHaveLength(0);
    expect(r.recommendUpgrade).toBe(false);
  });

  it('Pro / 8 pages / no add-ons → $2,500 build, $75/mo', () => {
    const r = calculatePricing({ tier: 'pro', pages: new Array(8).fill('p') });
    expect(r.totalBuild).toBe(2500);
    expect(r.totalMonthly).toBe(75);
    expect(r.recommendUpgrade).toBe(false);
  });
});

describe('calculatePricing — add-ons (spec §10.3/§10.4)', () => {
  it('Pro / AI imagery + booking + payments → $3,150 build, $115/mo', () => {
    const r = calculatePricing({
      tier: 'pro',
      pages: new Array(8).fill('p'),
      imageryApproach: 'ai_images',
      addons: { booking: true, payments: true },
    });
    expect(r.totalBuild).toBe(3150); // 2500 + 100 + 250 + 300
    expect(r.totalMonthly).toBe(115); // 75 + 15 + 25
    expect(r.lines.map((l) => l.id)).toEqual(['imagery_ai', 'booking', 'payments']);
  });

  it('rush (asap) applies +25% to the base build only; add-ons and monthly unaffected', () => {
    const r = calculatePricing({
      tier: 'pro',
      pages: new Array(8).fill('p'),
      imageryApproach: 'ai_images',
      addons: { booking: true, payments: true },
      timeline: 'asap',
    });
    expect(r.rushApplied).toBe(true);
    expect(r.totalBuild).toBe(3775); // round(2500 * 1.25)=3125 + 100 + 250 + 300
    expect(r.totalMonthly).toBe(115);
  });

  it('copywriting is exclusive: need_help → full (+300), some_help → partial (+150)', () => {
    const full = calculatePricing({ tier: 'starter', contentReadiness: 'need_help' });
    expect(full.totalBuild).toBe(800);
    expect(full.lines).toHaveLength(1);
    expect(full.lines[0].id).toBe('copywriting_full');

    const partial = calculatePricing({ tier: 'starter', contentReadiness: 'some_help' });
    expect(partial.totalBuild).toBe(650);
    expect(partial.lines[0].id).toBe('copywriting_partial');

    const none = calculatePricing({ tier: 'starter', contentReadiness: 'decide' });
    expect(none.totalBuild).toBe(500);
    expect(none.lines).toHaveLength(0);
  });
});

describe('calculatePricing — tier-gated add-ons', () => {
  it('multilingual: $500 setup + $100/extra language, charged on any tier', () => {
    const pro = calculatePricing({ tier: 'pro', additionalLanguages: ['ja', 'es'] });
    expect(pro.totalBuild).toBe(2500 + 600); // 500 setup + 100 (2nd language)
    expect(pro.totalMonthly).toBe(75 + 30); // 15/mo × 2
    const ml = pro.lines.find((l) => l.id === 'multilingual');
    expect(ml?.label).toBe('Multilingual (2 languages)');

    // Now charged on Starter too — no longer silently dropped.
    const starter = calculatePricing({ tier: 'starter', additionalLanguages: ['ja'] });
    expect(starter.totalBuild).toBe(500 + 500); // base + setup (1 language)
    expect(starter.totalMonthly).toBe(25 + 15);
    expect(starter.lines.find((l) => l.id === 'multilingual')?.label).toBe('Multilingual (1 language)');
  });

  it('booking/payments/AI chat apply on any tier (Starter included)', () => {
    const starter = calculatePricing({ tier: 'starter', addons: { booking: true, payments: true } });
    expect(starter.totalBuild).toBe(1050); // 500 + 250 booking + 300 invoicing
    expect(starter.totalMonthly).toBe(65); // 25 + 15 + 25
    expect(starter.lines.map((l) => l.id)).toEqual(['booking', 'payments']);

    const chat = calculatePricing({ tier: 'starter', addons: { aiChat: true } });
    expect(chat.totalBuild).toBe(650); // 500 + 150
    expect(chat.totalMonthly).toBe(50); // 25 + 25
    expect(chat.lines.map((l) => l.id)).toEqual(['ai_chat']);
  });

  it('GBP surfaces only for physical/both, not online', () => {
    const online = calculatePricing({
      tier: 'starter',
      locationType: 'online',
      addons: { gbpSetup: true, gbpManage: true },
    });
    expect(online.totalBuild).toBe(500);
    expect(online.totalMonthly).toBe(25);

    const physical = calculatePricing({
      tier: 'starter',
      locationType: 'physical',
      addons: { gbpSetup: true, gbpManage: true },
    });
    expect(physical.totalBuild).toBe(650); // +150 setup
    expect(physical.totalMonthly).toBe(75); // +50 manage
  });
});

describe('calculatePricing — page ceiling (recommend, never meter)', () => {
  it('6th page on Starter → recommendUpgrade, no per-page charge', () => {
    const r = calculatePricing({ tier: 'starter', pages: new Array(6).fill('p') });
    expect(r.recommendUpgrade).toBe(true);
    expect(r.ceiling).toBe(PRICING.starter.ceiling);
    expect(r.totalBuild).toBe(500); // price unchanged — it's a nudge, not a meter
  });

  it('13th page on Pro → recommendUpgrade', () => {
    const r = calculatePricing({ tier: 'pro', pages: new Array(13).fill('p') });
    expect(r.recommendUpgrade).toBe(true);
  });
});

describe('calculatePricing — tier resolution', () => {
  it('ai_native → custom, no auto price', () => {
    const r = calculatePricing({ tier: 'ai_native', pages: new Array(20).fill('p') });
    expect(r.isCustom).toBe(true);
    expect(r.resolvedTier).toBe('ai_native');
    expect(r.totalBuild).toBe(0);
    expect(r.totalMonthly).toBe(0);
  });

  it('not_sure with ≤5 pages and no Pro signals → recommends Starter', () => {
    const r = calculatePricing({ tier: 'not_sure', pages: ['home', 'about', 'contact'] });
    expect(r.resolvedTier).toBe('starter');
    expect(r.recommendedTier).toBe('starter');
    expect(r.totalBuild).toBe(500);
  });

  it('not_sure with many pages stays Starter — page count nudges, never jumps the price', () => {
    const r = calculatePricing({ tier: 'not_sure', pages: new Array(10).fill('p') });
    expect(r.resolvedTier).toBe('starter');
    expect(r.recommendedTier).toBe('starter');
    expect(r.totalBuild).toBe(500);
    expect(r.recommendUpgrade).toBe(true); // surfaces the "may fit Pro" review nudge
  });

  it('not_sure: individual features are add-ons, never tier gates → stays Starter', () => {
    const r = calculatePricing({
      tier: 'not_sure',
      pages: ['home', 'about'],
      features: ['chat', 'blog', 'booking', 'invoicing'],
    });
    expect(r.recommendedTier).toBe('starter');
    expect(r.resolvedTier).toBe('starter');
  });

  it('not_sure with an additional language stays Starter; multilingual is an add-on', () => {
    const r = calculatePricing({ tier: 'not_sure', pages: ['home'], additionalLanguages: ['ja'] });
    expect(r.resolvedTier).toBe('starter');
    expect(r.recommendedTier).toBe('starter');
    expect(r.totalBuild).toBe(500 + 500); // base + multilingual setup
    expect(r.lines.find((l) => l.id === 'multilingual')).toBeTruthy();
  });

  it('an unknown/garbage tier falls back to Starter instead of throwing', () => {
    const r = calculatePricing({ tier: 'bogus' as unknown as 'starter' });
    expect(r.isCustom).toBe(false);
    expect(r.resolvedTier).toBe('starter');
    expect(r.totalBuild).toBe(500);
  });
});

describe('answersToPricingInput', () => {
  it('maps the answer map and lets intake fill tier/location', () => {
    const input: PricingInput = answersToPricingInput(
      { pages: ['home', 'about'], imagery_approach: 'mix' },
      { tier_interest: 'pro', location_type: 'physical' },
    );
    expect(input.tier).toBe('pro');
    expect(input.locationType).toBe('physical');
    expect(input.imageryApproach).toBe('mix');
    const r = calculatePricing(input);
    expect(r.totalBuild).toBe(2550); // 2500 + 50 mixed imagery
  });

  it('in-flow tier-confirm answer overrides intake tier', () => {
    const input = answersToPricingInput({ tier_interest: 'starter' }, { tier_interest: 'pro' });
    expect(input.tier).toBe('starter');
  });
});
