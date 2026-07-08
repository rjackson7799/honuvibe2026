'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import {
  labelizeIndustry,
  labelizeProjectType,
  labelizeBudget,
  labelizeTimeline,
} from '@/lib/studio/labels';
import type { StudioLead } from '@/lib/admin/types';

// Human labels for the lead `source` vocabulary (leads.source, no CHECK
// constraint). studio_form_migrated is the 047 backfill value that lives in prod.
const SOURCE_LABELS: Record<string, string> = {
  studio_form: 'Studio form',
  studio_form_migrated: 'Studio form (migrated)',
  discover: 'Discovery',
  manual: 'Manual',
  prospecting: 'Prospecting',
};

// Sources that carry a meaningful visitor locale. Manual/prospected leads are
// originated in the (EN-only) admin, so their `source_locale` default is not a
// signal worth showing.
const LOCALE_BEARING_SOURCES = new Set(['studio_form', 'studio_form_migrated', 'discover']);

export function StudioLeadCard({ lead }: { lead: StudioLead }) {
  const [expanded, setExpanded] = useState(false);

  const industry = labelizeIndustry(lead.industry);
  const projectType = labelizeProjectType(lead.project_type);
  const budget = labelizeBudget(lead.budget_range);
  const timeline = labelizeTimeline(lead.timeline);

  // full_name may be null on a manually-created lead — fall back to the company.
  const displayName = lead.full_name || lead.company;
  const formattedDate = new Date(lead.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  // Only repeat the company in the meta row when the header shows a distinct name.
  const metaParts = [
    lead.full_name ? lead.company : null,
    lead.email,
    formattedDate,
  ].filter(Boolean) as string[];

  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-bg-tertiary transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-fg-primary">
              {displayName}
            </span>
            <StatusBadge status={lead.status} />
          </div>
          <div className="text-xs text-fg-tertiary">{metaParts.join(' · ')}</div>
        </div>
        <span className="text-fg-tertiary text-sm ml-2">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border-default p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {industry && <Field label="Industry" value={industry} />}
            {projectType && <Field label="Project Type" value={projectType} />}
            {budget && <Field label="Budget" value={budget} />}
            {timeline && <Field label="Timeline" value={timeline} />}
            {lead.referral_source && (
              <Field label="Referral" value={lead.referral_source} />
            )}
            <Field label="Source" value={SOURCE_LABELS[lead.source] ?? lead.source} />
            {LOCALE_BEARING_SOURCES.has(lead.source) && (
              <Field label="Source Locale" value={lead.source_locale} />
            )}
          </div>

          {lead.message && (
            <div>
              <span className="text-xs text-fg-tertiary block mb-1">Project</span>
              <p className="text-sm text-fg-secondary whitespace-pre-wrap">
                {lead.message}
              </p>
            </div>
          )}

          {lead.notes && (
            <div>
              <span className="text-xs text-fg-tertiary block mb-1">
                Admin Notes
              </span>
              <p className="text-sm text-fg-secondary whitespace-pre-wrap">
                {lead.notes}
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 pt-1">
            <Link
              href={`/admin/studio/leads/${lead.id}`}
              className="text-xs font-semibold text-accent-teal hover:underline"
            >
              Open workspace →
            </Link>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="text-xs font-medium text-fg-tertiary hover:text-accent-teal hover:underline"
              >
                Reply to {displayName}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-xs text-fg-tertiary block">{label}</span>
      <span className="text-fg-secondary">{value}</span>
    </div>
  );
}
