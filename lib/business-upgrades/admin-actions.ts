'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { projectInputSchema } from './schemas';

async function requireAdmin() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('not_authenticated');
  const { data: profile } = await client.from('users').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') throw new Error('not_authorized');
  return user;
}

function refreshBusinessUpgrades(projectId?: string) {
  revalidatePath('/admin/business-upgrades');
  revalidatePath('/learn/plans');
  revalidatePath('/learn/dashboard');
  if (projectId) revalidatePath(`/admin/business-upgrades/${projectId}`);
}

export async function saveBusinessUpgradeProject(input: unknown) {
  const user = await requireAdmin();
  const parsed = projectInputSchema.parse(input);
  const { steps, ...project } = parsed;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('save_business_upgrade_project', {
    p_actor_id: user.id,
    p_project: project,
    p_steps: steps,
  });
  if (error) throw new Error(error.message);
  refreshBusinessUpgrades(data as string);
  return { projectId: data as string };
}

export async function setBusinessUpgradeProjectStatus(projectId: string, status: 'draft' | 'published' | 'archived') {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.rpc('set_business_upgrade_project_status', {
    p_actor_id: user.id,
    p_project_id: projectId,
    p_status: status,
  });
  if (error) throw new Error(error.message);
  refreshBusinessUpgrades(projectId);
}

export async function duplicateBusinessUpgradeProject(projectId: string) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const { data: source, error: sourceError } = await admin
    .from('business_upgrade_projects')
    .select('*,business_upgrade_project_steps(*)')
    .eq('id', projectId)
    .single();
  if (sourceError) throw new Error(sourceError.message);
  const suffix = crypto.randomUUID().slice(0, 6);
  const project = {
    slug: `${source.slug}-copy-${suffix}`,
    titleEn: `${source.title_en} (Copy)`, titleJa: `${source.title_ja}（コピー）`,
    descriptionEn: source.description_en, descriptionJa: source.description_ja,
    outcomeEn: source.outcome_en, outcomeJa: source.outcome_ja,
    deliverableEn: source.deliverable_en, deliverableJa: source.deliverable_ja,
    metricLabelEn: source.metric_label_en, metricLabelJa: source.metric_label_ja,
    metricUnit: source.metric_unit, metricValueType: source.metric_value_type,
    metricMin: Number(source.metric_min), metricMax: Number(source.metric_max),
    improvementDirection: source.improvement_direction, goalCodes: source.goal_codes,
    workModelCodes: source.work_model_codes, industryCodes: source.industry_codes,
    minConfidence: source.min_confidence, maxConfidence: source.max_confidence,
    estimatedDays: source.estimated_days, totalMinutes: source.total_minutes,
    featured: false, jpNeedsReview: true,
  };
  const steps = [...(source.business_upgrade_project_steps ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((step) => ({ sortOrder: step.sort_order, stepType: step.step_type, measurementKind: step.measurement_kind, titleEn: step.title_en, titleJa: step.title_ja, instructionsEn: step.instructions_en, instructionsJa: step.instructions_ja, contentItemId: step.content_item_id, workbenchScenarioId: step.workbench_scenario_id, estimatedMinutes: step.estimated_minutes, required: step.required }));
  const { data, error } = await admin.rpc('save_business_upgrade_project', { p_actor_id: user.id, p_project: project, p_steps: steps });
  if (error) throw new Error(error.message);
  refreshBusinessUpgrades(data as string);
  return { projectId: data as string };
}

export async function setBusinessUpgradesEnabled(enabled: boolean) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('site_settings')
    .update({ business_upgrades_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', true);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
  revalidatePath('/learn/plans');
  revalidatePath('/learn/dashboard');
}
