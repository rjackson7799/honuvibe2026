'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { BadgePill } from '@/components/ui/badge-pill';
import type { Course } from '@/lib/courses/types';

type AdminCourseListProps = {
  courses: Course[];
};

const statusFilters = [
  { key: 'all', label: 'All' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'draft', label: 'Draft' },
  { key: 'published', label: 'Published' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'archived', label: 'Archived' },
] as const;

export function AdminCourseList({ courses }: AdminCourseListProps) {
  const router = useRouter();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? courses : courses.filter((c) => c.status === filter);

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (course: Course) => (
        <span className="text-fg-primary font-semibold">{course.title_en}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (course: Course) => <StatusBadge status={course.status} />,
    },
    {
      key: 'visibility',
      header: 'Visibility',
      render: (course: Course) =>
        course.is_private ? (
          <BadgePill variant="coral" size="xs">Private</BadgePill>
        ) : (
          <BadgePill variant="gray" size="xs">Public</BadgePill>
        ),
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

  const chipBase =
    'px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border transition-all whitespace-nowrap';
  const chipActive = 'bg-[color:var(--accent-teal)] text-white border-[color:var(--accent-teal)]';
  const chipInactive =
    'bg-bg-secondary text-fg-secondary border-border-default hover:border-border-hover hover:text-fg-primary';

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
        {statusFilters.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setFilter(s.key)}
            className={`${chipBase} ${filter === s.key ? chipActive : chipInactive}`}
          >
            {s.key === 'all' ? `${s.label} (${courses.length})` : s.label}
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
