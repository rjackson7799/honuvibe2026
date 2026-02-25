'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import type { InstructorListItem } from '@/lib/instructors/types';

type AdminInstructorListProps = {
  instructors: InstructorListItem[];
};

export function AdminInstructorList({ instructors }: AdminInstructorListProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = search
    ? instructors.filter(
        (i) =>
          i.display_name.toLowerCase().includes(search.toLowerCase()) ||
          i.email?.toLowerCase().includes(search.toLowerCase()),
      )
    : instructors;

  const columns = [
    {
      key: 'photo',
      header: '',
      render: (instructor: InstructorListItem) => (
        <div className="w-9 h-9 rounded-full overflow-hidden bg-bg-tertiary shrink-0 flex items-center justify-center">
          {instructor.photo_url ? (
            <Image
              src={instructor.photo_url}
              alt={instructor.display_name}
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-fg-tertiary">
              {instructor.display_name[0]?.toUpperCase()}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (instructor: InstructorListItem) => (
        <span className="text-fg-primary font-medium">
          {instructor.display_name}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (instructor: InstructorListItem) => (
        <span className="text-fg-secondary text-sm truncate max-w-[200px] block">
          {instructor.title_en ?? '—'}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (instructor: InstructorListItem) => instructor.email ?? '—',
    },
    {
      key: 'courses',
      header: 'Courses',
      render: (instructor: InstructorListItem) => (
        <span className="text-fg-secondary">{instructor.course_count}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (instructor: InstructorListItem) => (
        <StatusBadge status={instructor.is_active ? 'published' : 'archived'} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
      />
      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(instructor) => instructor.id}
        onRowClick={(instructor) => router.push(`/admin/instructors/${instructor.id}`)}
        emptyMessage="No instructors found. Add your first instructor to get started."
      />
    </div>
  );
}
