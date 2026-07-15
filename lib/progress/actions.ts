'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  return { supabase, userId: user.id };
}

type SupabaseUserClient = Awaited<ReturnType<typeof requireAuth>>['supabase'];

/**
 * Revalidate the surfaces that show course progress. The course hub is a
 * dynamic per-locale route, so both locale paths are revalidated explicitly
 * (mirrors the workbench action convention).
 */
function revalidateCourseProgress(courseSlug: string) {
  revalidatePath('/learn/dashboard');
  revalidatePath('/ja/learn/dashboard');
  revalidatePath(`/learn/dashboard/${courseSlug}`);
  revalidatePath(`/ja/learn/dashboard/${courseSlug}`);
}

/**
 * Resolve a course item (session or assignment) to its owning course. The
 * item_id column is polymorphic with no DB foreign key, so the server action
 * is responsible for proving the item exists and which course it belongs to.
 * Throws if the item or its course cannot be resolved.
 */
async function resolveItemCourse(
  supabase: SupabaseUserClient,
  table: 'course_sessions' | 'course_assignments',
  itemId: string,
): Promise<{ courseId: string; courseSlug: string }> {
  const { data: item } = await supabase
    .from(table)
    .select('week_id')
    .eq('id', itemId)
    .maybeSingle();
  if (!item?.week_id) throw new Error('Course item not found');

  const { data: week } = await supabase
    .from('course_weeks')
    .select('course_id')
    .eq('id', item.week_id)
    .maybeSingle();
  if (!week?.course_id) throw new Error('Course not found for item');

  const { data: course } = await supabase
    .from('courses')
    .select('slug')
    .eq('id', week.course_id)
    .maybeSingle();
  if (!course?.slug) throw new Error('Course not found for item');

  return { courseId: week.course_id, courseSlug: course.slug };
}

/**
 * Verify the user has a live enrollment (active OR completed — a completed
 * enrollment still owns its progress and may un-mark items). Refunded/cancelled
 * enrollments are rejected. RLS scopes the read to the user's own rows; the
 * explicit user_id filter is belt-and-suspenders.
 */
async function requireEnrollment(
  supabase: SupabaseUserClient,
  userId: string,
  courseId: string,
): Promise<void> {
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .in('status', ['active', 'completed'])
    .maybeSingle();
  if (!enrollment) throw new Error('Not enrolled in this course');
}

/**
 * Toggle a single course_item_completions row for the current user: delete it
 * if present, otherwise insert it. Returns the resulting completed state.
 */
async function toggleCompletion(
  supabase: SupabaseUserClient,
  userId: string,
  courseId: string,
  itemType: 'session' | 'assignment',
  itemId: string,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('course_item_completions')
    .select('id')
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('course_item_completions')
      .delete()
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    return false;
  }

  const { error } = await supabase.from('course_item_completions').insert({
    user_id: userId,
    course_id: courseId,
    item_type: itemType,
    item_id: itemId,
  });
  if (error) throw new Error(error.message);
  return true;
}

/**
 * Re-derive an enrollment's completion state from its sessions. When every
 * session in the course is complete, flip an active enrollment to 'completed';
 * when a session is un-marked, revert a completed enrollment to 'active'.
 *
 * Only ever transitions between active <-> completed — never touches
 * refunded/cancelled. Runs on the service-role client because `enrollments`
 * has no owner-UPDATE RLS policy (owner can read/insert only), and to count the
 * course's sessions authoritatively regardless of publish visibility.
 */
async function syncEnrollmentCompletion(
  userId: string,
  courseId: string,
): Promise<void> {
  const admin = createAdminClient();

  const { data: weekRows } = await admin
    .from('course_weeks')
    .select('id')
    .eq('course_id', courseId);
  const weekIds = (weekRows ?? []).map((w) => w.id);
  if (weekIds.length === 0) return;

  const { count: totalCount } = await admin
    .from('course_sessions')
    .select('id', { count: 'exact', head: true })
    .in('week_id', weekIds);
  const total = totalCount ?? 0;
  // A course with no sessions can't be auto-completed.
  if (total === 0) return;

  const { count: doneCount } = await admin
    .from('course_item_completions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('item_type', 'session');
  const completed = doneCount ?? 0;

  const { data: enrollment } = await admin
    .from('enrollments')
    .select('id, status')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  if (!enrollment) return;

  if (completed >= total && enrollment.status === 'active') {
    await admin
      .from('enrollments')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', enrollment.id);
  } else if (completed < total && enrollment.status === 'completed') {
    await admin
      .from('enrollments')
      .update({ status: 'active', completed_at: null })
      .eq('id', enrollment.id);
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Mark/un-mark a course session complete for the current user, then re-derive
 * whether the whole course (all sessions) is complete.
 */
export async function toggleSessionComplete(
  sessionId: string,
): Promise<{ completed: boolean }> {
  const { supabase, userId } = await requireAuth();

  const { courseId, courseSlug } = await resolveItemCourse(
    supabase,
    'course_sessions',
    sessionId,
  );
  await requireEnrollment(supabase, userId, courseId);

  const completed = await toggleCompletion(
    supabase,
    userId,
    courseId,
    'session',
    sessionId,
  );

  await syncEnrollmentCompletion(userId, courseId);
  revalidateCourseProgress(courseSlug);

  return { completed };
}

/**
 * Mark/un-mark a course assignment complete for the current user. Assignments
 * are tracked as action items only — they are NOT part of the course
 * completion gate, so this does not touch enrollment status.
 */
export async function toggleAssignmentComplete(
  assignmentId: string,
): Promise<{ completed: boolean }> {
  const { supabase, userId } = await requireAuth();

  const { courseId, courseSlug } = await resolveItemCourse(
    supabase,
    'course_assignments',
    assignmentId,
  );
  await requireEnrollment(supabase, userId, courseId);

  const completed = await toggleCompletion(
    supabase,
    userId,
    courseId,
    'assignment',
    assignmentId,
  );

  revalidateCourseProgress(courseSlug);

  return { completed };
}

/**
 * Record that the current user opened a session's external link (Zoom / replay),
 * so the dashboard's resume hero knows where they were last. One row per
 * user/session — re-opening refreshes opened_at.
 *
 * Takes sessionId only: the course is resolved server-side, which makes a
 * mismatched course/session pair structurally impossible.
 *
 * Deliberately does NOT revalidate — an open is not a progress change, and
 * revalidating on every link click would be wasteful. Callers fire this after
 * window.open() and swallow the rejection: tracking must never block the link.
 */
export async function recordSessionOpen(sessionId: string): Promise<void> {
  const { supabase, userId } = await requireAuth();

  const { courseId } = await resolveItemCourse(
    supabase,
    'course_sessions',
    sessionId,
  );
  await requireEnrollment(supabase, userId, courseId);

  // opened_at is set explicitly: the column DEFAULT only fires on insert, not on
  // the conflict-update path.
  const { error } = await supabase.from('course_session_opens').upsert(
    {
      user_id: userId,
      course_id: courseId,
      session_id: sessionId,
      opened_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,session_id' },
  );
  if (error) throw new Error(error.message);
}
