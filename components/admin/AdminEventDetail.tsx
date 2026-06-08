'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Ban, Trash2, Plus, X } from 'lucide-react';
import {
  createEvent,
  updateEvent,
  publishEvent,
  unpublishEvent,
  cancelEvent,
  addInvitations,
  removeInvitation,
  markAttendance,
  upsertRecapAssets,
  setRecapPublished,
  sendInvites,
  sendReminder,
  sendRecap,
  sendTestEmail,
} from '@/lib/events/actions';
import type {
  AdminEventDetail as AdminEventDetailData,
  AttendanceStatus,
  EventLocale,
  RecapResource,
} from '@/lib/events/types';
import { validateEventForPublish } from '@/lib/events/validation';

type Tab = 'details' | 'invitations' | 'recap';

const TIMEZONES = [
  'Pacific/Honolulu',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Asia/Tokyo',
  'UTC',
];

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-default text-fg-primary text-sm focus:border-accent-teal outline-none';
const labelCls = 'block text-[13px] font-medium text-fg-secondary mb-1';
const btnPrimary =
  'inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold disabled:opacity-50 transition-all';
const btnGhost =
  'inline-flex items-center gap-2 h-10 px-3.5 rounded-[10px] bg-bg-secondary border border-border-default text-fg-secondary text-[13px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors';

