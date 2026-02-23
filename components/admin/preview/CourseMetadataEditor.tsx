'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ParsedCourseData } from '@/lib/courses/types';

type CourseData = ParsedCourseData['course'];

type CourseMetadataEditorProps = {
  course: CourseData;
  onChange: (course: CourseData) => void;
};

export function CourseMetadataEditor({ course, onChange }: CourseMetadataEditorProps) {
  const [outcomeInput, setOutcomeInput] = useState('');
  const [toolInput, setToolInput] = useState('');

  function update<K extends keyof CourseData>(key: K, value: CourseData[K]) {
    onChange({ ...course, [key]: value });
  }

  function addOutcome() {
    const val = outcomeInput.trim();
    if (!val) return;
    update('learning_outcomes_en', [...course.learning_outcomes_en, val]);
    setOutcomeInput('');
  }

  function removeOutcome(index: number) {
    update('learning_outcomes_en', course.learning_outcomes_en.filter((_, i) => i !== index));
  }

  function addTool() {
    const val = toolInput.trim();
    if (!val) return;
    update('tools_covered', [...course.tools_covered, val]);
    setToolInput('');
  }

  function removeTool(index: number) {
    update('tools_covered', course.tools_covered.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-5">
      {/* Title & Description */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-medium text-fg-primary">Course Info</h3>
        <Input
          label="Title (EN)"
          value={course.title_en}
          onChange={(e) => update('title_en', e.target.value)}
        />
        {course.title_jp !== null && (
          <Input
            label="Title (JP)"
            value={course.title_jp || ''}
            onChange={(e) => update('title_jp', e.target.value || null)}
          />
        )}
        <Textarea
          label="Description (EN)"
          value={course.description_en}
          onChange={(e) => update('description_en', e.target.value)}
          rows={3}
        />
        {course.description_jp !== null && (
          <Textarea
            label="Description (JP)"
            value={course.description_jp || ''}
            onChange={(e) => update('description_jp', e.target.value || null)}
            rows={3}
          />
        )}
      </div>

      {/* Metadata Grid */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-medium text-fg-primary">Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Input
            label="Course Code"
            value={course.course_id_code}
            onChange={(e) => update('course_id_code', e.target.value)}
          />
          <Input
            label="Slug"
            value={course.slug}
            onChange={(e) => update('slug', e.target.value)}
          />
          <Input
            label="Instructor"
            value={course.instructor_name}
            onChange={(e) => update('instructor_name', e.target.value)}
          />
          <Select
            label="Level"
            value={course.level}
            onChange={(e) => update('level', e.target.value as CourseData['level'])}
            options={[
              { value: 'beginner', label: 'Beginner' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' },
            ]}
          />
          <Select
            label="Language"
            value={course.language}
            onChange={(e) => update('language', e.target.value as CourseData['language'])}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ja', label: 'Japanese' },
              { value: 'both', label: 'Both' },
            ]}
          />
          <Input
            label="Format"
            value={course.format}
            onChange={(e) => update('format', e.target.value)}
          />
          <Input
            label="Total Weeks"
            type="number"
            value={course.total_weeks}
            onChange={(e) => update('total_weeks', parseInt(e.target.value) || 0)}
          />
          <Input
            label="Live Sessions"
            type="number"
            value={course.live_sessions_count}
            onChange={(e) => update('live_sessions_count', parseInt(e.target.value) || 0)}
          />
          <Input
            label="Price (USD)"
            type="number"
            value={course.price_usd}
            onChange={(e) => update('price_usd', parseFloat(e.target.value) || 0)}
          />
          <Input
            label="Price (JPY)"
            type="number"
            value={course.price_jpy}
            onChange={(e) => update('price_jpy', parseInt(e.target.value) || 0)}
          />
          <Input
            label="Max Enrollment"
            type="number"
            value={course.max_enrollment}
            onChange={(e) => update('max_enrollment', parseInt(e.target.value) || 0)}
          />
          <Input
            label="Community Platform"
            value={course.community_platform}
            onChange={(e) => update('community_platform', e.target.value)}
          />
        </div>
      </div>

      {/* Learning Outcomes */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-medium text-fg-primary">Learning Outcomes</h3>
        {course.learning_outcomes_en.length > 0 && (
          <ul className="space-y-1.5">
            {course.learning_outcomes_en.map((outcome, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-fg-primary bg-bg-tertiary rounded px-3 py-2">
                <span className="flex-1">{outcome}</span>
                <button
                  type="button"
                  onClick={() => removeOutcome(i)}
                  className="text-fg-tertiary hover:text-red-400 mt-0.5 shrink-0"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input
            value={outcomeInput}
            onChange={(e) => setOutcomeInput(e.target.value)}
            placeholder="Add a learning outcome..."
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOutcome(); } }}
            className="flex-1"
          />
          <button
            type="button"
            onClick={addOutcome}
            disabled={!outcomeInput.trim()}
            className="h-12 w-12 flex items-center justify-center rounded bg-bg-tertiary border border-border-default text-fg-tertiary hover:text-accent-teal hover:border-accent-teal disabled:opacity-50 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Tools */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-medium text-fg-primary">Tools Covered</h3>
        {course.tools_covered.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {course.tools_covered.map((tool, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-bg-tertiary rounded font-mono text-fg-secondary"
              >
                {tool}
                <button
                  type="button"
                  onClick={() => removeTool(i)}
                  className="text-fg-tertiary hover:text-red-400"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={toolInput}
            onChange={(e) => setToolInput(e.target.value)}
            placeholder="Add a tool..."
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTool(); } }}
            className="flex-1"
          />
          <button
            type="button"
            onClick={addTool}
            disabled={!toolInput.trim()}
            className="h-12 w-12 flex items-center justify-center rounded bg-bg-tertiary border border-border-default text-fg-tertiary hover:text-accent-teal hover:border-accent-teal disabled:opacity-50 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
