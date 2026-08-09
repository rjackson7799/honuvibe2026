// Blue Filler — curated industry map.
//
// EVERY figure in this file is transcribed from docs/blue-filler-sources.md
// (rev 2), the committed data ledger. Nothing here is re-derived from memory,
// and no number is invented. Field -> ledger section:
//
//   marketSizeUsdBn, basis, scope, asOfYear, sequoiaQuadrant  <- S1
//   gapTier                                                   <- A2 (tier rule)
//   anthropicAgentToolCallSharePct                            <- A1
//   crowdedTasks                                              <- A3
//
// Provenance classes carried over from the ledger: [T] source transcription,
// [V] visual interpretation of a chart that prints no values, [H] this project's
// own heuristic. gapTier is [H] — it is NOT an Anthropic classification, and
// anthropicAgentToolCallSharePct is a tool-call share, NOT an adoption rate.
//
// SELECTION (plan §2): all 13 S1 "autopilot" verticals + all 5 S1 "next wave"
// verticals + 2 extreme-gap entries with `sequoiaQuadrant: null`. S1's copilot
// and watch quadrants are deliberately excluded from the map — they are named as
// harder-mode territory in the untargeted generation prompt instead.
//
// APPLIED gapTier RULE. The ledger's [H] rule is:
//   extreme  = dominant A2 largest-gap category AND nearest A1 share <= ~2%
//   high     = A2 largest-gap category with A1 share ~2-10%
//   moderate = meaningful gap with visible adoption or judgment-heavy adjacency
// One documented extension, also [H]: where NO A1 domain plausibly matches, the
// share is omitted and the tier is set from the A2 category alone, with
// `promptNotes` saying so. Nothing infers a share that the ledger does not give.
//
// STALENESS: `lastReviewedAt` is format-validated in tests only (no
// calendar-triggered CI failures) and surfaced in the UI as "priors reviewed
// {date}". Cadence is quarterly; the roadmap's window tracker automates it.
// Any edit to this file is behavior-affecting -> bump BF_PIPELINE_VERSION.

export type SequoiaQuadrant = 'autopilot' | 'next_wave' | 'copilot' | 'watch';
export type GapTier = 'extreme' | 'high' | 'moderate';
export type MarketBasis = 'annual_spend' | 'annual_revenue';
export type MarketScope = 'US' | 'global' | 'unknown';

export interface IndustrySourceOverride {
  field: string;
  url: string;
  year: number;
}

export interface IndustryEntry {
  key: string;
  label: string;
  /**
   * Ledger S1, transcribed exactly: "$140-200B" -> { min: 140, max: 200 },
   * "$100B+" -> { min: 100, max: null }.
   *
   * `null` for entries the ledger gives no size for (the two non-S1 extreme-gap
   * entries). The plan's shape has this required; it is nullable here because
   * the only alternative for a non-S1 vertical would be to invent a figure,
   * which the ledger forbids. A non-null value on a non-S1 entry requires
   * `sourceOverrides` (test-enforced).
   */
  marketSizeUsdBn: { min: number; max: number | null } | null;
  /** null exactly when marketSizeUsdBn is null. */
  basis: MarketBasis | null;
  /**
   * 'US' ONLY where S1 article prose states it (accounting & audit, healthcare
   * revenue cycle). 'unknown' everywhere else — an inferred geography is never
   * encoded as a known fact.
   */
  scope: MarketScope;
  sequoiaQuadrant: SequoiaQuadrant | null;
  /** [H] project heuristic — see the applied rule above. */
  gapTier: GapTier;
  /**
   * Ledger A1 (Figure 6 of "Measuring AI agent autonomy in practice"): the share
   * of one provider's sampled agent TOOL CALLS in the nearest matching domain.
   * A directional signal that agentic usage in the domain is still small — NOT
   * an adoption rate. Omitted where no A1 domain plausibly matches.
   */
  anthropicAgentToolCallSharePct?: number;
  /** Ledger A3 — already-crowded tasks to steer AWAY from. */
  crowdedTasks?: string[];
  promptNotes: string;
  /**
   * The SOURCE's publication year — not a claim about when the figure was
   * measured. Rendered as "source published {year}" for exactly that reason.
   */
  asOfYear: number;
  /** YYYY-MM-DD. */
  lastReviewedAt: string;
  sourceOverrides?: IndustrySourceOverride[];
}

