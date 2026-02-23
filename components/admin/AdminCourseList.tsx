'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import type { Course } from '@/lib/courses/types';

type AdminCourseListProps = {
  courses: Course[];
};

const statusFilters = ['all', 'draft', 'published', 'in-progress', 'completed', 'archived'];

export function AdminCourseList({ courses }: AdminCourseListProps) {
  const router = useRouter();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? courses : courses.filter((c) => c.status === filter);

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (course: Course) => (
        <span className="text-fg-primary font-medium">{course.title_en}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (course: Course) => <StatusBadge status={course.status} />,
    },
    {
      key: 'enrollment',
      header: 'Enrollment',
      render: (course: Course) => (
        <span>
          {course.current_enrollment}/{course.max_enrollment ?? '∞'}
        </span>
      ),
    },
    {
      key: 'start_date',
      header: 'Start Date',
      render: (course: Course) =>
        course.start_date
          ? new Date(course.start_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '—',
    },
    {
      key: 'created',
      header: 'Created',
      render: (course: Course) =>
        new Date(course.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {statusFilters.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === s
                ? 'bg-accent-teal/10 text-accent-teal'
                : 'text-fg-tertiary hover:text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            {s === 'all' ? `All (${courses.length})` : s.replace('-', ' ')}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(course) => course.id}
        onRowClick={(course) => router.push(`/admin/courses/${course.id}`)}
        emptyMessage="No courses found."
      />
    </div>
  );
}
