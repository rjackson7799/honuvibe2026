import { z } from 'zod';
import {
  AI_CONFIDENCE_LEVELS,
  BUSINESS_GOALS,
  BUSINESS_UPGRADE_STEP_TYPES,
  IMPROVEMENT_DIRECTIONS,
  INDUSTRIES,
  MEASUREMENT_KINDS,
  METRIC_VALUE_TYPES,
  RECOMMENDATION_REASONS,
  WORK_MODELS,
} from './codes';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((value) => value || null);

export const assessmentInputSchema = z.object({
  goal: z.enum(BUSINESS_GOALS),
  workModel: z.enum(WORK_MODELS),
  industry: z.enum(INDUSTRIES).optional().nullable(),
  aiConfidence: z.enum(AI_CONFIDENCE_LEVELS),
  weeklyTimeMinutes: z.coerce.number().int().min(15).max(1200),
  currentTools: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  businessName: optionalText(160),
  offerSummary: optionalText(600),
  customerSummary: optionalText(600),
  locale: z.enum(['en', 'ja']),
});

export const projectStepInputSchema = z.object({
  id: z.string().uuid().optional(),
  sortOrder: z.number().int().min(1).max(100),
  stepType: z.enum(BUSINESS_UPGRADE_STEP_TYPES),
  measurementKind: z.enum(MEASUREMENT_KINDS).nullable().optional(),
  titleEn: z.string().trim().min(1).max(200),
  titleJa: z.string().trim().min(1).max(200),
  instructionsEn: z.string().trim().min(1).max(4000),
  instructionsJa: z.string().trim().min(1).max(4000),
  contentItemId: z.string().uuid().nullable().optional(),
  workbenchScenarioId: z.string().uuid().nullable().optional(),
  estimatedMinutes: z.number().int().min(1).max(1440),
  required: z.boolean().default(true),
});

export const projectInputSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  titleEn: z.string().trim().min(1).max(200),
  titleJa: z.string().trim().min(1).max(200),
  descriptionEn: z.string().trim().min(1).max(1000),
  descriptionJa: z.string().trim().min(1).max(1000),
  outcomeEn: z.string().trim().min(1).max(600),
  outcomeJa: z.string().trim().min(1).max(600),
  deliverableEn: z.string().trim().min(1).max(600),
  deliverableJa: z.string().trim().min(1).max(600),
  metricLabelEn: z.string().trim().min(1).max(160),
  metricLabelJa: z.string().trim().min(1).max(160),
  metricUnit: z.string().trim().min(1).max(40),
  metricValueType: z.enum(METRIC_VALUE_TYPES),
  metricMin: z.number().min(-1_000_000_000).max(1_000_000_000),
  metricMax: z.number().min(-1_000_000_000).max(1_000_000_000),
  improvementDirection: z.enum(IMPROVEMENT_DIRECTIONS),
  goalCodes: z.array(z.enum(BUSINESS_GOALS)).min(1),
  workModelCodes: z.array(z.enum(WORK_MODELS)).nullable(),
  industryCodes: z.array(z.enum(INDUSTRIES)).nullable(),
  minConfidence: z.enum(AI_CONFIDENCE_LEVELS),
  maxConfidence: z.enum(AI_CONFIDENCE_LEVELS),
  estimatedDays: z.number().int().min(1).max(90),
  totalMinutes: z.number().int().min(15).max(10_000),
  featured: z.boolean().default(false),
  jpNeedsReview: z.boolean().default(true),
  steps: z.array(projectStepInputSchema).min(1).max(20),
}).refine((value) => value.metricMin < value.metricMax, {
  message: 'Metric minimum must be below maximum',
  path: ['metricMax'],
});

export const recommendationReasonSchema = z.enum(RECOMMENDATION_REASONS);

export const planSelectionSchema = z.object({
  assessmentId: z.string().uuid(),
  projectId: z.string().uuid(),
});

export const stepStatusSchema = z.object({
  planId: z.string().uuid(),
  stepId: z.string().uuid(),
  completed: z.boolean(),
  measurementValue: z.number().finite().nullable().optional(),
});

export const planLifecycleSchema = z.object({
  planId: z.string().uuid(),
  action: z.enum(['archive', 'reactivate']),
});

export type BusinessUpgradeProjectInput = z.infer<typeof projectInputSchema>;
export type BusinessUpgradeProjectStepInput = z.infer<typeof projectStepInputSchema>;