const REVIEWED = '2026-08-08';

// A3 task strings, written once so the same occupation reads identically
// everywhere it appears.
const A3 = {
  dataEntry: 'Data entry keyers — enter data (67.1% observed task coverage)',
  customerService:
    'Customer service representatives — confer with customers (70.1% observed task coverage)',
  medicalCoding:
    'Medical record specialists — code patient data (66.7% observed task coverage)',
  financialAnalysis:
    'Financial & investment analysts — analyze financial information (57.2% observed task coverage)',
  salesOutreach:
    'Sales reps, wholesale/manufacturing — contact customers, solicit orders (62.8% observed task coverage)',
  programming:
    'Computer programmers — write and maintain software (74.5% observed task coverage)',
  qa: 'Software QA analysts and testers (51.9% observed task coverage)',
  infosec: 'Information security analysts (48.6% observed task coverage)',
  userSupport:
    'Computer user support specialists — resolve user support requests (46.8% observed task coverage)',
} as const;

export const INDUSTRY_MAP: readonly IndustryEntry[] = [
  // -------------------------------------------------------------------------
  // S1 AUTOPILOT (outsourced x intelligence) — all 13
  // -------------------------------------------------------------------------
  {
    key: 'insurance-brokerage',
    label: 'Insurance brokerage',
    marketSizeUsdBn: { min: 140, max: 200 },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'autopilot',
    gapTier: 'high',
    anthropicAgentToolCallSharePct: 9.1,
    crowdedTasks: [A3.salesOutreach, A3.customerService],
    promptNotes:
      'A2 category: Business & finance (largest-gap list). Nearest A1 domain: Back-office automation (9.1%) — brokerage operations are submission, quoting and policy admin, not the sales conversation. Largest single line on the S1 chart.',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'it-managed-services',
    label: 'IT managed services',
    marketSizeUsdBn: { min: 100, max: null },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'autopilot',
    gapTier: 'moderate',
    anthropicAgentToolCallSharePct: 49.7,
    crowdedTasks: [A3.programming, A3.qa, A3.infosec, A3.userSupport],
    promptNotes:
      'A2 category: Computer & math — the one category where theoretical capability AND observed usage are both high (adoption already underway), hence moderate rather than extreme. Nearest A1 domain: Software engineering (49.7%), by far the most saturated. Assume incumbents and hobbyists are already here; only a very specific wedge is interesting.',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'payroll-compliance',
    label: 'Payroll & employment compliance',
    marketSizeUsdBn: { min: 50, max: 70 },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'autopilot',
    gapTier: 'high',
    anthropicAgentToolCallSharePct: 9.1,
    crowdedTasks: [A3.dataEntry],
    promptNotes:
      'A2 categories: Office & admin (moderate observed ~0.35) and Business & finance. Nearest A1 domain: Back-office automation (9.1%). Regulatory filing deadlines are the forcing function; error liability is the adoption blocker.',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'claims-adjusting',
    label: 'Insurance claims adjusting',
    marketSizeUsdBn: { min: 50, max: 80 },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'autopilot',
    gapTier: 'high',
    anthropicAgentToolCallSharePct: 9.1,
    crowdedTasks: [A3.customerService, A3.dataEntry],
    promptNotes:
      'A2 category: Business & finance (largest-gap list). Nearest A1 domain: Back-office automation (9.1%). Document-heavy and adjudication-heavy; regulated, so the service attachment carries the liability the software will not.',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'accounting-audit',
    label: 'Accounting & audit',
    marketSizeUsdBn: { min: 50, max: 80 },
    basis: 'annual_spend',
    // S1 article prose: "$50-80B outsourced in the US alone".
    scope: 'US',
    asOfYear: 2026,
    sequoiaQuadrant: 'autopilot',
    gapTier: 'high',
    anthropicAgentToolCallSharePct: 4.0,
    crowdedTasks: [A3.financialAnalysis],
    promptNotes:
      'A2 category: Business & finance (largest-gap list). Nearest A1 domain: Finance and accounting (4.0%). One of only two entries whose geographic scope the source states (US).',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'healthcare-rev-cycle',
    label: 'Healthcare revenue cycle',
    marketSizeUsdBn: { min: 50, max: 80 },
    basis: 'annual_spend',
    // S1 article prose: "$50-80B outsourced in US".
    scope: 'US',
    asOfYear: 2026,
    sequoiaQuadrant: 'autopilot',
    gapTier: 'extreme',
    anthropicAgentToolCallSharePct: 1.0,
    crowdedTasks: [A3.medicalCoding, A3.dataEntry],
    promptNotes:
      'A2 categories: Healthcare support and Healthcare practitioners (largest-gap list). Nearest A1 domain: Medicine and healthcare (1.0%). Medical CODING is the canonical crowded task (66.7% task coverage) — steer toward adjacent under-covered work such as denial appeals, prior authorization and payer-contract reconciliation. One of only two entries whose geographic scope the source states (US).',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'mortgage-origination',
    label: 'Mortgage origination',
    marketSizeUsdBn: { min: 30, max: 50 },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'autopilot',
    gapTier: 'high',
    anthropicAgentToolCallSharePct: 9.1,
    crowdedTasks: [A3.dataEntry, A3.customerService],
    promptNotes:
      'A2 category: Business & finance (largest-gap list). Nearest A1 domain: Back-office automation (9.1%). Highly cyclical with rates — an idea here should survive a low-volume year.',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'kyc-aml',
    label: 'KYC / AML compliance',
    marketSizeUsdBn: { min: 30, max: 50 },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'autopilot',
    gapTier: 'high',
    anthropicAgentToolCallSharePct: 9.1,
    crowdedTasks: [A3.dataEntry],
    promptNotes:
      'A2 category: Business & finance (largest-gap list). Nearest A1 domain: Back-office automation (9.1%). Audit trails and explainability are the product, not a feature; regulator-facing evidence is the moat angle.',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'paralegal-lpo',
    label: 'Paralegal & legal process outsourcing',
    marketSizeUsdBn: { min: 36, max: 36 },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'autopilot',
    gapTier: 'extreme',
    anthropicAgentToolCallSharePct: 0.9,
    promptNotes:
      'A2 category: Legal (largest-gap list — one of the widest theoretical-vs-observed gaps on the radar). Nearest A1 domain: Legal (0.9%, the second-smallest domain in the figure). No A3 occupation overlaps. Unauthorized-practice-of-law rules are the adoption blocker and shape the service attachment.',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'tax-advisory',
    label: 'Tax advisory & preparation',
    marketSizeUsdBn: { min: 30, max: 35 },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'autopilot',
    gapTier: 'high',
    anthropicAgentToolCallSharePct: 4.0,
    crowdedTasks: [A3.financialAnalysis],
    promptNotes:
      'A2 category: Business & finance (largest-gap list). Nearest A1 domain: Finance and accounting (4.0%). Brutally seasonal — an idea here needs an off-season revenue story.',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'legal-transactional',
    label: 'Transactional legal work',
    marketSizeUsdBn: { min: 20, max: 25 },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'autopilot',
    gapTier: 'extreme',
    anthropicAgentToolCallSharePct: 0.9,
    promptNotes:
      'A2 category: Legal (largest-gap list). Nearest A1 domain: Legal (0.9%). No A3 occupation overlaps. Contract lifecycle is crowded with funded incumbents; the opening is in narrow document families a generalist tool handles badly.',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'real-estate-closing',
    label: 'Real estate closing & title',
    marketSizeUsdBn: { min: 20, max: 25 },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'autopilot',
    gapTier: 'extreme',
    anthropicAgentToolCallSharePct: 0.9,
    crowdedTasks: [A3.dataEntry],
    promptNotes:
      'A2 categories: Legal and Office & admin. Nearest A1 domain: Legal (0.9%) — title and closing work is document review and exception clearing. County-level heterogeneity is both the blocker and the moat.',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'cost-estimation',
    label: 'Construction cost estimation',
    marketSizeUsdBn: { min: 16, max: 16 },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'autopilot',
    gapTier: 'extreme',
    promptNotes:
      'A2 category: Architecture & engineering (largest-gap list). NO A1 domain plausibly matches takeoff and estimating, so no agent tool-call share is encoded and the tier comes from the A2 reading alone. Smallest line on the S1 chart — treat market size as the binding constraint on the exit story.',
    lastReviewedAt: REVIEWED,
  },

  // -------------------------------------------------------------------------
  // S1 NEXT WAVE (insourced x intelligence) — all 5
  // -------------------------------------------------------------------------
  {
    key: 'supply-chain-procurement',
    label: 'Supply chain & procurement operations',
    marketSizeUsdBn: { min: 200, max: null },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'next_wave',
    gapTier: 'high',
    anthropicAgentToolCallSharePct: 9.1,
    crowdedTasks: [A3.dataEntry],
    promptNotes:
      'A2 categories: Business & finance and Office & admin. The ledger allows either Travel and logistics (0.8%) or Back-office automation (9.1%) as the nearest A1 domain; Back-office automation is used here because the services spend is purchasing, supplier onboarding and invoice matching rather than physical movement. Largest line in the next-wave quadrant. Insourced, so the buyer is an internal ops team, not a BPO.',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'pharmacy-back-office',
    label: 'Pharmacy back office',
    marketSizeUsdBn: { min: 30, max: null },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'next_wave',
    gapTier: 'extreme',
    anthropicAgentToolCallSharePct: 1.0,
    crowdedTasks: [A3.dataEntry],
    promptNotes:
      'A2 category: Healthcare support (largest-gap list). Nearest A1 domain: Medicine and healthcare (1.0%). Prior authorization, 340B compliance and reimbursement reconciliation sit behind the counter, away from the patient-facing risk surface.',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'wealth-management-ops',
    label: 'Wealth management operations',
    marketSizeUsdBn: { min: 30, max: null },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'next_wave',
    gapTier: 'high',
    anthropicAgentToolCallSharePct: 9.1,
    crowdedTasks: [A3.financialAnalysis],
    promptNotes:
      'A2 category: Business & finance (largest-gap list). Nearest A1 domain: Back-office automation (9.1%) — account opening, transfers, billing and reporting, not investment advice. Advice itself is regulated; keep the product on the operations side of that line.',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'medical-admin',
    label: 'Medical practice administration',
    marketSizeUsdBn: { min: 20, max: null },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'next_wave',
    gapTier: 'extreme',
    anthropicAgentToolCallSharePct: 1.0,
    crowdedTasks: [A3.medicalCoding, A3.customerService],
    promptNotes:
      'A2 category: Healthcare support (largest-gap list). Nearest A1 domain: Medicine and healthcare (1.0%). The canonical Blue Filler contrast: medical CODING is already crowded (66.7% task coverage) while medical ADMIN sits in the next-wave quadrant with almost no observed agent usage. HIPAA shapes the whole build.',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'fund-administration',
    label: 'Fund administration',
    marketSizeUsdBn: { min: 15, max: 20 },
    basis: 'annual_spend',
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: 'next_wave',
    gapTier: 'high',
    anthropicAgentToolCallSharePct: 9.1,
    crowdedTasks: [A3.financialAnalysis, A3.dataEntry],
    promptNotes:
      'A2 category: Business & finance (largest-gap list). Nearest A1 domain: Back-office automation (9.1%). Small, concentrated buyer set — good for a founder-led sale, bad for bottoms-up growth; the exit story leans on strategic value to an incumbent administrator.',
    lastReviewedAt: REVIEWED,
  },

  // -------------------------------------------------------------------------
  // NON-S1 EXTREME-GAP ENTRIES (sequoiaQuadrant: null)
  // The Sequoia chart does not list these, so they carry NO market size — the
  // ledger gives none and inventing one is forbidden.
  // -------------------------------------------------------------------------
  {
    key: 'education-library-services',
    label: 'Education & library services operations',
    marketSizeUsdBn: null,
    basis: null,
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: null,
    gapTier: 'extreme',
    anthropicAgentToolCallSharePct: 1.8,
    promptNotes:
      'Not on the Sequoia chart, so no market size is encoded. A2 category: Education & library — one of the widest theoretical-vs-observed gaps on the radar. Nearest A1 domain: Education and tutoring (1.8%). Target the institutional back office (accreditation evidence, scheduling, compliance reporting), not classroom consumer apps, which the hard constraints exclude.',
    lastReviewedAt: REVIEWED,
  },
  {
    key: 'social-services-casework',
    label: 'Social services casework administration',
    marketSizeUsdBn: null,
    basis: null,
    scope: 'unknown',
    asOfYear: 2026,
    sequoiaQuadrant: null,
    gapTier: 'extreme',
    promptNotes:
      'Not on the Sequoia chart, so no market size is encoded. A2 category: Social services — largest-gap list. NO A1 domain plausibly matches, so no agent tool-call share is encoded and the tier comes from the A2 reading alone. Buyers are agencies and nonprofits with grant-funded budgets and long procurement cycles — an idea here must be honest about sales velocity.',
    lastReviewedAt: REVIEWED,
  },
] as const;

