'use client';

import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { ParsedAssignmentData } from '@/lib/courses/types';

type AssignmentEditorProps = {
  assignments: ParsedAssignmentData[];
  onChange: (assignments: ParsedAssignmentData[]) => void;
};

function emptyAssignment(): ParsedAssignmentData {
  return {
    title_en: '',
    title_jp: null,
    description_en: '',
    description_jp: null,
    assignment_type: 'homework',
  };
}

export function AssignmentEditor({ assignments, onChange }: AssignmentEditorProps) {
  function updateAssignment(index: number, partial: Partial<ParsedAssignmentData>) {
    const updated = assignments.map((a, i) => (i === index ? { ...a, ...partial } : a));
    onChange(updated);
  }

  function addAssignment() {
    onChange([...assignments, emptyAssignment()]);
  }

  function removeAssignment(index: number) {
    onChange(assignments.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-fg-tertiary uppercase tracking-wider">Assignments</label>
      {assignments.map((assignment, i) => (
        <div key={i} className="bg-bg-tertiary rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Select
              value={assignment.assignment_type}
              onChange={(e) => updateAssignment(i, { assignment_type: e.target.value as ParsedAssignmentData['assignment_type'] })}
              options={[
                { value: 'homework', label: 'Homework' },
                { value: 'action-challenge', label: 'Action Challenge' },
                { value: 'project', label: 'Project' },
              ]}
              className="!h-8 !text-xs !w-40"
            />
            <button
              type="button"
              onClick={() => removeAssignment(i)}
              className="text-fg-tertiary hover:text-red-400"
            >
              <X size={14} />
            </button>
          </div>
          <Input
            value={assignment.title_en}
            onChange={(e) => updateAssignment(i, { title_en: e.target.value })}
            placeholder="Assignment title..."
            className="!h-9 !text-sm"
          />
          <Input
            value={assignment.description_en}
            onChange={(e) => updateAssignment(i, { description_en: e.target.value })}
            placeholder="Description..."
            className="!h-9 !text-sm"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addAssignment}
        className="flex items-center gap-1.5 text-xs text-accent-teal hover:text-accent-teal-hover transition-colors"
      >
        <Plus size={14} /> Add Assignment
      </button>
    </div>
  );
}
