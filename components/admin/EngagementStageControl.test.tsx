import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EngagementStageControl } from './EngagementStageControl';
import type { Engagement } from '@/lib/admin/types';

// The SOFT launch gate (075): leaving `build` with undelivered build-phase
// deliverables warns and asks for one extra confirm. It must never block —
// cancel simply leaves the stage alone, and OK proceeds unchanged.

// vi.mock is hoisted above every const, so the spies must be too.
const { setEngagementStage, refresh } = vi.hoisted(() => ({
  setEngagementStage: vi.fn(async () => {}),
  refresh: vi.fn(),
}));
vi.mock('@/lib/studio/engagement/engagement-actions', () => ({ setEngagementStage }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

function engagement(overrides: Partial<Engagement> = {}): Engagement {
  return {
    id: 'e1',
    lead_id: 'l1',
    title: 'Smoke Client',
    locale: 'en',
    stage: 'build',
    stage_entered_at: '2026-09-01T00:00:00Z',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    tier: 'starter',
    currency: 'USD',
    contract_value: 87500,
    care_mrr: 6500,
    client_contact_name: 'Kai',
    client_contact_email: 'kai@example.com',
    next_action: null,
    next_action_due_at: null,
    won_at: '2026-09-02T00:00:00Z',
    ended_at: null,
    lost_reason: null,
    ...overrides,
  } as Engagement;
}

const THREE = {
  count: 3,
  titles: ['Homepage redesign', 'Booking flow', 'Analytics setup'],
};

let confirmSpy: MockInstance<(message?: string) => boolean>;

beforeEach(() => {
  setEngagementStage.mockClear();
  refresh.mockClear();
  confirmSpy = vi.spyOn(window, 'confirm');
});

afterEach(() => {
  vi.restoreAllMocks();
});

const clickStage = (label: string) => fireEvent.click(screen.getByRole('button', { name: label }));

describe('EngagementStageControl — the soft launch gate', () => {
  it('warns with the open titles when leaving Build for Launch', () => {
    confirmSpy.mockReturnValue(true);
    render(<EngagementStageControl engagement={engagement()} openBuildDeliverables={THREE} />);
    clickStage('Launch');

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    const message = confirmSpy.mock.calls[0][0] as string;
    expect(message).toContain('3 build deliverables are not delivered yet');
    expect(message).toContain('Homepage redesign, Booking flow, Analytics setup');
    expect(message).toContain('Move to Launch anyway?');
  });

  it('cancel leaves the stage alone — the gate never blocks, but it never acts either', () => {
    confirmSpy.mockReturnValue(false);
    render(<EngagementStageControl engagement={engagement()} openBuildDeliverables={THREE} />);
    clickStage('Launch');
    expect(setEngagementStage).not.toHaveBeenCalled();
  });

  it('OK proceeds to the requested stage', () => {
    confirmSpy.mockReturnValue(true);
    render(<EngagementStageControl engagement={engagement()} openBuildDeliverables={THREE} />);
    clickStage('Launch');
    expect(setEngagementStage).toHaveBeenCalledWith('e1', 'launch', undefined);
  });

  // Separate renders: the first click starts a transition, and `pending`
  // makes the component ignore a second click in the same instance.
  it('warns on Care too — skipping Launch is the same mistake in a different button', () => {
    confirmSpy.mockReturnValue(true);
    render(<EngagementStageControl engagement={engagement()} openBuildDeliverables={THREE} />);
    clickStage('Care');
    expect(confirmSpy.mock.calls[0][0]).toContain('Move to Care anyway?');
    expect(setEngagementStage).toHaveBeenCalledWith('e1', 'care', undefined);
  });

  it('warns on Close too, before the existing close confirm', () => {
    confirmSpy.mockReturnValue(true);
    render(<EngagementStageControl engagement={engagement()} openBuildDeliverables={THREE} />);
    clickStage('Close engagement');
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(confirmSpy.mock.calls[0][0]).toContain('Move to Closed anyway?');
    expect(confirmSpy.mock.calls[1][0]).toContain('Close this engagement?');
    expect(setEngagementStage).toHaveBeenCalledWith('e1', 'closed', undefined);
  });

  it('cancelling the Close gate never reaches the close confirm', () => {
    confirmSpy.mockReturnValue(false);
    render(<EngagementStageControl engagement={engagement()} openBuildDeliverables={THREE} />);
    clickStage('Close engagement');
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(setEngagementStage).not.toHaveBeenCalled();
  });

  it('a single open item is phrased in the singular', () => {
    confirmSpy.mockReturnValue(true);
    render(
      <EngagementStageControl engagement={engagement()} openBuildDeliverables={{ count: 1, titles: ['Booking flow'] }} />,
    );
    clickStage('Launch');
    expect(confirmSpy.mock.calls[0][0]).toContain('1 build deliverable is not delivered yet: Booking flow');
  });

  it('truncates to five titles with an ellipsis', () => {
    confirmSpy.mockReturnValue(true);
    const titles = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'];
    render(<EngagementStageControl engagement={engagement()} openBuildDeliverables={{ count: 7, titles }} />);
    clickStage('Launch');
    const message = confirmSpy.mock.calls[0][0] as string;
    expect(message).toContain('One, Two, Three, Four, Five, …');
    expect(message).not.toContain('Six');
  });

  it('does not warn when nothing is open, when the prop is absent, or from another stage', () => {
    confirmSpy.mockReturnValue(true);

    const { unmount } = render(
      <EngagementStageControl engagement={engagement()} openBuildDeliverables={{ count: 0, titles: [] }} />,
    );
    clickStage('Launch');
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(setEngagementStage).toHaveBeenCalledWith('e1', 'launch', undefined);
    unmount();

    const noProp = render(<EngagementStageControl engagement={engagement()} />);
    clickStage('Launch');
    expect(confirmSpy).not.toHaveBeenCalled();
    noProp.unmount();

    // From `launch` the build gate is irrelevant, even with open build items.
    render(<EngagementStageControl engagement={engagement({ stage: 'launch' })} openBuildDeliverables={THREE} />);
    clickStage('Care');
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('still gates when moving Build → Launch on an engagement with open items, after a reopen confirm', () => {
    // A terminal engagement reopening into Build asks its own confirm and the
    // build gate does not apply (current stage is not `build`).
    confirmSpy.mockReturnValue(true);
    render(<EngagementStageControl engagement={engagement({ stage: 'closed' })} openBuildDeliverables={THREE} />);
    clickStage('Build');
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy.mock.calls[0][0]).toContain('Reopen this engagement at Build?');
    expect(setEngagementStage).toHaveBeenCalledWith('e1', 'build', undefined);
  });
});
