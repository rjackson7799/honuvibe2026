'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Props = {
  courseId: string;
  status: 'proposal' | 'rejected';
  reviewNotes: string | null;
  proposedByDisplayName: string | null;
  submittedAt: string | null;
};

export function AdminProposalActions({
  courseId,
  status,
  reviewNotes,
  proposedByDisplayName,
  submittedAt,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'reject'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState(reviewNotes ?? '');

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/proposal`, {
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
    await patch({ action: 'approve' });
  }

  async function handleReject() {
    if (!reason.trim()) {
      setError('Reason is required — it is shown to the instructor.');
      return;
    }
    await patch({ action: 'reject', reviewNotes: reason });
  }

  const banner =
    status === 'proposal'
      ? {
          tone: 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold',
          label: 'Proposal awaiting review',
        }
      : {
          tone: 'bg-red-500/10 border-red-500/30 text-red-400',
          label: 'Proposal rejected',
        };

  return (
    <div className={`rounded-lg border p-4 space-y-4 ${banner.tone}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold">{banner.label}</p>
          <p className="mt-1 text-xs opacity-80">
            {proposedByDisplayName ? `Proposed by ${proposedByDisplayName}` : 'Proposed'}
            {submittedAt
              ? ` · ${new Date(submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : ''}
          </p>
        </div>

        {status === 'proposal' && mode === 'idle' && (
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleApprove} disabled={busy}>
              {busy ? 'Approving…' : 'Approve → Draft'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode('reject')} disabled={busy}>
              Reject
            </Button>
          </div>
        )}
      </div>

      {status === 'proposal' && mode === 'reject' && (
        <div className="space-y-3 rounded-lg border border-border-default bg-bg-secondary p-3">
          <div>
            <h3 className="text-sm font-medium text-fg-primary">Reject this proposal</h3>
            <p className="text-xs text-fg-tertiary">
              The reason is stored on the course and shown to the instructor in their portal.
            </p>
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Topic overlaps with an existing course; please differentiate the angle."
            className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-y"
          />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleReject} disabled={busy}>
              {busy ? 'Rejecting…' : 'Confirm reject'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode('idle')} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {status === 'rejected' && reviewNotes && (
        <div className="rounded-lg border border-border-default bg-bg-secondary p-3 text-sm text-fg-secondary">
          <p className="text-xs uppercase tracking-wider text-fg-tertiary mb-1">
            Reason sent to instructor
          </p>
          {reviewNotes}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
