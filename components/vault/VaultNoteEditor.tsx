'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { StickyNote, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveNote } from '@/lib/vault/actions';
import type { VaultNote } from '@/lib/vault/types';

const MAX_LENGTH = 5000;
const DEBOUNCE_MS = 2000;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type VaultNoteEditorProps = {
  contentItemId: string;
  initialNote: VaultNote | null;
  isVideo?: boolean;
};

export function VaultNoteEditor({ contentItemId, initialNote, isVideo = false }: VaultNoteEditorProps) {
  const [text, setText] = useState(initialNote?.note_text ?? '');
  const [timestamp, setTimestamp] = useState<string>(
    initialNote?.timestamp_seconds != null ? String(initialNote.timestamp_seconds) : '',
  );
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTextRef = useRef(text);

  latestTextRef.current = text;

  const doSave = useCallback(async (noteText: string, ts: string) => {
    if (!noteText.trim()) return;
    setStatus('saving');
    try {
      const tsNum = ts ? parseInt(ts, 10) : undefined;
      await saveNote(contentItemId, noteText, Number.isNaN(tsNum) ? undefined : tsNum);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [contentItemId]);

  const scheduleAutoSave = useCallback((noteText: string, ts: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      doSave(noteText, ts);
    }, DEBOUNCE_MS);
  }, [doSave]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleTextChange(value: string) {
    if (value.length > MAX_LENGTH) return;
    setText(value);
    setStatus('idle');
    scheduleAutoSave(value, timestamp);
  }

  function handleTimestampChange(value: string) {
    setTimestamp(value);
    setStatus('idle');
    if (text.trim()) {
      scheduleAutoSave(text, value);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-fg-primary">
          <StickyNote size={14} />
          Your Notes
        </h3>
        <div className="flex items-center gap-1.5 text-xs">
          {status === 'saving' && (
            <span className="flex items-center gap-1 text-fg-tertiary">
              <Loader2 size={12} className="animate-spin" />
              Saving...
            </span>
          )}
          {status === 'saved' && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Check size={12} />
              Saved
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertCircle size={12} />
              Error saving
            </span>
          )}
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="Write your notes here..."
        className={cn(
          'w-full min-h-[120px] px-3 py-2 rounded-lg text-sm',
          'bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary',
          'focus:outline-none focus:border-accent-teal/50 focus:ring-1 focus:ring-accent-teal/20',
          'resize-y',
        )}
      />

      <div className="flex items-center justify-between text-xs text-fg-tertiary">
        {isVideo && (
          <div className="flex items-center gap-1.5">
            <label htmlFor="note-timestamp" className="shrink-0">
              Timestamp (seconds):
            </label>
            <input
              id="note-timestamp"
              type="number"
              min={0}
              value={timestamp}
              onChange={(e) => handleTimestampChange(e.target.value)}
              placeholder="0"
              className="w-20 px-2 py-1 rounded bg-bg-tertiary border border-border-default text-fg-primary text-xs focus:outline-none focus:border-accent-teal/50"
            />
          </div>
        )}
        <span className={cn('ml-auto', text.length > MAX_LENGTH * 0.9 && 'text-accent-gold')}>
          {text.length}/{MAX_LENGTH}
        </span>
      </div>
    </div>
  );
}
