'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type {
  InstructorApplicationWithPartner,
  InstructorApplicationStatus,
} from '@/lib/instructor-applications/types';

type Props = {
  application: InstructorApplicationWithPartner;
};

const statusStyles: Record<InstructorApplicationStatus, string> = {
  pending: 'bg-accent-gold/15 text-accent-gold border-accent-gold/30',
  approved: 'bg-green-500/15 text-green-500 border-green-500/30',
  rejected: 'bg-red-500/15 text-red-500 border-red-500/30',
  withdrawn: 'bg-fg-tertiary/15 text-fg-tertiary border-fg-tertiary/30',
};

export function AdminInstructorApplicationDetail({ application }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState(application.review_notes ?? '');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Approve fields
  const [displayName, setDisplayName] = useState(application.applicant_full_name);
  const [titleEn, setTitleEn] = useState('');
  const [titleJp, setTitleJp] = useState('');
  const [bioEn, setBioEn] = useState(application.bio_short);
  const [bioJp, setBioJp] = useState('');

  // Reject fields
  const [rejectionReason, setRejectionReason] = useState('');

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/instructor-applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(payload.error ?? 'Request failed');
      }
      router.refresh();
      setMode('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    await patch({
      action: 'approve',
      displayName,
      titleEn: titleEn || null,
      titleJp: titleJp || null,
      bioShortEn: bioEn || null,
      bioShortJp: bioJp || null,
      reviewNotes: notes,
    });
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      setError('Please include a short reason — it goes in the applicant email');
      return;
    }
    await patch({ action: 'reject', rejectionReason, reviewNotes: notes });
  }

  async function handleSaveNotes() {
    setNotesSaving(true);
    setNotesSaved(false);
    try {
      await fetch(`/api/admin/instructor-applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_notes', reviewNotes: notes }),
      });
      setNotesSaved(true);
    } finally {
      setNotesSaving(false);
      setTimeout(() => setNotesSaved(false), 2000);
    }
  }

  const isPending = application.status === 'pending';
  const expertise = Array.isArray(application.expertise_areas)
    ? (application.expertise_areas as string[])
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-serif text-fg-primary">
              {application.applicant_full_name}
            </h1>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-medium ${statusStyles[application.status]}`}
            >
              {application.status}
            </span>
            {application.partner_name && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-teal/10 text-accent-teal uppercase tracking-wider font-medium">
                via {application.partner_name}
              </span>
            )}
          </div>
          <p className="text-sm text-fg-tertiary">
            {application.applicant_email} · locale: {application.applicant_locale} · submitted{' '}
            {new Date(application.submitted_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Application details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Proposed topic" value={application.proposed_topic ?? '—'} />
        <Field
          label="Expertise"
          value={expertise.length > 0 ? expertise.join(', ') : '—'}
        />
        <Field
          label="Sample material"
          value={
            application.sample_material_url ? (
              <a
                href={application.sample_material_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-teal hover:underline break-all"
              >
                {application.sample_material_url}
              </a>
            ) : (
              '—'
            )
          }
        />
        <Field
          label="LinkedIn"
          value={
            application.linkedin_url ? (
              <a
                href={application.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-teal hover:underline break-all"
              >
                {application.linkedin_url}
              </a>
            ) : (
              '—'
            )
          }
        />
        <Field
          label="Website"
          value={
            application.website_url ? (
              <a
                href={application.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-teal hover:underline break-all"
              >
                {application.website_url}
              </a>
            ) : (
              '—'
            )
          }
        />
      </div>

      <Field label="Bio" value={<span className="whitespace-pre-wrap">{application.bio_short}</span>} />

      {application.why_honuvibe && (
        <Field
          label="Why HonuVibe"
          value={<span className="whitespace-pre-wrap">{application.why_honuvibe}</span>}
        />
      )}

      {/* Review notes */}
      <div className="border-t border-border-default pt-5">
        <label className="text-xs text-fg-tertiary block mb-1 uppercase tracking-wider">
          Admin notes (internal — never sent to applicant)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary resize-y focus:outline-none focus:border-accent-teal"
          placeholder="Internal notes..."
        />
        <div className="mt-2 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveNotes}
            disabled={notesSaving}
          >
            {notesSaving ? 'Saving…' : 'Save notes'}
          </Button>
          {notesSaved && <span className="text-xs text-green-500">Saved ✓</span>}
        </div>
      </div>

      {/* Actions */}
      {isPending && (
        <div className="border-t border-border-default pt-5 space-y-4">
          {mode === 'idle' && (
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => setMode('approve')}>
                Approve & create instructor
              </Button>
              <Button variant="ghost" onClick={() => setMode('reject')}>
                Reject
              </Button>
            </div>
          )}

          {mode === 'approve' && (
            <div className="space-y-4 rounded-lg border border-border-default p-4 bg-bg-secondary">
              <div>
                <h3 className="text-lg font-serif text-fg-primary">Approve applicant</h3>
                <p className="text-sm text-fg-tertiary">
                  Creates the instructor profile and sends the welcome email. You can edit bios
                  later from the instructors page.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextField label="Display name *" value={displayName} onChange={setDisplayName} />
                <TextField label="Title (EN)" value={titleEn} onChange={setTitleEn} />
                <TextField label="Title (JP)" value={titleJp} onChange={setTitleJp} />
              </div>

              <TextArea label="Short bio (EN)" value={bioEn} onChange={setBioEn} />
              <TextArea label="Short bio (JP)" value={bioJp} onChange={setBioJp} />

              <div className="flex gap-2">
                <Button variant="primary" onClick={handleApprove} disabled={busy}>
                  {busy ? 'Approving…' : 'Confirm approve'}
                </Button>
                <Button variant="ghost" onClick={() => setMode('idle')} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {mode === 'reject' && (
            <div className="space-y-4 rounded-lg border border-border-default p-4 bg-bg-secondary">
              <div>
                <h3 className="text-lg font-serif text-fg-primary">Reject applicant</h3>
                <p className="text-sm text-fg-tertiary">
                  The reason below is sent to the applicant. Keep it short and kind.
                </p>
              </div>

              <TextArea
                label="Reason (sent to applicant) *"
                value={rejectionReason}
                onChange={setRejectionReason}
              />

              <div className="flex gap-2">
                <Button variant="primary" onClick={handleReject} disabled={busy}>
                  {busy ? 'Rejecting…' : 'Confirm reject'}
                </Button>
                <Button variant="ghost" onClick={() => setMode('idle')} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}

      {!isPending && application.reviewed_at && (
        <div className="border-t border-border-default pt-5 space-y-1 text-sm text-fg-tertiary">
          <p>
            {application.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
            {new Date(application.reviewed_at).toLocaleString()}
          </p>
          {application.rejection_reason && (
            <p>
              <span className="text-fg-tertiary">Reason sent: </span>
              <span className="text-fg-secondary">{application.rejection_reason}</span>
            </p>
          )}
          {application.created_instructor_profile_id && (
            <p>
              <a
                href={`/admin/instructors/${application.created_instructor_profile_id}`}
                className="text-accent-teal hover:underline"
              >
                View instructor profile →
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-fg-tertiary block uppercase tracking-wider mb-0.5">
        {label}
      </span>
      <span className="text-sm text-fg-secondary">{value}</span>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-fg-tertiary block mb-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-fg-tertiary block mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary resize-y focus:outline-none focus:border-accent-teal"
      />
    </label>
  );
}
