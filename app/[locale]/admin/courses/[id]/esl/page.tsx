import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ESLAdminDashboard } from '@/components/admin/ESLAdminDashboard';

export default async function AdminESLPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id: courseId } = await params;
  const supabase = await createClient();
  const t = await getTranslations('esl');

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/learn/auth`);

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
    redirect(`/${locale}/admin`);
  }

  // Fetch course
  const { data: course } = await supabase
    .from('courses')
    .select('id, title_en, title_jp, esl_enabled, esl_included, esl_settings_json')
    .eq('id', courseId)
    .single();

  if (!course) redirect(`/${locale}/admin/courses`);

  // Fetch weeks
  const { data: weeks } = await supabase
    .from('course_weeks')
    .select('id, week_number, title_en, title_jp')
    .eq('course_id', courseId)
    .order('week_number', { ascending: true });

  // Fetch ESL lessons
  const { data: eslLessons } = await supabase
    .from('esl_lessons')
    .select('id, week_id, status, generation_error, updated_at')
    .eq('course_id', courseId);

  return (
    <ESLAdminDashboard
      course={course}
      weeks={weeks ?? []}
      eslLessons={eslLessons ?? []}
      locale={locale}
    />
  );
}