export const INDUSTRY_KEYS: readonly string[] = INDUSTRY_MAP.map((e) => e.key);

export function getIndustry(key: string): IndustryEntry | undefined {
  return INDUSTRY_MAP.find((e) => e.key === key);
}

function formatMarket(entry: IndustryEntry): string {
  if (!entry.marketSizeUsdBn) return 'not stated by the source data';
  const { min, max } = entry.marketSizeUsdBn;
  const size =
    max === null ? `$${min}B+` : max === min ? `$${min}B` : `$${min}-${max}B`;
  const basis = entry.basis === 'annual_revenue' ? 'annual revenue' : 'annual services spend';
  // "source published" rather than "as of": asOfYear is the SOURCE's publication
  // year, and the ledger warns these are TAM-framing figures. Saying "as of"
  // would assert a data currency the source never states.
  return `${size} ${basis}, scope ${entry.scope}, source published ${entry.asOfYear}`;
}

// The framing paragraph is part of the prompt contract, not decoration: it is
// what stops the model from reading a tool-call share as an adoption rate or a
// project heuristic as a published classification.
const PROMPT_PREAMBLE = [
  'Market sizes come from Sequoia Capital, "Services: The New Software" — a services-SPEND framing the article presents as illustrative, not exhaustive. Geographic scope is given only where the article states it; otherwise it is "unknown" and you must not assume it.',
  'Agent tool-call share is the share of one provider\'s sampled agent TOOL CALLS in the nearest matching domain (Anthropic, "Measuring AI agent autonomy in practice", Figure 6, 998,481 public-API tool calls, late 2025 to early 2026). It is a directional signal that agentic usage in this domain is still small — it is NOT an adoption percentage, and it says nothing about what share of firms or work in the industry uses AI.',
  'Gap tier is a HonuVibe heuristic derived from Anthropic\'s theoretical-versus-observed capability radar. It is not an Anthropic classification.',
  'Crowded tasks are tasks with high observed task coverage in Anthropic\'s most-exposed-occupations table. Treat them as a caution to steer toward ADJACENT under-covered tasks — high coverage is not proof the market is served.',
].join('\n');

