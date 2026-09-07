import { createClient } from '@supabase/supabase-js';
import { BUSINESS_UPGRADE_LAUNCH_CATALOG } from '../lib/business-upgrades/launch-catalog';

const url = process.env.TEST_SUPABASE_URL;
const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) throw new Error('Missing TEST_SUPABASE_URL or TEST_SUPABASE_SERVICE_KEY');

const host = new URL(url).hostname;
if (host !== '127.0.0.1' && host !== 'localhost') {
  throw new Error(`Refusing to seed a non-local Supabase host: ${host}`);
}

const client = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const localAdminEmail = 'business-upgrade-local-admin@example.test';
const referenceContent = [
  {
    id: '59895cb4-399c-4f54-96df-a048679f319f',
    slug: 'prompt-starter-kit',
    content_type: 'template',
    title_en: 'My Prompt Starter Kit',
    title_jp: 'プロンプトスターターキット',
  },
  {
    id: '83aed811-d04f-4023-9928-7d707b325973',
    slug: 'ai-content-creation-social-media',
    content_type: 'article',
    title_en: 'AI Content Creation for Social Media',
    title_jp: 'SNSのためのAIコンテンツ制作',
  },
  {
    id: 'db334c74-0293-4a22-a899-ba563f8c6b0c',
    slug: 'ai-meeting-notes-template-japanese',
    content_type: 'template',
    title_en: 'AI Meeting Notes Template (Japanese)',
    title_jp: 'AI会議メモテンプレート',
  },
  {
    id: '4fac032a-ca80-4f58-92b2-2109434626c7',
    slug: 'notebooklm-research-guide',
    content_type: 'article',
    title_en: 'Getting Started with NotebookLM for Research',
    title_jp: 'リサーチのためのNotebookLM入門',
  },
  {
    id: '624b7135-b82d-48db-96fe-e30f9c006522',
    slug: 'perplexity-deep-research',
    content_type: 'video',
    title_en: 'Using Perplexity AI for Deep Research',
    title_jp: 'PerplexityでAI深掘りリサーチ',
  },
] as const;

async function ensureLocalAdmin() {
  const { data: listed, error: listError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  let authUser = listed.users.find((user) => user.email === localAdminEmail);
  if (!authUser) {
    const { data, error } = await client.auth.admin.createUser({
      email: localAdminEmail,
      email_confirm: true,
      user_metadata: { full_name: 'Business Upgrade Local Admin' },
    });
    if (error) throw error;
    authUser = data.user;
  }

  const { error } = await client.from('users').upsert({
    id: authUser.id,
    email: localAdminEmail,
    full_name: 'Business Upgrade Local Admin',
    role: 'admin',
    onboarded: true,
  });
  if (error) throw error;
  return authUser.id;
}

async function main() {
  const actorId = await ensureLocalAdmin();

  for (const item of referenceContent) {
    const { error } = await client.from('content_items').upsert({
      ...item,
      source: 'honuvibe',
      language: 'both',
      access_tier: 'premium',
      difficulty_level: 'beginner',
      is_published: true,
      freshness_status: 'current',
      admin_notes: 'LOCAL QA FIXTURE — metadata mirrors a published hosted Vault item',
    }, { onConflict: 'slug' });
    if (error) throw error;
  }

  const { data: resources, error: resourceError } = await client
    .from('content_items')
    .select('id,slug')
    .in('slug', referenceContent.map((item) => item.slug));
  if (resourceError) throw resourceError;
  const contentIds = new Map((resources ?? []).map((row) => [row.slug, row.id]));

  for (const entry of BUSINESS_UPGRADE_LAUNCH_CATALOG) {
    const { data: existing, error: existingError } = await client
      .from('business_upgrade_projects')
      .select('id')
      .eq('slug', entry.project.slug)
      .maybeSingle();
    if (existingError) throw existingError;

    const steps = entry.steps.map(({ contentSlug, ...step }) => ({
      ...step,
      contentItemId: contentSlug ? contentIds.get(contentSlug) ?? null : null,
      workbenchScenarioId: null,
    }));
    if (steps.some((step) => step.stepType === 'vault' && !step.contentItemId)) {
      throw new Error(`Missing Vault reference for ${entry.project.slug}`);
    }

    const { error } = await client.rpc('save_business_upgrade_project', {
      p_actor_id: actorId,
      p_project: { ...entry.project, id: existing?.id },
      p_steps: steps,
    });
    if (error) throw error;
  }

  const { data: projects, error } = await client
    .from('business_upgrade_projects')
    .select('slug,status,jp_needs_review,business_upgrade_project_steps(id)')
    .in('slug', BUSINESS_UPGRADE_LAUNCH_CATALOG.map(({ project }) => project.slug))
    .order('slug');
  if (error) throw error;
  console.log(JSON.stringify({ host, projects }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
