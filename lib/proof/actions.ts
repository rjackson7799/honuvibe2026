'use server';

// Social-proof library — admin CRUD (mirrors lib/workbench/actions.ts).
// requireAdmin() gate, service-role client for mutations (RLS keeps the base
// table admin-write), publish gated by validateProofForPublish, and
// revalidatePath for every marketing surface that renders proof.

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateProofForPublish } from './validation';
import type {
  CreateProofArtifactInput,
  ProofArtifact,
  UpdateProofArtifactInput,
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

/**
 * Revalidate every marketing surface that renders proof. Enumerated (not
 * generic) so a publish actually refreshes the statically-rendered pages — home,
 * /learn, and course detail, in both locales.
 */
function revalidateProofPaths(): void {
  revalidatePath('/admin/proof');
  for (const prefix of ['', '/ja']) {
    revalidatePath(`${prefix}/`);
    revalidatePath(`${prefix}/learn`);
    // Course detail pages render ProofStories too; revalidate the segment.
    revalidatePath(`${prefix}/learn/[slug]`, 'page');
  }
}

async function getProofOrThrow(
  admin: SupabaseClient,
  id: string,
): Promise<ProofArtifact> {
  const { data, error } = await admin
    .from('proof_artifacts')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) throw new Error('Proof artifact not found');
  return data as ProofArtifact;
}

export async function createProof(
  input: CreateProofArtifactInput,
): Promise<{ id: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('proof_artifacts')
    .insert(input)
    .select('id')
    .single();
  if (error) throw error;
  revalidateProofPaths();
  return { id: data.id };
}

export async function updateProof(
  id: string,
  updates: UpdateProofArtifactInput,
): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('proof_artifacts')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
  revalidateProofPaths();
}

export async function publishProof(id: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const proof = await getProofOrThrow(admin, id);
  const errors = validateProofForPublish(proof);
  if (errors.length) throw new Error(`Cannot publish — ${errors.join(' ')}`);
  const { error } = await admin
    .from('proof_artifacts')
    .update({ is_published: true })
    .eq('id', id);
  if (error) throw error;
  revalidateProofPaths();
}

export async function unpublishProof(id: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('proof_artifacts')
    .update({ is_published: false })
    .eq('id', id);
  if (error) throw error;
  revalidateProofPaths();
}

export async function setProofFeatured(
  id: string,
  value: boolean,
): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('proof_artifacts')
    .update({ is_featured: value })
    .eq('id', id);
  if (error) throw error;
  revalidateProofPaths();
}

export async function deleteProof(id: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('proof_artifacts').delete().eq('id', id);
  if (error) throw error;
  revalidateProofPaths();
}
