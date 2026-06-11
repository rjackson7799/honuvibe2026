// ============================================================
// HonuVibe Studio — deterministic pricing calculator.
//
// THE single numeric source of truth for Studio build/care pricing.
// Implements the "Build It AI" spec §10.4 exactly. Pricing is ALWAYS
// computed here in code — never by an LLM, never metered per-unit, and
// never with a hidden DB/infra line item (§10.5).
//
// The storefront tiers (components/marketing/studio/service-tiers.tsx)
// derive their numbers from PRICING; the discovery LivePriceTotal panel
// and the /api/discover/complete snapshot both call calculatePricing().
// ============================================================

/** Tier the prospect expresses interest in (intake / Q-tier-confirm). */
export type TierInterest = 'starter' | 'pro' | 'ai_native' | 'not_sure';

/** A tier that carries an auto-computable price. */
export type PricedTier = 'starter' | 'pro';

export type LocationType = 'online' | 'physical' | 'both';

export type ContentReadiness =
  | 'have_all'
  | 'some_help' // partial copywriting
  | 'need_help' // full copywriting
  | 'decide'
  | null;

export type ImageryApproach =
  | 'have_pro'
  | 'stock'
  | 'ai_images'
  | 'mix'
  | 'decide'
  | null;

export type Timeline = 'asap' | '2_3_weeks' | 'within_month' | 'no_rush' | null;

export interface PricingAddons {
  gbpSetup?: boolean;
  gbpManage?: boolean;
  booking?: boolean;
  payments?: boolean;
  aiChat?: boolean;
}

export interface PricingInput {
  tier: TierInterest;
  /** Page slugs selected in Q8 (page ceiling is a recommendation, not a meter). */
  pages?: string[];
  /** Feature keys selected in Q9. Drive opt-in add-ons (via `addons`); they are
   *  not tier signals — only scope (page count, multilingual) resolves `not_sure`. */
  features?: string[];
  contentReadiness?: ContentReadiness;
  imageryApproach?: ImageryApproach;
  /** Additional languages beyond the primary (multilingual add-on, Pro+ only). */
  additionalLanguages?: string[];
  locationType?: LocationType | null;
  addons?: PricingAddons;
  timeline?: Timeline;
}

export interface PricingLine {
  id: string;
  label: string;
  /** One-time build delta (USD). */
  build: number;
  /** Monthly care delta (USD). */
  monthly: number;
  /** Value framing — a benefit line, never a bare cost (§10.1). */
  value: string;
}

