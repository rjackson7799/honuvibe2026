'use client';

// One engagements-list row — copies StudioLeadRow's expand-on-click pattern.

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';
import { daysSince, formatMinorUnits, formatRelativeDays, formatShortDate } from '@/lib/studio/engagement/format';
import type { EngagementListItem } from '@/lib/admin/types';

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  ai_native: 'AI-native',
};

/**
 * The Discovery column — six states from the view's discovery_* columns, no
 * extra queries: — / Draft / Sent · 3d ago / 12 of 24 / Submitted ✓ / Brief ready.
 */
export function discoveryLabel(e: EngagementListItem): string {
  if (!e.discovery_id || !e.discovery_status) return '—';
  const linkDead =
    !!e.discovery_token_revoked_at ||
    (!!e.discovery_token_expires_at && new Date(e.discovery_token_expires_at).getTime() <= Date.now());
  switch (e.discovery_status) {
    case 'draft':
      return 'Draft';
    case 'ready':
      return 'Ready to send';
    case 'sent':
      return `Sent · ${formatRelativeDays(e.discovery_sent_at)}${linkDead ? ' · link dead' : ''}`;
    case 'in_progress':
      return `${e.discovery_answered_count} of ${e.discovery_question_count}${linkDead ? ' · link dead' : ''}`;
    case 'submitted':
      if (e.latest_brief_status === 'completed' || e.latest_brief_status === 'partial') return 'Brief ready';
      if (e.latest_brief_status === 'generating') return 'Submitted ✓ · brief…';
      return 'Submitted ✓';
    default:
      return '—';
  }
}

/**
 * The Proposal column — from the view's proposal_* columns (latest version),
 * no extra queries: — / Draft v1 / Ready / Sent · 3d ago / Sent · viewed 2× /
 * Accepted ✓ $875.00 / Voided / Withdrawn / Superseded.
 */
export function proposalLabel(e: EngagementListItem): string {
  if (!e.proposal_id || !e.proposal_status) return '—';
  const v = e.proposal_version ?? 1;
  switch (e.proposal_status) {
    case 'draft':
      return `Draft v${v}`;
    case 'ready':
      return v > 1 ? `Ready v${v}` : 'Ready';
    case 'sent': {
      const opens = e.proposal_open_count ?? 0;
      return opens > 0 ? `Sent · viewed ${opens}×` : `Sent · ${formatRelativeDays(e.proposal_sent_at)}`;
    }
    case 'accepted':
      return e.proposal_total_build !== null && e.proposal_currency
        ? `Accepted ✓ ${formatMinorUnits(e.proposal_total_build, e.proposal_currency)}`
        : 'Accepted ✓';
    case 'voided':
      return 'Voided';
    case 'withdrawn':
      return 'Withdrawn';
    case 'superseded':
      return 'Superseded';
    default:
      return '—';
  }
}

export function EngagementRow({ engagement }: { engagement: EngagementListItem }) {
  const [expanded, setExpanded] = useState(false);

  const days = daysSince(engagement.stage_entered_at);
  const contact = [engagement.client_contact_name, engagement.client_contact_email]
    .filter(Boolean)
    .join(' · ');

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
          <span className="inline-flex items-center gap-2">
            <span className="text-fg-primary font-semibold">{engagement.title}</span>
            {engagement.open_attention_count > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--accent-coral)]"
                title={`${engagement.open_attention_count} item${engagement.open_attention_count > 1 ? 's' : ''} need attention`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent-coral)]" aria-hidden />
                {engagement.open_attention_count}
              </span>
            )}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <StatusBadge status={engagement.stage} />
            <span className="text-[12px] text-fg-tertiary">{days}d</span>
          </span>
        </td>
        <td className="px-4 py-3.5 text-[13.5px] text-fg-secondary whitespace-nowrap">
          {discoveryLabel(engagement)}
        </td>
        <td className="px-4 py-3.5 text-[13.5px] text-fg-secondary whitespace-nowrap">
          {proposalLabel(engagement)}
        </td>
        <td className="px-4 py-3.5 text-[13.5px] text-fg-secondary whitespace-nowrap">
          {formatRelativeDays(engagement.last_activity_at ?? engagement.created_at)}
        </td>
        <td className="px-4 py-3.5 text-[13.5px] text-fg-secondary whitespace-nowrap">
          {formatShortDate(engagement.created_at)}
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
                <Field label="Client contact" value={contact || '—'} />
                <Field label="Language" value={engagement.locale === 'ja' ? 'Japanese' : 'English'} />
                <Field label="Tier" value={engagement.tier ? TIER_LABELS[engagement.tier] ?? engagement.tier : '—'} />
                <Field label="In stage since" value={`${formatShortDate(engagement.stage_entered_at)} (${days}d)`} />
                {engagement.next_action && (
                  <Field
                    label="Next action"
                    value={
                      engagement.next_action_due_at
                        ? `${engagement.next_action} · due ${formatShortDate(engagement.next_action_due_at)}`
                        : engagement.next_action
                    }
                  />
                )}
                {engagement.won_at && <Field label="Won" value={formatShortDate(engagement.won_at)} />}
                {engagement.ended_at && <Field label="Ended" value={formatShortDate(engagement.ended_at)} />}
              </div>

              <div className="flex items-center gap-4 pt-1 flex-wrap">
                <Link
                  href={`/admin/studio/engagements/${engagement.id}`}
                  className="inline-flex items-center min-h-[44px] text-xs font-semibold text-accent-teal hover:underline"
                >
                  Open engagement →
                </Link>
                <Link
                  href={`/admin/studio/leads/${engagement.lead_id}`}
                  className="inline-flex items-center min-h-[44px] text-xs font-medium text-fg-tertiary hover:text-accent-teal hover:underline"
                >
                  Lead workspace →
                </Link>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
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
