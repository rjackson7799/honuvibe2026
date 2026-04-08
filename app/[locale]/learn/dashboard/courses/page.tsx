'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { DashboardCourseCard } from '@/components/learn/DashboardCourseCard';
import { CourseCard } from '@/components/learn/CourseCard';
import { SectionHeading } from '@/components/ui/section-heading';
import { cn } from '@/lib/utils';
import type { EnrollmentWithCourse } from '@/lib/enrollments/types';
import type { Course } from '@/lib/courses/types';

type FilterTab = 'all' | 'in_progress' | 'completed';

export default function MyCoursesPage() {
  const t = useTranslations('dashboard');
  const tLearn = useTranslations('learn');
  const locale = useLocale();
  const prefix = locale === 'ja' ? '/ja' : '';
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [exploreCourses, setExploreCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/dashboard/courses');
        if (res.ok) {
          const data = await res.json();
          setEnrollments(data.enrollments ?? []);
          setExploreCourses(data.exploreCourses ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('filter_all') },
    { key: 'in_progress', label: t('filter_in_progress') },
    { key: 'completed', label: t('filter_completed') },
  ];

  const filteredEnrollments = enrollments.filter((e) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'in_progress') return e.status === 'active';
    if (activeFilter === 'completed') return e.status === 'completed';
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1100px]">
        <h1 className="text-2xl font-serif text-fg-primary">{t('heading_courses')}</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-bg-tertiary rounded-lg w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-bg-tertiary rounded-lg" />
            <div className="h-48 bg-bg-tertiary rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1100px]">
      <h1 className="text-2xl font-serif text-fg-primary">{t('heading_courses')}</h1>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeFilter === filter.key
                ? 'bg-accent-teal/10 text-accent-teal'
                : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Enrolled Courses */}
      {filteredEnrollments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEnrollments.map((enrollment) => (
            <DashboardCourseCard
              key={enrollment.id}
              enrollment={enrollment}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-secondary px-4 py-3">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="shrink-0 text-accent-teal"
          >
            <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          <p className="text-sm text-fg-secondary">
            {t('no_courses')}
          </p>
        </div>
      )}

      {/* Explore More */}
      {exploreCourses.length > 0 && (
        <div>
          {enrollments.length > 0 ? (
            <SectionHeading
              heading={t('explore_more')}
              centered
            />
          ) : (
            <h2 className="text-lg font-serif text-fg-primary">
              {t('explore_more')}
            </h2>
          )}
          <div className={cn(
            'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
            enrollments.length > 0 ? 'mt-6' : 'mt-4',
          )}>
            {exploreCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                variant="dashboard"
                viewCourseHref={`${prefix}/learn/dashboard/${course.slug}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