export interface PricingResult {
  /** AI-Native is fully custom-quoted — no auto price; route to a scoping call. */
  isCustom: boolean;
  /** The tier we priced against ('ai_native' when isCustom). */
  resolvedTier: PricedTier | 'ai_native';
  /** For `not_sure`: the tier we recommend, derived from page/feature signals. */
  recommendedTier?: PricedTier;
  recommendedReason?: string;
  baseBuild: number;
  baseMonthly: number;
  lines: PricingLine[];
  totalBuild: number;
  totalMonthly: number;
  rushApplied: boolean;
  /** Page count exceeded the tier ceiling → nudge to the next tier (not a charge). */
  recommendUpgrade: boolean;
  ceiling: number | null;
  pageCount: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

/** Base tier pricing + page ceilings. Reconciled to the live studio page (§10.2). */
export const PRICING = {
  starter: { build: 500, monthly: 25, ceiling: 5 },
  pro: { build: 2500, monthly: 75, ceiling: 12 },
} as const;

export const AI_NATIVE_FROM = { build: 7500, monthly: 200 } as const;

/** À la carte, opt-in, value-framed add-ons (§10.3). */
export const ADDONS = {
  copywriting_full: {
    label: 'Copywriting (full)',
    build: 300,
    monthly: 0,
    value: "We write all your copy so you don't have to",
  },
  copywriting_partial: {
    label: 'Copywriting (partial)',
    build: 150,
    monthly: 0,
    value: "We polish and finish what you've started",
  },
  imagery_ai: {
    label: 'AI-generated imagery',
    build: 100,
    monthly: 0,
    value: 'Professional AI imagery — no photographer needed',
  },
  imagery_mix: {
    label: 'Mixed imagery',
    build: 50,
    monthly: 0,
    value: 'Your photos + AI fill-ins where you need them',
  },
  multilingual: {
    label: 'Multilingual',
    build: 500, // flat setup — includes the first added language
    perLanguage: 100, // each additional language beyond the first
    monthly: 15, // per language
    value: 'Reach customers in their language — AI translation, fully localized',
  },
  gbp_setup: {
    label: 'Google Business Profile setup',
    build: 150,
    monthly: 0,
    value: 'Get found in Google Maps and local search',
  },
  gbp_manage: {
    label: 'GBP management',
    build: 0,
    monthly: 50,
    value: 'We keep your profile fresh — posts, reviews, hours',
  },
  booking: {
    label: 'Booking integration',
    build: 250,
    monthly: 15,
    value: 'Let customers book online, 24/7',
  },
  payments: {
    label: 'Invoicing & subscriptions',
    build: 300,
    monthly: 25,
    value: 'Send invoices and take recurring payments — no storefront needed',
  },
  ai_chat: {
    label: 'AI chat assistant',
    build: 150,
    monthly: 25,
    value: 'A 24/7 assistant that answers questions and captures leads',
  },
} as const;

/** Rush multiplier applied to the full build when timeline === 'asap'. */
export const RUSH_MULTIPLIER = 1.25;

// ── Tier resolution ──────────────────────────────────────────────────────────

interface ResolvedTier {
  tier: PricedTier;
  recommendedTier?: PricedTier;
  recommendedReason?: string;
}

/**
 * Resolve a `not_sure` interest into a concrete priced tier from signals.
 * Start at Starter; recommend Pro only on a multilingual build. Page count does
 * NOT jump the price — a content-heavy but simple site stays Starter, with the
 * page ceiling surfaced as a soft "may fit Pro, we'll confirm after review"
 * nudge (`recommendUpgrade`). Individual features (scheduling, blog, chat,
 * invoicing…) are priced as add-ons on Starter, never tier gates.
 */
function resolveNotSure(): ResolvedTier {
  // Nothing auto-forces Pro any more — features, page count and multilingual are
  // all priced as add-ons on Starter. Pro is an explicit choice (or set by human
  // review). The page ceiling still surfaces a soft nudge via `recommendUpgrade`.
  return {
    tier: 'starter',
    recommendedTier: 'starter',
    recommendedReason: 'Starter looks like the right fit — we’ll confirm after a quick review.',
  };
}

// ── Calculator ───────────────────────────────────────────────────────────────

/**
 * Deterministic build + care pricing from backbone answers. Implements §10.4.
 * AI-Native short-circuits to a custom (no auto-price) result.
 */
export function calculatePricing(input: PricingInput): PricingResult {
  const pages = input.pages ?? [];
  const pageCount = pages.length;

  // AI-Native: fully custom-quoted, routes to a scoping call. No auto price.
  if (input.tier === 'ai_native') {
    return {
      isCustom: true,
      resolvedTier: 'ai_native',
      baseBuild: 0,
      baseMonthly: 0,
      lines: [],
      totalBuild: 0,
      totalMonthly: 0,
      rushApplied: false,
      recommendUpgrade: false,
      ceiling: null,
      pageCount,
    };
  }

  // Resolve the priced tier (not_sure → recommended). Unknown/garbage tier values
  // (bad stored data) fall back to the safe default instead of indexing PRICING
  // with undefined.
  let resolved: ResolvedTier;
  if (input.tier === 'starter' || input.tier === 'pro') {
    resolved = { tier: input.tier };
  } else {
    resolved = resolveNotSure();
  }
  const tier = resolved.tier;
  const base = PRICING[tier];

  const lines: PricingLine[] = [];
  const pushAddon = (key: keyof typeof ADDONS, overrides?: Partial<PricingLine>) => {
    const a = ADDONS[key];
    lines.push({
      id: key,
      label: a.label,
      build: a.build,
      monthly: a.monthly,
      value: a.value,
      ...overrides,
    });
  };

  // Opt-in add-ons — only those the client consciously selected (§10.4).
  if (input.contentReadiness === 'need_help') pushAddon('copywriting_full');
  else if (input.contentReadiness === 'some_help') pushAddon('copywriting_partial');

  if (input.imageryApproach === 'ai_images') pushAddon('imagery_ai');
  else if (input.imageryApproach === 'mix') pushAddon('imagery_mix');

  // Multilingual — any tier (AI translation). Flat setup covers the first
  // language; each additional language adds a smaller per-language fee.
  const langCount = input.additionalLanguages?.length ?? 0;
  if (langCount > 0) {
    const m = ADDONS.multilingual;
    pushAddon('multilingual', {
      label: `Multilingual (${langCount} ${langCount === 1 ? 'language' : 'languages'})`,
      build: m.build + m.perLanguage * (langCount - 1),
      monthly: m.monthly * langCount,
    });
  }

  // Google Business Profile — physical/both businesses only.
  if (input.locationType && input.locationType !== 'online') {
    if (input.addons?.gbpSetup) pushAddon('gbp_setup');
    if (input.addons?.gbpManage) pushAddon('gbp_manage');
  }

  // Scheduling / invoicing / AI chat — à la carte on any priced tier. These are
  // moderate integrations, not tier gates, so they add proportionate cost on top
  // of Starter rather than forcing a jump to Pro.
  if (input.addons?.booking) pushAddon('booking');
  if (input.addons?.payments) pushAddon('payments');
  if (input.addons?.aiChat) pushAddon('ai_chat');

  const baseBuild = base.build;
  const baseMonthly = base.monthly;
  const addonBuild = lines.reduce((sum, l) => sum + l.build, 0);
  const addonMonthly = lines.reduce((sum, l) => sum + l.monthly, 0);

  // Rush surcharges the core build only — not pass-through add-on/integration
  // line items (e.g. a booking SaaS fee shouldn't cost more for being in a hurry).
  const rushApplied = input.timeline === 'asap';
  const builtBase = rushApplied ? Math.round(baseBuild * RUSH_MULTIPLIER) : baseBuild;
  const totalBuild = builtBase + addonBuild;
  const totalMonthly = baseMonthly + addonMonthly;

  return {
    isCustom: false,
    resolvedTier: tier,
    recommendedTier: resolved.recommendedTier,
    recommendedReason: resolved.recommendedReason,
    baseBuild,
    baseMonthly,
    lines,
    totalBuild,
    totalMonthly,
    rushApplied,
    recommendUpgrade: pageCount > base.ceiling,
    ceiling: base.ceiling,
    pageCount,
  };
}

// ── Answer-map adapter ───────────────────────────────────────────────────────

/**
 * Loose shape of the live discovery answer map keyed by question `capturesField`
 * (see lib/questions.ts). Kept permissive so the calculator stays decoupled from
 * the question backbone.
 */
export interface DiscoveryAnswers {
  tier_interest?: TierInterest;
  pages?: string[];
  features?: string[];
  content_readiness?: ContentReadiness;
  imagery_approach?: ImageryApproach;
  additional_languages?: string[];
  location_type?: LocationType | null;
  timeline?: Timeline;
  addons?: PricingAddons;
}

/**
 * Map the discovery answer map (+ intake) into a PricingInput. Intake fields win
 * for tier/location; in-flow tier-confirm (if present) overrides intake tier.
 */
export function answersToPricingInput(
  answers: DiscoveryAnswers,
  intake: { tier_interest?: TierInterest; location_type?: LocationType | null },
): PricingInput {
  return {
    tier: answers.tier_interest ?? intake.tier_interest ?? 'not_sure',
    pages: answers.pages ?? [],
    features: answers.features ?? [],
    contentReadiness: answers.content_readiness ?? null,
    imageryApproach: answers.imagery_approach ?? null,
    additionalLanguages: answers.additional_languages ?? [],
    locationType: answers.location_type ?? intake.location_type ?? null,
    addons: answers.addons ?? {},
    timeline: answers.timeline ?? null,
  };
}
