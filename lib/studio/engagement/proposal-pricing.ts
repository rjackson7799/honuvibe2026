// The bridge between lib/pricing.ts (whole USD dollars, THE numeric source of
// truth) and engagement_proposals (integer minor units + currency). Pure.
//
// Rules, each pinned by proposal-pricing.test.ts:
//   * totalsOf is the ONE arithmetic — used by every constructor here, the zod
//     superRefine, the pricing form's live preview and the document renderer.
//     There is no second sum anywhere.
//   * calculatePricing keeps baseBuild UNRUSHED and folds the surcharge into
//     totalBuild; the offer carries an EXPLICIT `rush` line
//     = (round(base × 1.25) − base) × 100, so it can neither be omitted nor
//     double-counted.
//   * USD: base/rush/lines come ONLY from the calculator (× 100). The server
//     action re-runs buildUsdOffer from `inputs` and rejects a payload whose
//     base/rush/lines differ (usdOfferMatchesCalculator). The only editable
//     money on a USD offer is the signed `adjustment`, with a required label.
//   * JPY: the same calculator runs for `usd_reference`; every yen figure is
//     typed by Ryan as an integer and kept exactly as typed. No multiplication
//     happens in code on a JPY offer, so there is no rounding rule to define.
//   * ai_native: custom base/rush/lines typed in either currency.

import { AI_NATIVE_FROM, RUSH_MULTIPLIER, calculatePricing, type PricingInput } from '@/lib/pricing';
import type { EngagementCurrency, EngagementTier } from './types';

export { AI_NATIVE_FROM };

export interface OfferLine {
  id: string;
  label: string;
  /** One-time build, minor units. */
  build: number;
  /** Monthly care, minor units. */
  monthly: number;
  /** Benefit framing from ADDONS (never a bare cost). */
  value: string;
}
export interface OfferBase {
  label: string;
  build: number;
  monthly: number;
}
export interface OfferRush {
  label: string;
  build: number;
}
export interface OfferAdjustment {
  label: string;
  /** Signed. */
  build: number;
  /** Signed. */
  monthly: number;
}
export interface UsdReference {
  total_build: number;
  total_monthly: number;
}

export interface PricedOffer {
  currency: EngagementCurrency;
  tier: EngagementTier;
  /** What calculatePricing was called with (USD/JPY) — the server re-runs it. */
  inputs: PricingInput;
  base: OfferBase;
  /** Explicit surcharge line; null when the timeline is not asap. */
  rush: OfferRush | null;
  lines: OfferLine[];
  /** The ONLY free-form money on a USD offer. null when zero. */
  adjustment: OfferAdjustment | null;
  /** Cents; JPY offers only. */
  usd_reference: UsdReference | null;
  total_build: number;
  total_monthly: number;
}

export type OfferCore = Omit<PricedOffer, 'total_build' | 'total_monthly'>;

export const BASE_LABELS: Record<EngagementTier, string> = {
  starter: 'Starter build',
  pro: 'Pro build',
  ai_native: 'AI-native build',
};
export const RUSH_LABEL = 'Rush delivery (ASAP)';

export class OfferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfferError';
  }
}

function requireInt(value: unknown, what: string, allowNegative = false): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new OfferError(`${what} must be an integer amount in minor units`);
  }
  if (!allowNegative && value < 0) throw new OfferError(`${what} cannot be negative`);
  return value;
}

/** Normalise an adjustment: zero → null; non-zero requires a label. */
export function normalizeAdjustment(adjustment: OfferAdjustment | null | undefined): OfferAdjustment | null {
  if (!adjustment) return null;
  const build = requireInt(adjustment.build, 'adjustment.build', true);
  const monthly = requireInt(adjustment.monthly, 'adjustment.monthly', true);
  if (build === 0 && monthly === 0) return null;
  const label = (adjustment.label ?? '').trim();
  if (!label) throw new OfferError('A non-zero adjustment needs a label (every discount is named on the document)');
  if (label.length > 120) throw new OfferError('Keep the adjustment label under 120 characters');
  return { label, build, monthly };
}

/** THE arithmetic. build = base + rush + Σ lines + adjustment; monthly = base + Σ lines + adjustment. */
export function totalsOf(o: OfferCore): { total_build: number; total_monthly: number } {
  const linesBuild = o.lines.reduce((sum, l) => sum + l.build, 0);
  const linesMonthly = o.lines.reduce((sum, l) => sum + l.monthly, 0);
  return {
    total_build: o.base.build + (o.rush?.build ?? 0) + linesBuild + (o.adjustment?.build ?? 0),
    total_monthly: o.base.monthly + linesMonthly + (o.adjustment?.monthly ?? 0),
  };
}

function finish(core: OfferCore): PricedOffer {
  const totals = totalsOf(core);
  if (totals.total_build < 0 || totals.total_monthly < 0) {
    throw new OfferError('The adjustment cannot make the offer negative');
  }
  return { ...core, ...totals };
}

function resolvedTier(inputs: PricingInput): Exclude<EngagementTier, 'ai_native'> {
  const result = calculatePricing(inputs);
  if (result.isCustom) throw new OfferError('AI-native is custom-quoted — use buildCustomOffer');
  return result.resolvedTier as 'starter' | 'pro';
}

