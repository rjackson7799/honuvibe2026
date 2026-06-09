'use client';

import { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import {
  labelizeIndustry,
  labelizeProjectType,
  labelizeBudget,
  labelizeTimeline,
} from '@/lib/studio/labels';
import type { StudioLead } from '@/lib/admin/types';

export function StudioLeadCard({ lead }: { lead: StudioLead }) {
  const [expanded, setExpanded] = useState(false);

  const industry = labelizeIndustry(lead.industry);
  const projectType = labelizeProjectType(lead.project_type);
  const budget = labelizeBudget(lead.budget_range);
  const timeline = labelizeTimeline(lead.timeline);

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
              {lead.full_name}
            </span>
            <StatusBadge status={lead.status} />
          </div>
          <div className="text-xs text-fg-tertiary">
            {lead.company}
            {' · '}
            {lead.email}
            {' · '}
            {new Date(lead.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
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
            <Field label="Source Locale" value={lead.source_locale} />
          </div>

          <div>
            <span className="text-xs text-fg-tertiary block mb-1">Project</span>
            <p className="text-sm text-fg-secondary whitespace-pre-wrap">
              {lead.message}
            </p>
          </div>

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

          <div className="pt-1">
            <a
              href={`mailto:${lead.email}`}
              className="text-xs font-medium text-accent-teal hover:underline"
            >
              Reply to {lead.full_name} →
            </a>
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
