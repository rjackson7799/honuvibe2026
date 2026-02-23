'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SessionEditorPreview } from './SessionEditorPreview';
import { AssignmentEditor } from './AssignmentEditor';
import { VocabularyEditor } from './VocabularyEditor';
import { ResourceEditor } from './ResourceEditor';
import type { ParsedWeekData } from '@/lib/courses/types';

type WeekEditorProps = {
  week: ParsedWeekData;
  onChange: (week: ParsedWeekData) => void;
  onRemove: () => void;
};

export function WeekEditor({ week, onChange, onRemove }: WeekEditorProps) {
  const [expanded, setExpanded] = useState(false);

  function update<K extends keyof ParsedWeekData>(key: K, value: ParsedWeekData[K]) {
    onChange({ ...week, [key]: value });
  }

  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      {/* Header — always visible */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-bg-secondary cursor-pointer hover:bg-bg-tertiary transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown size={16} className="text-fg-tertiary shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-fg-tertiary shrink-0" />
        )}
        <span className="text-xs text-fg-tertiary shrink-0">Week {week.week_number}</span>
        {week.phase && (
          <span className="text-xs text-accent-teal shrink-0">{week.phase}</span>
        )}
        <span className="text-sm font-medium text-fg-primary truncate flex-1">
          {week.title_en || 'Untitled'}
        </span>
        <div className="flex items-center gap-2 text-xs text-fg-tertiary shrink-0">
          <span>{week.sessions.length}S</span>
          <span>{week.assignments.length}A</span>
          <span>{week.vocabulary.length}V</span>
          <span>{week.resources.length}R</span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-fg-tertiary hover:text-red-400 shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="p-4 space-y-4 border-t border-border-default">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Title (EN)"
              value={week.title_en}
              onChange={(e) => update('title_en', e.target.value)}
              className="!h-9 !text-sm"
            />
            <Input
              label="Title (JP)"
              value={week.title_jp || ''}
              onChange={(e) => update('title_jp', e.target.value || null)}
              className="!h-9 !text-sm"
            />
            <Input
              label="Subtitle (EN)"
              value={week.subtitle_en || ''}
              onChange={(e) => update('subtitle_en', e.target.value || null)}
              className="!h-9 !text-sm"
            />
            <Input
              label="Phase"
              value={week.phase || ''}
              onChange={(e) => update('phase', e.target.value || null)}
              placeholder="e.g., Foundation, Building, Mastery"
              className="!h-9 !text-sm"
            />
          </div>

          <Textarea
            label="Description (EN)"
            value={week.description_en || ''}
            onChange={(e) => update('description_en', e.target.value || null)}
            rows={2}
            className="!text-sm"
          />

          <div className="border-t border-border-default pt-4 space-y-4">
            <SessionEditorPreview
              sessions={week.sessions}
              onChange={(sessions) => update('sessions', sessions)}
            />

            <AssignmentEditor
              assignments={week.assignments}
              onChange={(assignments) => update('assignments', assignments)}
            />

            <VocabularyEditor
              vocabulary={week.vocabulary}
              onChange={(vocabulary) => update('vocabulary', vocabulary)}
            />

            <ResourceEditor
              resources={week.resources}
              onChange={(resources) => update('resources', resources)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to create an empty week
export function emptyWeek(weekNumber: number): ParsedWeekData {
  return {
    week_number: weekNumber,
    title_en: '',
    title_jp: null,
    subtitle_en: null,
    subtitle_jp: null,
    description_en: null,
    phase: null,
    sessions: [],
    assignments: [],
    vocabulary: [],
    resources: [],
  };
}