function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDateTimeLocal(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function AdminEventDetail({ detail }: { detail: AdminEventDetailData | null }) {
  const router = useRouter();
  const isCreate = detail === null;
  const event = detail?.event ?? null;

  const [tab, setTab] = useState<Tab>('details');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>('');

  // ── details ──
  const [slug, setSlug] = useState(event?.slug ?? '');
  const [titleEn, setTitleEn] = useState(event?.title_en ?? '');
  const [titleJp, setTitleJp] = useState(event?.title_jp ?? '');
  const [descEn, setDescEn] = useState(event?.description_en ?? '');
  const [descJp, setDescJp] = useState(event?.description_jp ?? '');
  const [presenter, setPresenter] = useState(event?.presenter_name ?? '');
  const [presenterOrg, setPresenterOrg] = useState(event?.presenter_org ?? '');
  const [startsAt, setStartsAt] = useState(toDateTimeLocal(event?.starts_at));
  const [endsAt, setEndsAt] = useState(toDateTimeLocal(event?.ends_at));
  const [timezone, setTimezone] = useState(event?.timezone ?? 'Pacific/Honolulu');
  const [meetingUrl, setMeetingUrl] = useState(event?.meeting_url ?? '');
  const [meetingNotesEn, setMeetingNotesEn] = useState(event?.meeting_notes_en ?? '');
  const [meetingNotesJp, setMeetingNotesJp] = useState(event?.meeting_notes_jp ?? '');
  const [capacity, setCapacity] = useState(event?.capacity != null ? String(event.capacity) : '');

  // ── invitations ──
  const [emailsRaw, setEmailsRaw] = useState('');
  const [inviteLocale, setInviteLocale] = useState<EventLocale>('en');

  // ── recap ──
  const [recordingUrl, setRecordingUrl] = useState(detail?.recap?.recording_url ?? '');
  const [slideUrl, setSlideUrl] = useState(detail?.recap?.slide_deck_url ?? '');
  const [transcriptUrl, setTranscriptUrl] = useState(detail?.recap?.transcript_url ?? '');
  const [recapNotesEn, setRecapNotesEn] = useState(detail?.recap?.recap_notes_en ?? '');
  const [recapNotesJp, setRecapNotesJp] = useState(detail?.recap?.recap_notes_jp ?? '');
  const [resources, setResources] = useState<RecapResource[]>(detail?.recap?.recap_resources ?? []);

  async function run(fn: () => Promise<unknown>, ok = 'Saved.') {
    setBusy(true);
    setMessage('');
    try {
      await fn();
      setMessage(ok);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  function detailsPayload() {
    return {
      slug: slug.trim(),
      title_en: titleEn,
      title_jp: titleJp || null,
      description_en: descEn || null,
      description_jp: descJp || null,
      presenter_name: presenter || null,
      presenter_org: presenterOrg || null,
      starts_at: fromDateTimeLocal(startsAt) ?? new Date().toISOString(),
      ends_at: fromDateTimeLocal(endsAt),
      timezone,
      meeting_url: meetingUrl || null,
      meeting_notes_en: meetingNotesEn || null,
      meeting_notes_jp: meetingNotesJp || null,
      capacity: capacity ? Number(capacity) : null,
    };
  }

  async function handleCreate() {
    await run(async () => {
      const { id } = await createEvent(detailsPayload());
      router.push(`/admin/events/${id}`);
    }, 'Created.');
  }

  async function handleSendBatch(kind: 'invite' | 'reminder' | 'recap') {
    const count = detail?.invitations.length ?? 0;
    const verb = kind === 'invite' ? 'invites' : kind === 'reminder' ? 'reminders' : 'the recap';
    if (!window.confirm(`Send ${verb} to ${count} invitee(s)?`)) return;
    await run(async () => {
      const fn = kind === 'invite' ? sendInvites : kind === 'reminder' ? sendReminder : sendRecap;
      const res = await fn(event!.id);
      setMessage(`Sent ${res.sent}, failed ${res.failed}, skipped ${res.skipped}.`);
    });
  }

  // ── create view ──
  if (isCreate) {
    return (
      <div className="max-w-[760px] space-y-6">
        <BackLink />
        <h1 className="text-[clamp(20px,2.4vw,26px)] font-bold text-fg-primary tracking-[-0.02em]">
          New Event
        </h1>
        {message && <Banner text={message} />}
        <div className="grid sm:grid-cols-2 gap-4">
          <Labeled label="Slug">
            <input className={inputCls} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="intro-to-ai-agents" />
          </Labeled>
          <Labeled label="Time zone">
            <select className={inputCls} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Title (EN)">
            <input className={inputCls} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </Labeled>
          <Labeled label="Starts at">
            <input type="datetime-local" className={inputCls} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </Labeled>
        </div>
        <button className={btnPrimary} disabled={busy} onClick={handleCreate}>
          Create event
        </button>
      </div>
    );
  }

  // ── edit view ──
  // Gate publish/send client-side so the common cases never hit a thrown
  // server-action error (which Next.js redacts to an unhelpful message in prod).
  const publishErrors = event ? validateEventForPublish(event) : [];
  const canInvite = !!event && event.is_published && event.status !== 'cancelled';
  const recapReady = !!event && event.recap_published;

  return (
    <div className="max-w-[860px] space-y-6">
      <BackLink />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[clamp(20px,2.4vw,26px)] font-bold text-fg-primary tracking-[-0.02em]">
            {titleEn || 'Untitled event'}
          </h1>
          <p className="text-[13px] text-fg-tertiary mt-1">
            {event!.status} · {event!.is_published ? 'Published' : 'Draft'}
            {event!.recap_published ? ' · Recap live' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {event!.is_published ? (
            <button className={btnGhost} disabled={busy} onClick={() => run(() => unpublishEvent(event!.id), 'Unpublished.')}>
              <EyeOff size={15} /> Unpublish
            </button>
          ) : (
            <button
              className={btnPrimary}
              disabled={busy || publishErrors.length > 0}
              title={publishErrors.length > 0 ? publishErrors.join(' ') : undefined}
              onClick={() => run(() => publishEvent(event!.id), 'Published.')}
            >
              <Eye size={15} /> Publish
            </button>
          )}
          <button className={btnGhost} disabled={busy} onClick={() => { if (window.confirm('Cancel this event?')) run(() => cancelEvent(event!.id), 'Cancelled.'); }}>
            <Ban size={15} /> Cancel
          </button>
        </div>
      </div>

      {message && <Banner text={message} />}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-default">
        {(['details', 'invitations', 'recap'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-accent-teal text-fg-primary' : 'border-transparent text-fg-tertiary hover:text-fg-secondary'
            }`}
          >
            {t}
            {t === 'invitations' ? ` (${detail?.invitations.length ?? 0})` : ''}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="space-y-4">
          {!event!.is_published && publishErrors.length > 0 && (
            <div className="rounded-lg border border-[color:var(--accent-gold)]/40 bg-[color:var(--accent-gold)]/5 px-4 py-2.5 text-[12px] text-fg-secondary">
              <span className="font-semibold text-fg-primary">To publish, save these first:</span>{' '}
              {publishErrors.join(' ')}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <Labeled label="Slug"><input className={inputCls} value={slug} onChange={(e) => setSlug(e.target.value)} /></Labeled>
            <Labeled label="Time zone">
              <select className={inputCls} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </Labeled>
            <Labeled label="Title (EN)"><input className={inputCls} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></Labeled>
            <Labeled label="Title (JP)"><input className={inputCls} value={titleJp} onChange={(e) => setTitleJp(e.target.value)} /></Labeled>
            <Labeled label="Starts at"><input type="datetime-local" className={inputCls} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></Labeled>
            <Labeled label="Ends at"><input type="datetime-local" className={inputCls} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></Labeled>
            <Labeled label="Presenter"><input className={inputCls} value={presenter} onChange={(e) => setPresenter(e.target.value)} /></Labeled>
            <Labeled label="Presenter org"><input className={inputCls} value={presenterOrg} onChange={(e) => setPresenterOrg(e.target.value)} /></Labeled>
            <Labeled label="Capacity"><input type="number" className={inputCls} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></Labeled>
            <Labeled label="Meeting URL (Zoom)"><input className={inputCls} value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} /></Labeled>
          </div>
          <Labeled label="Description (EN)"><textarea className={inputCls} rows={3} value={descEn} onChange={(e) => setDescEn(e.target.value)} /></Labeled>
          <Labeled label="Description (JP)"><textarea className={inputCls} rows={3} value={descJp} onChange={(e) => setDescJp(e.target.value)} /></Labeled>
          <Labeled label="Join notes (EN)"><textarea className={inputCls} rows={2} value={meetingNotesEn} onChange={(e) => setMeetingNotesEn(e.target.value)} /></Labeled>
          <Labeled label="Join notes (JP)"><textarea className={inputCls} rows={2} value={meetingNotesJp} onChange={(e) => setMeetingNotesJp(e.target.value)} /></Labeled>
          <button className={btnPrimary} disabled={busy} onClick={() => run(() => updateEvent(event!.id, detailsPayload()))}>
            Save details
          </button>
        </div>
      )}

      {tab === 'invitations' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border-default p-4 space-y-3 bg-bg-secondary">
            <Labeled label="Add invitees (comma, space, or newline separated)">
              <textarea className={inputCls} rows={3} value={emailsRaw} onChange={(e) => setEmailsRaw(e.target.value)} placeholder="alice@example.com, bob@example.com" />
            </Labeled>
            <div className="flex items-center gap-2">
              <select className={`${inputCls} w-auto`} value={inviteLocale} onChange={(e) => setInviteLocale(e.target.value as EventLocale)}>
                <option value="en">EN</option>
                <option value="ja">JA</option>
              </select>
              <button
                className={btnGhost}
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const emails = emailsRaw.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
                    const res = await addInvitations(event!.id, emails.map((email) => ({ email, locale: inviteLocale })));
                    setEmailsRaw('');
                    setMessage(`Added ${res.added} invitee(s).`);
                  })
                }
              >
                <Plus size={15} /> Add
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {!canInvite && (
              <p className="text-[12px] text-fg-tertiary">
                Publish the event before sending invites or reminders.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button className={btnPrimary} disabled={busy || !canInvite} onClick={() => handleSendBatch('invite')}>Send invites</button>
              <button className={btnGhost} disabled={busy || !canInvite} onClick={() => handleSendBatch('reminder')}>Send reminder</button>
              <button className={btnGhost} disabled={busy} onClick={() => run(() => sendTestEmail(event!.id, 'invite'), 'Test invite sent to you.')}>Test invite to me</button>
            </div>
          </div>

          <InvitationsTable
            invitations={detail!.invitations}
            busy={busy}
            onRemove={(id) => run(() => removeInvitation(id), 'Removed.')}
            onAttendance={(id, status) => run(() => markAttendance(id, status))}
          />
        </div>
      )}

      {tab === 'recap' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border-default p-4 bg-bg-secondary">
            <div>
              <p className="text-sm font-medium text-fg-primary">Recap visibility</p>
              <p className="text-[12px] text-fg-tertiary">
                {event!.recap_published ? 'Invitees can see the recap.' : 'Hidden until you publish it.'}
              </p>
            </div>
            <button
              className={event!.recap_published ? btnGhost : btnPrimary}
              disabled={busy}
              onClick={() => run(() => setRecapPublished(event!.id, !event!.recap_published), 'Updated.')}
            >
              {event!.recap_published ? 'Unpublish recap' : 'Publish recap'}
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Labeled label="Recording URL"><input className={inputCls} value={recordingUrl} onChange={(e) => setRecordingUrl(e.target.value)} /></Labeled>
            <Labeled label="Slide deck URL"><input className={inputCls} value={slideUrl} onChange={(e) => setSlideUrl(e.target.value)} /></Labeled>
            <Labeled label="Transcript URL"><input className={inputCls} value={transcriptUrl} onChange={(e) => setTranscriptUrl(e.target.value)} /></Labeled>
          </div>
          <Labeled label="Recap notes (EN)"><textarea className={inputCls} rows={3} value={recapNotesEn} onChange={(e) => setRecapNotesEn(e.target.value)} /></Labeled>
          <Labeled label="Recap notes (JP)"><textarea className={inputCls} rows={3} value={recapNotesJp} onChange={(e) => setRecapNotesJp(e.target.value)} /></Labeled>

          <ResourceEditor resources={resources} onChange={setResources} />

          <div className="flex flex-wrap gap-2">
            <button
              className={btnPrimary}
              disabled={busy}
              onClick={() =>
                run(() =>
                  upsertRecapAssets(event!.id, {
                    recording_url: recordingUrl || null,
                    slide_deck_url: slideUrl || null,
                    transcript_url: transcriptUrl || null,
                    recap_notes_en: recapNotesEn || null,
                    recap_notes_jp: recapNotesJp || null,
                    recap_resources: resources,
                  }),
                )
              }
            >
              Save recap
            </button>
            <button className={btnGhost} disabled={busy || !recapReady} onClick={() => handleSendBatch('recap')} title={recapReady ? undefined : 'Publish the recap first.'}>Send recap email</button>
            <button className={btnGhost} disabled={busy} onClick={() => run(() => sendTestEmail(event!.id, 'recap'), 'Test recap sent to you.')}>Test recap to me</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <a href="/admin/events" className="inline-flex items-center gap-1.5 text-[13px] text-fg-tertiary hover:text-fg-secondary">
      <ArrowLeft size={15} /> All events
    </a>
  );
}

function Banner({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary px-4 py-2.5 text-[13px] text-fg-secondary">
      {text}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

const ATTENDANCE: AttendanceStatus[] = ['unknown', 'attended', 'no_show'];

function InvitationsTable({
  invitations,
  busy,
  onRemove,
  onAttendance,
}: {
  invitations: AdminEventDetailData['invitations'];
  busy: boolean;
  onRemove: (id: string) => void;
  onAttendance: (id: string, status: AttendanceStatus) => void;
}) {
  if (invitations.length === 0) {
    return <p className="text-fg-tertiary text-sm">No invitees yet.</p>;
  }
  return (
    <div className="rounded-xl border border-border-default overflow-hidden bg-bg-secondary">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-fg-tertiary text-[12px] uppercase tracking-[0.04em]">
            <th className="px-3 py-2.5 font-semibold">Email</th>
            <th className="px-3 py-2.5 font-semibold">RSVP</th>
            <th className="px-3 py-2.5 font-semibold">Attendance</th>
            <th className="px-3 py-2.5 font-semibold">Last email</th>
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv) => (
            <tr key={inv.id} className="border-t border-border-default">
              <td className="px-3 py-2.5 text-fg-primary">
                {inv.email}
                <span className="ml-1 text-[11px] text-fg-tertiary uppercase">{inv.locale}</span>
              </td>
              <td className="px-3 py-2.5 text-fg-secondary">{inv.status}</td>
              <td className="px-3 py-2.5">
                <select
                  className="px-2 py-1 rounded-md bg-bg-tertiary border border-border-default text-fg-secondary text-[13px]"
                  value={inv.attendance_status}
                  disabled={busy}
                  onChange={(e) => onAttendance(inv.id, e.target.value as AttendanceStatus)}
                >
                  {ATTENDANCE.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </td>
              <td className="px-3 py-2.5 text-[12px] text-fg-tertiary">
                {inv.last_email_status
                  ? `${inv.last_email_status}${inv.last_email_error ? `: ${inv.last_email_error}` : ''}`
                  : '—'}
              </td>
              <td className="px-3 py-2.5 text-right">
                <button className="text-fg-tertiary hover:text-red-600 disabled:opacity-50" disabled={busy} onClick={() => onRemove(inv.id)} aria-label="Remove invitee">
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResourceEditor({
  resources,
  onChange,
}: {
  resources: RecapResource[];
  onChange: (r: RecapResource[]) => void;
}) {
  const update = (i: number, patch: Partial<RecapResource>) =>
    onChange(resources.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      <span className={labelCls}>Resource links</span>
      {resources.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className={inputCls} placeholder="Label" value={r.label} onChange={(e) => update(i, { label: e.target.value })} />
          <input className={inputCls} placeholder="https://…" value={r.url} onChange={(e) => update(i, { url: e.target.value })} />
          <button className="text-fg-tertiary hover:text-red-600 shrink-0" onClick={() => onChange(resources.filter((_, idx) => idx !== i))} aria-label="Remove resource">
            <X size={16} />
          </button>
        </div>
      ))}
      <button className={btnGhost} onClick={() => onChange([...resources, { label: '', url: '' }])}>
        <Plus size={15} /> Add resource
      </button>
    </div>
  );
}
