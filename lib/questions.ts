// ============================================================
// Build It AI — discovery question backbone.
//
// The 15 spec questions (§6) mapped into the Calm Batch design's 3 steps.
// Nothing is dropped: Step 1 holds 4, Step 2 holds 6 (+branches), Step 3
// holds 5 (+languages/tier-confirm and a branch). Conditional branches are
// pure predicates over the answer map. Dynamic subtext personalizes from the
// Claude context_brief when present and falls back to neutral copy when empty
// (scraping/synthesis are stubbed in Increment 1, so the neutral path is live).
//
// `capturesField` is the answer-map key; it lines up with lib/pricing.ts's
// DiscoveryAnswers so the live price total reads answers directly.
// ============================================================

/** Stored value when the client picks "Decide for me" (Claude resolves later). */
export const DECIDE_SENTINEL = '__decide__';
/** Stored value when the client asks to "Explore a few options" first. */
export const EXPLORE_SENTINEL = '__explore__';

export type StepId = 1 | 2 | 3;

export type QuestionType =
  | 'single' // single-select chips
  | 'multi' // multi-select chips
  | 'text' // single line / short text
  | 'text-chips' // text input with suggestion chips
  | 'repeatable-url' // up to `max` url+note rows (Q7, Q13)
  | 'multi-entry' // dynamic name+desc rows (Q10)
  | 'page-selector' // multi pages + live count + ceiling nudge (Q8)
  | 'feature-groups' // grouped multi-select (Q9)
  | 'real-details'; // free text + timeline chips (Q15)

export interface QuestionOption {
  value: string;
  label: string;
}

export interface FeatureGroup {
  key: string;
  label: string;
  options: QuestionOption[];
}

/** Minimal view of the Claude context_brief used to personalize subtext. */
export interface ContextBrief {
  logo_colors?: string | null;
  scraped_phone?: string | null;
  scraped_address?: string | null;
  current_site_tone?: string | null;
  [key: string]: unknown;
}

export interface QuestionDef {
  id: string;
  step: StepId;
  type: QuestionType;
  capturesField: string;
  headline: string;
  /** Neutral subtext, shown when no personalization is available. */
  subtext: string;
  /** Personalized subtext from the context_brief; returns null to fall back. */
  dynamicSubtext?: (ctx: ContextBrief) => string | null;
  options?: QuestionOption[];
  groups?: FeatureGroup[];
  allowOther?: boolean;
  allowExplore?: boolean;
  decideForMe?: boolean;
  /** Max rows for repeatable/multi-entry types. */
  max?: number;
  /** Pages pre-checked per industry for the page selector (Q8). */
  precheckByIndustry?: Record<string, string[]>;
  affectsPricing?: boolean;
}

export type AnswerValue =
  | string
  | string[]
  | Record<string, unknown>
  | Array<Record<string, unknown>>;

export type AnswerMap = Record<string, AnswerValue | undefined>;

export interface BranchDef {
  id: string;
  parentId: string;
  /** Surface this branch only when the predicate is true over current answers. */
  trigger: (answers: AnswerMap) => boolean;
  question: QuestionDef;
}

// ── Helpers for predicates ───────────────────────────────────────────────────

const asArray = (v: AnswerValue | undefined): string[] =>
  Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as string[]) : [];

const asString = (v: AnswerValue | undefined): string =>
  typeof v === 'string' ? v : '';

// ── STEP 1 · THE FEEL (vibe & voice) ─────────────────────────────────────────

