'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
      <div className="space-y-8 max-w-[1100px]">
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
    <div className="space-y-8 max-w-[1100px]">
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
        <div className="text-center py-16">
          <p className="text-fg-tertiary mb-4">{t('no_courses')}</p>
        </div>
      )}

      {/* Explore More */}
      {exploreCourses.length > 0 && (
        <div className="mt-8">
          <SectionHeading
            heading={t('explore_more')}
            centered
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {exploreCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
