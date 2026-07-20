'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';
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

export function StudioLeadRow({ lead }: { lead: StudioLead }) {
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
  });

  function toggle() {
    setExpanded((v) => !v);
  }

  return (
    <>
      <tr
        onClick={toggle}
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        className="cursor-pointer hover:bg-bg-tertiary transition-colors duration-[var(--duration-fast)]"
      >
        <td className="px-4 py-3.5 text-[13.5px]">
          <span className="text-fg-primary font-semibold">{displayName}</span>
        </td>
        <td className="px-4 py-3.5">
          <StatusBadge status={lead.status} />
        </td>
        <td className="px-4 py-3.5 text-[13.5px] text-fg-secondary">
          {lead.company || '—'}
        </td>
        <td className="px-4 py-3.5 text-[13.5px] text-fg-secondary">
          {lead.email || '—'}
        </td>
        <td className="px-4 py-3.5 text-[13.5px] text-fg-secondary whitespace-nowrap">
          {SOURCE_LABELS[lead.source] ?? lead.source}
        </td>
        <td className="px-4 py-3.5 text-[13.5px] text-fg-secondary whitespace-nowrap">
          {formattedDate}
        </td>
        <td className="px-4 py-3.5 text-fg-tertiary">
          <ChevronDown
            size={16}
            className={cn('transition-transform', expanded && 'rotate-180')}
          />
        </td>
      </tr>

      {expanded && (
        <tr className="bg-bg-tertiary">
          <td colSpan={7} className="px-4 py-4">
            <div className="space-y-4">
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
                  <span className="text-xs text-fg-tertiary block mb-1">Admin Notes</span>
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
          </td>
        </tr>
      )}
    </>
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
