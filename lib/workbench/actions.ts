'use server';

// Apply-It Workbench — admin scenario CRUD (build step 5).
// Mirrors lib/events/actions.ts: requireAdmin() gate, service-role client for
// mutations (RLS keeps workbench_scenarios admin-write, so the service role is
// the controlled write path), publish gated by validateScenarioForPublish, and
// revalidatePath for both the admin portal and the member-facing routes.

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateScenarioForPublish, nextCopySlug } from './validation';
import {
  createWorkbenchScenarioSchema,
  updateWorkbenchScenarioSchema,
} from './types';
import type {
  CreateWorkbenchScenarioInput,
  UpdateWorkbenchScenarioInput,
  WorkbenchScenario,
} from './types';

async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') throw new Error('Not authorized');
}

function revalidateScenarioPaths(opts: { id?: string; slug?: string }): void {
  revalidatePath('/admin/workbench');
  if (opts.id) revalidatePath(`/admin/workbench/${opts.id}`);
  // Member-facing routes (built in later steps) — safe to revalidate now.
  revalidatePath('/learn/vault/workbench');
  if (opts.slug) {
    revalidatePath(`/learn/vault/workbench/${opts.slug}`);
    revalidatePath(`/ja/learn/vault/workbench/${opts.slug}`);
  }
}

/**
 * Validates an action payload, throwing a single human-readable message (the
 * admin form surfaces error.message in its banner, so raw ZodError JSON won't do).
 */
function parseInput<S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const messages = result.error.issues.map((issue) =>
      issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
    );
    throw new Error(`Invalid scenario input — ${messages.join(' ')}`);
  }
  return result.data;
}

async function getScenarioOrThrow(
  admin: SupabaseClient,
  id: string,
): Promise<WorkbenchScenario> {
  const { data, error } = await admin
    .from('workbench_scenarios')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) throw new Error('Scenario not found');
  return data as WorkbenchScenario;
}

// ── CRUD ────────────────────────────────────────────────────

export async function createScenario(
  input: CreateWorkbenchScenarioInput,
): Promise<{ id: string; slug: string }> {
  await requireAdmin();
  const parsed = parseInput(createWorkbenchScenarioSchema, input);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('workbench_scenarios')
    .insert(parsed)
    .select('id, slug')
    .single();
  if (error) throw error;
  revalidateScenarioPaths({ id: data.id, slug: data.slug });
  return { id: data.id, slug: data.slug };
}

export async function updateScenario(
  id: string,
  updates: UpdateWorkbenchScenarioInput,
): Promise<void> {
  await requireAdmin();
  const parsed = parseInput(updateWorkbenchScenarioSchema, updates);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('workbench_scenarios')
    .update(parsed)
    .eq('id', id)
    .select('slug')
    .single();
  if (error) throw error;
  revalidateScenarioPaths({ id, slug: data?.slug });
}

export async function publishScenario(id: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const scenario = await getScenarioOrThrow(admin, id);
  const errors = validateScenarioForPublish(scenario);
  if (errors.length) throw new Error(`Cannot publish — ${errors.join(' ')}`);
  const { error } = await admin
    .from('workbench_scenarios')
    .update({ is_published: true })
    .eq('id', id);
  if (error) throw error;
  revalidateScenarioPaths({ id, slug: scenario.slug });
}

export async function unpublishScenario(id: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('workbench_scenarios')
    .update({ is_published: false })
    .eq('id', id)
    .select('slug')
    .single();
  if (error) throw error;
  revalidateScenarioPaths({ id, slug: data?.slug });
}

export async function setScenarioFeatured(
  id: string,
  value: boolean,
): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('workbench_scenarios')
    .update({ is_featured: value })
    .eq('id', id)
    .select('slug')
    .single();
  if (error) throw error;
  revalidateScenarioPaths({ id, slug: data?.slug });
}

/**
 * Duplicates a scenario as an unpublished, unfeatured draft with a
 * collision-safe `<slug>-copy` slug — the fast path for authoring variations.
 */
export async function duplicateScenario(
  id: string,
): Promise<{ id: string; slug: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const source = await getScenarioOrThrow(admin, id);

  // Only sibling copies can collide, so fetch just the `<root>-copy%` slugs.
  const root = source.slug.replace(/-copy(-\d+)?$/, '');
  const { data: siblings } = await admin
    .from('workbench_scenarios')
    .select('slug')
    .like('slug', `${root}-copy%`);
  const slug = nextCopySlug(source.slug, (siblings ?? []).map((s) => s.slug));

  const { data, error } = await admin
    .from('workbench_scenarios')
    .insert({
      slug,
      title_en: `${source.title_en} (copy)`,
      title_jp: source.title_jp,
      domain: source.domain,
      difficulty: source.difficulty,
      brief_en: source.brief_en,
      brief_jp: source.brief_jp,
      applicable_dimensions: source.applicable_dimensions,
      expert_prompt_en: source.expert_prompt_en,
      expert_prompt_jp: source.expert_prompt_jp,
      expert_output_en: source.expert_output_en,
      expert_output_jp: source.expert_output_jp,
      why_this_works_en: source.why_this_works_en,
      why_this_works_jp: source.why_this_works_jp,
      jp_needs_review: source.jp_needs_review,
      is_published: false,
      is_featured: false,
    })
    .select('id, slug')
    .single();
  if (error) throw error;
  revalidatePath('/admin/workbench');
  return { id: data.id, slug: data.slug };
}

/**
 * Deletes a scenario. Destructive: workbench_attempts FK is ON DELETE CASCADE,
 * so any member attempts against this scenario are removed too (saved-prompt
 * links are ON DELETE SET NULL and survive). The admin UI confirms first.
 */
export async function deleteScenario(id: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('workbench_scenarios')
    .delete()
    .eq('id', id);
  if (error) throw error;
  revalidatePath('/admin/workbench');
  revalidatePath('/learn/vault/workbench');
}
