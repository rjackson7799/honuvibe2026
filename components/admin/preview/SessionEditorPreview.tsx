'use client';

import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { ParsedSessionData } from '@/lib/courses/types';

type SessionEditorPreviewProps = {
  sessions: ParsedSessionData[];
  onChange: (sessions: ParsedSessionData[]) => void;
};

function emptySession(sessionNumber: number): ParsedSessionData {
  return {
    session_number: sessionNumber,
    title_en: '',
    title_jp: null,
    format: 'live',
    duration_minutes: 60,
    materials_en: null,
    materials_jp: null,
    topics_en: null,
    topics_jp: null,
  };
}

export function SessionEditorPreview({ sessions, onChange }: SessionEditorPreviewProps) {
  function updateSession(index: number, partial: Partial<ParsedSessionData>) {
    const updated = sessions.map((s, i) => (i === index ? { ...s, ...partial } : s));
    onChange(updated);
  }

  function addSession() {
    const next = sessions.length > 0 ? Math.max(...sessions.map((s) => s.session_number)) + 1 : 1;
    onChange([...sessions, emptySession(next)]);
  }

  function removeSession(index: number) {
    onChange(sessions.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-fg-tertiary uppercase tracking-wider">Sessions</label>
      {sessions.map((session, i) => (
        <div key={i} className="bg-bg-tertiary rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-fg-tertiary">Session {session.session_number}</span>
            <button
              type="button"
              onClick={() => removeSession(i)}
              className="text-fg-tertiary hover:text-red-400"
            >
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <Input
                value={session.title_en}
                onChange={(e) => updateSession(i, { title_en: e.target.value })}
                placeholder="Session title..."
                className="!h-9 !text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={session.format}
                onChange={(e) => updateSession(i, { format: e.target.value as ParsedSessionData['format'] })}
                options={[
                  { value: 'live', label: 'Live' },
                  { value: 'recorded', label: 'Recorded' },
                  { value: 'hybrid', label: 'Hybrid' },
                ]}
                className="!h-9 !text-sm"
              />
              <Input
                type="number"
                value={session.duration_minutes || ''}
                onChange={(e) => updateSession(i, { duration_minutes: parseInt(e.target.value) || null })}
                placeholder="min"
                className="!h-9 !text-sm !w-20"
              />
            </div>
          </div>
          {session.title_jp !== null && (
            <Input
              value={session.title_jp || ''}
              onChange={(e) => updateSession(i, { title_jp: e.target.value || null })}
              placeholder="Session title (JP)..."
              className="!h-9 !text-sm"
            />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addSession}
        className="flex items-center gap-1.5 text-xs text-accent-teal hover:text-accent-teal-hover transition-colors"
      >
        <Plus size={14} /> Add Session
      </button>
    </div>
  );
}
