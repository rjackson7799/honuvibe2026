'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from './DataTable';
import type { StudentListItem } from '@/lib/admin/types';

type AdminStudentListProps = {
  students: StudentListItem[];
};

export function AdminStudentList({ students }: AdminStudentListProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = search
    ? students.filter(
        (s) =>
          s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          s.email?.toLowerCase().includes(search.toLowerCase()),
      )
    : students;

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (student: StudentListItem) => (
        <span className="text-fg-primary font-medium">
          {student.full_name || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (student: StudentListItem) => student.email ?? '—',
    },
    {
      key: 'courses',
      header: 'Enrolled Courses',
      render: (student: StudentListItem) =>
        student.enrolled_courses.length > 0
          ? student.enrolled_courses.join(', ')
          : '—',
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (student: StudentListItem) =>
        new Date(student.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
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
        keyExtractor={(student) => student.id}
        onRowClick={(student) => router.push(`/admin/students/${student.id}`)}
        emptyMessage="No students found."
      />
    </div>
  );
}
