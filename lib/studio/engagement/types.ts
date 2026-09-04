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
] as const;
export type EngagementEventKind = (typeof ENGAGEMENT_EVENT_KINDS)[number];

export type EngagementEventActor = 'admin' | 'client' | 'system';

export const QUESTIONNAIRE_STATUSES = ['draft', 'ready', 'sent', 'in_progress', 'submitted'] as const;
export type QuestionnaireStatus = (typeof QUESTIONNAIRE_STATUSES)[number];

export type TailoringStatus = 'none' | 'generating' | 'completed' | 'failed';

export type BriefStatus = 'generating' | 'completed' | 'partial' | 'failed';

export type {
  AnswerSnapshot,
  AnswerValue,
  EngagementQuestion,
  QuestionOption,
  QuestionnaireManifest,
  QuestionnaireSection,
  StoredAnswer,
} from './questions-schema';
