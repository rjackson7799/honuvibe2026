'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { UserX, UserPlus, Crown, User, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  addInstructorToCourse,
  removeInstructorFromCourse,
  updateCourseInstructorRole,
} from '@/lib/instructors/actions';
import type { CourseInstructorRole } from '@/lib/instructors/types';

type InstructorOption = {
  id: string;
  display_name: string;
  photo_url: string | null;
};

type CourseInstructorItem = {
  id: string; // course_instructors row id
  instructor_id: string;
  role: CourseInstructorRole;
  sort_order: number;
  instructor: {
    display_name: string;
    photo_url: string | null;
  };
};

type InstructorAssignControlProps = {
  courseId: string;
  courseInstructors: CourseInstructorItem[];
  allInstructors: InstructorOption[];
  legacyInstructorName?: string | null;
};

const ROLE_CONFIG: Record<CourseInstructorRole, { label: string; icon: typeof Crown; color: string }> = {
  lead: { label: 'Lead', icon: Crown, color: 'text-accent-gold' },
  instructor: { label: 'Instructor', icon: User, color: 'text-accent-teal' },
  guest: { label: 'Guest', icon: Mic, color: 'text-fg-tertiary' },
};

export function InstructorAssignControl({
  courseId,
  courseInstructors,
  allInstructors,
  legacyInstructorName,
}: InstructorAssignControlProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);

  // Filter out already-assigned instructors from the dropdown
  const assignedIds = new Set(courseInstructors.map((ci) => ci.instructor_id));
  const availableInstructors = allInstructors.filter((i) => !assignedIds.has(i.id));

  async function handleAdd() {
    if (!selectedId) return;
    setBusy(true);
    try {
      await addInstructorToCourse(courseId, selectedId);
      setSelectedId('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(instructorId: string) {
    setBusy(true);
    try {
      await removeInstructorFromCourse(courseId, instructorId);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(courseInstructorId: string, role: CourseInstructorRole) {
    setBusy(true);
    try {
      await updateCourseInstructorRole(courseInstructorId, role);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-fg-primary">Instructor Assignment</h3>

      {/* Currently assigned instructors */}
      {courseInstructors.length > 0 && (
        <div className="space-y-2">
          {courseInstructors.map((ci) => {
            const roleConfig = ROLE_CONFIG[ci.role];
            const RoleIcon = roleConfig.icon;

            return (
              <div
                key={ci.id}
                className="flex items-center gap-3 bg-bg-secondary border border-border-default rounded-lg p-3"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden bg-bg-tertiary shrink-0 flex items-center justify-center">
                  {ci.instructor.photo_url ? (
                    <Image
                      src={ci.instructor.photo_url}
                      alt={ci.instructor.display_name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-medium text-fg-tertiary">
                      {ci.instructor.display_name[0]?.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name */}
                <span className="text-sm text-fg-primary font-medium flex-1">
                  {ci.instructor.display_name}
                </span>

                {/* Role selector */}
                <div className="flex items-center gap-1">
                  <RoleIcon size={12} className={roleConfig.color} />
                  <select
                    value={ci.role}
                    onChange={(e) => handleRoleChange(ci.id, e.target.value as CourseInstructorRole)}
                    disabled={busy}
                    className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-default text-fg-secondary focus:outline-none focus:border-accent-teal"
                  >
                    <option value="lead">Lead</option>
                    <option value="instructor">Instructor</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>

                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-fg-tertiary hover:text-red-400"
                  onClick={() => handleRemove(ci.instructor_id)}
                  disabled={busy}
                >
                  <UserX size={14} className="mr-1" />
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Legacy name fallback */}
      {courseInstructors.length === 0 && legacyInstructorName && (
        <p className="text-xs text-fg-tertiary">
          Legacy instructor name: <span className="text-fg-secondary">{legacyInstructorName}</span>
        </p>
      )}

      {/* Add instructor dropdown */}
      {availableInstructors.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 max-w-sm px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
          >
            <option value="">— Select instructor to add —</option>
            {availableInstructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.display_name}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAdd}
            disabled={busy || !selectedId}
          >
            <UserPlus size={14} className="mr-1" />
            {busy ? 'Adding...' : 'Add'}
          </Button>
        </div>
      )}

      {availableInstructors.length === 0 && courseInstructors.length > 0 && (
        <p className="text-xs text-fg-tertiary">All active instructors are assigned to this course.</p>
      )}
    </div>
  );
}
