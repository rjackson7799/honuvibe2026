// Social-proof library — typed Supabase access helpers (mirrors lib/workbench/queries.ts).
//
// Two read paths:
//   * Public reads go through the sanitized VIEW (proof_artifacts_public) — the
//     request user's client; the view is the only public-facing surface.
//   * Admin reads use the service-role client and hit the base table (drafts +
//     permission columns visible for authoring).

import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ProofArtifact, PublicProofArtifact } from '@/lib/proof/types';

// ---------------------------------------------------------------------------
// Public reads (sanitized view)
// ---------------------------------------------------------------------------

/**
 * Published proof stories for the marketing pages, read from the sanitized view
 * so unpermitted columns are already nulled. Featured first, then display_order,
 * then newest. `limit` caps the set (home shows a few). Returns [] on any error
 * so a proof failure never breaks a marketing page (the caller falls back).
 */
export async function getPublishedProof(
  limit = 12,
): Promise<PublicProofArtifact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('proof_artifacts_public')
    .select('*')
    .order('is_featured', { ascending: false })
    .order('display_order', { ascending: true })
    .limit(limit);
  if (error) return [];
  return (data as PublicProofArtifact[] | null) ?? [];
}

/**
 * Published testimonial-type stories that actually carry a usable quote (the
 * view nulls the quote when consent is absent). This is what ProofStories
 * renders; an empty result triggers the hardcoded-testimonial fallback.
 */
export async function getPublishedTestimonials(
  limit = 3,
): Promise<PublicProofArtifact[]> {
  const all = await getPublishedProof(limit * 4);
  return all
    .filter((p) => p.artifact_type !== 'student_outcome')
    .filter((p) => p.quote_en != null && p.quote_en.trim() !== '')
    .slice(0, limit);
}

/** Published rows that carry a permissioned logo (for the LogoWall in P1b). */
export async function getPublishedLogos(
  limit = 12,
): Promise<PublicProofArtifact[]> {
  const all = await getPublishedProof(limit * 2);
  return all.filter((p) => p.logo_url != null && p.logo_url.trim() !== '').slice(0, limit);
}

// ---------------------------------------------------------------------------
// Admin reads (service-role — drafts + permission columns)
// ---------------------------------------------------------------------------

/** All proof artifacts (featured first, then display_order, then newest). Admin only. */
export async function getAdminProofArtifacts(): Promise<ProofArtifact[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('proof_artifacts')
    .select('*')
    .order('is_featured', { ascending: false })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as ProofArtifact[] | null) ?? [];
}

/** A single proof artifact by id, including drafts. Admin only. */
export async function getAdminProofArtifactById(
  id: string,
): Promise<ProofArtifact | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('proof_artifacts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as ProofArtifact | null) ?? null;
}
