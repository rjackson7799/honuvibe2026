'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { checkVaultAccess } from '@/lib/vault/access';
import { getBusinessUpgradesEnabled } from './availability';
import { assessmentInputSchema, planLifecycleSchema, planSelectionSchema, stepStatusSchema } from './schemas';
import { BUSINESS_UPGRADE_RECOMMENDATION_ENGINE_VERSION, recommendBusinessUpgrades } from './recommend';
import { listRecommendationProjects } from './queries';
import { trackServerEvent } from '@/lib/analytics-server';

const analyticsUrl = (path: string) => `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai'}${path}`;

async function requireMember() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('not_authenticated');
  const { data: profile } = await client.from('users').select('role').eq('id', user.id).maybeSingle();
  const enabled = await getBusinessUpgradesEnabled();
  if (!enabled && profile?.role !== 'admin') throw new Error('feature_disabled');
  const access = await checkVaultAccess(user.id);
  if (!access.hasAccess && profile?.role !== 'admin') throw new Error('vault_access_required');
  return { user, access, isAdmin: profile?.role === 'admin' };
}

export async function createBusinessUpgradeAssessment(input: unknown) {
  const parsed = assessmentInputSchema.parse(input);
  const { user, access } = await requireMember();
  const workbenchAllowed = access.source !== 'enrollment';
  const projects = await listRecommendationProjects();
  const recommendations = recommendBusinessUpgrades(parsed, projects, { workbenchAllowed });
  const admin = createAdminClient();
  const { data: reserved, error: reserveError } = await admin.rpc('reserve_business_upgrade_assessment', { p_user_id: user.id });
  if (reserveError) throw new Error(reserveError.message);
  if (!reserved) throw new Error('assessment_limit_reached');
  const { data, error } = await admin.rpc('create_business_upgrade_assessment', {
    p_user_id: user.id,
    p_goal_code: parsed.goal,
    p_work_model_code: parsed.workModel,
    p_industry_code: parsed.industry ?? null,
    p_ai_confidence: parsed.aiConfidence,
    p_weekly_time_minutes: parsed.weeklyTimeMinutes,
    p_current_tools: parsed.currentTools,
    p_business_name: parsed.businessName ?? null,
    p_offer_summary: parsed.offerSummary ?? null,
    p_customer_summary: parsed.customerSummary ?? null,
    p_locale: parsed.locale,
    p_engine_version: BUSINESS_UPGRADE_RECOMMENDATION_ENGINE_VERSION,
    p_recommendations: recommendations,
  });
  if (error) throw new Error(error.message);
  void trackServerEvent('business_upgrade_assessment_completed', {
    url: analyticsUrl(`/${parsed.locale === 'ja' ? 'ja/' : ''}learn/plans/business/new`),
    props: { locale: parsed.locale },
  });
  return { assessmentId: data as string, recommendationCount: recommendations.length };
}

export async function startBusinessUpgradePlan(input: unknown) {
  const parsed = planSelectionSchema.parse(input);
  const { user, access } = await requireMember();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('create_business_upgrade_plan', {
    p_user_id: user.id,
    p_assessment_id: parsed.assessmentId,
    p_project_id: parsed.projectId,
    p_workbench_allowed: access.source !== 'enrollment',
  });
  if (error) throw new Error(error.message);
  const { data: plan } = await admin.from('business_upgrade_plans').select('project_slug_snapshot').eq('id', data as string).maybeSingle();
  void trackServerEvent('business_upgrade_plan_started', {
    url: analyticsUrl('/learn/plans'),
    props: { project_slug: plan?.project_slug_snapshot ?? 'unknown' },
  });
  revalidatePath('/learn/plans');
  revalidatePath('/learn/dashboard');
  return { planId: data as string };
}

export async function setBusinessUpgradeStepStatus(input: unknown) {
  const parsed = stepStatusSchema.parse(input);
  const { user } = await requireMember();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('set_business_upgrade_step_status', {
    p_user_id: user.id,
    p_plan_id: parsed.planId,
    p_step_id: parsed.stepId,
    p_completed: parsed.completed,
    p_measurement_value: parsed.measurementValue ?? null,
  });
  if (error) throw new Error(error.message);
  if (data === 'completed') {
    const { data: plan } = await admin.from('business_upgrade_plans').select('project_slug_snapshot').eq('id', parsed.planId).maybeSingle();
    void trackServerEvent('business_upgrade_plan_completed', {
      url: analyticsUrl(`/learn/plans/business/${parsed.planId}`),
      props: { project_slug: plan?.project_slug_snapshot ?? 'unknown' },
    });
  }
  revalidatePath('/learn/plans');
  revalidatePath(`/learn/plans/business/${parsed.planId}`);
  revalidatePath('/learn/dashboard');
  return { status: data as string };
}

export async function setBusinessUpgradePlanLifecycle(input: unknown) {
  const parsed = planLifecycleSchema.parse(input);
  const { user } = await requireMember();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('set_business_upgrade_plan_lifecycle', {
    p_user_id: user.id,
    p_plan_id: parsed.planId,
    p_action: parsed.action,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/learn/plans');
  revalidatePath(`/learn/plans/business/${parsed.planId}`);
  revalidatePath('/learn/dashboard');
  return { status: data as string };
}