const STEP_1: QuestionDef[] = [
  {
    id: 'q4',
    step: 1,
    type: 'single',
    capturesField: 'vibe',
    headline: 'What overall vibe are you after?',
    subtext: 'How should the brand feel?',
    dynamicSubtext: (ctx) =>
      ctx.logo_colors
        ? `Your logo already leans ${ctx.logo_colors} — let's confirm the direction.`
        : null,
    options: [
      { value: 'bold', label: 'Bold & confident' },
      { value: 'clean', label: 'Clean & professional' },
      { value: 'friendly', label: 'Friendly & local' },
      { value: 'premium', label: 'Premium' },
      { value: 'natural', label: 'Natural & eco' },
    ],
    allowExplore: true,
    decideForMe: true,
    allowOther: true,
  },
  {
    id: 'q5',
    step: 1,
    type: 'multi',
    capturesField: 'voice_traits',
    headline: 'Which words should stick?',
    subtext: 'The voice of your copy — pick the ones that should come through.',
    dynamicSubtext: (ctx) =>
      ctx.current_site_tone
        ? `Your current site reads ${ctx.current_site_tone} — which of these should come through louder?`
        : null,
    options: [
      { value: 'trustworthy', label: 'Trustworthy' },
      { value: 'welcoming', label: 'Welcoming' },
      { value: 'expert', label: 'Expert' },
      { value: 'modern', label: 'Modern' },
      { value: 'established', label: 'Established' },
      { value: 'approachable', label: 'Approachable' },
      { value: 'local', label: 'Local' },
    ],
    decideForMe: true,
    allowOther: true,
  },
  {
    id: 'q6',
    step: 1,
    type: 'single',
    capturesField: 'color_direction',
    headline: 'Color direction?',
    subtext: 'How adventurous can we get with color?',
    dynamicSubtext: (ctx) =>
      ctx.logo_colors ? `Your logo is ${ctx.logo_colors}. How far can I push it?` : null,
    options: [
      { value: 'stay_close', label: 'Stay close to what I have' },
      { value: 'accent_calmer', label: 'Keep it as an accent on a calmer base' },
      { value: 'refreshed', label: 'Refreshed palette (still on-brand)' },
    ],
    allowExplore: true,
    decideForMe: true,
    allowOther: true,
  },
  {
    id: 'q7',
    step: 1,
    type: 'repeatable-url',
    capturesField: 'reference_sites',
    headline: 'Any sites you admire?',
    subtext: 'Up to 3 — a URL and a quick note on what you like. Inspiration, not competitors.',
    max: 3,
  },
];

// ── STEP 2 · WHAT IT DOES (capability & scope) ───────────────────────────────

const STEP_2: QuestionDef[] = [
  {
    id: 'q1',
    step: 2,
    type: 'multi',
    capturesField: 'project_goals',
    headline: "What's the main goal of this project?",
    subtext: 'What should the new site do better?',
    options: [
      { value: 'modern_trust', label: 'Look modern & trustworthy' },
      { value: 'drive_calls', label: 'Drive calls/bookings' },
      { value: 'showcase', label: 'Showcase services' },
      { value: 'local_cred', label: 'Local credibility' },
      { value: 'mobile', label: 'Mobile-friendly' },
      { value: 'sell_online', label: 'Sell online' },
    ],
    allowExplore: true,
    decideForMe: true,
    allowOther: true,
  },
  {
    id: 'q2',
    step: 2,
    type: 'text-chips',
    capturesField: 'target_audience',
    headline: 'Who are you trying to reach?',
    subtext: 'Your ideal customer.',
  },
  {
    id: 'q3',
    step: 2,
    type: 'single',
    capturesField: 'primary_cta',
    headline: "What's the primary call-to-action?",
    subtext: 'The #1 thing visitors should do.',
    options: [
      { value: 'call_now', label: 'Call now' },
      { value: 'book', label: 'Book/schedule' },
      { value: 'get_quote', label: 'Get a quote' },
      { value: 'buy_now', label: 'Buy now' },
      { value: 'call_and_book', label: 'Both call + book' },
    ],
    decideForMe: true,
    allowOther: true,
  },
  {
    id: 'q8',
    step: 2,
    type: 'page-selector',
    capturesField: 'pages',
    headline: 'What pages do you need?',
    subtext: "Pre-checked for your industry — add or remove anything.",
    options: [
      { value: 'home', label: 'Home' },
      { value: 'about', label: 'About' },
      { value: 'services', label: 'Services' },
      { value: 'service_details', label: 'Service details' },
      { value: 'gallery', label: 'Gallery' },
      { value: 'reviews', label: 'Reviews' },
      { value: 'contact', label: 'Contact' },
      { value: 'blog', label: 'Blog' },
      { value: 'booking', label: 'Booking' },
      { value: 'faq', label: 'FAQ' },
    ],
    allowOther: true,
    precheckByIndustry: {
      creator: ['home', 'about', 'services', 'gallery', 'contact'],
      healthcare: ['home', 'about', 'services', 'reviews', 'contact'],
      service: ['home', 'about', 'services', 'reviews', 'contact'],
      professional: ['home', 'about', 'services', 'contact'],
      other: ['home', 'about', 'services', 'contact'],
    },
  },
  {
    id: 'q9',
    step: 2,
    type: 'feature-groups',
    capturesField: 'features',
    headline: 'What must the site do?',
    subtext: 'Features — pick all that apply.',
    groups: [
      {
        key: 'contact',
        label: 'Contact',
        options: [
          { value: 'contact_form', label: 'Contact form' },
          { value: 'click_to_call', label: 'Click-to-call' },
          { value: 'map', label: 'Map / directions' },
        ],
      },
      {
        key: 'booking',
        label: 'Booking',
        options: [
          { value: 'booking', label: 'Online scheduling' },
          { value: 'calendar', label: 'Calendar sync' },
        ],
      },
      {
        key: 'proof',
        label: 'Proof',
        options: [
          { value: 'reviews', label: 'Reviews' },
          { value: 'testimonials', label: 'Testimonials' },
          { value: 'badges', label: 'Badges / certifications' },
        ],
      },
      {
        key: 'commerce',
        label: 'Payments',
        options: [
          { value: 'invoicing', label: 'Invoicing' },
          { value: 'subscriptions', label: 'Subscription payments' },
        ],
      },
      {
        key: 'engagement',
        label: 'Engagement',
        options: [
          { value: 'newsletter', label: 'Newsletter' },
          { value: 'chat', label: 'AI chat assistant' },
          { value: 'blog', label: 'Blog / content' },
        ],
      },
    ],
    decideForMe: true,
    allowOther: true,
  },
  {
    id: 'q10',
    step: 2,
    type: 'multi-entry',
    capturesField: 'offerings',
    headline: 'What do you offer?',
    subtext: 'Your core services or products — these become your service content.',
    max: 12,
  },
];

