import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStudentDashboardData } from '@/lib/dashboard/queries';
import { getCourseBySlug } from '@/lib/courses/queries';
import { StatCard } from '@/components/admin/StatCard';
import { BookOpen, CheckCircle, Calendar, Clock, Bell, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getVaultCourseRecommendations } from '@/lib/vault/queries';
import { VaultCourseRecommendations } from '@/components/vault/VaultCourseRecommendations';
import { getInstructorByUserId } from '@/lib/instructors/queries';
import { InstructorTeachingBanner } from '@/components/learn/InstructorTeachingBanner';
import { WelcomeScreen } from '@/components/learn/WelcomeScreen';
import { Card } from '@/components/ui/card';
import { BadgePill } from '@/components/ui/badge-pill';
import { SectionHeading } from '@/components/learn/SectionHeading';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ enrolled?: string; welcome?: string }>;
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

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, onboarded')
    .eq('id', user.id)
    .single();

  const [dashboardData, vaultRecommendations, instructorProfile, featuredCourse] = await Promise.all([
    getStudentDashboardData(user.id),
    getVaultCourseRecommendations(user.id, 6),
    getInstructorByUserId(user.id),
    getCourseBySlug('ai-essentials'),
  ]);

  let instructorClassCount = 0;
  if (instructorProfile?.is_active) {
    const { count } = await supabase
      .from('course_instructors')
      .select('*', { count: 'exact', head: true })
      .eq('instructor_id', instructorProfile.id);
    instructorClassCount = count ?? 0;
  }
  const { enrollments, upcomingSessions, pendingAssignments, stats } = dashboardData;

  const displayName = profile?.full_name ?? user.email?.split('@')[0] ?? '';
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  if (!profile?.onboarded || sp.welcome === 'true') {
    return <WelcomeScreen displayName={displayName} locale={locale} featuredCourse={featuredCourse} />;
  }

  const now = new Date();
  const overlineDate = now
    .toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase();

  return (
    <div className="space-y-7 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.05em] text-fg-tertiary mb-1">
            {overlineDate}
          </p>
          <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
            {t('welcome_back', { name: displayName })} <span aria-hidden>👋</span>
          </h1>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            aria-label="Notifications"
            className="relative w-[38px] h-[38px] rounded-[10px] bg-bg-secondary border border-border-default text-fg-secondary hover:text-fg-primary hover:border-border-hover transition-all flex items-center justify-center"
          >
            <Bell size={17} />
            <span className="absolute top-2 right-2 w-[7px] h-[7px] rounded-full bg-[color:var(--accent-coral)] ring-[1.5px] ring-bg-secondary" />
          </button>
          <Link
            href="/learn/dashboard/settings"
            aria-label={displayName}
            className="w-[38px] h-[38px] rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[15px] font-bold flex items-center justify-center transition-colors"
          >
            {initial}
          </Link>
        </div>
      </div>

      {sp.enrolled === 'true' && (
        <div className="bg-[color:var(--accent-teal-subtle)] border border-[color:var(--accent-teal)]/30 rounded-[14px] px-4 py-3">
          <p className="text-sm text-[color:var(--accent-teal)] font-medium">
            {tLearn('enrolled_success')}
          </p>
        </div>
      )}

      {instructorClassCount > 0 && (
        <InstructorTeachingBanner classCount={instructorClassCount} />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          variant="learn"
          accent="teal"
          label={t('stats_active_courses')}
          value={stats.active_courses}
          icon={BookOpen}
        />
        <StatCard
          variant="learn"
          accent="teal"
          label={t('stats_completed_courses')}
          value={stats.completed_courses}
          icon={CheckCircle}
        />
        <StatCard
          variant="learn"
          accent="coral"
          label={t('stats_upcoming_sessions')}
          value={stats.upcoming_sessions_count}
          icon={Calendar}
        />
        <StatCard
          variant="learn"
          accent="teal"
          label={t('stats_study_hours')}
          value={stats.total_study_hours}
          icon={Clock}
        />
      </div>

      {/* Vault Recommendations */}
      {vaultRecommendations.length > 0 && (
        <VaultCourseRecommendations items={vaultRecommendations} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* My Courses */}
        <Card variant="learn" padding="md">
          <SectionHeading
            title={t('section_my_courses')}
            viewAllHref={enrollments.length > 0 ? '/learn/dashboard/courses' : undefined}
            viewAllLabel={t('view_all_courses')}
          />
          {enrollments.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-fg-tertiary mb-3">{t('no_courses')}</p>
              <Link
                href="/learn"
                className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--accent-teal)] hover:text-[color:var(--accent-teal-hover)]"
              >
                {t('explore_courses')} <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div>
              {enrollments.slice(0, 3).map((enrollment, i) => {
                const course = enrollment.course;
                const title = locale === 'ja' && course.title_jp ? course.title_jp : course.title_en;
                const totalWeeks = course.total_weeks ?? 1;
                const startDate = course.start_date ? new Date(course.start_date) : null;
                const weeksPassed = startDate
                  ? Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)))
                  : 1;
                const currentWeek = Math.min(weeksPassed, totalWeeks);
                const progressPercent = Math.round((currentWeek / totalWeeks) * 100);
                const isComplete = progressPercent === 100;
                const isLast = i === Math.min(enrollments.length, 3) - 1;

                return (
                  <Link
                    key={enrollment.id}
                    href={`/learn/dashboard/${course.slug}`}
                    className={`block py-3.5 ${isLast ? '' : 'border-b border-border-default'} hover:opacity-90 transition-opacity`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-[13.5px] font-semibold text-fg-primary truncate">
                        {title}
                      </span>
                      <span className="text-[11.5px] text-fg-tertiary font-medium shrink-0">
                        {tLearn('week_of', { current: currentWeek, total: totalWeeks })}
                      </span>
                    </div>
                    <div className="h-[5px] bg-[rgba(26,43,51,0.07)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isComplete ? 'bg-[color:var(--accent-coral)]' : 'bg-[color:var(--accent-teal)]'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        {/* Upcoming Sessions */}
        <Card variant="learn" padding="md">
          <SectionHeading
            title={t('section_upcoming')}
            viewAllHref={upcomingSessions.length > 0 ? '/learn/dashboard/schedule' : undefined}
            viewAllLabel={t('view_all_sessions')}
          />
          {upcomingSessions.length === 0 ? (
            <div className="py-6 px-4 rounded-[10px] border border-dashed border-border-default bg-bg-tertiary text-center">
              <p className="text-sm text-fg-tertiary">{t('no_upcoming')}</p>
            </div>
          ) : (
            <div>
              {upcomingSessions.slice(0, 3).map((session, i) => {
                const title = locale === 'ja' && session.title_jp ? session.title_jp : session.title_en;
                const courseTitle =
                  locale === 'ja' && session.course_title_jp
                    ? session.course_title_jp
                    : session.course_title_en;
                const sessionDate = new Date(session.scheduled_at);
                const isLast = i === Math.min(upcomingSessions.length, 3) - 1;
                const isLive = session.format === 'live';

                return (
                  <div
                    key={session.id}
                    className={`flex items-start justify-between gap-3 py-3.5 ${isLast ? '' : 'border-b border-border-default'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[13.5px] font-semibold text-fg-primary truncate">
                          {title}
                        </span>
                        {isLive && <BadgePill variant="live" size="xs">LIVE</BadgePill>}
                      </div>
                      <p className="text-[12px] text-fg-tertiary truncate">{courseTitle}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[12px] font-semibold text-fg-secondary">
                        {sessionDate.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-[12px] text-fg-tertiary">
                        {sessionDate.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Action Items — full width */}
      <div>
        <SectionHeading title={t('section_action_items')} />
        {pendingAssignments.length === 0 ? (
          <div className="py-6 px-4 rounded-[10px] border border-dashed border-border-default bg-bg-tertiary text-center">
            <p className="text-sm text-fg-tertiary">{t('no_assignments')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingAssignments.slice(0, 4).map((assignment) => {
              const title =
                locale === 'ja' && assignment.title_jp ? assignment.title_jp : assignment.title_en;
              const courseTitle =
                locale === 'ja' && assignment.course_title_jp
                  ? assignment.course_title_jp
                  : assignment.course_title_en;
              const tagLabel =
                assignment.assignment_type === 'homework'
                  ? t('homework')
                  : assignment.assignment_type === 'action-challenge'
                    ? t('action_challenge')
                    : t('project');
              const tagVariant: 'teal' | 'coral' | 'gray' =
                assignment.assignment_type === 'homework'
                  ? 'teal'
                  : assignment.assignment_type === 'action-challenge'
                    ? 'coral'
                    : 'gray';

              const due = assignment.due_date ? new Date(assignment.due_date) : null;
              const daysUntilDue = due
                ? Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
                : null;
              const isUrgent = daysUntilDue !== null && daysUntilDue <= 3;
              const dueLabel = due
                ? t('due_date', {
                    date: due.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                    }),
                  })
                : t('no_due_date');

              return (
                <div
                  key={assignment.id}
                  className="flex items-center gap-3 px-4 py-3 bg-bg-secondary border border-border-default rounded-[10px]"
                >
                  <div
                    aria-hidden
                    className="w-5 h-5 rounded-md border-[1.5px] border-[rgba(26,43,51,0.2)] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[13.5px] font-semibold text-fg-primary truncate">
                        {title}
                      </span>
                      <BadgePill variant={tagVariant} size="xs">
                        {tagLabel}
                      </BadgePill>
                    </div>
                    <p className="text-[12px] text-fg-tertiary truncate">
                      {courseTitle} · {t('week_label', { number: assignment.week_number })}
                    </p>
                  </div>
                  <span
                    className={`text-[12px] font-medium whitespace-nowrap shrink-0 ${
                      isUrgent ? 'text-[color:var(--accent-coral)]' : 'text-fg-tertiary'
                    }`}
                  >
                    {dueLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
