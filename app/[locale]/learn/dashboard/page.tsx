import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStudentDashboardData } from '@/lib/dashboard/queries';
import { getCourseBySlug } from '@/lib/courses/queries';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { DashboardWelcomeHeader } from '@/components/learn/DashboardWelcomeHeader';
import { getVaultCourseRecommendations, getVaultBookmarkCount, getVaultNewThisWeekCount } from '@/lib/vault/queries';
import { getInstructorByUserId } from '@/lib/instructors/queries';
import { InstructorTeachingBanner } from '@/components/learn/InstructorTeachingBanner';
import { WelcomeScreen } from '@/components/learn/WelcomeScreen';
import { SetPasswordBanner } from '@/components/learn/SetPasswordBanner';
import { DashboardBackdrop } from '@/components/learn/DashboardBackdrop';
import { NextSessionCard } from '@/components/learn/NextSessionCard';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SectionHeading } from '@/components/learn/SectionHeading';
import { getMyUpcomingEvents } from '@/lib/events/queries';
import { DashboardUpcomingEvents } from '@/components/events/DashboardUpcomingEvents';
import { getUserPaths } from '@/lib/paths/queries';
import { PathCard } from '@/components/learn/PathCard';
import { getResumePoint, getLessonsCompletedThisWeek, type ResumePoint } from '@/lib/progress/queries';
import { getWorkbenchSummary, type WorkbenchSummary } from '@/lib/workbench/queries';
import { getUnreadCommunityReplies } from '@/lib/notifications/queries';
import { listFeed } from '@/lib/community/queries';
import type { Post } from '@/lib/community/types';
import { ResumeHero } from '@/components/learn/ResumeHero';
import { ActionItemsBand } from '@/components/learn/ActionItemsBand';
import { WorkbenchTile } from '@/components/learn/WorkbenchTile';
import { CommunityTile } from '@/components/learn/CommunityTile';
import { VaultTile } from '@/components/learn/VaultTile';
import { StudyPathInvite } from '@/components/learn/StudyPathInvite';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ enrolled?: string; welcome?: string }>;
};

/** A session is an interrupt only once it's live or about to be — the same
 *  30-minute threshold SessionCard uses for its live-soon state. Anything
 *  further out is just the hero's job. */
