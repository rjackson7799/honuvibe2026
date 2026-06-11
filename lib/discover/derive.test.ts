import { describe, it, expect } from 'vitest';
import {
  responsesToAnswerMap,
  deriveAddons,
  buildDiscoveryAnswers,
  priceFromAnswers,
} from './derive';

describe('responsesToAnswerMap', () => {
  it('re-keys stored responses (question_id) to capturesField', () => {
    const map = responsesToAnswerMap([
      { question_id: 'q4', answer: 'bold' },
      { question_id: 'q9', answer: ['booking', 'payments'] },
      { question_id: 'q15b_local', answer: ['gbp_setup'] }, // branch → 'gbp'
    ]);
    expect(map.vibe).toBe('bold');
    expect(map.features).toEqual(['booking', 'payments']);
    expect(map.gbp).toEqual(['gbp_setup']);
  });
});

describe('deriveAddons', () => {
  it('maps Q9 features to booking/payments/AI-chat add-ons', () => {
    expect(deriveAddons({ features: ['booking'] })).toMatchObject({ booking: true, payments: false });
    expect(deriveAddons({ features: ['invoicing'] })).toMatchObject({ payments: true });
    expect(deriveAddons({ features: ['subscriptions'] })).toMatchObject({ payments: true });
    expect(deriveAddons({ features: ['chat'] })).toMatchObject({ aiChat: true });
  });
  it('maps the Q15 local branch to GBP add-ons', () => {
    expect(deriveAddons({ gbp: ['gbp_setup', 'gbp_manage'] })).toMatchObject({
      gbpSetup: true,
      gbpManage: true,
    });
  });
});

describe('priceFromAnswers — questionnaire → price wiring', () => {
  it('Pro + booking/invoicing features + physical GBP setup prices the add-ons', () => {
    const answers = {
      features: ['booking', 'invoicing'],
      gbp: ['gbp_setup'],
    };
    const r = priceFromAnswers(answers, { tier_interest: 'pro', location_type: 'physical' });
    // 2500 + booking 250 + payments 300 + gbp_setup 150
    expect(r.totalBuild).toBe(3200);
    // 75 + booking 15 + payments 25
    expect(r.totalMonthly).toBe(115);
    expect(r.lines.map((l) => l.id).sort()).toEqual(['booking', 'gbp_setup', 'payments']);
  });

  it('Q15 timeline asap drives the rush multiplier', () => {
    const answers = { real_details: { details: 'Open 9–5', timeline: 'asap' } };
    const r = priceFromAnswers(answers, { tier_interest: 'starter', location_type: 'online' });
    expect(r.rushApplied).toBe(true);
    expect(r.totalBuild).toBe(Math.round(500 * 1.25)); // 625
  });

  it('GBP add-ons are ignored for online businesses', () => {
    const r = priceFromAnswers(
      { gbp: ['gbp_setup', 'gbp_manage'] },
      { tier_interest: 'pro', location_type: 'online' },
    );
    expect(r.totalBuild).toBe(2500);
    expect(r.totalMonthly).toBe(75);
  });

  it('multilingual charges on any tier: $500 setup + $100 per extra language', () => {
    const pro = priceFromAnswers(
      { additional_languages: ['ja'] },
      { tier_interest: 'pro', location_type: 'online' },
    );
    expect(pro.totalBuild).toBe(3000); // 2500 + 500 setup (1 language)
    expect(pro.totalMonthly).toBe(90); // 75 + 15

    const starter = priceFromAnswers(
      { additional_languages: ['ja', 'es'] },
      { tier_interest: 'starter', location_type: 'online' },
    );
    expect(starter.totalBuild).toBe(1100); // 500 + 500 setup + 100 (2nd language)
    expect(starter.totalMonthly).toBe(55); // 25 + 15×2
  });

  it('not_sure with many pages stays Starter — page count only nudges, never jumps the price', () => {
    const r = priceFromAnswers(
      { pages: ['home', 'about', 'services', 'gallery', 'contact', 'blog', 'faq'] },
      { tier_interest: 'not_sure', location_type: 'online' },
    );
    expect(r.resolvedTier).toBe('starter');
    expect(r.totalBuild).toBe(500);
    expect(r.recommendUpgrade).toBe(true);
  });

  it('an in-flow tier-confirm answer overrides intake', () => {
    const r = priceFromAnswers(
      { tier_interest: 'starter' },
      { tier_interest: 'pro', location_type: 'online' },
    );
    expect(r.resolvedTier).toBe('starter');
    expect(r.totalBuild).toBe(500);
  });
});

describe('buildDiscoveryAnswers', () => {
  it('pulls location/tier from the lead intake and timeline from real_details', () => {
    const a = buildDiscoveryAnswers(
      { real_details: { timeline: 'no_rush' }, pages: ['home'] },
      { location_type: 'both', tier_interest: 'pro', industry: 'service' },
    );
    expect(a.location_type).toBe('both');
    expect(a.tier_interest).toBe('pro');
    expect(a.timeline).toBe('no_rush');
    expect(a.pages).toEqual(['home']);
  });
});
