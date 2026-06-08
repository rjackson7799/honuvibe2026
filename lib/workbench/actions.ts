'use server';

// Apply-It Workbench — admin scenario CRUD (build step 5).
// Mirrors lib/events/actions.ts: requireAdmin() gate, service-role client for
// mutations (RLS keeps workbench_scenarios admin-write, so the service role is
// the controlled write path), publish gated by validateScenarioForPublish, and
// revalidatePath for both the admin portal and the member-facing routes.

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateScenarioForPublish } from './validation';
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
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('workbench_scenarios')
    .insert(input)
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
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('workbench_scenarios')
    .update(updates)
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
