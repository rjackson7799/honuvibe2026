'use client';

// Step 1 of Create and the pricing editor while draft|ready. The form holds a
// PricingDraft (strings, as typed) and builds the PricedOffer through the SAME
// pure constructors the server re-runs (buildUsdOffer / buildJpyOffer /
// buildCustomOffer) — the live Investment preview is totalsOf, nothing else.
// USD money is typed in dollars and converted to cents at the input boundary
// (a unit conversion, not pricing arithmetic); JPY money is typed in whole yen
// and kept exactly as typed; ai_native is fully typed. The engagement has no
// currency editor: the proposal owns the choice and accept writes it back.

import { useMemo } from 'react';
import { ADDONS, AI_NATIVE_FROM, PRICING, calculatePricing, type PricingInput } from '@/lib/pricing';
import {
  OfferError,
  buildCustomOffer,
  buildJpyOffer,
  buildUsdOffer,
  type PricedOffer,
} from '@/lib/studio/engagement/proposal-pricing';
import { formatMinorUnits } from '@/lib/studio/engagement/format';
import type { ProposalInput, ProposalSection } from '@/lib/studio/engagement/proposal-schema';
import type { DataBasis, EngagementCurrency, EngagementTier, PricingMode } from '@/lib/studio/engagement/types';
import type { Engagement, EngagementProposal } from '@/lib/admin/types';

export interface PricingDraft {
  title: string;
  currency: EngagementCurrency;
  tier: EngagementTier;
  pricing_mode: PricingMode;
  inputs: {
    contentReadiness: '' | 'have_all' | 'some_help' | 'need_help' | 'decide';
    imageryApproach: '' | 'have_pro' | 'stock' | 'ai_images' | 'mix' | 'decide';
    additionalLanguages: string;
    locationType: '' | 'online' | 'physical' | 'both';
    addons: { gbpSetup: boolean; gbpManage: boolean; booking: boolean; payments: boolean; aiChat: boolean };
    timeline: '' | 'asap' | '2_3_weeks' | 'within_month' | 'no_rush';
  };
  adjustment: { label: string; build: string; monthly: string };
  yen: { base: { build: string; monthly: string }; rush: string; lines: Record<string, { build: string; monthly: string }> };
  custom: {
    base: { label: string; build: string; monthly: string };
    rush: { enabled: boolean; label: string; build: string };
    lines: { id: string; label: string; build: string; monthly: string; value: string }[];
  };
  performance_terms: { rate_percent: string; applies_to: string; qualifying_new: string; reporting: string; payment_timing: string; tracking_note: string };
  data_basis: DataBasis | '';
  valid_until: string;
}

const EMPTY_TERMS = { rate_percent: '', applies_to: '', qualifying_new: '', reporting: '', payment_timing: '', tracking_note: '' };

export function initialDraft(engagement: Engagement): PricingDraft {
  return {
    title: `${engagement.title} — website proposal`,
    currency: engagement.currency,
    tier: engagement.tier ?? 'starter',
    pricing_mode: 'fixed',
    inputs: { contentReadiness: '', imageryApproach: '', additionalLanguages: '', locationType: '', addons: { gbpSetup: false, gbpManage: false, booking: false, payments: false, aiChat: false }, timeline: '' },
    adjustment: { label: '', build: '', monthly: '' },
    yen: { base: { build: '', monthly: '' }, rush: '', lines: {} },
    custom: { base: { label: 'AI-native build', build: '', monthly: '' }, rush: { enabled: false, label: 'Rush delivery (ASAP)', build: '' }, lines: [] },
    performance_terms: EMPTY_TERMS,
    data_basis: '',
    valid_until: '',
  };
}

function major(minor: number, currency: EngagementCurrency): string {
  if (minor === 0) return '';
  return currency === 'JPY' ? String(minor) : (minor / 100).toFixed(2);
}