// ── STEP 3 · MAKE IT YOURS (details & care) ──────────────────────────────────

const STEP_3: QuestionDef[] = [
  {
    id: 'q11',
    step: 3,
    type: 'single',
    capturesField: 'content_readiness',
    headline: 'Where are you with content?',
    subtext: 'The words and copy for the site.',
    options: [
      { value: 'have_all', label: 'I have it all' },
      { value: 'some_help', label: 'I have some, need help finishing' },
      { value: 'need_help', label: 'I need help writing it' },
    ],
    decideForMe: true,
    affectsPricing: true,
  },
  {
    id: 'q12',
    step: 3,
    type: 'single',
    capturesField: 'imagery_approach',
    headline: 'What about photos and images?',
    subtext: 'The visuals for the site.',
    options: [
      { value: 'have_pro', label: 'I have pro photos' },
      { value: 'stock', label: 'Use stock (included)' },
      { value: 'ai_images', label: 'Generate AI images' },
      { value: 'mix', label: 'A mix' },
    ],
    decideForMe: true,
    affectsPricing: true,
  },
  {
    id: 'q13',
    step: 3,
    type: 'repeatable-url',
    capturesField: 'competitors',
    headline: 'Who are your competitors?',
    subtext: "Up to 3 — a URL and what makes you different. I'll take a look.",
    max: 3,
  },
  {
    id: 'q14',
    step: 3,
    type: 'multi',
    capturesField: 'trust_signals',
    headline: 'What builds trust for your customers?',
    subtext: 'The proof we should highlight.',
    options: [
      { value: 'reviews', label: 'Reviews' },
      { value: 'years', label: 'Years in business' },
      { value: 'certs', label: 'Certifications / licenses' },
      { value: 'guarantees', label: 'Guarantees' },
      { value: 'awards', label: 'Awards' },
      { value: 'notable_clients', label: 'Notable clients' },
      { value: 'real_work', label: 'Photos of real work' },
    ],
    decideForMe: true,
    allowOther: true,
  },
  {
    id: 'q_languages',
    step: 3,
    type: 'multi',
    capturesField: 'additional_languages',
    headline: 'Need it in more than one language?',
    subtext: 'A full second language is a Pro add-on — leave blank for a single-language site.',
    options: [
      { value: 'ja', label: 'Japanese' },
      { value: 'es', label: 'Spanish' },
      { value: 'zh', label: 'Chinese' },
      { value: 'ko', label: 'Korean' },
    ],
    allowOther: true,
    affectsPricing: true,
  },
  {
    id: 'q15',
    step: 3,
    type: 'real-details',
    capturesField: 'real_details',
    headline: 'Any real details I should use?',
    subtext:
      'Add a tagline, hours, email, or anything else — or leave blank for sensible placeholders.',
    dynamicSubtext: (ctx) => {
      if (!ctx.scraped_phone && !ctx.scraped_address) return null;
      const bits = [
        ctx.scraped_phone ? `Phone is ${ctx.scraped_phone}` : null,
        ctx.scraped_address ? `address ${ctx.scraped_address}` : null,
      ].filter(Boolean);
      return `${bits.join(', ')}. Add a tagline, hours, email, or anything else — or leave blank for sensible placeholders.`;
    },
    affectsPricing: true, // timeline (rush)
  },
  {
    id: 'q_tier',
    step: 3,
    type: 'single',
    capturesField: 'tier_interest',
    headline: 'Which plan feels right?',
    subtext: "Confirm a tier, or let us recommend one — you can change this anytime.",
    options: [
      { value: 'starter', label: 'Studio Starter' },
      { value: 'pro', label: 'Studio Pro' },
      { value: 'not_sure', label: 'Recommend one for me' },
    ],
    affectsPricing: true,
  },
];

