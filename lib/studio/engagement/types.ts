// Domain vocabulary for the Studio engagement spine (migration 067). Pure — no
// DB, no React. Row shapes for the admin surfaces live in lib/admin/types.ts
// (appended after the Prospect block) and import from here so every enum has
// one home. The stage vocabulary itself lives in ./stages (it is parity-pinned
// to SQL) and is re-exported for convenience.

export type {
  ActiveEngagementStage,
  EngagementStage,
  MirroredSalesStage,
  TerminalEngagementStage,
} from './stages';

export type EngagementLocale = 'en' | 'ja';
export type EngagementTier = 'starter' | 'pro' | 'ai_native';
export type EngagementCurrency = 'USD' | 'JPY';

export const ENGAGEMENT_EVENT_KINDS = [
  'stage_changed',
  'note',
  'questionnaire_drafted',
  'questionnaire_tailored',
  'questionnaire_ready',
  'questionnaire_back_to_draft',
  'questionnaire_sent',
  'questionnaire_opened',
  'questionnaire_submitted',
  'questionnaire_reopened',
  'questionnaire_revoked',
  'questionnaire_reset',
  'brief_generated',
  'brief_failed',
  'notification_sent',
  'notification_failed',
  'proposal_drafted',
  'proposal_ai_drafted',
  'proposal_ai_failed',
  'proposal_ready',
  'proposal_back_to_draft',
  'proposal_sent',
  'proposal_opened',
  'proposal_accepted',
  'proposal_acceptance_voided',
  'proposal_withdrawn',
  'proposal_superseded',
  'proposal_revoked',
  'invoice_issued',
  'invoice_paid',
  'invoice_payment_failed',
  'invoice_duplicate_payment',
  'invoice_refunded',
  'invoice_voided',
  'deliverables_seeded',
  'deliverable_delivered',
] as const;
export type EngagementEventKind = (typeof ENGAGEMENT_EVENT_KINDS)[number];

export type EngagementEventActor = 'admin' | 'client' | 'system';

export const QUESTIONNAIRE_STATUSES = ['draft', 'ready', 'sent', 'in_progress', 'submitted'] as const;
export type QuestionnaireStatus = (typeof QUESTIONNAIRE_STATUSES)[number];

export type TailoringStatus = 'none' | 'generating' | 'completed' | 'failed';

export type BriefStatus = 'generating' | 'completed' | 'partial' | 'failed';

// Proposal vocabulary (migration 074). Parity with the SQL CHECKs is asserted
// by supabase/tests/engagement_proposals_rls.test.ts.
export const PROPOSAL_STATUSES = ['draft', 'ready', 'sent', 'accepted', 'voided', 'superseded', 'withdrawn'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const PRICING_MODES = ['fixed', 'performance', 'hybrid'] as const;
export type PricingMode = (typeof PRICING_MODES)[number];

export const DATA_BASES = ['client_records', 'provisional'] as const;
export type DataBasis = (typeof DATA_BASES)[number];

export type DraftingStatus = 'none' | 'generating' | 'completed' | 'failed';

export type DeliveryMethod = 'link' | 'manual';

export type AcceptedVia = 'client' | 'admin';

/** The seven fixed section keys, in document order. The editor cannot add or remove one. */
export const PROPOSAL_SECTION_KEYS = [
  'exec_summary',
  'takeaways',
  'recommendation',
  'scope',
  'investment_notes',
  'terms',
  'next_steps',
] as const;
export type ProposalSectionKey = (typeof PROPOSAL_SECTION_KEYS)[number];

/** The five keys the AI may write. `terms` and `next_steps` are never model-written. */
export const PROPOSAL_AI_SECTION_KEYS = ['exec_summary', 'takeaways', 'recommendation', 'scope', 'investment_notes'] as const;
export type ProposalAiSectionKey = (typeof PROPOSAL_AI_SECTION_KEYS)[number];

/** The sections `ready` and issue require non-blank (TS in markProposalReady, SQL in the issue RPC). */
export const PROPOSAL_REQUIRED_SECTION_KEYS = ['exec_summary', 'recommendation', 'scope', 'terms'] as const;

export type {
  AnswerSnapshot,
  AnswerValue,
  EngagementQuestion,
  QuestionOption,
  QuestionnaireManifest,
  QuestionnaireSection,
  StoredAnswer,
} from './questions-schema';

// Invoice + deliverable vocabulary (migration 075). Parity with the SQL CHECKs
// is asserted by supabase/tests/engagement_invoices_rls.test.ts.
export const INVOICE_KINDS = ['deposit', 'balance', 'care_month'] as const;
export type InvoiceKind = (typeof INVOICE_KINDS)[number];

export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'refunded', 'void'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const DELIVERABLE_PHASES = ['build', 'launch'] as const;
export type DeliverablePhase = (typeof DELIVERABLE_PHASES)[number];

export const DELIVERABLE_STATUSES = ['planned', 'in_progress', 'delivered', 'accepted'] as const;
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

/**
 * The only deposit percentages Ryan may choose (decision 2 — no typed
 * amounts). 50 is the default; flipping this order flips the radio default.
 */
export const DEPOSIT_PCTS = [50, 100] as const;
export type DepositPct = (typeof DEPOSIT_PCTS)[number];