/** The typed strings for an existing row, so editing round-trips the stored offer. */
export function draftFromProposal(p: EngagementProposal): PricingDraft {
  const o = p.pricing;
  const inputs = o.inputs;
  const d = initialDraft({ title: p.title, currency: p.currency, tier: p.tier } as Engagement);
  d.title = p.title;
  d.currency = p.currency;
  d.tier = p.tier;
  d.pricing_mode = p.pricing_mode;
  d.inputs = {
    contentReadiness: (inputs.contentReadiness ?? '') as PricingDraft['inputs']['contentReadiness'],
    imageryApproach: (inputs.imageryApproach ?? '') as PricingDraft['inputs']['imageryApproach'],
    additionalLanguages: (inputs.additionalLanguages ?? []).join(', '),
    locationType: (inputs.locationType ?? '') as PricingDraft['inputs']['locationType'],
    addons: {
      gbpSetup: !!inputs.addons?.gbpSetup,
      gbpManage: !!inputs.addons?.gbpManage,
      booking: !!inputs.addons?.booking,
      payments: !!inputs.addons?.payments,
      aiChat: !!inputs.addons?.aiChat,
    },
    timeline: (inputs.timeline ?? '') as PricingDraft['inputs']['timeline'],
  };
  d.adjustment = o.adjustment
    ? { label: o.adjustment.label, build: major(o.adjustment.build, p.currency), monthly: major(o.adjustment.monthly, p.currency) }
    : { label: '', build: '', monthly: '' };
  if (p.currency === 'JPY' && p.tier !== 'ai_native') {
    d.yen = {
      base: { build: String(o.base.build), monthly: String(o.base.monthly) },
      rush: o.rush ? String(o.rush.build) : '',
      lines: Object.fromEntries(o.lines.map((l) => [l.id, { build: String(l.build), monthly: String(l.monthly) }])),
    };
  }
  if (p.tier === 'ai_native') {
    d.custom = {
      base: { label: o.base.label, build: major(o.base.build, p.currency), monthly: major(o.base.monthly, p.currency) },
      rush: { enabled: !!o.rush, label: o.rush?.label ?? 'Rush delivery (ASAP)', build: o.rush ? major(o.rush.build, p.currency) : '' },
      lines: o.lines.map((l) => ({ id: l.id, label: l.label, build: major(l.build, p.currency), monthly: major(l.monthly, p.currency), value: l.value })),
    };
  }
  d.performance_terms = p.performance_terms
    ? { ...p.performance_terms, rate_percent: String(p.performance_terms.rate_percent), tracking_note: p.performance_terms.tracking_note ?? '' }
    : EMPTY_TERMS;
  d.data_basis = p.data_basis;
  d.valid_until = p.valid_until ?? '';
  return d;
}

/** Input-boundary unit conversion: "150.00" → 15000 cents; "20000" → 20000 yen. Blank → 0 unless `required`. */
function toMinor(raw: string, currency: EngagementCurrency, what: string, required = false): number {
  const s = raw.trim();
  if (s === '') {
    if (required) throw new OfferError(`${what}: type a yen figure (0 is allowed, blank is not)`);
    return 0;
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) throw new OfferError(`${what}: enter a number${currency === 'JPY' ? ' in whole yen' : ' (up to two decimals)'}`);
  if (currency === 'JPY') {
    if (s.includes('.')) throw new OfferError(`${what}: yen are whole units — no decimals`);
    return Number(s);
  }
  return Math.round(Number(s) * 100);
}

export function pricingInputFromDraft(d: PricingDraft): PricingInput {
  return {
    tier: d.tier,
    contentReadiness: d.inputs.contentReadiness || null,
    imageryApproach: d.inputs.imageryApproach || null,
    additionalLanguages: d.inputs.additionalLanguages.split(',').map((s) => s.trim()).filter(Boolean),
    locationType: d.inputs.locationType || null,
    addons: { ...d.inputs.addons },
    timeline: d.inputs.timeline || null,
  };
}