export const QUESTIONS: QuestionDef[] = [...STEP_1, ...STEP_2, ...STEP_3];

export const STEPS: { id: StepId; label: string; sub: string }[] = [
  { id: 1, label: 'The feel', sub: 'Vibe & voice' },
  { id: 2, label: 'What it does', sub: 'Capability & scope' },
  { id: 3, label: 'Make it yours', sub: 'Details & care' },
];

// ── Conditional branches ─────────────────────────────────────────────────────

export const BRANCHES: BranchDef[] = [
  {
    id: 'q3b_commerce',
    parentId: 'q3',
    trigger: (a) =>
      asString(a.primary_cta) === 'buy_now' || asArray(a.project_goals).includes('sell_online'),
    question: {
      id: 'q3b_commerce',
      step: 2,
      type: 'text',
      capturesField: 'commerce_scope',
      headline: 'Tell me about selling online',
      subtext: 'Roughly how many products, and do you have a payment processor already?',
    },
  },
  {
    id: 'q9b_booking_tool',
    parentId: 'q9',
    trigger: (a) => asArray(a.features).includes('booking'),
    question: {
      id: 'q9b_booking_tool',
      step: 2,
      type: 'text',
      capturesField: 'booking_tool',
      headline: 'How should booking work?',
      subtext: 'Which scheduling tool do you use, or should we set one up?',
    },
  },
  {
    id: 'q9b_compliance',
    parentId: 'q9',
    trigger: (a) => asString(a.industry) === 'healthcare',
    question: {
      id: 'q9b_compliance',
      step: 2,
      type: 'text',
      capturesField: 'compliance',
      headline: 'Any compliance needs?',
      subtext: 'e.g. HIPAA, accessibility, or industry rules we should design around.',
    },
  },
  {
    id: 'q15b_local',
    parentId: 'q15',
    trigger: (a) => {
      const loc = asString(a.location_type);
      return loc === 'physical' || loc === 'both';
    },
    question: {
      id: 'q15b_local',
      step: 3,
      type: 'multi',
      capturesField: 'gbp',
      headline: 'Get found locally?',
      subtext:
        'Google Business Profile (GBP, formerly Google My Business) puts you on Maps and local search.',
      options: [
        { value: 'gbp_setup', label: 'Set up my Google Business Profile' },
        { value: 'gbp_manage', label: 'Keep it managed monthly' },
      ],
      affectsPricing: true,
    },
  },
];

// ── Subtext resolution ───────────────────────────────────────────────────────

/**
 * Resolve a question's subtext, personalizing from the context_brief when the
 * data exists and falling back to the neutral default otherwise. In Increment 1
 * the context_brief is always empty (scraping/synthesis stubbed), so this always
 * returns the neutral subtext — but the seam is ready for the synthesis increment.
 */
export function resolveSubtext(def: QuestionDef, ctx: ContextBrief | null | undefined): string {
  if (ctx && def.dynamicSubtext) {
    const dynamic = def.dynamicSubtext(ctx);
    if (dynamic) return dynamic;
  }
  return def.subtext;
}

/** Branches whose trigger fires for the current answers. */
export function activeBranchesFor(parentId: string, answers: AnswerMap): BranchDef[] {
  return BRANCHES.filter((b) => b.parentId === parentId && b.trigger(answers));
}

/** All questions for a step, in order (branches are injected by the renderer). */
export function questionsForStep(step: StepId): QuestionDef[] {
  return QUESTIONS.filter((q) => q.step === step);
}
