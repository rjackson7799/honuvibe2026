import { createClient } from '@/lib/supabase/server';
import { canReadCourseContent } from '@/lib/access/checks';
import { checkVaultAccess, type VaultAccessResult } from '@/lib/vault/access';
import type { CourseAccess, Enrollment } from './types';

/** The user's live (active or completed) enrollment on a course, if any. */
export async function getLiveEnrollment(
  userId: string,
  courseId: string,
): Promise<Enrollment | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .in('status', ['active', 'completed'])
    .maybeSingle();

  return data as Enrollment | null;
}

/**
 * Whether a checkVaultAccess() result makes the user a Vault member for
 * course access. Its legacy source 'enrollment' (any course purchase) does not
 * count: SQL has_vault_access() has no such branch, so trusting it would show
 * a course buyer every included course unlocked while RLS returned no
 * material (plan D4). Admins do count, as they do in has_vault_access().
 */
export function isVaultMemberForCourses(result: VaultAccessResult): boolean {
  return result.hasAccess && result.source !== 'enrollment';
}

/**
 * Can this user read the course's paid material? Mirrors SQL
 * can_read_course_materials() (085, 087) for learners: a live enrollment on
 * this course, or Vault access on a published, Vault-included course.
 * Assigned instructors are not granted here (plan D5); admins reach included
 * courses only through the Vault clause, like everyone else.
 *
 * Enrollment is checked first, so an enrolled Vault member reports
 * source 'enrollment' with the row. The Vault lookup only runs when the
 * course could grant it.
 */
export async function hasCourseAccess(
  userId: string,
  course: { id: string; is_published: boolean; vault_included?: boolean | null },
): Promise<CourseAccess> {
  const enrollment = await getLiveEnrollment(userId, course.id);
  if (enrollment) return { hasAccess: true, source: 'enrollment', enrollment };

  const included = { is_published: course.is_published, vault_included: course.vault_included === true };
  if (!included.is_published || !included.vault_included) {
    return { hasAccess: false, source: null, enrollment: null };
  }

  const hasVault = isVaultMemberForCourses(await checkVaultAccess(userId));
  return canReadCourseContent({ enrolled: false, hasVault, course: included })
    ? { hasAccess: true, source: 'vault', enrollment: null }
    : { hasAccess: false, source: null, enrollment: null };
}