/** The offer, through the same pure constructors the server re-runs. Throws OfferError with a readable message. */
export function offerFromDraft(d: PricingDraft): PricedOffer {
  const c = d.currency;
  const adjustment = {
    label: d.adjustment.label,
    build: toMinor(d.adjustment.build, c, 'Adjustment build'),
    monthly: toMinor(d.adjustment.monthly, c, 'Adjustment monthly'),
  };
  if (d.tier === 'ai_native') {
    return buildCustomOffer(
      c,
      { label: d.custom.base.label, build: toMinor(d.custom.base.build, c, 'Base build'), monthly: toMinor(d.custom.base.monthly, c, 'Base monthly') },
      d.custom.rush.enabled ? { label: d.custom.rush.label, build: toMinor(d.custom.rush.build, c, 'Rush') } : null,
      d.custom.lines.map((l, i) => ({
        id: l.id || `custom_${i + 1}`,
        label: l.label,
        build: toMinor(l.build, c, `${l.label || `Line ${i + 1}`} build`),
        monthly: toMinor(l.monthly, c, `${l.label || `Line ${i + 1}`} monthly`),
        value: l.value,
      })),
      adjustment,
    );
  }
  const inputs = pricingInputFromDraft(d);
  if (c === 'USD') return buildUsdOffer(inputs, adjustment);
  const result = calculatePricing(inputs);
  const lines: Record<string, { build: number; monthly: number }> = {};
  for (const l of result.lines) {
    const typed = d.yen.lines[l.id] ?? { build: '', monthly: '' };
    lines[l.id] = { build: toMinor(typed.build, 'JPY', `${l.label} build`, true), monthly: toMinor(typed.monthly, 'JPY', `${l.label} monthly`, true) };
  }
  return buildJpyOffer(inputs, {
    base: { build: toMinor(d.yen.base.build, 'JPY', 'Base build', true), monthly: toMinor(d.yen.base.monthly, 'JPY', 'Base monthly', true) },
    rush: result.rushApplied ? toMinor(d.yen.rush, 'JPY', 'Rush', true) : null,
    lines,
    adjustment,
  });
}

/** The create/save payload (validated server-side by proposalInputSchema). */
export function proposalInputFromDraft(d: PricingDraft, sections: ProposalSection[]): ProposalInput {
  const offer = offerFromDraft(d);
  const terms =
    d.pricing_mode === 'fixed'
      ? null
      : {
          rate_percent: Number(d.performance_terms.rate_percent),
          applies_to: d.performance_terms.applies_to.trim(),
          qualifying_new: d.performance_terms.qualifying_new.trim(),
          reporting: d.performance_terms.reporting.trim(),
          payment_timing: d.performance_terms.payment_timing.trim(),
          tracking_note: d.performance_terms.tracking_note.trim() || null,
        };
  if (!d.data_basis) throw new OfferError('Choose the data basis (client records or provisional)');
  return {
    title: d.title.trim(),
    currency: d.currency,
    tier: d.tier,
    pricing_mode: d.pricing_mode,
    offer,
    performance_terms: terms,
    data_basis: d.data_basis,
    valid_until: d.valid_until.trim() || null,
    sections,
  };
}

// ── UI ───────────────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-bg-primary border border-border-default text-fg-primary text-base sm:text-sm placeholder:text-fg-tertiary focus:border-accent-teal outline-none disabled:opacity-60';
const moneyCls = `${inputCls} text-right font-mono`;
const labelCls = 'block text-[12px] font-medium text-fg-secondary mb-1';
const segBase = 'px-3 py-1.5 min-h-[44px] rounded-full text-[12.5px] font-semibold border transition-all whitespace-nowrap';
const segOn = 'bg-[color:var(--accent-teal)] text-white border-[color:var(--accent-teal)]';
const segOff = 'bg-bg-secondary text-fg-secondary border-border-default hover:border-border-hover hover:text-fg-primary';

