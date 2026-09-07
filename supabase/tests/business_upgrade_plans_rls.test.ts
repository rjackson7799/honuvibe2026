import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FIXTURES, seedFixtures } from './helpers/fixtures';
import { anonClient, serviceClient, userClient } from './helpers/clients';

const svc = serviceClient();
const USER_A = FIXTURES.users.honuvibe_paid;
const USER_B = FIXTURES.users.honuvibe_free;
const PROJECT_ID = '76666666-6666-4666-8666-666666666601';

async function cleanup() {
  await svc.from('business_upgrade_plan_steps').delete().in('plan_id', (await svc.from('business_upgrade_plans').select('id').in('user_id', [USER_A, USER_B])).data?.map((r) => r.id) ?? []);
  await svc.from('business_upgrade_plans').delete().in('user_id', [USER_A, USER_B]);
  await svc.from('business_upgrade_recommendations').delete().in('assessment_id', (await svc.from('business_upgrade_assessments').select('id').in('user_id', [USER_A, USER_B])).data?.map((r) => r.id) ?? []);
  await svc.from('business_upgrade_assessments').delete().in('user_id', [USER_A, USER_B]);
  await svc.from('business_upgrade_profiles').delete().in('user_id', [USER_A, USER_B]);
  await svc.from('business_upgrade_project_steps').delete().eq('project_id', PROJECT_ID);
  await svc.from('business_upgrade_projects').delete().eq('id', PROJECT_ID);
  await svc.from('business_upgrade_daily_usage').delete().in('user_id', [USER_A, USER_B]);
}

async function seedProject() {
  const { error } = await svc.from('business_upgrade_projects').insert({
    id: PROJECT_ID, slug: 'fixture-upgrade', title_en: 'Fixture upgrade', title_ja: 'テスト改善',
    description_en: 'A test project', description_ja: 'テストプロジェクト', outcome_en: 'Better work', outcome_ja: '改善された仕事',
    deliverable_en: 'A finished workflow', deliverable_ja: '完成したワークフロー', metric_label_en: 'Minutes', metric_label_ja: '分',
    metric_unit: 'minutes', metric_value_type: 'minutes', metric_min: 0, metric_max: 1000, improvement_direction: 'decrease',
    goal_codes: ['save_time'], estimated_days: 7, total_minutes: 60, jp_needs_review: false, status: 'draft',
  });
  if (error) throw error;
  const { error: stepError } = await svc.from('business_upgrade_project_steps').insert([
    { project_id: PROJECT_ID, sort_order: 1, step_type: 'measurement', measurement_kind: 'baseline', title_en: 'Baseline', title_ja: '開始値', instructions_en: 'Measure', instructions_ja: '測定', estimated_minutes: 5, required: true },
    { project_id: PROJECT_ID, sort_order: 2, step_type: 'action', title_en: 'Improve', title_ja: '改善', instructions_en: 'Do the work', instructions_ja: '実行', estimated_minutes: 50, required: true },
    { project_id: PROJECT_ID, sort_order: 3, step_type: 'measurement', measurement_kind: 'result', title_en: 'Result', title_ja: '結果', instructions_en: 'Measure again', instructions_ja: '再測定', estimated_minutes: 5, required: true },
  ]);
  if (stepError) throw stepError;
  const { error: publishError } = await svc.from('business_upgrade_projects').update({ status: 'published' }).eq('id', PROJECT_ID);
  if (publishError) throw publishError;
}

async function createAssessment(userId: string = USER_A) {
  const { data, error } = await svc.rpc('create_business_upgrade_assessment', {
    p_user_id: userId, p_goal_code: 'save_time', p_work_model_code: 'solopreneur', p_industry_code: null,
    p_ai_confidence: 'beginner', p_weekly_time_minutes: 60, p_current_tools: [], p_business_name: 'Fixture Co',
    p_offer_summary: null, p_customer_summary: null, p_locale: 'en', p_engine_version: '1',
    p_recommendations: [{ projectId: PROJECT_ID, projectVersion: 1, rank: 1, score: 80, reasonCodes: ['goal_match','time_fit'] }],
  });
  if (error) throw error;
  return data as string;
}