/** USD: everything but the adjustment comes from the calculator, × 100. */
export function buildUsdOffer(inputs: PricingInput, adjustment: OfferAdjustment | null): PricedOffer {
  const result = calculatePricing(inputs);
  if (result.isCustom) throw new OfferError('AI-native is custom-quoted — use buildCustomOffer');
  const tier = result.resolvedTier as 'starter' | 'pro';
  const rushBuild = result.rushApplied ? Math.round(result.baseBuild * RUSH_MULTIPLIER) - result.baseBuild : 0;
  return finish({
    currency: 'USD',
    tier,
    inputs,
    base: { label: BASE_LABELS[tier], build: result.baseBuild * 100, monthly: result.baseMonthly * 100 },
    rush: result.rushApplied ? { label: RUSH_LABEL, build: rushBuild * 100 } : null,
    lines: result.lines.map((l) => ({ id: l.id, label: l.label, build: l.build * 100, monthly: l.monthly * 100, value: l.value })),
    adjustment: normalizeAdjustment(adjustment),
    usd_reference: null,
  });
}

/**
 * The server-side check for a USD payload: base, rush and lines must equal a
 * fresh buildUsdOffer(inputs). The adjustment is excluded — it is Ryan's.
 */
export function usdOfferMatchesCalculator(offer: PricedOffer): boolean {
  if (offer.currency !== 'USD') return false;
  let fresh: PricedOffer;
  try {
    fresh = buildUsdOffer(offer.inputs, null);
  } catch {
    return false;
  }
  if (fresh.tier !== offer.tier) return false;
  if (fresh.base.label !== offer.base.label || fresh.base.build !== offer.base.build || fresh.base.monthly !== offer.base.monthly) return false;
  if ((fresh.rush === null) !== (offer.rush === null)) return false;
  if (fresh.rush && offer.rush && (fresh.rush.label !== offer.rush.label || fresh.rush.build !== offer.rush.build)) return false;
  if (fresh.lines.length !== offer.lines.length) return false;
  return fresh.lines.every((l, i) => {
    const o = offer.lines[i];
    return l.id === o.id && l.label === o.label && l.build === o.build && l.monthly === o.monthly && l.value === o.value;
  });
}

export interface YenFigures {
  base: { build: number; monthly: number };
  /** Required exactly when inputs.timeline === 'asap'; null otherwise. */
  rush: number | null;
  /** Keyed by the calculator's line ids — every line must be typed, none extra. */
  lines: Record<string, { build: number; monthly: number }>;
  adjustment: OfferAdjustment | null;
}

/** JPY: the calculator supplies the structure and the USD reference; Ryan types every yen figure. */
export function buildJpyOffer(inputs: PricingInput, yen: YenFigures): PricedOffer {
  const result = calculatePricing(inputs);
  if (result.isCustom) throw new OfferError('AI-native is custom-quoted — use buildCustomOffer');
  const tier = result.resolvedTier as 'starter' | 'pro';

  const base = { label: BASE_LABELS[tier], build: requireInt(yen.base.build, 'base.build'), monthly: requireInt(yen.base.monthly, 'base.monthly') };

  let rush: OfferRush | null = null;
  if (result.rushApplied) {
    if (yen.rush === null || yen.rush === undefined) throw new OfferError('An asap timeline needs a typed rush figure in yen');
    rush = { label: RUSH_LABEL, build: requireInt(yen.rush, 'rush') };
  } else if (yen.rush !== null && yen.rush !== undefined) {
    throw new OfferError('A rush figure is only allowed on an asap timeline');
  }

  const expectedIds = result.lines.map((l) => l.id);
  for (const id of Object.keys(yen.lines)) {
    if (!expectedIds.includes(id)) throw new OfferError(`Unexpected line "${id}" — not in the calculator's offer`);
  }
  const lines: OfferLine[] = result.lines.map((l) => {
    const typed = yen.lines[l.id];
    if (!typed) throw new OfferError(`Missing yen figure for line "${l.id}"`);
    return { id: l.id, label: l.label, build: requireInt(typed.build, `${l.id}.build`), monthly: requireInt(typed.monthly, `${l.id}.monthly`), value: l.value };
  });

  return finish({
    currency: 'JPY',
    tier,
    inputs,
    base,
    rush,
    lines,
    adjustment: normalizeAdjustment(yen.adjustment),
    usd_reference: { total_build: result.totalBuild * 100, total_monthly: result.totalMonthly * 100 },
  });
}

/** ai_native: fully typed. AI_NATIVE_FROM is a floor hint for the form only. */
export function buildCustomOffer(
  currency: EngagementCurrency,
  base: OfferBase,
  rush: OfferRush | null,
  lines: OfferLine[],
  adjustment: OfferAdjustment | null,
): PricedOffer {
  const baseLabel = (base.label ?? '').trim() || BASE_LABELS.ai_native;
  const checkedLines = lines.map((l, i) => {
    const label = (l.label ?? '').trim();
    if (!label) throw new OfferError(`Line ${i + 1} needs a label`);
    const id = (l.id ?? '').trim() || `custom_${i + 1}`;
    return { id, label, build: requireInt(l.build, `${label}.build`), monthly: requireInt(l.monthly, `${label}.monthly`), value: (l.value ?? '').trim() };
  });
  return finish({
    currency,
    tier: 'ai_native',
    inputs: { tier: 'ai_native' },
    base: { label: baseLabel, build: requireInt(base.build, 'base.build'), monthly: requireInt(base.monthly, 'base.monthly') },
    rush: rush ? { label: (rush.label ?? '').trim() || RUSH_LABEL, build: requireInt(rush.build, 'rush.build') } : null,
    lines: checkedLines,
    adjustment: normalizeAdjustment(adjustment),
    usd_reference: null,
  });
}

/** For the form: the tier the calculator would price a set of inputs against. */
export function tierFor(inputs: PricingInput): EngagementTier {
  return inputs.tier === 'ai_native' ? 'ai_native' : resolvedTier(inputs);
}
