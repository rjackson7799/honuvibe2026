import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStudentDashboardData } from '@/lib/dashboard/queries';
import { StatCard } from '@/components/admin/StatCard';
import { DashboardCourseCard } from '@/components/learn/DashboardCourseCard';
import { BookOpen, CheckCircle, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ enrolled?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });

  return {
    title: t('heading_overview'),
  };
}

export default async function DashboardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/learn/auth`);
  }

  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const tLearn = await getTranslations({ locale, namespace: 'learn' });

  // Get user profile for display name
  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const dashboardData = await getStudentDashboardData(user.id);
  const { enrollments, upcomingSessions, pendingAssignments, stats } = dashboardData;

  const displayName = profile?.full_name ?? user.email?.split('@')[0] ?? '';

  return (
    <div className="space-y-8 max-w-[1100px]">
      {/* Welcome + enrolled success toast */}
      <div>
        <h1 className="text-2xl font-serif text-fg-primary">
          {t('welcome_back', { name: displayName })}
        </h1>
        {sp.enrolled === 'true' && (
          <div className="mt-4 bg-accent-teal/10 border border-accent-teal/30 rounded-lg px-4 py-3">
            <p className="text-sm text-accent-teal font-medium">
              {tLearn('enrolled_success')}
            </p>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('stats_active_courses')}
          value={stats.active_courses}
          icon={BookOpen}
        />
        <StatCard
          label={t('stats_completed_courses')}
          value={stats.completed_courses}
          icon={CheckCircle}
        />
        <StatCard
          label={t('stats_upcoming_sessions')}
          value={stats.upcoming_sessions_count}
          icon={Calendar}
        />
        <StatCard
          label={t('stats_study_hours')}
          value={stats.total_study_hours}
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Courses widget */}
        <div className="bg-bg-secondary border border-border-default rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider">
              {t('section_my_courses')}
            </h2>
            {enrollments.length > 0 && (
              <Link href="/learn/dashboard/courses" className="text-xs text-accent-teal hover:underline">
                {t('view_all_courses')} →
              </Link>
            )}
          </div>
          {enrollments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-fg-tertiary mb-4">{t('no_courses')}</p>
              <Link
                href="/learn"
                className="inline-flex items-center gap-2 text-sm text-accent-teal hover:underline"
              >
                {t('explore_courses')} →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments.slice(0, 3).map((enrollment) => {
                const course = enrollment.course;
                const title = locale === 'ja' && course.title_jp ? course.title_jp : course.title_en;
                const totalWeeks = course.total_weeks ?? 1;
                const startDate = course.start_date ? new Date(course.start_date) : null;
                const now = new Date();
                const weeksPassed = startDate
                  ? Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)))
                  : 1;
                const currentWeek = Math.min(weeksPassed, totalWeeks);
                const progressPercent = Math.round((currentWeek / totalWeeks) * 100);

                return (
                  <Link
                    key={enrollment.id}
                    href={`/learn/dashboard/${course.slug}`}
                    className="block p-3 rounded-lg hover:bg-bg-tertiary transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-fg-primary truncate mr-2">
                        {title}
                      </span>
                      <span className="text-xs text-fg-tertiary shrink-0">
                        {tLearn('week_of', { current: currentWeek, total: totalWeeks })}
                      </span>
                    </div>
                    <div className="w-full bg-bg-tertiary rounded-full h-1.5">
                      <div
                        className="bg-accent-teal rounded-full h-1.5 transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Sessions widget */}
        <div className="bg-bg-secondary border border-border-default rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider">
              {t('section_upcoming')}
            </h2>
            {upcomingSessions.length > 0 && (
              <Link href="/learn/dashboard/schedule" className="text-xs text-accent-teal hover:underline">
                {t('view_all_sessions')} →
              </Link>
            )}
          </div>
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-fg-tertiary">{t('no_upcoming')}</p>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.slice(0, 3).map((session) => {
                const title = locale === 'ja' && session.title_jp ? session.title_jp : session.title_en;
                const courseTitle = locale === 'ja' && session.course_title_jp
                  ? session.course_title_jp : session.course_title_en;
                const sessionDate = new Date(session.scheduled_at);
                const formatBadgeColor = session.format === 'live'
                  ? 'bg-accent-teal/10 text-accent-teal'
                  : session.format === 'hybrid'
                    ? 'bg-accent-gold/10 text-accent-gold'
                    : 'bg-bg-tertiary text-fg-tertiary';

                return (
                  <div key={session.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-fg-primary truncate">{title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${formatBadgeColor}`}>
                          {t(`format_${session.format}`)}
                        </span>
                      </div>
                      <span className="text-xs text-fg-tertiary">{courseTitle}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-fg-tertiary">
                        {sessionDate.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-xs text-fg-tertiary">
                        {sessionDate.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Items widget */}
        <div className="bg-bg-secondary border border-border-default rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider">
              {t('section_action_items')}
            </h2>
          </div>
          {pendingAssignments.length === 0 ? (
            <p className="text-sm text-fg-tertiary">{t('no_assignments')}</p>
          ) : (
            <div className="space-y-3">
              {pendingAssignments.slice(0, 4).map((assignment) => {
                const title = locale === 'ja' && assignment.title_jp
                  ? assignment.title_jp : assignment.title_en;
                const courseTitle = locale === 'ja' && assignment.course_title_jp
                  ? assignment.course_title_jp : assignment.course_title_en;
                const typeBadge = assignment.assignment_type === 'homework'
                  ? { label: t('homework'), color: 'bg-accent-teal/10 text-accent-teal' }
                  : assignment.assignment_type === 'action-challenge'
                    ? { label: t('action_challenge'), color: 'bg-accent-gold/10 text-accent-gold' }
                    : { label: t('project'), color: 'bg-bg-tertiary text-fg-secondary' };

                return (
                  <div key={assignment.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-fg-primary truncate">{title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${typeBadge.color}`}>
                          {typeBadge.label}
                        </span>
                      </div>
                      <span className="text-xs text-fg-tertiary">
                        {courseTitle} · {t('week_label', { number: assignment.week_number })}
                      </span>
                    </div>
                    <span className="text-xs text-fg-tertiary shrink-0">
                      {assignment.due_date
                        ? t('due_date', {
                            date: new Date(assignment.due_date).toLocaleDateString(
                              locale === 'ja' ? 'ja-JP' : 'en-US',
                              { month: 'short', day: 'numeric' },
                            ),
                          })
                        : t('no_due_date')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links widget */}
        <div className="bg-bg-secondary border border-border-default rounded-lg p-5">
          <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider mb-4">
            {t('section_quick_links')}
          </h2>
          <div className="space-y-2">
            <Link
              href="/learn"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
            >
              <BookOpen size={16} />
              {t('explore_courses')}
            </Link>
            <Link
              href="/learn/dashboard/resources"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
            >
              <Clock size={16} />
              {t('nav_resources')}
            </Link>
            <Link
              href="/learn/dashboard/community"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
            >
              <Calendar size={16} />
              {t('nav_community')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
