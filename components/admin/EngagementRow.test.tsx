import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngagementListItem } from '@/lib/admin/types';
import { discoveryLabel, proposalLabel } from './EngagementRow';

// The Discovery column's six states, derived ONLY from the engagement_list
// view's discovery_* columns (no extra queries): — / Draft / Sent · 3d ago /
// 12 of 24 / Submitted ✓ / Brief ready.

const NOW = Date.parse('2026-09-04T12:00:00Z');

function item(overrides: Partial<EngagementListItem> = {}): EngagementListItem {
  return {
    id: 'e1',
    lead_id: 'l1',
    title: 'Kailua Beach Massage',
    locale: 'en',
    stage: 'discovery',
    stage_entered_at: '2026-09-01T00:00:00Z',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    tier: null,
    client_contact_name: null,
    client_contact_email: null,
    next_action: null,
    next_action_due_at: null,
    won_at: null,
    ended_at: null,
    discovery_id: null,
    discovery_status: null,
    discovery_sent_at: null,
    discovery_submitted_at: null,
    discovery_token_expires_at: null,
    discovery_token_revoked_at: null,
    discovery_question_count: 0,
    discovery_answered_count: 0,
    latest_brief_status: null,
    last_activity_at: null,
    open_attention_count: 0,
    proposal_id: null,
    proposal_version: null,
    proposal_status: null,
    proposal_sent_at: null,
    proposal_accepted_at: null,
    proposal_total_build: null,
    proposal_currency: null,
    proposal_open_count: null,
    proposal_first_opened_at: null,
    ...overrides,
  };
}

describe('discoveryLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('— when no questionnaire exists', () => {
    expect(discoveryLabel(item())).toBe('—');
  });

  it('Draft / Ready to send before the link goes out', () => {
    expect(discoveryLabel(item({ discovery_id: 'q', discovery_status: 'draft' }))).toBe('Draft');
    expect(discoveryLabel(item({ discovery_id: 'q', discovery_status: 'ready' }))).toBe('Ready to send');
  });

  it('Sent · 3d ago from the view, with a dead-link marker when revoked or expired', () => {
    const sent = item({
      discovery_id: 'q',
      discovery_status: 'sent',
      discovery_sent_at: '2026-09-01T09:00:00Z',
      discovery_token_expires_at: '2026-10-16T09:00:00Z',
    });
    expect(discoveryLabel(sent)).toBe('Sent · 3d ago');
    expect(discoveryLabel({ ...sent, discovery_token_revoked_at: '2026-09-02T00:00:00Z' })).toBe('Sent · 3d ago · link dead');
    expect(discoveryLabel({ ...sent, discovery_token_expires_at: '2026-09-03T00:00:00Z' })).toBe('Sent · 3d ago · link dead');
  });

  it('12 of 24 while in progress', () => {
    expect(
      discoveryLabel(
        item({
          discovery_id: 'q',
          discovery_status: 'in_progress',
          discovery_question_count: 24,
          discovery_answered_count: 12,
          discovery_token_expires_at: '2026-10-16T09:00:00Z',
        }),
      ),
    ).toBe('12 of 24');
  });

  it('Submitted ✓ → brief… → Brief ready off latest_brief_status', () => {
    const submitted = item({ discovery_id: 'q', discovery_status: 'submitted', discovery_submitted_at: '2026-09-04T10:00:00Z' });
    expect(discoveryLabel(submitted)).toBe('Submitted ✓');
    expect(discoveryLabel({ ...submitted, latest_brief_status: 'generating' })).toBe('Submitted ✓ · brief…');
    expect(discoveryLabel({ ...submitted, latest_brief_status: 'completed' })).toBe('Brief ready');
    expect(discoveryLabel({ ...submitted, latest_brief_status: 'partial' })).toBe('Brief ready');
    expect(discoveryLabel({ ...submitted, latest_brief_status: 'failed' })).toBe('Submitted ✓');
  });
});

describe('proposalLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const p = (overrides: Partial<EngagementListItem>) =>
    item({ proposal_id: 'p', proposal_version: 1, proposal_currency: 'USD', proposal_total_build: 87500, proposal_open_count: 0, ...overrides });

  it('— when no proposal exists', () => {
    expect(proposalLabel(item())).toBe('—');
  });

  it('Draft v1 / Ready before issue', () => {
    expect(proposalLabel(p({ proposal_status: 'draft' }))).toBe('Draft v1');
    expect(proposalLabel(p({ proposal_status: 'draft', proposal_version: 2 }))).toBe('Draft v2');
    expect(proposalLabel(p({ proposal_status: 'ready' }))).toBe('Ready');
    expect(proposalLabel(p({ proposal_status: 'ready', proposal_version: 3 }))).toBe('Ready v3');
  });

  it('Sent · 3d ago until the client opens it, then Sent · viewed 2×', () => {
    const sent = p({ proposal_status: 'sent', proposal_sent_at: '2026-09-01T09:00:00Z' });
    expect(proposalLabel(sent)).toBe('Sent · 3d ago');
    expect(proposalLabel({ ...sent, proposal_open_count: 2, proposal_first_opened_at: '2026-09-02T00:00:00Z' })).toBe('Sent · viewed 2×');
  });

  it('Accepted ✓ with the contract value in the offer currency; JPY has no decimals', () => {
    expect(proposalLabel(p({ proposal_status: 'accepted', proposal_accepted_at: '2026-09-04T10:00:00Z' }))).toBe('Accepted ✓ $875.00');
    expect(proposalLabel(p({ proposal_status: 'accepted', proposal_currency: 'JPY', proposal_total_build: 132000 }))).toBe('Accepted ✓ ¥132,000');
  });

  it('Voided / Withdrawn / Superseded', () => {
    expect(proposalLabel(p({ proposal_status: 'voided' }))).toBe('Voided');
    expect(proposalLabel(p({ proposal_status: 'withdrawn' }))).toBe('Withdrawn');
    expect(proposalLabel(p({ proposal_status: 'superseded' }))).toBe('Superseded');
  });
});
