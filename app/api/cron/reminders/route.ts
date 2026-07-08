import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { emitNotification } from '@/lib/notifications/emit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Cheap, idempotent inserts (unlike the model-calling presenter cron), so we can
// scan a generous window per run. The UNIQUE constraint makes re-runs no-op.
const MAX_PER_RUN = 200;

// Student course hub — a stable, always-present deep-link target.
const COURSE_HUB = '/learn/dashboard/courses';

type CourseTitle = { title_en: string; title_jp: string | null } | null;

type SessionRow = {
  id: string;
  title_en: string;
  title_jp: string | null;
  scheduled_at: string;
  course_weeks: { course_id: string; courses: CourseTitle } | null;
};

type AssignmentRow = {
  id: string;
  title_en: string;
  title_jp: string | null;
  due_date: string;
  course_weeks: { course_id: string; is_unlocked: boolean; courses: CourseTitle } | null;
};

/**
 * Hourly Vercel Cron. Emits in-app reminders for (a) live/hybrid sessions
 * starting within ~24h and (b) assignments in unlocked weeks due within ~2 days,
 * fanning out to each course's active enrollees. Idempotent across runs via the
 * notifications UNIQUE (user_id, type, entity_id) constraint. Cross-user scan
 * uses the service role, so it isn't RLS-limited to one student.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Fail closed: refuse if no secret is configured or the bearer doesn't match.
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const in24hIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const todayStr = nowIso.slice(0, 10);
  const in2daysStr = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // course_id -> active enrollee user_ids
  async function activeEnrollees(courseIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (courseIds.length === 0) return map;
    const { data, error } = await supabase
      .from('enrollments')
      .select('user_id, course_id')
      .in('course_id', courseIds)
      .eq('status', 'active');
    if (error) console.error('[cron reminders] enrollments query failed:', error.message);
    for (const row of (data ?? []) as { user_id: string; course_id: string }[]) {
      const arr = map.get(row.course_id) ?? [];
      arr.push(row.user_id);
      map.set(row.course_id, arr);
    }
    return map;
  }

  let sessionNotifs = 0;
  let assignmentNotifs = 0;

  // --- Session-soon (live/hybrid, next ~24h) ------------------------------
  try {
    const { data } = await supabase
      .from('course_sessions')
      .select('id, title_en, title_jp, scheduled_at, course_weeks!inner(course_id, courses!inner(title_en, title_jp))')
      .in('format', ['live', 'hybrid'])
      .gte('scheduled_at', nowIso)
      .lte('scheduled_at', in24hIso)
      .limit(MAX_PER_RUN);

    const rows = (data ?? []) as unknown as SessionRow[];
    const courseIds = [
      ...new Set(rows.map((s) => s.course_weeks?.course_id).filter((id): id is string => !!id)),
    ];
    const enrollees = await activeEnrollees(courseIds);

    for (const s of rows) {
      const courseId = s.course_weeks?.course_id;
      if (!courseId) continue;
      const course = s.course_weeks?.courses;
      for (const userId of enrollees.get(courseId) ?? []) {
        await emitNotification({
          userId,
          type: 'session_soon',
          entityId: s.id,
          data: {
            courseTitleEn: course?.title_en ?? '',
            courseTitleJp: course?.title_jp ?? null,
            sessionTitleEn: s.title_en,
            sessionTitleJp: s.title_jp,
            scheduledAt: s.scheduled_at,
          },
          href: COURSE_HUB,
        });
        sessionNotifs++;
      }
    }
  } catch (err) {
    console.error('[cron reminders] session pass failed:', err);
  }

  // --- Assignment-due (unlocked weeks, next ~2 days) ----------------------
  try {
    const { data } = await supabase
      .from('course_assignments')
      .select('id, title_en, title_jp, due_date, course_weeks!inner(course_id, is_unlocked, courses!inner(title_en, title_jp))')
      .eq('course_weeks.is_unlocked', true)
      .gte('due_date', todayStr)
      .lte('due_date', in2daysStr)
      .limit(MAX_PER_RUN);

    const rows = (data ?? []) as unknown as AssignmentRow[];
    const courseIds = [
      ...new Set(rows.map((a) => a.course_weeks?.course_id).filter((id): id is string => !!id)),
    ];
    const enrollees = await activeEnrollees(courseIds);

    for (const a of rows) {
      const courseId = a.course_weeks?.course_id;
      if (!courseId) continue;
      const course = a.course_weeks?.courses;
      for (const userId of enrollees.get(courseId) ?? []) {
        await emitNotification({
          userId,
          type: 'assignment_due',
          entityId: a.id,
          data: {
            assignmentTitleEn: a.title_en,
            assignmentTitleJp: a.title_jp,
            courseTitleEn: course?.title_en ?? '',
            courseTitleJp: course?.title_jp ?? null,
            dueDate: a.due_date,
          },
          href: COURSE_HUB,
        });
        assignmentNotifs++;
      }
    }
  } catch (err) {
    console.error('[cron reminders] assignment pass failed:', err);
  }

  return NextResponse.json({ sessionNotifs, assignmentNotifs });
}
