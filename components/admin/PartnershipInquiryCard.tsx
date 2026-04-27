'use client';

import { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import {
  labelizeAudienceSize,
  labelizeLanguage,
  labelizeOrgType,
  labelizeReferralSource,
  labelizeTimeline,
  type AudienceSize,
  type LanguagePreference,
  type OrgType,
  type PartnershipTimeline,
  type ReferralSource,
} from '@/lib/partnerships/labels';
import type { PartnershipInquiry } from '@/lib/admin/types';

type Props = {
  inquiry: PartnershipInquiry;
};

export function PartnershipInquiryCard({ inquiry }: Props) {
  const [expanded, setExpanded] = useState(false);

  const orgTypeLabel = labelizeOrgType(inquiry.org_type as OrgType, 'en');
  const audienceLabel = labelizeAudienceSize(
    inquiry.audience_size as AudienceSize | null,
    'en',
  );
  const languageLabel = labelizeLanguage(
    inquiry.language as LanguagePreference | null,
    'en',
  );
  const timelineLabel = labelizeTimeline(
    inquiry.timeline as PartnershipTimeline | null,
    'en',
  );
  const referralLabel = labelizeReferralSource(
    inquiry.referral_source as ReferralSource | null,
    'en',
  );

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
              {inquiry.full_name}
            </span>
            <StatusBadge status={inquiry.status} />
          </div>
          <div className="text-xs text-fg-tertiary">
            {inquiry.organization}
            {' · '}
            {inquiry.email}
            {' · '}
            {new Date(inquiry.created_at).toLocaleDateString('en-US', {
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
            <Field label="Org Type" value={orgTypeLabel} />
            {audienceLabel && (
              <Field label="Audience Size" value={audienceLabel} />
            )}
            {languageLabel && (
              <Field label="Language" value={languageLabel} />
            )}
            {timelineLabel && (
              <Field label="Timeline" value={timelineLabel} />
            )}
            {referralLabel && (
              <Field label="Referral" value={referralLabel} />
            )}
            {inquiry.website && (
              <Field
                label="Website"
                value={
                  <a
                    href={inquiry.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-teal hover:underline"
                  >
                    {inquiry.website}
                  </a>
                }
              />
            )}
            <Field label="Source Locale" value={inquiry.source_locale} />
          </div>

          <div>
            <span className="text-xs text-fg-tertiary block mb-1">Community</span>
            <p className="text-sm text-fg-secondary whitespace-pre-wrap">
              {inquiry.community_description}
            </p>
          </div>

          <div>
            <span className="text-xs text-fg-tertiary block mb-1">Program</span>
            <p className="text-sm text-fg-secondary whitespace-pre-wrap">
              {inquiry.program_description}
            </p>
          </div>

          {inquiry.notes && (
            <div>
              <span className="text-xs text-fg-tertiary block mb-1">
                Admin Notes
              </span>
              <p className="text-sm text-fg-secondary whitespace-pre-wrap">
                {inquiry.notes}
              </p>
            </div>
          )}
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
