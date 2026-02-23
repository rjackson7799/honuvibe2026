'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { updateApplicationStatus } from '@/lib/admin/actions';
import type { Application, ApplicationStatus } from '@/lib/admin/types';

type ApplicationCardProps = {
  application: Application;
};

const statusOptions: ApplicationStatus[] = ['received', 'reviewing', 'responded', 'archived'];

export function ApplicationCard({ application }: ApplicationCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(application.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function handleStatusChange(newStatus: ApplicationStatus) {
    setSaving(true);
    try {
      await updateApplicationStatus(application.id, newStatus, notes || undefined);
      router.refresh();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      {/* Summary row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-bg-tertiary transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-fg-primary">{application.name}</span>
            <StatusBadge status={application.status} />
          </div>
          <div className="text-xs text-fg-tertiary">
            {application.email}
            {application.company && ` · ${application.company}`}
            {' · '}
            {new Date(application.submitted_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </div>
        <span className="text-fg-tertiary text-sm ml-2">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Detail */}
      {expanded && (
        <div className="border-t border-border-default p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {application.engagement_type && (
              <Field label="Engagement Type" value={application.engagement_type} />
            )}
            {application.timeline && (
              <Field label="Timeline" value={application.timeline} />
            )}
            {application.budget_range && (
              <Field label="Budget Range" value={application.budget_range} />
            )}
            {application.referral_source && (
              <Field label="Referral Source" value={application.referral_source} />
            )}
            {application.website && (
              <Field
                label="Website"
                value={
                  <a
                    href={application.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-teal hover:underline"
                  >
                    {application.website}
                  </a>
                }
              />
            )}
            <Field label="Locale" value={application.locale} />
          </div>

          {application.project_description && (
            <div>
              <span className="text-xs text-fg-tertiary block mb-1">Project Description</span>
              <p className="text-sm text-fg-secondary">{application.project_description}</p>
            </div>
          )}

          {application.desired_outcome && (
            <div>
              <span className="text-xs text-fg-tertiary block mb-1">Desired Outcome</span>
              <p className="text-sm text-fg-secondary">{application.desired_outcome}</p>
            </div>
          )}

          {/* Admin notes */}
          <div>
            <label className="text-xs text-fg-tertiary block mb-1">Admin Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary resize-y focus:outline-none focus:border-accent-teal"
              placeholder="Internal notes..."
            />
          </div>

          {/* Status actions */}
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <Button
                key={status}
                variant={application.status === status ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleStatusChange(status)}
                disabled={saving || application.status === status}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-fg-tertiary block">{label}</span>
      <span className="text-fg-secondary">{value}</span>
    </div>
  );
}
