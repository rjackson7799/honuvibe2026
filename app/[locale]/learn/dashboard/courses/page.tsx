'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { DashboardCourseCard } from '@/components/learn/DashboardCourseCard';
import { CourseCard } from '@/components/learn/CourseCard';
import { SectionHeading } from '@/components/learn/SectionHeading';
import { BadgePill } from '@/components/ui/badge-pill';
import { cn } from '@/lib/utils';
import type { EnrollmentWithCourse } from '@/lib/enrollments/types';
import type { Course } from '@/lib/courses/types';

type FilterTab = 'all' | 'in_progress' | 'completed';

const chipBase =
  'px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border transition-all whitespace-nowrap';
const chipInactive =
  'bg-bg-secondary text-fg-secondary border-border-default hover:border-border-hover hover:text-fg-primary';
const chipActive =
  'bg-[color:var(--accent-teal)] text-white border-[color:var(--accent-teal)]';

export default function MyCoursesPage() {
  const t = useTranslations('dashboard');
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

  const heading = (
    <div className="flex items-center gap-2 flex-wrap">
      <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
        {t('heading_courses')}
      </h1>
      {!loading && enrollments.length > 0 && (
        <BadgePill variant="teal" size="sm">{enrollments.length}</BadgePill>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1100px]">
        {heading}
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-bg-tertiary rounded-[14px] w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-bg-tertiary rounded-[14px]" />
            <div className="h-48 bg-bg-tertiary rounded-[14px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1100px]">
      {heading}

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setActiveFilter(filter.key)}
            className={cn(chipBase, activeFilter === filter.key ? chipActive : chipInactive)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Enrolled Courses */}
      {filteredEnrollments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEnrollments.map((enrollment) => (
            <DashboardCourseCard key={enrollment.id} enrollment={enrollment} />
          ))}
        </div>
      ) : (
        <div className="py-8 px-4 rounded-[10px] border border-dashed border-border-default bg-bg-tertiary text-center">
          <p className="text-sm text-fg-tertiary">{t('no_courses')}</p>
        </div>
      )}

      {/* Explore More */}
      {exploreCourses.length > 0 && (
        <div className="pt-2">
          <SectionHeading title={t('explore_more')} bordered />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
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
