'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Copy, Check, ChevronDown, ChevronRight, ExternalLink, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { updateCourseSession } from '@/lib/courses/actions';
import { parseZoomInvite } from '@/lib/courses/parse-zoom-invite';
import type { ParsedZoomInvite } from '@/lib/courses/parse-zoom-invite';
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

  // Zoom state
  const [zoomLink, setZoomLink] = useState(session.zoom_link ?? '');
  const [zoomInviteText, setZoomInviteText] = useState('');
  const [parsedZoom, setParsedZoom] = useState<ParsedZoomInvite | null>(null);
  const [zoomExpanded, setZoomExpanded] = useState(false);
  const [showZoomPaste, setShowZoomPaste] = useState(!session.zoom_link);
  const [copied, setCopied] = useState<string | null>(null);

  const handleZoomPaste = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setZoomInviteText(text);
    if (text.trim()) {
      const parsed = parseZoomInvite(text);
      setParsedZoom(parsed);
      if (parsed.meetingUrl) {
        setZoomLink(parsed.meetingUrl);
      }
    } else {
      setParsedZoom(null);
      setZoomLink('');
    }
  }, []);

  async function copyToClipboard(text: string, field: string) {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  }

  function handleRemoveZoom() {
    setZoomLink('');
    setZoomInviteText('');
    setParsedZoom(null);
    setShowZoomPaste(true);
  }

  function handleChangeZoom() {
    setZoomInviteText('');
    setParsedZoom(null);
    setShowZoomPaste(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await updateCourseSession(session.id, {
        replay_url: replayUrl || undefined,
        transcript_url: transcriptUrl || undefined,
        slide_deck_url: slideDeckUrl || undefined,
        zoom_link: zoomLink || null,
        status,
      });
      setSaved(true);
      if (zoomLink) setShowZoomPaste(false);
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

      {/* Zoom Meeting Section */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setZoomExpanded(!zoomExpanded)}
          className="flex items-center gap-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors"
        >
          {zoomExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Video size={14} />
          <span>Zoom Meeting</span>
          {zoomLink && !zoomExpanded && (
            <span className="text-xs text-accent-teal font-medium ml-1">Configured</span>
          )}
        </button>

        {zoomExpanded && (
          <div className="space-y-3 pl-7">
            {/* Current zoom link display */}
            {zoomLink && !showZoomPaste && (
              <div className="bg-bg-secondary border border-border-default rounded-lg p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={zoomLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent-teal hover:underline flex items-center gap-1 truncate max-w-[400px]"
                  >
                    {zoomLink}
                    <ExternalLink size={12} />
                  </a>
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      type="button"
                      onClick={handleChangeZoom}
                      className="text-xs text-fg-tertiary hover:text-fg-primary px-2 py-1 rounded border border-border-default"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveZoom}
                      className="text-xs text-fg-tertiary hover:text-red-400 px-2 py-1 rounded border border-border-default"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Paste area */}
            {showZoomPaste && (
              <>
                <Textarea
                  label="Paste Zoom Invite"
                  placeholder={"Paste full Zoom invite text or just the meeting URL...\n\nExample:\nJoin Zoom Meeting\nhttps://us06web.zoom.us/j/123456789?pwd=abc123\n\nMeeting ID: 123 456 789\nPasscode: 123456"}
                  value={zoomInviteText}
                  onChange={handleZoomPaste}
                  className="min-h-[100px] text-xs font-mono"
                />

                {/* Parsed result card */}
                {zoomInviteText.trim() && parsedZoom?.meetingUrl && (
                  <div className="bg-bg-secondary border border-border-default rounded-lg p-3 space-y-2">
                    <span className="text-[11px] font-semibold text-fg-tertiary uppercase tracking-[0.18em]">
                      Parsed Meeting Info
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-fg-tertiary">Link:</span>
                      <a
                        href={parsedZoom.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-accent-teal hover:underline truncate max-w-[350px]"
                      >
                        {parsedZoom.meetingUrl}
                      </a>
                    </div>

                    {parsedZoom.meetingId && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-fg-tertiary">Meeting ID:</span>
                        <span className="text-sm text-fg-primary font-mono">{parsedZoom.meetingId}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(parsedZoom.meetingId!, 'id')}
                          className="text-fg-tertiary hover:text-fg-primary"
                        >
                          {copied === 'id' ? <Check size={12} className="text-accent-teal" /> : <Copy size={12} />}
                        </button>
                      </div>
                    )}

                    {parsedZoom.passcode && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-fg-tertiary">Passcode:</span>
                        <span className="text-sm text-fg-primary font-mono">{parsedZoom.passcode}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(parsedZoom.passcode!, 'passcode')}
                          className="text-fg-tertiary hover:text-fg-primary"
                        >
                          {copied === 'passcode' ? <Check size={12} className="text-accent-teal" /> : <Copy size={12} />}
                        </button>
                      </div>
                    )}

                    {parsedZoom.dateTime && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-fg-tertiary">Time:</span>
                        <span className="text-xs text-fg-secondary">{parsedZoom.dateTime}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* No URL found hint */}
                {zoomInviteText.trim() && !parsedZoom?.meetingUrl && (
                  <p className="text-xs text-fg-tertiary">
                    No Zoom meeting URL found in pasted text.
                  </p>
                )}
              </>
            )}
          </div>
        )}
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
