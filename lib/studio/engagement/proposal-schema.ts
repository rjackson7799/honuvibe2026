// zod for everything that enters engagement_proposals' jsonb columns (066's
// policy: interiors are bounded by zod at the write sites; SQL guards shape
// and count). Pure — shared by the server actions, the pricing form and the
// draft route.

import { z } from 'zod';
import { PROPOSAL_SECTION_KEYS, DATA_BASES, PRICING_MODES } from './types';
import { totalsOf, type PricedOffer } from './proposal-pricing';

const money = z.number().int();
const nonNegative = money.min(0);

const offerLineSchema = z.strictObject({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(200),
  build: nonNegative,
  monthly: nonNegative,
  value: z.string().max(300),
});

const offerAdjustmentSchema = z
  .strictObject({
    label: z.string().max(120),
    build: money,
    monthly: money,
  })
  .superRefine((a, ctx) => {
    if ((a.build !== 0 || a.monthly !== 0) && a.label.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['label'], message: 'A non-zero adjustment needs a label' });
    }
  });

/** The PricingInput the calculator accepts. Loose but bounded. */
export const pricingInputSchema = z
  .object({
    tier: z.enum(['starter', 'pro', 'ai_native', 'not_sure']),
    pages: z.array(z.string().max(80)).max(60).optional(),
    features: z.array(z.string().max(80)).max(60).optional(),
    contentReadiness: z.enum(['have_all', 'some_help', 'need_help', 'decide']).nullable().optional(),
    imageryApproach: z.enum(['have_pro', 'stock', 'ai_images', 'mix', 'decide']).nullable().optional(),
    additionalLanguages: z.array(z.string().max(40)).max(20).optional(),
    locationType: z.enum(['online', 'physical', 'both']).nullable().optional(),
    addons: z
      .object({
        gbpSetup: z.boolean().optional(),
        gbpManage: z.boolean().optional(),
        booking: z.boolean().optional(),
        payments: z.boolean().optional(),
        aiChat: z.boolean().optional(),
      })
      .optional(),
    timeline: z.enum(['asap', '2_3_weeks', 'within_month', 'no_rush']).nullable().optional(),
  })
  .strict();

export const pricedOfferSchema: z.ZodType<PricedOffer> = z
  .strictObject({
    currency: z.enum(['USD', 'JPY']),
    tier: z.enum(['starter', 'pro', 'ai_native']),
    inputs: pricingInputSchema,
    base: z.strictObject({ label: z.string().min(1).max(200), build: nonNegative, monthly: nonNegative }),
    rush: z.strictObject({ label: z.string().min(1).max(200), build: nonNegative }).nullable(),
    lines: z.array(offerLineSchema).max(30),
    adjustment: offerAdjustmentSchema.nullable(),
    usd_reference: z.strictObject({ total_build: nonNegative, total_monthly: nonNegative }).nullable(),
    total_build: nonNegative,
    total_monthly: nonNegative,
  })
  .superRefine((o, ctx) => {
    const totals = totalsOf(o);
    if (totals.total_build !== o.total_build) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['total_build'], message: `total_build must equal the sum of the lines (${totals.total_build})` });
    }
    if (totals.total_monthly !== o.total_monthly) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['total_monthly'], message: `total_monthly must equal the sum of the lines (${totals.total_monthly})` });
    }
    if ((o.currency === 'JPY') !== (o.usd_reference !== null)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['usd_reference'], message: 'usd_reference is present exactly on JPY offers' });
    }
    if (o.adjustment && o.adjustment.build === 0 && o.adjustment.monthly === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['adjustment'], message: 'A zero adjustment must be null' });
    }
  }) as unknown as z.ZodType<PricedOffer>;

export const performanceTermsSchema = z.strictObject({
  rate_percent: z.number().int().min(1).max(100),
  applies_to: z.string().trim().min(1).max(500),
  qualifying_new: z.string().trim().min(1).max(1000),
  reporting: z.string().trim().min(1).max(500),
  payment_timing: z.string().trim().min(1).max(500),
  tracking_note: z.string().trim().max(1000).nullable(),
});
export type PerformanceTerms = z.infer<typeof performanceTermsSchema>;

export const proposalSectionSchema = z.strictObject({
  key: z.enum(PROPOSAL_SECTION_KEYS),
  title: z.string().trim().min(1).max(200),
  body_md: z.string().max(8000),
});
export type ProposalSection = z.infer<typeof proposalSectionSchema>;

/** Exactly the seven keys, in order. A section may be empty in draft. */
export const proposalSectionsSchema = z
  .array(proposalSectionSchema)
  .length(7)
  .superRefine((sections, ctx) => {
    sections.forEach((s, i) => {
      if (s.key !== PROPOSAL_SECTION_KEYS[i]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i, 'key'], message: `Expected section "${PROPOSAL_SECTION_KEYS[i]}" at position ${i + 1}` });
      }
    });
  });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isoDateSchema = z
  .string()
  .regex(DATE_RE, 'Use YYYY-MM-DD')
  .refine((d) => {
    const [y, m, day] = d.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, day));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === day;
  }, 'Not a real date');

/** The create/save payload (the form's document). */
export const proposalInputSchema = z
  .strictObject({
    title: z.string().trim().min(1, 'A title is required').max(200),
    currency: z.enum(['USD', 'JPY']),
    tier: z.enum(['starter', 'pro', 'ai_native']),
    pricing_mode: z.enum(PRICING_MODES),
    offer: pricedOfferSchema,
    performance_terms: performanceTermsSchema.nullable(),
    data_basis: z.enum(DATA_BASES),
    valid_until: isoDateSchema.nullable(),
    sections: proposalSectionsSchema,
  })
  .superRefine((input, ctx) => {
    if ((input.pricing_mode === 'fixed') !== (input.performance_terms === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['performance_terms'],
        message: input.pricing_mode === 'fixed' ? 'Fixed pricing carries no performance terms' : 'Performance and hybrid pricing need the performance terms',
      });
    }
    if (input.offer.currency !== input.currency) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['offer', 'currency'], message: 'The offer currency must match the proposal currency' });
    }
    if (input.offer.tier !== input.tier) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['offer', 'tier'], message: 'The offer tier must match the proposal tier' });
    }
  });
export type ProposalInput = z.infer<typeof proposalInputSchema>;

export const acceptedByNameSchema = z.string().trim().min(1, 'Enter the name of the person accepting').max(200);
export const voidReasonSchema = z.string().trim().min(1, 'A reason is required to void an acceptance').max(1000);
