// Social-proof library — TypeScript types (mirrors supabase/migrations/045_proof_artifacts.sql).
//
// Two row shapes intentionally differ:
//   * ProofArtifact      — the full admin row (base table; includes permissions).
//   * PublicProofArtifact — the sanitized projection from proof_artifacts_public,
//                           where gated columns are null unless permitted. The
//                           public site only ever reads this shape.

export const PROOF_ARTIFACT_TYPES = [
  'testimonial',
  'case_study',
  'student_outcome',
] as const;
export type ProofArtifactType = (typeof PROOF_ARTIFACT_TYPES)[number];

export const PROOF_SOURCES = ['cohort', 'event', 'consulting', 'manual'] as const;
export type ProofSource = (typeof PROOF_SOURCES)[number];

// Full admin row (base table).
export interface ProofArtifact {
  id: string;
  artifact_type: ProofArtifactType;
  proof_source: ProofSource;
  quote_en: string;
  quote_jp: string | null;
  title_en: string | null;
  title_jp: string | null;
  person_name: string | null;
  role_en: string | null;
  role_jp: string | null;
  org: string | null;
  organization_url: string | null;
  person_image_url: string | null;
  logo_url: string | null;
  rating: number | null;
  metrics_json: Record<string, unknown>;
  course_id: string | null;
  quote_permission: boolean;
  name_public: boolean;
  logo_permission: boolean;
  permission_notes: string | null;
  is_published: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Sanitized public projection (proof_artifacts_public view). Gated fields are
// null unless the corresponding permission flag was set. Permission flags and
// notes are absent entirely.
export interface PublicProofArtifact {
  id: string;
  artifact_type: ProofArtifactType;
  quote_en: string | null;
  quote_jp: string | null;
  title_en: string | null;
  title_jp: string | null;
  person_name: string | null;
  role_en: string | null;
  role_jp: string | null;
  org: string | null;
  person_image_url: string | null;
  logo_url: string | null;
  organization_url: string | null;
  rating: number | null;
  metrics_json: Record<string, unknown>;
  course_id: string | null;
  is_featured: boolean;
  display_order: number;
}

// Admin authoring input. quote_en is the only NOT NULL content column; the rest
// are optional at create and gated by validateProofForPublish before publish.
export interface CreateProofArtifactInput {
  artifact_type?: ProofArtifactType;
  proof_source?: ProofSource;
  quote_en: string;
  quote_jp?: string | null;
  title_en?: string | null;
  title_jp?: string | null;
  person_name?: string | null;
  role_en?: string | null;
  role_jp?: string | null;
  org?: string | null;
  organization_url?: string | null;
  person_image_url?: string | null;
  logo_url?: string | null;
  rating?: number | null;
  metrics_json?: Record<string, unknown>;
  course_id?: string | null;
  quote_permission?: boolean;
  name_public?: boolean;
  logo_permission?: boolean;
  permission_notes?: string | null;
  is_featured?: boolean;
  display_order?: number;
}

export type UpdateProofArtifactInput = Partial<CreateProofArtifactInput>;
