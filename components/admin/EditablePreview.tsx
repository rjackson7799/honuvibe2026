'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CourseMetadataEditor } from './preview/CourseMetadataEditor';
import { WeekEditor, emptyWeek } from './preview/WeekEditor';
import type { ParsedCourseData } from '@/lib/courses/types';

type EditablePreviewProps = {
  parsedData: ParsedCourseData;
  onConfirm: (data: ParsedCourseData, startDate: string) => void;
  onBack: () => void;
  loading: boolean;
};

export function EditablePreview({ parsedData, onConfirm, onBack, loading }: EditablePreviewProps) {
  // Clone into local state for editing
  const [data, setData] = useState<ParsedCourseData>(() => JSON.parse(JSON.stringify(parsedData)));
  const [startDate, setStartDate] = useState(data.course.start_date ?? '');

  function updateCourse(course: ParsedCourseData['course']) {
    setData((prev) => ({ ...prev, course }));
  }

  function updateWeek(index: number, week: ParsedCourseData['weeks'][number]) {
    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w, i) => (i === index ? week : w)),
    }));
  }

  function removeWeek(index: number) {
    setData((prev) => ({
      ...prev,
      weeks: prev.weeks
        .filter((_, i) => i !== index)
        .map((w, i) => ({ ...w, week_number: i + 1 })),
    }));
  }

  function addWeek() {
    setData((prev) => ({
      ...prev,
      weeks: [...prev.weeks, emptyWeek(prev.weeks.length + 1)],
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif text-fg-primary">Review & Edit</h2>
          <p className="text-xs text-fg-tertiary">
            Edit any field below before creating the course.
          </p>
        </div>
      </div>

      {/* Course Metadata */}
      <CourseMetadataEditor course={data.course} onChange={updateCourse} />

      {/* Weeks */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-fg-primary">
          Curriculum ({data.weeks.length} weeks)
        </h3>
        {data.weeks.map((week, i) => (
          <WeekEditor
            key={`week-${week.week_number}-${i}`}
            week={week}
            onChange={(w) => updateWeek(i, w)}
            onRemove={() => removeWeek(i)}
          />
        ))}
        <button
          type="button"
          onClick={addWeek}
          className="flex items-center gap-2 w-full justify-center py-3 border border-dashed border-border-default rounded-lg text-sm text-accent-teal hover:bg-accent-teal/5 transition-colors"
        >
          <Plus size={16} /> Add Week
        </button>
      </div>

      {/* Start date + actions */}
      <div className="border-t border-border-default pt-6 space-y-4">
        <Input
          label="Course Start Date (optional)"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onBack} disabled={loading}>
            Back
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(data, startDate)}
            disabled={loading}
          >
            {loading ? 'Creating Course...' : 'Confirm & Create Course'}
          </Button>
        </div>
      </div>
    </div>
  );
}
