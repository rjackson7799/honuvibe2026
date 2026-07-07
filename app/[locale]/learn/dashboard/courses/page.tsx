'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { DashboardCourseRow } from '@/components/learn/DashboardCourseRow';
import { ExploreFeaturedCard } from '@/components/learn/ExploreFeaturedCard';
import { ExploreCourseRow } from '@/components/learn/ExploreCourseRow';
import { SectionHeading } from '@/components/learn/SectionHeading';
import { BookOpen, Search } from 'lucide-react';
import { DashboardPageHeader } from '@/components/learn/DashboardPageHeader';
import { cn } from '@/lib/utils';
import type { EnrollmentWithCourse } from '@/lib/enrollments/types';
import type { Course } from '@/lib/courses/types';

type FilterTab = 'all' | 'in_progress' | 'completed';
type SortKey = 'recent' | 'title' | 'progress';

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
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [exploreCourses, setExploreCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/dashboard/courses');
        if (res.ok) {
          const data = await res.json();
          setEnrollments(data.enrollments ?? []);
          setExploreCourses(data.exploreCourses ?? []);
          setProgress(data.progress ?? {});
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

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'recent', label: t('sort_recent') },
    { key: 'title', label: t('sort_title') },
    { key: 'progress', label: t('sort_progress') },
  ];

  const visibleEnrollments = useMemo(() => {
    const percentFor = (e: EnrollmentWithCourse) =>
      e.status === 'completed' ? 100 : (progress[e.course_id] ?? 0);
    const query = search.trim().toLowerCase();

    const filtered = enrollments.filter((e) => {
      if (activeFilter === 'in_progress' && e.status !== 'active') return false;
      if (activeFilter === 'completed' && e.status !== 'completed') return false;
      if (!query) return true;
      const course = e.course;
      const title =
        locale === 'ja' && course.title_jp ? course.title_jp : course.title_en;
      const description =
        (locale === 'ja' && course.description_jp
          ? course.description_jp
          : course.description_en) ?? '';
      return (
        title.toLowerCase().includes(query) ||
        description.toLowerCase().includes(query)
      );
    });

    // API order is enrolled_at desc, i.e. "recent".
    if (sort === 'title') {
      return [...filtered].sort((a, b) => {
        const titleOf = (e: EnrollmentWithCourse) =>
          locale === 'ja' && e.course.title_jp ? e.course.title_jp : e.course.title_en;
        return titleOf(a).localeCompare(titleOf(b), locale);
      });
    }
    if (sort === 'progress') {
      return [...filtered].sort((a, b) => percentFor(b) - percentFor(a));
    }
    return filtered;
  }, [enrollments, activeFilter, search, sort, locale, progress]);

  const heading = (
    <DashboardPageHeader
      icon={BookOpen}
      title={t('heading_courses')}
      count={!loading && enrollments.length > 0 ? String(enrollments.length) : undefined}
    />
  );

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1100px]">
        {heading}
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-bg-tertiary rounded-[14px] w-64" />
          <div className="space-y-3">
            <div className="h-[104px] bg-bg-tertiary rounded-[14px]" />
            <div className="h-[104px] bg-bg-tertiary rounded-[14px]" />
            <div className="h-[104px] bg-bg-tertiary rounded-[14px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1100px]">
      {heading}

      {/* Toolbar: filter chips + search + sort */}
      <div className="flex items-center gap-2 flex-wrap">
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

        <div className="flex items-center gap-2 flex-1 justify-end min-w-[220px]">
          <div className="relative flex-1 max-w-[240px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search_courses')}
              className="w-full bg-bg-secondary text-fg-primary border border-border-default rounded-full pl-8 pr-3.5 py-1.5 text-[16px] sm:text-[12.5px] placeholder:text-fg-tertiary focus:outline-none focus:border-[color:var(--accent-teal)] transition-colors"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label={t('sort_label')}
            className="bg-bg-secondary text-fg-secondary border border-border-default rounded-full px-3.5 py-1.5 text-[16px] sm:text-[12.5px] font-semibold focus:outline-none focus:border-[color:var(--accent-teal)] transition-colors cursor-pointer"
          >
            {sortOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Enrolled courses */}
      {visibleEnrollments.length > 0 ? (
        <div className="flex flex-col gap-3">
          {visibleEnrollments.map((enrollment) => (
            <DashboardCourseRow
              key={enrollment.id}
              enrollment={enrollment}
              progressPercent={progress[enrollment.course_id]}
            />
          ))}
        </div>
      ) : (
        <div className="py-8 px-4 rounded-[10px] border border-dashed border-border-default bg-bg-tertiary text-center">
          <p className="text-sm text-fg-tertiary">
            {enrollments.length === 0 ? t('no_courses') : t('no_results')}
          </p>
        </div>
      )}

      {/* Explore More */}
      {exploreCourses.length > 0 && (
        <div className="pt-2">
          <SectionHeading
            title={t('explore_more')}
            viewAllHref={`${prefix}/learn`}
            viewAllLabel={t('view_all_courses')}
            bordered
          />
          <div className="flex flex-col gap-4 mt-5">
            <ExploreFeaturedCard
              course={exploreCourses[0]}
              viewCourseHref={`${prefix}/learn/dashboard/${exploreCourses[0].slug}`}
            />
            {exploreCourses.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {exploreCourses.slice(1).map((course) => (
                  <ExploreCourseRow
                    key={course.id}
                    course={course}
                    viewCourseHref={`${prefix}/learn/dashboard/${course.slug}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
