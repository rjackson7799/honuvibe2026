import type {
  AiConfidence,
  BusinessGoal,
  BusinessUpgradeStepType,
  ImprovementDirection,
  Industry,
  MeasurementKind,
  MetricValueType,
  RecommendationReason,
  WorkModel,
} from './codes';

export type LocalizedText = { en: string; ja: string };

export interface BusinessUpgradeAssessmentInput {
  goal: BusinessGoal;
  workModel: WorkModel;
  industry?: Industry | null;
  aiConfidence: AiConfidence;
  weeklyTimeMinutes: number;
  currentTools: string[];
  businessName?: string | null;
  offerSummary?: string | null;
  customerSummary?: string | null;
  locale: 'en' | 'ja';
}

export interface BusinessUpgradeProjectForRecommendation {
  id: string;
  slug: string;
  templateVersion: number;
  featured: boolean;
  goalCodes: BusinessGoal[];
  workModelCodes: WorkModel[] | null;
  industryCodes: Industry[] | null;
  minConfidence: AiConfidence;
  maxConfidence: AiConfidence;
  estimatedDays: number;
  totalMinutes: number;
  requiresWorkbench: boolean;
}

export interface BusinessUpgradeRecommendation {
  projectId: string;
  projectSlug: string;
  projectVersion: number;
  rank: number;
  score: number;
  reasonCodes: RecommendationReason[];
}

export interface BusinessUpgradeProjectSummary {
  id: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  outcome: LocalizedText;
  deliverable: LocalizedText;
  estimatedDays: number;
  totalMinutes: number;
  metricLabel: LocalizedText;
  metricUnit: string;
  status: 'draft' | 'published' | 'archived';
  templateVersion: number;
}

export interface BusinessUpgradePlanStep {
  id: string;
  sortOrder: number;
  stepType: BusinessUpgradeStepType;
  measurementKind: MeasurementKind | null;
  title: LocalizedText;
  instructions: LocalizedText;
  contentItemId: string | null;
  contentSlug: string | null;
  workbenchScenarioId: string | null;
  workbenchSlug: string | null;
  estimatedMinutes: number;
  required: boolean;
  status: 'pending' | 'completed';
  completedAt: string | null;
}

export interface BusinessUpgradePlanDetail {
  id: string;
  projectSlug: string;
  status: 'active' | 'completed' | 'archived';
  title: LocalizedText;
  outcome: LocalizedText;
  deliverable: LocalizedText;
  metricLabel: LocalizedText;
  metricUnit: string;
  metricValueType: MetricValueType;
  improvementDirection: ImprovementDirection;
  baselineValue: number | null;
  resultValue: number | null;
  startedAt: string;
  completedAt: string | null;
  steps: BusinessUpgradePlanStep[];
}

export interface BusinessUpgradePlanListStep {
  id: string;
  status: 'pending' | 'completed';
  required: boolean;
  sort_order?: number;
  title_en?: string;
  title_ja?: string;
}

export interface BusinessUpgradePlanListRow {
  id: string;
  user_id?: string;
  status: 'active' | 'completed' | 'archived';
  title_en: string;
  title_ja: string;
  outcome_en: string;
  outcome_ja: string;
  started_at: string;
  completed_at: string | null;
  archived_at: string | null;
  business_upgrade_plan_steps: BusinessUpgradePlanListStep[] | null;
}

export interface BusinessUpgradeTemplateStepRow {
  id: string;
  sort_order: number;
  step_type: BusinessUpgradeStepType;
  measurement_kind: MeasurementKind | null;
  title_en: string;
  title_ja: string;
  instructions_en: string;
  instructions_ja: string;
  content_item_id: string | null;
  workbench_scenario_id: string | null;
  estimated_minutes: number;
  required: boolean;
}

export interface BusinessUpgradeProjectEditorRow {
  id: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  template_version: number;
  title_en: string;
  title_ja: string;
  description_en: string;
  description_ja: string;
  outcome_en: string;
  outcome_ja: string;
  deliverable_en: string;
  deliverable_ja: string;
  metric_label_en: string;
  metric_label_ja: string;
  metric_unit: string;
  metric_value_type: MetricValueType;
  metric_min: number;
  metric_max: number;
  improvement_direction: ImprovementDirection;
  goal_codes: BusinessGoal[];
  work_model_codes: WorkModel[] | null;
  industry_codes: Industry[] | null;
  min_confidence: AiConfidence;
  max_confidence: AiConfidence;
  estimated_days: number;
  total_minutes: number;
  featured: boolean;
  jp_needs_review: boolean;
  business_upgrade_project_steps: BusinessUpgradeTemplateStepRow[] | null;
}

export interface BusinessUpgradeAuthoringResource {
  id: string;
  slug: string;
  title_en: string;
  title_jp?: string | null;
}

export interface BusinessUpgradeRecommendationRow {
  id: string;
  rank: number;
  score: number;
  reason_codes: RecommendationReason[];
  expires_at: string;
  project_template_version: number;
  business_upgrade_projects: BusinessUpgradeRecommendationProjectRow | BusinessUpgradeRecommendationProjectRow[] | null;
}

export interface BusinessUpgradeRecommendationProjectRow {
  id: string;
  slug: string;
  title_en: string;
  title_ja: string;
  description_en: string;
  description_ja: string;
  outcome_en: string;
  outcome_ja: string;
  deliverable_en: string;
  deliverable_ja: string;
  estimated_days: number;
  total_minutes: number;
  status: 'draft' | 'published' | 'archived';
  template_version: number;
}

export interface BusinessUpgradeMemberIdentity {
  email: string | null;
  full_name: string | null;
}

export interface BusinessUpgradeMemberProfileRow {
  business_name: string | null;
  work_model_code: WorkModel | null;
  offer_summary: string | null;
  customer_summary: string | null;
}

export interface BusinessUpgradeMemberPlanRow extends BusinessUpgradePlanListRow {
  user_id: string;
  users: BusinessUpgradeMemberIdentity | BusinessUpgradeMemberIdentity[] | null;
}

export interface BusinessUpgradeMemberPlanDetailRow extends BusinessUpgradeMemberPlanRow {
  business_upgrade_profile: BusinessUpgradeMemberProfileRow | null;
  business_upgrade_plan_steps: Array<BusinessUpgradePlanListStep & {
    instructions_en?: string;
    instructions_ja?: string;
  }>;
}