const IMMINENT_MS = 30 * 60 * 1000;

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
  const tEvents = await getTranslations({ locale, namespace: 'events' });
  const tPaths = await getTranslations({ locale, namespace: 'study_paths' });

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, onboarded, password_set')
    .eq('id', user.id)
    .single();

  // Use || (not ??) so empty-string full_name (from webhook-created users
  // who didn't pass a name through Stripe) falls through to the email-prefix
  // fallback instead of rendering "さん、ようこそ！" with no name.
  const displayName =
    (profile?.full_name && profile.full_name.trim()) ||
    user.email?.split('@')[0] ||
    '';

  // Branch BEFORE fetching. The welcome screen needs only the featured course, so
  // a brand-new user should not pay for the entire dashboard bundle and throw it
  // away.
  if (!profile?.onboarded || sp.welcome === 'true') {
    const featuredCourse = await getCourseBySlug('ai-essentials');
    return (
      <WelcomeScreen
        displayName={displayName}
        locale={locale}
        featuredCourse={featuredCourse}
        passwordSet={profile?.password_set ?? true}
      />
    );
  }

  const now = new Date();

  // The hero is critical: its failure must surface as an error state, never as
  // "start your first course". Every tile is optional and degrades on its own
  // rather than taking the dashboard down with it.
  const [
    dashboardData,
    resumeResult,
    lessonsThisWeekResult,
    vaultRecommendations,
    vaultSaved,
    vaultNew,
    instructorProfile,
    upcomingEvents,
    studyPaths,
    workbenchResult,
    unreadReplies,
    communityFeed,
  ] = await Promise.all([
    // getUserEnrollments (inside this bundle) throws on a Supabase error, and it
    // has no error boundary above it — so catch here to safe defaults. The page
    // then renders the hero + empty obligation states rather than 500ing the
    // whole dashboard on one transient read.
    getStudentDashboardData(user.id).catch((e) => {
      console.error('[dashboard] getStudentDashboardData failed:', e);
      return {
        enrollments: [],
        upcomingSessions: [],
        pendingAssignments: [],
        coursesProgress: new Map<string, number>(),
      };
    }),
    getResumePoint(user.id).then<ResumePoint | null>((r) => r).catch((e) => {
      console.error('[dashboard] getResumePoint failed:', e);
      return null;
    }),
    getLessonsCompletedThisWeek(user.id, now).catch((e) => {
      console.error('[dashboard] getLessonsCompletedThisWeek failed:', e);
      return null;
    }),
    getVaultCourseRecommendations(user.id, 2),
    getVaultBookmarkCount(user.id),
    getVaultNewThisWeekCount(now),
    getInstructorByUserId(user.id),
    getMyUpcomingEvents(3),
    getUserPaths(user.id).catch(() => []),
    getWorkbenchSummary().catch<WorkbenchSummary | null>((e) => {
      console.error('[dashboard] getWorkbenchSummary failed:', e);
      return null;
    }),
    getUnreadCommunityReplies(user.id).catch(() => 0),
    listFeed(supabase, { partnerId: null, limit: 2, userId: user.id })
      .then((page) => page.posts)
      .catch<Post[]>(() => []),
  ]);

  const activeStudyPaths = studyPaths.filter((p) => p.status === 'active');

  let instructorClassCount = 0;
  if (instructorProfile?.is_active) {
    const { count } = await supabase
      .from('course_instructors')
      .select('*', { count: 'exact', head: true })
      .eq('instructor_id', instructorProfile.id);
    instructorClassCount = count ?? 0;
  }
  const { enrollments, upcomingSessions, pendingAssignments, coursesProgress } = dashboardData;

  const prefix = locale === 'ja' ? '/ja' : '';
  const showPasswordBanner = profile && profile.password_set === false;

  const overlineDate = now
    .toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase();

  // Only a genuinely imminent session earns an interrupt above the hero. The old
  // page showed this for any upcoming session, which would now just repeat the
  // hero.
  const candidate = upcomingSessions[0] ?? null;
  const nextSession =
    candidate &&
    new Date(candidate.scheduled_at).getTime() - now.getTime() <= IMMINENT_MS
      ? candidate
      : null;
  const nextSessionDateLabel = nextSession
    ? new Date(nextSession.scheduled_at).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
    : '';
  const nextSessionTimeLabel = nextSession
    ? new Date(nextSession.scheduled_at).toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  // Don't offer the same lesson twice: when the interrupt card already points at
  // the session the hero would resume, the hero drops its CTA.
  const heroDuplicatesNextSession =
    !!nextSession &&
    resumeResult?.kind === 'resume' &&
    resumeResult.session.id === nextSession.id;

  const showMyCourses = enrollments.length > 1;

  return (
    <div className="relative space-y-7 max-w-[1100px]">
      <DashboardBackdrop />
      <DashboardWelcomeHeader
        overlineDate={overlineDate}
        welcomeLabel={t('welcome_back', { name: displayName })}
      />

      {sp.enrolled === 'true' && (
        <div className="bg-[color:var(--accent-teal-subtle)] border border-[color:var(--accent-teal)]/30 rounded-[14px] px-4 py-3">
          <p className="text-sm text-[color:var(--accent-teal)] font-medium">
            {tLearn('enrolled_success')}
          </p>
        </div>
      )}

      {showPasswordBanner && <SetPasswordBanner />}

      {instructorClassCount > 0 && (
        <InstructorTeachingBanner classCount={instructorClassCount} />
      )}

      {nextSession && (
        <NextSessionCard
          session={nextSession}
          locale={locale}
          dateLabel={nextSessionDateLabel}
          timeLabel={nextSessionTimeLabel}
        />
      )}

      {/* 1 — the one primary action */}
      <ResumeHero
        resume={resumeResult}
        locale={locale}
        lessonsThisWeek={lessonsThisWeekResult}
        vaultSaves={vaultSaved}
        suppressCta={heroDuplicatesNextSession}
      />

      {/* 2 — the only time-bound obligations */}
      <ActionItemsBand items={pendingAssignments} locale={locale} now={now} />

      {/* My Courses — only when the hero doesn't already cover it. With one
          course the hero IS the course card, so a one-row list would repeat it. */}
      {showMyCourses && (
        <section>
          <SectionHeading
            title={t('section_my_courses')}
            viewAllHref={`${prefix}/learn/dashboard/courses`}
            viewAllLabel={t('view_all_courses')}
          />
          <Card variant="learn" padding="md">
            {enrollments.slice(0, 3).map((enrollment, i) => {
              const course = enrollment.course;
              const title = locale === 'ja' && course.title_jp ? course.title_jp : course.title_en;
              const progressPercent = coursesProgress.get(course.id) ?? 0;
              const isLast = i === Math.min(enrollments.length, 3) - 1;

              return (
                <Link
                  key={enrollment.id}
                  href={`${prefix}/learn/dashboard/${course.slug}`}
                  className={`block py-3.5 ${isLast ? '' : 'border-b border-border-default'} hover:opacity-90 transition-opacity`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-[13.5px] font-semibold text-fg-primary truncate">
                      {title}
                    </span>
                    <span className="text-[11.5px] text-fg-tertiary font-medium shrink-0">
                      {tLearn('progress', { percent: progressPercent })}
                    </span>
                  </div>
                  <ProgressBar percent={progressPercent} label={title} />
                </Link>
              );
            })}
          </Card>
        </section>
      )}

      {/* 3 — Study Path */}
      <section>
        <SectionHeading
          title={tPaths('your_paths')}
          viewAllHref={activeStudyPaths.length > 0 ? `${prefix}/learn/paths` : undefined}
          viewAllLabel={tPaths('view_all_paths')}
        />
        {activeStudyPaths.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeStudyPaths.slice(0, 2).map((path) => (
              <PathCard key={path.id} path={path} />
            ))}
          </div>
        ) : (
          <StudyPathInvite locale={locale} />
        )}
      </section>

      {/* 4 — Workbench | Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WorkbenchTile summary={workbenchResult} locale={locale} />
        {upcomingEvents.length > 0 ? (
          <DashboardUpcomingEvents
            items={upcomingEvents}
            lang={locale === 'ja' ? 'ja' : 'en'}
            labels={{
              heading: tEvents('dashboard_upcoming'),
              needed: tEvents('status_needed'),
              going: tEvents('badge_going'),
              notGoing: tEvents('badge_not_going'),
            }}
          />
        ) : (
          <Card variant="learn" padding="md">
            <SectionHeading title={tEvents('dashboard_upcoming')} />
            <p className="text-[13.5px] text-fg-secondary">{t('tile_events_empty')}</p>
            <Link
              href={`${prefix}/learn/dashboard/events`}
              className="mt-3 inline-flex items-center gap-1.5 min-h-[44px] text-[13px] font-medium text-[color:var(--accent-teal)] hover:text-[color:var(--accent-teal-hover)] transition-colors"
            >
              {t('tile_events_cta')}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </Card>
        )}
      </div>

      {/* 5 — Community | Vault */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CommunityTile unreadReplies={unreadReplies} posts={communityFeed} locale={locale} />
        <VaultTile
          items={vaultRecommendations}
          saved={vaultSaved}
          newThisWeek={vaultNew}
          locale={locale}
        />
      </div>
    </div>
  );
}
