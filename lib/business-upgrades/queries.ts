import { createAdminClient } from '@/lib/supabase/server';
import type {
  BusinessUpgradePlanDetail,
  BusinessUpgradePlanStep,
  BusinessUpgradeProjectForRecommendation,
  BusinessUpgradeProjectSummary,
  BusinessUpgradeProjectEditorRow,
  BusinessUpgradeAuthoringResource,
  BusinessUpgradeRecommendationRow,
  BusinessUpgradePlanListRow,
  BusinessUpgradeMemberPlanRow,
  BusinessUpgradeMemberPlanDetailRow,
  LocalizedText,
} from './types';

// Migration 076 is intentionally not in the generated Supabase types until deployment.
// Keep ungenerated database rows contained in this adapter.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const localized = (row: Row, key: string): LocalizedText => ({
  en: row[`${key}_en`] ?? '',
  ja: row[`${key}_ja`] ?? row[`${key}_jp`] ?? row[`${key}_en`] ?? '',
});

export async function listRecommendationProjects(): Promise<BusinessUpgradeProjectForRecommendation[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('business_upgrade_projects')
    .select('id,slug,template_version,featured,goal_codes,work_model_codes,industry_codes,min_confidence,max_confidence,estimated_days,total_minutes,business_upgrade_project_steps(step_type,content_item_id,workbench_scenario_id)')
    .eq('status', 'published');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Row) => ({
    id: row.id,
    slug: row.slug,
    templateVersion: row.template_version,
    featured: row.featured,
    goalCodes: row.goal_codes,
    workModelCodes: row.work_model_codes,
    industryCodes: row.industry_codes,
    minConfidence: row.min_confidence,
    maxConfidence: row.max_confidence,
    estimatedDays: row.estimated_days,
    totalMinutes: row.total_minutes,
    requiresWorkbench: (row.business_upgrade_project_steps ?? []).some((step: Row) => step.step_type === 'workbench'),
  }));
}

export async function getAssessmentRecommendations(userId: string, assessmentId: string): Promise<{
  assessment: { id: string; expires_at: string };
  recommendations: BusinessUpgradeRecommendationRow[];
} | null> {
  const admin = createAdminClient();
  const { data: assessment, error: assessmentError } = await admin
    .from('business_upgrade_assessments')
    .select('id,expires_at')
    .eq('id', assessmentId)
    .eq('user_id', userId)
    .maybeSingle();
  if (assessmentError) throw new Error(assessmentError.message);
  if (!assessment) return null;

  const { data, error } = await admin
    .from('business_upgrade_recommendations')
    .select('id,rank,score,reason_codes,expires_at,project_template_version,business_upgrade_projects(id,slug,title_en,title_ja,description_en,description_ja,outcome_en,outcome_ja,deliverable_en,deliverable_ja,estimated_days,total_minutes,metric_label_en,metric_label_ja,metric_unit,status,template_version)')
    .eq('assessment_id', assessmentId)
    .order('rank');
  if (error) throw new Error(error.message);
  return {
    assessment: assessment as { id: string; expires_at: string },
    recommendations: (data ?? []) as BusinessUpgradeRecommendationRow[],
  };
}

export async function listBusinessUpgradeProjectsAdmin(): Promise<BusinessUpgradeProjectEditorRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('business_upgrade_projects')
    .select('*,business_upgrade_project_steps(id,step_type,sort_order,content_item_id,workbench_scenario_id)')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BusinessUpgradeProjectEditorRow[];
}

export async function getBusinessUpgradeProjectAdmin(projectId: string): Promise<{
  project: BusinessUpgradeProjectEditorRow | null;
  resources: BusinessUpgradeAuthoringResource[];
  scenarios: BusinessUpgradeAuthoringResource[];
}> {
  const admin = createAdminClient();
  const [{ data, error }, resourceData] = await Promise.all([
    admin.from('business_upgrade_projects').select('*,business_upgrade_project_steps(*)').eq('id', projectId).maybeSingle(),
    getBusinessUpgradeAuthoringResources(),
  ]);
  if (error) throw new Error(error.message);
  return {
    project: data as BusinessUpgradeProjectEditorRow | null,
    ...resourceData,
  };
}

export async function getBusinessUpgradeAuthoringResources(): Promise<{
  resources: BusinessUpgradeAuthoringResource[];
  scenarios: BusinessUpgradeAuthoringResource[];
}> {
  const admin = createAdminClient();
  const [resources, scenarios] = await Promise.all([
    admin.from('content_items').select('id,slug,title_en,title_jp,type,is_published').eq('is_published', true).order('title_en'),
    admin.from('workbench_scenarios').select('id,slug,title_en,title_jp,is_published').eq('is_published', true).order('title_en'),
  ]);
  return {
    resources: (resources.data ?? []) as BusinessUpgradeAuthoringResource[],
    scenarios: (scenarios.data ?? []) as BusinessUpgradeAuthoringResource[],
  };
}

