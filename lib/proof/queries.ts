// Social-proof library — typed Supabase access helpers (mirrors lib/workbench/queries.ts).
//
// Two read paths:
//   * Public reads go through the sanitized VIEW (proof_artifacts_public) with
//     a cookie-less anon client inside unstable_cache. Visitors were already
//     the anon role here; reading cookies() would make every marketing page
//     that shows proof (Home, /about, /learn) dynamic.
//   * Admin reads use the service-role client and hit the base table (drafts +
//     permission columns visible for authoring).

import { unstable_cache } from 'next/cache';
import { createClient as createAnonClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';
import type { ProofArtifact, PublicProofArtifact } from '@/lib/proof/types';

/** Cache tag for the public proof read; the proof admin actions revalidate it. */
export const PROOF_TAG = 'proof';

/** How many rows the shared public read pulls; every public helper filters this set. */
const PUBLIC_PROOF_FETCH_LIMIT = 48;

// ---------------------------------------------------------------------------
// Public reads (sanitized view)
// ---------------------------------------------------------------------------

/**
 * Published proof stories for the marketing pages, read from the sanitized view
 * so unpermitted columns are already nulled. Featured first, then display_order.
 * One cached fetch serves every public helper. Returns [] on any error so a
 * proof failure never breaks a marketing page (the caller falls back).
 */
const getPublicProofRows = unstable_cache(
  async (): Promise<PublicProofArtifact[]> => {
    try {
      const supabase = createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } },
      );
      const { data, error } = await supabase
        .from('proof_artifacts_public')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true })
        .limit(PUBLIC_PROOF_FETCH_LIMIT);
      if (error) return [];
      return (data as PublicProofArtifact[] | null) ?? [];
    } catch {
      return [];
    }
  },
  ['proof-public'],
  { revalidate: 300, tags: [PROOF_TAG] },
);

export async function getPublishedProof(
  limit = 12,
): Promise<PublicProofArtifact[]> {
  const all = await getPublicProofRows();
  return all.slice(0, limit);
}

/**
 * Published testimonial-type stories that actually carry a usable quote (the
 * view nulls the quote when consent is absent).
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
