import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserEnrollments } from '@/lib/enrollments/queries';
import { getPublishedCourses } from '@/lib/courses/queries';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [enrollments, allCourses] = await Promise.all([
    getUserEnrollments(user.id),
    getPublishedCourses(),
  ]);

  const enrolledCourseIds = new Set(enrollments.map((e) => e.course_id));
  const exploreCourses = allCourses.filter((c) => !enrolledCourseIds.has(c.id));

  return NextResponse.json({ enrollments, exploreCourses });
}
