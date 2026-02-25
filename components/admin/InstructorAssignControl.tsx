'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { assignInstructorToCourse } from '@/lib/instructors/actions';

type InstructorOption = {
  id: string;
  display_name: string;
  photo_url: string | null;
};

type InstructorAssignControlProps = {
  courseId: string;
  currentInstructorId: string | null;
  currentInstructorName: string | null;
  instructors: InstructorOption[];
};

export function InstructorAssignControl({
  courseId,
  currentInstructorId,
  currentInstructorName,
  instructors,
}: InstructorAssignControlProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(currentInstructorId ?? '');
  const [assigning, setAssigning] = useState(false);

  const currentInstructor = instructors.find((i) => i.id === currentInstructorId);

  async function handleAssign() {
    const id = selectedId || null;
    if (id === currentInstructorId) return;
    setAssigning(true);
    try {
      await assignInstructorToCourse(courseId, id);
      router.refresh();
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign() {
    setAssigning(true);
    try {
      await assignInstructorToCourse(courseId, null);
      setSelectedId('');
      router.refresh();
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-fg-primary">Instructor Assignment</h3>

      {/* Currently assigned */}
      {currentInstructor && (
        <div className="flex items-center gap-3 bg-bg-secondary border border-border-default rounded-lg p-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-bg-tertiary shrink-0 flex items-center justify-center">
            {currentInstructor.photo_url ? (
              <Image
                src={currentInstructor.photo_url}
                alt={currentInstructor.display_name}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-medium text-fg-tertiary">
                {currentInstructor.display_name[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-sm text-fg-primary font-medium flex-1">
            {currentInstructor.display_name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-fg-tertiary hover:text-red-400"
            onClick={handleUnassign}
            disabled={assigning}
          >
            <UserX size={14} className="mr-1" />
            Unassign
          </Button>
        </div>
      )}

      {/* Fallback name display */}
      {!currentInstructor && currentInstructorName && (
        <p className="text-xs text-fg-tertiary">
          Legacy instructor name: <span className="text-fg-secondary">{currentInstructorName}</span>
        </p>
      )}

      {/* Assignment dropdown */}
      <div className="flex items-center gap-2">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 max-w-sm px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal"
        >
          <option value="">— None —</option>
          {instructors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.display_name}
            </option>
          ))}
        </select>
        <Button
          variant="primary"
          size="sm"
          onClick={handleAssign}
          disabled={assigning || selectedId === (currentInstructorId ?? '')}
        >
          {assigning ? 'Saving...' : 'Assign'}
        </Button>
      </div>
    </div>
  );
}
