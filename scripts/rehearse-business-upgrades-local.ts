import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { BUSINESS_UPGRADE_LAUNCH_CATALOG } from '../lib/business-upgrades/launch-catalog';

const url = process.env.TEST_SUPABASE_URL;
const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY;
if (!url || !serviceKey) throw new Error('Missing TEST_SUPABASE_URL or TEST_SUPABASE_SERVICE_KEY');

const host = new URL(url).hostname;
if (host !== '127.0.0.1' && host !== 'localhost') {
  throw new Error(`Refusing to rehearse against a non-local Supabase host: ${host}`);
}

const client = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const projectSlugs = BUSINESS_UPGRADE_LAUNCH_CATALOG.map(({ project }) => project.slug);
const memberEmail = 'business-upgrade-rehearsal-member@example.test';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function getOrCreateUser(supabase: SupabaseClient, email: string): Promise<User> {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  const existing = listed.users.find((user) => user.email === email);
  if (existing) return existing;
  const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  return data.user;
}

async function cleanup(member: User | null) {
  await client.from('business_upgrade_projects').update({
    status: 'draft',
    jp_needs_review: true,
    published_at: null,
  }).in('slug', projectSlugs);
  await client.from('site_settings').update({ business_upgrades_enabled: false }).eq('id', true);
  if (member) await client.auth.admin.deleteUser(member.id);
}

async function main() {
  let member: User | null = null;
  try {
    const { data: adminRow, error: adminError } = await client
      .from('users')
      .select('id')
      .eq('email', 'business-upgrade-local-admin@example.test')
      .eq('role', 'admin')
      .single();
    if (adminError) throw adminError;

    const { error: reviewOverrideError } = await client
      .from('business_upgrade_projects')
      .update({ jp_needs_review: false })
      .in('slug', projectSlugs);
    if (reviewOverrideError) throw reviewOverrideError;
    for (const slug of projectSlugs) {
      const { data: project } = await client.from('business_upgrade_projects').select('id').eq('slug', slug).single();
      assert(project, `Missing local project ${slug}`);
      const { error } = await client.rpc('set_business_upgrade_project_status', {
        p_actor_id: adminRow.id,
        p_project_id: project.id,
        p_status: 'published',
      });
      if (error) throw error;
    }

    member = await getOrCreateUser(client, memberEmail);
    const { error: memberError } = await client.from('users').upsert({
      id: member.id,
      email: memberEmail,
      full_name: 'Business Upgrade Rehearsal Member',
      role: 'student',
      subscription_tier: 'vault',
      subscription_status: 'active',
      onboarded: true,
    });
    if (memberError) throw memberError;

    const { data: reserved, error: reserveError } = await client.rpc('reserve_business_upgrade_assessment', {
      p_user_id: member.id,
    });
    if (reserveError) throw reserveError;
    assert(reserved === true, 'Assessment quota reservation failed');

    const { data: selected, error: selectedError } = await client
      .from('business_upgrade_projects')
      .select('id,template_version')
      .eq('slug', 'improve-customer-inquiry-follow-up')
      .single();
    if (selectedError) throw selectedError;

    const { data: assessmentId, error: assessmentError } = await client.rpc('create_business_upgrade_assessment', {
      p_user_id: member.id,
      p_goal_code: 'improve_customer_experience',
      p_work_model_code: 'small_business',
      p_industry_code: 'professional_services',
      p_ai_confidence: 'beginner',
      p_weekly_time_minutes: 120,
      p_current_tools: ['ChatGPT'],
      p_business_name: 'Local QA Business',
      p_offer_summary: 'Professional services',
      p_customer_summary: 'Local customers',
      p_locale: 'en',
      p_engine_version: '1',
      p_recommendations: [{
        projectId: selected.id,
        projectVersion: selected.template_version,
        rank: 1,
        score: 100,
        reasonCodes: ['goal_match', 'work_model_match', 'industry_match', 'confidence_fit', 'time_fit'],
      }],
    });
    if (assessmentError) throw assessmentError;

    const createArgs = {
      p_user_id: member.id,
      p_assessment_id: assessmentId,
      p_project_id: selected.id,
      p_workbench_allowed: true,
    };
    const first = await client.rpc('create_business_upgrade_plan', createArgs);
    if (first.error) throw first.error;
    const second = await client.rpc('create_business_upgrade_plan', createArgs);
    if (second.error) throw second.error;
    assert(first.data === second.data, 'Plan creation was not idempotent');

    const { data: steps, error: stepError } = await client
      .from('business_upgrade_plan_steps')
      .select('id,sort_order,step_type,measurement_kind')
      .eq('plan_id', first.data)
      .order('sort_order');
    if (stepError) throw stepError;
    assert(steps?.length === 5, 'Expected five snapshotted plan steps');

    for (const step of steps) {
      const measurement = step.measurement_kind === 'baseline' ? 120 : step.measurement_kind === 'result' ? 30 : null;
      const { error } = await client.rpc('set_business_upgrade_step_status', {
        p_user_id: member.id,
        p_plan_id: first.data,
        p_step_id: step.id,
        p_completed: true,
        p_measurement_value: measurement,
      });
      if (error) throw error;
    }

    const { data: completed, error: completedError } = await client
      .from('business_upgrade_plans')
      .select('status,project_slug_snapshot,baseline_value,result_value,business_upgrade_plan_steps(id,status)')
      .eq('id', first.data)
      .single();
    if (completedError) throw completedError;
    assert(completed.status === 'completed', 'Plan did not complete');
    assert(completed.project_slug_snapshot === 'improve-customer-inquiry-follow-up', 'Project snapshot changed');
    assert(Number(completed.baseline_value) === 120 && Number(completed.result_value) === 30, 'Measurements were not saved');
    assert(completed.business_upgrade_plan_steps.every((step) => step.status === 'completed'), 'A plan step remained incomplete');

    console.log(JSON.stringify({
      host,
      publishedProjectsTested: projectSlugs.length,
      planCreationIdempotent: true,
      snapshottedSteps: steps.length,
      completedStatus: completed.status,
      baseline: Number(completed.baseline_value),
      result: Number(completed.result_value),
    }, null, 2));
  } finally {
    await cleanup(member);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
