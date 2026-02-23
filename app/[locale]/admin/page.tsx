import { setRequestLocale } from 'next-intl/server';
import { getDashboardStats } from '@/lib/admin/queries';
import { StatCard } from '@/components/admin/StatCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { BookOpen, Users, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Admin Dashboard',
};

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const stats = await getDashboardStats();

  return (
    <div className="space-y-8 max-w-[1100px]">
      <h1 className="text-2xl font-serif text-fg-primary">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Courses"
          value={stats.active_courses}
          icon={BookOpen}
        />
        <StatCard
          label="Total Enrolled"
          value={stats.total_enrolled}
          icon={Users}
        />
        <StatCard
          label="Upcoming Sessions"
          value={stats.upcoming_sessions.length}
          icon={Calendar}
        />
        <StatCard
          label="Pending Applications"
          value={stats.pending_applications}
          icon={FileText}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent enrollments */}
        <div className="bg-bg-secondary border border-border-default rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider">
              Recent Enrollments
            </h2>
            <Link href="/admin/students" className="text-xs text-accent-teal hover:underline">
              View all →
            </Link>
          </div>
          {stats.recent_enrollments.length === 0 ? (
            <p className="text-sm text-fg-tertiary">No recent enrollments.</p>
          ) : (
            <div className="space-y-3">
              {stats.recent_enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="text-fg-primary font-medium">
                      {enrollment.user_name}
                    </span>
                    <span className="text-fg-tertiary"> → </span>
                    <span className="text-fg-secondary">
                      {enrollment.course_title}
                    </span>
                  </div>
                  <span className="text-xs text-fg-tertiary shrink-0">
                    {new Date(enrollment.enrolled_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming sessions */}
        <div className="bg-bg-secondary border border-border-default rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider">
              Upcoming Sessions
            </h2>
            <Link href="/admin/courses" className="text-xs text-accent-teal hover:underline">
              View all →
            </Link>
          </div>
          {stats.upcoming_sessions.length === 0 ? (
            <p className="text-sm text-fg-tertiary">No upcoming sessions this week.</p>
          ) : (
            <div className="space-y-3">
              {stats.upcoming_sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="text-fg-primary font-medium">
                      {session.title_en}
                    </span>
                    {session.course_title && (
                      <span className="text-fg-tertiary text-xs ml-2">
                        ({session.course_title})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-fg-tertiary shrink-0">
                    {new Date(session.scheduled_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spots remaining */}
        <div className="bg-bg-secondary border border-border-default rounded-lg p-5">
          <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider mb-4">
            Course Capacity
          </h2>
          {stats.spots_remaining.length === 0 ? (
            <p className="text-sm text-fg-tertiary">No active courses.</p>
          ) : (
            <div className="space-y-3">
              {stats.spots_remaining.map((course) => (
                <div
                  key={course.course_id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-fg-secondary">{course.course_title}</span>
                  <span className={course.remaining <= 0 ? 'text-accent-gold font-medium' : 'text-fg-tertiary'}>
                    {course.remaining <= 0 ? 'Full' : `${course.remaining} spots left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-bg-secondary border border-border-default rounded-lg p-5">
          <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider mb-4">
            Quick Actions
          </h2>
          <div className="space-y-2">
            <Link
              href="/admin/courses/upload"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
            >
              <BookOpen size={16} />
              Upload New Course (Markdown)
            </Link>
            <Link
              href="/admin/students"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
            >
              <Users size={16} />
              Manage Students
            </Link>
            <Link
              href="/admin/applications"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
            >
              <FileText size={16} />
              Review Applications
              {stats.pending_applications > 0 && (
                <span className="ml-auto text-xs bg-accent-gold/10 text-accent-gold px-2 py-0.5 rounded-full">
                  {stats.pending_applications}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
