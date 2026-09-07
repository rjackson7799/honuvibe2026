export const BUSINESS_GOALS = [
  'increase_revenue',
  'save_time',
  'improve_customer_experience',
  'build_visibility',
  'strengthen_career',
] as const;

export const WORK_MODELS = [
  'small_business',
  'solopreneur',
  'employed_professional',
  'team_leader',
] as const;

export const INDUSTRIES = [
  'professional_services',
  'retail_ecommerce',
  'hospitality',
  'health_wellness',
  'real_estate',
  'creative',
  'technology',
  'other',
] as const;

export const AI_CONFIDENCE_LEVELS = ['beginner', 'comfortable', 'advanced'] as const;
export const BUSINESS_UPGRADE_STEP_TYPES = ['vault', 'workbench', 'action', 'measurement'] as const;
export const MEASUREMENT_KINDS = ['baseline', 'result'] as const;
export const METRIC_VALUE_TYPES = ['number', 'minutes', 'percentage', 'currency'] as const;
export const IMPROVEMENT_DIRECTIONS = ['increase', 'decrease'] as const;
export const RECOMMENDATION_REASONS = [
  'goal_match',
  'work_model_match',
  'industry_match',
  'confidence_fit',
  'time_fit',
] as const;

export type BusinessGoal = (typeof BUSINESS_GOALS)[number];
export type WorkModel = (typeof WORK_MODELS)[number];
export type Industry = (typeof INDUSTRIES)[number];
export type AiConfidence = (typeof AI_CONFIDENCE_LEVELS)[number];
export type BusinessUpgradeStepType = (typeof BUSINESS_UPGRADE_STEP_TYPES)[number];
export type MeasurementKind = (typeof MEASUREMENT_KINDS)[number];
export type MetricValueType = (typeof METRIC_VALUE_TYPES)[number];
export type ImprovementDirection = (typeof IMPROVEMENT_DIRECTIONS)[number];
export type RecommendationReason = (typeof RECOMMENDATION_REASONS)[number];

type Label = { en: string; ja: string };

export const GOAL_LABELS: Record<BusinessGoal, Label> = {
  increase_revenue: { en: 'Increase revenue', ja: '売上を伸ばす' },
  save_time: { en: 'Save time', ja: '時間を節約する' },
  improve_customer_experience: { en: 'Improve customer experience', ja: '顧客体験を改善する' },
  build_visibility: { en: 'Build visibility', ja: '認知度を高める' },
  strengthen_career: { en: 'Strengthen my career', ja: 'キャリアを強化する' },
};

export const WORK_MODEL_LABELS: Record<WorkModel, Label> = {
  small_business: { en: 'Small business', ja: '中小企業' },
  solopreneur: { en: 'Solopreneur', ja: 'ひとり起業家' },
  employed_professional: { en: 'Employed professional', ja: '会社員・専門職' },
  team_leader: { en: 'Team leader', ja: 'チームリーダー' },
};

export const INDUSTRY_LABELS: Record<Industry, Label> = {
  professional_services: { en: 'Professional services', ja: 'プロフェッショナルサービス' },
  retail_ecommerce: { en: 'Retail / ecommerce', ja: '小売・EC' },
  hospitality: { en: 'Hospitality', ja: '観光・ホスピタリティ' },
  health_wellness: { en: 'Health / wellness', ja: '健康・ウェルネス' },
  real_estate: { en: 'Real estate', ja: '不動産' },
  creative: { en: 'Creative services', ja: 'クリエイティブ' },
  technology: { en: 'Technology', ja: 'テクノロジー' },
  other: { en: 'Other', ja: 'その他' },
};

export const CONFIDENCE_LABELS: Record<AiConfidence, Label> = {
  beginner: { en: 'I am getting started', ja: 'これから始める' },
  comfortable: { en: 'I use AI sometimes', ja: '時々AIを使っている' },
  advanced: { en: 'AI is already part of my work', ja: 'AIを日常的に活用している' },
};

export const REASON_LABELS: Record<RecommendationReason, Label> = {
  goal_match: { en: 'Matches your main goal', ja: '主な目標に合っています' },
  work_model_match: { en: 'Fits how you work', ja: '働き方に合っています' },
  industry_match: { en: 'Relevant to your industry', ja: '業界に関連しています' },
  confidence_fit: { en: 'Fits your AI experience', ja: 'AI経験に合っています' },
  time_fit: { en: 'Fits your available time', ja: '利用可能な時間に合っています' },
};

export function labelFor<T extends string>(labels: Record<T, Label>, code: T, locale: string) {
  return locale === 'ja' ? labels[code].ja : labels[code].en;
}