/**
 * Deterministic prompt block for one or more industries. Pass a single entry for
 * a targeted generation, or the whole map for an untargeted one. Pure — no
 * clock, no randomness — so the generator tests can assert it byte-for-byte.
 */
export function buildIndustryPromptBlock(entries: readonly IndustryEntry[]): string {
  const lines = entries.map((entry) => {
    const parts = [
      `- key: ${entry.key}`,
      `  label: ${entry.label}`,
      `  market: ${formatMarket(entry)}`,
      `  sequoia quadrant: ${entry.sequoiaQuadrant ?? 'not on the Sequoia chart'}`,
      `  gap tier: ${entry.gapTier}`,
    ];
    parts.push(
      entry.anthropicAgentToolCallSharePct === undefined
        ? '  agent tool-call share: not encoded (no matching domain)'
        : `  agent tool-call share: ${entry.anthropicAgentToolCallSharePct}%`,
    );
    if (entry.crowdedTasks?.length) {
      parts.push(`  already-crowded tasks: ${entry.crowdedTasks.join('; ')}`);
    }
    parts.push(`  notes: ${entry.promptNotes}`);
    return parts.join('\n');
  });

  return `<industry_map>\n${PROMPT_PREAMBLE}\n\n${lines.join('\n\n')}\n</industry_map>`;
}
