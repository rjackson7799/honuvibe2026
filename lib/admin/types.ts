// Admin-specific types

import type {
  BriefStatus,
  EngagementCurrency,
  EngagementEventActor,
  EngagementEventKind,
  EngagementLocale,
  EngagementStage,
  EngagementTier,
  QuestionnaireStatus,
  TailoringStatus,
} from '@/lib/studio/engagement/types';
import type { AnswerSnapshot, QuestionnaireSection, EngagementQuestion } from '@/lib/studio/engagement/questions-schema';
import type {
  AcceptedVia,
  DataBasis,
  DeliverablePhase,
  DeliverableStatus,
  DeliveryMethod,
  DraftingStatus,
  InvoiceKind,
  InvoiceStatus,
  PricingMode,
  ProposalStatus,
} from '@/lib/studio/engagement/types';
import type { PricedOffer } from '@/lib/studio/engagement/proposal-pricing';
import type { PerformanceTerms, ProposalSection } from '@/lib/studio/engagement/proposal-schema';
import type { IssuedSnapshot } from '@/lib/studio/engagement/proposal-document';
import type { EngagementRef } from '@/lib/studio/engagement/queries';

export type UserRole = 'student' | 'admin' | 'instructor';
export type SubscriptionTier = 'free' | 'community' | 'vault';
export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'cancelled' | 'trialing';
export type ApplicationStatus = 'received' | 'reviewing' | 'responded' | 'archived';
export type PartnershipInquiryStatus = ApplicationStatus;

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  stripe_customer_id: string | null;
  subscription_tier: SubscriptionTier;
  subscription_stripe_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  locale_preference: 'en' | 'ja';
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  name: string;
  email: string;
  company: string | null;
  website: string | null;
  engagement_type: string | null;
  project_description: string | null;
  desired_outcome: string | null;
  referral_source: string | null;
  timeline: string | null;
  budget_range: string | null;
  locale: string;
  status: ApplicationStatus;
  notes: string | null;
  submitted_at: string;
}

