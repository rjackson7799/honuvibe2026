'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { updateCourseSession } from '@/lib/courses/actions';
import type { CourseSession } from '@/lib/courses/types';

type SessionEditorProps = {
  session: CourseSession;
};

export function SessionEditor({ session }: SessionEditorProps) {
  const router = useRouter();
  const [replayUrl, setReplayUrl] = useState(session.replay_url ?? '');
  const [transcriptUrl, setTranscriptUrl] = useState(session.transcript_url ?? '');
  const [slideDeckUrl, setSlideDeckUrl] = useState(session.slide_deck_url ?? '');
  const [status, setStatus] = useState(session.status);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await updateCourseSession(session.id, {
        replay_url: replayUrl || undefined,
        transcript_url: transcriptUrl || undefined,
        slide_deck_url: slideDeckUrl || undefined,
        status,
      });
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to update session:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-border-default rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-fg-tertiary">Session {session.session_number}</span>
          <h4 className="text-sm font-medium text-fg-primary">{session.title_en}</h4>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Replay URL"
          value={replayUrl}
          onChange={(e) => setReplayUrl(e.target.value)}
          placeholder="https://youtube.com/..."
        />
        <Input
          label="Transcript URL"
          value={transcriptUrl}
          onChange={(e) => setTranscriptUrl(e.target.value)}
          placeholder="https://..."
        />
        <Input
          label="Slide Deck URL"
          value={slideDeckUrl}
          onChange={(e) => setSlideDeckUrl(e.target.value)}
          placeholder="https://docs.google.com/..."
        />
        <div>
          <label className="block text-xs text-fg-tertiary mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'upcoming' | 'live' | 'completed')}
            className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary"
          >
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
        {saved && (
          <span className="text-xs text-accent-teal">Saved!</span>
        )}
      </div>
    </div>
  );
}