export async function getBusinessUpgradeProjectPreview(projectId: string): Promise<{ project: BusinessUpgradeProjectSummary; steps: Row[] } | null> {
  const result = await getBusinessUpgradeProjectAdmin(projectId);
  if (!result.project) return null;
  const row = result.project as Row;
  return {
    project: {
      id: row.id,
      slug: row.slug,
      title: localized(row, 'title'),
      description: localized(row, 'description'),
      outcome: localized(row, 'outcome'),
      deliverable: localized(row, 'deliverable'),
      estimatedDays: row.estimated_days,
      totalMinutes: row.total_minutes,
      metricLabel: localized(row, 'metric_label'),
      metricUnit: row.metric_unit,
      status: row.status,
      templateVersion: row.template_version,
    },
    steps: [...(row.business_upgrade_project_steps ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function getActiveBusinessUpgrade(userId: string): Promise<BusinessUpgradePlanListRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('business_upgrade_plans')
    .select('id,status,title_en,title_ja,outcome_en,outcome_ja,started_at,business_upgrade_plan_steps(id,status,required,sort_order,title_en,title_ja)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as BusinessUpgradePlanListRow | null;
}

export async function getActiveBusinessUpgradeContentIds(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data: plan } = await admin.from('business_upgrade_plans').select('id').eq('user_id', userId).eq('status', 'active').maybeSingle();
  if (!plan) return [];
  const { data, error } = await admin.from('business_upgrade_plan_steps').select('content_item_id').eq('plan_id', plan.id).not('content_item_id', 'is', null);
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((row) => row.content_item_id ? [row.content_item_id] : []);
}

export async function isBusinessUpgradeWorkbenchContext(userId: string, planId: string, stepId: string, scenarioId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('business_upgrade_plan_steps')
    .select('id,business_upgrade_plans!inner(id,user_id)')
    .eq('id', stepId)
    .eq('plan_id', planId)
    .eq('workbench_scenario_id', scenarioId)
    .eq('business_upgrade_plans.user_id', userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function listBusinessUpgradePlans(userId: string): Promise<BusinessUpgradePlanListRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('business_upgrade_plans')
    .select('id,status,title_en,title_ja,outcome_en,outcome_ja,started_at,completed_at,archived_at,business_upgrade_plan_steps(id,status,required)')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BusinessUpgradePlanListRow[];
}

export async function getBusinessUpgradePlan(userId: string, planId: string): Promise<BusinessUpgradePlanDetail | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('business_upgrade_plans')
    .select('*,business_upgrade_plan_steps(*)')
    .eq('id', planId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Row;
  const steps: BusinessUpgradePlanStep[] = [...(row.business_upgrade_plan_steps ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((step: Row) => ({
      id: step.id,
      sortOrder: step.sort_order,
      stepType: step.step_type,
      measurementKind: step.measurement_kind,
      title: localized(step, 'title'),
      instructions: localized(step, 'instructions'),
      contentItemId: step.content_item_id,
      contentSlug: step.content_slug_snapshot,
      workbenchScenarioId: step.workbench_scenario_id,
      workbenchSlug: step.workbench_slug_snapshot,
      estimatedMinutes: step.estimated_minutes,
      required: step.required,
      status: step.status,
      completedAt: step.completed_at,
    }));
  return {
    id: row.id,
    projectSlug: row.project_slug_snapshot,
    status: row.status,
    title: localized(row, 'title'),
    outcome: localized(row, 'outcome'),
    deliverable: localized(row, 'deliverable'),
    metricLabel: localized(row, 'metric_label'),
    metricUnit: row.metric_unit,
    metricValueType: row.metric_value_type,
    improvementDirection: row.improvement_direction,
    baselineValue: row.baseline_value === null ? null : Number(row.baseline_value),
    resultValue: row.result_value === null ? null : Number(row.result_value),
    startedAt: row.started_at,
    completedAt: row.completed_at,
    steps,
  };
}

export async function listBusinessUpgradeMemberPlansAdmin(): Promise<BusinessUpgradeMemberPlanRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('business_upgrade_plans')
    .select('*,users!business_upgrade_plans_user_id_fkey(email,full_name),business_upgrade_plan_steps(id,status,required)')
    .order('started_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BusinessUpgradeMemberPlanRow[];
}

export async function getBusinessUpgradeMemberPlanAdmin(planId: string): Promise<BusinessUpgradeMemberPlanDetailRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('business_upgrade_plans')
    .select('*,users!business_upgrade_plans_user_id_fkey(email,full_name),business_upgrade_plan_steps(*)')
    .eq('id', planId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { data: profile } = await admin.from('business_upgrade_profiles').select('*').eq('user_id', data.user_id).maybeSingle();
  return { ...data, business_upgrade_profile: profile } as BusinessUpgradeMemberPlanDetailRow;
}
