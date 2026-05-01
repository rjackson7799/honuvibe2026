import { setRequestLocale } from 'next-intl/server';
import { getDashboardStats } from '@/lib/admin/queries';
import { StatCard } from '@/components/admin/StatCard';
import { BookOpen, Users, Calendar, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PathStatsWidget } from '@/components/admin/PathStatsWidget';
import { Card } from '@/components/ui/card';
import { BadgePill } from '@/components/ui/badge-pill';
import { SectionHeading } from '@/components/learn/SectionHeading';

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
    <div className="space-y-6 max-w-[1100px]">
      {/* Header */}
      <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
        Dashboard
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard variant="learn" accent="teal" label="Active Courses" value={stats.active_courses} icon={BookOpen} />
        <StatCard variant="learn" accent="teal" label="Total Enrolled" value={stats.total_enrolled} icon={Users} />
        <StatCard variant="learn" accent="coral" label="Upcoming Sessions" value={stats.upcoming_sessions.length} icon={Calendar} />
        <StatCard
          variant="learn"
          accent={stats.pending_applications > 0 ? 'coral' : 'teal'}
          label="Pending Applications"
          value={stats.pending_applications}
          icon={FileText}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent enrollments */}
        <Card variant="learn" padding="md">
          <SectionHeading
            title="Recent Enrollments"
            viewAllHref="/admin/students"
            viewAllLabel="View all"
          />
          {stats.recent_enrollments.length === 0 ? (
            <div className="py-6 px-4 rounded-[10px] border border-dashed border-border-default bg-bg-tertiary text-center">
              <p className="text-sm text-fg-tertiary">No recent enrollments.</p>
            </div>
          ) : (
            <div>
              {stats.recent_enrollments.map((enrollment, i) => {
                const isLast = i === stats.recent_enrollments.length - 1;
                return (
                  <div
                    key={enrollment.id}
                    className={`flex items-center justify-between gap-3 py-3 ${isLast ? '' : 'border-b border-border-default'}`}
                  >
                    <div className="min-w-0">
                      <span className="text-[13.5px] font-semibold text-fg-primary">
                        {enrollment.user_name}
                      </span>
                      <span className="text-fg-tertiary"> → </span>
                      <span className="text-[13.5px] text-fg-secondary">
                        {enrollment.course_title}
                      </span>
                    </div>
                    <span className="text-[11.5px] text-fg-tertiary shrink-0 font-medium">
                      {new Date(enrollment.enrolled_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Upcoming sessions */}
        <Card variant="learn" padding="md">
          <SectionHeading
            title="Upcoming Sessions"
            viewAllHref="/admin/courses"
            viewAllLabel="View all"
          />
          {stats.upcoming_sessions.length === 0 ? (
            <div className="py-6 px-4 rounded-[10px] border border-dashed border-border-default bg-bg-tertiary text-center">
              <p className="text-sm text-fg-tertiary">No upcoming sessions this week.</p>
            </div>
          ) : (
            <div>
              {stats.upcoming_sessions.map((session, i) => {
                const isLast = i === stats.upcoming_sessions.length - 1;
                return (
                  <div
                    key={session.id}
                    className={`flex items-start justify-between gap-3 py-3 ${isLast ? '' : 'border-b border-border-default'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-fg-primary truncate">
                        {session.title_en}
                      </p>
                      {session.course_title && (
                        <p className="text-[12px] text-fg-tertiary truncate">{session.course_title}</p>
                      )}
                    </div>
                    <span className="text-[11.5px] text-fg-tertiary shrink-0 font-medium">
                      {new Date(session.scheduled_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Course capacity */}
        <Card variant="learn" padding="md">
          <SectionHeading title="Course Capacity" />
          {stats.spots_remaining.length === 0 ? (
            <div className="py-6 px-4 rounded-[10px] border border-dashed border-border-default bg-bg-tertiary text-center">
              <p className="text-sm text-fg-tertiary">No active courses.</p>
            </div>
          ) : (
            <div>
              {stats.spots_remaining.map((course, i) => {
                const isLast = i === stats.spots_remaining.length - 1;
                const isFull = course.remaining <= 0;
                return (
                  <div
                    key={course.course_id}
                    className={`flex items-center justify-between gap-3 py-3 ${isLast ? '' : 'border-b border-border-default'}`}
                  >
                    <span className="text-[13.5px] text-fg-secondary truncate">
                      {course.course_title}
                    </span>
                    <span
                      className={`text-[12px] font-semibold shrink-0 ${
                        isFull
                          ? 'text-[color:var(--accent-coral)]'
                          : 'text-fg-tertiary'
                      }`}
                    >
                      {isFull ? 'Full' : `${course.remaining} spots left`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Self-Study Path Stats */}
        <PathStatsWidget />

        {/* Quick actions */}
        <Card variant="learn" padding="md" className="lg:col-span-2">
          <SectionHeading title="Quick Actions" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Link
              href="/admin/courses/upload"
              className="group flex items-center gap-2.5 px-3.5 py-3 rounded-[10px] bg-bg-tertiary border border-border-default text-fg-secondary hover:text-fg-primary hover:border-[color:var(--accent-teal)]/35 hover:bg-bg-secondary transition-all"
            >
              <BookOpen size={16} className="text-[color:var(--accent-teal)] shrink-0" />
              <span className="text-[13px] font-medium flex-1 truncate">Upload New Course</span>
              <ArrowRight size={14} className="text-fg-tertiary group-hover:text-fg-secondary shrink-0" />
            </Link>
            <Link
              href="/admin/students"
              className="group flex items-center gap-2.5 px-3.5 py-3 rounded-[10px] bg-bg-tertiary border border-border-default text-fg-secondary hover:text-fg-primary hover:border-[color:var(--accent-teal)]/35 hover:bg-bg-secondary transition-all"
            >
              <Users size={16} className="text-[color:var(--accent-teal)] shrink-0" />
              <span className="text-[13px] font-medium flex-1 truncate">Manage Students</span>
              <ArrowRight size={14} className="text-fg-tertiary group-hover:text-fg-secondary shrink-0" />
            </Link>
            <Link
              href="/admin/applications"
              className="group flex items-center gap-2.5 px-3.5 py-3 rounded-[10px] bg-bg-tertiary border border-border-default text-fg-secondary hover:text-fg-primary hover:border-[color:var(--accent-teal)]/35 hover:bg-bg-secondary transition-all"
            >
              <FileText size={16} className="text-[color:var(--accent-teal)] shrink-0" />
              <span className="text-[13px] font-medium flex-1 truncate">Review Applications</span>
              {stats.pending_applications > 0 && (
                <BadgePill variant="coral" size="xs">{stats.pending_applications}</BadgePill>
              )}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