export interface PartnershipInquiry {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  organization: string;
  website: string | null;
  org_type: string;
  community_description: string;
  program_description: string;
  audience_size: string | null;
  language: string | null;
  timeline: string | null;
  referral_source: string | null;
  source_locale: 'en' | 'ja';
  status: PartnershipInquiryStatus;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export type FeedbackStatus = 'new' | 'reviewing' | 'resolved' | 'archived';
export type FeedbackCategory = 'general' | 'idea' | 'problem';

export interface Feedback {
  id: string;
  created_at: string;
  user_id: string | null;
  category: FeedbackCategory;
  message: string;
  page_path: string | null;
  status: FeedbackStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  // Embedded from public.users for the admin inbox.
  users?: { full_name: string | null; email: string | null } | null;
}

export type StudioLeadStatus =
  | 'new'
  | 'qualified'
  | 'proposal'
  | 'won'
  | 'lost';

// Field names are the aliased vocabulary (full_name/company/status/project_type);
// the leads-table column names (name/business_name/sales_stage/tier_interest) live
// only in the UI→DB mapping helper inside lib/studio/lead-actions.ts.
export interface StudioLead {
  id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  company: string;
  industry: string | null;
  project_type: string | null;
  budget_range: string | null;
  timeline: string | null;
  message: string | null;
  referral_source: string | null;
  source_locale: 'en' | 'ja';
  status: StudioLeadStatus;
  notes: string | null;
  phone: string | null;
  existing_url: string | null;
  source: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  /** The lead's engagement (migration 067), embedded by getStudioLeads; null when unengaged. */
  engagement?: EngagementRef | null;
}

// The lead workspace (detail page) — StudioLead plus the workspace-only columns
// added by migration 056.
export interface StudioLeadDetail extends StudioLead {
  preview_url: string | null;
  preview_password: string | null;
  outreach_email_subject: string | null;
  outreach_email_body: string | null;
  outreach_email_generated_at: string | null;
  updated_at: string;
}

export type LeadAuditStatus = 'generating' | 'completed' | 'partial' | 'failed';

export interface LeadAuditFinding {
  id: string;
  category: 'security' | 'seo' | 'mobile' | 'conversion' | 'freshness' | 'accessibility';
  severity: 'critical' | 'warn' | 'info' | 'pass';
  title: string;
  evidence: string;
}

// One website-audit run against a lead's current site (migration 060). The
// background job fills scores/findings/tech/psi (deterministic) and, when the
// Claude call succeeds, narrative — else the row is `partial` with narrative null.
export interface LeadAudit {
  id: string;
  lead_id: string;
  created_at: string;
  updated_at: string;
  status: LeadAuditStatus;
  audited_url: string;
  scores: {
    overall: number;
    categories: Record<LeadAuditFinding['category'], number>;
  } | null;
  findings: LeadAuditFinding[] | null;
  tech: Record<string, unknown> | null;
  psi: {
    strategy: 'mobile';
    categories: {
      performance: number | null;
      accessibility: number | null;
      best_practices: number | null;
      seo: number | null;
    };
    metrics?: Record<string, number | null>;
  } | null;
  narrative: {
    one_liner: string;
    current_state_md: string;
    opportunities_md: string;
    competitive_md: string;
    next_steps_md: string;
  } | null;
  summary_md: string | null;
  model_id: string | null;
  generation_error: string | null;
  completed_at: string | null;
}

export type ProspectStatus =
  | 'new'
  | 'scoring'
  | 'scored'
  | 'score_failed'
  | 'no_website'
  | 'converted'
  | 'dismissed';

// One Google Places result the Prospect Finder has seen (migration 061).
// Repeat searches refresh the Places columns on place_id; converted/dismissed
// statuses survive the refresh. Higher score = worse website = more opportunity.
export interface Prospect {
  id: string;
  created_at: string;
  place_id: string;
  name: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  rating: number | null;
  review_count: number | null;
  industry: string;
  location: string;
  search_query: string;
  status: ProspectStatus;
  score: number | null;
  score_breakdown: { id: string; label: string; points: number }[] | null;
  tech: Record<string, unknown> | null;
  converted_lead_id: string | null;
  dismissed_from: string | null;
  scored_at: string | null;
  scoring_started_at: string | null;
}

// ── Studio engagement spine (migration 067) ──────────────────────────────────
// Row shapes for the admin surfaces. The enums live in
// lib/studio/engagement/types.ts (stage vocabulary is parity-pinned to SQL).

export type { EngagementRef };

export interface Engagement {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string;
  title: string;
  locale: EngagementLocale;
  client_contact_name: string | null;
  client_contact_email: string | null;
  stage: EngagementStage;
  stage_entered_at: string;
  tier: EngagementTier | null;
  currency: EngagementCurrency;
  contract_value: number | null; // minor units (USD cents / JPY yen)
  care_mrr: number | null;
  won_at: string | null;
  care_started_at: string | null;
  care_ended_at: string | null;
  ended_at: string | null;
  lost_reason: string | null;
  next_action: string | null;
  next_action_due_at: string | null;
  notes: string | null;
}

export interface EngagementEvent {
  id: string;
  engagement_id: string;
  created_at: string;
  kind: EngagementEventKind;
  actor: EngagementEventActor;
  from_stage: EngagementStage | null;
  to_stage: EngagementStage | null;
  summary: string;
  data: Record<string, unknown>;
  needs_attention: boolean;
  resolved_at: string | null;
}

export interface EngagementQuestionnaire {
  id: string;
  engagement_id: string;
  created_at: string;
  updated_at: string;
  kind: 'discovery';
  locale: EngagementLocale;
  title: string;
  intro_md: string | null;
  template_key: string | null;
  sections: QuestionnaireSection[];
  questions: EngagementQuestion[];
  questions_version: number;
  status: QuestionnaireStatus;
  tailoring_status: TailoringStatus;
  tailoring_started_at: string | null;
  tailored_at: string | null;
  tailoring_error: string | null;
  tailoring_model_id: string | null;
  tailoring_pipeline_version: string | null;
  access_token_hash: string | null;
  token_issued_at: string | null;
  token_expires_at: string | null;
  token_revoked_at: string | null;
  open_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  sent_at: string | null;
  submitted_at: string | null;
  notification_sent_at: string | null;
  answer_snapshot: AnswerSnapshot | null;
}

export interface EngagementBrief {
  id: string;
  engagement_id: string;
  questionnaire_id: string | null;
  created_at: string;
  updated_at: string;
  status: BriefStatus;
  digest_md: string | null;
  brief_md: string | null;
  structured: Record<string, unknown> | null;
  source_snapshot: Record<string, unknown> | null;
  model_id: string | null;
  pipeline_version: string | null;
  build_sha: string | null;
  generation_error: string | null;
  completed_at: string | null;
}

// One versioned priced offer (migration 074). The token is stored ONLY as its
// hash; issued_snapshot is the frozen document; money is minor units in
// `currency`.
export interface EngagementProposal {
  id: string;
  created_at: string;
  updated_at: string;
  engagement_id: string;
  version: number;
  locale: EngagementLocale;
  title: string;
  status: ProposalStatus;
  content_version: number;
  currency: EngagementCurrency;
  tier: EngagementTier;
  pricing_mode: PricingMode;
  pricing: PricedOffer;
  total_build: number;
  total_monthly: number;
  performance_terms: PerformanceTerms | null;
  data_basis: DataBasis;
  brief_id: string | null;
  valid_until: string | null;
  sections: ProposalSection[];
  drafting_status: DraftingStatus;
  drafting_started_at: string | null;
  drafted_at: string | null;
  drafting_run_id: string | null;
  drafting_input_version: number | null;
  drafting_error: string | null;
  drafting_model_id: string | null;
  drafting_pipeline_version: string | null;
  source_snapshot: Record<string, unknown> | null;
  issued_snapshot: IssuedSnapshot | null;
  issued_pdf_path: string | null;
  issued_pdf_sha256: string | null;
  sent_at: string | null;
  delivery_method: DeliveryMethod | null;
  access_token_hash: string | null;
  token_issued_at: string | null;
  token_expires_at: string | null;
  token_revoked_at: string | null;
  open_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  accepted_via: AcceptedVia | null;
  notification_sent_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  withdrawn_at: string | null;
  superseded_at: string | null;
  superseded_by: string | null;
}

// One money row (migration 075). Amounts are integer minor units in
// `currency`. `recipient_email` is the engagement contact SNAPSHOTTED at
// issue and is immutable — the Checkout params are built from it and from
// the other immutable columns, never from the live engagement. The Checkout
// URL is never stored; only the session id and its expiry.
export interface EngagementInvoice {
  id: string;
  created_at: string;
  updated_at: string;
  engagement_id: string;
  proposal_id: string | null;
  kind: InvoiceKind;
  pct_of_build: number | null;
  label: string;
  currency: EngagementCurrency;
  amount: number;
  recipient_email: string | null;
  status: InvoiceStatus;
  sent_at: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  invoice_email_sent_at: string | null;
  stripe_checkout_session_id: string | null;
  checkout_session_expires_at: string | null;
  awaiting_async_payment_at: string | null;
  mint_attempt: number;
  checkout_count: number;
  stripe_payment_intent_id: string | null;
  amount_refunded: number | null;
  /** Decision 8 — the care-billing attach point. Unused this slice. */
  stripe_subscription_id: string | null;
}

// One build/launch deliverable (migration 075). `delivered_at` is owned by
// the DB guard: it is filled on a move into delivered|accepted, cleared on a
// move back, and preserved through ordinary edits.
export interface EngagementDeliverable {
  id: string;
  created_at: string;
  updated_at: string;
  engagement_id: string;
  proposal_id: string | null;
  title: string;
  phase: DeliverablePhase;
  status: DeliverableStatus;
  due_on: string | null;
  delivered_at: string | null;
  notes_md: string | null;
  sort_order: number;
}

// One row of the engagement_list view — the list page's pre-aggregated read.
export interface EngagementListItem {
  id: string;
  lead_id: string;
  title: string;
  locale: EngagementLocale;
  stage: EngagementStage;
  stage_entered_at: string;
  created_at: string;
  updated_at: string;
  tier: EngagementTier | null;
  client_contact_name: string | null;
  client_contact_email: string | null;
  next_action: string | null;
  next_action_due_at: string | null;
  won_at: string | null;
  ended_at: string | null;
  discovery_id: string | null;
  discovery_status: QuestionnaireStatus | null;
  discovery_sent_at: string | null;
  discovery_submitted_at: string | null;
  discovery_token_expires_at: string | null;
  discovery_token_revoked_at: string | null;
  discovery_question_count: number;
  discovery_answered_count: number;
  latest_brief_status: BriefStatus | null;
  last_activity_at: string | null;
  open_attention_count: number;
  // The latest-version proposal (074) — nine columns appended to the view.
  proposal_id: string | null;
  proposal_version: number | null;
  proposal_status: ProposalStatus | null;
  proposal_sent_at: string | null;
  proposal_accepted_at: string | null;
  proposal_total_build: number | null;
  proposal_currency: EngagementCurrency | null;
  proposal_open_count: number | null;
  proposal_first_opened_at: string | null;
  // The live deposit + the build-phase deliverable counters (075) — six
  // columns appended to the view after proposal_first_opened_at.
  deposit_invoice_id: string | null;
  deposit_status: InvoiceStatus | null;
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  deliverables_open_count: number;
  deliverables_total_count: number;
}

export interface DashboardStats {
  active_courses: number;
  total_enrolled: number;
  spots_remaining: { course_id: string; course_title: string; remaining: number }[];
  upcoming_sessions: {
    id: string;
    title_en: string;
    scheduled_at: string;
    course_title: string;
  }[];
  recent_enrollments: {
    id: string;
    user_name: string;
    course_title: string;
    enrolled_at: string;
  }[];
  pending_applications: number;
}

export interface StudentListItem {
  id: string;
  email: string | null;
  full_name: string | null;
  enrolled_courses: string[];
  subscription_status: string;
  subscription_tier: string;
  survey_status: 'pending' | 'completed' | null;
  created_at: string;
}

export interface RevenueStats {
  total_usd: number;
  total_jpy: number;
  month_usd: number;
  month_jpy: number;
  active_subscribers: number;
  active_enrollments: number;
}

export interface TransactionRecord {
  id: string;
  user_name: string | null;
  user_email: string | null;
  type: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  receipt_url: string | null;
  created_at: string;
}

export interface StudentDetail extends UserProfile {
  email_confirmed_at: string | null;
  enrollments: {
    id: string;
    course_id: string;
    course_title: string;
    status: string;
    amount_paid: number | null;
    currency: string;
    enrolled_at: string;
  }[];
}
