'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Copy, Check, ChevronDown, ChevronRight, ExternalLink, X, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { updateBonusSession, deleteBonusSession } from '@/lib/courses/actions';
import { parseZoomInvite } from '@/lib/courses/parse-zoom-invite';
import type { ParsedZoomInvite } from '@/lib/courses/parse-zoom-invite';
import type { CourseSession, BonusSessionType } from '@/lib/courses/types';

type CourseInstructorOption = {
  instructor_id: string;
  display_name: string;
};

type BonusSessionEditorProps = {
  session: CourseSession;
  courseInstructors?: CourseInstructorOption[];
};

const BONUS_TYPE_OPTIONS: { value: BonusSessionType; label: string }[] = [
  { value: 'office-hours', label: 'Office Hours' },
  { value: 'guest-speaker', label: 'Guest Speaker' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'qa', label: 'Q&A' },
];

export function BonusSessionEditor({ session, courseInstructors }: BonusSessionEditorProps) {
  const router = useRouter();
  const [bonusType, setBonusType] = useState<BonusSessionType>(session.bonus_type ?? 'office-hours');
  const [titleEn, setTitleEn] = useState(session.title_en);
  const [titleJp, setTitleJp] = useState(session.title_jp ?? '');
  const [descEn, setDescEn] = useState(session.description_en ?? '');
  const [descJp, setDescJp] = useState(session.description_jp ?? '');
  const [replayUrl, setReplayUrl] = useState(session.replay_url ?? '');
  const [transcriptUrl, setTranscriptUrl] = useState(session.transcript_url ?? '');
  const [slideDeckUrl, setSlideDeckUrl] = useState(session.slide_deck_url ?? '');
  const [instructorId, setInstructorId] = useState(session.instructor_id ?? '');
  const [status, setStatus] = useState(session.status);
  const [scheduledAt, setScheduledAt] = useState(session.scheduled_at ?? '');
  const [durationMinutes, setDurationMinutes] = useState(session.duration_minutes?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      await updateBonusSession(session.id, {
        bonus_type: bonusType,
        title_en: titleEn,
        title_jp: titleJp || null,
        description_en: descEn || null,
        description_jp: descJp || null,
        replay_url: replayUrl || null,
        transcript_url: transcriptUrl || null,
        slide_deck_url: slideDeckUrl || null,
        zoom_link: zoomLink || null,
        instructor_id: instructorId || null,
        status,
        scheduled_at: scheduledAt || null,
        duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
      });
      setSaved(true);
      if (zoomLink) setShowZoomPaste(false);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to update bonus session:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteBonusSession(session.id);
      router.refresh();
    } catch (err) {
      console.error('Failed to delete bonus session:', err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="border border-border-default rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-fg-tertiary capitalize">{bonusType.replace('-', ' ')}</span>
          <h4 className="text-sm font-medium text-fg-primary">{titleEn || 'Untitled Bonus Session'}</h4>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Bonus Type */}
        <div>
          <label className="block text-xs text-fg-tertiary mb-1">Session Type</label>
          <select
            value={bonusType}
            onChange={(e) => setBonusType(e.target.value as BonusSessionType)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary"
          >
            {BONUS_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Status */}
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

        {/* Title EN */}
        <Input
          label="Title (EN)"
          value={titleEn}
          onChange={(e) => setTitleEn(e.target.value)}
          placeholder="Bonus session title"
        />

        {/* Title JP */}
        <Input
          label="Title (JP)"
          value={titleJp}
          onChange={(e) => setTitleJp(e.target.value)}
          placeholder="ボーナスセッションタイトル"
        />

        {/* Scheduled Date/Time */}
        <Input
          label="Scheduled Date/Time"
          type="datetime-local"
          value={scheduledAt ? scheduledAt.slice(0, 16) : ''}
          onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
        />

        {/* Duration */}
        <Input
          label="Duration (minutes)"
          type="number"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          placeholder="60"
        />

        {/* Instructor */}
        {courseInstructors && courseInstructors.length > 0 && (
          <div>
            <label className="block text-xs text-fg-tertiary mb-1">Instructor</label>
            <select
              value={instructorId}
              onChange={(e) => setInstructorId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary"
            >
              <option value="">Select instructor</option>
              {courseInstructors.map((ci) => (
                <option key={ci.instructor_id} value={ci.instructor_id}>
                  {ci.display_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Replay URL */}
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
      </div>

      {/* Description EN */}
      <Textarea
        label="Description (EN)"
        value={descEn}
        onChange={(e) => setDescEn(e.target.value)}
        placeholder="Describe what this bonus session covers..."
        className="min-h-[60px]"
      />

      {/* Description JP */}
      <Textarea
        label="Description (JP)"
        value={descJp}
        onChange={(e) => setDescJp(e.target.value)}
        placeholder="このボーナスセッションの説明..."
        className="min-h-[60px]"
      />

      {/* Zoom Meeting Section — reused from SessionEditor pattern */}
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

            {showZoomPaste && (
              <>
                <Textarea
                  label="Paste Zoom Invite"
                  placeholder={"Paste full Zoom invite text or just the meeting URL...\n\nExample:\nJoin Zoom Meeting\nhttps://us06web.zoom.us/j/123456789?pwd=abc123\n\nMeeting ID: 123 456 789\nPasscode: 123456"}
                  value={zoomInviteText}
                  onChange={handleZoomPaste}
                  className="min-h-[100px] text-xs font-mono"
                />

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

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={saving || !titleEn.trim()}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
        {saved && (
          <span className="text-xs text-accent-teal">Saved!</span>
        )}
        <div className="ml-auto">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Delete this session?</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="text-red-400 hover:text-red-300"
              >
                {deleting ? 'Deleting...' : 'Confirm'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              className="text-fg-tertiary hover:text-red-400 transition-colors p-1"
              title="Delete bonus session"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
