// Social-proof library — admin publish validation (mirrors lib/workbench/validation.ts).
//
// A proof artifact is authored draft-first. validateProofForPublish() is the gate
// the publish action runs before flipping is_published=true. It returns a list of
// human-readable errors (empty = ready). The single most important rule here is a
// CONSENT gate: a proof cannot be published publicly without quote permission, and
// any displayed attribution (name / logo) requires its own permission flag.

interface ProofPublishCheckInput {
  quote_en: string;
  quote_jp?: string | null;
  // Permission flags
  quote_permission: boolean;
  name_public: boolean;
  logo_permission: boolean;
  // Attribution that, if present, must be permissioned to display
  person_name?: string | null;
  org?: string | null;
  logo_url?: string | null;
  rating?: number | null;
}

const isBlank = (v: string | null | undefined): boolean => !v || !v.trim();

/**
 * Returns the human-readable errors that block publishing a proof artifact.
 * Empty array = ready to publish.
 */
export function validateProofForPublish(proof: ProofPublishCheckInput): string[] {
  const errors: string[] = [];

  // Core content.
  if (isBlank(proof.quote_en)) {
    errors.push('Quote (EN) is required.');
  }

  // Consent gate — the whole point of the permission model. Without quote
  // permission the sanitized view returns a null quote, so the story would
  // render blank; block it at publish instead.
  if (!proof.quote_permission) {
    errors.push('Quote permission is required to publish (consent gate).');
  }

  // Attribution requires its own consent. If a name/logo is present but its
  // permission flag is off, publishing would silently hide it — surface it.
  if (!isBlank(proof.person_name) && !proof.name_public) {
    errors.push(
      'A person name is set but “name public” is off — enable it or clear the name.',
    );
  }
  if (
    (!isBlank(proof.logo_url) || !isBlank(proof.org)) &&
    !proof.logo_permission &&
    !proof.name_public
  ) {
    errors.push(
      'An organization/logo is set but no display permission is granted (logo or name).',
    );
  }

  // Rating sanity (DB also CHECK-constrains 1–5).
  if (proof.rating != null && (proof.rating < 1 || proof.rating > 5)) {
    errors.push('Rating must be between 1 and 5.');
  }

  return errors;
}
