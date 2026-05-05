export type ResolveInput = {
  coursePartnerId: string | null | undefined;
  cookiePartnerId: string | null | undefined;
};

/**
 * Decides which partner an enrollment is attributed to.
 * Ownership (course.partner_id) wins over cookie (hv_partner).
 * Returns null when neither is present.
 */
export function resolveEnrollmentPartnerId(input: ResolveInput): string | null {
  const owner = input.coursePartnerId?.trim();
  if (owner) return owner;
  const cookie = input.cookiePartnerId?.trim();
  if (cookie) return cookie;
  return null;
}