beforeAll(seedFixtures, 120_000);
beforeEach(async () => { await cleanup(); await seedProject(); });

describe('Business Upgrade RLS and lifecycle', () => {
  it('lets a member read only their own profile and blocks direct writes', async () => {
    await createAssessment(USER_A);
    await createAssessment(USER_B);
    const a = await userClient(USER_A);
    const { data } = await a.from('business_upgrade_profiles').select('user_id');
    expect(data?.map((r) => r.user_id)).toEqual([USER_A]);
    const update = await a.from('business_upgrade_profiles').update({ business_name: 'Tampered' }).eq('user_id', USER_A);
    expect(update.error).not.toBeNull();
    const anonymous = await anonClient().from('business_upgrade_profiles').select('user_id');
    expect(anonymous.error).toBeNull();
    expect(anonymous.data).toEqual([]);
  });

  it('does not expose service-only RPCs to authenticated members', async () => {
    const a = await userClient(USER_A);
    const result = await a.rpc('reserve_business_upgrade_assessment', { p_user_id: USER_A });
    expect(result.error).not.toBeNull();
  });

  it('creates one idempotent active plan and hides it from another member', async () => {
    const assessmentId = await createAssessment();
    const first = await svc.rpc('create_business_upgrade_plan', { p_user_id: USER_A, p_assessment_id: assessmentId, p_project_id: PROJECT_ID, p_workbench_allowed: true });
    expect(first.error).toBeNull();
    const retry = await svc.rpc('create_business_upgrade_plan', { p_user_id: USER_A, p_assessment_id: assessmentId, p_project_id: PROJECT_ID, p_workbench_allowed: true });
    expect(retry.data).toBe(first.data);
    const b = await userClient(USER_B);
    const hidden = await b.from('business_upgrade_plans').select('id').eq('id', first.data as string);
    expect(hidden.data).toEqual([]);

    const secondAssessment = await createAssessment();
    const second = await svc.rpc('create_business_upgrade_plan', { p_user_id: USER_A, p_assessment_id: secondAssessment, p_project_id: PROJECT_ID, p_workbench_allowed: true });
    expect(second.error?.message).toContain('active_plan_exists');
  });

  it('requires baseline and result and completes atomically', async () => {
    const assessmentId = await createAssessment();
    const { data: planId, error } = await svc.rpc('create_business_upgrade_plan', { p_user_id: USER_A, p_assessment_id: assessmentId, p_project_id: PROJECT_ID, p_workbench_allowed: true });
    expect(error).toBeNull();
    const { data: steps } = await svc.from('business_upgrade_plan_steps').select('id,step_type,measurement_kind').eq('plan_id', planId as string).order('sort_order');
    const resultStep = steps!.find((s) => s.measurement_kind === 'result')!;
    const early = await svc.rpc('set_business_upgrade_step_status', { p_user_id: USER_A, p_plan_id: planId, p_step_id: resultStep.id, p_completed: true, p_measurement_value: 20 });
    expect(early.error?.message).toContain('baseline_required');
    for (const step of steps!) {
      const value = step.measurement_kind === 'baseline' ? 60 : step.measurement_kind === 'result' ? 20 : null;
      const update = await svc.rpc('set_business_upgrade_step_status', { p_user_id: USER_A, p_plan_id: planId, p_step_id: step.id, p_completed: true, p_measurement_value: value });
      expect(update.error).toBeNull();
    }
    const { data: plan } = await svc.from('business_upgrade_plans').select('status,baseline_value,result_value').eq('id', planId as string).single();
    expect(plan).toMatchObject({ status: 'completed', baseline_value: 60, result_value: 20 });
  });
});