function Seg<T extends string>({ value, options, onChange, disabled }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => (
        <button key={o.value} type="button" disabled={disabled} onClick={() => onChange(o.value)} aria-pressed={value === o.value} className={`${segBase} ${value === o.value ? segOn : segOff} disabled:opacity-60`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ProposalPricingForm({ draft, onChange, readOnly }: { draft: PricingDraft; onChange: (d: PricingDraft) => void; readOnly: boolean }) {
  const d = draft;
  const set = (patch: Partial<PricingDraft>) => onChange({ ...d, ...patch });
  const setInputs = (patch: Partial<PricingDraft['inputs']>) => set({ inputs: { ...d.inputs, ...patch } });
  const c = d.currency;
  const isCustom = d.tier === 'ai_native';
  const isJpy = c === 'JPY';

  const calc = useMemo(() => (isCustom ? null : calculatePricing(pricingInputFromDraft(d))), [d, isCustom]);

  const preview = useMemo(() => {
    try {
      return { offer: offerFromDraft(d), error: null as string | null };
    } catch (e) {
      return { offer: null, error: e instanceof Error ? e.message : 'Check the figures' };
    }
  }, [d]);

  const usd = (n: number) => formatMinorUnits(n * 100, 'USD');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="prop-title">Title</label>
          <input id="prop-title" className={inputCls} value={d.title} maxLength={200} disabled={readOnly} onChange={(e) => set({ title: e.target.value })} />
        </div>
        <div>
          <span className={labelCls}>Currency</span>
          <Seg value={c} disabled={readOnly} options={[{ value: 'USD', label: 'USD' }, { value: 'JPY', label: 'JPY (yen typed per line)' }]} onChange={(v) => set({ currency: v as EngagementCurrency })} />
        </div>
        <div>
          <span className={labelCls}>Tier</span>
          <Seg value={d.tier} disabled={readOnly} options={[{ value: 'starter', label: `Starter · ${usd(PRICING.starter.build)}` }, { value: 'pro', label: `Pro · ${usd(PRICING.pro.build)}` }, { value: 'ai_native', label: `AI-native · from ${usd(AI_NATIVE_FROM.build)}` }]} onChange={(v) => set({ tier: v as EngagementTier })} />
        </div>
        <div>
          <span className={labelCls}>Pricing mode</span>
          <Seg value={d.pricing_mode} disabled={readOnly} options={[{ value: 'fixed', label: 'Fixed' }, { value: 'performance', label: 'Performance' }, { value: 'hybrid', label: 'Hybrid' }]} onChange={(v) => set({ pricing_mode: v as PricingMode })} />
        </div>
        <div>
          <span className={labelCls}>Data basis (required)</span>
          <Seg value={d.data_basis} disabled={readOnly} options={[{ value: 'client_records', label: 'Client records' }, { value: 'provisional', label: 'Provisional († footnote)' }]} onChange={(v) => set({ data_basis: v as DataBasis })} />
        </div>
      </div>

      {!isCustom && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="prop-content">Content readiness</label>
            <select id="prop-content" className={inputCls} value={d.inputs.contentReadiness} disabled={readOnly} onChange={(e) => setInputs({ contentReadiness: e.target.value as PricingDraft['inputs']['contentReadiness'] })}>
              <option value="">— none —</option>
              <option value="have_all">Have all copy</option>
              <option value="some_help">Some help (partial copywriting)</option>
              <option value="need_help">Need help (full copywriting)</option>
              <option value="decide">Decide later</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="prop-imagery">Imagery</label>
            <select id="prop-imagery" className={inputCls} value={d.inputs.imageryApproach} disabled={readOnly} onChange={(e) => setInputs({ imageryApproach: e.target.value as PricingDraft['inputs']['imageryApproach'] })}>
              <option value="">— none —</option>
              <option value="have_pro">Have pro photos</option>
              <option value="stock">Stock</option>
              <option value="ai_images">AI-generated</option>
              <option value="mix">Mix</option>
              <option value="decide">Decide later</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="prop-langs">Additional languages (comma-separated)</label>
            <input id="prop-langs" className={inputCls} value={d.inputs.additionalLanguages} placeholder="ja, ko" disabled={readOnly} onChange={(e) => setInputs({ additionalLanguages: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="prop-location">Location type</label>
            <select id="prop-location" className={inputCls} value={d.inputs.locationType} disabled={readOnly} onChange={(e) => setInputs({ locationType: e.target.value as PricingDraft['inputs']['locationType'] })}>
              <option value="">— none —</option>
              <option value="online">Online only</option>
              <option value="physical">Physical location</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="prop-timeline">Timeline</label>
            <select id="prop-timeline" className={inputCls} value={d.inputs.timeline} disabled={readOnly} onChange={(e) => setInputs({ timeline: e.target.value as PricingDraft['inputs']['timeline'] })}>
              <option value="">— none —</option>
              <option value="asap">ASAP (rush +25% on the base)</option>
              <option value="2_3_weeks">2–3 weeks</option>
              <option value="within_month">Within a month</option>
              <option value="no_rush">No rush</option>
            </select>
          </div>
          <div>
            <span className={labelCls}>Add-ons</span>
            <div className="flex flex-col gap-1">
              {(
                [
                  ['booking', ADDONS.booking.label],
                  ['payments', ADDONS.payments.label],
                  ['aiChat', ADDONS.ai_chat.label],
                  ['gbpSetup', `${ADDONS.gbp_setup.label} (physical/both)`],
                  ['gbpManage', `${ADDONS.gbp_manage.label} (physical/both)`],
                ] as [keyof PricingDraft['inputs']['addons'], string][]
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-[13px] text-fg-secondary min-h-[32px]">
                  <input type="checkbox" checked={d.inputs.addons[key]} disabled={readOnly} onChange={(e) => setInputs({ addons: { ...d.inputs.addons, [key]: e.target.checked } })} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* JPY: every money cell is a yen input beside its USD reference. */}
      {!isCustom && isJpy && calc && (
        <div className="rounded-lg border border-border-default bg-bg-primary p-3 space-y-2">
          <p className="text-[12px] font-semibold text-fg-secondary">Yen figures (whole yen, typed) — USD reference beside each</p>
          <YenRow label={`${d.tier === 'pro' ? 'Pro' : 'Starter'} build`} usdBuild={usd(calc.baseBuild)} usdMonthly={usd(calc.baseMonthly)} value={d.yen.base} disabled={readOnly} onChange={(v) => set({ yen: { ...d.yen, base: v } })} />
          {calc.rushApplied && (
            <YenRow label="Rush delivery (ASAP)" usdBuild={usd(Math.round(calc.baseBuild * 1.25) - calc.baseBuild)} usdMonthly="" value={{ build: d.yen.rush, monthly: '' }} noMonthly disabled={readOnly} onChange={(v) => set({ yen: { ...d.yen, rush: v.build } })} />
          )}
          {calc.lines.map((l) => (
            <YenRow key={l.id} label={l.label} usdBuild={usd(l.build)} usdMonthly={usd(l.monthly)} value={d.yen.lines[l.id] ?? { build: '', monthly: '' }} disabled={readOnly} onChange={(v) => set({ yen: { ...d.yen, lines: { ...d.yen.lines, [l.id]: v } } })} />
          ))}
        </div>
      )}

      {/* ai_native: custom base / rush / lines. */}
      {isCustom && (
        <div className="rounded-lg border border-border-default bg-bg-primary p-3 space-y-3">
          <p className="text-[12px] font-semibold text-fg-secondary">Custom offer ({c}{isJpy ? ', whole yen' : ''}) — AI-native is quoted by hand; from {usd(AI_NATIVE_FROM.build)} is a floor hint only</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input className={inputCls} placeholder="Base label" value={d.custom.base.label} disabled={readOnly} onChange={(e) => set({ custom: { ...d.custom, base: { ...d.custom.base, label: e.target.value } } })} />
            <input className={moneyCls} placeholder="Build" inputMode="decimal" value={d.custom.base.build} disabled={readOnly} onChange={(e) => set({ custom: { ...d.custom, base: { ...d.custom.base, build: e.target.value } } })} />
            <input className={moneyCls} placeholder="Monthly" inputMode="decimal" value={d.custom.base.monthly} disabled={readOnly} onChange={(e) => set({ custom: { ...d.custom, base: { ...d.custom.base, monthly: e.target.value } } })} />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-fg-secondary min-h-[32px]">
            <input type="checkbox" checked={d.custom.rush.enabled} disabled={readOnly} onChange={(e) => set({ custom: { ...d.custom, rush: { ...d.custom.rush, enabled: e.target.checked } } })} />
            Rush line
          </label>
          {d.custom.rush.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input className={inputCls} value={d.custom.rush.label} disabled={readOnly} onChange={(e) => set({ custom: { ...d.custom, rush: { ...d.custom.rush, label: e.target.value } } })} />
              <input className={moneyCls} placeholder="Build" inputMode="decimal" value={d.custom.rush.build} disabled={readOnly} onChange={(e) => set({ custom: { ...d.custom, rush: { ...d.custom.rush, build: e.target.value } } })} />
            </div>
          )}
          {d.custom.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <input className={inputCls} placeholder="Line label" value={l.label} disabled={readOnly} onChange={(e) => set({ custom: { ...d.custom, lines: d.custom.lines.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) } })} />
              <input className={inputCls} placeholder="Benefit (value framing)" value={l.value} disabled={readOnly} onChange={(e) => set({ custom: { ...d.custom, lines: d.custom.lines.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) } })} />
              <input className={moneyCls} placeholder="Build" inputMode="decimal" value={l.build} disabled={readOnly} onChange={(e) => set({ custom: { ...d.custom, lines: d.custom.lines.map((x, j) => (j === i ? { ...x, build: e.target.value } : x)) } })} />
              <input className={moneyCls} placeholder="Monthly" inputMode="decimal" value={l.monthly} disabled={readOnly} onChange={(e) => set({ custom: { ...d.custom, lines: d.custom.lines.map((x, j) => (j === i ? { ...x, monthly: e.target.value } : x)) } })} />
              <button type="button" disabled={readOnly} className="min-h-[44px] text-[12px] text-fg-tertiary hover:text-[color:var(--accent-coral)]" onClick={() => set({ custom: { ...d.custom, lines: d.custom.lines.filter((_, j) => j !== i) } })}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" disabled={readOnly} className="min-h-[44px] text-[12.5px] font-semibold text-[color:var(--accent-teal)] hover:underline" onClick={() => set({ custom: { ...d.custom, lines: [...d.custom.lines, { id: '', label: '', build: '', monthly: '', value: '' }] } })}>
            + Add a line
          </button>
        </div>
      )}

      {/* The adjustment: the only free-form money on a USD offer. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className={labelCls} htmlFor="prop-adj-label">Adjustment label (required when non-zero)</label>
          <input id="prop-adj-label" className={inputCls} placeholder="Founding-client discount" value={d.adjustment.label} disabled={readOnly} onChange={(e) => set({ adjustment: { ...d.adjustment, label: e.target.value } })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="prop-adj-build">Adjustment build ({isJpy ? '¥, signed' : '$, signed'})</label>
          <input id="prop-adj-build" className={moneyCls} placeholder={isJpy ? '-20000' : '-150.00'} inputMode="decimal" value={d.adjustment.build} disabled={readOnly} onChange={(e) => set({ adjustment: { ...d.adjustment, build: e.target.value } })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="prop-adj-monthly">Adjustment monthly</label>
          <input id="prop-adj-monthly" className={moneyCls} placeholder="0" inputMode="decimal" value={d.adjustment.monthly} disabled={readOnly} onChange={(e) => set({ adjustment: { ...d.adjustment, monthly: e.target.value } })} />
        </div>
      </div>

      {d.pricing_mode !== 'fixed' && (
        <fieldset className="rounded-lg border border-border-default bg-bg-primary p-3 space-y-2">
          <legend className="px-1 text-[12px] font-semibold text-fg-secondary">Performance terms (the skill&apos;s checklist — all required)</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Rate % (1–100)" inputMode="numeric" value={d.performance_terms.rate_percent} disabled={readOnly} onChange={(e) => set({ performance_terms: { ...d.performance_terms, rate_percent: e.target.value } })} />
            <input className={inputCls} placeholder="What it applies to (core vs full package)" value={d.performance_terms.applies_to} maxLength={500} disabled={readOnly} onChange={(e) => set({ performance_terms: { ...d.performance_terms, applies_to: e.target.value } })} />
            <input className={inputCls} placeholder="What counts as a qualifying new customer" value={d.performance_terms.qualifying_new} maxLength={1000} disabled={readOnly} onChange={(e) => set({ performance_terms: { ...d.performance_terms, qualifying_new: e.target.value } })} />
            <input className={inputCls} placeholder="Reporting cadence" value={d.performance_terms.reporting} maxLength={500} disabled={readOnly} onChange={(e) => set({ performance_terms: { ...d.performance_terms, reporting: e.target.value } })} />
            <input className={inputCls} placeholder="Payment timing vs the sales cycle" value={d.performance_terms.payment_timing} maxLength={500} disabled={readOnly} onChange={(e) => set({ performance_terms: { ...d.performance_terms, payment_timing: e.target.value } })} />
            <input className={inputCls} placeholder="Tracking note (optional)" value={d.performance_terms.tracking_note} maxLength={1000} disabled={readOnly} onChange={(e) => set({ performance_terms: { ...d.performance_terms, tracking_note: e.target.value } })} />
          </div>
        </fieldset>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="prop-valid">Valid until (blank = issue date + 30 days; only extendable after issue)</label>
          <input id="prop-valid" type="date" className={inputCls} value={d.valid_until} disabled={readOnly} onChange={(e) => set({ valid_until: e.target.value })} />
        </div>
      </div>

      {/* Live Investment preview — totalsOf in the browser, nothing else. */}
      <div className="rounded-lg border border-border-default bg-bg-primary p-3">
        <p className="text-[12px] font-semibold text-fg-secondary mb-2">Investment preview</p>
        {preview.offer ? (
          <table className="w-full text-[13px]">
            <tbody>
              <tr><td className="py-0.5 text-fg-secondary">{preview.offer.base.label}</td><td className="py-0.5 text-right font-mono">{formatMinorUnits(preview.offer.base.build, c)}</td><td className="py-0.5 text-right font-mono text-fg-tertiary">{formatMinorUnits(preview.offer.base.monthly, c)}/mo</td></tr>
              {preview.offer.rush && <tr><td className="py-0.5 text-fg-secondary">{preview.offer.rush.label}</td><td className="py-0.5 text-right font-mono">{formatMinorUnits(preview.offer.rush.build, c)}</td><td /></tr>}
              {preview.offer.lines.map((l) => (
                <tr key={l.id}><td className="py-0.5 text-fg-secondary">{l.label}</td><td className="py-0.5 text-right font-mono">{formatMinorUnits(l.build, c)}</td><td className="py-0.5 text-right font-mono text-fg-tertiary">{l.monthly ? `${formatMinorUnits(l.monthly, c)}/mo` : ''}</td></tr>
              ))}
              {preview.offer.adjustment && <tr><td className="py-0.5 text-fg-secondary">{preview.offer.adjustment.label}</td><td className="py-0.5 text-right font-mono">{formatMinorUnits(preview.offer.adjustment.build, c)}</td><td className="py-0.5 text-right font-mono text-fg-tertiary">{preview.offer.adjustment.monthly ? `${formatMinorUnits(preview.offer.adjustment.monthly, c)}/mo` : ''}</td></tr>}
              <tr className="border-t border-border-default font-semibold text-fg-primary"><td className="pt-1">Total build · Monthly care</td><td className="pt-1 text-right font-mono">{formatMinorUnits(preview.offer.total_build, c)}</td><td className="pt-1 text-right font-mono">{formatMinorUnits(preview.offer.total_monthly, c)}/mo</td></tr>
            </tbody>
          </table>
        ) : (
          <p className="text-[13px] text-[color:var(--accent-coral)]">{preview.error}</p>
        )}
        {preview.offer?.usd_reference && (
          <p className="mt-1 text-[12px] text-fg-tertiary">USD reference: {formatMinorUnits(preview.offer.usd_reference.total_build, 'USD')} build · {formatMinorUnits(preview.offer.usd_reference.total_monthly, 'USD')} monthly</p>
        )}
        <p className="mt-1 text-[11.5px] text-fg-tertiary">Wire: total_build {preview.offer?.total_build ?? '—'} · total_monthly {preview.offer?.total_monthly ?? '—'} (minor units, {c})</p>
      </div>
    </div>
  );
}

function YenRow({ label, usdBuild, usdMonthly, value, onChange, disabled, noMonthly }: { label: string; usdBuild: string; usdMonthly: string; value: { build: string; monthly: string }; onChange: (v: { build: string; monthly: string }) => void; disabled: boolean; noMonthly?: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-center">
      <span className="text-[13px] text-fg-secondary">{label}</span>
      <span className="flex items-center gap-1">
        <input className={`${moneyCls} w-32`} placeholder="¥ build" inputMode="numeric" value={value.build} disabled={disabled} onChange={(e) => onChange({ ...value, build: e.target.value })} />
        <span className="text-[11.5px] text-fg-tertiary w-20">{usdBuild}</span>
      </span>
      {noMonthly ? (
        <span />
      ) : (
        <span className="flex items-center gap-1">
          <input className={`${moneyCls} w-32`} placeholder="¥ monthly" inputMode="numeric" value={value.monthly} disabled={disabled} onChange={(e) => onChange({ ...value, monthly: e.target.value })} />
          <span className="text-[11.5px] text-fg-tertiary w-20">{usdMonthly}/mo</span>
        </span>
      )}
    </div>
  );
}
