'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from './StatusBadge';
import type { ParsedCourseData } from '@/lib/courses/types';

type ParsePreviewProps = {
  parsedData: ParsedCourseData;
  onConfirm: (startDate: string) => void;
  onBack: () => void;
  loading: boolean;
};

export function ParsePreview({ parsedData, onConfirm, onBack, loading }: ParsePreviewProps) {
  const { course, weeks } = parsedData;
  const [startDate, setStartDate] = useState(course.start_date ?? '');

  return (
    <div className="space-y-6">
      {/* Course overview */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-5 space-y-3">
        <h2 className="text-lg font-serif text-fg-primary">{course.title_en}</h2>
        {course.title_jp && (
          <p className="text-sm text-fg-tertiary">{course.title_jp}</p>
        )}
        <p className="text-sm text-fg-secondary">{course.description_en}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <MiniField label="Code" value={course.course_id_code} />
          <MiniField label="Slug" value={course.slug} />
          <MiniField label="Level" value={course.level} />
          <MiniField label="Language" value={course.language} />
          <MiniField label="Weeks" value={course.total_weeks.toString()} />
          <MiniField label="Live Sessions" value={course.live_sessions_count.toString()} />
          <MiniField label="Price (USD)" value={`$${course.price_usd}`} />
          <MiniField label="Price (JPY)" value={`¥${course.price_jpy.toLocaleString()}`} />
          <MiniField label="Max Enrollment" value={course.max_enrollment.toString()} />
          <MiniField label="Instructor" value={course.instructor_name} />
          <MiniField label="Community" value={course.community_platform} />
          <MiniField label="Format" value={course.format} />
        </div>
      </div>

      {/* Learning outcomes */}
      {course.learning_outcomes_en.length > 0 && (
        <div className="bg-bg-secondary border border-border-default rounded-lg p-5">
          <h3 className="text-sm font-medium text-fg-primary mb-2">Learning Outcomes</h3>
          <ul className="space-y-1">
            {course.learning_outcomes_en.map((outcome, i) => (
              <li key={i} className="text-sm text-fg-secondary">✓ {outcome}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tools */}
      {course.tools_covered.length > 0 && (
        <div className="bg-bg-secondary border border-border-default rounded-lg p-5">
          <h3 className="text-sm font-medium text-fg-primary mb-2">Tools Covered</h3>
          <div className="flex flex-wrap gap-2">
            {course.tools_covered.map((tool) => (
              <span key={tool} className="text-xs px-2 py-1 bg-bg-tertiary rounded font-mono text-fg-secondary">
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weeks preview */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-fg-primary">
          Curriculum ({weeks.length} weeks)
        </h3>
        {weeks.map((week) => (
          <div
            key={week.week_number}
            className="border border-border-default rounded-lg p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-fg-tertiary">Week {week.week_number}</span>
              {week.phase && (
                <span className="text-xs text-accent-teal">{week.phase}</span>
              )}
            </div>
            <h4 className="text-sm font-medium text-fg-primary">{week.title_en}</h4>
            {week.title_jp && (
              <p className="text-xs text-fg-tertiary">{week.title_jp}</p>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-fg-tertiary">
              <span>{week.sessions.length} session(s)</span>
              <span>{week.assignments.length} assignment(s)</span>
              <span>{week.vocabulary.length} vocab term(s)</span>
              <span>{week.resources.length} resource(s)</span>
            </div>
          </div>
        ))}
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
            onClick={() => onConfirm(startDate)}
            disabled={loading}
          >
            {loading ? 'Creating Course...' : 'Confirm & Create Course'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-fg-tertiary block">{label}</span>
      <span className="text-sm text-fg-primary">{value}</span>
    </div>
  );
}
